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
**When:** next chore pass.
**Why deferred:** Pre-existing bug separate from this batch.
**Steps:**
- `app/(app)/dashboard/page.tsx` inserts into `events` with `event_name` + `payload` columns, but the schema is `event` + `properties`. Pick one and align (or migrate).

---

*Add new follow-ups above this line. Remove items when done.*
