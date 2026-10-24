"use client";

import { useState } from "react";
import clsx from "clsx";
import { fmtDate, useDemo } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Stamp } from "@/components/ui/pills";
import { ClarityRadar } from "@/components/app/clarity-radar";

const TABS = ["Guidelines", "Facts", "Terminology", "Assets"] as const;
type Tab = (typeof TABS)[number];

export default function KnowledgeBasePage() {
  const { state, dispatch } = useDemo();
  const [tab, setTab] = useState<Tab>("Guidelines");

  const proposed = state.amendments.filter((a) => a.state === "proposed");

  return (
    <div>
      <header>
        <h1 className="font-display text-[24px] font-semibold tracking-tight">Knowledge base</h1>
        <p className="text-sm text-ink-soft">
          Everything a flag can point at lives here: guidelines {state.guidelineVersion},{" "}
          {state.facts.length} facts, {state.terms.length} terms, {state.assets.length} assets.
        </p>
      </header>

      <div className="mt-7 grid items-start gap-5 lg:grid-cols-[380px_1fr]">
        {/* Clarity Radar + close-the-loop */}
        <div className="space-y-5">
          <section className="rounded-lg border border-line bg-sheet p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-display text-[17px] font-semibold">Clarity Radar</h2>
              <span className="font-hand text-[15px] text-pencil">close the loop</span>
            </div>
            <div className="mt-1 flex justify-center">
              <ClarityRadar scores={state.radar} size={200} />
            </div>
            <p className="text-[12.5px] leading-snug text-ink-soft">
              Scores come from review cycles — how often a clause settles an argument without the
              humans re-deriving it in the comments.
            </p>
          </section>

          <section className="rounded-lg border border-line bg-sheet p-5">
            <h2 className="font-display text-[17px] font-semibold">Draft amendments</h2>
            <p className="mt-1 text-[12.5px] text-ink-soft">
              The radar only writes drafts. A human ratifies — or emails the team to argue instead.
            </p>
            <ul className="mt-4 space-y-4">
              {proposed.length === 0 ? (
                <li className="text-[13px] text-ink-soft">Nothing pending. The rulebook is holding.</li>
              ) : null}
              {proposed.map((a) => (
                <li key={a.id} className="rounded-md border border-line p-4">
                  <p className="font-display text-[13px] font-semibold text-cite">§{a.clause}</p>
                  <p className="mt-1.5 text-[13px] font-medium">{a.basedOn}</p>
                  <blockquote className="mt-2 border-l-2 border-pencil pl-3 text-[13.5px] leading-relaxed">
                    {a.draft}
                  </blockquote>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => dispatch({ type: "ratify", amendmentId: a.id })}
                  >
                    Ratify into {state.guidelineVersion === "v2.3" ? "v2.4" : "v2.5"}
                  </Button>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-line pt-3">
              {state.amendments.some((a) => a.state === "ratified") ? (
                <div className="flex items-center gap-3">
                  <Stamp label="Ratified" />
                  <p className="text-[12px] text-ink-soft">
                    Rulebook now reads {state.guidelineVersion}. Reviewed work cites the version it judged.
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        {/* The stacks */}
        <section>
          <div role="tablist" aria-label="Knowledge base sections" className="flex gap-1 border-b border-line">
            {TABS.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={clsx(
                  "-mb-px border-b-2 px-3 py-2 text-[13.5px] font-medium transition-colors",
                  tab === t
                    ? "border-ink text-ink"
                    : "border-transparent text-ink-soft hover:text-ink",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "Guidelines" ? (
            <ul className="divide-y divide-line">
              {state.guidelines.map((g) => (
                <li key={g.number} className="gap-3 py-4">
                  <p className="flex items-baseline gap-2.5">
                    <span className="font-display text-[14px] font-bold text-cite">§{g.number}</span>
                    <span className="text-[14.5px] font-semibold">{g.label}</span>
                    {g.clarity !== null ? (
                      <span
                        className="ml-auto hidden h-1.5 w-24 self-center overflow-hidden rounded bg-line sm:block"
                        role="img"
                        aria-label={`clarity ${g.clarity} of 100`}
                      >
                        <span
                          className="block h-full rounded"
                          style={{
                            width: `${g.clarity}%`,
                            background: g.clarity < 50 ? "var(--color-redpen)" : "var(--color-greenink)",
                          }}
                        />
                      </span>
                    ) : (
                      <span className="ml-auto hidden font-hand text-[15px] leading-none text-pencil sm:block">
                        the radar has not read this one yet
                      </span>
                    )}
                  </p>
                  <p className="mt-1.5 pl-[42px] text-[13.5px] leading-relaxed text-ink-soft">{g.text}</p>
                </li>
              ))}
            </ul>
          ) : null}

          {tab === "Facts" ? (
            <ul className="divide-y divide-line">
              {state.facts.map((f) => (
                <li key={f.id} className="py-4">
                  <p className="text-[14.5px] font-medium">{f.claim}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-soft">
                    verified {fmtDate(Date.parse(f.verified))} · {f.source} — anchors §2.1 and §4.1
                  </p>
                </li>
              ))}
            </ul>
          ) : null}

          {tab === "Terminology" ? (
            <dl className="divide-y divide-line">
              {state.terms.map((t) => (
                <div key={t.id} className="py-4">
                  <dt className="text-[14.5px] font-semibold">{t.term}</dt>
                  <dd className="mt-0.5 text-[13.5px] leading-relaxed text-ink-soft">{t.definition}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {tab === "Assets" ? (
            <ul className="divide-y divide-line">
              {state.assets.map((a) => (
                <li key={a.id} className="py-4">
                  <p className="text-[14.5px] font-medium">
                    {a.name} <span className="text-[12px] font-normal text-ink-soft">({a.kind})</span>
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-ink-soft">{a.note}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </div>
  );
}
