/**
 * Lens → BuildConfig compiler. Pure function. No I/O, no LLM.
 *
 * Phase A behavior: classifies the wedge shape from Lens Q4 with a rule-based
 * matcher, then fills every kit slot via deterministic copy templates. The
 * Phase B plan is to swap copyTemplates.* for LLM rewrites with these
 * deterministic strings as the prompt scaffold.
 */

import type { BuildConfig, CompileInputs, WedgeShape } from "./build-config";

// --- Wedge-shape classifier -------------------------------------------------

/**
 * Rule-based classifier over Lens Q4 ("smallest test you can ship") plus the
 * opportunity wedge text. Order matters — earlier rules win.
 */
export function classifyWedgeShape(test: string, wedge: string): WedgeShape {
  const t = `${test} ${wedge}`.toLowerCase();

  // Numerical output — valuation, score, estimate, calculator.
  if (/\b(calculat|valu|estimate|score|appraise|number|range)\b/.test(t)) {
    return "calc-in/number-out";
  }
  // Upload-driven report — pdf, csv, file, document.
  if (/\b(upload|pdf|csv|file|document|attachment|audit)\b/.test(t)) {
    return "upload-in/report-out";
  }
  // Integration / connection — api, oauth, connect, dashboard.
  if (/\b(connect|oauth|api|dashboard|sync|integrat)\b/.test(t)) {
    return "connection-in/dashboard-out";
  }
  // List of suggestions — list, items, suggestions, ideas.
  if (/\b(list|suggest|ideas|options|titles|variants|keywords)\b/.test(t)) {
    return "text-in/list-out";
  }
  // Form draft — form fields with a written draft output.
  if (/\b(form|fields|fill|template|application|submission)\b/.test(t)) {
    return "form-in/draft-out";
  }
  // Default: text in, text out. The Phase A shipping shape.
  return "text-in/text-out";
}

// --- Price extractor --------------------------------------------------------

/**
 * Pulls the willingness-to-pay price from the example_customer paragraph.
 * Prefers prices anchored to a cadence ("$19/month", "$29 one-time") over
 * arbitrary dollar amounts mentioned elsewhere in the paragraph — example
 * customers commonly cite both their losses and their willingness-to-pay in
 * the same sentence, so the cadence is what distinguishes the price tag.
 */
export function extractPrice(exampleCustomer: string | null): { price: string; cadence: string } {
  if (!exampleCustomer) return { price: "$19", cadence: "/mo" };

  const monthly = exampleCustomer.match(/\$(\d{1,4})\s*\/\s*(?:month|mo)\b/i);
  if (monthly) return { price: `$${monthly[1]}`, cadence: "/mo" };

  const yearly = exampleCustomer.match(/\$(\d{1,4})\s*\/\s*(?:year|yr)\b/i);
  if (yearly) return { price: `$${yearly[1]}`, cadence: "/yr" };

  const oneTime = exampleCustomer.match(/\$(\d{1,4})\s+one[-\s]time/i);
  if (oneTime) return { price: `$${oneTime[1]}`, cadence: " one-time" };

  // Fallback: any dollar amount, treated as monthly. Last resort.
  const any = exampleCustomer.match(/\$(\d{1,4})\b/);
  if (any) return { price: `$${any[1]}`, cadence: "/mo" };

  return { price: "$19", cadence: "/mo" };
}

// --- Brand name -------------------------------------------------------------

/**
 * Derives a two-word brand name from the opportunity title. Keeps the kit
 * runnable without a separate naming step. The user can override in Moment 1.
 */
export function deriveBrandName(opportunityTitle: string): string {
  const words = opportunityTitle
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= 2) return opportunityTitle;
  // Take a leading noun and a trailing verb-ish word.
  return `${words[0]} ${words[words.length - 1]}`;
}

// --- Copy templates ---------------------------------------------------------
//
// All landing/workflow/pricing copy. Hand-written in AOS voice. Each function
// takes the trimmed lens answers and returns one editorial string. We avoid
// trailing periods on labels and keep article-less openings where natural —
// the voice is closer to a craftsperson's notebook than to marketing copy.

const trim = (s: string | null | undefined) => (s ?? "").trim();
const firstSentence = (s: string) => {
  const i = s.search(/[.!?]\s|$/);
  return i > 0 ? s.slice(0, i + 1) : s;
};

