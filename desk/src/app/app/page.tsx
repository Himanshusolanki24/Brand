"use client";

import Link from "next/link";
import { fmtDate, useDemo, unresolved } from "@/lib/store";
import { can } from "@/lib/permits";
import { Button } from "@/components/ui/button";
import { Stamp, StatusPill } from "@/components/ui/pills";
import { ClarityRadar } from "@/components/app/radar";

export default function ImprintPage() {
  const { state, dispatch, session } = useDemo();

  // Seat for permission checks: the signed-in role, else the demo seat picked
  // in the sidebar. The server stays authoritative in product mode.
  const seat = session?.user.role ?? state.role;
  const canRatify = can(seat, "ratify_proposal");

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
      {/* Masthead — the front page of the book */}
      <header className="border-b-2 border-ink pb-5">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">
          {session ? "Live desk" : "Sample desk"} · Meridian Coffee
        </p>
        <h1 className="mt-1.5 font-display text-[34px] font-semibold leading-tight tracking-tight">
          The Imprint
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Standards {state.guidelineVersion} — the same version every word on this desk is judged
          against. Nothing here moves without a human.
        </p>
      </header>

      <section aria-label="Desk snapshot" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-line bg-sheet px-4 py-3.5">
            <p className="font-display text-[26px] font-semibold tabular-nums">{s.value}</p>
            <p className="text-[13px] font-medium">{s.label}</p>
            <p className="pt-0.5 text-[12px] text-ink-soft">{s.note}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* In-edition — the pieces currently on the desk */}
        <section aria-label="In edition" className="rounded-lg border border-line bg-sheet p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-[18px] font-semibold">In edition</h2>
            <Link href="/app/manuscripts" className="text-[13px] font-medium text-cite hover:underline">
              All manuscripts
            </Link>
          </div>
          <p className="mt-1 text-[12.5px] text-ink-soft">
            Newest first. Open one to read the galley with its marginalia.
          </p>
          <ul className="mt-3 divide-y divide-line">
            {recent.map((r) => (
              <li key={r.id}>
                <Link href={`/app/manuscripts/${r.id}`} className="group flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[15px] font-medium group-hover:text-cite">
                      {r.title}
                    </p>
                    <p className="text-[12px] text-ink-soft">
                      {r.channel} · {r.author} · {fmtDate(r.submittedAt)}
                    </p>
                  </div>
                  <StatusPill status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/app/submit"
            className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink hover:text-cite"
          >
            Submit a new piece →
          </Link>
        </section>

        {/* The standards page — radar and ratifiable amendments */}
        <div className="flex flex-col gap-5">
          <section aria-label="Standards clarity" className="rounded-lg border border-line bg-sheet p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-display text-[18px] font-semibold">Clarity of the standards</h2>
              <span className="font-hand text-[15px] text-amber">close the loop</span>
            </div>
            <p className="mt-1 text-[12.5px] text-ink-soft">
              How decidable each clause actually is.
            </p>
            <p className="mt-1 rounded-md bg-amber-wash px-2.5 py-1.5 text-[11.5px] font-medium leading-snug text-amber">
              {session
                ? "Measured on this workspace's standards by the review service."
                : "Illustrative — sample axes on the sample desk."}
            </p>
            <div className="mt-2 flex justify-center">
              <ClarityRadar scores={state.radar} size={216} />
            </div>
            <ul className="mt-1 space-y-1.5 text-[12.5px] text-ink-soft">
              {state.radar.map((a) => (
                <li key={a.axis} className="leading-snug">
                  <span className="font-medium text-ink">{a.axis}</span> {a.note}
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Ratifiable amendments" className="rounded-lg border border-line bg-sheet p-5">
            <h2 className="font-display text-[18px] font-semibold">Amendments for ratification</h2>
            <p className="mt-1 text-[12.5px] text-ink-soft">
              Reviewer feedback turned into draft standards text. Nothing lands in the rulebook
              without a human ratifying it.
            </p>
            <ul className="mt-4 space-y-4">
              {proposed.length === 0 ? (
                <li className="text-[13px] text-ink-soft">
                  No drafts are waiting — the standards are as the humans last left them.
                </li>
              ) : null}
              {proposed.map((a) => (
                <li key={a.id} className="rounded-md border border-line p-4">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[12px] font-semibold text-cite">§{a.clause}</span>
                    <span className="font-hand text-[15px] leading-none text-amber">draft for ratification</span>
                  </div>
                  <p className="mt-2 text-[13px] font-medium">{a.basedOn}</p>
                  <blockquote className="mt-2 border-l-2 border-amber pl-3 font-serif text-[13.5px] leading-relaxed text-ink">
                    {a.draft}
                  </blockquote>
                  {a.state === "proposed" ? (
                    <div className="mt-3">
                      <Button
                        variant="approve"
                        size="sm"
                        disabled={!canRatify}
                        onClick={() => dispatch({ type: "ratify", amendmentId: a.id })}
                        title={
                          canRatify
                            ? "Appends the draft to the clause and cuts a draft version — the same change the review service makes."
                            : "Ratifying an amendment is an approver/admin action — this seat cannot make standards law."
                        }
                      >
                        Ratify into the standards
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <Stamp label="Ratified" />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
