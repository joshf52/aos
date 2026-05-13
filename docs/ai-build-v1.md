# AI Build v1

> The non-builder path, end to end. From "Have AI build this" to a preview URL the user can show someone.
>
> Status: spec. No code yet. Phase A — the smallest version that earns the right to charge.

---

## The thesis

A non-builder does not want a code generator. They want **a working thing they can point at**. The Decision Lens is the most expensive instrument we have for compressing intent into something a machine can act on — five answers, written under the weight of the Ceremony, plus an unfair advantage and a chosen domain. AI Build v1 is the function that takes those inputs and returns a live URL.

Not an MVP factory. Not a no-code builder. A **lens-driven compiler** that produces one thing: a hosted page the user can put in front of three potential customers by the end of the week.

If the user cannot show that URL to a friend within 24 hours of pressing the gold button and feel a small jolt of pride, we have failed.

---

## 1. Starter kit — SaaS, not content or marketplace

**Recommendation: a single opinionated SaaS starter kit.** Next.js + Supabase + Stripe + Resend, dark editorial palette inherited from AOS, single-wedge workflow at the center, single-tier pricing page, transactional email scaffold.

The reasoning is in the seed data:

- **5 of 5 seeded opportunities are subscription SaaS with a single wedge.** Notion Template Analytics ($29/mo), Invoice Dispute Assistant ($19/mo), GDPR Cleanup Tool ($49/mo), Micro-SaaS Valuation Calculator ($29 one-time), Conference Talk Submission Assistant ($15/mo). Every example_customer in the seed has a stated willingness-to-pay anchored on monthly recurring.
- **The curation rubric will keep selecting for this.** AOS ships opportunities with confidence ≥3, a clear wedge, and a paying example customer. Marketplaces fail that rubric — they need supply *and* demand, not a wedge. Content sites pass the wedge bar but force the non-builder into a content production loop AI can start but cannot sustain without their voice. SaaS is the cohort's natural shape.
- **The non-builder cohort is "I can describe the problem, I can't write the code."** They already think in terms of "a tool that does X." A SaaS shell with a one-job wedge maps directly onto how they'd describe their idea to a friend.

A marketplace or content kit would be a different product. We can build either later if the curation rubric shifts. For v1, every opportunity in the feed compiles to the same starter shape, and that's the constraint that makes the build pipeline tractable.

The kit is *opinionated* on purpose: dark warm-ink palette, editorial serif headlines, Plus Jakarta Sans body, gold for the conversion moment. Every output looks like a sibling of AOS itself. That visual coherence is part of what the user is buying — they get to ship something that looks like it was designed, not assembled.

---

## 2. The customization pipeline

Every Lens answer, the unfair advantage, the chosen domain, and the underlying opportunity fields map deterministically onto a slot in the kit. The compiler is a function:

```
compile(opportunity, lens, profile) → BuildConfig → repo → deployment
```

### Input → output mapping

| Source | Field | Drives |
|---|---|---|
| Lens Q1 | **Customer** — who exactly | Landing subhead. Empty-state copy. The "Who this is for" line above the hero CTA. Audience-segment classifier (B2C → magic link auth; B2B → workspace auth in v2). |
| Lens Q2 | **Today** — what they do instead | The "Before / After" section on the landing page. The opening line of the welcome email. The framing for the wedge's empty state. |
| Lens Q3 | **Wedge** — why switch | **Landing hero headline.** Primary CTA label. The single sentence on the pricing card. This is the load-bearing answer — it determines the entire hero of the page. |
| Lens Q4 | **Test** — smallest test | **The schema and the one core workflow.** This answer is parsed into: (a) the input form fields, (b) the action the user takes, (c) the output the app produces. The wedge handler. |
| Lens Q5 | **Success** — 30-day outcome | The dashboard's North Star metric, if any. The closing line of the welcome email. The internal "definition of done" for v1. |
| Opportunity | `example_customer` | The testimonial-shaped social proof card on the landing page (rendered as an editorial pull-quote, not a fake review). Anchor for pricing — their stated willingness-to-pay sets the default price. |
| Opportunity | `why_now` | The "Why now" footer band on the landing page — borrowed verbatim, lightly edited. |
| Profile | `unfair_advantage` | The "Built by" line at the page footer ("Built by someone who has spent three years inside the Notion creator economy"). Voice signal for any AI-generated body copy. |
| Profile | `domains`, `audience` | Visual accent palette within the editorial range. Choice of analogous starter testimonial framing. Recommended integrations list (e.g. `creator` → Gumroad/Stripe; `b2b` → Slack/HubSpot — surfaced as "coming soon," not built). |

