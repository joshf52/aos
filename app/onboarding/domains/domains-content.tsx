"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Brain, Palette, Building2, Cpu, Heart, TrendingUp, BookOpen, Zap, ShoppingBag, Users, Globe, Lightbulb } from "lucide-react";
import { OnboardingShell, PrimaryButton } from "../shell";

const SPRING = [0.22, 1, 0.36, 1] as const;
const MIN = 3;

const DOMAINS = [
  { id: "ai", label: "AI & Machine Learning", Icon: Brain },
  { id: "creator", label: "Creator Economy", Icon: Palette },
  { id: "b2b", label: "B2B SaaS", Icon: Building2 },
  { id: "devtools", label: "Developer Tools", Icon: Cpu },
  { id: "health", label: "Health & Wellness", Icon: Heart },
  { id: "finance", label: "Finance", Icon: TrendingUp },
  { id: "education", label: "Education", Icon: BookOpen },
  { id: "productivity", label: "Productivity", Icon: Zap },
  { id: "commerce", label: "E-commerce", Icon: ShoppingBag },
  { id: "community", label: "Community", Icon: Users },
  { id: "media", label: "Media", Icon: Globe },
  { id: "climate", label: "Climate", Icon: Lightbulb },
] as const;

export function DomainsContent({
  initialDomains,
  saveAction,
  returnTo,
}: {
  initialDomains: string[];
  saveAction: (formData: FormData) => Promise<void>;
  returnTo?: string;
}) {
  const [selected, setSelected] = useState<string[]>(initialDomains);
  const [submitting, setSubmitting] = useState(false);
  const canContinue = selected.length >= MIN;

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }

  return (
    <OnboardingShell
      step={2}
      backHref={returnTo ?? "/onboarding/build-mode"}
      eyebrow="01 · Domains"
      title="What captures your imagination?"
      hint={`Pick at least ${MIN} worlds you want to build in. (${selected.length} selected)`}
      footer={
        <form action={saveAction} onSubmit={() => setSubmitting(true)}>
          {returnTo && <input type="hidden" name="_return_to" value={returnTo} />}
          {selected.map((id) => (
            <input key={id} type="hidden" name="domains" value={id} />
          ))}
          <PrimaryButton disabled={!canContinue || submitting}>
            Continue <ArrowRight size={17} strokeWidth={2.5} />
          </PrimaryButton>
        </form>
      }
    >
      <div className="flex flex-wrap gap-2 pb-4">
        {DOMAINS.map((domain, i) => {
          const isSelected = selected.includes(domain.id);
          return (
            <motion.button
              key={domain.id}
              type="button"
              onClick={() => toggle(domain.id)}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.03, ease: SPRING }}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full text-[13px] font-medium tracking-[-0.01em] transition-colors"
              style={{
                background: isSelected ? "rgba(61, 184, 122, 0.10)" : "#15151A",
                border: `1px solid ${
                  isSelected ? "rgba(61, 184, 122, 0.4)" : "var(--aos-border)"
                }`,
                color: isSelected ? "#3DB87A" : "#F5F2ED",
              }}
            >
              <domain.Icon
                size={13}
                strokeWidth={isSelected ? 2 : 1.5}
              />
              {domain.label}
            </motion.button>
          );
        })}
      </div>
    </OnboardingShell>
  );
}
