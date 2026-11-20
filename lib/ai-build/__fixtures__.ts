/**
 * Fixtures for compiler validation. Five seeded opportunities matched with
 * plausibly written Lens answers + an example profile. Used by smoke-check.ts.
 */

import type { CompileInputs } from "./build-config";

const profile = {
  user_id: "11111111-1111-4111-8111-111111111111",
  unfair_advantage:
    "has spent a decade running creator-economy ops and watching freelancers leave money on the table",
};

const commitment = {
  id: "22222222-2222-4222-8222-222222222222",
  created_at: "2026-05-13T00:00:00.000Z",
};

export const fixtures: CompileInputs[] = [
  {
    opportunity: {
      id: "aaaaaaaa-0000-4000-8000-000000000001",
      slug: "invoice-dispute-assistant",
      title: "Invoice Dispute Assistant",
      example_customer:
        "Marcus, 34. Runs a 3-person design studio. Lost $8,400 last year to clients who underpaid or ghosted. Spends 4 hours per dispute. Would pay $19/month to never draft those emails again.",
      why_now:
        "AI writing tools are normalized. Freelance economy is growing. Late payment is a structural problem with no incumbent solution below $200/month.",
    },
    lens: {
      answer_1: "freelancers and small agencies who have lost a client dispute",
      answer_2:
        "they either eat the loss or spend hours drafting an email that may burn the relationship anyway",
      answer_3:
        "Draft a calibrated dispute email in 30 seconds that you can paste and send",
      answer_4:
        "Paste the invoice details and situation, get a single ready-to-send dispute email",
      answer_5:
        "100 freelancers have used it at least three times each",
    },
    profile, commitment,
  },
  {
    opportunity: {
      id: "aaaaaaaa-0000-4000-8000-000000000002",
      slug: "notion-template-analytics",
      title: "Notion Template Analytics",
      example_customer:
        "Priya, 28. Sells 4 Notion templates. Makes $3,200/month. Has no idea which sections people use. Would pay $29/month to know.",
      why_now:
        "Notion API matured in 2023. Template selling is now a legitimate business model.",
    },
    lens: {
      answer_1: "Notion template creators selling on Gumroad making $1K+/month",
      answer_2: "they ship templates and have no idea which pages get used",
      answer_3:
        "Connect your Notion workspace and see a heatmap of which template sections customers actually open",
      answer_4:
        "Connect via OAuth, see usage dashboards for one of your templates",
      answer_5: "50 paying customers",
    },
    profile, commitment,
  },
  {
    opportunity: {
      id: "aaaaaaaa-0000-4000-8000-000000000003",
      slug: "gdpr-cleanup-tool",
      title: "GDPR Cleanup Tool",
      example_customer:
        "Anika, CTO at a 12-person SaaS. Has 47 unanswered deletion requests. Would pay $49/month to make the legal risk go away.",
      why_now:
        "GDPR enforcement is ramping up on smaller companies.",
    },
    lens: {
      answer_1: "CTOs at small SaaS companies (5–30 people) with pending deletion requests",
      answer_2:
        "they ignore the requests because building proper deletion is a 2-week engineering project",
      answer_3:
        "Upload your customer table, get a compliant deletion audit trail and the SQL to run",
      answer_4: "Upload a CSV of users, generate a per-user deletion report",
      answer_5: "10 SaaS companies have run a real deletion through the tool",
    },
    profile, commitment,
  },
  {
    opportunity: {
      id: "aaaaaaaa-0000-4000-8000-000000000004",
      slug: "micro-saas-valuation",
      title: "Micro-SaaS Valuation Calculator",
      example_customer:
        "Jamie, 31. Built a $2,400 MRR Zapier alternative. Would pay $29 one-time to find out what it's worth.",
      why_now:
        "The micro-SaaS acquisition market matured 2021–2023.",
    },
    lens: {
      answer_1: "indie hackers preparing to list their SaaS on Acquire.com",
      answer_2:
        "they either guess from forum threads or pay a broker 10% for an opinion",
      answer_3:
        "Enter your MRR, churn, growth, and comps — get a valuation range with reasoning",
      answer_4:
        "Calculator that estimates a valuation range from MRR/churn/growth inputs",
      answer_5: "30 indie hackers have used it before listing",
    },
    profile, commitment,
  },
  {
    opportunity: {
      id: "aaaaaaaa-0000-4000-8000-000000000005",
      slug: "conference-talk-assistant",
      title: "Conference Talk Submission Assistant",
      example_customer:
        "Sarah, 29. Senior engineer. Submitted 8 CFPs, got rejected from all 8. Would pay $15/month during conference season.",
      why_now:
        "Remote work normalized conference speaking as a career lever.",
    },
    lens: {
      answer_1: "senior engineers trying to break into conference speaking",
      answer_2:
        "they write CFP submissions in a doc, get rejected, and never learn why",
      answer_3:
        "Fill in the CFP form, get a rewritten abstract that mirrors accepted talks at your target conference",
      answer_4:
        "Form with talk title and abstract — AI returns a rewritten draft with notes",
      answer_5: "20 speakers have gotten at least one acceptance",
    },
    profile, commitment,
  },
];
