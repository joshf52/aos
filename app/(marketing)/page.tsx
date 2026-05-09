import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeIn, Stagger } from "@/components/motion";
import { Button } from "@/components/ui/button";

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
      {/* Grain — restraint, not gloss */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          opacity: 0.03,
        }}
      />

      {/* One quiet ambient gold — the only atmospheric element */}
      <div
        aria-hidden
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[820px] h-[820px] z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(212,165,116,0.10) 0%, transparent 60%)",
          filter: "blur(60px)",
        }}
      />

      {/* ─────────────────────────  HERO  ───────────────────────── */}
      <section className="relative z-[1] px-6 pt-32 sm:pt-48 pb-24 sm:pb-32 max-w-3xl mx-auto">
        <Stagger delayChildren={0.05} staggerChildren={0.1}>
          <FadeIn>
            <div className="flex items-center gap-3">
              <span className="block w-1 h-1 rounded-full bg-aos-gold/60" />
              <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-aos-tertiary">
                AOS — Builder&apos;s Framework
              </p>
            </div>
          </FadeIn>

          <FadeIn>
            <h1
              className="font-serif mt-10 text-aos-text leading-[0.95] tracking-[-0.03em] text-balance text-8xl md:text-[9rem] lg:text-[11rem]"
            >
              Build with{" "}
              <span className="text-gold-gradient italic">conviction</span>.
            </h1>
          </FadeIn>

          <FadeIn>
            <p
              className="font-serif italic text-aos-secondary leading-snug mt-8 max-w-xl"
              style={{ fontSize: "clamp(20px, 3.2vw, 26px)" }}
            >
              A decision and leverage engine for the people building products
              that matter — whether they write code or not.
            </p>
          </FadeIn>

          <FadeIn>
            <p className="text-[15px] leading-relaxed text-aos-secondary mt-6 max-w-md">
              Curated opportunities. A framework for deciding. A thirty-day
              sprint to ship.
            </p>
          </FadeIn>

          <FadeIn>
            <div className="flex flex-wrap items-center gap-5 mt-12">
              <Button variant="primary" size="lg" href="/auth/signup">
                Begin your sprint
                <ArrowRight size={16} strokeWidth={2.5} />
              </Button>
              <Link
                href="/auth/login"
                className="text-[14px] text-aos-secondary hover:text-aos-text transition-colors"
              >
                Already a builder? Sign in
              </Link>
            </div>
          </FadeIn>
        </Stagger>
      </section>

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
              <div className="card-interactive h-full bg-ink-700 [background-image:none] border-ink-500">
                <div className="font-mono text-[10px] tracking-[0.24em] uppercase text-aos-tertiary mb-5">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="font-serif text-[26px] leading-[1.15] text-aos-text">
                  {m.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-aos-secondary mt-4">
                  {m.body}
                </p>
              </div>
            </FadeIn>
          ))}
        </Stagger>
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
              <article className="card-interactive group">
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
              </article>
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
