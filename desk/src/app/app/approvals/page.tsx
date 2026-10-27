"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtDate, useDemo } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Stamp, StatusPill } from "@/components/ui/pills";
import { Modal } from "@/components/ui/modal";
import { Wordmark } from "@/components/sketch";

const APPROVER = "Maya Okafor";

export default function ApprovalsPage() {
  const { state, dispatch } = useDemo();
  const [signingName, setSigningName] = useState("");
  const [signOpen, setSignOpen] = useState<string | null>(null);
  const [returnOpen, setReturnOpen] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const entries = state.approvals
    .map((a) => ({ entry: a, review: state.reviews.find((r) => r.id === a.reviewId) }))
    .filter((x) => x.review);
  const waiting = entries.filter((x) => x.entry.state === "waiting");

  return (
    <div>
      <header>
        <h1 className="font-display text-[24px] font-semibold tracking-tight">Approval manifest</h1>
        <p className="text-sm text-ink-soft">
          The proof trail. Each signature names who, what, and which rulebook version — this is the page you
          would hand an auditor.
        </p>
      </header>

      <div className="mt-7 rounded-lg border border-line bg-sheet">
        {entries.length === 0 ? (
          <p className="p-6 text-sm text-ink-soft">
            Nothing to sign yet. Finish a review and send it for approval — the piece lands here for the
            human decision.
          </p>
        ) : null}
        <ul className="divide-y divide-line">
          {entries.map(({ entry, review }) => (
            <li key={entry.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[14.5px] font-medium">
                  <Link href={`/app/reviews/${entry.reviewId}`} className="underline-offset-4 hover:underline">
                    {review?.title}
                  </Link>
                  <StatusPill status={review?.status ?? "in_review"} />
                </p>
                <p className="text-[12px] text-ink-soft">
                  signed off by {entry.approver}
                  {entry.state === "signed" && entry.signedAt ? ` · ${fmtDate(entry.signedAt)}` : ""}
                </p>
                {entry.state === "returned" && entry.note ? (
                  <p className="mt-1 text-[12.5px] text-redpen">{entry.note}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-2.5">
                {entry.state === "signed" ? <Stamp label="Signed" /> : null}
                {entry.state === "waiting" ? (
                  <>
                    <Button size="sm" variant="approve" onClick={() => setSignOpen(entry.id)}>
                      Sign off
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setNote("");
                      setReturnOpen(entry.id);
                    }}>
                      Send back with note
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {waiting.length === 0 && entries.length > 0 ? (
        <p className="mt-5 rounded-lg border border-greenink/25 bg-greenink-wash px-5 py-3.5 text-[13.5px] text-greenink">
          Inbox empty. Nothing advances without this page — no auto-approval exists at any confidence score.
        </p>
      ) : null}

      {/* Sign modal */}
      <Modal
        open={signOpen !== null}
        onClose={() => {
          setSignOpen(null);
          setSigningName("");
        }}
        title="Sign the manifest"
      >
        <p className="text-[13.5px] text-ink-soft">
          Typing the full name is the signature. It lands on the manifest with today&apos;s date and the
          rulebook version — {state.guidelineVersion}.
        </p>
        <label htmlFor="signName" className="block pt-3 pb-1.5 text-[12.5px] font-medium text-ink-soft">
          Approver name (type: {APPROVER})
        </label>
        <input
          id="signName"
          value={signingName}
          onChange={(e) => setSigningName(e.target.value)}
          placeholder={APPROVER}
          className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 text-sm"
        />
        <div className="flex items-center justify-between gap-3 pt-4">
          <Wordmark className="text-[13px] text-ink-soft/70" />
          <Button
            variant="approve"
            disabled={signingName.trim() !== APPROVER || signOpen === null}
            onClick={() => {
              if (signOpen) dispatch({ type: "sign", entryId: signOpen, by: APPROVER });
              setSignOpen(null);
              setSigningName("");
            }}
          >
            Sign
          </Button>
        </div>
      </Modal>

      {/* Return-note modal */}
      <Modal
        open={returnOpen !== null}
        onClose={() => setReturnOpen(null)}
        title="Send back with a note"
      >
        <p className="text-[13.5px] text-ink-soft">
          Returning is a judgement, not a veto — say what would change your mind.
        </p>
        <label htmlFor="returnNote" className="block pt-3 pb-1.5 text-[12.5px] font-medium text-ink-soft">
          Note to the team
        </label>
        <textarea
          id="returnNote"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-md border border-line-strong bg-paper px-3 py-2 text-sm"
          placeholder="Example: comparison claim needs the signed ranking attached first."
        />
        <div className="flex justify-end pt-4">
          <Button
            disabled={note.trim().length < 4 || returnOpen === null}
            onClick={() => {
              if (returnOpen) {
                dispatch({ type: "return", entryId: returnOpen, note: note.trim(), by: APPROVER });
              }
              setReturnOpen(null);
              setNote("");
            }}
          >
            Return for fixes
          </Button>
        </div>
      </Modal>
    </div>
  );
}
