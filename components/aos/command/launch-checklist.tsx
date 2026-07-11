"use client";

// TUNING KNOBS: `className` only — this list is intentionally static (no
// per-item done state) since none of it is backed by a DB column yet. If a
// future migration adds per-item persistence, wire real booleans in instead
// of the placeholder dash markers below.
import { AOSDepthCard } from "@/components/aos/depth-card";

// STANDARD 30-day build-path template — a fixed reference list describing
// what a typical AI-built MVP covers end to end. This is NOT user-specific
// persisted data (no table backs it); it exists purely to give the command
// center a sense of the full build surface a sprint moves through.
const BUILD_PATH_TEMPLATE = [
  "Landing page",
  "Auth",
  "CRUD",
  "Pricing",
  "README",
  "Deploy guide",
  "Launch checklist",
] as const;

export function LaunchChecklist({ className = "" }: { className?: string }) {
  return (
    <section className={className}>
      <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-aos-tertiary mb-5">
        Build path · reference
      </p>
      <AOSDepthCard glow="none" dotGrid className="p-8">
        <p className="font-serif italic text-[15px] text-aos-secondary leading-relaxed mb-5">
          What a full build typically covers, start to finish.
        </p>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
          {BUILD_PATH_TEMPLATE.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] text-aos-tertiary"
            >
              <span aria-hidden className="text-aos-accent">
                –
              </span>
              {item}
            </li>
          ))}
        </ul>
      </AOSDepthCard>
    </section>
  );
}
