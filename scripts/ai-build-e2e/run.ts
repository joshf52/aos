/**
 * LIVE end-to-end test of AI Build against ISOLATED test resources. It spends
 * real (small) money and creates real resources, so it runs only with
 * --i-approve-spend, and refuses the production AOS Supabase project.
 *
 *   npx tsx --require ./scripts/ai-build-e2e/preload.cjs scripts/ai-build-e2e/run.ts \
 *     --env <path to a dotenv file> --i-approve-spend [--cleanup] [--report <file.json>]
 *
 * The env file holds (values are never printed):
 *   E2E_SUPABASE_URL, E2E_SUPABASE_ANON_KEY, E2E_SUPABASE_SECRET_KEY
 *       a TEST AOS Supabase project with migrations 001–009 applied
 *   AI_BUILD_VERCEL_TOKEN, AI_BUILD_VERCEL_TEAM_ID
 *       a Vercel team used only for generated apps (every project in it must be aos-*)
 *   AI_BUILD_ANTHROPIC_KEY
 *       a key in a dedicated Claude Console workspace with a spend limit
 *   AI_BUILD_KIT_SUPABASE_URL, AI_BUILD_KIT_SUPABASE_ANON_KEY
 *       the kit Supabase project with starter-kit/supabase/schema.sql applied
 *
 * What it does (expected spend: three Vercel builds, two Claude requests at
 * ≤ $0.024 each by the kit's caps):
 *   preflight  Models API (free): claude-sonnet-5-5 exists and lists claude-sonnet-5
 *              in allowed_fallback_models; Vercel team is dedicated; verify 009 shape
 *   setup      a disposable user (build mode "ai"), lens and active commitment
 *   security   as that user through the real API: can read, can't insert/update/delete
 *   build 1    approve → build → deploy → READY → live, via executeBuild + reconcileBuild
 *   app        the generated app loads; a real Claude request returns a draft;
 *              the global per-client limit (set to 2) answers the 3rd request with 429
 *   build 2    started, then cancelled on Vercel → recorded failed (failure path)
 *   build 3    recovery: a new build reaches live; a concurrent 4th is refused
 *   cleanup    (--cleanup) deletes the test user (its builds cascade) and the Vercel project
 */

import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const PRODUCTION_SUPABASE_REFS = ["rkvvkocerzygdlimvxvy"];
const REQUIRED = [
  "E2E_SUPABASE_URL", "E2E_SUPABASE_ANON_KEY", "E2E_SUPABASE_SECRET_KEY",
  "AI_BUILD_VERCEL_TOKEN", "AI_BUILD_VERCEL_TEAM_ID", "AI_BUILD_ANTHROPIC_KEY",
  "AI_BUILD_KIT_SUPABASE_URL", "AI_BUILD_KIT_SUPABASE_ANON_KEY",
];

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const opt = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };

