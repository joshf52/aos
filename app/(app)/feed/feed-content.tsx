"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ChevronRight, Sparkles, TrendingUp, ExternalLink } from "lucide-react";
import type { Opportunity } from "@/types/database";
import { EditorialCard } from "@/components/ui/editorial-card";
import { SprintStrip } from "@/components/ui/sprint-strip";
import { DomainTag, tintForDomain } from "@/components/ui/domain-tag";
import { ConfidenceDots } from "@/components/ui/confidence-dots";

const spring = { ease: [0.22, 1, 0.36, 1] as const };

type SprintInfo = {
  commitmentId: string;
  opportunityTitle: string;
  daysIn: number;
  checkinDue: boolean;
  buildMode: "self" | "ai";
};

type TrendingSignal = { domain: string; label: string; count: number };
type ShippedCard = {
  title: string;
  capability: string;
  url: string;
  shippedAt: string;
};

function relativeShip(iso: string): string {
  const days = Math.floor(
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const DOMAIN_LABELS: Record<string, string> = {
  ai: "AI", creator: "Creator", b2b: "B2B", devtools: "Dev Tools",
  health: "Health", finance: "Finance", education: "Education",
  productivity: "Productivity", commerce: "E-commerce",
  community: "Community", media: "Media", climate: "Climate",
};

function pickMatch(opp: Opportunity, userDomains: string[]): string | null {
  const set = new Set(userDomains);
  const match = (opp.domains ?? []).find((d) => set.has(d));
  return match ? DOMAIN_LABELS[match] ?? match : null;
}

export function FeedContent({
  opportunities,
  dateLabel,
  subtitle,
  userDomains,
  sprint,
  trending,
  shipped,
}: {
  opportunities: Opportunity[];
  dateLabel: string;
  subtitle: string;
  userDomains: string[];
  sprint: SprintInfo | null;
  trending: TrendingSignal[];
  shipped: ShippedCard[];
}) {
  const [featured, ...rest] = opportunities;
  const featuredMatch = featured ? pickMatch(featured, userDomains) : null;

  return (
    <main className="min-h-dvh bg-aos-bg">
      <div className="px-6 pt-16 pb-28 max-w-lg mx-auto">

        {/* Date */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-[12px] text-aos-tertiary uppercase tracking-[0.15em] font-medium"
        >
          {dateLabel}
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-serif text-[38px] text-aos-text tracking-[-0.03em] leading-[1.05] mt-1.5"
        >
          Today&apos;s pulse.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-sm text-aos-secondary mt-2 leading-relaxed"
        >
          {subtitle}
        </motion.p>

        {/* Sprint strip — for returning users with an active commitment */}
        {sprint && <SprintStrip {...sprint} />}

        {/* Trending signals */}
        {trending.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22, ...spring }}
            className="mt-7"
          >
            <div className="flex items-center gap-2 mb-2.5">
              <TrendingUp size={11} className="text-aos-tertiary" strokeWidth={2} />
              <span className="text-[10px] uppercase tracking-[0.16em] font-medium text-aos-tertiary">
                Trending signals
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {trending.map((t, i) => (
                <motion.span
                  key={t.domain}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.26 + i * 0.05, ...spring }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[-0.01em]"
                  style={{
                    background: "rgba(245,242,237,0.04)",
                    border: "1px solid var(--aos-border)",
                    color: "#F5F2ED",
                  }}
                >
                  <span
                    className="w-1 h-1 rounded-full"
                    style={{ background: "#3DB87A", boxShadow: "0 0 4px #3DB87A" }}
                  />
                  {t.label}
                  <span className="text-aos-tertiary tabular-nums">{t.count}</span>
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Featured card */}
        {featured ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ...spring }}
            className="mt-7"
          >
            <Link href={`/opportunity/${featured.slug}`} className="group block rounded-[26px]">
              <EditorialCard
                intensity="feature"
                glow="dual"
                dotGrid
                className="cursor-pointer active:scale-[0.99] transition-all duration-200 hover:-translate-y-0.5 hover:![border-color:rgba(245,242,237,0.14)]"
              >
                <div className="relative p-6">
                  {/* Badge + confidence */}
                  <div className="flex items-start justify-between mb-5">
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full text-[10px] font-medium tracking-[0.06em] uppercase"
                      style={{ background: "rgba(212,165,116,0.1)", color: "#D4A574", border: "1px solid rgba(212,165,116,0.18)" }}
                    >
                      <Sparkles size={10} strokeWidth={2} />
                      {featuredMatch ? `For you · ${featuredMatch}` : "Featured"}
                    </div>
                    <ConfidenceDots count={featured.confidence} />
                  </div>

                  {/* Category */}
                  <div className="text-[10px] text-aos-tertiary uppercase tracking-[0.14em] font-medium mb-2.5">
                    {featured.capability}
                  </div>

                  {/* Title */}
                  <h2
                    className="font-serif text-aos-text leading-[1.12]"
                    style={{ fontSize: "clamp(24px, 6.5vw, 30px)", letterSpacing: "-0.025em", marginBottom: 14 }}
                  >
                    {featured.title}
                  </h2>

                  {/* Gap */}
                  <p className="text-[13px] leading-[1.6] mb-6" style={{ color: "#8A8580" }}>
                    {featured.gap}
                  </p>

                  {/* Footer */}
                  <div
                    className="flex items-center justify-between pt-4"
                    style={{ borderTop: "1px solid rgba(245,242,237,0.07)" }}
                  >
                    <PresenceDots count={featured.builder_count} />
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: "#F5F2ED" }}>
                      Explore <ArrowRight size={13} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              </EditorialCard>
            </Link>
          </motion.div>
        ) : (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="font-serif text-xl text-aos-secondary italic mt-14 text-center"
          >
            New opportunities every Monday.
          </motion.p>
        )}

        {/* Also for you */}
        {rest.length > 0 && (
          <div className="mt-9">
            <div className="flex items-center justify-between mb-3.5">
              <div className="text-[11px] text-aos-tertiary uppercase tracking-[0.12em] font-medium">
                Also for you
              </div>
              <div className="text-xs text-aos-secondary">{rest.length} more</div>
            </div>

            <div className="flex flex-col gap-2">
              {rest.map((opp, i) => {
                const match = pickMatch(opp, userDomains);
                return (
                  <motion.div
                    key={opp.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 + i * 0.08, ...spring }}
                  >
                    <Link
                      href={`/opportunity/${opp.slug}`}
                      className="group relative flex items-center gap-3.5 p-4 rounded-[18px] w-full active:scale-[0.99] transition-all duration-200 hover:!bg-aos-elevated hover:![border-color:var(--aos-border-strong)] overflow-hidden"
                      style={{
                        background: "#15151A",
                        border: "1px solid var(--aos-border)",
                        display: "flex",
                      }}
                    >
                      {(match || opp.domains?.[0]) && (
                        <div
                          aria-hidden
                          className="absolute left-0 top-3 bottom-3 w-[2px] rounded-r-full"
                          style={{
                            background: match
                              ? "linear-gradient(180deg, transparent 0%, rgba(212,165,116,0.7) 50%, transparent 100%)"
                              : `linear-gradient(180deg, transparent, ${tintForDomain(opp.domains[0])} 50%, transparent)`,
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          {opp.domains?.[0] ? (
                            <DomainTag domain={opp.domains[0]} size="xs" />
                          ) : (
                            <span className="text-[11px] text-aos-tertiary uppercase tracking-[0.1em] font-medium">
                              {opp.capability}
                            </span>
                          )}
                          {match && (
                            <span
                              className="text-[10px] uppercase tracking-[0.1em] font-medium"
                              style={{ color: "#D4A574" }}
                            >
                              · For you
                            </span>
                          )}
                        </div>
                        <div className="font-serif text-[17px] text-aos-text tracking-[-0.01em] leading-snug">
                          {opp.title}
                        </div>
                        <div className="flex items-center gap-2.5 mt-1.5">
                          <ConfidenceDots count={opp.confidence} size="sm" />
                          <span className="text-xs text-aos-secondary tabular-nums">
                            {opp.builder_count} exploring
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={16} color="#8A8580" strokeWidth={2} className="shrink-0" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Just shipped — anonymized social proof */}
        {shipped.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ...spring }}
            className="mt-10"
          >
            <div className="flex items-end justify-between mb-3.5">
              <div>
                <div className="text-[10px] text-aos-tertiary uppercase tracking-[0.16em] font-medium mb-1">
                  Just shipped
                </div>
                <h3 className="font-serif text-aos-text text-[20px] leading-tight tracking-[-0.02em]">
                  Builders who finished.
                </h3>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {shipped.map((s, i) => (
                <motion.a
                  key={`${s.url}-${i}`}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.06, ...spring }}
                  className="flex items-center gap-3 p-3.5 rounded-[16px] transition-all duration-200 hover:!bg-aos-elevated hover:![border-color:var(--aos-border-strong)]"
                  style={{
                    background: "#15151A",
                    border: "1px solid var(--aos-border)",
                  }}
                >
                  <div
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                    style={{
                      background: "rgba(212,165,116,0.10)",
                      border: "1px solid rgba(212,165,116,0.22)",
                    }}
                  >
                    <Sparkles size={13} color="#D4A574" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[10px] text-aos-tertiary uppercase tracking-[0.1em] font-medium mb-0.5">
                      <span>{s.capability}</span>
                      <span>·</span>
                      <span className="normal-case tracking-normal text-aos-secondary">
                        {relativeShip(s.shippedAt)}
                      </span>
                    </div>
                    <div className="font-serif text-[15px] text-aos-text tracking-[-0.01em] leading-snug truncate">
                      {s.title}
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-aos-secondary shrink-0" strokeWidth={2} />
                </motion.a>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </main>
  );
}

function PresenceDots({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-9 h-3 shrink-0">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1, 0.9] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeInOut",
            }}
            className="absolute top-[1px] w-2.5 h-2.5 rounded-full"
            style={{
              left: i * 11,
              background: "#3DB87A",
              border: "2px solid #15151A",
            }}
          />
        ))}
      </div>
      <span className="text-xs text-aos-secondary tabular-nums">
        {count} exploring now
      </span>
    </div>
  );
}
