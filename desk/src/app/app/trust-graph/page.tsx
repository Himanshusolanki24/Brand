"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useDemo } from "@/lib/store";
import { api, EngineError } from "@/lib/api";
import { demoTrustGraph } from "@/lib/seed";
import { SkeletonRow } from "@/components/ui/pills";
import type { TrustGraphResponse, TrustNode, TrustNodeKind } from "@/lib/types";

const KIND_GROUPS: Array<{ kind: TrustNodeKind; label: string; note: string }> = [
  { kind: "review", label: "Reviews", note: "pieces that came through the desk" },
  { kind: "issue", label: "Findings", note: "what the checks raised" },
  { kind: "rule", label: "Rules", note: "clauses findings cite" },
  { kind: "evidence", label: "Evidence", note: "fact sheet entries backing claims" },
  { kind: "decision", label: "Decisions", note: "approvals, signed or sent back" },
  { kind: "audit", label: "Recent activity", note: "the last entries in the audit trail" },
];

/** List-first trace view: pick a node, see everything it connects to. */
export default function TrustGraphPage() {
  const { session, engineError } = useDemo();
  const [graph, setGraph] = useState<TrustGraphResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!session) {
      // Demo lane: the sample graph straight from the fixture story.
      setGraph(demoTrustGraph());
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    void (async () => {
      try {
        const g = await api.trust(session.token);
        setGraph(g);
        setLoadError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        setLoadError(err instanceof EngineError ? err.message : "The trust graph could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [session]);

  const byId = useMemo(() => new Map((graph?.nodes ?? []).map((n) => [n.id, n])), [graph]);

  const neighbours = useMemo(() => {
    if (!graph || !selected) return null;
    const rows: Array<{ rel: string; other: TrustNode }> = [];
    for (const e of graph.edges) {
      const otherId = e.src === selected ? e.dst : e.dst === selected ? e.src : null;
      const other = otherId ? byId.get(otherId) : undefined;
      if (other) rows.push({ rel: e.rel, other });
    }
    return rows;
  }, [graph, selected, byId]);

  const nodeCount = graph?.nodes.length ?? 0;
  const edgeCount = graph?.edges.length ?? 0;

  return (
    <div>
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-[24px] font-semibold tracking-tight">Trust Graph</h1>
          <p className="text-sm text-ink-soft">
            Every finding traced back to the rule it cites and the evidence behind it — nothing on this desk
            decided itself.
          </p>
        </div>
        {!session ? (
          <span className="rounded-full bg-pencil-wash px-2.5 py-1 text-[11.5px] font-semibold text-pencil">
            sample data
          </span>
        ) : null}
      </header>

      {loading ? (
        <div className="mt-7 space-y-2" aria-busy="true" aria-label="Loading the trust graph">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : null}

      {!loading && loadError ? (
        <div className="mt-7 rounded-lg border border-redpen/30 bg-redpen-wash px-5 py-4">
          <p className="text-[13.5px] text-redpen">{loadError}</p>
          <p className="mt-1 text-[12.5px] text-ink-soft">
            {engineError ?? "Check the review service and reload."}
          </p>
        </div>
      ) : null}

      {!loading && graph && nodeCount === 0 ? (
        <p className="mt-7 rounded-lg border border-line bg-sheet p-5 text-sm text-ink-soft">
          The graph is empty — submit a review and every finding will land here with its trail.
        </p>
      ) : null}

      {!loading && graph && nodeCount > 0 ? (
        <div className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-lg border border-line bg-sheet px-5 py-4">
            <p className="text-[12px] text-ink-soft tabular-nums">
              {nodeCount} nodes · {edgeCount} traced connections
            </p>
            <div className="mt-3 space-y-5">
              {KIND_GROUPS.map((group) => {
                const rows = graph.nodes.filter((n) => n.kind === group.kind);
                if (rows.length === 0) return null;
                return (
                  <div key={group.kind}>
                    <h2 className="flex items-baseline gap-2 text-[13.5px] font-semibold">
                      {group.label}
                      <span className="text-[11.5px] font-normal text-ink-soft">{group.note}</span>
                    </h2>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {rows.map((n) => (
                        <li key={n.id}>
                          <button
                            type="button"
                            onClick={() => setSelected(n.id === selected ? null : n.id)}
                            className={clsx(
                              "max-w-full truncate rounded-md border px-2.5 py-1 text-left text-[12.5px] transition-colors",
                              selected === n.id
                                ? "border-ink bg-ink text-paper"
                                : "border-line bg-paper text-ink hover:border-line-strong",
                            )}
                            title={n.kind === "audit" ? `${n.label} — by ${n.detail ?? "the desk"}` : n.label}
                          >
                            {n.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="lg:sticky lg:top-6">
            {selected === null ? (
              <p className="rounded-lg border border-line bg-sheet p-4 text-[13px] text-ink-soft">
                Pick any node to see its connections — a finding to its rule, a rule to the evidence, a review
                to the human decision that closed it.
              </p>
            ) : neighbours !== null ? (
              <div className="rounded-lg border border-line bg-sheet p-4">
                <p className="font-hand text-[15px] leading-none text-pencil">connections of</p>
                <p className="mt-1 text-[14px] font-semibold">{byId.get(selected)?.label}</p>
                {neighbours.length === 0 ? (
                  <p className="mt-3 text-[12.5px] text-ink-soft">
                    No traced connections — this entry stands alone in the record.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {neighbours.map((row, idx) => (
                      <li key={`${row.other.id}-${idx}`} className="flex items-start gap-2 text-[12.5px]">
                        <span className="mt-0.5 shrink-0 rounded bg-cite-wash px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-cite">
                          {row.rel.replaceAll("_", " ")}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelected(row.other.id)}
                          className="min-w-0 text-left text-ink hover:text-cite"
                        >
                          <span className="block truncate">{row.other.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
