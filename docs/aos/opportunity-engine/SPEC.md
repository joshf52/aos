# SPEC.md — Opportunity-Discovery Loop, Phase 1 Architecture

> Design spec for the narrow, manual, dogfoodable opportunity-discovery loop:
> **idea in → landscape swept → saturation assessed → scored → verdict + brief out → run persisted → eval-checkable.**
> Grounds on `PLAN.md` (the run plan), `CURRENT_STATE.md` (the Phase 0 inventory — trusted over `CLAUDE.md`'s stale status), and `VISION.md` Pillar 1.
> **DESIGN ONLY.** No code, no installs, no schema changes were made to produce this. All SQL / TS below is illustrative of the intended build, not applied.
> Phase 2 implementation is normal build work — **run it on Sonnet**, not Opus. This spec is the one-shot architecture pass.

---

## 1. Summary + core architecture decision

### What we're building

A single-user (founder-dogfood) pipeline that takes a structured **Idea**, runs an **on-demand server-side** research sweep via the Anthropic API's `web_search` tool, assesses **saturation** from the gathered evidence, **scores** the idea against four fixed filters, and emits a schema-validated **Verdict** (one of four enums) plus a human-readable **brief** and an explicit **kill condition**. Every run is persisted so runs accumulate and are reviewable. A **headless eval harness** replays five known ideas and checks the verdicts against ground truth — runnable without any UI.

The mode, per `CURRENT_STATE.md`, is **build-from-scratch against a stable output contract**: none of the loop's machinery exists (no AI SDK, no keys, no ingestion/scoring code, no opportunity-write path), but the `opportunities` table + `types/database.ts` + feed rendering are solid, and there's a proven service-role write client (`lib/supabase/service.ts`) and cron/secret pattern (`vercel.json` + `/api/cron/*` + `CRON_SECRET`) to imitate.

### THE core architecture decision: idea evaluation is a **separate concept**, not a write into `opportunities`

**Decision: introduce two new private tables — `ideas` and `evaluation_runs` — owned by the author, with an OPTIONAL, deliberate, human-gated promotion path to `opportunities`. A favorably-scored idea does NOT auto-promote. This phase ships the tables + the nullable promotion FK hook; the promotion *surface* is explicitly Phase 5+.**

The alternative considered — **promote a good idea straight into `opportunities`, feeding the existing feed** — is rejected for five concrete reasons:

1. **The loop's primary output is a *kill*, not a launch.** Three (arguably four) of the five ground-truth eval ideas resolve to negative verdicts (`dont-bother` / occupied-so-don't-pioneer). A discovery run mostly *proves a space isn't worth entering*. `opportunities` is public-read editorial content that says "build this." Piping mostly-negative verdicts into it pollutes the feed with the opposite of what the feed is for.

2. **The honesty gate needs a schema that can carry it; `opportunities` cannot.** The Verdict carries a typed evidence array, a discriminated occupancy assessment, per-filter scores, and a `searches_performed` count. `opportunities.signal` is a flat free-text string and `source_links` (migration 007) is optional, schema-less `jsonb`. Promoting into `opportunities` would **discard the structural honesty gate** — the whole point of the run. The evaluation must live in a schema built to enforce the gate.

3. **Opposite RLS posture.** `opportunities` is public-read (`using (is_active = true)`). Discovery runs are the founder's private dogfooding analyses and must not be world-readable. One table can't be both cleanly.

4. **Different lifecycles.** An idea is re-evaluable — you re-run the sweep months later as the landscape shifts, and you want the *history* of runs. A run is an append-only, point-in-time snapshot. `opportunities` is a single living published record. These are different shapes.

5. **Editorial accountability is a stated product principle.** `VISION.md` Pillar 1: *"curation stays — the pipeline feeds the editor; it doesn't replace them,"* and "the curators are accountable." Promotion of a run into a public opportunity is an editorial act a human performs deliberately, not an automatic side effect of a score crossing a threshold.

