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
1. Apply `009_ai_builds.sql` in the Supabase SQL editor. It was `008_ai_builds.sql` on the old Windows branch: if `public.ai_builds` already exists in the live DB, skip it (the file is not idempotent).
2. Set `VERCEL_TOKEN` (+ `VERCEL_TEAM_ID` if deploying into a team), and `AI_BUILD_ANTHROPIC_KEY` so generated apps can call Claude. Without the key the generated `/api/wedge` returns 503.
3. Run one real build against a test commitment and confirm Vercel accepts the `/v13/deployments` body — in particular the `env` array shape, which is unverified against the live API.
4. Decide the generated app's model: `starter-kit/app/api/wedge/route.ts` still calls `claude-sonnet-4-20250514`.
5. Note: `ai_builds.status` flips to `live` when Vercel accepts the deployment, not when it reaches READY; the first visit may hit a still-building URL.

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
