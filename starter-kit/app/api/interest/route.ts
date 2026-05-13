import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { config as kit } from "@/kit.config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Demo mode: accept the email but persist nothing. Lets the kit run in dev
    // without a Supabase project wired up. The compiled build sets real keys.
    return NextResponse.json({ ok: true, demo: true });
  }

  const supabase = createClient(url, key);
  const { error } = await supabase.from("interested_users").insert({
    email: email.toLowerCase().trim(),
    opportunity_id: kit.meta.opportunityId,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