The clean seam: `ideas.promoted_opportunity_id` (nullable FK → `opportunities.id`) records *if* an idea was ever promoted. The promotion action itself (shaping a run's findings into the `opportunities` shape and writing the row via the service-role client) is a later, human-driven surface — **out of scope here**, but the data model leaves the hook so Phase 5+ needs no migration to wire it.

---

## 2. Scope

### IN (this phase — the narrow manual loop)
- **Idea intake** — form + `ideas` table (title, thesis, space, claimed advantage, optional links).
- **Landscape sweep** — on-demand, server-side Anthropic `web_search` agentic call; evidence gathered, normalized, stored.
- **Saturation assessment** — a structured occupancy picture (who's there, how crowded/funded/standardized) with per-claim evidence.
- **Scoring** — the four fixed filters (unfair advantage / intrinsic use / expanding market / speed-to-signal), each scored and combined via a documented rubric.
- **Verdict + brief** — a schema-validated `Verdict` object (four enums) + explicit kill condition + human-readable markdown brief.
- **Run persistence** — `evaluation_runs` table; every run recorded with status, evidence, scores, verdict, brief, timestamps.
- **Eval harness** — headless runner over the 5-idea regression set, comparing to ground truth, runnable with no UI.
- **Minimal review UI** — submit an idea, watch stage status, read the brief. (Thin; the pipeline must be correct headless first.)

### OUT (mark each **Phase 5+ expansion** — do NOT design in detail here)
- **Automated ingestion / web scraping** of pain signals (Reddit, App Store, HN, IH/PH, GitHub, job posts, Twitter) — *Phase 5+*. This phase's "research" is on-demand per idea, not a standing collector.
- **Embeddings / pgvector** — *Phase 5+*. No vector store, no clustering substrate.
- **Clustering** of signals into candidate problems — *Phase 5+*.
- **Large-scale dedup / cross-idea saturation** — *Phase 5+*. (Per-idea saturation is IN; a corpus-wide dedup index is not.)
- **Editorial promotion surface** (idea → `opportunities` UI/workflow) — *Phase 5+*. Only the nullable FK hook ships now.
- The full `VISION.md` Pillar-1 ingestion engine — explicitly **not** this phase.

---

## 3. Data model (new tables + relation to `opportunities`)

Intended new migration **`supabase/migrations/008_opportunity_discovery.sql`** (design only; not written/applied in Phase 1). Follows repo conventions: `uuid_generate_v4()` PKs, `timestamptz default now()`, RLS on, owner-scoped policies mirroring `decision_lenses` / `commitments`.

```sql
-- 008_opportunity_discovery.sql  — DESIGN ONLY, not applied in Phase 1
-- Idea evaluation is a separate concept from opportunities (see SPEC §1).

-- ── IDEAS ─────────────────────────────────────────────────────────────
create table public.ideas (
  id                uuid default uuid_generate_v4() primary key,
  created_at        timestamptz default now() not null,
  updated_at        timestamptz default now() not null,
  author_id         uuid references auth.users(id) on delete cascade not null,
  title             text not null,
  thesis            text not null,                       -- one-line
  space             text not null,                       -- space / category
  claimed_advantage text not null,                       -- founder's claimed unfair advantage
  links             jsonb default '[]'::jsonb not null,  -- [{label,url}]
  -- Promotion hook (Phase 5+ writes this; the surface is out of scope now):
  promoted_opportunity_id uuid references public.opportunities(id) on delete set null
);

alter table public.ideas enable row level security;
create policy "Authors manage their own ideas"
  on public.ideas for all using (auth.uid() = author_id);

-- ── EVALUATION RUNS ───────────────────────────────────────────────────
create table public.evaluation_runs (
  id                 uuid default uuid_generate_v4() primary key,
  created_at         timestamptz default now() not null,
  idea_id            uuid references public.ideas(id) on delete cascade not null,
  author_id          uuid references auth.users(id) on delete cascade not null, -- denormalized for RLS
  status             text not null default 'pending'
                       check (status in ('pending','researching','scoring','complete','failed')),
  model              text,                        -- provenance, e.g. 'claude-opus-4-8'
  searches_performed integer not null default 0 check (searches_performed >= 0),
  -- Honesty gate, DB half: the enum literally cannot express "greenfield/empty/open".
  verdict            text
                       check (verdict in
                         ('pioneer','fast-follow-on-execution','build-for-intrinsic-use','dont-bother')),
  verdict_json       jsonb,                       -- full schema-validated Verdict (source of truth)
  brief_md           text,                        -- human-readable brief
  kill_condition     text,
  error              text,                        -- set when status = 'failed'
  started_at         timestamptz,
  completed_at       timestamptz
);

alter table public.evaluation_runs enable row level security;
create policy "Authors read their own runs"
  on public.evaluation_runs for select using (auth.uid() = author_id);
-- Inserts/updates are performed by the service-role client from the on-demand
-- route (bypasses RLS), matching the cron/webhook pattern. No public write policy.

create index evaluation_runs_idea_idx    on public.evaluation_runs (idea_id, created_at desc);
create index evaluation_runs_author_idx  on public.evaluation_runs (author_id, created_at desc);
create index evaluation_runs_verdict_idx on public.evaluation_runs (verdict);

create trigger ideas_updated_at
  before update on public.ideas
  for each row execute procedure public.set_updated_at();
```

**Storage strategy.** `verdict_json` (the full validated `Verdict`, §6) is the **source of truth**; the flat columns (`verdict`, `searches_performed`, `kill_condition`, `brief_md`, `status`) are **projections** for indexing, listing, and the eval harness. `evidence`, `occupancy`, and `scores` live inside `verdict_json` (not duplicated to columns) to avoid drift.

**Relation to `opportunities`.** One-directional, optional, human-gated: `ideas.promoted_opportunity_id → opportunities.id`, nullable, `on delete set null`. Nothing in this phase writes it. `opportunities` is untouched — no new columns, no schema change to the consumption side. `types/database.ts` gains `ideas` + `evaluation_runs` typed rows (design: add alongside the existing tables; no barrel files per repo convention).

**Auth/write path.** Idea creation = authed Server Action (RLS insert via `author_id = auth.uid()`), matching how `opportunity/[slug]/page.tsx` inserts a `decision_lenses` row today. Run creation + all status/verdict updates = **service-role client** (`createServiceClient()` from `lib/supabase/service.ts`), exactly as the cron and webhooks do their privileged writes.

---

## 4. Component specs (1–8)

### 4.1 Idea intake
- **Input (`Idea`)**: `title`, `thesis` (one-line), `space` (category), `claimed_advantage` (founder's claimed unfair advantage), `links[]` (optional `{label,url}`).
- **Capture**: a form at `app/(app)/discovery/new/` (serif question framing per the design language) → authed Server Action inserts an `ideas` row → redirects to the run view, which kicks off a run.
- **No AI here** — pure capture. Reuse `components/ui/{input,textarea,button}`.

### 4.2 Landscape sweep — the largest new piece (no AI plumbing exists today)
- **SDK**: `@anthropic-ai/sdk` (TypeScript; the project is Next.js/TS). New dependency (§9). `zod` is **already** in `package.json` (^4.4.1) and is reused for validation.
- **Model**: `claude-opus-4-8` (the current default; strong occupancy reasoning is the load-bearing quality bar for the honesty gate). Overridable via `OPPORTUNITY_ENGINE_MODEL`. **Do NOT use the model ID in `CLAUDE.md`'s tech-stack section (`claude-sonnet-4-20250514`) — it passed its 2026-06-15 retirement and now 404s.** Cost-conscious fallback if dogfood volume rises: `claude-sonnet-5`. Params: `thinking: {type: "adaptive"}`, `output_config: {effort: "high"}`.
- **Web search**: the Anthropic **server-side** `web_search` tool — `{ type: "web_search_20260209", name: "web_search" }` (the dynamic-filtering variant; supported on Opus 4.8). **No separate search API or key** — web search is billed through the Anthropic account. Bound the loop with `max_uses` (default **12**). Optionally add `{ type: "web_fetch_20260209", name: "web_fetch" }` to deepen evidence on a specific incumbent URL surfaced by search (web_fetch only fetches URLs already in the conversation).
- **Search structure** — the model runs an agentic loop; the system prompt directs it to cover these **facets** (not hardcoded query strings — the model composes queries, we enforce coverage + a floor):
  1. incumbents / market leaders in the space,
  2. funded startups / recent venture raises,
  3. standards bodies / protocols / specs,
  4. open-source projects / GitHub,
  5. direct competitors to the specific thesis/wedge,
  6. market size / demand / growth signal.
  Roughly **6–12 searches** per idea. A **`MIN_SEARCHES = 5`** floor: a run may not emit `no_evidence_found` occupancy with fewer than 5 completed searches (see honesty gate, §7).
- **Evidence normalization + storage**: from the `web_search_tool_result` blocks, each retained item becomes an `Evidence` `{ source, url, claim, observed_at }` where `source` = publisher/domain or named body, `claim` = the specific occupancy assertion this result supports. Evidence lives inside `verdict_json.evidence` and inside each `occupancy.incumbents[].evidence`.
- **`searches_performed` counting**: count executed `web_search` invocations (the `server_tool_use` blocks of type `web_search`, equivalently the number of `web_search_tool_result` blocks). This integer is the honesty-gate denominator, projected to `evaluation_runs.searches_performed`.
- **Error / rate handling** (from the current Anthropic API surface):
  - **Server-tool errors return HTTP 200 with an error block**, not an exception: a `web_search_tool_result` success `content` is a *list*; an error `content` is an *object* (e.g. `{error_code: "max_uses_exceeded"}`). Branch on that before indexing.
  - **`stop_reason: "pause_turn"`** — the server-side tool loop hit its iteration cap; re-send the assistant turn to resume. Cap continuations (e.g. `MAX_CONTINUATIONS = 5`) to avoid infinite loops.
  - **429 / 5xx** — the SDK retries automatically (`maxRetries` default 2, exponential backoff). Surface a terminal failure as `status='failed'` + `error`.
  - **Stream long calls** — a multi-search sweep can run 30–120s; use `client.messages.stream(...)` + `.finalMessage()` so a large `max_tokens` doesn't hit HTTP timeouts.
- **Execution model — ON-DEMAND, server-side, NOT cron.** Route: `app/api/discovery/runs/route.ts` (POST `{ideaId}`), or a Server Action. It (a) inserts a `pending` run via the service-role client, (b) advances `status` `researching → scoring → complete`, (c) writes `verdict_json` + projections. Because this is interactive dogfooding for one founder, a long-running request is acceptable — set the Vercel route `export const maxDuration = 300` and `runtime = "nodejs"` (matching the cron route). The UI polls the run row for status. (A real job queue is Phase 5+; flagged in §10.)
- **Two-call pipeline** (keeps the schema-constrained step tool-free and each stage independently testable, per PLAN Phase 2):
  - **Call A — research** (`model` + `web_search`, agentic, handles `pause_turn`): produces a research digest + the raw evidence blocks. No output schema.
  - **Call B — assess+score+verdict** (same model, **no tools**, `output_config.format` = the Verdict json_schema, or `client.messages.parse()` + a Zod `zodOutputFormat`): given the digest + collected evidence, emits the `Verdict`. This is where the honesty gate is validated (§7). Splitting the calls avoids mixing server tools with structured output and isolates the two failure surfaces.

### 4.3 Saturation assessment
From the evidence, the model produces an `Occupancy` object: a `level`, the `incumbents[]` (each named, kinded, and carrying ≥1 `Evidence`), and a `summary`. See the discriminated-union type in §7 — the shape *structurally forbids* asserting an empty space. Occupancy is a field of the `Verdict` (§6).

### 4.4 Scoring — the four fixed filters (kept EXACT so the eval stays valid)
Each filter scored **0–3** with a required `rationale`; optional supporting `evidence`.

| Filter | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| **unfair_advantage** (audience / distribution / unique knowledge / speed) | none | generic skill | real edge (audience, distribution, or domain knowledge) | defensible, hard to replicate (existing distribution + unique knowledge) |
| **intrinsic_use** (would-build-anyway / useful without "making it big") | only worth it if it hits big | mild | would use it myself | would build regardless of market outcome; useful at n=1 |
| **expanding_market** (does early beat first) | shrinking/static, winner-take-first | flat | growing | rapidly expanding, early ≥ first (new entrants keep winning) |
| **speed_to_signal** (users/revenue fast & cheap) | months to any signal | slow | weeks to first users/revenue | days to a real demand signal, cheap to test |

**Combination — a documented decision table, not a naive sum** (the eval ground truth is not linear in the four scores; occupancy is a co-input). The model proposes a verdict + rationale; a deterministic `deriveVerdict(scores, occupancy.level)` **validates** it — a contradiction (e.g. `pioneer` on a `standardized` space) rejects the run for re-ask. Rules:

- **`pioneer`** — `occupancy.level ∈ {emerging, no_evidence_found}` **AND** `unfair_advantage ≥ 2` **AND** (`expanding_market ≥ 2` OR `speed_to_signal ≥ 2`). *(Pioneer is only expressible when the space is genuinely open — this is the structural link between occupancy and verdict, §7.)*
- **`fast-follow-on-execution`** — `occupancy.level ∈ {occupied, crowded, standardized}` **AND** `unfair_advantage ≥ 2` **AND** `speed_to_signal ≥ 2`. *(Occupied, but you have a real wedge and can move.)*
- **`build-for-intrinsic-use`** — `intrinsic_use ≥ 2` **AND** neither pioneer nor fast-follow qualifies. *(Build it because you'd build it anyway / it's useful to you, regardless of occupancy; the kill condition caps the investment.)*
- **`dont-bother`** — none of the above. *(Occupied + no unfair advantage + low intrinsic use.)*

> **What `build-for-intrinsic-use` means — and what it does NOT (locked decision).** It is for ideas *worth sustained time, where the value is real even if it stays small* — the Sockeye-fleet case. A weekend-capped **toy** (the $BYCATCH/$GRIND memecoin) **fails the filters** (its `intrinsic_use` is low — fun/learning is not genuine intrinsic use) **and does not clear that bar → `dont-bother`.** Do **not** stretch `build-for-intrinsic-use` to cover capped toys. If a "a capped experiment is fine" notion is ever needed, it is a **separate boolean flag on the run, never a fifth verdict tier** — the four verdicts stay unblurred.

### 4.5 HONESTY GATE — see §7 (enforced structurally, load-bearing).

### 4.6 Verdict + brief
- **`Verdict`** — the schema-validated object; full schema in §6.
- **Brief** — a human-readable markdown write-up in the style of the manual session (the gap, the occupancy call with cited incumbents, the four scores with rationale, the verdict, and the explicit kill condition). Stored in `evaluation_runs.brief_md`; rendered in the UI. The brief is generated by the model *from* the validated `Verdict` (a small tool-free formatting call, or included as a `brief_summary` field then expanded) so prose can never contradict the structured verdict.

### 4.7 Persistence
`evaluation_runs` (§3). Every run persisted regardless of outcome. `verdict_json` canonical; flat columns projected. Relation to `opportunities` = the nullable `ideas.promoted_opportunity_id` hook only.

### 4.8 Eval harness — see §8.

---

## 5. (reserved — see §6 for the full schema)

---

## 6. Full Verdict JSON schema

Two representations. The **JSON Schema** (draft 2020-12) is what's passed to the API via `output_config.format` (best-effort shape). The **Zod/TS mirror** is the *load-bearing* enforcement — the SDK strips API-unsupported constraints (`minItems`, `minLength`, `minimum`) from the wire schema and **validates them client-side**, so the min-length / non-empty-evidence rules and the cross-field `pioneer` refinement are enforced at the Zod layer, not the API layer. See §7.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://aos.app/schemas/verdict.v1.json",
  "title": "Verdict",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version","idea_id","searches_performed","evidence","occupancy","scores","verdict","kill_condition","brief_summary"],
  "properties": {
    "schema_version": { "const": "1.0" },
    "idea_id":  { "type": "string", "format": "uuid" },
    "run_id":   { "type": "string", "format": "uuid" },
    "searches_performed": { "type": "integer", "minimum": 0 },
    "evidence": { "type": "array", "items": { "$ref": "#/$defs/evidence" } },
    "occupancy": { "$ref": "#/$defs/occupancy" },
    "scores": {
      "type": "array",
      "minItems": 4, "maxItems": 4,
      "items": { "$ref": "#/$defs/filterScore" }
    },
    "verdict": {
      "type": "string",
      "enum": ["pioneer","fast-follow-on-execution","build-for-intrinsic-use","dont-bother"]
    },
    "kill_condition": { "type": "string", "minLength": 1 },
    "brief_summary":  { "type": "string", "minLength": 1 },
    "confidence_note": { "type": "string" }
  },
  "$defs": {
    "evidence": {
      "type": "object",
      "additionalProperties": false,
      "required": ["source","url","claim"],
      "properties": {
        "source": { "type": "string", "minLength": 1 },
        "url":    { "type": "string", "format": "uri" },
        "claim":  { "type": "string", "minLength": 1 },
        "observed_at": { "type": "string", "format": "date-time" }
      }
    },
    "incumbent": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name","kind","evidence"],
      "properties": {
        "name": { "type": "string", "minLength": 1 },
        "kind": { "type": "string",
                  "enum": ["big_tech","funded_startup","company","standards_body","open_source","protocol"] },
        "evidence": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/evidence" } },
        "note": { "type": "string" }
      }
    },
    "occupancy": {
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "required": ["level","incumbents","searches_performed","summary"],
          "properties": {
            "level": { "type": "string", "enum": ["standardized","crowded","occupied","emerging"] },
            "incumbents": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/incumbent" } },
            "searches_performed": { "type": "integer", "minimum": 1 },
            "summary": { "type": "string", "minLength": 1 }
          }
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": ["level","incumbents","searches_performed","summary"],
          "properties": {
            "level": { "const": "no_evidence_found" },
            "incumbents": { "type": "array", "maxItems": 0 },
            "searches_performed": { "type": "integer", "minimum": 5 },
            "summary": { "type": "string", "minLength": 1,
                         "description": "Must be phrased 'no evidence found in N searches' — never 'unoccupied' or 'greenfield'." }
          }
        }
      ]
    },
    "filterScore": {
      "type": "object",
      "additionalProperties": false,
      "required": ["filter","score","rationale"],
      "properties": {
        "filter": { "type": "string",
                    "enum": ["unfair_advantage","intrinsic_use","expanding_market","speed_to_signal"] },
        "score":  { "type": "integer", "minimum": 0, "maximum": 3 },
        "rationale": { "type": "string", "minLength": 1 },
        "evidence": { "type": "array", "items": { "$ref": "#/$defs/evidence" } }
      }
    }
  },
  "allOf": [
    {
      "if":   { "properties": { "verdict": { "const": "pioneer" } } },
      "then": { "properties": { "occupancy": { "properties": { "level": { "enum": ["emerging","no_evidence_found"] } } } } }
    }
  ]
}
```

**Zod / TS mirror (the enforcement layer)** — illustrative:

```ts
const Evidence = z.object({
  source: z.string().min(1),
  url: z.string().url(),
  claim: z.string().min(1),
  observed_at: z.string().datetime().optional(),
});

