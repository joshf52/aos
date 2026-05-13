"use client";

import { useState } from "react";
import { config as kit } from "@/kit.config";

export function WedgeForm() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setBusy(true);
    setErr(null);
    setOutput(null);
    try {
      const res = await fetch("/api/wedge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Request failed (${res.status}).`);
      }
      const j = await res.json();
      setOutput(j.output ?? "");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="text-[11px] uppercase tracking-[0.14em] text-ink-tertiary">
          {kit.workflow.inputLabel}
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={kit.workflow.inputPlaceholder}
          rows={8}
          className="w-full px-4 py-3 rounded-[14px] bg-ink-surface border border-ink-border text-[15px] leading-relaxed outline-none focus:border-ink-gold/50 resize-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="self-start mt-2 inline-flex items-center px-5 py-3 rounded-[14px] text-[14px] font-semibold tracking-[-0.01em] bg-ink-text text-ink-bg disabled:opacity-50"
        >
          {busy ? "Drafting…" : kit.workflow.submitLabel}
        </button>
        {err && <div className="text-[12px] text-red-300 mt-1">{err}</div>}
      </form>

      {output && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "#D4A574" }}>
              {kit.workflow.outputLabel}
            </label>
            <button
              onClick={() => navigator.clipboard?.writeText(output)}
              className="text-[12px] text-ink-secondary hover:text-ink-text transition-colors"
            >
              Copy
            </button>
          </div>
          <pre className="font-serif text-[16px] leading-relaxed whitespace-pre-wrap text-ink-text bg-ink-surface border border-ink-border rounded-[14px] p-5">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
