# Follow-ups

Tracked tasks deferred for later. Pick up the next item by feeding it back to Claude Code with `claude "do followup: <item>"`.

## Pending

### Stripe Pro tier — manual setup (required before launch)
**When:** before announcing Pro on production.
**Why deferred:** Code scaffolding is in. The remaining work is account / dashboard config that only the founder can do.
**Steps:**
1. Apply migrations `005_email_events.sql` and `006_billing.sql` in the Supabase SQL editor.
2. In Stripe Dashboard → Products, create a "Pro" product with a $29/mo recurring price. Copy the price id (`price_...`) into `STRIPE_PRO_PRICE_ID`.
3. Set `STRIPE_SECRET_KEY` (test key first, then live before launch).
4. Stripe Dashboard → Developers → Webhooks → Add endpoint pointing at `https://<domain>/api/webhooks/stripe`. Subscribe to events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
5. Verify end-to-end with `stripe listen --forward-to localhost:3000/api/webhooks/stripe` + a test checkout, then again on production with a real card.
6. Decide whether to add a Stripe Customer Portal link to `/preferences` (so users can manage / cancel from inside the app — currently Pro is one-way until they email).

### AI Build — activation (required before the non-builder path goes live)
**When:** before any non-builder presses "Begin build" on production.
**State (2026-11-19):** the code is ready for a live test; the live test itself has not run (it needs the credentials and approvals below). Everything is verified offline: real Postgres 18 for the migration, rollback, privileges and races; a stateful fake of the Vercel API (and the generated app's public health answer) for every deploy path; a built generated app against a local mock of the Messages API and the limiter. Four rounds of independent review (Codex); confirmed findings fixed, accepted risks listed under "Still open". The final round's verdict: proceed with a supervised isolated live test; hold production activation until the live test confirms the real Vercel responses.

**Hosted DB state (read-only anon probe, re-checked 2026-11-19, project `rkvvkocerzygdlimvxvy`):** 001–006 and 008 (opportunity discovery) are applied; **007 is not** (`opportunities.market_hint` missing — no code reads it yet); **`ai_builds` exists with the old Windows column set** (old `008_ai_builds.sql`, users write their own rows). 007 and 009 don't depend on each other; both orders were tested on that exact starting state.

**How AI Build works now (for review):**
- Users can only *read* their `ai_builds` rows. All writes go through `lib/ai-build/store.ts` with the server-only privileged client (`lib/supabase/service.ts`: `SUPABASE_SECRET_KEY`, falling back to `SUPABASE_SERVICE_ROLE_KEY`; `import "server-only"`), after the session client has confirmed the signed-in user owns the commitment. Because the service role bypasses RLS, the database re-checks everything in triggers and constraints: ownership, the 5-builds-per-24h cap, rows start as pending/building, immutable identity columns, forward-only status, and a live row needs a deployment id and an https URL. The service role has no DELETE. Writes are conditional on the status and deployment id they read, so stale checks can't overwrite newer progress.
- `deploy.ts` uploads files, creates/finds the project, sets env vars on the project (`POST /v10/projects/{id}/env?upsert=true`; the deployment API has no env field), then creates a fresh deployment (`forceNew`) tagged `meta.aosBuildId`. `reconcile.ts` follows it on every status-page render, and `/api/cron/ai-builds` covers builds nobody is watching. A deployment whose create response was lost is found by its tag and adopted. "Live" is recorded only when Vercel says READY, the production alias is assigned, and the app's public `/api/health` answers with this build's id and Vercel's own id for this exact deployment. The row then carries `verified_at`; the page shows nothing as live without it (so legacy rows never show as live). Timeouts: 5 min with no deployment, 20 min to READY (then cancelled; the cron retries failed cancels), 30 min if Vercel can't be reached.
- Generated apps check a global limiter in the kit Supabase (`kit_admit_ai`: per client per 10 min, per app per day, all apps per day) before every Claude call. It is callable only with a server-only kit secret key. If it can't answer, the app refuses the call. The only hard spend ceiling is the Anthropic workspace spend limit.

**Step 1 — isolated live test (needs your approval and these resources):**
1. A **test** AOS Supabase project (not `rkvvkocerzygdlimvxvy`): apply `001`–`009`, `seed.sql`, then `supabase/manual/grant_api_roles_fresh_project.sql` (new projects get no automatic API grants). Its URL, anon key and a secret key.
2. A kit Supabase project (can be the same test project) with `starter-kit/supabase/schema.sql` applied; its URL, anon/publishable key, and a secret key made for generated apps.
3. A Vercel team used only for generated apps, and a token scoped to that team.
4. A dedicated Claude Console workspace with a low **workspace spend limit**, and an API key in it.
5. Put the values in a local env file (names in `scripts/ai-build-e2e/run.ts`), including the allowlist `E2E_TEST_SUPABASE_REFS` (the test project refs) and `E2E_TEST_VERCEL_TEAM_ID`, and run `npm run e2e:ai-build -- --env <file> --i-approve-spend --report e2e-report.json` (add `--cleanup` to delete the test user and Vercel project afterwards). Expected spend: three Vercel builds and two Claude requests (≤ $0.024 each by the kit's caps). The signed-in UI path (hold-to-approve → status page → live) is driven separately in a headless browser against the same test project.

**Step 2 — production activation (after PR #8 is accepted and merged):**
1. Run `supabase/manual/verify_ai_builds.sql` on the hosted DB (read-only) and keep the output. It shows what 009 will do to legacy rows: older duplicate in-flight rows are marked failed; rows attached to someone else's commitment move to `ai_builds_quarantine`; raw provider error text from the old pipeline moves there too (the row keeps a generic message); legacy "live" rows stay as history and won't display as live.
Before the hosted run, rehearse on a copy: restore a recent backup of the hosted DB into a scratch Supabase project on the same Postgres major version, run verify → 009 → verify → rollback → 009 there, including a build row already marked live.
2. Apply `009_ai_builds.sql` (idempotent, one transaction, nothing lost). Re-run verify: `state` = `current`. To undo: `supabase/manual/rollback_009_ai_builds.sql` (restores the old shape and the quarantined rows; raw provider error text stays archived, and the attestation columns `verified_at` / `deployment_id` / `deployment_url` stay server-only; anything whose user or commitment has since been deleted stays in the kept quarantine table; this branch's code keeps working either way). Don't run the fresh-project grants script on the hosted DB.
3. Apply `007_opportunity_context.sql`.
4. On the AOS Vercel production project set `SUPABASE_SECRET_KEY`, `AI_BUILD_VERCEL_TOKEN`, `AI_BUILD_VERCEL_TEAM_ID`, `AI_BUILD_ANTHROPIC_KEY`, `AI_BUILD_KIT_SUPABASE_URL`, `AI_BUILD_KIT_SUPABASE_ANON_KEY`, `AI_BUILD_KIT_SUPABASE_SECRET_KEY` (production values, production workspace spend limit). `CRON_SECRET` is already required by the existing cron.
5. On a Vercel Pro plan, change `/api/cron/ai-builds` in `vercel.json` from daily to hourly (Hobby allows only daily crons; a more frequent one fails the deploy).
6. Deploy, then one supervised build on a founder-owned commitment before inviting non-builders.

**Still open after this round:**
- Lower priority: `calc-in/number-out` and other non-text workflow shapes compile but the kit always renders the text form; the "You review & ship" step promises "one round of changes", which isn't built yet (Moment 3); after a failed build, keyboard focus isn't returned to the hold button; nothing advances an `approved` row on its own.
- Generated apps install npm packages by semver range at Vercel build time (no lockfile ships with the kit), and Vercel's default Node image ignores `min-release-age`. Pin exact versions or ship a lockfile before scaling up.
- A failed build whose deployment still reached READY (e.g. its address never answered in 20 min) is reported by the cron (`ai_build_ready_but_failed`), not removed: it was never recorded live, so no user sees it, but because it is the newest production deployment, the project's alias may now point at it. Deleting or rolling back a production deployment is left to you. The cron only touches deployments tagged with the exact build id; untagged legacy ones are left alone.
- "Live" is verified once, when recorded. If an alias is later removed, protected or reassigned on Vercel, the page keeps showing the recorded live state.
- Deleting an account removes its `ai_builds` rows, so its Vercel project is no longer tracked. Its apps keep serving, still bounded by the limiter and the workspace spend limit.
- The cron is daily on Hobby, so a build nobody watches can take up to a day to be marked live or failed. Hourly on Pro is better (step 5).
- `retry_after` across a midnight boundary was checked by the reviewer with a fixed clock (460 s returned for a 700 s window at 23:59 UTC), not by a repo test.
- Accepted for now: "live" uses `<project>.vercel.app` only (AOS creates these projects and never adds custom domains); project identity is checked by name, build tag and the dedicated team, not a stored project id; logged provider codes are any letters-and-underscores value, not a closed list.
- The live script calls `executeBuild` directly; the signed-in path (hold-to-approve → status page) is exercised separately in a headless browser against the same test project.
- First things the live test must confirm: the real `PATCH /v9/projects` response, that `/api/health` returns both ids (VERCEL_DEPLOYMENT_ID exposed), and that `<project>.vercel.app` is publicly reachable without Vercel Authentication.
- Different deployed app versions pass their own caps to the shared limiter; the all-apps cap is whatever each app was built with.

### Resend webhook — manual setup
**When:** before launch.
**Why deferred:** Code is in. Needs Resend dashboard config.
**Steps:**
1. Resend Dashboard → Webhooks → Add endpoint `https://<domain>/api/webhooks/resend`. Subscribe to: `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.opened`, `email.clicked`, `email.delivery_delayed`.
2. Copy the signing secret into `RESEND_WEBHOOK_SECRET`.
3. Apply migration `005_email_events.sql` in Supabase SQL editor.

### Founders allowlist
**When:** anytime.
**Why deferred:** trivial config.
**Steps:**
- Set `FOUNDERS_EMAILS` to a comma-separated list of authorized emails. The `/founders` page 404s for anyone not in the list.

### Stripe SDK swap (optional, low priority)
**When:** if/when we need the broader Stripe API surface (proration math, Checkout customizations, billing portal).
**Why deferred:** The current `lib/stripe/client.ts` uses raw `fetch` to keep deps lean per CLAUDE.md. That's fine for create-session / retrieve-subscription, but the SDK's typed responses get nicer once we're calling more endpoints.
**Steps:**
1. `npm i stripe`
2. Replace `lib/stripe/client.ts` with a thin `import Stripe from "stripe"` wrapper, keep the same exported function shapes so callers don't change.
3. The webhook signature verification can switch to `stripe.webhooks.constructEvent()` — drop the local HMAC implementation.

### Stale events analytics column
**Status:** Fixed for the ship flow — `app/(app)/commit/[id]/ship/page.tsx` now writes `event` + `properties`. Leaving this entry to flag that any future analytics writes must use the schema column names (`event`, `properties`), not the `event_name` / `payload` shape that had crept in.

---

*Add new follow-ups above this line. Remove items when done.*
