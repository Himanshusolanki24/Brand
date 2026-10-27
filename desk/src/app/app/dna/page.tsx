"use client";

import { useState } from "react";
import clsx from "clsx";
import { fmtDate, useDemo } from "@/lib/store";

const TABS = ["Guidelines", "Facts", "Terminology", "Assets"] as const;
type Tab = (typeof TABS)[number];

export default function BrandDnaPage() {
  const { state } = useDemo();
  const [tab, setTab] = useState<Tab>("Guidelines");

  return (
    <div>
      <header>
        <h1 className="font-display text-[24px] font-semibold tracking-tight">Brand DNA</h1>
        <p className="text-sm text-ink-soft">
          Everything a finding can point at: guidelines{" "}
          <span className="tabular-nums">{state.guidelineVersion}</span>, {state.facts.length} facts,{" "}
          {state.terms.length} terms, {state.assets.length} assets — the version every current word is judged
          against.
        </p>
      </header>

      <section className="mt-7 rounded-lg border border-line bg-sheet">
        <div role="tablist" aria-label="Knowledge base sections" className="flex gap-1 border-b border-line px-3 pt-2">
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

        <div className="px-5 pb-5">
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
                        not scored yet
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
                  <p className="text-[14.5px] font-medium">
                    <span className="mr-1.5 font-mono text-[11px] font-semibold text-cite">[{f.id}]</span>
                    {f.claim}
                  </p>
                  <p className="mt-0.5 font-mono text-[11.5px] text-ink-soft">
                    verified {fmtDate(Date.parse(f.verified))} · {f.source}
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
        </div>
      </section>
    </div>
  );
}
