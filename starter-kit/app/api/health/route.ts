import { NextResponse } from "next/server";

// AOS calls this on the app's public address before it records the build as
// live: the answer proves the address is reachable without a login and is
// served by this exact deployment (VERCEL_DEPLOYMENT_ID is Vercel's own id
// for the running deployment; AOS_BUILD_ID is set per build).
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { build: process.env.AOS_BUILD_ID ?? null, deployment: process.env.VERCEL_DEPLOYMENT_ID ?? null },
    { headers: { "cache-control": "no-store" } },
  );
}
