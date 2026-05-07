import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdvantageContent } from "./advantage-content";
import { sendWelcome } from "@/lib/email/send";

function displayName(email: string): string {
  const local = email.split("@")[0];
  const name = local.split(/[._]/)[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

async function saveAdvantage(formData: FormData): Promise<void> {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const unfair_advantage = (formData.get("unfair_advantage") as string)?.trim();
  if (!unfair_advantage) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("profiles") as any)
    .update({ unfair_advantage })
    .eq("id", user.id);

  const returnTo = formData.get("_return_to") as string | null;
  const isFinishingOnboarding = !returnTo;

  // Send welcome email exactly once, at the end of onboarding. Stamps
  // welcomed_at on success so re-edits via Preferences don't re-trigger.
  if (isFinishingOnboarding && user.email) {
    const { data: state } = (await supabase
      .from("profiles")
      .select("welcomed_at")
      .eq("id", user.id)
      .single()) as unknown as { data: { welcomed_at: string | null } | null };

    if (!state?.welcomed_at) {
      const result = await sendWelcome({
        to: user.email,
        name: displayName(user.email),
        userId: user.id,
      });
      if (result.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("profiles") as any)
          .update({ welcomed_at: new Date().toISOString() })
          .eq("id", user.id);
      }
    }
  }

  redirect(returnTo || "/onboarding/personalizing");
}

export default async function AdvantagePage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = (await supabase
    .from("profiles")
    .select("unfair_advantage, build_mode")
    .eq("id", user.id)
    .single()) as unknown as {
    data: { unfair_advantage: string | null; build_mode: string | null } | null;
  };

  const returnTo = searchParams.from === "preferences" ? "/preferences" : undefined;
  return (
    <AdvantageContent
      initialText={profile?.unfair_advantage ?? ""}
      buildMode={(profile?.build_mode as "self" | "ai") ?? "self"}
      saveAction={saveAdvantage}
      returnTo={returnTo}
    />
  );
}