### Compilation rules

- **Copy is deterministic, not generated.** The compiler substitutes lens answers into pre-written editorial templates. We do not run an LLM at compile time for landing copy in v1. Templates are written in the AOS voice; substitution preserves it. (LLM rewriting is Phase B once we trust the deterministic version.)
- **Schema is constrained.** Lens Q4 is parsed into one of ~6 shapes: text-in / text-out, text-in / list-out, upload-in / report-out, connection-in / dashboard-out, form-in / draft-out, calc-in / number-out. Each shape has a canonical Postgres schema and a canonical handler stub. Q4 picks the shape; the rest of the answers fill the slots.
- **Pricing is anchored.** Default tier = the price stated in `example_customer`. Single tier, monthly. The price page is one card. Stripe is wired but a `STARTER_DEMO_MODE=true` flag stubs out checkout so v1 doesn't require the user to onboard Stripe themselves.
- **The wedge handler is the only place AI runs at runtime.** For wedges that require generation (Invoice Dispute, Conference Talk Assistant), the handler calls Claude with a prompt template derived from Q3 + Q4. For wedges that are calculation or integration (Valuation Calculator, GDPR Cleanup), there is no runtime LLM — just the deterministic computation. The compiler picks based on the shape inferred from Q4.

---

## 3. The user-facing flow

The non-builder's experience is the editorial equivalent of the builder's weekly check-in — four moments, each its own full-screen card, each requiring an explicit *approve* before the next step runs. No chat. No backlog. No console. The cadence is faster than the builder sprint because there is less for the user to do, but the *shape* matches: shipped, learned, blockers, next.

### Moment 1 — The Architecture (≤2 hours after Ceremony)

A single editorial card. Serif headline: *"Here's what we'll build."*

- The compiled BuildConfig rendered as plain English: who, what, the one workflow, the price, the one screen.
- Three things presented for approval, each a single line with a checkbox-style affordance: *the customer, the wedge, the workflow*. The user can tap any one and rewrite — that round-trips through the lens and recompiles.
- Gold "Begin build" button at the bottom. Press to proceed.

This replaces a kickoff meeting. It is the moment where the user discovers the AI heard them — or didn't — and corrects course before any code is written.

### Moment 2 — The Preview (≤24 hours after approval)

Email arrives: *"Your build is live."* Linking to the preview URL and to an in-app card.

The card shows the live preview embedded (iframe). Three approval prompts beneath:
- *Does the headline feel like your idea?* (yes / rewrite)
- *Does the workflow do what you described?* (yes / change)
- *Would you show this to a friend?* (yes / not yet)

Any "no" surfaces a structured edit form — not free-text chat. Two fields max: *what's wrong* and *what would be better*. We constrain the edit shape so the compiler can act on it.

### Moment 3 — The Edit Round (≤48 hours after preview)

One round. Hard limit. Three edits maximum across the build — the same number as the lens questions that drive copy. This is on purpose: it forces the user to choose what matters, the way the lens forced them to. Unlimited edits would turn the AI into a frustrated junior employee.

Each edit recompiles the relevant slice and redeploys. The card shows a before/after diff in editorial format — *"You changed the headline from X to Y"* — not a code diff.

### Moment 4 — The Ship (≤7 days after Ceremony)

