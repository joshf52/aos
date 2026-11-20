# AOS Starter Kit

Materialized by the AOS AI Build compiler. One starter shape, one wedge, one price.

- `kit.config.ts` — every customizable string and prompt, written by the compiler.
- `app/page.tsx` — landing
- `app/workflow/page.tsx` — the wedge
- `app/pricing/page.tsx` — one card, stubbed Stripe
- `app/about/page.tsx` — built-by line
- `app/api/wedge/route.ts` — text-in / text-out handler
- `app/api/health/route.ts` — returns `AOS_BUILD_ID`, so AOS can confirm the public address serves this build before calling it live
- `lib/ai.ts` — the only place that names a model: `claude-sonnet-5-5` by default, list prices for cost logging, spend limits (input/output caps; per-client, per-app and all-apps request caps checked by the global limiter `kit_admit_ai` in `supabase/schema.sql`, callable only with the server-only `KIT_SUPABASE_SECRET_KEY`, which fails closed), refusal fallback and error mapping. Optional overrides are in `.env.example`. The hard spend ceiling is the Anthropic workspace spend limit on the key, not these caps.

Visual language is inherited from AOS: dark warm-ink palette, editorial serif headlines, Plus Jakarta body, gold for the conversion moment.
