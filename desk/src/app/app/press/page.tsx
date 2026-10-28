"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtDate, useDemo } from "@/lib/store";
import { api } from "@/lib/api";
import { can } from "@/lib/permits";
import { Button } from "@/components/ui/button";
import { Stamp, StatusPill } from "@/components/ui/pills";
import { Modal } from "@/components/ui/modal";
import { Wordmark } from "@/components/wordmark";
import { FileDown } from "lucide-react";

export default function PressPage() {
  const { state, dispatch, session } = useDemo();
  const [signingName, setSigningName] = useState("");
  const [signOpen, setSignOpen] = useState<string | null>(null);
  const [returnOpen, setReturnOpen] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Seat for permission checks: signed-in role, else the demo seat picked in
  // the sidebar (server-side RBAC stays authoritative in product mode).
  const seat = session?.user.role ?? state.role;
  const canSign = can(seat, "sign_approval");
  const canExport = can(seat, "export_manifest");

  const exportManifest = async (approvalId: string) => {
    if (!session) return;
    setExporting(approvalId);
    setExportError(null);
    try {
      await api.manifestPdf(session.token, approvalId);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(null);
    }
  };

  const entries = state.approvals
    .map((a) => ({ entry: a, review: state.reviews.find((r) => r.id === a.reviewId) }))
    .filter((x) => x.review);
  const waiting = entries.filter((x) => x.entry.state === "waiting");

  return (
    <div>
      <header>
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight">The Press</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Where pages get signed or sent back. Each signature names who, what, and which rulebook
          version — this is the page you would hand an auditor.
        </p>
      </header>

      <div className="mt-7 rounded-lg border border-line bg-sheet">
        {entries.length === 0 ? (
          <p className="p-6 text-sm text-ink-soft">
            Nothing at the press yet. Finish a manuscript and send it over — the page lands here for
            the human decision.
          </p>
        ) : null}
        <ul className="divide-y divide-line">
          {entries.map(({ entry, review }) => (
            <li key={entry.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[14.5px] font-medium">
                  <Link href={`/app/manuscripts/${entry.reviewId}`} className="underline-offset-4 hover:underline">
                    {review?.title}
                  </Link>
                  <StatusPill status={review?.status ?? "in_review"} />
                </p>
                <p className="text-[12px] text-ink-soft">
                  signed off by {entry.approver}
                  {entry.state === "signed" && entry.signedAt ? ` · ${fmtDate(entry.signedAt)}` : ""}
                </p>
                {entry.state === "returned" && entry.note ? (
                  <p className="mt-1 text-[12.5px] text-flag">{entry.note}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-2.5">
                {entry.state === "signed" ? <Stamp label="Signed" /> : null}
                {entry.state === "signed" && session ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!canExport || exporting === entry.id}
                    onClick={() => void exportManifest(entry.id)}
                    title={
                      canExport
                        ? "Download the approval record PDF"
                        : "Exporting the approval record is a reviewer-and-up action — creators don't have it."
                    }
                  >
                    <FileDown size={14} aria-hidden /> Approval record
                  </Button>
                ) : null}
                {entry.state === "waiting" ? (
                  <>
                    <Button
                      size="sm"
                      variant="approve"
                      disabled={!canSign}
                      onClick={() => {
                        setSigningName("");
                        setSignOpen(entry.id);
                      }}
                      title={
                        canSign
                          ? undefined
                          : "Signing an approval is an approver/admin action — this lane is not yours to decide."
                      }
                    >
                      Sign off
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!canSign}
                      onClick={() => {
                        setNote("");
                        setReturnOpen(entry.id);
                      }}
                      title={
                        canSign
                          ? undefined
                          : "Sending an approval back is an approver/admin action — this lane is not yours to decide."
                      }
                    >
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
        <p className="mt-5 rounded-lg border border-keep/25 bg-keep-wash px-5 py-3.5 text-[13.5px] text-keep">
          Press is clear. Nothing advances without this page — no auto-approval exists at any
          confidence score.
        </p>
      ) : null}

      {exportError ? (
        <p className="mt-3 rounded-lg border border-flag/30 bg-flag-wash px-5 py-3 text-[13px] text-flag">
          {exportError}
        </p>
      ) : null}

      {/* Sign modal — typing the assigned approver's name is the signature */}
      <Modal
        open={signOpen !== null}
        onClose={() => {
          setSignOpen(null);
          setSigningName("");
        }}
        title="Sign the approval record"
      >
        <p className="text-[13.5px] text-ink-soft">
          Typing the full name is the signature. It lands on the approval record with today&apos;s date and the
          rulebook version — {state.guidelineVersion}.
        </p>
        {(() => {
          const lane = signOpen ? entries.find((x) => x.entry.id === signOpen)?.entry : null;
          const assigned = lane?.approver ?? "";
          const matches = assigned.length > 0 && signingName.trim() === assigned;
          return (
            <>
              <label htmlFor="signName" className="block pt-3 pb-1.5 text-[12.5px] font-medium text-ink-soft">
                Approver name — this lane is assigned to {assigned || "an approver"}
              </label>
              <input
                id="signName"
                value={signingName}
                onChange={(e) => setSigningName(e.target.value)}
                placeholder={assigned}
                className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 text-sm"
              />
              {!matches && signingName.trim().length > 0 ? (
                <p className="pt-1.5 text-[12px] text-ink-soft">
                  Only the assigned approver can sign this lane — the review service rejects anyone else.
                </p>
              ) : null}
              <div className="flex items-center justify-between gap-3 pt-4">
                <Wordmark className="text-[13px] text-ink-soft/70" />
                <Button
                  variant="approve"
                  disabled={!matches || signOpen === null}
                  onClick={() => {
                    if (signOpen) dispatch({ type: "sign", entryId: signOpen, by: assigned });
                    setSignOpen(null);
                    setSigningName("");
                  }}
                >
                  Sign
                </Button>
              </div>
            </>
          );
        })()}
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
                dispatch({
                  type: "return",
                  entryId: returnOpen,
                  note: note.trim(),
                  by: entries.find((x) => x.entry.id === returnOpen)?.entry.approver ?? "",
                });
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
