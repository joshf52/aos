import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sweepBuilds } from "@/lib/ai-build/sweep";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Advances AI builds nobody is watching and cancels deployments that failed
 * builds left running (lib/ai-build/sweep.ts). Triggered by Vercel Cron via
 * vercel.json; requires the CRON_SECRET bearer like the other cron routes.
 */
export async function GET(request: Request) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const report = await sweepBuilds(createServiceClient());
    console.log(JSON.stringify({ event: "ai_build_sweep", ...report }));
    return NextResponse.json(report);
  } catch (e) {
    console.error(JSON.stringify({ event: "ai_build_sweep_failed", kind: e instanceof Error ? e.name : "unknown" }));
    return NextResponse.json({ error: "sweep failed" }, { status: 500 });
  }
}
