import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Stripe redirects here after a successful Checkout. The webhook is the
 * source of truth for tier state — this page just shows a confirmation.
 * If the webhook hasn't arrived yet, the user is still pro for routing
 * purposes after the next refresh.
 */
export default async function UpgradeSuccessPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  return (
    <main className="min-h-dvh bg-aos-bg text-aos-text flex flex-col items-center justify-center px-6 text-center">
      <div className="text-[11px] uppercase tracking-[0.18em] font-medium mb-3" style={{ color: "#D4A574" }}>
        Pro
      </div>
      <h1 className="font-serif text-[40px] tracking-[-0.035em] leading-tight">
        You&rsquo;re in.
      </h1>
      <p className="font-serif italic text-aos-secondary text-[15px] mt-4 max-w-md leading-relaxed">
        Three concurrent sprints unlocked. The framework gets out of your way
        when your judgment is moving faster than your bandwidth.
      </p>
      <Link
        href="/feed"
        className="mt-10 px-7 py-3.5 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-opacity hover:opacity-80"
        style={{ background: "#F5F2ED", color: "#0A0A0C" }}
      >
        Find the next opportunity
      </Link>
    </main>
  );
}
