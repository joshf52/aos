import Link from "next/link";
import { config as kit } from "@/kit.config";

export default function AboutPage() {
  return (
    <main className="min-h-dvh bg-ink-bg">
      <nav className="px-6 pt-6 flex items-center justify-between max-w-3xl mx-auto">
        <Link href="/" className="font-serif text-[20px] tracking-[-0.02em]">{kit.brand.name}</Link>
        <Link href="/pricing" className="text-[13px] text-ink-secondary hover:text-ink-text transition-colors">
          Pricing
        </Link>
      </nav>

      <section className="px-6 pt-24 pb-24 max-w-xl mx-auto">
        <div className="text-[11px] uppercase tracking-[0.16em] text-ink-gold mb-5">About</div>
        <h1 className="font-serif text-[44px] leading-[1.05] tracking-[-0.025em] text-balance">
          {kit.brand.tagline}
        </h1>

        <p className="font-serif italic text-[18px] text-ink-secondary leading-relaxed mt-8 text-balance">
          {kit.about.builtByLine}
        </p>

        <div className="mt-12">
          <Link
            href="/workflow"
            className="inline-flex items-center px-5 py-3 rounded-[12px] text-[14px] font-semibold bg-ink-text text-ink-bg"
          >
            {kit.landing.ctaLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
