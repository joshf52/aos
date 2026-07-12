// Landscape sweep (SPEC step 5) — replaces the stub.
//
// Two-call pipeline, kept separate on purpose (SPEC §4.2): Call A1 runs a LIVE
// web_search agentic sweep over the idea's space/thesis; Call A2 is a tool-free,
// structured-output extraction that turns A1's findings into Evidence[], grounded
// strictly to A1's real result URLs (no hallucinated sources).
//
// The schema (schema.ts) is the contract. This file is built to fit EvidenceSchema
// exactly — if a valid run were ever rejected by the honesty gate, the fix belongs
// here (the shape this stage emits), never a loosening of schema.ts.

import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { getClient, getMaxSearches, getModel } from "./client";
import { EvidenceSchema } from "./schema";
import type { Evidence, Idea, ResearchResult } from "./schema";

// Server-side tool loops cap at ~10 internal iterations and return
// stop_reason: "pause_turn" when they hit it. Re-sending the assistant turn
// resumes the loop; cap resumptions so a stuck sweep can't loop forever.
const MAX_CONTINUATIONS = 5;

type RawResult = { url: string; title: string };

const SIX_FACETS = `  1. Incumbents / market leaders in the space.
  2. Funded startups / recent venture raises relevant to the space.
  3. Standards bodies / protocols / specs relevant to the space.
  4. Open-source projects / GitHub repositories relevant to the space.
  5. Direct competitors to the SPECIFIC thesis/wedge described below (not just the broader space).
  6. Market size / demand / growth signal for the space.`;

function sweepSystemPrompt(): string {
  return `You are researching the competitive landscape for a proposed idea, ahead of a strict, evidence-gated occupancy assessment. Use the web_search tool to research the idea's SPACE and THESIS across six facets:

${SIX_FACETS}

Gather EVIDENCE with source URLs for every claim. Name specific companies, projects, protocols, and standards bodies wherever you find them — vague claims ("there are many competitors") are not useful; named, sourced ones are.

CRITICAL: never declare a space empty, "greenfield," or "unoccupied." If your searches turn up little or nothing after a genuine effort across the six facets, say so explicitly and literally — "no evidence found in N searches" (N = the number of searches you actually ran) — never soften an occupied space into an opening, and never fill a gap with speculation.`;
}

function sweepUserMessage(idea: Idea): string {
  return `Idea title: ${idea.title}
Thesis: ${idea.thesis}
Space: ${idea.space}
Claimed advantage: ${idea.claimed_advantage}

Research this space and thesis across all six facets above and report what you find, with sources.`;
}

/**
 * Call A1 — the web_search agentic sweep. Handles pause_turn continuation and
 * server-tool errors (a web_search_tool_result's `.content` is a list on success,
 * an error object on failure — branch before indexing, never throw on it).
 */
async function runLandscapeSweep(
  client: Anthropic,
  idea: Idea,
): Promise<{ digest: string; searchesPerformed: number; resultPool: RawResult[] }> {
  const model = getModel();
  const tool: Anthropic.WebSearchTool20260209 = {
    type: "web_search_20260209",
    name: "web_search",
    max_uses: getMaxSearches(),
  };

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: sweepUserMessage(idea) }];

  let searchesPerformed = 0;
  let digest = "";
  const resultPool = new Map<string, string>(); // url -> title, de-duped across iterations/continuations

  for (let iteration = 0; iteration <= MAX_CONTINUATIONS; iteration++) {
    const stream = client.messages.stream({
      model,
      max_tokens: 16000,
      system: sweepSystemPrompt(),
      messages,
      tools: [tool],
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
    });
    const response = await stream.finalMessage();

    const textParts: string[] = [];
    for (const block of response.content) {
      if (block.type === "web_search_tool_result") {
        // Counts as an executed web_search invocation whether it succeeded or
        // errored (SPEC §4.2: searches_performed == number of these blocks).
        searchesPerformed += 1;
        if (Array.isArray(block.content)) {
          for (const item of block.content) resultPool.set(item.url, item.title);
        }
        // else: block.content is a WebSearchToolResultError ({ error_code }) —
        // no results to collect, but the search still counted above.
      } else if (block.type === "text") {
        textParts.push(block.text);
      }
    }
    if (textParts.length > 0) digest = textParts.join("\n\n");

    if (response.stop_reason !== "pause_turn") break;
    // Resume the paused turn by echoing the assistant's content back as the
    // next turn (per SPEC §4.2's pause_turn handling).
    messages.push({
      role: "assistant",
      content: response.content,
    });
  }

  return {
    digest,
    searchesPerformed,
    resultPool: Array.from(resultPool.entries()).map(([url, title]) => ({ url, title })),
  };
}

