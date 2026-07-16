# CURRENT_STATE.md — Opportunity Engine, Phase 0 Inventory

> Read-only inventory of the AOS repo as it actually exists, produced to ground the Opportunity Engine work.
> Scope: describe what's in the repo, not what should be there. No code was changed to produce this.
> Date: 2026-07-07. Branch: `master`. HEAD: `ceb3944 Create VISION.md`.

---

## ⚠️ SUPERSEDED — current reality on `feat/opportunity-engine-phase2` (2026-07-15)

**Everything from §0 down is the original Phase-0 inventory taken on `master` before
any engine code existed. On this branch it is now HISTORICAL. Where the two conflict,
this section and `HANDOFF.md` win.** The Phase-0 claim that "the discovery loop does
not exist in any form" (§3) is no longer true on this branch.

What now exists (see `HANDOFF.md` for the step-by-step state + git anchors):

- **The research→score→verdict pipeline is built and committed** (`4c824f7`):
  `lib/opportunity-engine/{schema,client,research,score,run,research-cache,errors}.ts`.
  The honesty gate is the load-bearing core — `schema.ts`'s Occupancy discriminated
  union makes "greenfield/empty" inexpressible, and `deriveVerdict()` reconciles the
  model's proposed verdict against the deterministic rubric.
- **AI plumbing exists.** `@anthropic-ai/sdk` is installed and wired (server-side
  `web_search` sweep + structured-output scoring). `ANTHROPIC_API_KEY` +
  `OPPORTUNITY_ENGINE_MODEL` / `_MAX_SEARCHES` are in `.env.example`. (§4's "no AI
  integration" is superseded.) Still no embeddings/pgvector — correctly Phase 5+.
- **New private tables are designed + migrated (not applied).**
  `supabase/migrations/008_opportunity_discovery.sql` adds `ideas` + `evaluation_runs`
  with owner-scoped RLS, a service-role-only write path for runs, and the
  promotion-hook guard trigger. Typed in `types/database.ts`. **Not yet applied.**
- **Eval harness is live** (`scripts/eval/run.ts`, `eval/ideas.ts`) with single-case
  `--limit` / `--only` cost control. `persistRun()` (working tree, uncommitted) is the
  service-role write for completed runs; `runEvaluation` stays DB-free.

Still absent (roadmap unchanged): automated signal ingestion, embeddings/clustering,
the on-demand route + UI (SPEC steps 9–11), and the editorial promotion surface
(Phase 5+). The original inventory below remains accurate for those.

---

## 0. Note on the missing anchor doc

**`docs/aos/opportunity-engine/PLAN.md` does not exist.** `docs/` is empty except the scaffolded
`docs/aos/opportunity-engine/` directory this file is being written into. There is no prior plan, spec,
or status doc anywhere under `docs/`.

The "opportunity-discovery loop" this inventory is measured against is therefore reconstructed from two
in-repo sources, since PLAN.md couldn't be read:

- **The task's own definition** — idea intake → landscape/research → saturation analysis → scoring.
- **`VISION.md` → "Six Pillars" → Pillar 1 "Opportunity Engine"** — a demand-signal pipeline:
  ingest public pain signals (Reddit, App Store reviews, IndieHackers/ProductHunt, GitHub issues, job
  posts, Twitter) → embed + cluster by problem → score (volume × recency × specificity × willingness-to-pay)
  → editorial pass → opportunity cards that cite their evidence inline.

Per the task instruction, I do **not** treat "six pillars" as the app's actual built framing — it is
`VISION.md`'s *aspirational* roadmap. Below I separate what is aspiration from what is code.

---

## 1. The project's actual purpose and roadmap (as evidenced by the repo)

**What AOS actually is, in code today:** a polished, dark-editorial Next.js 14 web app implementing the
*consumption and commitment* half of the product — a user browses a small curated feed of opportunities,
evaluates one through a 5-step Decision Lens, commits via "The Ceremony," and then either runs a 30-day
self-build sprint or is handed to a (currently faux) AI-build screen. Around that spine: onboarding,
auth, profile/preferences, reputation tiers, transactional email + a check-in nudge cron, and Stripe Pro
+ Resend webhook + founder-analytics scaffolding.

**What the roadmap documents say vs. what's built:**

- `CLAUDE.md` is the architecture/conventions source of truth. Its "Current Status" section is **stale**:
  it lists founder analytics, `email_events`, the Resend webhook, and Stripe Pro tier as "not built yet,"
  but all of those exist in the tree (`app/founders/`, `migrations/005_email_events.sql`,
  `app/api/webhooks/resend/route.ts`, `app/api/webhooks/stripe/route.ts`, `migrations/006_billing.sql`,
  `app/upgrade/`, `lib/billing.ts`, `lib/stripe/client.ts`). Those are code-complete pending manual
  dashboard config (`FOLLOWUPS.md`).
- `VISION.md` is the strategic north star and frames a six-pillar future. Pillar 1 (Opportunity Engine as
  a signal pipeline), Pillar 2 (taste model), and Pillar 3 (real AI-build pipeline) are **explicitly
  described as not-yet-built future work** — and the code confirms none of the three exists.
- `CLAUDE.md` itself flags the Opportunity Engine's automation as future: *"MVP is manually curated;
  automated signal collection is Phase 2,"* and its structure diagram lists `lib/ai/  # Phase 2` — a
  directory that **was never created**.

**Bottom line on purpose:** the built product is the *decision + commitment engine over a hand-curated
opportunity set*. The *discovery* engine that produces that set — intake, research, saturation, scoring —
is roadmap only.

---

## 2. Feature / area inventory (built / partial / stubbed)

Labels: **BUILT** = implemented and wired; **PARTIAL** = present but incomplete or unrendered;
**STUBBED** = UI/shape exists but the substance is faked or missing; **ABSENT** = referenced somewhere
but not in the tree.

### `app/` — routes

| Area | Status | Files |
|---|---|---|
| Landing / marketing | BUILT | `app/(marketing)/page.tsx` |
| Auth (login, signup, OAuth callback, signout) | BUILT | `app/auth/login`, `app/auth/signup`, `app/auth/callback/route.ts`, `app/auth/signout/route.ts` |
| Onboarding (build-mode, domains, audience, commitment, advantage, personalizing reveal, shell) | BUILT | `app/onboarding/{build-mode,domains,audience,commitment,advantage,personalizing}/…`, `app/onboarding/shell.tsx` |
| Feed ("Today") | BUILT (see note) | `app/(app)/feed/page.tsx`, `feed/loading.tsx` |
| Opportunity detail | BUILT (PARTIAL render) | `app/(app)/opportunity/[slug]/page.tsx` |
| Decision Lens wizard | BUILT | `app/(app)/lens/[id]/page.tsx`, `lens-content.tsx` |
| The Ceremony | BUILT | `app/(app)/commit/[id]/ceremony/page.tsx`, `ceremony-content.tsx` |
| AI-build handoff | **STUBBED** | `app/(app)/commit/[id]/ai-build/page.tsx`, `ai-build-content.tsx` |
| Ship flow | BUILT | `app/(app)/commit/[id]/ship/page.tsx`, `ship-content.tsx` |
| Sprint dashboard + weekly check-in | BUILT | `app/(app)/dashboard/page.tsx`, `dashboard/checkin/[id]/…` |
| Profile ("You") + Preferences | BUILT | `app/(app)/profile/…`, `app/(app)/preferences/…` |
| Bottom nav + app shell/layout/loading/error | BUILT | `app/(app)/bottom-nav.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` |
| Check-in nudge cron | BUILT | `app/api/cron/checkin-nudge/route.ts` (+ `vercel.json`) |
| Resend webhook | BUILT (needs dashboard config) | `app/api/webhooks/resend/route.ts` |
| Stripe webhook + upgrade + success | BUILT (needs dashboard config) | `app/api/webhooks/stripe/route.ts`, `app/upgrade/…` |
| Founder analytics (env-gated) | BUILT | `app/founders/page.tsx`, `founders-content.tsx` |
| 404 / root layout / globals | BUILT | `app/not-found.tsx`, `app/layout.tsx`, `app/globals.css` |
| `app/api/commit/route.ts` (per CLAUDE.md structure) | ABSENT | commit is handled by server actions, not this route |
| `lib/ai/`, `app/opportunity/preview/` (per CLAUDE.md) | ABSENT | never created |

Notes:
- **Feed personalization discrepancy:** `feed/page.tsx` currently selects all active opportunities ordered
  by `confidence` desc then `created_at`, `limit 5` — it does **not** filter/rank by the signed-in user's
  `profiles.domains`, despite commit `dd41483 "Personalize the feed by user-selected domains"` and
  `CLAUDE.md` claiming personalization. It appears to have been simplified during the editorial redesign
  (`32333d8`). Immaterial at 5 seeded rows, but relevant to the future "taste model" pillar.
- **Opportunity detail renders only `signal`:** it splits the multi-line `signal` string into a
  "Signal Sources" list and shows the `confidence` badge. It does **not** render `market_hint` or
  `source_links` (added by migration 007) — those columns exist in schema + types but are unsurfaced.
- **AI-build is a facade:** `ai-build-content.tsx` shows "The AI is reviewing your lens inputs…" over
  hardcoded `DELIVERABLES`/`STEPS` arrays and a button that routes to `/dashboard`. There is no AI call.
  This matches `VISION.md` Pillar 3's own admission that the non-builder path "ends at a handoff screen."

### `lib/`

| Module | Status | Purpose |
|---|---|---|
| `lib/supabase/{client,server,service}.ts` | BUILT | anon browser client, SSR server client, service-role client (privileged writes for cron/webhooks) |
| `lib/reputation.ts` | BUILT | derives Explorer/Builder/Shipper/Proven from actions |
| `lib/billing.ts` | BUILT | Pro tier / active-commitment cap logic |
| `lib/stripe/client.ts` | BUILT | raw-`fetch` Stripe wrapper (no SDK dep, per `FOLLOWUPS.md`) |
| `lib/email/{client,send,templates,events}.ts` | BUILT | Resend client, send helpers, templates, `email_events` writes |
| `lib/quotes.ts`, `lib/utils.ts` | BUILT | quote strings; `cn()` etc. |
| `lib/ai/` | **ABSENT** | listed in CLAUDE.md structure as "Phase 2"; never created |

### `components/`

All BUILT — the dark-editorial design system: `components/aurora.tsx`, `components/motion/index.tsx`,
and `components/ui/{button,editorial-card,confidence-dots,domain-tag,gold-seal,grain-overlay,
number-ticker,reputation-ladder,sprint-strip,adjacent-opportunities}.tsx`. No opportunity-authoring or
admin components.

### `supabase/`

| File | Status | Relevance to the engine |
|---|---|---|
| `migrations/001_initial_schema.sql` | BUILT | tables: `profiles`, `opportunities`, `decision_lenses`, `commitments`, `checkins`, `events`. Enables `uuid-ossp` **only** — no `vector`/pgvector. `opportunities` RLS is public-read; comment says "Admin-managed via service role." |
| `migrations/002_profile_extensions.sql` | BUILT | profile `domains/audience/commitment_level/build_mode` (not engine) |
| `migrations/003_opportunity_domains.sql` | BUILT | adds `opportunities.domains text[]` + GIN index; hand-tags the 5 seeded rows |
| `migrations/004_email_state.sql` | BUILT | email-state columns (not engine) |
| `migrations/005_email_events.sql` | BUILT | `email_events` table (not engine) |
| `migrations/006_billing.sql` | BUILT | `profiles.tier/pro_until/stripe_customer_id` (not engine) |
| `migrations/007_opportunity_context.sql` | BUILT (unused in UI) | adds `opportunities.market_hint text` + `source_links jsonb` — the only "evidence" scaffolding; currently unrendered |
| `seed.sql` | BUILT | **the sole source of opportunities** — 5 hand-authored INSERTs |

### `types/`

`types/database.ts` — BUILT. Fully typed `Database` for all tables incl. `email_events`, plus convenience
row types (`Opportunity`, `Profile`, …) and `SourceLink`. Accurately reflects migrations 001–007.

### `prototypes/`

`prototypes/aos-mobile-v2.jsx` — the single-file visual reference. Present, unchanged. No engine logic.

---

## 3. State of idea intake / landscape-research / saturation / scoring

**The discovery loop does not exist in any form.** Concretely:

- **Idea intake — NONE.** There is no opportunity-authoring surface: no form, no admin page, no API route.
  A repo-wide grep confirms **every** `.from("opportunities")` call in `app/` and `lib/` is a `.select()`
  read (feed, detail, lens, commit/ceremony/ship, dashboard, checkin, profile, founders count, cron).
  There is **zero** `insert`/`upsert`/`update`/`delete` against `opportunities` in application code.
  Opportunities enter the system **only** by running `supabase/seed.sql` by hand.
- **Landscape / research — NONE.** No web-search, scraping, RSS, or external-HTTP data-collection code
  anywhere. No Reddit/App Store/HN/GitHub/job-board/Twitter ingestion. The only scheduled job is the
  check-in *email* nudge cron.
- **Saturation analysis — NONE.** Nothing checks whether a problem space is crowded, already-covered, or
  duplicative. No dedup, no competitor mapping.
- **Scoring — NONE (automated).** `opportunities.confidence` is a hand-typed integer 1–5 in `seed.sql`.
  The feed *orders by* it, but nothing *computes* it. No volume/recency/specificity/WTP formula exists.
- **Evidence — MANUAL & FLAT.** `signal` is a hand-written multi-line string (e.g. "340+ creators… /
  450K members in r/Notion / 8,100 monthly searches"). Migration 007's `market_hint` + `source_links`
  are optional, manually-populated columns — and `source_links` isn't rendered by the detail page yet.
  The "47 mentions in 30 days, expandable to quotes" experience from `VISION.md` is not built.
- **Embedding / clustering — NONE.** No OpenAI/embeddings code and no `vector` extension in any migration
  (001 enables `uuid-ossp` only). There is no vector store to cluster signals into.

The `events` table exists but is **product analytics** (`event` + `properties`), not a demand-signal store —
and note `FOLLOWUPS.md` records a live column-name mismatch where `dashboard/page.tsx` writes
`event_name`/`payload` instead of `event`/`properties`.

---

## 4. AI / research plumbing

**There is no AI integration and no research capability. Both must be built from zero.**

- **Anthropic — NOT integrated.** The *only* occurrence of "anthropic"/"claude"-as-model anywhere in the
  repo is `CLAUDE.md:191` (the aspirational "Decided" stack: `claude-sonnet-4-20250514`). No
  `@anthropic-ai/sdk` in `package.json`, no client code, no API key expected.
- **OpenAI embeddings — NOT integrated.** `text-embedding-3-small` appears only in `CLAUDE.md` /
  `VISION.md` prose. No `openai` dependency, no embedding code, no pgvector.
- **Web search / research — NONE.** No search SDK, no fetch-to-search-API, nothing.
- **`package.json` dependencies (the whole list):** `@supabase/ssr`, `@supabase/supabase-js`,
  `class-variance-authority`, `clsx`, `framer-motion`, `lucide-react`, `next`, `react`, `react-dom`,
  `react-hook-form`, `resend`, `tailwind-merge`, `zod`. **No AI/LLM/embedding/search library of any kind.**
- **`.env.example` keys:** Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`), site URL, Resend (`RESEND_API_KEY`, `RESEND_FROM_ADDRESS`,
  `RESEND_WEBHOOK_SECRET`), `CRON_SECRET`, `FOUNDERS_EMAILS`, Stripe
  (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`).
  **Zero AI/LLM keys** — no `ANTHROPIC_API_KEY`, no `OPENAI_API_KEY`.

---

## 5. Gap list — current state → opportunity-discovery loop

Everything needed for the loop is missing; these are the concrete build items:

1. **AI provider integration** — add an Anthropic SDK/client + `ANTHROPIC_API_KEY` (for editorial shaping,
   scoring assist, evidence summarization). None exists.
2. **Embeddings + vector store** — add OpenAI (or equivalent) embeddings + enable `pgvector` and a signals
   embedding table, to cluster signals by underlying problem. None exists.
3. **Signal ingestion layer** — collectors for the `VISION.md` sources (Reddit, App Store reviews, HN,
   IndieHackers, ProductHunt, GitHub issues, job posts, Twitter). No external-HTTP/scraping/scheduled
   collection exists (only the email cron).
4. **Raw-signal storage schema** — a `signals`/`raw_signals` table (source, url, text, captured_at,
   metrics). `events` is analytics, not this. Doesn't exist.
5. **Clustering + scoring pipeline** — code computing volume × recency × specificity × willingness-to-pay
   and grouping signals into candidate problems. Doesn't exist.
6. **Saturation / dedup logic** — detect already-crowded or duplicate spaces before promoting a candidate.
   Doesn't exist.
7. **Editorial / curation surface** — an admin route or workflow to promote a scored cluster into a real
   `opportunities` row. Today there is **no opportunity-write path at all**; creation is manual SQL.
8. **Evidence-citation UI** — render `market_hint` + `source_links` (already in schema) and build the
   "N mentions in 30 days → expandable quotes" experience. Currently only the flat `signal` string shows.
9. **(Adjacent) Taste model** — feed ranking by predicted commit-probability; today the feed doesn't even
   apply the domain filter it once had. Not part of the discovery loop proper, but the same missing
   AI/embedding substrate.

**What already exists to build *into* (useful anchors, not partial implementations of the loop):**

- **Output contract is stable:** the `opportunities` table + `types/database.ts` `Opportunity` type is a
  clean, typed sink for whatever the pipeline produces, and the feed + detail pages already consume it.
- **Privileged write path exists:** `lib/supabase/service.ts` (service-role client) is exactly what a
  backend ingestion/promotion job would use.
- **Scheduled-job harness is proven:** the `vercel.json` cron + `app/api/cron/*` + `CRON_SECRET` pattern
  can be cloned for ingestion runs.
- **Evidence columns pre-added:** migration 007's `market_hint` / `source_links` give the pipeline a place
  to write citations without a new migration.

---

## 6. Mode decision

**Mode: BUILD FROM SCRATCH.**

The opportunity-discovery loop (intake → research → saturation → scoring → editorial) has **no partial
implementation to complete**. The evidence:

- No AI SDK and no AI/LLM keys anywhere (`package.json`, `.env.example`); the only Anthropic/OpenAI
  mentions are aspirational prose in `CLAUDE.md`/`VISION.md`.
- No `lib/ai/` (the CLAUDE.md-planned "Phase 2" directory was never created).
- No ingestion, embedding, clustering, scoring, saturation, or dedup code — and no `pgvector` and no
  raw-signal table to hang any of it on.
- No opportunity-write path in application code at all; **every** `opportunities` access is a read, and
  the only way an opportunity is created is by hand-running `seed.sql`.

The one honest nuance: this is *build-from-scratch against an already-stable output contract*. The loop's
**downstream** (the `opportunities` schema + typed model + feed/detail rendering) is built and solid, and
there's a proven cron harness and a service-role write client to imitate — so the new pipeline has a clear
target to write into and a pattern to follow. But every piece of the loop's own machinery is greenfield.

"Complete and wire what exists" would be the wrong frame: there is essentially nothing of the *discovery*
loop to complete — only a curated-consumption app to feed.
