import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DomainsContent } from "./domains-content";

async function saveDomains(formData: FormData): Promise<void> {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const domains = formData.getAll("domains") as string[];
  if (domains.length < 3) return;

  await (supabase.from("profiles") as any)
    .update({ domains })
    .eq("id", user.id);

  const returnTo = formData.get("_return_to") as string | null;
  redirect(returnTo || "/onboarding/audience");
}

export default async function DomainsPage({
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
    .select("domains")
    .eq("id", user.id)
    .single()) as unknown as { data: { domains: string[] | null } | null };

  const returnTo = searchParams.from === "preferences" ? "/preferences" : undefined;
  return (
    <DomainsContent
      initialDomains={profile?.domains ?? []}
      saveAction={saveDomains}
      returnTo={returnTo}
    />
  );
}
