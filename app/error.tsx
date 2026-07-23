"use client";

import Link from "next/link";
import { useEffect } from "react";

// Root error boundary: covers everything outside the (app) group — landing,
// auth, onboarding, upgrade, founders — which previously fell through to
// Next.js's default unstyled (light) error page. Mirrors app/(app)/error.tsx;
// home goes to "/" because this funnel is largely pre-auth.
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-dvh bg-aos-bg flex flex-col items-center justify-center px-6 text-center">
      <p className="font-serif text-[32px] text-aos-text tracking-[-0.02em] leading-tight mb-2">
        Something went wrong.
      </p>
      <p className="font-serif italic text-sm text-aos-secondary mb-8 leading-relaxed">
        We couldn&apos;t load this page.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: "#F5F2ED", color: "#0A0A0C" }}
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
          style={{
            background: "#15151A",
            color: "#8A8580",
            border: "1px solid var(--aos-border)",
          }}
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