const Incumbent = z.object({
  name: z.string().min(1),
  kind: z.enum(["big_tech","funded_startup","company","standards_body","open_source","protocol"]),
  evidence: z.array(Evidence).min(1),          // every named incumbent carries evidence
  note: z.string().optional(),
});

// The discriminated union has NO "greenfield" | "empty" | "open" | "unoccupied" member.
// The only zero-incumbent state is no_evidence_found — and it REQUIRES the search count.
const Occupancy = z.discriminatedUnion("level", [
  z.object({
    level: z.enum(["standardized","crowded","occupied","emerging"]),
    incumbents: z.array(Incumbent).min(1),
    searches_performed: z.number().int().min(1),
    summary: z.string().min(1),
  }),
  z.object({
    level: z.literal("no_evidence_found"),
    incumbents: z.array(z.never()).length(0),
    searches_performed: z.number().int().min(5),   // == MIN_SEARCHES
    summary: z.string().min(1),
  }),
]);

const FilterScore = z.object({
  filter: z.enum(["unfair_advantage","intrinsic_use","expanding_market","speed_to_signal"]),
  score: z.number().int().min(0).max(3),
  rationale: z.string().min(1),
  evidence: z.array(Evidence).optional(),
});

const Verdict = z.object({
  schema_version: z.literal("1.0"),
  idea_id: z.string().uuid(),
  run_id: z.string().uuid().optional(),
  searches_performed: z.number().int().min(0),
  evidence: z.array(Evidence),
  occupancy: Occupancy,
  scores: z.array(FilterScore).length(4)
           .refine(s => new Set(s.map(x => x.filter)).size === 4, "all four filters, no dupes"),
  verdict: z.enum(["pioneer","fast-follow-on-execution","build-for-intrinsic-use","dont-bother"]),
  kill_condition: z.string().min(1),
  brief_summary: z.string().min(1),
  confidence_note: z.string().optional(),
}).refine(
  v => v.verdict !== "pioneer" ||
       v.occupancy.level === "emerging" || v.occupancy.level === "no_evidence_found",
  "pioneer is only valid when the space is emerging or no_evidence_found",
);
```

---

## 7. Honesty-gate enforcement design (why it's structural, not a convention)

The gate is the product's load-bearing integrity rule. It is enforced at **three layers**, primary first:

1. **TypeScript type + Zod validation (compile error + runtime error — the load-bearing layer).**
   - **"Empty/greenfield" is not an expressible value.** `Occupancy` is a discriminated union whose `level` domain is `{standardized, crowded, occupied, emerging, no_evidence_found}`. There is **no** `greenfield | empty | open | unoccupied` member. A developer literally cannot construct a Verdict that claims the space is empty — it's a **compile error** (`level` doesn't accept the string), and a model that emits one **fails Zod validation** at parse time.
   - **Every occupancy claim carries evidence.** The occupied/crowded/etc. branch requires `incumbents: z.array(Incumbent).min(1)`, and each `Incumbent.evidence` is `z.array(Evidence).min(1)`. You cannot name an occupant without a source.
   - **"Nothing found" is a search count, never "unoccupied."** The only zero-incumbent state is `level: "no_evidence_found"`, which **requires** `searches_performed ≥ 5` (`MIN_SEARCHES`) and a `summary` phrased "no evidence found in N searches." You cannot claim emptiness after one lazy search, and you cannot claim it *at all* as "unoccupied."
   - **Verdict can't imply greenfield against evidence.** The `.refine()` rejects `verdict: "pioneer"` unless occupancy is `emerging`/`no_evidence_found` — a run cannot pair an optimistic "be first" verdict with evidence of incumbents.
   - Validation happens at the tool-call boundary (`client.messages.parse()` / Zod parse). A non-conforming model output does not silently pass — it throws, and the run either re-asks or terminates `failed`. It is a **validation error, not a lint rule**.

2. **Database CHECK constraint (defense in depth).** `evaluation_runs.verdict` is `check (verdict in ('pioneer','fast-follow-on-execution','build-for-intrinsic-use','dont-bother'))` — no greenfield-adjacent value is even storable. Occupancy lives in `verdict_json`, already validated by layer 1 before the write.

3. **Rubric reconciliation (`deriveVerdict`).** The deterministic decision table (§4.4) cross-checks the model's proposed verdict against `(scores, occupancy.level)`; a contradiction rejects the run. This stops "confident but unsupported" verdicts even when each field is individually well-formed.

Why structural beats convention: a prompt instruction ("please don't call spaces empty") degrades silently under model drift. A type the compiler and validator reject cannot be bypassed by a phrasing change — the failure mode the manual session kept hitting (hallucinated greenfield) becomes *inexpressible*.

---

## 8. Eval set + harness design

### Eval set (ground truth = the manual session; the regression test)
Fixture (design): `eval/ideas.ts` — each entry is `{ idea: Idea, expect: {...} }`. Each `expect` carries the acceptable occupancy levels, the acceptable verdict set, an expected-incumbent name pool (soft match: ≥1 must surface), and the **hard invariant** that must never fail.

| # | Idea | Expected occupancy | Incumbent pool (≥1 must surface) | Acceptable verdict(s) | Hard invariant |
|---|---|---|---|---|---|
| 1 | Agent payments / agent wallet | `standardized` \| `crowded` | x402, AP2, MPP, agentpay-mcp, Stripe, Coinbase, AWS | `fast-follow-on-execution` \| `dont-bother` | occupancy ≠ `no_evidence_found` **AND** verdict ≠ `pioneer` |
| 2 | Seafood provenance (capture app) | `occupied` \| `crowded` | Deckhand, Vericatch, Wholechain, ThisFish | `dont-bother` \| `fast-follow-on-execution` | occupancy ≠ `no_evidence_found` **AND** verdict ≠ `pioneer` |
| 3 | Agent identity / personhood | `crowded` \| `standardized` | Microsoft, Okta, Ping, NIST, W3C, IETF | `dont-bother` \| `fast-follow-on-execution` | occupancy ≠ `no_evidence_found` **AND** verdict ≠ `pioneer` |
| 4 | Sockeye fleet business | `occupied` (incumbents exist) | (n/a — the wedge, not the field, wins) | `build-for-intrinsic-use` \| `pioneer` | verdict ∈ BUILD set **AND** verdict ≠ `dont-bother` |
| 5 | $BYCATCH / $GRIND memecoin | any | (n/a) | `dont-bother` **(canonical)** \| `build-for-intrinsic-use` | `kill_condition` encodes a weekend/scope cap (toy) |

The single **pass criterion** across the occupied ideas (1–3, and any occupied space): the pipeline **reaches the occupancy call and verdict, and reports NONE of the occupied ones as open** (occupancy ≠ `no_evidence_found`, verdict ≠ `pioneer`). Idea 4 must yield a BUILD verdict (the one "go"). Idea 5 is the soft/craft case.

> **Idea-5 canonical verdict = `dont-bother` (locked).** A weekend-capped memecoin fails the filters — its `intrinsic_use` is low (fun/learning ≠ genuine intrinsic use), so the rubric yields `dont-bother`, not `build-for-intrinsic-use` (which is reserved for ideas worth sustained time, per §4.4). The eval **accepts either `dont-bother` or `build-for-intrinsic-use`** so a borderline model call doesn't go red, but `dont-bother` is the canonical/expected result. "Capped experiment is OK" would be a *separate flag*, not a verdict tier.

### Harness
- **Location**: `scripts/eval/run.ts`, invoked headless (`npm run eval`, via a new `tsx` dev dependency — §9). **No UI, no HTTP.**
- **Structure**: imports the *same* core `runEvaluation(idea): Promise<Verdict>` used by the on-demand route (UI-independent by construction). Runs the five ideas **sequentially** (per PLAN's context/rate guidance — not in parallel). Persistence is **optional** (`--persist` flag); default off so the harness needs only the Anthropic API, not Supabase.
- **Checks per idea**: (a) `Verdict` passes Zod (structural gate holds); (b) `occupancy.level ∈ expected`; (c) `verdict ∈ acceptable`; (d) the hard invariant; (e) ≥1 incumbent name from the pool surfaces (case-insensitive substring over `incumbents[].name` + evidence); (f) `searches_performed ≥ MIN_SEARCHES`.
- **Output**: writes `docs/aos/opportunity-engine/EVAL_RESULTS.md` (per PLAN Phase 3) — per-idea PASS/FAIL, the occupancy call, the verdict, surfaced incumbents, and search count. Non-zero exit if any hard invariant fails, so it's CI-gateable.
- **The dogfood bar** (PLAN Phase 3): if it calls agent payments "open," it fails — fix the honesty gate before anything else.

---

## 9. New dependencies + env keys

**Dependencies** — **APPROVED** by the founder. These two are the only adds; **no other additions without asking**.
- `@anthropic-ai/sdk` — **APPROVED, runtime** (the research + scoring calls).
- `tsx` — **APPROVED, dev** dep, to run the headless eval script (`npm run eval`). A plain script keeps the harness UI/HTTP-free.
- `zod` — **already present** (`^4.4.1`); reused for Verdict validation. No add.
- No embeddings / vector / scraping libs — those are Phase 5+.

**Env keys** (design — add to `.env.example`; do not commit real values):
```
# Anthropic — opportunity-discovery research + scoring pipeline.
# web_search is an Anthropic server-side tool billed via this account — no separate search key.
ANTHROPIC_API_KEY=sk-ant-...
# Optional overrides:
OPPORTUNITY_ENGINE_MODEL=claude-opus-4-8      # default; cost fallback: claude-sonnet-5
OPPORTUNITY_ENGINE_MAX_SEARCHES=12            # web_search max_uses cap
```
- **No web-search key** and **no embedding key** are needed this phase (server-side web search; no embeddings).
- PLAN.md speculated an existing `AI_BUILD_ANTHROPIC_KEY`. `CURRENT_STATE.md` confirms **no such key exists** and there is no AI plumbing. Use the SDK-default `ANTHROPIC_API_KEY`. Whether to namespace it (e.g. `OPPORTUNITY_ENGINE_ANTHROPIC_KEY`) is an open question (§10).

---

## 10. Phase 2 build sequence (ordered steps for a Sonnet session)

**Eval-first ordering (required).** The honesty-gate types + Verdict schema are built **first**, and the eval harness scaffold **early** — *not last*. Every pipeline component is validated against the 5-idea regression set (§8) **as it lands**, so a component is never "done" until the eval says so. UI comes last, only after the pipeline reproduces ground truth headless (PLAN Phase 2/3). **This is normal build work — run it on Sonnet.**

1. **Honesty-gate schema + types — FIRST (no new deps; `zod` is already present).** `lib/opportunity-engine/schema.ts`: the `Evidence` / `Incumbent` / `Occupancy` / `FilterScore` / `Verdict` Zod schemas + inferred TS types + `deriveVerdict()` (the load-bearing gate, §6/§7 — the discriminated union that makes "greenfield" inexpressible). Add `ideas` + `evaluation_runs` rows to `types/database.ts`. Everything downstream validates against this.
2. **Eval harness scaffold + fixtures — EARLY (add `tsx` dev dep; `npm run eval`).** `eval/ideas.ts` (the 5 ideas + expected occupancy/verdict/incumbent-pool + hard invariants, §8) and `scripts/eval/run.ts` (all assertion logic: Zod-passes, occupancy-in-expected, verdict-in-acceptable, hard invariant, incumbent surfaced, `searches_performed ≥ MIN_SEARCHES`). Wire it to a `runEvaluation(idea)` interface that initially points at a stub. The harness is red/skipped until stages land — but the ground-truth checks and structural-gate assertions exist from day one and gate every later step.
3. **Pipeline deps + env.** Add `@anthropic-ai/sdk` (runtime, approved §9); add `ANTHROPIC_API_KEY` (+ optional `OPPORTUNITY_ENGINE_MODEL` / `OPPORTUNITY_ENGINE_MAX_SEARCHES`) to `.env.example`.
4. **Anthropic client.** `lib/opportunity-engine/client.ts`: a thin `@anthropic-ai/sdk` wrapper reading `ANTHROPIC_API_KEY` + model/effort config (mirrors the lean `lib/stripe/client.ts` style).
5. **Research stage — then run the eval.** `lib/opportunity-engine/research.ts`: Call A. web_search agentic loop, facet coverage, `pause_turn` + server-tool-error handling, streaming, evidence collection, `searches_performed` counting. Wire into `runEvaluation`; **run `npm run eval`** and confirm evidence is gathered and `searches_performed ≥ MIN_SEARCHES` across all five ideas before moving on.
6. **Score+verdict stage — then run the eval to green.** `lib/opportunity-engine/score.ts`: Call B. tool-free, `output_config.format` / `messages.parse` → Zod-validated `Verdict`; `deriveVerdict()` reconciliation (§4.4); brief generation. Now `npm run eval` exercises the full occupancy + verdict checks. **Iterate here until all five reproduce ground truth** — the honesty gate holds and **no occupied space (ideas 1–3) is reported open**. Write `EVAL_RESULTS.md`.
7. **Orchestrator + persistence.** `lib/opportunity-engine/run.ts`: the real `runEvaluation(idea): Promise<Verdict>` chaining research→score (the harness already calls this interface), plus `persistRun()` writing `evaluation_runs` via `createServiceClient()` and advancing status. Keep `runEvaluation` free of DB coupling so the harness stays UI/DB-free.
8. **Migration (design→SQL).** Write `supabase/migrations/008_opportunity_discovery.sql` (§3). **Do not apply** — applying is a human interactive step (Supabase SQL editor), and any RLS/auth work is the founder's Fable-gated safety step per PLAN Phase 4.
9. **On-demand route.** `app/api/discovery/runs/route.ts` (POST `{ideaId}` → service-role insert `pending` → run → update), `export const maxDuration = 300`, `runtime = "nodejs"`. Auth: the signed-in author only.
10. **Minimal UI.** `app/(app)/discovery/new/` (intake form + Server Action) and `app/(app)/discovery/[runId]/` (status poll + brief render). Read the frontend-design skill first; reuse the dark-editorial primitives. Thin — the pipeline is the product this phase.
11. **Verify.** `npm run eval` green; confirm the honesty gate holds (no occupied space reported open); spot-check one *new* idea end-to-end through the route.

---

## 11. Open questions / decisions for review

1. **Idea-5 verdict mapping — RESOLVED.** Canonical = **`dont-bother`**. `build-for-intrinsic-use` means "worth sustained time, value real even if small" (the Sockeye case); a weekend-capped memecoin fails the filters and doesn't clear that bar. The eval still **accepts either `dont-bother` or `build-for-intrinsic-use`** so it doesn't go red, but `dont-bother` is canonical. A "capped experiment is OK" notion, if ever needed, is a **separate flag, not a verdict tier** (§4.4). Do not blur the four verdicts.
2. **Env-key namespace.** Use the SDK-default `ANTHROPIC_API_KEY`, or namespace it (`OPPORTUNITY_ENGINE_ANTHROPIC_KEY`) to keep this pipeline's spend/keys separable from a future AI-Build key? Default: `ANTHROPIC_API_KEY`.
3. **Runtime model.** `claude-opus-4-8` (quality, per the honesty bar) vs `claude-sonnet-5` (cost) as the pipeline default. Dogfood volume is low, so the spec defaults to Opus; revisit if volume/cost rises. (Note: the `CLAUDE.md` tech-stack model `claude-sonnet-4-20250514` is **retired** and must not be used.)
4. **Scoring scale.** 0–3 per filter (chosen for crispness + a legible decision table) vs the 1–5 confidence scale `opportunities.confidence` already uses. They're deliberately different concepts (per-filter judgment vs published confidence); confirm we're OK with two scales.
5. **`searches_performed` semantics.** Count = number of executed `web_search` queries. Confirm `MIN_SEARCHES = 5` and `max_uses = 12` are the right floor/ceiling, or make them env-tunable (spec exposes `OPPORTUNITY_ENGINE_MAX_SEARCHES`).
6. **Long-request execution.** On-demand with `maxDuration = 300` + status polling is fine for one founder. Do we accept that ceiling for Phase 1, or invest early in a background job/queue (currently deferred to Phase 5+)?
7. **Promotion hook placement.** `promoted_opportunity_id` on `ideas` (the idea became an opportunity) vs on `evaluation_runs` (a specific run's findings were promoted). Spec puts it on `ideas`; confirm, since it affects the Phase-5+ promotion surface.
8. **Where the brief is generated.** Same model call as the Verdict (a `brief_summary` field, expanded) vs a separate formatting call from the validated Verdict. Spec prefers deriving prose *from* the validated object so the brief can't contradict the structured verdict — confirm.
9. **`deriveVerdict` strictness.** On a model/rubric contradiction, do we re-ask once then fail, or accept the rubric's derived verdict over the model's? Spec says reject→re-ask; confirm the retry budget.
10. **Dependency approval — RESOLVED.** `@anthropic-ai/sdk` (runtime) and `tsx` (dev) are **approved**; `zod` already present. **No other additions without asking.** (See §9.)
```
