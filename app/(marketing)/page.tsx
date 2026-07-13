import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeIn, Stagger } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { AOSAnimatedBackground } from "@/components/aos/animated-background";
import { AOSDepthCard } from "@/components/aos/depth-card";
import { HeroStage } from "@/components/aos/hero-scene/hero-stage";
import { BuildPathConstellation } from "@/components/aos/build-path-constellation";

const MOVEMENTS = [
  {
    title: "The Opportunity Engine",
    body: "Five hand-selected gaps a week. Real demand signals, real wedges — never another idea list.",
  },
  {
    title: "The Decision Lens",
    body: "Five questions, one screen each, no skipping. Strategic clarity before a single line of code.",
  },
  {
    title: "The Ceremony",
    body: "A thirty-day covenant, signed by hand. Press, hold, seal. The moment your conviction becomes a calendar.",
  },
];

const SAMPLE_OPPORTUNITIES = [
  {
    category: "AI · Developer Tools",
    confidence: 4,
    title: "AI-native research tools for independent analysts",
    gap: "Solo analysts cobble together ChatGPT, Notion, and Excel to do work that should feel like one continuous thread.",
    signal: "47 builders watching",
  },
  {
    category: "Finance · Solo Founders",
    confidence: 4,
    title: "Tax-loss harvesting for one-person businesses",
    gap: "Wealthfront does this for individuals. Nobody does it for the founder filing as an S-corp with three messy accounts.",
    signal: "Mentioned 12× in IndieHackers",
  },
  {
    category: "Tools · Creative Direction",
    confidence: 3,
    title: "Low-bandwidth writing tools for creative directors",
    gap: "Senior creatives keep paying for Notion to write three sentences a day. They want a single page, beautiful type, no apps.",
    signal: "Twitter thread, 2.4k likes",
  },
  {
    category: "Operations · Studios",
    confidence: 4,
    title: "The first invoicing tool that respects retainer math",
    gap: "Studios run on retainers and overruns. Every existing tool assumes hourly or fixed — they patch with spreadsheets.",
    signal: "11 inbound from a single LinkedIn post",
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-dvh bg-aos-bg overflow-x-hidden">
      <AOSAnimatedBackground variant="editorial" grain className="absolute inset-0 z-0" />

      {/* ─────────────────────────  HERO  ───────────────────────── */}
      <HeroStage ctaHref="/auth/signup" />
      <div className="relative z-[1] flex justify-center pb-24 sm:pb-32 -mt-6">
        <Link
          href="/auth/login"
          className="text-[14px] text-aos-secondary hover:text-aos-text transition-colors"
        >
          Already a builder? Sign in
        </Link>
      </div>

      {/* hairline rule — editorial spine */}
      <div className="relative z-[1] max-w-3xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-aos-border-strong to-transparent" />
      </div>

      {/* ───────────────────────  MOVEMENTS  ─────────────────────── */}
      <section className="relative z-[1] px-6 pt-24 sm:pt-32 pb-20 max-w-5xl mx-auto">
        <FadeIn>
          <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-aos-tertiary mb-4">
            Three movements
          </p>
          <h2
            className="font-serif text-aos-text leading-[1.05] tracking-[-0.02em] max-w-2xl text-balance"
            style={{ fontSize: "clamp(34px, 5.5vw, 56px)" }}
          >
            From a question worth answering to a product worth shipping.
          </h2>
        </FadeIn>

        <Stagger
          className="grid sm:grid-cols-3 gap-5 mt-16"
          delayChildren={0.05}
          staggerChildren={0.1}
        >
          {MOVEMENTS.map((m, i) => (
            <FadeIn key={m.title}>
              <AOSDepthCard interactive glow="dual" className="h-full p-8">
                <div className="font-mono text-[10px] tracking-[0.24em] uppercase text-aos-tertiary mb-5">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="font-serif text-[26px] leading-[1.15] text-aos-text">
                  {m.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-aos-secondary mt-4">
                  {m.body}
                </p>
              </AOSDepthCard>
            </FadeIn>
          ))}
        </Stagger>
      </section>

      {/* ─────────────────  BUILD PATH CONSTELLATION  ───────────────── */}
      <section className="relative z-[1] px-6 pt-4 pb-24 max-w-5xl mx-auto">
        <FadeIn>
          <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-aos-tertiary mb-4 text-center">
            From signal to system
          </p>
          <h2
            className="font-serif text-aos-text leading-[1.05] tracking-[-0.02em] text-balance text-center max-w-2xl mx-auto"
            style={{ fontSize: "clamp(34px, 5.5vw, 56px)" }}
          >
            Loose answers converge into a shipped MVP.
          </h2>
        </FadeIn>

        <div className="mt-16">
          <BuildPathConstellation />
        </div>
      </section>

      {/* ─────────────────  OPPORTUNITY PREVIEW  ───────────────── */}
      <section className="relative z-[1] px-6 pt-20 pb-24 max-w-5xl mx-auto">
        <FadeIn>
          <div className="flex items-end justify-between flex-wrap gap-6 mb-14">
            <div className="max-w-2xl">
              <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-aos-tertiary mb-4">
                This week&apos;s catalog
              </p>
              <h2
                className="font-serif text-aos-text leading-[1.05] tracking-[-0.02em] text-balance"
                style={{ fontSize: "clamp(34px, 5.5vw, 56px)" }}
              >
                Five opportunities, hand-selected.
              </h2>
              <p className="font-serif italic text-aos-secondary mt-6 leading-snug max-w-md text-[18px]">
                A taste of what arrives every Monday. No idea generators, no
                dumping ground.
              </p>
            </div>
          </div>
        </FadeIn>

        <Stagger
          className="grid md:grid-cols-2 gap-5"
          delayChildren={0.05}
          staggerChildren={0.08}
        >
          {SAMPLE_OPPORTUNITIES.map((opp) => (
            <FadeIn key={opp.title}>
              <AOSDepthCard as="article" interactive glow="dual" className="group p-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-aos-gold">
                    {opp.category}
                  </span>
                  <span className="text-aos-tertiary">·</span>
                  <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-aos-tertiary">
                    Confidence {opp.confidence}/5
                  </span>
                </div>
                <h3 className="font-serif text-[28px] leading-[1.1] text-aos-text mb-4 text-balance">
                  {opp.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-aos-secondary">
                  {opp.gap}
                </p>
                <div className="flex items-center justify-between mt-7 pt-5 border-t border-aos-border">
                  <span className="text-[12px] text-aos-tertiary">
                    {opp.signal}
                  </span>
                  <span className="text-[13px] text-aos-text inline-flex items-center gap-1.5 transition-transform group-hover:translate-x-0.5">
                    Read the gap
                    <ArrowRight size={13} strokeWidth={2} />
                  </span>
                </div>
              </AOSDepthCard>
            </FadeIn>
          ))}
        </Stagger>
      </section>

      {/* ────────────────────  CLOSING THESIS  ──────────────────── */}
      <section className="relative z-[1] px-6 pt-24 pb-32 max-w-3xl mx-auto text-center">
        <FadeIn>
          <p
            className="font-serif italic text-aos-text leading-[1.15] tracking-[-0.01em] text-balance"
            style={{ fontSize: "clamp(28px, 4.8vw, 44px)" }}
          >
            Creation is cheap. Judgment, taste, and trust are everything.
          </p>
          <div className="mt-12 flex justify-center">
            <Button variant="primary" size="lg" href="/auth/signup">
              Begin your sprint
              <ArrowRight size={16} strokeWidth={2.5} />
            </Button>
          </div>
          <div className="flex items-center justify-center gap-3 mt-10">
            <span className="block w-1 h-1 rounded-full bg-aos-gold/40" />
            <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-aos-tertiary">
              Refreshes Mondays
            </p>
            <span className="block w-1 h-1 rounded-full bg-aos-gold/40" />
          </div>
        </FadeIn>
      </section>
    </main>
  );
}
