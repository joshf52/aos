/**
 * LIVE end-to-end test of AI Build against ISOLATED test resources. It spends
 * real (small) money and creates real resources, so it runs only with
 * --i-approve-spend, and it refuses anything but <ref>.supabase.co test
 * projects (never the production AOS project).
 *
 *   npm run e2e:ai-build -- --env <dotenv file> --i-approve-spend [--cleanup] [--report <file.json>]
 *
 * The env file holds (values are never printed):
 *   E2E_SUPABASE_URL, E2E_SUPABASE_ANON_KEY, E2E_SUPABASE_SECRET_KEY
 *       a TEST AOS Supabase project: migrations 001–009, seed.sql, and
 *       supabase/manual/grant_api_roles_fresh_project.sql applied
 *   AI_BUILD_VERCEL_TOKEN, AI_BUILD_VERCEL_TEAM_ID
 *       a Vercel team used only for generated apps (every project in it must be aos-*)
 *   AI_BUILD_ANTHROPIC_KEY
 *       a key in a dedicated Claude Console workspace with a spend limit
 *   AI_BUILD_KIT_SUPABASE_URL, AI_BUILD_KIT_SUPABASE_ANON_KEY, AI_BUILD_KIT_SUPABASE_SECRET_KEY
 *       the kit Supabase project with starter-kit/supabase/schema.sql applied
 *   E2E_TEST_SUPABASE_REFS, E2E_TEST_VERCEL_TEAM_ID
 *       a positive allowlist, stated separately: the project refs of the two
 *       TEST Supabase projects (comma-separated) and the TEST Vercel team id.
 *       Both connections and the team must match, or nothing is called.
 *
 * Expected spend: three Vercel builds and two Claude requests (≤ $0.024 each
 * by the kit's caps). The signed-in UI path (hold-to-approve, status page) is
 * driven separately with a headless browser against the same test user.
 */

