# CLAUDE.md — AOS

> Persistent context for Claude Code working on AOS.
> Read this fully before any task. Update it as decisions evolve.

---

## What AOS Is

AOS is a decision and leverage engine for anyone who wants to build a product — whether they can write code or not. It helps people figure out **what** to build and **how** to win, then either supports them building it themselves or has AI build it for them.

It is **not**: an idea generator, a marketplace, a community, or a one-size-fits-all code generator.

It **is**: curated opportunities with real demand signals, a structured framework for evaluating them, a 30-day commitment system that turns evaluation into shipped products, and an AI build path for those who can't (or don't want to) build themselves.

### Core philosophy
- Creation is cheap. Judgment, taste, trust, and distribution are scarce.
- The product guides decisions, enforces clarity, and rewards outcomes.
- Every feature must increase **leverage**, **trust**, or **distribution**. If it doesn't, it doesn't ship.
- The right opportunity for someone who can't code is just as valuable as one for someone who can.

### User types
Two first-class user types, determined in onboarding and changeable at any time:

- **Builders** — people who will build it themselves (technical or no-code capable). The existing flow applies: evaluate → commit → sprint → ship.
- **Non-builders** — people who want the opportunity identified and built for them via AI. Same opportunity feed, same Decision Lens, but the Commitment path hands off to an AI build service rather than a personal sprint.

The opportunity feed, scoring, and curation are **unified** — both types see the same opportunities, personalized only by interests and abilities. What differs is the CTA and the path after commitment.

### Monetization
- **Pro tier** — $29/month. Builders get 3 concurrent commitments; non-builders get expanded AI build access.
- **AI Build subscription** — separate tier for non-builders. Free trial period, then paid subscription. Pricing TBD.
- Future: scarcity-based access, platform revenue share

---

## Naming Status

Currently codenamed **AOS**. Final name undecided.

Ruled out: Northstar, Lodestar, Pact, Conviction, Keel — all have funded competitors in adjacent spaces.

Active candidate: **Helm**. Decision deferred. Use "AOS" in all code and copy until resolved.

---

## ⚠️ Critical: Two Codebases, One Truth

There are two parallel artifacts from the design phase. **They have not been reconciled.**

### The Next.js scaffold (`app/`, `lib/`, `components/`, `supabase/`)
Real production structure with pages, auth, Supabase schema, RLS policies, types, middleware, server actions. **But built in the wrong visual style** — light theme, sans-serif everywhere, no animations, generic SaaS aesthetic. Functional skeleton, wrong skin.

### The mobile prototype (`prototypes/aos-mobile-v2.jsx`)
Single-file React component with in-memory state. **The final visual direction** — dark warm-ink palette, serif headers, gold for sacred moments, framer-motion springs, the full Ceremony with hold-to-sign and gold seal, the onboarding constellation. Right skin, no skeleton.

**The first major Claude Code task is porting the visual language from the mobile prototype into the Next.js scaffold while preserving the routing, Supabase wiring, and data model.**

---

## The Core User Flow

```
Visit → Filter (capability) → Reveal (one opportunity) → Auth →
Onboarding (5 questions, including build mode) → Personalizing (the wow moment) →
Feed → Evaluate (Decision Lens, 5 steps) → Commit (Ceremony) →
  ├── Builder path: Sprint Dashboard → Weekly Check-ins → Ship
  └── Non-builder path: AI Build handoff → Progress tracking → Ship
```

Atomic unit of value: **a user goes from "I don't know what to build" → actively building (or having built) something with a clear wedge and a 30-day plan, within 7 days of signing up.**

### Build mode
Captured in onboarding as a first-class profile field (`build_mode`). Two values:
- `self` — the builder path. User owns the sprint.
- `ai` — the non-builder path. AI builds it; user owns the outcome.

Mutable at any time from Preferences. Changing from `ai` → `self` mid-commitment is allowed; the sprint dashboard activates. Changing from `self` → `ai` mid-commitment prompts a confirmation (the sprint pauses).

---

## The Three Core Features

### 1. Opportunity Engine
Curated opportunities, 5 per week at MVP, hand-selected. Each has: The Gap, The Signal, The Wedge, Example Customer, Why Now. Confidence score 1-5. Only opportunities scoring 3+ ship. MVP is manually curated; automated signal collection is Phase 2.

### 2. Decision Lens
A 5-step wizard that forces strategic clarity:
1. Who exactly is the customer?
2. What are they doing today instead?
3. Why would they switch to you?
4. What's the smallest test you can ship?
5. What does success look like in 30 days?