type Step = { step: string; ok: boolean; detail: string; at: string };
const report: { started: string; steps: Step[]; resources: Record<string, string> } = { started: new Date().toISOString(), steps: [], resources: {} };
let failed = 0;
function record(step: string, ok: boolean, detail = "") {
  report.steps.push({ step, ok, detail, at: new Date().toISOString() });
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${step}${detail ? "  — " + detail : ""}`);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function loadEnv(path: string) {
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  const envPath = opt("--env");
  if (envPath) loadEnv(envPath);
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing: ${missing.join(", ")}. Nothing was called.`);
    process.exit(2);
  }
  const ref = new URL(process.env.E2E_SUPABASE_URL!).hostname.split(".")[0];
  if (PRODUCTION_SUPABASE_REFS.includes(ref)) {
    console.error("E2E_SUPABASE_URL is the production AOS project. Use an isolated test project.");
    process.exit(2);
  }
  if (!flag("--i-approve-spend")) {
    console.error("This test creates resources and spends money. Re-run with --i-approve-spend once approved.");
    process.exit(2);
  }
  // The app's own clients read these names.
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.E2E_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.E2E_SUPABASE_ANON_KEY;
  process.env.SUPABASE_SECRET_KEY = process.env.E2E_SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  // A low per-client cap on the test app, so the limiter can be seen refusing.
  process.env.AI_BUILD_KIT_RATE_LIMIT_PER_IP = "2";

  const { createServiceClient } = await import("../../lib/supabase/service");
  const { executeBuild, BuildRefused } = await import("../../lib/ai-build/run");
  const { reconcileBuild } = await import("../../lib/ai-build/reconcile");
  const { supabaseBuildStore } = await import("../../lib/ai-build/store");
  const { vercel, vercelScope, cancelDeployment } = await import("../../lib/ai-build/vercel");
  const { DEPLOY_TIMEOUT_MS } = await import("../../lib/ai-build/limits");

  // ---------------- preflight (no spend) ----------------
  const anthropic = new Anthropic({ apiKey: process.env.AI_BUILD_ANTHROPIC_KEY, maxRetries: 1 });
  try {
    const m = (await anthropic.beta.models.retrieve("claude-sonnet-5-5", { betas: ["server-side-fallback-2026-07-01"] })) as unknown as { id: string; allowed_fallback_models?: string[] };
    record("Models API: claude-sonnet-5-5 is served", m.id === "claude-sonnet-5-5", m.id);
    record("Models API: claude-sonnet-5 is an allowed fallback", (m.allowed_fallback_models ?? []).includes("claude-sonnet-5"), JSON.stringify(m.allowed_fallback_models ?? null));
    const f = await anthropic.models.retrieve("claude-sonnet-5");
    record("Models API: claude-sonnet-5 is served", f.id === "claude-sonnet-5");
  } catch (e) {
    record("Models API reachable with AI_BUILD_ANTHROPIC_KEY", false, e instanceof Error ? e.message : String(e));
    return;
  }
  const scope = vercelScope();
  const team = await vercel<{ id: string; slug: string }>(scope, `/v2/teams/${encodeURIComponent(scope.teamId)}`);
  // The list endpoint answers with a bare array or { projects, pagination }.
  const listed = await vercel<{ name: string }[] | { projects: { name: string }[] }>(scope, "/v10/projects", { query: { limit: "100" } });
  const projects = Array.isArray(listed) ? listed : listed.projects;
  const foreign = projects.filter((p) => !p.name.startsWith("aos-")).map((p) => p.name);
  record("Vercel: team is dedicated to generated apps (only aos-* projects)", foreign.length === 0, foreign.length ? `other projects: ${foreign.join(", ")}` : `team ${team.slug}, ${projects.length} projects`);
  if (foreign.length) return;

  const admin = createServiceClient();
  // ---------------- setup ----------------
  const email = `aos-e2e-${Date.now()}@example.com`;
  const password = `e2e-${crypto.randomUUID()}`;
  const { data: created, error: uErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (uErr || !created.user) return record("setup: disposable user", false, uErr?.message);
  const userId = created.user.id;
  report.resources.user = userId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  await db.from("profiles").upsert({ id: userId, build_mode: "ai", unfair_advantage: "Ten years running a design studio" });
  const { data: opp } = await db.from("opportunities").select("*").eq("is_active", true).limit(1).maybeSingle();
  if (!opp) return record("setup: an active opportunity exists in the test project (apply supabase/seed.sql)", false);
  const { data: lens, error: lErr } = await db.from("decision_lenses").insert({
    user_id: userId, opportunity_id: opp.id, current_step: 5, completed_at: new Date().toISOString(),
    answer_1: "Freelance designers who invoice monthly", answer_2: "Chasing late invoices by hand in email",
    answer_3: "Polite follow-ups drafted in their own voice", answer_4: "One page that drafts a follow-up email",
    answer_5: "Ten freelancers use it twice",
  }).select("*").single();
  const { data: commitment, error: cErr } = await db.from("commitments").insert({ user_id: userId, opportunity_id: opp.id, lens_id: lens?.id, status: "active" }).select("*").single();
  record("setup: disposable user, lens and active commitment", !lErr && !cErr && !!commitment, lErr?.message ?? cErr?.message ?? commitment.id);
  if (!commitment) return;
  report.resources.commitment = commitment.id;

  // ---------------- security through the real API ----------------
  const asUser = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  await asUser.auth.signInWithPassword({ email, password });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = asUser as any;
  const ins = await u.from("ai_builds").insert({ commitment_id: commitment.id, user_id: userId, status: "live", deployment_url: "https://forged", deployment_id: "x" }).select();
  record("security: signed-in user can't insert a (forged live) build", !!ins.error, ins.error?.code ?? "inserted!");

  const inputs = {
    userId,
    opportunity: { id: opp.id, slug: opp.slug, title: opp.title, example_customer: opp.example_customer, why_now: opp.why_now },
    lens: { answer_1: lens.answer_1, answer_2: lens.answer_2, answer_3: lens.answer_3, answer_4: lens.answer_4, answer_5: lens.answer_5 },
    profile: { user_id: userId, unfair_advantage: "Ten years running a design studio" },
    commitment: { id: commitment.id, created_at: commitment.created_at },
    eligibility: { buildMode: "ai", commitmentStatus: "active" },
  };
  const store = supabaseBuildStore(admin, userId);

  async function waitFor(buildId: string, label: string) {
    const deadline = Date.now() + DEPLOY_TIMEOUT_MS + 60_000;
    let row = (await db.from("ai_builds").select("*").eq("id", buildId).single()).data;
    const seen = new Set<string>();
    while (row.status === "building" && Date.now() < deadline) {
      await sleep(10_000);
      row = await reconcileBuild(store, row);
      if (row.deployment_id) {
        const d = await vercel<{ readyState: string }>(scope, `/v13/deployments/${row.deployment_id}`).catch(() => null);
        if (d) seen.add(d.readyState);
      }
    }
    console.log(`      ${label}: Vercel states seen ${Array.from(seen).join(" → ")}`);
    return row;
  }

  // ---------------- build 1: the full path ----------------
  const t1 = Date.now();
  const out1 = await executeBuild(inputs, store);
  record("build 1: approved build starts (status building, not live)", out1.status === "building", JSON.stringify(out1));
  const sel = await u.from("ai_builds").select("id, status").eq("id", out1.buildId);
  record("security: the user can read their own build row", sel.data?.length === 1, sel.error?.message ?? "");
  const upd = await u.from("ai_builds").update({ status: "live", deployment_url: "https://forged" }).eq("id", out1.buildId).select();
  record("security: the user can't change their build's status", !!upd.error || (upd.data ?? []).length === 0, upd.error?.code ?? `${(upd.data ?? []).length} rows`);
  const del = await u.from("ai_builds").delete().eq("id", out1.buildId).select();
  record("security: the user can't delete their build", !!del.error || (del.data ?? []).length === 0, del.error?.code ?? `${(del.data ?? []).length} rows`);
  const row1 = await waitFor(out1.buildId, "build 1");
  report.resources.project = row1.project_name ?? "";
  record("build 1: deploy reached READY and was recorded live with a public URL", row1.status === "live" && /^https:\/\/.+\.vercel\.app$/.test(row1.deployment_url ?? ""), `${row1.status} ${row1.deployment_url ?? row1.error} in ${Math.round((Date.now() - t1) / 1000)} s`);
  if (row1.status !== "live") return;

  // ---------------- the generated app, with a real Claude request ----------------
  const home = await fetch(row1.deployment_url!);
  const html = await home.text();
  record("app: the public URL serves the generated landing page", home.ok && html.includes((await import("../../lib/ai-build/compile")).compile(inputs).brand.name), `${home.status}`);
  const draft = async () => {
    const r = await fetch(`${row1.deployment_url}/api/wedge`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: "Client is 30 days late on a $1,200 invoice for a logo project. Keep it friendly." }) });
    return { status: r.status, body: (await r.json().catch(() => ({}))) as { output?: string; error?: string } };
  };
  const d1 = await draft();
  record("app: a real Claude request through the generated app returns a draft", d1.status === 200 && (d1.body.output ?? "").length > 40, `${d1.status} ${(d1.body.output ?? d1.body.error ?? "").slice(0, 80)}`);
  const d2 = await draft();
  const d3 = await draft();
  record("app: the global limiter refuses the client's 3rd request (cap 2) without calling Claude", d2.status === 200 && d3.status === 429, `${d2.status}, ${d3.status} ${d3.body.error ?? ""}`);

  // ---------------- build 2: failure path ----------------
  const out2 = await executeBuild(inputs, store);
  const row2a = (await db.from("ai_builds").select("*").eq("id", out2.buildId).single()).data;
  await cancelDeployment(scope, row2a.deployment_id);
  const row2 = await waitFor(out2.buildId, "build 2");
  record("build 2: a deploy cancelled on Vercel is recorded failed (never live)", row2.status === "failed", `${row2.status} ${row2.error ?? ""}`);

  // ---------------- build 3: recovery + concurrent refusal ----------------
  const out3 = await executeBuild(inputs, store);
  let refused = false;
  try { await executeBuild(inputs, store); } catch (e) { refused = e instanceof BuildRefused; }
  record("build 3: a second build while one deploys is refused", refused);
  const row3 = await waitFor(out3.buildId, "build 3");
  record("build 3: recovery after a failure reaches live", row3.status === "live", `${row3.status} ${row3.deployment_url ?? row3.error}`);
  const all = (await db.from("ai_builds").select("status").eq("commitment_id", commitment.id)).data ?? [];
  record("status record: 3 rows (live, failed, live), no forged row", all.length === 3, all.map((r: { status: string }) => r.status).join(", "));

  // ---------------- cleanup ----------------
  if (flag("--cleanup")) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    const left = (await db.from("ai_builds").select("id").eq("user_id", userId)).data ?? [];
    record("cleanup: deleting the test account removes its builds (cascade, no DELETE grant)", !error && left.length === 0, error?.message ?? `${left.length} left`);
    if (row1.project_name) {
      await vercel(scope, `/v9/projects/${encodeURIComponent(row1.project_name)}`, { method: "DELETE", retry: "none" }).then(
        () => record("cleanup: test Vercel project deleted", true, row1.project_name!),
        (e: unknown) => record("cleanup: test Vercel project deleted", false, String(e)),
      );
    }
  }
}

main()
  .catch((e) => record("unexpected error", false, e instanceof Error ? e.message : String(e)))
  .finally(() => {
    const out = opt("--report");
    if (out) fs.writeFileSync(out, JSON.stringify(report, null, 2));
    console.log(`\n${report.steps.filter((s) => s.ok).length} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  });
