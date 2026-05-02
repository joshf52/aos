import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh bg-aos-bg flex flex-col items-center justify-center px-6 text-center">
      <div
        className="font-serif text-[72px] tracking-[-0.04em] leading-none mb-4"
        style={{ color: "#2A2A30" }}
      >
        404
      </div>
      <p className="font-serif text-[26px] text-aos-text tracking-[-0.02em] mb-2">
        Nothing here.
      </p>
      <p className="font-serif italic text-sm text-aos-secondary mb-8 leading-relaxed">
        This page doesn&apos;t exist or was moved.
      </p>
      <Link
        href="/"
        className="px-6 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
        style={{ background: "#F5F2ED", color: "#0A0A0C" }}
      >
        Go home
      </Link>
    </main>
  );
}