Each question is full-screen, in serif type. Cannot be skipped. Saves on every step.

### 3. Commitment System (with The Ceremony)
30-day sprint with weekly check-ins. The commitment moment is **The Ceremony** — the wow factor:
- Lens answers fan out as cards in dark space
- Cards fold into a "Builder's Covenant" document
- Press-and-hold a gold button to sign (1.5s hold)
- Signature animates onto the page
- Gold wax seal embosses with deep haptic feedback
- One bell tone, one shimmer of gold dust

This is the moment people screenshot. Protect it.

---

## Reputation System

Four stages, derived from actions: Explorer → Builder → Shipper → Proven.

Free tier: 1 active commitment max. Pro tier: 3 concurrent. Abandonment triggers cooldown periods. "Shipped" requires a URL — self-reported but spot-checked.

---

## Onboarding Flow

After capability selection:
1. **Build mode** — "I'll build it myself" / "Build it for me with AI". This is the new first question. Shown before domains so the entire rest of the flow can be framed correctly. Non-builders see a brief explanation of the AI build service and the free trial.
2. **Domains** — pick 3+ from 12 worlds (chips)
3. **Audience** — Creators / Indie Hackers / Small Business / Consumers
4. **Commitment level** — Exploring / Building / All in (label adapts: builders see "How serious is this?", non-builders see "How involved do you want to be?")
5. **Advantage** — free text with cycling placeholder (label adapts: builders see "What's your edge?", non-builders see "What do you know that others don't?")
6. **The Personalizing reveal** — answers float into a constellation, gold pulse, resolves to "Twelve opportunities, curated for you."

All answers (including build mode) must be editable from Preferences (gear icon in You tab). Edit screens reuse the exact onboarding components. Bottom-sheet animation for edits.

### Non-builder experience differences
- Feed cards show "Have AI build this" CTA instead of "Evaluate this opportunity" (or both, with hierarchy)
- Opportunity detail has an additional section: estimated build scope / what the AI would produce
- After the Ceremony, the non-builder sees an AI Build handoff screen instead of the Sprint Dashboard
- The AI Build handoff presents a summary of what will be built, what's needed from them (domain access, accounts, etc.), and activates the free trial or subscription

---

## Visual Design Language

### Mood
Quiet confidence. Editorial. Premium. Like a craftsperson's notebook.

References: Things 3, Linear, Apple Wallet, Stripe, the back of an old leather-bound book.

### Palette (dark-first)
```
bg:               #0A0A0C   (warm ink black)
surface:          #15151A
surfaceElevated:  #1C1C22
border:           rgba(245, 242, 237, 0.06)
borderStrong:     rgba(245, 242, 237, 0.12)
text:             #F5F2ED   (warm cream, never pure white)
textSecondary:    #8A8580
textTertiary:     #5A5650
accent:           #3DB87A   (organic emerald — for action)
gold:             #D4A574   (aged gold — for sacred moments only)
```

### Typography
- **Display & body sans:** Plus Jakarta Sans
- **Editorial serif:** New York / Charter / Georgia / Cormorant — used for opportunity titles, lens questions, ceremony copy, page headers
- **Mono:** JetBrains Mono with tabular nums

The serif is the soul of the brand. Use it for any "thesis moment." Never for body copy.

### Spacing
4pt grid. Heroic whitespace. Cards breathe — minimum 18px internal padding, 24px on key surfaces.

### Motion
- Spring physics on every transition. Never linear.
- Standard easing: `cubic-bezier(0.22, 1, 0.36, 1)` for most things, `cubic-bezier(0.22, 1.5, 0.36, 1)` for celebratory pops
- Page transitions: cards rise from below

### Anti-patterns
- Pure white (`#FFFFFF`) — always warm cream
- Generic sans-serif headlines — always serif for brand moments
- Confetti, balloons, "🎉" — never. Use gold dust + bell tone instead.
- Generic "AI-style" purple/blue gradients — never

---

## Tech Stack

