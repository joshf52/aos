# Follow-ups

Tracked tasks deferred for later. Pick up the next item by feeding it back to Claude Code with `claude "do followup: <item>"`.

## Pending

### Next 5 build priorities (in order)
**When:** next session
**Why deferred:** Conversation cleared mid-plan; pick up here.
**Steps:**
1. Update CLAUDE.md "Current Status" + "What's not built" sections to reflect reality (most "not built" items have shipped: onboarding, profile, preferences, ceremony, email).
2. Founder analytics page at `/founders` — gated by env-var email allowlist; shows signup count, commit rate, ship rate, abandon rate, time-to-first-commit, active sprints. Matches Phase 6 success metrics.
3. `email_events` table + writes — migration `005`, called from `lib/email/send.ts` on welcome + nudge sends. Foundation for #4 and analytics.
4. `/api/webhooks/resend` — verify Resend signature, accept delivery/bounce/complaint events into `email_events`, mark bounced addresses so the cron skips them.
5. Stripe Pro tier scaffolding — migration adds `profiles.tier`, `pro_until`, `stripe_customer_id`. Server action creates Checkout Session. `/api/webhooks/stripe` for subscription lifecycle. Active-commitment cap becomes 1 (free) / 3 (pro). Add upgrade CTA at the cap. Add Stripe account/webhook setup steps to FOLLOWUPS.

---

*Add new follow-ups above this line. Remove items when done.*
