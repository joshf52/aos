# Follow-ups

Tracked tasks deferred for later. Pick up the next item by feeding it back to Claude Code with `claude "do followup: <item>"`.

## Pending

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
