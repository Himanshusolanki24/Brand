"use client";

/**
 * Live status of the engine's semantic-review stage, fetched from
 * /api/health in the visitor's browser — the page tells the truth about the
 * deployment you are actually looking at, not the code's theoretical state.
 */

import { useEffect, useState } from "react";
import { ENGINE_URL } from "@/lib/api";

type Phase = "loading" | "on" | "off" | "unreachable";

export function AiLayerStatus() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [model, setModel] = useState("");

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    const run = async () => {
      try {
        const res = await fetch(`${ENGINE_URL}/api/health`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const facts = (await res.json()) as Record<string, unknown>;
        if (!alive) return;
        setModel(typeof facts.llm_model === "string" ? facts.llm_model : "");
        setPhase(facts.llm_provider === "openrouter" ? "on" : "off");
      } catch {
        if (alive) setPhase("unreachable");
      }
    };
    void run();
    return () => {
      alive = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const dot =
    phase === "on"
      ? "bg-keep"
      : phase === "loading"
        ? "bg-amber animate-pulse"
        : "bg-amber";

  const label =
    phase === "loading"
      ? "Asking the engine…"
      : phase === "on"
        ? `Semantic review is on — ${model}`
        : phase === "off"
          ? "Semantic review is off — the engine is deterministic-only (no provider key configured, no network)"
          : "Engine not reachable from this browser (it may be waking from idle — reload to retry). This page's contract text describes the code; this line describes the deployment you reached.";

  return (
    <div className="rounded-lg border border-line bg-sheet px-4 py-3.5">
      <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-soft/70">
        Live status — fetched from the engine, not asserted
      </p>
      <p className="mt-2 flex items-start gap-2 text-[14px] leading-relaxed text-ink">
        <span aria-hidden className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${dot}`} />
        <span>{label}</span>
      </p>
    </div>
  );
}
