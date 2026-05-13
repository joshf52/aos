/**
 * Manual smoke check for materialize(). Verifies the kit walks cleanly and
 * the generated kit.config.ts contains the compiled BuildConfig.
 *
 *   node --experimental-strip-types lib/ai-build/check-materialize.ts
 */

import { compile } from "./compile.ts";
import { fixtures } from "./__fixtures__.ts";
import { materialize } from "./materialize.ts";

const cfg = compile(fixtures[0]);
const files = await materialize(cfg);
console.log(`materialized ${files.length} files:`);
for (const f of files) {
  console.log(`  ${f.path.padEnd(46)} ${f.content.length}b`);
}
const kc = files.find((f) => f.path === "kit.config.ts");
if (!kc) { console.error("Missing kit.config.ts!"); process.exit(1); }
console.log(`\nkit.config.ts (first 280 chars):\n${kc.content.slice(0, 280)}…`);

const types = files.find((f) => f.path === "kit.config.types.ts");
if (!types) { console.error("Missing kit.config.types.ts!"); process.exit(1); }

if (!kc.content.includes(cfg.landing.headline)) {
  console.error(`\nkit.config.ts is missing the compiled headline.`);
  process.exit(1);
}
console.log("\nAll checks pass.");