Final approval card. Serif headline: *"Ready to put it in front of someone."*

- Live URL, copyable.
- A short editorial deployment doc: how to share the URL, what to say when you share it, what to listen for in the response.
- The "Track your build" CTA from the current ai-build screen becomes "See your three conversations" — a structured prompt to log the first three customer reactions. This is the non-builder's Week 1 check-in.

The shipping flow then merges with the builder ship flow (`/commit/[id]/ship`). Same URL submission, same reputation event. A non-builder who ships is a Shipper, full stop.

---

## 4. The smallest end-to-end demo path

**Minimum lovable v1:** a non-builder presses *"Have AI build this"* on the **Invoice Dispute Assistant** opportunity, completes the Ceremony, and within 24 hours receives an email with a URL they can open on their phone and read end to end.

### Why Invoice Dispute Assistant for the demo

It is the cleanest wedge in the seed. The workflow is pure text-in / text-out: paste invoice details and the situation, get a drafted dispute email. No third-party API to configure (unlike Notion or Stripe webhooks), no calculation engine (unlike valuation), no integration auth dance (unlike GDPR Cleanup). The wedge handler is a single Claude prompt. The compiler ships its happy path first.

### What the URL must contain

- **Landing** — serif hero, the user's Wedge as the headline, their Customer as the subhead, one CTA: *"Draft a dispute email."*
- **Wedge screen** — the one workflow. Form (invoice context fields), submit, AI-generated email returned in a serif body. Copy button.
- **Pricing** — one card, the price anchored from `example_customer` ($19/mo), one button (stubbed Stripe).
- **About** — one paragraph generated from the unfair_advantage. The "built by someone who has lived this" line.

That's it. No dashboard, no settings, no team management, no auth in v1 (anonymous use, rate-limited by IP). A non-builder showing this to a freelancer friend should hear *"oh, I'd pay for that"* — that is the demo we are optimizing for.

### What "minimum lovable" rules out

- No multi-page navigation beyond the four screens above.
- No user accounts in the generated app. The non-builder logs into AOS to manage the build; the *end users* of their app are anonymous in v1.
- No admin panel. The non-builder views their generated app as a guest, same as a customer.
- No real Stripe charges. The pricing page collects emails into a `interested_users` table for v1 — selling without selling.
- No custom domain. Subdomains under a `helm.build`-style host (TBD — see open questions).

---

## 5. Build order

Eleven steps, rough sizing. Phase A is steps 1–7. Steps 8–11 are the demo polish and the second opportunity shape.

| # | Step | Size | Notes |
|---|---|---|---|
| 1 | **Starter kit repo** — Next.js + Supabase + Stripe (stubbed) + Resend, dark editorial palette ported from AOS, one wedge template, pricing card, about page, deployment script | 2d | Lives in its own repo. The compiler clones from this. |
| 2 | **BuildConfig schema** — TypeScript types + Zod schema for the compiled object. Defines the contract between lens answers and the kit. | 0.5d | The interface every step downstream depends on. |
| 3 | **Lens → BuildConfig compiler** — deterministic mapping function. No LLM. Includes a Q4 → wedge-shape classifier (small rule-based first, can swap to LLM later). | 2d | Pure function. Tested with all 5 seeded opportunities + invented lens answers. |
| 4 | **Copy template library** — editorial templates for landing headline, subhead, pricing card, about, welcome email. Each template has lens-answer slots. | 1.5d | Written by hand in AOS voice. Phase B will add LLM rewriting on top. |
| 5 | **Wedge handler templates** — one per shape (text-in/text-out is the only one shipped in Phase A; the others stub out). For text/text, an Anthropic API call with the lens-derived prompt baked in. | 1.5d | Invoice Dispute is the first opportunity that compiles end to end. |
| 6 | **Deployment pipeline** — given a BuildConfig, materialize the kit, inject config + copy + wedge handler, push to Vercel via API, return preview URL. | 2d | Vercel project per build. Subdomain via Vercel custom domains. |
| 7 | **Architecture approval card + edit form** (Moment 1) — full-screen editorial card showing the compiled config, three single-line edits, "Begin build" gold button. Wires to the compiler. | 1.5d | Lives at `/commit/[id]/ai-build/architecture`. Replaces the static handoff screen as the next step after the Ceremony. |
| **Phase A ends here.** | | | **Single user, hand-triggered, single opportunity (Invoice Dispute). Demo on a Loom is plausible from this point.** |
| 8 | **Preview review card** (Moment 2) — embedded iframe + structured approval form. | 1d | |
| 9 | **Edit round** (Moment 3) — three-edit limit, recompile on change, before/after diff in editorial format. | 2d | |
| 10 | **Ship handoff** (Moment 4) — merges into existing `/commit/[id]/ship`. | 0.5d | |
| 11 | **Second wedge shape** — calc-in/number-out (Micro-SaaS Valuation Calculator) to prove the pipeline isn't single-opportunity overfit. | 2d | This is the test that the compiler abstraction holds. |

