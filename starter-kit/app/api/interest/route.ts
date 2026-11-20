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
  // A repeat signup (unique violation) answers exactly like a new one, so the
  // public endpoint can't be used to test whether an email is on the list.
  // Other errors stay generic for the same reason.
  if (error && error.code !== "23505") {
    console.error("interest insert failed", error.code);
    return NextResponse.json({ error: "Could not save your email. Try again." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
