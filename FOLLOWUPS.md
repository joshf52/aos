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
**Why deferred:** The compile → materialize → deploy pipeline is verified offline (fixture compile, mocked Vercel API, local `next build` of a generated kit, generated app against a mock Anthropic API). A real Vercel deploy and a real Claude call have never run.

**Hosted DB state (read-only probe with the anon key, 2026-11-19, project `rkvvkocerzygdlimvxvy`):** 001–006 and 008 (opportunity discovery) are applied; **007 is not** (`opportunities.market_hint` / `source_links` missing — no code reads them yet); **`ai_builds` exists with the old Windows column set**, so the old `008_ai_builds.sql` (weaker policy) was applied. The policy itself can't be read with the anon key.

**Steps:**
1. Run `supabase/manual/verify_ai_builds.sql` in the SQL editor (read-only). If `commitments_with_duplicate_inflight_builds` > 0, mark the older duplicates `failed` first; if `rows_violating_new_check` > 0, review those rows.
2. Apply `009_ai_builds.sql`. It is idempotent and transactional: on the live DB it upgrades the old policy in place, adds the one-in-flight index, and keeps every row (tested against the old file with data in PGlite). Re-run the verify query: `has_with_check` and `inflight_index` should be true.
3. Apply `007_opportunity_context.sql` (separate, also idempotent) — the hosted DB skipped it.
4. Apply `starter-kit/supabase/schema.sql` in the Supabase project behind `AI_BUILD_KIT_SUPABASE_URL` (idempotent; the RLS policy is new and redeploying a kit doesn't change its database).
5. Set `VERCEL_TOKEN` (+ `VERCEL_TEAM_ID`), and `AI_BUILD_ANTHROPIC_KEY` for generated apps. Put a **workspace spend limit** on that Anthropic key in the Claude Console: the kit's rate and daily caps are per server instance, not global.
6. **Blocker — env injection:** `deploy.ts` sends a top-level `env` array to `/v13/deployments`; an independent review found that field missing from Vercel's public schema. Likely fix: create the project, set env via the project env API, then deploy. Verify with one real build against a test commitment — this is also the first real check that the generated app reaches Claude.
7. **Before real users — status truth:** `ai_builds.status` flips to `live` when Vercel *accepts* the deployment. A deployment that later ends in `ERROR` stays "live". Poll or webhook the deployment state to READY/ERROR (the build page already re-checks the row every 15 s while a build is in flight).
8. Lower priority: the Vercel project name uses only 8 chars of the commitment id; `calc-in/number-out` and other non-text workflow shapes compile but the kit always renders the text form; the "You review & ship" step promises "one round of changes", which isn't built yet (Moment 3); after a failed build, keyboard focus isn't returned to the hold button.

**Done and verified offline:** kit PostCSS fix; `ai_builds` WITH CHECK + one-in-flight unique index; kit `interested_users` RLS (anon insert-only) and no membership leak; generated app moved off the retired `claude-sonnet-4-20250514` to `claude-sonnet-5-5` via `starter-kit/lib/ai.ts` (adaptive thinking at low effort, 2,000-token output cap, input cap, per-IP and daily caps, refusal fallback to `claude-sonnet-5`, typed error mapping, usage + cost logging); `runBuild` refuses non-AI-mode users, inactive commitments and a second in-flight build, and expires stale in-flight rows; handoff copy no longer promises a 24-hour start or an email; its primary action follows the build phase instead of linking to the Sprint dashboard.

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
