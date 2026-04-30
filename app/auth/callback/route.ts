import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { BuildMode } from "@/types/database";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/feed";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if onboarding is complete
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Use rpc to avoid complex type inference issues on partial selects
        const { data } = await supabase
          .from("profiles")
          .select("build_mode")
          .eq("id", user.id)
          .single() as unknown as { data: { build_mode: BuildMode | null } | null };

        if (!data?.build_mode) {
          return NextResponse.redirect(`${origin}/onboarding/build-mode`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
