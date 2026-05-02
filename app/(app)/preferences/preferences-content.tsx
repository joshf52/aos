"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

const SPRING = [0.22, 1, 0.36, 1] as const;

const DOMAIN_LABELS: Record<string, string> = {
  ai: "AI & ML",
  creator: "Creator Economy",
  b2b: "B2B SaaS",
  devtools: "Dev Tools",
  health: "Health",
  finance: "Finance",
  education: "Education",
  productivity: "Productivity",
  commerce: "E-commerce",
  community: "Community",
  media: "Media",
  climate: "Climate",
};

const AUDIENCE_LABELS: Record<string, string> = {
  creators: "Creators",
  developers: "Indie Hackers",
  smb: "Small Business",
  consumers: "Consumers",
};

const COMMITMENT_LABELS: Record<string, string> = {
  exploring: "Exploring",
  building: "Building",
  allin: "All in",
};

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="text-[10px] text-aos-tertiary uppercase tracking-[0.16em] font-medium mb-2 px-1">
        {label}
      </div>
      <div
        className="rounded-[18px] overflow-hidden"
        style={{
          background: "#15151A",
          border: "1px solid rgba(245,242,237,0.06)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function PrefRow({
  label,
  value,
  href,
  last,
}: {
  label: string;
  value: string;
  href: string;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.025]"
      style={!last ? { borderBottom: "1px solid rgba(245,242,237,0.05)" } : undefined}
    >
      <div>
        <div className="text-[14px] text-aos-text font-medium tracking-[-0.01em]">
          {label}
        </div>
        <div className="text-[12px] mt-0.5" style={{ color: "#5A5650" }}>{value}</div>
      </div>
      <ChevronRight size={14} color="#3A3A42" strokeWidth={2} />
    </Link>
  );
}

function StaticRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-5 py-4"
      style={!last ? { borderBottom: "1px solid rgba(245,242,237,0.05)" } : undefined}
    >
      <div className="text-[14px] text-aos-text font-medium tracking-[-0.01em]">
        {label}
      </div>
      <div className="text-[13px]" style={{ color: "#5A5650" }}>{value}</div>
    </div>
  );
}

export function PreferencesContent({
  email,
  buildMode,
  domains,
  audience,
  commitmentLevel,
  unfairAdvantage,
  signOut,
}: {
  email: string;
  buildMode: "self" | "ai" | null;
  domains: string[];
  audience: string | null;
  commitmentLevel: string | null;
  unfairAdvantage: string | null;
  signOut: () => Promise<void>;
}) {
  const router = useRouter();

  const buildModeLabel =
    buildMode === "self"
      ? "Build it myself"
      : buildMode === "ai"
      ? "Build it for me with AI"
      : "Not set";

  const domainsLabel =
    domains.length > 0
      ? domains
          .slice(0, 3)
          .map((id) => DOMAIN_LABELS[id] ?? id)
          .join(", ") + (domains.length > 3 ? ` +${domains.length - 3}` : "")
      : "Not set";

  const audienceLabel = audience ? (AUDIENCE_LABELS[audience] ?? audience) : "Not set";
  const commitmentLabel = commitmentLevel ? (COMMITMENT_LABELS[commitmentLevel] ?? commitmentLevel) : "Not set";
  const advantageLabel = unfairAdvantage
    ? unfairAdvantage.length > 48 ? unfairAdvantage.slice(0, 48) + "…" : unfairAdvantage
    : "Not set";

  return (
    <main className="min-h-dvh bg-aos-bg relative overflow-hidden">
      {/* Subtle ambient */}
      <div
        className="absolute top-0 right-0 w-[300px] h-[300px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(212,165,116,0.07) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      <div className="relative z-10 px-6 pt-14 pb-28 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
            style={{
              background: "#15151A",
              border: "1px solid rgba(245,242,237,0.08)",
            }}
            aria-label="Back"
          >
            <ArrowLeft size={16} color="#8A8580" strokeWidth={2} />
          </button>
          <span className="text-[15px] font-semibold text-aos-text tracking-[-0.01em]">
            Preferences
          </span>
          <div className="w-9" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: SPRING }}
        >
          <h1 className="font-serif text-[30px] text-aos-text tracking-[-0.025em] leading-[1.1] mb-1.5">
            Your taste profile.
          </h1>
          <p className="font-serif italic text-[13px] mb-8" style={{ color: "#5A5650" }}>
            Updates take effect immediately.
          </p>

          <Section label="Build profile">
            <PrefRow
              label="Build mode"
              value={buildModeLabel}
              href="/onboarding/build-mode?from=preferences"
            />
            <PrefRow
              label="Domains"
              value={domainsLabel}
              href="/onboarding/domains?from=preferences"
            />
            <PrefRow
              label="Audience"
              value={audienceLabel}
              href="/onboarding/audience?from=preferences"
            />
            <PrefRow
              label="Commitment"
              value={commitmentLabel}
              href="/onboarding/commitment?from=preferences"
              last
            />
          </Section>

          <Section label="Edge">
            <PrefRow
              label="Your advantage"
              value={advantageLabel}
              href="/onboarding/advantage?from=preferences"
              last
            />
          </Section>

          <Section label="Account">
            <StaticRow label="Email" value={email} />
            <div className="px-5 py-4">
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-[14px] font-medium tracking-[-0.01em] transition-opacity hover:opacity-70"
                  style={{ color: "#5A5650", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  Sign out
                </button>
              </form>
            </div>
          </Section>
        </motion.div>
      </div>
    </main>
  );
}
