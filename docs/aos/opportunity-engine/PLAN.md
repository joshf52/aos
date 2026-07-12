# AOS — Opportunity-Discovery Engine: Dogfood Build Plan (ultracode)

**What this run does:** make AOS actually *execute* the opportunity-discovery loop
we ran by hand across a long session — idea in, landscape swept, saturation
checked, scored verdict out with a kill condition — so you can dogfood it on real
ideas instead of doing it manually in a chat window. This targets the
**demand-signal pipeline** pillar and is the natural first dogfood because *you*
are the user and the spec is already validated by lived experience.

**The key asset:** the manual session that produced this plan *is* the reference
behavior and the eval set. The target output is "what the assistant did given an
idea: search the space, name the incumbents with evidence, score against the real
filters, return a verdict + kill condition." Five worked ideas give ground truth
(see Phase 1 eval set).

**Grounding first (why Phase 0 exists):** this plan is written without current
knowledge of the AOS repo state — the last snapshot is Phase A (AI Build pipeline
scaffolded, some wiring left). So Phase 0 inventories reality before anything is
built. Do not let any later phase build on assumptions Phase 0 hasn't confirmed.

**Model routing (your call):** by your own convention this is a broad build →
Opus for Phases 0–3. Reserve Fable specifically for Phase 4 *if* it touches
Supabase RLS / auth policies for storing ideas and runs (multi-user data =
your Fable/safety trigger). No need for Fable on the pure build phases.

---

## Phase 0 — Ground the run (inventory only, no building)

Orchestrator reads, in this order: `VISION.md`, `CLAUDE.md`, `AGENTS.md`, the repo
tree, the last ~30 commits (`git log --oneline`), and any existing `docs/` plan or
status files. Produce `docs/aos/opportunity-engine/CURRENT_STATE.md` containing:

- What exists across the six pillars — built vs. stubbed vs. absent.
- Specifically: the current state of anything resembling demand-signal / idea
  intake / research / scoring. Does any of this loop already exist in part?
- The AI/research plumbing: is there an Anthropic API integration wired
  (`AI_BUILD_ANTHROPIC_KEY`)? Is there any web-search / research capability, or
  does that need building?
- A reconciliation note: has the actual codebase drifted from VISION.md's six
  pillars? Flag drift explicitly.

**Gate:** if a meaningful chunk of the opportunity-discovery loop already exists,
the run pivots from "build from scratch" to "complete and wire." The orchestrator
states which mode it's in before proceeding. **Do not skip this gate.**

---

## Phase 1 — Spec the loop (design, from the lived example)

Write `docs/aos/opportunity-engine/SPEC.md` defining the loop, using this session
as the reference. It must specify:

**Input — an `Idea`:** title, one-line thesis, space/category, the founder's
claimed unfair advantage, optional reference links.

**Pipeline stages:**
1. **Landscape sweep** — automated web research across the space: incumbents,
   funded startups, standards bodies, open-source projects. Gathers evidence, not
   vibes.
2. **Saturation assessment** — who's already doing this, how crowded, how funded,
   how standardized. Outputs an occupancy picture with citations.
3. **Scoring** against the four filters that actually predict solo-builder payoff:
   unfair advantage (audience/distribution/unique knowledge/speed), intrinsic use
   (would you build it anyway / is it useful without "making it big"), expanding
   market (does early beat first), and speed-to-signal (users/revenue fast &
   cheap).
4. **Verdict + kill condition** — one of: *pioneer* / *fast-follow on execution* /
   *build for intrinsic use* / *don't bother* — plus an explicit, measurable kill
   condition.

**Output — a structured `Verdict` object** (JSON, schema-validated) **plus a
human-readable brief** in the style of this session's write-ups.

**The honesty gate (the whole point — encode it as a product rule):** the engine
may **never** report a space as "empty" or "greenfield." Default posture is
*assume occupied until searched*; every occupancy claim carries evidence; and a
"nothing found" result is reported as "no evidence found in N searches," never as
"unoccupied." This is the exact failure this session kept hitting, turned into a
hard rule. Wire it into your existing AOS honesty-gate convention.

