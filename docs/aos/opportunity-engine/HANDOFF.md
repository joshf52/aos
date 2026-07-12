# HANDOFF.md — Opportunity-Discovery Loop, Resume State

> Where Phase 2 stands. Build order per `SPEC.md` §10.

- **Steps 1–2 (schema + eval harness):** committed.
- **Steps 3–5 (client + research):** built, typechecking, **UNCOMMITTED**, runtime-unverified — pending API key.
- **Step 8 (migration + RLS):** committed (`supabase/migrations/008_opportunity_discovery.sql`), verified against throwaway Postgres, **NOT applied**.
- **HUMAN STEP (batched, blocks everything below):** add `ANTHROPIC_API_KEY` to `.env.local`; apply migration 008 in the Supabase SQL editor.
- **Step 6 (scoring, Sonnet):** needs key — iterate `npm run eval` to green vs live calls.
- **Step 7 (orchestrator + persistence, Sonnet):** needs applied migration + key.
- **Steps 9–11 (route, UI, verify, Sonnet):** UI reads frontend-design skill first.