### Decided
- **Frontend:** Next.js 14, App Router, Server Components first
- **Styling:** Tailwind CSS with custom design tokens for the dark editorial palette
- **Animation:** framer-motion
- **Backend:** Next.js API routes + Server Actions
- **Database:** Supabase (Postgres) with Row Level Security
- **Auth:** Supabase Auth (email + Google + GitHub OAuth)
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514`) + OpenAI text-embedding-3-small
- **Deployment:** Vercel
- **Email:** Resend

### Explicitly rejected
Separate backend, GraphQL/tRPC, Prisma, Redis, MongoDB, mobile-first React Native at MVP.

---

## Database Schema

Full schema in `supabase/migrations/001_initial_schema.sql`. Tables:

- `profiles` — extends auth.users; capability, unfair_advantage. **Needs extension** with: `domains text[]`, `audience text`, `commitment_level text`, `build_mode text` (values: `'self'` | `'ai'`) for the new onboarding.
- `opportunities` — title, slug, capability, gap, signal, wedge, example_customer, why_now, confidence, builder_count, is_active
- `decision_lenses` — user_id, opportunity_id, 5 answer fields, current_step, completed_at
- `commitments` — user_id, opportunity_id, lens_id, status, started_at, completed_at, abandoned_at
- `checkins` — commitment_id, week_number, shipped_learned, blockers, next_focus
- `events` — analytics tracking

RLS on for all user tables. Opportunities are public-read. The auth trigger (`handle_new_user`) auto-creates a profile on signup — must be created manually in the Supabase SQL editor.

---

## Project Structure

```
app/
├── (marketing)/page.tsx       # Landing
├── (app)/
│   ├── feed/                  # Will become "Today"
│   ├── opportunity/[slug]/
│   ├── lens/[id]/
│   └── dashboard/             # Will become "Sprint"
│       └── checkin/[id]/
├── auth/
│   ├── login/, signup/
│   ├── callback/route.ts
│   └── signout/route.ts
├── api/commit/route.ts
└── opportunity/preview/

