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
**Why deferred:** The compile → materialize → deploy pipeline is verified offline (fixture compile, mocked Vercel API, local `next build` of a generated kit). A real Vercel deploy has never run.
**Steps:**
1. Apply `009_ai_builds.sql` in the Supabase SQL editor. It was `008_ai_builds.sql` on the old Windows branch. If `public.ai_builds` already exists in the live DB, don't re-run the file (it is not idempotent); instead `drop policy "Users manage their own ai_builds" on public.ai_builds;` and re-run only the `create policy` statement from 009, which now has a WITH CHECK the old file lacked.
2. Apply `starter-kit/supabase/schema.sql` in the Supabase project behind `AI_BUILD_KIT_SUPABASE_URL` (re-run it if that project already has the table: the RLS policy is new, and redeploying a kit does not change the database). The file is idempotent.
3. Set `VERCEL_TOKEN` (+ `VERCEL_TEAM_ID` if deploying into a team), and `AI_BUILD_ANTHROPIC_KEY` so generated apps can call Claude. Without the key the generated `/api/wedge` returns 503.
4. **Blocker — model:** `starter-kit/app/api/wedge/route.ts` calls `claude-sonnet-4-20250514`, which Anthropic retired on 2026-06-15, so every generated app's workflow returns 502. Pick the replacement (cost decision: AOS pays per request) and check the kit's `@anthropic-ai/sdk` (^0.30.1) against it.
5. **Blocker — env injection:** `deploy.ts` sends a top-level `env` array of project-variable records to `/v13/deployments`; an independent review found that field missing from Vercel's public schema. Likely fix: create the project, set env via the project env API, then deploy. Verify with one real build against a test commitment.
6. **Before real users — spend guards:** `runBuild` checks commitment ownership only. Add: require `build_mode = 'ai'` and an active commitment, and refuse while a `building` row exists (two tabs, or a retry after a lost response, can start two deploys on AOS's Vercel account).
7. **Before real users — status truth:** `ai_builds.status` flips to `live` when Vercel *accepts* the deployment. A deployment that later ends in `ERROR` stays "live" with no retry link. Poll or webhook the deployment state to READY/ERROR.
8. Lower priority: if the begin-build action resolves without redirecting (e.g. a gateway 504), the button stays on "Sending…" until reload; after a failed build, keyboard focus is not returned to the hold button. The Vercel project name uses only 8 chars of the commitment id (collision is unlikely but would share a production alias); `calc-in/number-out` and other non-text workflow shapes compile but the kit always renders the text form.

Done in the reconciliation (verified): kit PostCSS fix (generated kit now builds), `ai_builds` WITH CHECK pins `commitment_id` to the caller's own commitments, kit `interested_users` has RLS with anon insert-only (verified in PGlite; previously anon could read/modify/delete all signups).

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
