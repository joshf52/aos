import Link from "next/link";
import { Aurora } from "@/components/aurora";

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-aos-bg relative flex flex-col overflow-hidden">
      <Aurora />

      <div className="relative z-10 flex flex-col flex-1 px-6 pt-24 pb-12 max-w-lg mx-auto w-full">
        {/* Wordmark */}
        <div>
          <div className="font-serif text-6xl text-aos-text tracking-[-0.04em] leading-none">
            AOS
          </div>
          <div className="font-serif text-2xl text-aos-secondary italic mt-1.5 tracking-[-0.01em]">
            Build with conviction.
          </div>
        </div>

        {/* Value prop */}
        <p className="font-serif italic text-[17px] text-aos-secondary leading-relaxed mt-10 max-w-xs tracking-[-0.01em]">
          Curated opportunities. A framework for deciding. A 30-day sprint to
          ship.
        </p>

        <div className="flex-1" />

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Link
            href="/auth/signup"
            className="flex items-center justify-center w-full py-[17px] rounded-[18px] text-base font-semibold tracking-[-0.01em] transition-opacity hover:opacity-90"
            style={{ background: "#F5F2ED", color: "#0A0A0C" }}
          >
            Get started
          </Link>
          <Link
            href="/auth/login"
            className="flex items-center justify-center w-full py-[17px] rounded-[18px] text-base font-semibold tracking-[-0.01em] transition-opacity hover:opacity-80"
            style={{
              background: "transparent",
              color: "#F5F2ED",
              border: "1px solid var(--aos-border-strong)",
            }}
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
