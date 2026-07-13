import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FadeIn, Stagger } from "@/components/motion";
import { AOSAnimatedBackground } from "@/components/aos/animated-background";
import { AOSDepthCard } from "@/components/aos/depth-card";
import type { Opportunity } from "@/types/database";

const DAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatToday(): string {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function firstSentence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^(.+?[.!?])(\s|$)/);
  return match ? match[1] : trimmed;
}

export default async function FeedPage() {
  const supabase = createClient();

  const { data } = (await supabase
    .from("opportunities")
    .select("*")
    .eq("is_active", true)
    .order("confidence", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5)) as unknown as { data: Opportunity[] | null };

  const opportunities = data ?? [];
  const [hero, ...rest] = opportunities;

  return (
    <main className="relative min-h-dvh bg-aos-bg overflow-x-hidden">
      {/* grain lives in the (app) layout's GrainOverlay — don't double it */}
      <AOSAnimatedBackground
        variant="editorial"
        intensity={0.65}
        grain={false}
        className="absolute inset-0 z-0"
      />

      <div className="relative z-[1] px-6 pt-20 pb-32 max-w-5xl mx-auto">
        {/* Editorial date header */}
        <FadeIn>
          <p className="text-xs font-mono tracking-widest uppercase text-aos-tertiary mb-4">
            Today
          </p>
          <h1
            className="font-serif text-aos-text leading-[1.02] tracking-[-0.025em] text-balance"
            style={{ fontSize: "clamp(40px, 7vw, 72px)" }}
          >
            {formatToday()}
          </h1>
          <p className="font-serif italic text-aos-secondary mt-5 leading-snug max-w-md text-[18px]">
            Five opportunities, hand-selected. The one most worth your week sits
            at the top.
          </p>
        </FadeIn>

        {/* hairline rule — editorial spine */}
        <FadeIn delay={0.05}>
          <div className="mt-12 h-px bg-gradient-to-r from-transparent via-aos-border-strong to-transparent" />
        </FadeIn>

        {/* Hero opportunity */}
        {hero && (
          <FadeIn delay={0.1}>
            <Link
              href={`/opportunity/${hero.slug}`}
              className="group block mt-12 rounded-[26px]
                         focus-visible:outline-none focus-visible:ring-1
                         focus-visible:ring-aos-gold/40 focus-visible:ring-offset-4
                         focus-visible:ring-offset-aos-bg"
            >
              <AOSDepthCard
                as="article"
                interactive
                tiltScale={0.35}
                intensity="feature"
                glow="dual"
                dotGrid
                className="p-12 sm:p-14"
              >
                <div className="flex items-center gap-3 mb-8 flex-wrap">
                  <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-aos-gold">
                    {hero.capability}
                  </span>
                  <span className="text-aos-tertiary">·</span>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                               font-mono text-[10px] tracking-[0.14em] uppercase text-aos-gold
                               bg-aos-gold/[0.08] border border-aos-gold/20"
                  >
                    Confidence {hero.confidence}/5
                  </span>
                </div>

                <h2 className="font-serif text-6xl text-aos-text leading-[1.05] tracking-[-0.025em] text-balance max-w-3xl">
                  {hero.title}
                </h2>

                <p className="text-[15px] leading-relaxed text-aos-secondary mt-7 max-w-2xl">
                  {hero.gap}
                </p>

                <div className="flex items-center justify-between mt-10 pt-6 border-t border-aos-border">
                  <span className="text-[12px] text-aos-tertiary">
                    {hero.signal}
                  </span>
                  <span className="text-[14px] text-aos-text inline-flex items-center gap-1.5 transition-transform duration-300 group-hover:translate-x-0.5">
                    Read the gap
                    <ArrowRight size={14} strokeWidth={2} />
                  </span>
                </div>
              </AOSDepthCard>
            </Link>
          </FadeIn>
        )}

        {/* Remaining four */}
        {rest.length > 0 && (
          <div className="mt-20">
            <FadeIn>
              <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-aos-tertiary mb-6">
                Also this week
              </p>
            </FadeIn>

            <Stagger
              className="grid md:grid-cols-2 gap-5"
              delayChildren={0.05}
              staggerChildren={0.08}
            >
              {rest.map((opp) => (
                <FadeIn key={opp.id} className="h-full">
                  <Link
                    href={`/opportunity/${opp.slug}`}
                    className="group block h-full rounded-[26px]
                               focus-visible:outline-none focus-visible:ring-1
                               focus-visible:ring-aos-gold/40 focus-visible:ring-offset-4
                               focus-visible:ring-offset-aos-bg"
                  >
                    <AOSDepthCard
                      as="article"
                      interactive
                      glow="dual"
                      className="h-full p-7"
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-6">
                          <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-aos-gold">
                            {opp.capability}
                          </span>
                          <span className="text-aos-tertiary">·</span>
                          <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-aos-tertiary">
                            Confidence {opp.confidence}/5
                          </span>
                        </div>

                        <h3 className="font-serif text-[26px] leading-[1.12] text-aos-text tracking-[-0.02em] text-balance mb-4">
                          {opp.title}
                        </h3>

                        <p className="text-[14px] leading-relaxed text-aos-secondary">
                          {firstSentence(opp.gap)}
                        </p>

                        <div className="mt-auto flex items-center justify-between gap-4 pt-5 border-t border-aos-border">
                          <span className="text-[12px] text-aos-tertiary truncate">
                            {opp.signal}
                          </span>
                          <span className="shrink-0 text-[13px] text-aos-text inline-flex items-center gap-1.5 transition-transform duration-300 group-hover:translate-x-0.5">
                            Read the gap
                            <ArrowRight size={13} strokeWidth={2} />
                          </span>
                        </div>
                      </div>
                    </AOSDepthCard>
                  </Link>
                </FadeIn>
              ))}
            </Stagger>
          </div>
        )}
      </div>
    </main>
  );
}
