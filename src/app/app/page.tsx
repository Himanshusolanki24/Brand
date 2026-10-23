"use client";

import Link from "next/link";
import { fmtDate, useDemo, unresolved } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Stamp, StatusPill } from "@/components/ui/pills";
import { ClarityRadar } from "@/components/app/clarity-radar";

export default function DashboardPage() {
  const { state, dispatch } = useDemo();

  const openFlags = state.reviews.reduce((sum, r) => sum + unresolved(r).length, 0);
  const inFlow = state.reviews.filter(
    (r) => r.status !== "approved" && r.status !== "analyzing",
  ).length;
  const waiting = state.approvals.filter((a) => a.state === "waiting").length;
  const signed = state.reviews.filter((r) => r.status === "approved").length;

  const proposed = state.amendments.filter((a) => a.state === "proposed");
  const recent = [...state.reviews]
    .sort((a, b) => b.submittedAt - a.submittedAt)
    .slice(0, 4);

  const stats = [
    { label: "open flags", value: openFlags, note: "waiting on a person" },
    { label: "in the flow", value: inFlow, note: "review or fix loop" },
    { label: "awaiting signature", value: waiting, note: "the human decision" },
    { label: "signed off", value: signed, note: "this workspace" },
  ];

  return (
    <div>
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] font-semibold tracking-tight">
            The proofing desk
          </h1>
          <p className="text-sm text-ink-soft">
            Meridian Coffee — guidelines {state.guidelineVersion}, same version every word is judged against.
          </p>
        </div>
        <Link href="/app/intake">
          <Button size="sm" className="gap-1.5">
            Proof a new piece
          </Button>
        </Link>
      </header>

      <section aria-label="Desk snapshot" className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-line bg-sheet px-4 py-3.5">
            <p className="font-display text-[26px] font-semibold tabular-nums">{s.value}</p>
            <p className="text-[13px] font-medium">{s.label}</p>
            <p className="pt-0.5 text-[12px] text-ink-soft">{s.note}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-5 lg:grid-cols-[360px_1fr]">
        <section className="rounded-lg border border-line bg-sheet p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-[17px] font-semibold">Guideline Clarity Radar</h2>
            <span className="font-hand text-[15px] text-pencil">close the loop</span>
          </div>
          <p className="mt-1 text-[12.5px] text-ink-soft">
            How decidable each clause actually is — measured from real review cycles, drawn each week.
          </p>
          <div className="mt-2 flex justify-center">
            <ClarityRadar scores={state.radar} size={216} />
          </div>
          <ul className="mt-1 space-y-1.5 text-[12.5px] text-ink-soft">
            {state.radar.map((a) => (
              <li key={a.axis} className="leading-snug">
                <span className="font-medium text-ink">{a.axis}</span>{" "}
                {a.note}
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-5">
          <section className="rounded-lg border border-line bg-sheet p-5">
            <h2 className="font-display text-[17px] font-semibold">
              Draft amendments the radar is proposing
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-soft">
              Weak clauses are a finding too. Nothing lands in the rulebook without a human ratifying it.
            </p>
            <ul className="mt-4 space-y-4">
              {proposed.length === 0 ? (
                <li className="text-sm text-ink-soft">All drafts handled. The rulebook is as sharp as it gets this week.</li>
              ) : null}
              {proposed.map((a) => (
                <li key={a.id} className="rounded-md border border-line p-4">
                  <div className="flex items-center gap-2.5">
                    <span className="font-display text-[13px] font-semibold text-cite">§{a.clause}</span>
                    <span className="font-hand text-[15px] leading-none text-pencil">proposed by the radar</span>
                  </div>
                  <p className="mt-2 text-[13px] font-medium">{a.basedOn}</p>
                  <blockquote className="mt-2 border-l-2 border-pencil pl-3 text-[13.5px] leading-relaxed text-ink">
                    {a.draft}
                  </blockquote>
                  {a.state === "proposed" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => dispatch({ type: "ratify", amendmentId: a.id })}
                    >
                      Ratify into the next draft
                    </Button>
                  ) : (
                    <div className="mt-3"><Stamp label="Ratified" /></div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-line bg-sheet p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-[17px] font-semibold">On the desk</h2>
              <Link href="/app/reviews" className="text-[13px] font-medium text-cite hover:underline">
                All reviews
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-line">
              {recent.map((r) => (
                <li key={r.id}>
                  <Link href={`/app/reviews/${r.id}`} className="group flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-medium group-hover:text-cite">{r.title}</p>
                      <p className="text-[12px] text-ink-soft">
                        {r.channel} · {r.author} · {fmtDate(r.submittedAt)}
                      </p>
                    </div>
                    <StatusPill status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