import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const PRODUCTION_SUPABASE_REFS = ["rkvvkocerzygdlimvxvy"];
const REQUIRED = [
  "E2E_SUPABASE_URL", "E2E_SUPABASE_ANON_KEY", "E2E_SUPABASE_SECRET_KEY",
  "AI_BUILD_VERCEL_TOKEN", "AI_BUILD_VERCEL_TEAM_ID", "AI_BUILD_ANTHROPIC_KEY",
  "AI_BUILD_KIT_SUPABASE_URL", "AI_BUILD_KIT_SUPABASE_ANON_KEY", "AI_BUILD_KIT_SUPABASE_SECRET_KEY",
  "E2E_TEST_SUPABASE_REFS", "E2E_TEST_VERCEL_TEAM_ID",
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
  return ok;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function loadEnv(path: string) {
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

/** Only canonical <ref>.supabase.co hosts, never production (custom domains can hide which project it is). */
function testProjectRef(name: string): string | null {
  let host: string;
  try { host = new URL(process.env[name]!).hostname; } catch { return null; }
  const m = host.match(/^([a-z0-9]{20})\.supabase\.co$/);
  if (!m || PRODUCTION_SUPABASE_REFS.includes(m[1])) return null;
  return m[1];
}

const cleanups: { label: string; run: () => Promise<void> }[] = [];

async function main() {
  const envPath = opt("--env");
  if (envPath) loadEnv(envPath);
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing: ${missing.join(", ")}. Nothing was called.`);
    process.exit(2);
  }
  const allowed = process.env.E2E_TEST_SUPABASE_REFS!.split(",").map((r) => r.trim()).filter(Boolean);
  for (const name of ["E2E_SUPABASE_URL", "AI_BUILD_KIT_SUPABASE_URL"]) {
    const ref = testProjectRef(name);
    if (!ref || !allowed.includes(ref)) {
      console.error(`${name} must be https://<ref>.supabase.co of a test project listed in E2E_TEST_SUPABASE_REFS (never production).`);
      process.exit(2);
    }
  }
  if (process.env.AI_BUILD_VERCEL_TEAM_ID !== process.env.E2E_TEST_VERCEL_TEAM_ID) {
    console.error("AI_BUILD_VERCEL_TEAM_ID must equal E2E_TEST_VERCEL_TEAM_ID (the test team).");
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
  const { compile } = await import("../../lib/ai-build/compile");
  const { vercel, vercelScope, cancelDeployment, getDeployment } = await import("../../lib/ai-build/vercel");
  const { DEPLOY_TIMEOUT_MS } = await import("../../lib/ai-build/limits");

  // ---------------- preflight (no spend) ----------------
  const anthropic = new Anthropic({ apiKey: process.env.AI_BUILD_ANTHROPIC_KEY, maxRetries: 1 });
  try {
    const m = (await anthropic.beta.models.retrieve("claude-sonnet-5-5", { betas: ["server-side-fallback-2026-07-01"] })) as unknown as { id: string; allowed_fallback_models?: string[] };
    if (!record("preflight: Models API serves claude-sonnet-5-5", m.id === "claude-sonnet-5-5", m.id)) return;
    if (!record("preflight: claude-sonnet-5 is an allowed fallback", (m.allowed_fallback_models ?? []).includes("claude-sonnet-5"), JSON.stringify(m.allowed_fallback_models ?? null))) return;
    const f = await anthropic.models.retrieve("claude-sonnet-5");
    if (!record("preflight: Models API serves claude-sonnet-5", f.id === "claude-sonnet-5")) return;
  } catch (e) {
    record("preflight: Models API reachable with AI_BUILD_ANTHROPIC_KEY", false, e instanceof Error ? e.name : "error");
    return;
  }
  const scope = vercelScope();
  const team = await vercel<{ id: string; slug: string }>(scope, `/v2/teams/${encodeURIComponent(scope.teamId)}`);
  const listed = await vercel<{ name: string }[] | { projects: { name: string }[] }>(scope, "/v10/projects", { query: { limit: "100" } });
  const projects = Array.isArray(listed) ? listed : listed.projects;
  const foreign = projects.filter((p) => !p.name.startsWith("aos-")).map((p) => p.name);
  if (!record("preflight: Vercel team is dedicated to generated apps (only aos-* projects)", foreign.length === 0, foreign.length ? `other projects: ${foreign.join(", ")}` : `team ${team.slug}, ${projects.length} projects`)) return;

  const admin = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const kitAdmin = createClient(process.env.AI_BUILD_KIT_SUPABASE_URL!, process.env.AI_BUILD_KIT_SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

  // ---------------- setup ----------------
  const email = `aos-e2e-${Date.now()}@example.com`;
  const password = `e2e-${crypto.randomUUID()}`;
  const { data: created, error: uErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (!record("setup: disposable user", !uErr && !!created.user, uErr?.message ?? "")) return;
  const userId = created.user!.id;
  report.resources.user = userId;
  report.resources.userEmail = email;
  cleanups.push({
    label: "delete the test account (its builds cascade)",
    run: async () => {
      const { error } = await admin.auth.admin.deleteUser(userId);
      const left = (await db.from("ai_builds").select("id").eq("user_id", userId)).data ?? [];
      if (error || left.length) throw new Error(error?.message ?? `${left.length} builds left`);
    },
  });
  const pErr = (await db.from("profiles").upsert({ id: userId, build_mode: "ai", unfair_advantage: "Ten years running a design studio" })).error;
  const { data: opp } = await db.from("opportunities").select("*").eq("is_active", true).limit(1).maybeSingle();
  if (!record("setup: profile in AI build mode; an active opportunity exists (seed.sql)", !pErr && !!opp, pErr?.message ?? "")) return;
  const { data: lens, error: lErr } = await db.from("decision_lenses").insert({
    user_id: userId, opportunity_id: opp.id, current_step: 5, completed_at: new Date().toISOString(),
    answer_1: "Freelance designers who invoice monthly", answer_2: "Chasing late invoices by hand in email",
    answer_3: "Polite follow-ups drafted in their own voice", answer_4: "One page that drafts a follow-up email",
    answer_5: "Ten freelancers use it twice",
  }).select("*").single();
  const { data: commitment, error: cErr } = await db.from("commitments").insert({ user_id: userId, opportunity_id: opp?.id, lens_id: lens?.id, status: "active" }).select("*").single();
  if (!record("setup: lens and active commitment", !lErr && !cErr && !!commitment, lErr?.message ?? cErr?.message ?? "")) return;
  report.resources.commitment = commitment.id;

  const inputs = {
    userId,
    opportunity: { id: opp.id, slug: opp.slug, title: opp.title, example_customer: opp.example_customer, why_now: opp.why_now },
    lens: { answer_1: lens.answer_1, answer_2: lens.answer_2, answer_3: lens.answer_3, answer_4: lens.answer_4, answer_5: lens.answer_5 },
    profile: { user_id: userId, unfair_advantage: "Ten years running a design studio" },
    commitment: { id: commitment.id, created_at: commitment.created_at },
    eligibility: { buildMode: "ai", commitmentStatus: "active" },
  };
  const store = supabaseBuildStore(admin, userId);
  const brand = compile(inputs).brand.name;

  // ---------------- security through the real API ----------------
  const asUser = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const signIn = await asUser.auth.signInWithPassword({ email, password });
  if (!record("security: test user signs in", !signIn.error, signIn.error?.message ?? "")) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = asUser as any;
  const ins = await u.from("ai_builds").insert({ commitment_id: commitment.id, user_id: userId, status: "building" }).select();
  record("security: the user can't insert a build row", ins.error?.code === "42501", ins.error?.code ?? "inserted!");

  async function waitFor(buildId: string, label: string) {
    const deadline = Date.now() + DEPLOY_TIMEOUT_MS + 120_000;
    let row = (await db.from("ai_builds").select("*").eq("id", buildId).single()).data;
    const seen: string[] = [];
    while (row.status === "building" && Date.now() < deadline) {
      await sleep(10_000);
      row = await reconcileBuild(store, row);
      if (row.deployment_id) {
        const d = await getDeployment(scope, row.deployment_id).catch(() => null);
        if (d && seen.at(-1) !== d.readyState) seen.push(d.readyState);
      }
    }
    console.log(`      ${label}: Vercel states seen ${seen.join(" → ")}`);
    return row;
  }
  // Called right after each start, before any waiting, so an exception later
  // can't leave the project behind unregistered.
  async function registerProject(buildId: string) {
    if (report.resources.project) return;
    const { data: r, error } = await db.from("ai_builds").select("project_name").eq("id", buildId).single();
    if (error || !r?.project_name) {
      record("cleanup tracking: the build's Vercel project name was readable", false, error?.message ?? "no project name yet");
      return;
    }
    report.resources.project = r.project_name;
    const name = r.project_name;
    cleanups.push({ label: "delete the test Vercel project", run: async () => { await vercel(scope, `/v9/projects/${encodeURIComponent(name)}`, { method: "DELETE", retry: "none" }); } });
  }

  // ---------------- build 1: the full path ----------------
  const t1 = Date.now();
  const out1 = await executeBuild(inputs, store);
  await registerProject(out1.buildId);
  record("build 1: an approved build starts and is recorded 'building' (not live)", out1.status === "building", JSON.stringify(out1));
  const sel = await u.from("ai_builds").select("id, status").eq("id", out1.buildId);
  record("security: the user can read their own build row", sel.data?.length === 1, sel.error?.code ?? "");
  const upd = await u.from("ai_builds").update({ status: "live", deployment_url: "https://forged.example" }).eq("id", out1.buildId).select();
  record("security: the user can't change their build's status", upd.error?.code === "42501", upd.error?.code ?? `${(upd.data ?? []).length} rows`);
  const del = await u.from("ai_builds").delete().eq("id", out1.buildId).select();
  record("security: the user can't delete their build", del.error?.code === "42501", del.error?.code ?? `${(del.data ?? []).length} rows`);
  const row1 = await waitFor(out1.buildId, "build 1");
  if (!record("build 1: READY, public address answers as this build, recorded live", row1.status === "live" && /^https:\/\/.+\.vercel\.app$/.test(row1.deployment_url ?? ""), `${row1.status} ${row1.deployment_url ?? row1.error} in ${Math.round((Date.now() - t1) / 1000)} s`)) return;

  // ---------------- the generated app, with a real Claude request ----------------
  const home = await fetch(row1.deployment_url!, { redirect: "manual" });
  const html = await home.text();
  record("app: the public URL serves the generated landing page without a login", home.status === 200 && html.includes(brand), `${home.status}`);
  const draft = async () => {
    const r = await fetch(`${row1.deployment_url}/api/wedge`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: "Client is 30 days late on a $1,200 invoice for a logo project. Keep it friendly." }) });
    return { status: r.status, body: (await r.json().catch(() => ({}))) as { output?: string; error?: string } };
  };
  const d1 = await draft();
  record("app: a real Claude request through the generated app returns a draft", d1.status === 200 && (d1.body.output ?? "").length > 40, `${d1.status} ${(d1.body.output ?? d1.body.error ?? "").slice(0, 80)}`);
  const d2 = await draft();
  const d3 = await draft();
  record("app: the client's 3rd request (cap 2) is refused with 429", d2.status === 200 && d3.status === 429, `${d2.status}, ${d3.status} ${d3.body.error ?? ""}`);
  const appKey = commitment.id.toLowerCase();
  const day = new Date().toISOString().slice(0, 10);
  // Independent of the app's own answers: the shared counter saw exactly the
  // two admitted calls (the refused third spent nothing).
  const bucket = await kitAdmin.from("kit_ai_usage").select("n").eq("bucket", `a:${appKey}:${day}`).maybeSingle();
  record("app: the global limiter recorded exactly 2 admitted calls for this app", bucket.data?.n === 2, bucket.error?.message ?? `n=${bucket.data?.n ?? "none"}`);

  // ---------------- build 2: failure path ----------------
  const out2 = await executeBuild(inputs, store);
  const row2a = (await db.from("ai_builds").select("*").eq("id", out2.buildId).single()).data;
  record("build 2: a new deployment, not a reused one (forceNew)", !!row2a.deployment_id && row2a.deployment_id !== row1.deployment_id, `${row2a.deployment_id} vs ${row1.deployment_id}`);
  const cancel = await cancelDeployment(scope, row2a.deployment_id);
  const row2 = await waitFor(out2.buildId, "build 2");
  record("build 2: a deploy cancelled on Vercel is recorded failed (never live)", cancel === "cancelled" && row2.status === "failed", `cancel=${cancel} ${row2.status} ${row2.error ?? ""}`);

  // ---------------- build 3: recovery + truly concurrent starts ----------------
  const both = await Promise.allSettled([executeBuild(inputs, store), executeBuild(inputs, store)]);
  const started = both.filter((r) => r.status === "fulfilled" && r.value.status === "building");
  const refused = both.filter((r) => r.status === "rejected" && r.reason instanceof BuildRefused);
  record("build 3: two simultaneous starts -> exactly one build, the other refused", started.length === 1 && refused.length === 1, both.map((r) => (r.status === "fulfilled" ? r.value.status : (r.reason as Error).message)).join(" | "));
  const out3 = (started[0] as PromiseFulfilledResult<{ buildId: string }>)?.value;
  if (out3) {
    const row3 = await waitFor(out3.buildId, "build 3");
    record("build 3: recovery after a failure reaches live", row3.status === "live", `${row3.status} ${row3.deployment_url ?? row3.error}`);
  }
  const all = (await db.from("ai_builds").select("status").eq("commitment_id", commitment.id).order("created_at")).data ?? [];
  record("status record: live, failed, live — and no row the user wrote", all.map((r: { status: string }) => r.status).join(",") === "live,failed,live", all.map((r: { status: string }) => r.status).join(", "));
}

main()
  .catch((e) => record("unexpected error", false, e instanceof Error ? e.message : String(e)))
  .finally(async () => {
    if (flag("--cleanup")) {
      for (const c of cleanups.reverse()) {
        await c.run().then(() => record(`cleanup: ${c.label}`, true), (e: unknown) => record(`cleanup: ${c.label}`, false, e instanceof Error ? e.message : String(e)));
      }
    } else if (cleanups.length) {
      console.log(`Left in place (re-run with --cleanup to remove): ${JSON.stringify(report.resources)}`);
    }
    const out = opt("--report");
    if (out) fs.writeFileSync(out, JSON.stringify(report, null, 2));
    console.log(`\n${report.steps.filter((s) => s.ok).length} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  });
