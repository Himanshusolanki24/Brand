"use client";

import { useState } from "react";
import clsx from "clsx";
import { Quote, Undo2 } from "lucide-react";
import { useDemo } from "@/lib/store";
import { SeverityPill, ConfidenceTag, AdvisoryTag } from "@/components/ui/pills";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { Issue } from "@/lib/types";

const RESOLVED_LABEL: Record<string, { cls: string; text: string }> = {
  accepted: { cls: "text-greenink", text: "Accepted — the line can stand" },
  edited: { cls: "text-pencil", text: "Edited — a human rewrote it" },
  dismissed: { cls: "text-ink-soft", text: "Dismissed — reason on record" },
};

export function IssueCard({
  issue,
  reviewId,
  focusId,
}: {
  issue: Issue;
  reviewId: string;
  focusId: string | null;
}) {
  const { dispatch } = useDemo();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [dismissing, setDismissing] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(false);
  const [clauseOpen, setClauseOpen] = useState(false);

  const resolved = issue.status !== "open";

  const beginEdit = () => {
    setDraft(issue.replacement ?? issue.suggested ?? "");
    setEditing(true);
  };

  const saveEdit = () => {
    const replacement = draft.trim();
    if (!replacement) return;
    dispatch({
      type: "resolve",
      reviewId,
      issueId: issue.id,
      status: "edited",
      replacement,
    });
    setEditing(false);
  };

  const confirmDismiss = () => {
    const cleaned = reason.trim();
    if (cleaned.length < 3) {
      setReasonError(true);
      return;
    }
    dispatch({
      type: "dismiss",
      reviewId,
      issueId: issue.id,
      reason: cleaned,
    });
    setDismissing(false);
    setReason("");
    setReasonError(false);
  };

  const borderLeft: Record<Issue["status"], string> | Record<Issue["severity"], string> = {
    accepted: "border-l-greenink",
    edited: "border-l-greenink",
    dismissed: "border-l-line-strong",
    open:
      issue.severity === "high"
        ? "border-l-redpen"
        : issue.severity === "medium"
          ? "border-l-pencil"
          : "border-l-cite",
  };

  return (
    <li
      id={`card-${issue.id}`}
      className={clsx(
        "rounded-lg border border-line border-l-4 bg-sheet p-4",
        borderLeft[issue.status],
        focusId === issue.id && "ring-2 ring-cite",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <SeverityPill severity={issue.severity} />
        <ConfidenceTag confidence={issue.confidence} />
        {issue.citation === null && !resolved ? <AdvisoryTag /> : null}
      </div>

      <h3 className="mt-2.5 text-[14.5px] font-semibold">{issue.headline}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{issue.detail}</p>

      {issue.citation ? (
        <button
          type="button"
          onClick={() => setClauseOpen(true)}
          className="mt-3 w-full rounded-md border border-cite/25 bg-cite-wash px-3 py-2 text-left transition-colors hover:border-cite/60"
        >
          <span className="block text-[12.5px] font-semibold text-cite">
            Guidelines §{issue.citation.clause} — {issue.citation.sectionLabel}
          </span>
          <span className="mt-0.5 block text-[12px] text-cite/80">
            <span className="underline underline-offset-2">Read the clause</span>
            <span className="pl-1 text-cite/60">{issue.citation.version}</span>
          </span>
        </button>
      ) : resolved ? null : (
        <div className="mt-3 rounded-md border border-pencil/25 bg-pencil-wash px-3 py-2">
          <div className="font-hand text-[16px] leading-none text-pencil">advisory, uncited</div>
          <p className="mt-1 text-[12px] text-pencil/90">
            Nothing in the knowledge base anchors this. Your judgement decides — and it goes on the record.
          </p>
        </div>
      )}

      {/* The fix, before and after */}
      <div className="mt-3 rounded-md border border-line bg-paper px-3 py-2.5">
        {!resolved ? (
          <p className="pb-1 text-[11.5px] font-medium text-ink-soft">
            Suggested rewrite, intent kept
          </p>
        ) : null}
        <p className="flex flex-wrap gap-x-2 text-[13.5px] leading-relaxed">
          <span className="min-w-0 text-redpen/70 line-through">{issue.quote}</span>
          {issue.status !== "dismissed" ? (
            <span className="min-w-0 font-medium text-greenink">
              {issue.replacement ?? issue.suggested}
            </span>
          ) : null}
        </p>
        <p className="pt-1.5 text-[12.5px] text-ink-soft">{issue.rationale}</p>
        {issue.suggested === "" && !resolved ? (
          <p className="pt-1 font-hand text-[14px] leading-tight text-pencil">
            no canned rewrite for this one — open Edit and write the honest sentence yourself
          </p>
        ) : null}
      </div>

      {issue.status === "dismissed" && issue.reason ? (
        <p className="mt-2 rounded-md bg-ink/5 px-3 py-2 text-[12.5px] text-ink-soft">
          <span className="font-medium text-ink">On record:</span> {issue.reason}
        </p>
      ) : null}

      {/* Verdicts */}
      <div className="mt-3.5">
        {resolved ? (
          <div className="flex items-center gap-2">
            <span className={clsx("text-[12.5px] font-medium", RESOLVED_LABEL[issue.status].cls)}>
              {RESOLVED_LABEL[issue.status].text}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => dispatch({ type: "reopen", reviewId, issueId: issue.id })}
            >
              <Undo2 size={13} aria-hidden /> Undo
            </Button>
          </div>
        ) : editing ? (
          <div className="w-full">
            <label htmlFor={`edit-${issue.id}`} className="block pb-1 text-[11.5px] font-medium text-ink-soft">
              Write the replacement text (your words, your intent)
            </label>
            <textarea
              id={`edit-${issue.id}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-md border border-line-strong bg-sheet px-2.5 py-1.5 text-[13.5px]"
              placeholder="The honest version of this sentence…"
            />
            <div className="flex gap-2 pt-2">
              <Button variant="approve" size="sm" disabled={draft.trim().length === 0} onClick={saveEdit}>
                Save your edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : dismissing ? (
          <div className="w-full">
            <label htmlFor={`reason-${issue.id}`} className="block pb-1 text-[11.5px] font-medium text-ink-soft">
              Why should this flag not stand? The reason is written to the record.
            </label>
            <textarea
              id={`reason-${issue.id}`}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setReasonError(false);
              }}
              rows={2}
              className={clsx(
                "w-full resize-none rounded-md bg-sheet px-2.5 py-1.5 text-[13.5px] border",
                reasonError ? "border-redpen" : "border-line-strong",
              )}
              placeholder="For example: we hold a signed third-party ranking…"
            />
            {reasonError ? (
              <p className="pt-1 text-[12px] font-medium text-redpen">
                A reason is required to dismiss. That is the rule — dismissals that record nothing teach nothing.
              </p>
            ) : null}
            <div className="flex gap-2 pt-2">
              <Button variant="danger" size="sm" onClick={confirmDismiss}>
                Dismiss with reason
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDismissing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Button
                variant="approve"
                size="sm"
                onClick={() =>
                  dispatch({ type: "resolve", reviewId, issueId: issue.id, status: "accepted" })
                }
              >
                Accept
              </Button>
              <Button size="sm" onClick={beginEdit}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDismissing(true)}>
                Dismiss
              </Button>
            </div>
            {issue.suggested === "" ? (
              <p className="pt-1 font-hand text-[14px] leading-tight text-pencil">
                no canned rewrite here — open Edit and write the honest sentence yourself
              </p>
            ) : null}
          </>
        )}
      </div>

      <Modal
        open={clauseOpen}
        onClose={() => setClauseOpen(false)}
        title={`Guidelines §${issue.citation?.clause ?? ""} — ${issue.citation?.sectionLabel ?? ""}`}
      >
        {issue.citation ? (
          <div>
            <p className="inline-flex rounded-full bg-cite-wash px-2 py-0.5 text-[12px] font-semibold text-cite">
              rulebook {issue.citation.version}
            </p>
            <p className="mt-3 text-[14px] leading-relaxed">{issue.citation.text}</p>
            <p className="mt-3 flex items-start justify-start gap-2 text-[12.5px] text-ink-soft">
              <Quote size={14} aria-hidden className="mt-0.5 shrink-0 text-cite" />
              An Accept here means this clause, at this version, covered the call. Both names land on the approval manifest.
            </p>
          </div>
        ) : null}
      </Modal>
    </li>
  );
}