export const copyTemplates = {
  headline(wedge: string): string {
    // Q3 ("why would they switch") is the load-bearing answer.
    // Lead with its first sentence; force a period.
    const s = firstSentence(trim(wedge));
    return s.endsWith(".") || s.endsWith("?") || s.endsWith("!") ? s : `${s}.`;
  },

  subhead(customer: string): string {
    const c = trim(customer);
    if (!c) return "Built for one specific kind of person, on purpose.";
    return /^for\b/i.test(c) ? c : `For ${c.charAt(0).toLowerCase()}${c.slice(1)}`;
  },

  before(today: string): string {
    const t = trim(today);
    return t || "Today, the workflow is improvised and expensive in time.";
  },

  after(wedge: string): string {
    const w = firstSentence(trim(wedge));
    return w ? `With this: ${w.replace(/\.$/, "")}.` : "A faster, cleaner path to the same outcome.";
  },

  whyNow(why: string | null): string {
    return trim(why) || "The conditions for this only recently lined up. The window is open now.";
  },

  workflowTitle(wedge: string): string {
    const s = firstSentence(trim(wedge)).replace(/\.$/, "");
    // Convert "Stop swallowing bad invoices" → "Draft a dispute"
    // For Phase A, just take the wedge as-is.
    return s || "Run the workflow";
  },

  inputLabel(test: string): string {
    const t = trim(test);
    if (!t) return "Your input";
    // "Paste the invoice details and the situation" → "The situation"
    const m = t.match(/^[A-Za-z][^.,;]{0,60}/);
    return m ? m[0].replace(/^(paste|enter|type|describe|provide|give us|tell us)\s+/i, "").trim() || "Your input" : "Your input";
  },

  inputPlaceholder(test: string, customer: string): string {
    const t = trim(test);
    const c = trim(customer);
    if (t.length > 40) return t;
    return `Example: a real situation you'd actually paste here. ${c ? `Written the way ${c.toLowerCase()} would say it.` : ""}`.trim();
  },

  outputLabel(): string {
    return "Your draft";
  },

  submitLabel(wedge: string): string {
    const w = firstSentence(trim(wedge)).replace(/\.$/, "");
    if (!w) return "Run";
    if (/\b(draft|write|generate|produce)\b/i.test(w)) return "Generate";
    return "Run it";
  },

  systemPrompt(wedge: string, customer: string, advantage: string | null): string {
    const w = trim(wedge);
    const c = trim(customer);
    const a = trim(advantage);
    const lines: string[] = [];
    lines.push(`You produce one piece of output per request, for this specific situation: ${w || "see the user input"}.`);
    if (c) lines.push(`Your reader is: ${c}.`);
    lines.push("You are firm and calibrated. Lead with facts. No preamble, no apology, no hedging.");
    if (a) lines.push(`Voice signal — write as someone who has lived this: ${a}.`);
    return lines.join("\n");
  },

  promptTemplate(test: string): string {
    const t = trim(test);
    const ask = t || "Here is the situation.";
    return `${ask}\n\nHere is the user's input:\n\n{input}\n\nWrite the single piece of output they need. No preamble.`;
  },

  pricingOneLiner(success: string, wedge: string): string {
    const s = trim(success);
    const w = firstSentence(trim(wedge)).replace(/\.$/, "");
    if (s) return s;
    if (w) return `${w}. Cancel anytime.`;
    return "Cancel anytime.";
  },

  pricingCta(): string {
    return "Get early access";
  },

  builtBy(advantage: string | null): string {
    const a = trim(advantage);
    if (!a) return "Built by someone who has lived this.";
    return /^built\b/i.test(a) ? a : `Built by someone who ${a.charAt(0).toLowerCase()}${a.slice(1)}`;
  },

  brandTagline(wedge: string): string {
    const w = firstSentence(trim(wedge)).replace(/\.$/, "");
    return w || "One job, done well.";
  },
};

// --- Compile ----------------------------------------------------------------

export function compile(inputs: CompileInputs): BuildConfig {
  const { opportunity, lens, profile, commitment } = inputs;
  const customer = lens.answer_1 ?? "";
  const today    = lens.answer_2 ?? "";
  const wedge    = lens.answer_3 ?? "";
  const test     = lens.answer_4 ?? "";
  const success  = lens.answer_5 ?? "";

  const shape = classifyWedgeShape(test, wedge);
  const { price, cadence } = extractPrice(opportunity.example_customer);
  const brandName = deriveBrandName(opportunity.title);

  return {
    brand: {
      name: brandName,
      tagline: copyTemplates.brandTagline(wedge),
    },
    landing: {
      headline: copyTemplates.headline(wedge),
      subhead: copyTemplates.subhead(customer),
      beforeAfter: {
        before: copyTemplates.before(today),
        after: copyTemplates.after(wedge),
      },
      whyNow: copyTemplates.whyNow(opportunity.why_now),
      ctaLabel: "Try it now",
    },
    workflow: {
      shape,
      title: copyTemplates.workflowTitle(wedge),
      inputLabel: copyTemplates.inputLabel(test),
      inputPlaceholder: copyTemplates.inputPlaceholder(test, customer),
      outputLabel: copyTemplates.outputLabel(),
      submitLabel: copyTemplates.submitLabel(wedge),
      systemPrompt: copyTemplates.systemPrompt(wedge, customer, profile.unfair_advantage),
      promptTemplate: copyTemplates.promptTemplate(test),
    },
    pricing: {
      price,
      cadence,
      oneLiner: copyTemplates.pricingOneLiner(success, wedge),
      ctaLabel: copyTemplates.pricingCta(),
    },
    about: {
      builtByLine: copyTemplates.builtBy(profile.unfair_advantage),
    },
    meta: {
      opportunityId: opportunity.id,
      opportunitySlug: opportunity.slug,
      commitmentId: commitment.id,
      userId: profile.user_id,
      createdAt: commitment.created_at,
    },
  };
}
