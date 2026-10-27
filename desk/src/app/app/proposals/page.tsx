"use client";

import Link from "next/link";
import { useDemo } from "@/lib/store";
import { Stamp } from "@/components/ui/pills";

export default function ProposalsPage() {
  const { state, session } = useDemo();
  const rows = [...state.amendments].sort((a, b) => (a.state === b.state ? 0 : a.state === "proposed" ? -1 : 1));

  return (
    <div>
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-[24px] font-semibold tracking-tight">Learning proposals</h1>
          <p className="text-sm text-ink-soft">
            Reviewer feedback turned into draft rulebook text — the only road into {state.guidelineVersion}
            runs through a ratification here.
          </p>
        </div>
      </header>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {rows.length === 0 ? (
          <p className="rounded-lg border border-line bg-sheet p-5 text-sm text-ink-soft sm:col-span-2">
            No proposals yet. They appear when reviewer feedback — usually dismissals with reasons — points at
            a weakness in the rulebook.
          </p>
        ) : null}
        {rows.map((a) => (
          <Link
            key={a.id}
            href={`/app/proposals/${a.id}`}
            className="group rounded-lg border border-line bg-sheet p-5 transition-colors hover:border-line-strong"
          >
            <div className="flex items-center gap-2.5">
              <span className="font-display text-[13px] font-semibold text-cite">§{a.clause}</span>
              {a.state === "ratified" ? (
                <Stamp label="Ratified" />
              ) : (
                <span className="rounded-full bg-pencil-wash px-2 py-0.5 text-[11px] font-semibold text-pencil">
                  proposed
                </span>
              )}
            </div>
            <p className="mt-2.5 text-[13.5px] font-medium leading-snug">{a.basedOn}</p>
            <blockquote className="mt-2.5 line-clamp-2 border-l-2 border-pencil pl-3 text-[13px] leading-relaxed text-ink-soft group-hover:text-ink">
              {a.draft}
            </blockquote>
            <p className="mt-3 text-[12px] text-cite">Open the draft →</p>
          </Link>
        ))}
      </div>

      {!session ? (
        <p className="mt-5 text-[11.5px] leading-snug text-ink-soft/80">
          Ratification on the sample desk walks through the same governed change the review service makes on
          live data.
        </p>
      ) : null}
    </div>
  );
}
