/**
 * Written by the AOS AI Build compiler. Every customizable string in the kit
 * flows through this file. Components import from here, not from inline copy.
 *
 * The default values below let the kit run locally before the compiler has
 * touched it — useful for kit-development and as the Phase A demo fallback.
 */

export type KitConfig = {
  brand: {
    name: string;
    tagline: string;
  };
  landing: {
    headline: string;       // from Lens Q3 (Wedge)
    subhead: string;        // from Lens Q1 (Customer)
    beforeAfter: {
      before: string;       // from Lens Q2 (Today)
      after: string;        // derived from Q3
    };
    whyNow: string;         // from opportunity.why_now
    ctaLabel: string;
  };
  workflow: {
    title: string;          // from Q3, reframed as an action
    inputLabel: string;     // from Q4 schema
    inputPlaceholder: string;
    outputLabel: string;
    submitLabel: string;
    systemPrompt: string;   // baked Claude system prompt
    promptTemplate: string; // baked Claude prompt template, {input} substituted at runtime
  };
  pricing: {
    price: string;          // e.g. "$19"
    cadence: string;        // e.g. "/mo"
    oneLiner: string;       // from Q3, one sentence
    ctaLabel: string;
  };
  about: {
    builtByLine: string;    // from profile.unfair_advantage
  };
  meta: {
    opportunityId: string;
    opportunitySlug: string;
    // Generated builds carry these too (lib/ai-build/build-config.ts); the
    // limiter keys its per-app bucket on commitmentId.
    commitmentId: string;
    userId: string;
    createdAt: string;
  };
};

export const config: KitConfig = {
  brand: {
    name: "Dispute Draft",
    tagline: "The fastest way to push back on a bad invoice.",
  },
  landing: {
    headline: "Stop swallowing bad invoices.",
    subhead:
      "For freelancers and small agencies tired of writing the same painful pushback email from scratch.",
    beforeAfter: {
      before:
        "Today, you either eat the cost or spend an hour drafting a careful reply you hope doesn't burn the client.",
      after:
        "Paste the situation, get a calibrated dispute email written in your voice. Send it. Move on.",
    },
    whyNow:
      "Payment terms have stretched in the last 18 months. Disputes are up. Most people lose because they never write the email.",
    ctaLabel: "Draft a dispute email",
  },
  workflow: {
    title: "Draft your dispute",
    inputLabel: "The situation",
    inputPlaceholder:
      "Invoice was for $4,800 over six weeks. Client now says they only expected to pay $3,200 and is refusing the difference. We have email confirming the original scope.",
    outputLabel: "Your draft",
    submitLabel: "Draft email",
    systemPrompt:
      "You write firm, professional invoice-dispute emails. You are calibrated — never aggressive, never apologetic. Lead with facts. Quote scope when relevant. End with a clear ask and a deadline. Match the tone of a senior freelancer who has done this before.",
    promptTemplate:
      "Here is the situation:\n\n{input}\n\nWrite a single dispute email the freelancer can paste into their inbox and send today. Subject line first, then body. No preamble, no explanation.",
  },
  pricing: {
    price: "$19",
    cadence: "/mo",
    oneLiner: "Unlimited drafts. Cancel anytime.",
    ctaLabel: "Get early access",
  },
  about: {
    builtByLine:
      "Built by someone who has spent a decade watching freelancers undercharge and then capitulate.",
  },
  meta: {
    opportunityId: "00000000-0000-0000-0000-000000000000",
    opportunitySlug: "invoice-dispute-assistant",
    commitmentId: "00000000-0000-0000-0000-000000000000",
    userId: "00000000-0000-0000-0000-000000000000",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
};
