"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Check, Pencil } from "lucide-react";
import { HoldButton } from "@/components/ui/hold-button";
import type { BuildConfig } from "@/lib/ai-build/build-config";

const SPRING = [0.22, 1, 0.36, 1] as const;

type EditableField = "customer" | "wedge" | "workflow";

const FIELD_TO_ANSWER: Record<EditableField, 1 | 3 | 4> = {
  customer: 1,
  wedge: 3,
  workflow: 4,
};

export function ArchitectureContent({
  commitmentId,
  opportunityTitle,
  config,
  lens,
  updateLensAnswer,
  beginBuild,
}: {
  commitmentId: string;
  opportunityTitle: string;
  config: BuildConfig;
  lens: {
    answer_1: string | null;
    answer_2: string | null;
    answer_3: string | null;
    answer_4: string | null;
    answer_5: string | null;
  };
  updateLensAnswer: (commitmentId: string, field: 1 | 3 | 4, value: string) => Promise<void>;
  beginBuild: (commitmentId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<EditableField | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [building, setBuilding] = useState(false);

  function openEdit(field: EditableField) {
    const map: Record<EditableField, string | null> = {
      customer: lens.answer_1,
      wedge:    lens.answer_3,
      workflow: lens.answer_4,
    };
    setDraft(map[field] ?? "");
    setEditing(field);
  }

  function commitEdit() {
    if (!editing) return;
    const field = FIELD_TO_ANSWER[editing];
    startTransition(async () => {
      await updateLensAnswer(commitmentId, field, draft);
      setEditing(null);
    });
  }

  function handleBegin() {
    if (building) return;
    setBuilding(true);
    beginBuild(commitmentId).catch(() => setBuilding(false));
  }

  return (
    <main className="min-h-dvh bg-aos-bg">
      <div className="px-6 pt-14 pb-32 max-w-2xl mx-auto">

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: SPRING }}
          className="text-[11px] uppercase tracking-[0.16em] mb-6"
          style={{ color: "#D4A574" }}
        >
          {opportunityTitle} · Architecture
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: SPRING }}
          className="font-serif text-[clamp(40px,6vw,60px)] leading-[1.04] tracking-[-0.025em] text-balance"
        >
          Here&apos;s what we&apos;ll build.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18, ease: SPRING }}
          className="font-serif italic text-[18px] text-aos-secondary leading-relaxed mt-4 text-balance"
        >
          Read it. Rewrite anything that doesn&apos;t sound like your idea. Then press
          the gold button and we&apos;ll go.
        </motion.p>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.28, ease: SPRING }}
          className="mt-12 flex flex-col gap-3"
        >
          <ArchitectureRow
            label="Customer"
            value={config.landing.subhead}
            field="customer"
            opening={editing === "customer"}
            onOpen={() => openEdit("customer")}
          />
          <ArchitectureRow
            label="Wedge"
            value={config.landing.headline}
            field="wedge"
            opening={editing === "wedge"}
            onOpen={() => openEdit("wedge")}
          />
          <ArchitectureRow
            label="Workflow"
            value={config.workflow.title}
            field="workflow"
            opening={editing === "workflow"}
            onOpen={() => openEdit("workflow")}
          />
        </motion.section>

        {editing && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: SPRING }}
            className="mt-6 p-5 rounded-[18px] bg-aos-surface border border-aos-border"
          >
            <div className="text-[11px] uppercase tracking-[0.14em] text-aos-tertiary mb-3">
              Rewrite the {editing}
            </div>
            <textarea
              autoFocus
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full px-4 py-3 rounded-[12px] bg-aos-elevated border border-aos-border text-[15px] leading-relaxed text-aos-text outline-none focus:border-[#D4A574]/40 resize-none"
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={commitEdit}
                disabled={pending || !draft.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-aos-text text-aos-bg text-[13px] font-semibold disabled:opacity-50"
              >
                <Check size={14} strokeWidth={2.5} /> {pending ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="text-[13px] text-aos-secondary hover:text-aos-text transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.42, ease: SPRING }}
          className="mt-12 p-6 rounded-[20px] bg-aos-surface border border-aos-border"
        >
          <div className="text-[11px] uppercase tracking-[0.14em] text-aos-tertiary mb-4">
            One screen, one workflow
          </div>
          <div className="flex flex-col gap-4">
            <FactRow k="Input" v={config.workflow.inputLabel} />
            <FactRow k="Output" v={config.workflow.outputLabel} />
            <FactRow k="Submit" v={config.workflow.submitLabel} />
            <FactRow
              k="Price"
              v={`${config.pricing.price}${config.pricing.cadence} — collecting interest, not charging yet`}
            />
            <FactRow k="Built by" v={config.about.builtByLine} />
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55, ease: SPRING }}
          className="mt-14 flex flex-col items-center"
        >
          <p className="font-serif italic text-[15px] text-aos-secondary mb-5 text-center text-balance">
            Hold to begin. A live preview URL arrives within 24 hours.
          </p>
          <HoldButton
            label={building ? "Sending to the build queue…" : "Begin build"}
            holdLabel="Hold…"
            duration={1200}
            onComplete={() => { if (!building && !editing) handleBegin(); }}
          />
        </motion.section>

      </div>
    </main>
  );
}

function ArchitectureRow({
  label,
  value,
  opening,
  onOpen,
}: {
  label: string;
  value: string;
  field: EditableField;
  opening: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className={`group text-left p-5 rounded-[18px] border transition-colors ${
        opening
          ? "border-[#D4A574]/40 bg-aos-elevated"
          : "border-aos-border bg-aos-surface hover:border-aos-border-strong"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.16em] mb-2" style={{ color: "#D4A574" }}>
            {label}
          </div>
          <p className="font-serif text-[18px] leading-snug text-aos-text">{value}</p>
        </div>
        <Pencil
          size={14}
          className="shrink-0 mt-1 text-aos-tertiary group-hover:text-aos-secondary transition-colors"
          strokeWidth={1.5}
        />
      </div>
    </button>
  );
}

function FactRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="text-[10px] uppercase tracking-[0.14em] text-aos-tertiary w-20 shrink-0 mt-1">
        {k}
      </div>
      <div className="text-[14px] text-aos-text leading-snug flex-1">{v}</div>
    </div>
  );
}
