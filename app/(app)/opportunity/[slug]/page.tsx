import { ArrowRight } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion";
import type { Opportunity } from "@/types/database";

type LensIdRow = { id: string };

async function startEvaluation(formData: FormData) {
  "use server";
  const opportunityId = formData.get("opportunityId") as string;
  if (!opportunityId) redirect("/feed");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: found } = (await supabase
    .from("decision_lenses")
    .select("id")
    .eq("user_id", user.id)
    .eq("opportunity_id", opportunityId)
    .is("completed_at", null)
    .limit(1)) as unknown as { data: LensIdRow[] | null };

  if (found?.[0]?.id) redirect(`/lens/${found[0].id}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lens } = (await supabase
    .from("decision_lenses")
    .insert({ user_id: user.id, opportunity_id: opportunityId, current_step: 1 } as any)
    .select("id")
    .single()) as unknown as { data: LensIdRow | null };

  redirect(lens?.id ? `/lens/${lens.id}` : "/feed");
}

export default async function OpportunityPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();

  const { data: opportunity } = (await supabase
    .from("opportunities")
    .select("*")
    .eq("slug", params.slug)
    .single()) as unknown as { data: Opportunity | null };

  if (!opportunity) notFound();

  const signals = opportunity.signal
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <main className="relative min-h-dvh bg-aos-bg">
      <article className="pb-40">
        {/* HERO — full-width dark, large serif title */}
        <section className="relative overflow-hidden border-b border-aos-border">
          <div
            aria-hidden
            className="absolute -top-40 left-1/2 -translate-x-1/2 w-[820px] h-[820px] pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(212,165,116,0.10) 0%, transparent 60%)",
              filter: "blur(60px)",
            }}
          />

          <div className="relative px-6 pt-24 pb-20 max-w-3xl mx-auto">
            <FadeIn>
              <div className="flex items-center gap-3 mb-10 flex-wrap">
                <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-aos-gold">
                  {opportunity.capability}
                </span>
                <span className="text-aos-tertiary">·</span>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                             font-mono text-[10px] tracking-[0.14em] uppercase text-aos-gold
                             bg-aos-gold/[0.08] border border-aos-gold/20"
                >
                  Confidence {opportunity.confidence}/5
                </span>
              </div>
            </FadeIn>

            <FadeIn delay={0.05}>
              <h1
                className="font-serif text-aos-text text-5xl md:text-6xl lg:text-7xl
                           leading-[1.02] tracking-[-0.025em] text-balance"
              >
                {opportunity.title}
              </h1>
            </FadeIn>
          </div>
        </section>

        {/* THE GAP — readable serif body */}
        <section className="px-6 pt-20 pb-16 max-w-3xl mx-auto">
          <FadeIn>
            <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-aos-tertiary mb-6">
              The Gap
            </p>
            <p
              className="font-serif text-aos-text text-balance leading-[1.45] tracking-[-0.005em]"
              style={{ fontSize: "clamp(22px, 3vw, 28px)" }}
            >
              {opportunity.gap}
            </p>
          </FadeIn>
        </section>

        {/* SIGNAL SOURCES — mono list with subtle dividers */}
        <section className="px-6 pt-12 pb-16 max-w-3xl mx-auto">
          <FadeIn>
            <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-aos-tertiary mb-8">
              Signal Sources
            </p>

            <ul className="border-y border-aos-border">
              {signals.map((s, i) => (
                <li
                  key={i}
                  className={
                    "py-5 font-mono text-[13px] leading-relaxed text-aos-secondary tracking-[-0.005em]" +
                    (i < signals.length - 1 ? " border-b border-aos-border" : "")
                  }
                >
                  <div className="flex items-start gap-4">
                    <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-aos-tertiary mt-[3px] tabular-nums shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{s}</span>
                  </div>
                </li>
              ))}
            </ul>
          </FadeIn>
        </section>
      </article>

      {/* STICKY BOTTOM CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{
          background:
            "linear-gradient(to top, rgba(10,10,12,0.96) 0%, rgba(10,10,12,0.92) 60%, rgba(10,10,12,0) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="px-6 pt-8 pb-7 max-w-3xl mx-auto flex justify-center">
          <form action={startEvaluation} className="w-full sm:w-auto">
            <input type="hidden" name="opportunityId" value={opportunity.id} />
            <Button
              variant="primary"
              size="lg"
              type="submit"
              className="w-full sm:w-auto"
            >
              Evaluate this opportunity
              <ArrowRight size={16} strokeWidth={2.5} />
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
