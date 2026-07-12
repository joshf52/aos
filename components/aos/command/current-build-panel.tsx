"use client";

// TUNING KNOBS: none beyond `className` — this panel's motion is a single
// ShipMoment fired once per fresh submission (see the `submitted` + prior-value
// ref dance below); it never fires on initial mount / normal navigation.
import { ArrowRight, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AOSDepthCard } from "@/components/aos/depth-card";
import { ShipMoment } from "@/components/aos/ship-moment";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Presentational check-in panel for the Sprint command center. Wraps the
 * existing "you shipped today" confirmation state and the check-in form —
 * both unchanged in structure/behavior. The only addition is a client-side
 * ShipMoment fired the moment `checkedInThisWeek` flips true right after this
 * component itself submitted the form (not on load, not on unrelated
 * revalidation). The server action passed in via `action` is never modified.
 */
export function CurrentBuildPanel({
  checkedInThisWeek,
  week,
  commitmentId,
  action,
  className = "",
}: {
  checkedInThisWeek: boolean;
  week: number;
  commitmentId: string;
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [showShip, setShowShip] = useState(false);
  const wasCheckedIn = useRef(checkedInThisWeek);

  useEffect(() => {
    if (submitted && checkedInThisWeek && !wasCheckedIn.current) {
      setShowShip(true);
      setSubmitted(false);
    }
    wasCheckedIn.current = checkedInThisWeek;
  }, [checkedInThisWeek, submitted]);

  return (
    <section className={className}>
      <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-aos-tertiary mb-5">
        Today
      </p>

      {checkedInThisWeek ? (
        <AOSDepthCard glow="gold" className="p-8">
          <div className="flex items-start gap-5">
            <div
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                         bg-aos-gold/[0.10] border border-aos-gold/30"
            >
              <Check size={16} strokeWidth={2.5} className="text-aos-gold" />
            </div>
            <div>
              <h2 className="font-serif text-[26px] leading-[1.15] text-aos-text tracking-[-0.02em]">
                You shipped today.
              </h2>
              <p className="text-[14px] leading-relaxed text-aos-secondary mt-2">
                Logged for week {week}. Come back tomorrow.
              </p>
            </div>
          </div>
        </AOSDepthCard>
      ) : (
        <AOSDepthCard glow="green" className="p-8">
          <form action={action} onSubmit={() => setSubmitted(true)}>
            <input type="hidden" name="commitmentId" value={commitmentId} />
            <h2 className="font-serif text-[28px] leading-[1.15] text-aos-text tracking-[-0.02em]">
              What did you ship today?
            </h2>
            <p className="text-[14px] leading-relaxed text-aos-secondary mt-2">
              A line, a paragraph, a screenshot description. Whatever moved.
            </p>

            <textarea
              name="shipped"
              required
              minLength={1}
              placeholder="Today I…"
              className={cn(
                "w-full min-h-[120px] resize-none mt-6 bg-ink-700",
                "border border-aos-border rounded-lg p-4 text-base font-sans",
                "text-aos-text leading-relaxed outline-none",
                "placeholder:text-aos-tertiary placeholder:italic",
                "transition-colors duration-200 focus:border-aos-border-strong"
              )}
              style={{ caretColor: "#D4A574" }}
            />

            <div className="mt-5 flex justify-end">
              <Button variant="primary" size="lg" type="submit">
                Submit check-in
                <ArrowRight size={16} strokeWidth={2.5} />
              </Button>
            </div>
          </form>
        </AOSDepthCard>
      )}

      <ShipMoment show={showShip} message="Shipped." onDone={() => setShowShip(false)} />
    </section>
  );
}
