/**
 * Manual smoke check for the compiler. Run with native Node TS:
 *   node --experimental-strip-types lib/ai-build/smoke-check.ts
 * (Requires Node 22.6+. Explicit .ts extensions needed for native resolution.)
 *
 * Asserts:
 *  - every fixture compiles
 *  - the result validates against buildConfigSchema
 *  - wedge-shape classifications match expectations
 *  - extracted prices match expectations
 */

import { compile } from "./compile.ts";
import { buildConfigSchema } from "./build-config.ts";
import { fixtures } from "./__fixtures__.ts";

const EXPECTED: Record<string, { shape: string; price: string; cadence: string }> = {
  "invoice-dispute-assistant":       { shape: "text-in/text-out",            price: "$19", cadence: "/mo" },
  "notion-template-analytics":       { shape: "connection-in/dashboard-out", price: "$29", cadence: "/mo" },
  "gdpr-cleanup-tool":               { shape: "upload-in/report-out",        price: "$49", cadence: "/mo" },
  "micro-saas-valuation":            { shape: "calc-in/number-out",          price: "$29", cadence: " one-time" },
  "conference-talk-assistant":       { shape: "form-in/draft-out",           price: "$15", cadence: "/mo" },
};

let failed = 0;
for (const f of fixtures) {
  const cfg = compile(f);
  const parsed = buildConfigSchema.safeParse(cfg);
  if (!parsed.success) {
    console.error(`[FAIL] ${f.opportunity.slug}: schema invalid`, parsed.error.issues);
    failed++;
    continue;
  }
  const expect = EXPECTED[f.opportunity.slug];
  if (!expect) {
    console.error(`[FAIL] ${f.opportunity.slug}: no expectations`);
    failed++;
    continue;
  }
  const got = { shape: cfg.workflow.shape, price: cfg.pricing.price, cadence: cfg.pricing.cadence };
  const ok = got.shape === expect.shape && got.price === expect.price && got.cadence === expect.cadence;
  console.log(`${ok ? "[ OK ]" : "[FAIL]"} ${f.opportunity.slug.padEnd(34)} shape=${cfg.workflow.shape} price=${cfg.pricing.price}${cfg.pricing.cadence}`);
  if (!ok) failed++;
}

if (failed > 0) {
  console.error(`\n${failed} failure(s).`);
  process.exit(1);
} else {
  console.log("\nAll fixtures pass.");
}
