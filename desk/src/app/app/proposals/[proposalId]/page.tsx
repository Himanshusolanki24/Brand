"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useDemo } from "@/lib/store";
import { can } from "@/lib/permits";
import { Stamp } from "@/components/ui/pills";
import { Button } from "@/components/ui/button";

export default function ProposalDetailPage() {
  const { proposalId } = useParams<{ proposalId: string }>();
  const { state, dispatch, session, busy } = useDemo();

  const proposal = state.amendments.find((a) => a.id === proposalId);

  if (!proposal) {
    return (
      <div className="mt-16 text-center">
        <p className="font-display text-xl font-semibold">No such proposal.</p>
        <p className="mt-1 text-sm text-ink-soft">This draft was never proposed to the rulebook.</p>
        <Link href="/app/proposals" className="mt-4 inline-block text-sm font-medium text-cite hover:underline">
          Back to proposals
        </Link>
      </div>
    );
  }

  const clause = state.guidelines.find((g) => g.number === proposal.clause);
  const ratifiable = proposal.state === "proposed" && can(session?.user.role ?? state.role, "ratify_proposal");

  return (
    <div>
      <Link
        href="/app/proposals"
        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-soft hover:text-ink"
      >
        ← Learning proposals
      </Link>
      <header className="mt-1">
        <h1 className="font-display text-[24px] font-semibold tracking-tight">
          Draft for §{proposal.clause}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-soft">
          {proposal.state === "ratified" ? <Stamp label="Ratified" /> : (
            <span className="rounded-full bg-pencil-wash px-2 py-0.5 text-[11px] font-semibold text-pencil">
              proposed
            </span>
          )}
          <span>rulebook now reads {state.guidelineVersion}</span>
        </div>
      </header>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-line bg-sheet p-6">
          <h2 className="text-[11.5px] font-medium text-ink-soft">Why this draft exists</h2>
          <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed">{proposal.basedOn}</p>

          <h2 className="mt-5 pb-1 text-[11.5px] font-medium text-ink-soft">Proposed text</h2>
          <blockquote className="rounded-md border border-line bg-paper px-4 py-3 text-[14px] leading-relaxed">
            {proposal.draft}
          </blockquote>

          <h2 className="mt-5 pb-1 text-[11.5px] font-medium text-ink-soft">
            Current text of §{proposal.clause}
          </h2>
          <p className="rounded-md border border-line bg-paper px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
            {clause ? clause.text : `§${proposal.clause} is not on this rulebook — a ratification would create it.`}
          </p>
        </section>

        <aside className="space-y-3">
          <div className="rounded-lg border border-line bg-sheet p-5">
            <h2 className="font-display text-[16px] font-semibold">Ratification</h2>
            <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">
              Ratifying appends the draft to the clause, lifts that clause&apos;s clarity, and cuts a draft
              version of the rulebook — every later review cites the new version. The audit trail keeps who,
              when, and to which version.
            </p>

            {proposal.state === "ratified" ? (
              <>
                <div className="mt-3"><Stamp label="Ratified" /></div>
                <p className="mt-2 text-[12.5px] leading-snug text-ink-soft">
                  This text is in the rulebook now. Reviews submitted from here on judge against the new
                  version.
                </p>
              </>
            ) : ratifiable ? (
              <Button
                variant="approve"
                className="mt-3 w-full"
                disabled={busy}
                onClick={() => dispatch({ type: "ratify", amendmentId: proposal.id })}
              >
                {busy ? "Applying…" : "Ratify into the next draft"}
              </Button>
            ) : (
              <p className="mt-3 rounded-md bg-pencil-wash px-3 py-2 text-[12px] font-medium leading-snug text-pencil">
                {session
                  ? "Ratifying changes the rulebook every desk reviews under — that right belongs to approvers and admins."
                  : "Sign in as an approver on a live desk to ratify; on the sample desk you can read the draft."}
              </p>
            )}
          </div>

          <p className="px-1 text-[11.5px] leading-snug text-ink-soft/80">
            Nothing edits the rulebook outside this page — that is the whole point of it.
          </p>
        </aside>
      </div>
    </div>
  );
}
