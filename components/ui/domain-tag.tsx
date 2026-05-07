/**
 * Renders a domain (or capability) as a tinted pill. Twelve domains are
 * bucketed into six muted accent colors — enough variety to differentiate
 * cards in a list without breaking the brand's gold/green discipline.
 */

const DOMAIN_LABELS: Record<string, string> = {
  ai: "AI",
  creator: "Creator",
  b2b: "B2B",
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

type Tint = "indigo" | "coral" | "teal" | "sage" | "bronze" | "moss";

const DOMAIN_TINT: Record<string, Tint> = {
  ai: "indigo",
  devtools: "indigo",
  creator: "coral",
  community: "coral",
  media: "coral",
  b2b: "teal",
  finance: "teal",
  health: "sage",
  education: "sage",
  productivity: "bronze",
  commerce: "bronze",
  climate: "moss",
};

const TINT_VAR: Record<Tint, string> = {
  indigo: "var(--aos-tint-indigo)",
  coral: "var(--aos-tint-coral)",
  teal: "var(--aos-tint-teal)",
  sage: "var(--aos-tint-sage)",
  bronze: "var(--aos-tint-bronze)",
  moss: "var(--aos-tint-moss)",
};

export function tintForDomain(domain: string): string {
  const t = DOMAIN_TINT[domain] ?? "bronze";
  return TINT_VAR[t];
}

export function DomainTag({
  domain,
  size = "sm",
  variant = "soft",
}: {
  domain: string;
  size?: "xs" | "sm";
  variant?: "soft" | "outline";
}) {
  const label = DOMAIN_LABELS[domain] ?? domain;
  const tint = tintForDomain(domain);

  const sizing =
    size === "xs"
      ? "px-1.5 py-[2px] text-[9px] tracking-[0.14em]"
      : "px-2 py-[3px] text-[10px] tracking-[0.12em]";

  if (variant === "outline") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full uppercase font-medium ${sizing}`}
        style={{
          color: tint,
          border: `1px solid ${tint}`,
          background: "transparent",
        }}
      >
        <span
          aria-hidden
          className="w-1 h-1 rounded-full"
          style={{ background: tint }}
        />
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full uppercase font-medium ${sizing}`}
      style={{
        color: tint,
        background: `color-mix(in oklab, ${tint} 12%, transparent)`,
        border: `1px solid color-mix(in oklab, ${tint} 22%, transparent)`,
      }}
    >
      <span
        aria-hidden
        className="w-1 h-1 rounded-full"
        style={{ background: tint }}
      />
      {label}
    </span>
  );
}