// A2's output contract IS EvidenceSchema — imported directly (never redefined)
// so the extraction call's structured output can only ever produce shapes that
// already satisfy the honesty gate.
const EvidenceExtractionSchema = z.object({ evidence: z.array(EvidenceSchema) });

function poolText(resultPool: RawResult[]): string {
  if (resultPool.length === 0) return "(no search results were returned by the sweep)";
  return resultPool.map((r) => `- ${r.url} — ${r.title}`).join("\n");
}

function extractionUserMessage(idea: Idea, digest: string, resultPool: RawResult[]): string {
  return `Below is a research digest and the raw pool of web search results gathered while researching an idea. Extract structured occupancy evidence from it.

## Idea
Title: ${idea.title}
Thesis: ${idea.thesis}
Space: ${idea.space}

## Research digest
${digest || "(the research sweep produced no summary text)"}

## Raw search result pool (url — title)
${poolText(resultPool)}

Extract each distinct occupancy-relevant fact as one evidence item:
- "source": the publisher, domain, or named body behind the claim (e.g. a company name, "TechCrunch", "W3C").
- "url": copied VERBATIM from the raw search result pool above. Never invent a URL, and never cite one that is not in the pool.
- "claim": the specific occupancy assertion this URL supports — what incumbent, standard, protocol, or project it names, and what it's doing in this space.

If the sweep genuinely found nothing relevant, return an empty evidence array. Do NOT invent sources to avoid an empty result — an honest empty result is the correct output for a truly open space.`;
}

/** Best-effort extraction of a JSON object from free-form model text (fallback path only). */
function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("extractEvidence fallback: no JSON object found in model response");
  }
  return text.slice(start, end + 1);
}

/**
 * Call A2 — tool-free, structured-output extraction. Grounds every surviving
 * evidence item to a real A1 result URL; never lets a hallucinated source through
 * even if it would otherwise pass EvidenceSchema.
 */
async function extractEvidence(
  client: Anthropic,
  idea: Idea,
  digest: string,
  resultPool: RawResult[],
): Promise<Evidence[]> {
  const model = getModel();
  const userMessage = extractionUserMessage(idea, digest, resultPool);

  let evidence: Evidence[] | null = null;

  try {
    const message = await client.messages.parse({
      model,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: userMessage }],
      output_config: { format: zodOutputFormat(EvidenceExtractionSchema) },
    });
    if (message.parsed_output) evidence = message.parsed_output.evidence;
  } catch {
    evidence = null; // fall through to the manual JSON fallback below
  }

  if (evidence === null) {
    // zodOutputFormat/parse failed for some reason — fall back to strict JSON
    // instructions + manual parse, still validated against the same schema.
    const fallback = await client.messages.create({
      model,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      messages: [
        {
          role: "user",
          content: `${userMessage}\n\nRespond with ONLY a single JSON object in exactly this shape — no prose, no markdown code fences:\n{"evidence": [{"source": "...", "url": "...", "claim": "..."}]}`,
        },
      ],
    });
    const text = fallback.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");
    const json: unknown = JSON.parse(extractJsonObject(text));
    evidence = EvidenceExtractionSchema.parse(json).evidence;
  }

  // Post-filter: drop anything not grounded in a real A1 result URL, even if
  // it already passed EvidenceSchema (no hallucinated sources, ever).
  const knownUrls = new Set(resultPool.map((r) => r.url));
  return evidence.filter((e) => knownUrls.has(e.url));
}

export async function researchIdea(idea: Idea): Promise<ResearchResult> {
  const client = getClient();
  const { digest, searchesPerformed, resultPool } = await runLandscapeSweep(client, idea);
  const evidence = await extractEvidence(client, idea, digest, resultPool);
  return { evidence, searches_performed: searchesPerformed, digest };
}
