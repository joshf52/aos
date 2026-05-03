# Follow-ups

Tracked tasks deferred for later. Pick up the next item by feeding it back to Claude Code with `claude "do followup: <item>"`.

## Pending

### Production setup for personalization + email
**When:** before next deploy
**Why deferred:** Code shipped but live system needs human steps.
**Steps:**
1. Run `supabase/migrations/003_opportunity_domains.sql` in Supabase SQL editor (adds `domains` column, tags seeded opportunities, GIN index).
2. Run `supabase/migrations/004_email_state.sql` (adds `welcomed_at`, `last_nudged_at` to profiles).
3. Create a Resend account, verify the sending domain, paste API key + from-address into Vercel env: `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`.
4. Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel env (Project Settings → Environment Variables) for the cron route.
5. Add `CRON_SECRET` to Vercel env — any long random string. Vercel injects it as `Authorization: Bearer <secret>` automatically for crons in `vercel.json`.
6. Redeploy. The cron in `vercel.json` runs daily at 14:37 UTC; verify the first run in Vercel → Cron Jobs.

### Hover-state and focus-ring audit
**When:** ~2 weeks after 2026-05-02 (target: ~2026-05-16)
**Why deferred:** Wanted real usage first to see which interactive elements feel weakest in practice.
**Scope:** For every interactive element (buttons, links, inputs, textareas, cards with onClick), verify:
- A clear hover state (opacity / border / scale / background shift)
- A visible focus ring for keyboard nav (2px ring, `#3DB87A` on dark, `#D4A574` for sacred surfaces, with 2px offset)
- Consistent active-press feedback on touch/click

Specifically audit: bottom nav, all CTAs (signup/login/commit/checkin/ship), OAuth buttons, opportunity cards, "Also for you" rows, lens textarea, profile preferences rows, dashboard cards, ship URL input.

Don't introduce new design tokens — use the existing palette in CLAUDE.md.

---

*Add new follow-ups above this line. Remove items when done.*
