import Link from "next/link";
import { config as kit } from "@/kit.config";
import { WedgeForm } from "@/components/wedge-form";

export default function WorkflowPage() {
  return (
    <main className="min-h-dvh bg-ink-bg">
      <nav className="px-6 pt-6 flex items-center justify-between max-w-3xl mx-auto">
        <Link href="/" className="font-serif text-[20px] tracking-[-0.02em]">{kit.brand.name}</Link>
        <Link href="/pricing" className="text-[13px] text-ink-secondary hover:text-ink-text transition-colors">
          Pricing
        </Link>
      </nav>

      <section className="px-6 pt-16 pb-24 max-w-2xl mx-auto">
        <h1 className="font-serif text-[clamp(34px,5vw,52px)] leading-[1.05] tracking-[-0.025em] text-balance">
          {kit.workflow.title}
        </h1>
        <p className="font-serif italic text-[16px] text-ink-secondary mt-3">
          {kit.landing.subhead}
        </p>

        <div className="mt-10">
          <WedgeForm />
        </div>
      </section>
    </main>
  );
}
