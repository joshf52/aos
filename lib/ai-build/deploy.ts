/**
 * Deploys a materialized kit to Vercel and returns the preview URL.
 *
 * Phase A: Vercel REST API. Each build is a fresh project. The generated app
 * runs with AOS-owned ANTHROPIC_API_KEY so the non-builder never handles a
 * key. Supabase env vars are optional — the kit falls back to a demo path
 * when they're absent.
 *
 * Two-step protocol:
 *  1. POST /v2/files for each file (with sha1 digest in the header)
 *  2. POST /v13/deployments with the file SHAs
 */

import crypto from "node:crypto";
import type { BuildConfig } from "./build-config";
import { materialize, type KitFile } from "./materialize";

const VERCEL_API = "https://api.vercel.com";

export type DeployResult = {
  url: string;          // https://...vercel.app
  deploymentId: string;
  projectName: string;
};

function sha1(buf: Buffer): string {
  return crypto.createHash("sha1").update(buf).digest("hex");
}

function projectNameFor(config: BuildConfig): string {
  // Vercel project names: lowercase, 1-100 chars, [a-z0-9-]+
  const base = config.brand.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "build";
  const stamp = config.meta.commitmentId.slice(0, 8);
  return `aos-${base}-${stamp}`;
}

async function uploadFile(token: string, file: KitFile, teamId?: string): Promise<{ file: string; sha: string; size: number }> {
  const buf = Buffer.from(file.content, "utf-8");
  const sha = sha1(buf);
  const url = new URL(`${VERCEL_API}/v2/files`);
  if (teamId) url.searchParams.set("teamId", teamId);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "x-vercel-digest": sha,
    },
    body: buf,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vercel file upload failed (${res.status}) for ${file.path}: ${text}`);
  }
  return { file: file.path, sha, size: buf.byteLength };
}

export async function deploy(config: BuildConfig): Promise<DeployResult> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error("VERCEL_TOKEN is not set. The deployment pipeline cannot reach Vercel.");
  }
  const teamId = process.env.VERCEL_TEAM_ID;

  const files = await materialize(config);
  const uploaded = await Promise.all(files.map((f) => uploadFile(token, f, teamId)));
  const name = projectNameFor(config);

  const env: { key: string; value: string; type: "encrypted" | "plain"; target: string[] }[] = [];
  if (process.env.AI_BUILD_ANTHROPIC_KEY) {
    env.push({
      key: "ANTHROPIC_API_KEY",
      value: process.env.AI_BUILD_ANTHROPIC_KEY,
      type: "encrypted",
      target: ["production", "preview"],
    });
  }
  if (process.env.AI_BUILD_KIT_SUPABASE_URL) {
    env.push({
      key: "NEXT_PUBLIC_SUPABASE_URL",
      value: process.env.AI_BUILD_KIT_SUPABASE_URL,
      type: "plain",
      target: ["production", "preview"],
    });
  }
  if (process.env.AI_BUILD_KIT_SUPABASE_ANON_KEY) {
    env.push({
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      value: process.env.AI_BUILD_KIT_SUPABASE_ANON_KEY,
      type: "encrypted",
      target: ["production", "preview"],
    });
  }

  const deployUrl = new URL(`${VERCEL_API}/v13/deployments`);
  if (teamId) deployUrl.searchParams.set("teamId", teamId);

  const res = await fetch(deployUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      files: uploaded,
      projectSettings: { framework: "nextjs" },
      env,
      target: "production",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vercel deployment failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { id: string; url: string };
  return {
    url: `https://${json.url}`,
    deploymentId: json.id,
    projectName: name,
  };
}
