"use client";

import Link from "next/link";
import { fmtDate, useDemo } from "@/lib/store";
import { StatusPill } from "@/components/ui/pills";
import { Button } from "@/components/ui/button";
import type { Review } from "@/lib/types";

function FlagsLine({ review }: { review: Review }) {
  const counts = {
    high: review.issues.filter((i) => i.severity === "high" && i.status === "open").length,
    medium: review.issues.filter((i) => i.severity === "medium" && i.status === "open").length,
    low: review.issues.filter((i) => i.severity === "low" && i.status === "open").length,
  };
  const bits = [
    (counts.high || null) && ["text-flag", `${counts.high} high`],
    (counts.medium || null) && ["text-amber", `${counts.medium} medium`],
    (counts.low || null) && ["text-cite", `${counts.low} low`],
  ].filter(Boolean) as Array<[string, string]>;
  if (bits.length === 0) return <span className="text-[12px] text-ink-soft">nothing open</span>;
  return (
    <span className="flex items-center gap-2.5">
      {bits.map(([cls, label]) => (
        <span key={label} className={`text-[12px] font-medium ${cls}`}>
          {label}
        </span>
      ))}
    </span>
  );
}

export default function ManuscriptsPage() {
  const { state } = useDemo();
  const reviews = [...state.reviews].sort((a, b) => b.submittedAt - a.submittedAt);

  return (
    <div>
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight">
            Manuscripts
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Every piece on the desk, newest first. Open one to read the galley with its marginalia.
          </p>
        </div>
        <Link href="/app/submit">
          <Button size="sm">Submit a piece</Button>
        </Link>
      </header>

      <ul className="mt-7 divide-y divide-line border-t border-line">
        {reviews.map((r) => (
          <li key={r.id}>
            <Link
              href={`/app/manuscripts/${r.id}`}
              className="group flex flex-wrap items-center gap-x-4 gap-y-1.5 py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-display text-[15.5px] font-medium underline-offset-4 group-hover:underline">
                  {r.title}
                </p>
                <p className="text-[12px] text-ink-soft">
                  {r.channel} · {r.author} · {fmtDate(r.submittedAt)}
                </p>
              </div>
              <FlagsLine review={r} />
              <StatusPill status={r.status} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
