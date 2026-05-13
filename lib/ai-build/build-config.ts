/**
 * BuildConfig — the contract between Lens answers and the materialized kit.
 *
 * The compiler reads (opportunity, lens, profile), returns a BuildConfig, and
 * the deployment pipeline writes a corresponding `kit.config.ts` into a clone
 * of starter-kit/. This file is the single source of truth for that shape.
 *
 * Keep this file framework-agnostic — no Supabase, no Next, no AOS UI imports.
 * It's imported by the architecture card, the compiler, and (in mirror form)
 * by the kit itself.
 */

import { z } from "zod";

export const WEDGE_SHAPES = [
  "text-in/text-out",
  "text-in/list-out",
  "upload-in/report-out",
  "connection-in/dashboard-out",
  "form-in/draft-out",
  "calc-in/number-out",
] as const;
export type WedgeShape = (typeof WEDGE_SHAPES)[number];

export const buildConfigSchema = z.object({
  brand: z.object({
    name: z.string().min(1),
    tagline: z.string().min(1),
  }),
  landing: z.object({
    headline: z.string().min(1),
    subhead: z.string().min(1),
    beforeAfter: z.object({
      before: z.string().min(1),
      after: z.string().min(1),
    }),
    whyNow: z.string().min(1),
    ctaLabel: z.string().min(1),
  }),
  workflow: z.object({
    shape: z.enum(WEDGE_SHAPES),
    title: z.string().min(1),
    inputLabel: z.string().min(1),
    inputPlaceholder: z.string().min(1),
    outputLabel: z.string().min(1),
    submitLabel: z.string().min(1),
    systemPrompt: z.string().min(1),
    promptTemplate: z.string().min(1),
  }),
  pricing: z.object({
    price: z.string().min(1),
    cadence: z.string(),
    oneLiner: z.string().min(1),
    ctaLabel: z.string().min(1),
  }),
  about: z.object({
    builtByLine: z.string().min(1),
  }),
  meta: z.object({
    opportunityId: z.string().uuid(),
    opportunitySlug: z.string().min(1),
    commitmentId: z.string().uuid(),
    userId: z.string().uuid(),
    createdAt: z.string(),
  }),
});

export type BuildConfig = z.infer<typeof buildConfigSchema>;

/** Inputs to compile(). Mirrors what we load alongside a commitment. */
export type CompileInputs = {
  opportunity: {
    id: string;
    slug: string;
    title: string;
    example_customer: string | null;
    why_now: string | null;
  };
  lens: {
    answer_1: string | null; // Customer
    answer_2: string | null; // Today
    answer_3: string | null; // Wedge
    answer_4: string | null; // Test
    answer_5: string | null; // Success
  };
  profile: {
    user_id: string;
    unfair_advantage: string | null;
  };
  commitment: {
    id: string;
    created_at: string;
  };
};
