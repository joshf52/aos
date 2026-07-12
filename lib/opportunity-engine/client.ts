// Thin @anthropic-ai/sdk wrapper for the opportunity-discovery pipeline.
// Mirrors the lean style of lib/stripe/client.ts: read env, throw a clear
// error if misconfigured, expose small getters. No abstractions beyond that.

import Anthropic from "@anthropic-ai/sdk";

/** New Anthropic client. The SDK reads ANTHROPIC_API_KEY itself; we only add a clearer error. */
export function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY not set. Add it to .env.local (see .env.example) to run the opportunity-discovery pipeline.",
    );
  }
  return new Anthropic();
}

/** Model id for both research and scoring calls. Overridable for cost (see .env.example). */
export function getModel(): string {
  return process.env.OPPORTUNITY_ENGINE_MODEL ?? "claude-opus-4-8";
}

/** web_search max_uses ceiling per research sweep. */
export function getMaxSearches(): number {
  return Number.parseInt(process.env.OPPORTUNITY_ENGINE_MAX_SEARCHES ?? "12", 10);
}
