import Link from "next/link";
import { config as kit } from "@/kit.config";

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-ink-bg">
      <nav className="px-6 pt-6 flex items-center justify-between max-w-5xl mx-auto">
        <div className="font-serif text-[20px] tracking-[-0.02em]">{kit.brand.name}</div>
        <div className="flex items-center gap-5 text-[13px] text-ink-secondary">
          <Link href="/pricing" className="hover:text-ink-text transition-colors">Pricing</Link>
          <Link href="/about" className="hover:text-ink-text transition-colors">About</Link>
        </div>
      </nav>

      <section className="px-6 pt-24 pb-20 max-w-3xl mx-auto">
        <div className="text-[11px] uppercase tracking-[0.16em] text-ink-gold mb-6">
          {kit.brand.tagline}
        </div>
        <h1 className="font-serif text-[clamp(44px,7vw,76px)] leading-[1.02] tracking-[-0.025em] text-balance">
          {kit.landing.headline}
        </h1>
        <p className="font-serif italic text-[20px] text-ink-secondary leading-relaxed mt-6 max-w-2xl text-balance">
          {kit.landing.subhead}
        </p>

        <div className="mt-10 flex items-center gap-4">
          <Link
            href="/workflow"
            className="inline-flex items-center justify-center px-6 py-4 rounded-[14px] text-[15px] font-semibold tracking-[-0.01em] bg-ink-text text-ink-bg hover:bg-white transition-colors"
          >
            {kit.landing.ctaLabel}
          </Link>
          <Link
            href="/pricing"
            className="text-[14px] text-ink-secondary hover:text-ink-text transition-colors"
          >
            See pricing →
          </Link>
        </div>
      </section>

      <section className="px-6 py-16 border-t border-ink-border max-w-3xl mx-auto">
        <div className="text-[11px] uppercase tracking-[0.14em] text-ink-tertiary mb-6">
          Before / After
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-[18px] bg-ink-surface border border-ink-border">
            <div className="text-[11px] uppercase tracking-[0.12em] text-ink-tertiary mb-3">Today</div>
            <p className="font-serif italic text-[16px] text-ink-secondary leading-relaxed">
              {kit.landing.beforeAfter.before}
            </p>
          </div>
          <div className="p-6 rounded-[18px] bg-ink-surface border border-ink-border">
            <div className="text-[11px] uppercase tracking-[0.12em] mb-3" style={{ color: "#D4A574" }}>
              With {kit.brand.name}
            </div>
            <p className="font-serif italic text-[16px] text-ink-text leading-relaxed">
              {kit.landing.beforeAfter.after}
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 border-t border-ink-border max-w-3xl mx-auto">
        <div className="text-[11px] uppercase tracking-[0.14em] text-ink-tertiary mb-4">
          Why now
        </div>
        <p className="font-serif text-[22px] leading-[1.4] tracking-[-0.01em] text-balance">
          {kit.landing.whyNow}
        </p>
      </section>

      <footer className="px-6 py-12 border-t border-ink-border max-w-3xl mx-auto">
        <div className="flex items-center justify-between text-[12px] text-ink-tertiary">
          <div>© {kit.brand.name}</div>
          <div className="flex gap-4">
            <Link href="/pricing" className="hover:text-ink-secondary">Pricing</Link>
            <Link href="/about" className="hover:text-ink-secondary">About</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
