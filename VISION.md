# VISION.md — AOS

> The strategic north star for AOS.
> Read alongside `CLAUDE.md` (architecture + conventions) and `FOLLOWUPS.md` (deferred config tasks).
> This file defines what we're building toward, the principle every feature is tested against, and the order of work that takes AOS from "solid MVP" to "the obvious place to start a product."
> Update as strategy evolves.

---

## The Promise

[#the-promise](#the-promise)

A user goes from "I don't know what to build" to a live, shipped product within 30 days — whether they write code or not. The opportunity is real (evidence-backed), the path is clear (the Lens), the commitment is binding (the Ceremony), the outcome is public (the Shipped Wall).

That's the whole product. Everything else is in service of it.

---

## The Tension

[#the-tension](#the-tension)

We want millions of users *and* editorial restraint. These pull against each other. Most products resolve the tension by drifting toward volume — more cards, more notifications, more badges. AOS resolves it the other way: **each shipped product is the unit of growth.**

Every shipped product is a billboard. The Shipped Wall does the marketing. The trust ledger does the proof. The Built-via-AOS attribution closes the loop. Restraint isn't a constraint on growth — it *is* the growth strategy.

When a feature proposal arrives, run it through this test:

- Does it produce more *shipped products*?
- Does it make each shipped product *more visible*?
- Does it make the next user *more likely to commit and ship*?

If none of the above: it doesn't ship.

---

## The Six Pillars

[#the-six-pillars](#the-six-pillars)

### 1. Opportunity Engine — from curation to signal pipeline

[#1-opportunity-engine](#1-opportunity-engine)

5 hand-picked per week works for the first 100 users. It doesn't scale, and it isn't defensible. The wrong fix is "ask Claude for 50 startup ideas." The right fix is a real demand-signal pipeline.

**What to build:**

- Ingestion from public pain signals: Reddit complaints, App Store 1-star reviews, Indie Hackers and ProductHunt comments, GitHub issues on high-traffic repos, job postings indicating unmet workflows, Twitter pain-rants
- Embedding + clustering (`text-embedding-3-small` is already in the stack) to group signals by underlying problem
- Scoring: volume × recency × specificity × willingness-to-pay signals
- Editorial pass (manual or AI-assisted) shapes the top clusters into Lens-ready opportunities
- Every opportunity card cites its evidence inline — "47 mentions in 30 days" — expandable to the actual quotes

**Why it's defensible:** the signal dataset compounds. Six months in, AOS holds the deepest searchable archive of unmet demand on the indie web. Nobody catches up without doing the same six months of collection.

**Anti-patterns:**

- "Generate me ideas" prompts to an LLM. That's the cheap version. It will not work.
- Surfacing every signal. Curation stays — the pipeline feeds the editor; it doesn't replace them.

### 2. Taste model — from chips to learned preference

[#2-taste-model](#2-taste-model)

The onboarding chips (domains, audience, commitment level, advantage) are a cold-start. They're a coarse filter, not a model of taste. The feed should get smarter the more the user uses it.

**What to build:**

- An implicit signal log: opportunity views, dwell time, evaluates started, evaluates abandoned, commits, ships, skips
- A user vector that updates from these signals — start simple, a weighted average of embedding vectors of engaged opportunities
- Feed ranking shifts from "domain match" to "predicted commit probability"
- A small "we chose this because…" line under each card. Show your work; transparency is the brand.

**Anti-patterns:**

- Black-box recommendations. Users should always be able to ask "why this?"
- Engagement bait. Don't optimize for dwell. Optimize for *commits that result in ships.*

### 3. AI Build pipeline — the existential bet

[#3-ai-build-pipeline](#3-ai-build-pipeline)

Today the non-builder path ends at a handoff screen with "AI Build service TBD." That's the entire promise to half the addressable market. Until this works end-to-end, AOS is incomplete.

**What to build:**

- A small library of vetted starter kits (begin with two: a SaaS template and a content/marketplace template), each pre-wired with Stripe, Supabase auth, basic CRUD, analytics, transactional email
- A customization pipeline: Lens answers + the user's unfair advantage flow into a Claude-driven pass that adapts the kit to the specific wedge — copy, schema, key screens, pricing page
- A preview URL within minutes; a deployable v1 within hours; a polished v1 within the 30-day sprint
- Weekly check-ins during the AI build include preview snapshots, decisions to confirm, and the user's voice staying centered

**Why it's the moat:** any opportunity engine without an execution path is a glorified subreddit. Closing the loop — opportunity → live product, no code required — is what makes AOS the obvious starting point.

**Anti-patterns:**

- Trying to be a general-purpose "build any app" tool. Start with two kits. Add a third only when the first two are converting.
- Hiding the AI. Show it working: which decision Claude is making, which alternatives it considered, where the user's answer changed direction.

### 4. The finishing loop — addiction in the editorial register

[#4-the-finishing-loop](#4-the-finishing-loop)

The competition's playbook: streaks, badges, confetti, push notification spam. Forbidden by the visual language and the philosophy. We need engagement that's just as sticky and isn't cheap.

**What to build:**

- Weekly check-ins render as a beautifully-typeset chronicle: what you said last week, what you did, what's next. Serif headers, the sprint constellation lighting up.
- Cohort comparisons in the editorial voice: "you're at week 2, sprint 34% complete, ahead of 70% of builders at this stage." Numerical truth, not gamification.
- The thread of a sprint becomes a private narrative the user wants to keep adding to.
- Missing a check-in feels like breaking a small private promise — because it is.

**Anti-patterns:**

- Streaks. Badges. Confetti. Trophy icons. Push notifications more than once a week.
- Anything that would feel out of place on the back of a leather-bound book.

### 5. Shipped Wall — the viral engine

[#5-shipped-wall](#5-shipped-wall)

The single highest-leverage feature not yet built. This is how AOS goes from "interesting tool" to "a thing creators recognize."

**What to build:**

- A public page per shipped product: founder, opportunity, the wedge in their own words, the live URL, optional Lens excerpts, ship date, days from commit to ship
- A "Built via AOS" attribution link that ships by default; removable on Pro
- A weekly "Ships of the Week" email + public archive page
- Founder mini-profiles linkable from each ship, so trust accrues to the person, not just the product
- SEO structured data so each ship page ranks on its own

**Three flywheels start at once:**

- SEO: each ship page is indexable; the long tail compounds
- Social: founders share their own ship page; lurkers see real outcomes
- Trust: returning visitors see new ships every week — proof the engine runs

### 6. Trust ledger — the credibility moat

[#6-trust-ledger](#6-trust-ledger)

Publish the numbers most platforms hide. % of committers who ship. Median days to launch. Abandonment rate by capability tier. Quarterly retros. The product page literally says "creation is cheap; outcomes are scarce" — back it up.

**What to build:**

- A `/proof` page with live metrics derived from the `events` and `commitments` tables
- Public quarterly retro posts
- Honest failure surfacing: not just ships, but committed-but-abandoned counts and (anonymized) reasons

**Why it works:** every competitor will claim to help you ship. None will show you their abandonment rate. Showing it is the cheapest, strongest possible signal of integrity.

---

## Phasing

[#phasing](#phasing)

These overlap. Inside each phase, the goal is named, not the feature list.

### Phase A (0–60 days) — finish the promise

[#phase-a-finish-the-promise](#phase-a-finish-the-promise)

The current loop has one fatal hole: the AI Build path ends at a screen, not a product. Close it.

- Complete `FOLLOWUPS.md` operational config (Stripe, Resend webhook, founder analytics)
- Ship **AI Build v1** against a single starter kit, end-to-end, for 20 hand-picked non-builders
- Build the **Shipped Wall** scaffold even before there are 10 ships to put on it — the existence of the wall is also a forcing function
- Document every ship obsessively. Each one is marketing forever.

**Success:** 20 non-builders complete the full loop. ≥10 ship something real. The Shipped Wall has its first inhabitants.

### Phase B (60–180 days) — make the engine defensible

[#phase-b-make-the-engine-defensible](#phase-b-make-the-engine-defensible)

The promise works for individuals. Make it work at scale without sacrificing taste.

- Build the **demand-signal pipeline**. Manual curation continues but feeds *from* the pipeline rather than from a Notion doc.
- Ship the **taste model** behind feed ranking, with "we chose this because…" transparency
- Add a **second starter kit** to the AI Build library
- Ship the **trust ledger** at `/proof`
- Reach 100 public ships on the wall

**Success:** the signal pipeline produces opportunities a returning user feels were made for them. Conversion from feed → commit climbs without the funnel changing.

### Phase C (180+ days) — distribution

[#phase-c-distribution](#phase-c-distribution)

The Shipped Wall is doing SEO work. The taste model is sharp. The AI Build pipeline has three or more kits and converts. Time to put fuel in.

- Partnerships with creator-economy distribution (Indie Hackers, ProductHunt, established newsletters in the build-in-public space)
- A "Ships of the Year" annual editorial moment — designed to be quoted
- Open the signal pipeline as a teaser API or public dashboard ("what the market is asking for, this month") — top-of-funnel content that also recruits builders
- Begin the case for the next product surface (mobile-first version, if data supports it — not before)

---

## What we will not build

[#what-we-will-not-build](#what-we-will-not-build)

These have come up. They are off the table unless the strategic frame changes.

- A community feed, forum, or DMs. Not a community product.
- Idea voting. Not democratic. The curators are accountable.
- A general "AI builds any app" tool. Out of scope, and the moat disappears.
- Badges, streaks, trophies, confetti, push spam. Aesthetically and philosophically off-brand.
- A marketplace where users sell apps to other users. Not the unit of value.
- Mobile apps before the desktop loop converts. Not before.

---

## Working test for every new feature

[#working-test-for-every-new-feature](#working-test-for-every-new-feature)

1. Does it increase **leverage**, **trust**, or **distribution**?
2. Does it produce more **shipped products** — or make each one **more visible**?
3. Would it feel at home on the back of a leather-bound book?

A "no" on any of the three is a "no" on shipping it.

---

*Last updated: May 2026. Owner: Josh. Pair with `CLAUDE.md` for architecture, `FOLLOWUPS.md` for deferred config.*
