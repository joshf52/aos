# AOS Starter Kit

Materialized by the AOS AI Build compiler. One starter shape, one wedge, one price.

- `kit.config.ts` — every customizable string and prompt, written by the compiler.
- `app/page.tsx` — landing
- `app/workflow/page.tsx` — the wedge
- `app/pricing/page.tsx` — one card, stubbed Stripe
- `app/about/page.tsx` — built-by line
- `app/api/wedge/route.ts` — text-in / text-out handler
- `lib/ai.ts` — the only place that names a model: `claude-sonnet-5-5` by default, list prices for cost logging, spend limits (input/output caps, per-IP and daily request caps), refusal fallback and error mapping. Optional overrides are in `.env.example`.

Visual language is inherited from AOS: dark warm-ink palette, editorial serif headlines, Plus Jakarta body, gold for the conversion moment.