**Phase A total: ~11 days of focused work.** The full v1: ~16–17 days. These are honest estimates that assume one person, no meetings, and no surprises with the Vercel API.

---

## 6. Open questions worth your input before code starts

These are forks where the obvious answer isn't obvious. Ranked by how much they affect Phase A.

1. **Where do preview URLs live?** Options: (a) Vercel preview URLs (free, ugly: `aos-build-abc123.vercel.app` — bad for the "show a friend" demo); (b) a wildcard subdomain we own (`<slug>.helm.build` or similar — costs ~$15 domain + Vercel custom domain setup, ~$0 ongoing — *recommended*); (c) Fly.io with per-app subdomains (more control, more ops). Decision blocks step 6.

2. **Who owns the generated code?** Three coherent answers: (a) AOS hosts it forever, user never sees code; (b) user gets a GitHub repo on ship; (c) AOS hosts during trial, hands off code on paid conversion. **I'd recommend (a) for Phase A** — the non-builder explicitly did not want to handle code. (b) and (c) become product features later.

3. **Does v1 use an LLM to *rewrite* copy, or only deterministic templates?** Templates are faster, more reliable, and lock in the AOS voice. LLM rewriting feels more bespoke but introduces failure modes (off-brand copy, hallucinated promises). **I'd recommend templates-only for Phase A**, LLM in Phase B for variation.

4. **What does the free trial look like?** Options: (a) one build, full review cycle, then paywall to ship; (b) 14-day full-access trial; (c) build is free, edits cost. The current AI Build screen says "Free Trial Active" but doesn't define what it's a trial *of*. Decision affects step 7 copy and Stripe wiring.

5. **For Phase A, do we restrict to the Invoice Dispute opportunity only, or attempt all 5 in the seed?** Restricted ships ~5 days sooner and avoids the wedge-shape classifier proving out for unfamiliar shapes. **Recommend restricted Phase A**, expand in step 11.

6. **Edit rounds — structured forms (recommended) vs free-text chat?** Chat feels more magical but turns into endless ping-pong. Structured forms force lens-style clarity. I lean hard toward structured; flagging because non-builders may expect chat.

7. **End-user accounts in the generated app — out of scope for Phase A (recommended), or required?** If users of the *built* app need to log in (which most real SaaS does), we need an auth shape per wedge. For Phase A, "anonymous, IP-rate-limited, sells without selling" is enough to demo. If you want real signup in the generated app, that's another ~3 days.

8. **Pricing of AI Build itself.** CLAUDE.md says "free trial then paid, TBD." Phase A doesn't need a price set, but step 7 needs to know whether to show a price anchor in the architecture card. Lowest-friction default: do not show a price in Phase A; figure out pricing after we see what gets built.

---

*Next step: confirm the answers above (especially Q1, Q2, Q4, Q5, Q7) and I'll start with step 1.*