**Eval set (ground truth from this session — the regression test):**
- Agent payments / agent wallet → heavily occupied (x402, AP2, MPP, agentpay-mcp,
  Stripe/Coinbase/AWS). Verdict: don't pioneer the rails; fast-follow as a merchant
  at most.
- Seafood provenance → capture occupied (Deckhand, Vericatch), downstream occupied
  (Wholechain, ThisFish). Verdict: wedge questionable; don't build a capture app.
- Agent identity / personhood → gold rush (Microsoft, Okta, Ping, NIST, W3C,
  IETF). Verdict: crowded, not greenfield.
- Sockeye fleet business → intrinsic use + unfair distribution + expanding-enough.
  Verdict: go (the spine).
- $BYCATCH / $GRIND memecoin → toy. Verdict: weekend-capped lottery ticket, fine
  as craft/learning.

---

## Phase 2 — Build the pipeline (against SPEC, mode per Phase 0)

Implement on the current stack (confirm specifics from CURRENT_STATE.md):
- **Idea intake** — form + Supabase table for ideas.
- **Landscape sweep** — a research service module: Claude + web search (or an agent
  loop) that gathers the occupancy evidence. If no research plumbing exists,
  build this stage as the foundation; if the Anthropic key is already wired, extend
  it.
- **Saturation + scoring** — LLM-driven assessment returning schema-validated JSON
  (structured output, parsed, not free text). Enforce the honesty gate here.
- **Verdict + brief generation** — the structured object plus the readable brief.
- **Persistence** — write every run (idea, evidence, scores, verdict) to Supabase
  so runs accumulate and are reviewable. This is what makes it dogfoodable.
- **Minimal UI** — submit an idea, watch the stages, read the verdict brief. Read
  the frontend-design skill before building any UI.

Build incrementally behind flags; each stage independently testable. Don't wire
the UI until the pipeline produces correct verdicts headless.

---

## Phase 3 — Verify against the eval set

Run all five known ideas through the live pipeline headless. Compare each verdict
and occupancy call to the Phase 1 ground truth. Iterate until it reproduces the
manual conclusions — **especially that it flags occupied spaces with evidence
rather than hallucinating greenfield.** If it calls agent payments "open," it
fails; fix the honesty gate. Log a short `EVAL_RESULTS.md`. This is the dogfood
validation — the engine has to pass the exact test the manual process passed.

---

## Phase 4 — Human-only batch + ship + first real run

Orchestrator prepares everything so your interactive steps are **one sitting**:
- Env vars/keys needed (Anthropic key, web-search access, `VERCEL_TOKEN`).
- Any Supabase migration needing interactive `db push` / `link` (keychain).
- **If this run added RLS/auth for ideas & runs — switch to Fable for this phase.**
- Deploy to Vercel.

Then dogfood immediately: feed it one *new* idea you haven't manually analyzed, and
judge whether the verdict is one you'd actually trust. **Kill condition for #4:**
if you don't reach for this tool unprompted within a month of it working, it's a
toy, not a product — shelve it and the time was still a clean AOS build.

---

## Operational notes (your ultracode concerns)

- **Context/saturation:** phase boundaries are natural `/clear` points. Anchor
  every phase to durable artifacts (CURRENT_STATE.md, SPEC.md, git log, EVAL_
  RESULTS.md) so a fresh context can resume from disk, not from a bloated window.
- **Orchestrator vs. subagents:** the landscape-sweep stage is token-heavy —
  delegate sweeps to subagents so the orchestrator stays lean, but watch subagent
  saturation on multi-idea eval runs; run the five eval ideas sequentially, not
  all in one context.
- **Handoff:** end each phase by updating a `PLAN.md` checkbox and a one-line
  status, so the next phase (or the next session) starts from the artifact.
