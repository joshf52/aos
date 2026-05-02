import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { BuildMode } from "@/types/database";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const next = searchParams.get("next") ?? "/feed";

  // OAuth provider returned an error (e.g. user denied access)
  if (oauthError) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
  }

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // On Vercel, request.url uses http:// internally — use x-forwarded-host for the real hostname
      const forwardedHost = request.headers.get("x-forwarded-host");
      const baseUrl =
        process.env.NODE_ENV === "development" || !forwardedHost
          ? origin
          : `https://${forwardedHost}`;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("build_mode")
          .eq("id", user.id)
          .single() as unknown as { data: { build_mode: BuildMode | null } | null };

        if (!data?.build_mode) {
          return NextResponse.redirect(`${baseUrl}/onboarding/build-mode`);
        }
      }

      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