components/
lib/
├── supabase/                  # client, server, middleware
├── ai/                        # Phase 2
└── utils.ts
types/database.ts
supabase/
├── migrations/
└── seed.sql
prototypes/
└── aos-mobile-v2.jsx          # Visual reference for the design language
```

Routes to add:
- `/onboarding/domains`, `/onboarding/audience`, `/onboarding/commitment`, `/onboarding/advantage`, `/onboarding/personalizing`
- `/profile` (the "You" tab)
- `/preferences` (with bottom-sheet edit pattern)
- `/commit/[id]/ceremony` (separate full-screen route)

---

## Code Conventions

- TypeScript strict. No `any` without comment.
- Server Components by default. `'use client'` only when state, effects, or browser APIs are needed.
- Server Actions for mutations.
- Forms: `react-hook-form` + `zod`.
- Naming: kebab-case files, PascalCase components, camelCase functions.
- Imports: absolute via `@/*`.
- No barrel files.
- Comments explain *why*, never *what*.

---

## Current Status (Honest Assessment)

### What works
- **Database** — migrations 001–004 applied: initial schema, profile extensions (domains, audience, commitment_level, build_mode), opportunity domain tagging for personalization, email-state columns (welcomed_at, last_nudged_at). 5 real opportunities seeded. RLS on user tables; auth trigger creates profiles on signup.
- **Auth** — Supabase email + Google + GitHub OAuth. Callback redirects to onboarding when the profile is incomplete.
- **Onboarding flow** — all 5 questions live (`/onboarding/build-mode`, `/domains`, `/audience`, `/commitment`, `/advantage`) plus the Personalizing constellation reveal.
- **Core screens, redesigned** — landing, feed (personalized by user-selected domains), opportunity detail, Lens wizard (full-screen serif), Sprint Dashboard, weekly check-in. Dark warm-ink palette, editorial serif, spring motion, hover/focus-ring audit applied across interactive elements.
- **The Ceremony** — full-screen route at `/commit/[id]/ceremony` with card fan-in, document fold, hold-to-sign, gold seal, bell tone, gold-dust shimmer, haptic feedback.
- **Non-builder path** — `/commit/[id]/ai-build` handoff screen; feed and opportunity detail branch on `build_mode`.
- **Profile + Preferences** — `/profile` (the "You" tab) and `/preferences` with bottom-sheet edits that reuse onboarding components. Build mode is mutable.
- **Ship flow** — `/commit/[id]/ship` for self-reporting a shipped URL.
- **Email** — `lib/email/` (Resend client + templates) sends transactional welcome and weekly check-in nudges. Cron at `/api/cron/checkin-nudge` runs via `vercel.json`. Idempotency via `welcomed_at` / `last_nudged_at`.
- **Reputation** — `lib/reputation.ts` derives Explorer / Builder / Shipper / Proven from actions.

### What's not built yet
- Founder analytics page (`/founders` with env-gated allowlist)
- `email_events` table + writes (foundation for Resend webhook + email analytics)
- Resend webhook (`/api/webhooks/resend`) for delivery / bounce / complaint events
- Stripe Pro tier — `profiles.tier`, `pro_until`, `stripe_customer_id`, Checkout, `/api/webhooks/stripe`, free 1 / Pro 3 active-commitment cap, upgrade CTA
- Phase 2 automated signal collection for opportunities (still manually curated)
- AI build service integration (handoff exists; the actual build pipeline is TBD)

### Naming
Still undecided. Code uses "AOS" everywhere.

---

## Recommended Order of Work

When starting fresh in Claude Code, do these in order. Don't skip ahead.

### Phase 0 — Get the existing scaffold actually running
1. Create real Supabase project (free tier)
2. Run `supabase/migrations/001_initial_schema.sql` in Supabase SQL editor
3. Run `supabase/seed.sql` to load opportunities
4. Create the auth trigger manually in the SQL editor
5. Configure Google + GitHub OAuth in Supabase dashboard
6. Copy `.env.example` to `.env.local` and fill in credentials
7. `npm install && npm run dev`
8. Verify the existing (ugly) flow works end-to-end

A working ugly app is worth more than a beautiful broken one. **Fix any breakage before moving on.**

### Phase 1 — Design system in code
1. Add color palette to `tailwind.config.ts` as design tokens
2. Add Plus Jakarta Sans + a serif (Cormorant or Crimson Pro from Google Fonts) + JetBrains Mono via `next/font`
3. Create primitive components in `components/ui/`: `<Button>`, `<Card>`, `<Input>`, `<Textarea>` matching the dark editorial style
4. Create motion primitives in `components/motion/`: `<FadeIn>`, `<SpringSlide>`, `<HoldButton>`
5. Make the landing page match the prototype's welcome screen as proof

### Phase 2 — Onboarding flow
1. Extend `profiles` table with `domains`, `audience`, `commitment_level`, `build_mode` (write `002_profile_extensions.sql`)
2. Build the 5 onboarding routes one at a time — starting with build mode (new step 1)
3. Build the constellation reveal (intricate — port carefully)
4. Wire signup to enter onboarding before the feed
5. Update `auth/callback/route.ts` to redirect to onboarding if profile incomplete
6. Implement build-mode branching in feed CTAs and opportunity detail

### Phase 3 — Rebuild core screens with the new design
1. Today (rename Feed): editorial date header, hero opportunity, three rows below
2. Opportunity detail: full-bleed hero, sticky CTA, presence dots, scroll-driven blur
3. Lens wizard: full-screen serif questions, progress arc, spring transitions
4. Sprint (rename Dashboard): 30-day constellation, current week pulse, check-in nudge

### Phase 4 — The Ceremony
Its own phase because it's the soul of the product. Build on its own route (`/commit/[id]/ceremony`) so it can take over full screen. Port the four phases from the prototype: card fan-in, document fold, hold-to-sign, gold seal. Add a single bell tone at the seal moment.

### Phase 5 — Profile and Preferences
1. Build `/profile` (the "You" tab)
2. Build `/preferences` with iOS-style sections
3. Implement bottom-sheet edit pattern that reuses onboarding components

### Phase 6 — Ship
Deploy to Vercel. Recruit 5-10 testers. Measure. Iterate.

---

## Success Metrics for First 14-Day Sprint

- ≥30 signups
- ≥6 commitments (20%+ commit rate)
- ≥3 Week 1 check-ins (50% of committed)
- ≥2 users qualitatively say "this helped me decide"

Failure modes:
- <10% commit rate → opportunities aren't compelling
- >60% lens abandonment → framework is too heavy
- 0 Week 1 check-ins → commitment is performative

---

## Working Style

- **Read this file fully before any task.** Don't skim.
- **Default to small commits with clear messages.**
- **When in doubt, do less.** This product is defined by what it doesn't do.
- **Match the existing voice.** Editorial. Confident. Quiet. Never marketing-speak. Never "AI-powered."
- **Protect the Ceremony moment above all else.**
- **Ask before adding dependencies.** The stack is intentionally small.
- **Update this file when decisions change.** It's the source of truth.

When designing screens:
- Lead with the editorial question or thesis. Wrap utility around it.
- Use serif for the brand moment. Sans for the action. Mono for the data.
- Spring animations only.
- Test on iPhone-sized viewport, not just desktop.
- Reference `prototypes/aos-mobile-v2.jsx` for the visual language. When in doubt, copy its patterns.

---

*Last updated: May 2026. Status: Phases 0–5 substantially shipped — onboarding, redesigned core screens, the Ceremony, profile/preferences, transactional email + check-in nudge cron are all live. Active queue: founder analytics, email events + Resend webhook, Stripe Pro tier scaffolding (see `FOLLOWUPS.md`).*
