"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, BadgeCheck, Quote, Undo2 } from "lucide-react";
import { bySeverity, fmtDate, unresolved, useDemo } from "@/lib/store";
import { api } from "@/lib/api";
import { can } from "@/lib/permits";
import { analyzeDraft } from "@/lib/analyze";
import { StatusPill, Stamp, SeverityPill, ConfidenceTag, AdvisoryTag, VerificationPill } from "@/components/ui/pills";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { Issue } from "@/lib/types";

/* Renders a section body with highlighted quotes; overlapping quotes skip
   inward ones so the marks never nest. */
function ProseSection({
  heading,
  body,
  issues,
  focus,
}: {
  heading: string;
  body: string;
  issues: Issue[];
  focus: (id: string) => void;
}) {
  const ranges = useMemo(() => {
    type Range = { start: number; end: number; issue: Issue };
    const found: Range[] = [];
    for (const issue of issues) {
      const idx = body.indexOf(issue.quote);
      if (idx >= 0) found.push({ start: idx, end: idx + issue.quote.length, issue });
    }
    found.sort((a, b) => a.start - b.start);
    return found;
  }, [body, issues]);

  const out: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  for (const r of ranges) {
    if (r.start < cursor) continue;
    if (r.start > cursor) out.push(<span key={key++}>{body.slice(cursor, r.start)}</span>);
    out.push(
      <mark
        key={`${r.issue.id}-${key++}`}
        className="proof"
        data-sev={r.issue.severity}
        data-status={r.issue.status}
        title={`${r.issue.severity} flag — click to open the marginalia note`}
        onClick={() => focus(r.issue.id)}
      >
        {r.issue.quote}
      </mark>,
    );
    cursor = r.end;
  }
  if (cursor < body.length) out.push(<span key={key++}>{body.slice(cursor)}</span>);

  return (
    <section>
      <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">
        {heading}
      </h3>
      {/* The reviewed copy reads in the book's serif — the register distinction. */}
      <p className="mt-2 font-serif text-[16.5px] leading-[1.95]">{out}</p>
    </section>
  );
}

const STEPS = [
  "Extracting text from the piece",
  "Anchoring each sentence to the knowledge base",
  "Checking claims against house rules",
  "Drafting intent-preserving rewrites",
];

function AnalyzingPanel() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setStep((s) => {
        if (s >= STEPS.length - 1) {
          clearInterval(iv);
          return s;
        }
        return s + 1;
      });
    }, 750);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="mt-6 rounded-lg border border-line bg-sheet px-5 py-4">
      <p className="font-medium">Reading this piece…</p>
      <ol className="mt-2 space-y-1">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={clsx(
              "text-[13px]",
              i < step ? "text-ink-soft" : i === step ? "text-ink" : "opacity-40",
            )}
          >
            {i < step ? "✓ " : ""}
            {s}
          </li>
        ))}
      </ol>
      <p className="pt-2 font-hand text-[15px] text-amber">
        demo note: the trained model runs this pass in the real product; the demo walks the same four steps
      </p>
    </div>
  );
}

const RESOLVED_LABEL: Record<string, { cls: string; text: string }> = {
  accepted: { cls: "text-keep", text: "Kept as-is — the line can stand" },
  edited: { cls: "text-keep", text: "Rewritten — a human fixed the line" },
  dismissed: { cls: "text-ink-soft", text: "Dismissed — reason on record" },
};

/**
 * Marginalia — a finding as a note in the book's margin. All of the verdict
 * logic from the proofing desk, restated: three decisions only, evidence
 * joined from the fact sheet, the cited clause readable on demand.
 */
function MarginaliaNote({
  issue,
  reviewId,
  focusId,
  index,
}: {
  issue: Issue;
  reviewId: string;
  focusId: string | null;
  index: number;
}) {
  const { dispatch, state, session } = useDemo();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [dismissing, setDismissing] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(false);
  const [clauseOpen, setClauseOpen] = useState(false);

  const resolved = issue.status !== "open";
  // The evidence the knowledge-base pass attached to this finding, joined
  // against the proof desk's fact rows. Empty = none was attached.
  const evidence = state.facts.filter((f) => issue.evidenceIds.includes(f.id));
  // Dismissing is a reviewer-and-up action; the seat is the signed-in role,
  // or the picked demo seat. A creator sees it gated, not gone.
  const canDismiss = can(session?.user.role ?? state.role, "dismiss_issue");

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
    accepted: "border-l-keep",
    edited: "border-l-keep",
    dismissed: "border-l-line-strong",
    open:
      issue.severity === "high"
        ? "border-l-flag"
        : issue.severity === "medium"
          ? "border-l-amber"
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
        <span
          aria-hidden
          className="font-display text-[13px] font-semibold tabular-nums text-ink-soft/70"
          title="Marginalia number, in severity order"
        >
          №{index + 1}
        </span>
        <SeverityPill severity={issue.severity} />
        <ConfidenceTag confidence={issue.confidence} />
        {issue.verification ? <VerificationPill verification={issue.verification} /> : null}
        {issue.citation === null && !resolved ? <AdvisoryTag /> : null}
      </div>

      <h3 className="mt-2.5 font-display text-[15px] font-semibold">{issue.headline}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{issue.detail}</p>

      {issue.citation ? (
        <button
          type="button"
          onClick={() => setClauseOpen(true)}
          className="mt-3 w-full rounded-md border border-cite/25 bg-cite-wash px-3 py-2 text-left transition-colors hover:border-cite/60"
        >
          <span className="block text-[12.5px] font-semibold text-cite">
            Standards §{issue.citation.clause} — {issue.citation.sectionLabel}
          </span>
          <span className="mt-0.5 block text-[12px] text-cite/80">
            <span className="underline underline-offset-2">Read the clause</span>
            <span className="pl-1 text-cite/60">{issue.citation.version}</span>
          </span>
        </button>
      ) : resolved ? null : (
        <div className="mt-3 rounded-md border border-amber/25 bg-amber-wash px-3 py-2">
          <div className="font-hand text-[16px] leading-none text-amber">advisory, uncited</div>
          <p className="mt-1 text-[12px] text-amber/90">
            Nothing in the knowledge base anchors this. Your judgement decides — and it goes on the record.
          </p>
        </div>
      )}

      {/* Evidence drawer — what the knowledge-base pass actually found */}
      {evidence.length > 0 ? (
        <div className="mt-3 rounded-md border border-line bg-paper px-3 py-2.5">
          <p className="pb-1.5 text-[11.5px] font-medium text-ink-soft">
            Evidence from the fact sheet
          </p>
          <ul className="space-y-1.5">
            {evidence.map((f) => (
              <li key={f.id} className="text-[13px] leading-snug">
                <span className="font-mono text-[11.5px] font-medium text-cite">[{f.id}]</span>{" "}
                <span className="text-ink">{f.claim}</span>
                <span className="block pl-1 text-[12px] text-ink-soft">
                  {f.source} · verified {f.verified}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* The fix, before and after */}
      <div className="mt-3 rounded-md border border-line bg-paper px-3 py-2.5">
        {!resolved ? (
          <p className="pb-1 text-[11.5px] font-medium text-ink-soft">
            Suggested rewrite, intent kept
          </p>
        ) : null}
        <p className="flex flex-wrap gap-x-2 font-serif text-[14px] leading-relaxed">
          <span className="min-w-0 text-flag/70 line-through">{issue.quote}</span>
          {issue.status !== "dismissed" ? (
            <span className="min-w-0 font-medium text-keep">
              {issue.replacement ?? issue.suggested}
            </span>
          ) : null}
        </p>
        <p className="pt-1.5 text-[12.5px] text-ink-soft">{issue.rationale}</p>
        {issue.suggested === "" && !resolved ? (
          <p className="pt-1 font-hand text-[14px] leading-tight text-amber">
            no canned rewrite for this one — open Rewrite and write the honest sentence yourself
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
              className="w-full resize-none rounded-md border border-line-strong bg-paper px-2.5 py-1.5 font-serif text-[13.5px]"
              placeholder="The honest version of this sentence…"
            />
            <div className="flex gap-2 pt-2">
              <Button variant="approve" size="sm" disabled={draft.trim().length === 0} onClick={saveEdit}>
                Save rewrite
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
                "w-full resize-none rounded-md bg-paper px-2.5 py-1.5 text-[13.5px] border",
                reasonError ? "border-flag" : "border-line-strong",
              )}
              placeholder="For example: we hold a signed third-party ranking…"
            />
            {reasonError ? (
              <p className="pt-1 text-[12px] font-medium text-flag">
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
                Keep line as-is
              </Button>
              <Button size="sm" onClick={beginEdit}>
                Rewrite this line
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDismissing(true)}
                disabled={!canDismiss}
                title={
                  canDismiss
                    ? undefined
                    : "Dismiss with reason is a reviewer-and-up action — creators resolve every flag instead."
                }
              >
                Dismiss
              </Button>
            </div>
            {issue.suggested === "" ? (
              <p className="pt-1 font-hand text-[14px] leading-tight text-amber">
                no canned rewrite here — open Rewrite and write the honest sentence yourself
              </p>
            ) : null}
          </>
        )}
      </div>

      <Modal
        open={clauseOpen}
        onClose={() => setClauseOpen(false)}
        title={`Standards §${issue.citation?.clause ?? ""} — ${issue.citation?.sectionLabel ?? ""}`}
      >
        {issue.citation ? (
          <div>
            <p className="inline-flex rounded-full bg-cite-wash px-2 py-0.5 font-mono text-[11.5px] font-semibold text-cite">
              rulebook {issue.citation.version}
            </p>
            <p className="mt-3 font-serif text-[14.5px] leading-relaxed">{issue.citation.text}</p>
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

export default function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch, engineError, dismissError, session } = useDemo();
  const [focusId, setFocusId] = useState<string | null>(null);
  // Dry-run (quarantined recheck) state — product lane only.
  const [previewPhase, setPreviewPhase] = useState<"idle" | "running" | "done" | "error">("idle");
  const [previewIssues, setPreviewIssues] = useState<Issue[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const review = state.reviews.find((r) => r.id === id);

  useEffect(() => {
    // The store schedules the settle on submit; this page backs up any
    // analyzing review it is shown — e.g. one orphaned by a mid-run lane
    // flip. StrictMode-safe by design: the first mount's cleanup cancels
    // its timer and the second run schedules it again; the settle itself is
    // idempotent in state. Demo lane only — product reviews arrive
    // complete from the engine and are never self-analyzed here.
    if (!review || review.status !== "analyzing" || session) return;
    const issues = analyzeDraft(review.sections.map((s) => s.body).join("\n\n"));
    const t = setTimeout(() => {
      dispatch({ type: "analysisDone", reviewId: review.id, issues });
    }, 3400);
    return () => clearTimeout(t);
  }, [review, dispatch, session]);

  // Shareable spot anchors: #f=<id> (from a mark) or #e=<id> (from evidence)
  // highlight that finding's marginalia note.
  useEffect(() => {
    const apply = () => {
      const m = window.location.hash.match(/^#(?:f|e)=(.+)$/);
      if (m) setFocusId(m[1]);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const focus = (issueId: string) => {
    setFocusId(issueId);
    window.history.replaceState(null, "", `#f=${issueId}`);
    document
      .getElementById(`card-${issueId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const runPreview = async () => {
    if (!session || !review) return;
    setPreviewPhase("running");
    setPreviewError(null);
    try {
      const res = await api.checksPreview(session.token, review.sections.map((s) => s.body).join("\n\n"));
      setPreviewIssues(res.issues);
      setPreviewPhase("done");
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "The dry run failed.");
      setPreviewPhase("error");
    }
  };

  if (!review) {
    return (
      <div className="mt-16 text-center">
        <p className="font-display text-xl font-semibold">Not in this edition.</p>
        <p className="mt-1 text-sm text-ink-soft">This manuscript was never submitted to the workspace.</p>
        <Link href="/app/manuscripts" className="mt-4 inline-block text-sm font-medium text-cite hover:underline">
          Back to the manuscripts
        </Link>
      </div>
    );
  }

  // Seat for the permission checks, mirroring the review service's RBAC.
  const seat = session?.user.role ?? state.role;
  const open = unresolved(review);
  const tray = bySeverity(review.issues);
  // The hand-off rule, mirrored from the review service: unresolved
  // high-severity findings block approval (the same rule behind its 409
  // route.escalate); everything else may ride along.
  const openHigh = open.filter((i) => i.severity === "high").length;
  const canSend = can(seat, "send_for_approval");
  const sendBlocked = openHigh > 0;
  const sendableStatus =
    review.status === "in_review" || review.status === "changes_requested";

  // Dry-run matching: a preview finding pairs with a stored one by the clause
  // it cites and the exact quote — never by preview ids, which mean nothing.
  const keyOf = (i: Issue) => `${i.citation?.clause ?? "advisory"}::${i.quote}`;
  const previewKeys = new Set(previewIssues.map(keyOf));
  const extraRows = previewIssues.filter(
    (p) => !review.issues.some((i) => keyOf(i) === keyOf(p)),
  );

  return (
    <div>
      {engineError ? (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-flag/30 bg-flag-wash px-5 py-3.5">
          <p className="text-[13px] leading-snug text-flag">{engineError}</p>
          <button
            onClick={dismissError}
            className="text-[12px] font-medium text-flag/80 hover:text-flag"
          >
            dismiss
          </button>
        </div>
      ) : null}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/app/manuscripts"
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-soft hover:text-ink"
          >
            <ArrowLeft size={13} aria-hidden /> All manuscripts
          </Link>
          <h1 className="mt-1 font-display text-[26px] font-semibold leading-tight tracking-tight">
            {review.title}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-soft">
            <span className="rounded-full border border-line bg-sheet px-2 py-0.5">{review.channel}</span>
            <span>
              by {review.author} · submitted {fmtDate(review.submittedAt)}
            </span>
            <StatusPill status={review.status} />
            {state.guidelineVersion !== review.policyVersion ? (
              <span
                className="rounded-full border border-line bg-sheet px-2 py-0.5 font-mono text-[11px] tabular-nums"
                title={`This review was checked under ${review.policyVersion}; the desk currently shows ${state.guidelineVersion}. The marginalia cite their own pinned versions.`}
              >
                pinned to {review.policyVersion}
              </span>
            ) : null}
          </div>
        </div>
        {review.status === "approved" ? <Stamp label="Approved" /> : null}
      </header>

      {review.status === "changes_requested" && review.approverNote ? (
        <aside className="mt-6 rounded-lg border border-flag/30 bg-flag-wash px-5 py-4">
          <p className="font-display text-[15px] font-semibold text-flag">
            {review.returnedBy} sent this page back
          </p>
          <p className="mt-1 font-serif text-[14px] leading-relaxed text-ink">{review.approverNote}</p>
        </aside>
      ) : null}

      {review.status === "ready_for_approval" ? (
        <aside className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-cite/30 bg-cite-wash px-5 py-4">
          <BadgeCheck size={17} className="text-cite" aria-hidden />
          <p className="text-[13.5px]">
            Every flag is decided. This page is waiting on{" "}
            <span className="font-medium">
              {state.approvals.find((a) => a.reviewId === review.id)?.approver ?? "the assigned approver"}
              &apos;s
            </span>{" "}
            signature — see{" "}
            <Link href="/app/press" className="font-medium text-cite hover:underline">
              The Press
            </Link>
            .
          </p>
        </aside>
      ) : null}

      {review.status === "analyzing" ? <AnalyzingPanel /> : null}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_392px]">
        {/* The galley — the page under proof */}
        <article className="rounded-lg border border-line bg-sheet px-7 py-8 md:px-9">
          <div className="space-y-7">
            {review.sections.map((s) => (
              <ProseSection
                key={s.id}
                heading={s.heading}
                body={s.body}
                issues={review.issues.filter((i) => i.sectionId === s.id)}
                focus={focus}
              />
            ))}
          </div>
          <p className="mt-8 border-t border-line pt-3 text-[11.5px] text-ink-soft/80">
            Flagged copy is marked in the margin colors — click a mark to open its note.
          </p>
        </article>

        {/* The marginalia — findings as notes in the margin */}
        <aside className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-[17px] font-semibold">Marginalia</h2>
            <p className="text-[12.5px] text-ink-soft">
              {review.issues.length - open.length} of {review.issues.length} decided
            </p>
          </div>

          {sendableStatus ? (
            <div>
              <Button
                variant="approve"
                className="w-full"
                disabled={sendBlocked || !canSend}
                onClick={() => dispatch({ type: "ready", reviewId: review.id })}
                title={
                  !canSend
                    ? "Sending a manuscript to the press is a creator/reviewer action — this seat decides on the press instead."
                    : sendBlocked
                      ? `${openHigh} unresolved high-severity ${openHigh === 1 ? "finding blocks" : "findings block"} approval`
                      : undefined
                }
              >
                Send to the press
              </Button>
              <p className="pt-1.5 text-[11.5px] leading-snug text-ink-soft/80">
                {!canSend
                  ? "This seat signs approvals rather than sending them — the review service would refuse the hand-off."
                  : sendBlocked
                    ? `${openHigh} unresolved high-severity ${openHigh === 1 ? "finding blocks" : "findings block"} approval — the same rule the review service enforces.`
                    : session
                      ? "The review service assigns the approver when this lands."
                      : "The sample approver takes it from here on this demo desk."}
              </p>
            </div>
          ) : null}

          {/* Quarantined recheck — product lane only, nothing persisted */}
          {session && review.status !== "analyzing" ? (
            <section className="rounded-lg border border-line bg-sheet p-4">
              <h3 className="font-display text-[15px] font-semibold">Recheck against the newest standards</h3>
              <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">
                Runs the same copy through the deterministic checks under{" "}
                <span className="font-medium">{state.guidelineVersion}</span> — before you commit to
                anything. The manuscript stays pinned to <span className="font-medium">{review.policyVersion}</span>;
                nothing here is recorded.
              </p>
              <Button
                size="sm"
                className="mt-3"
                disabled={previewPhase === "running"}
                onClick={() => void runPreview()}
              >
                {previewPhase === "running" ? "Running the dry run…" : "Run dry run"}
              </Button>
              {previewPhase === "error" ? (
                <p className="mt-2 text-[12.5px] font-medium text-flag">{previewError}</p>
              ) : null}
              {previewPhase === "done" ? (
                <div className="mt-3 border-t border-line pt-3">
                  {review.issues.length > 0 ? (
                    <ul className="space-y-1.5">
                      {review.issues.map((i) => {
                        const stillFlagged = previewKeys.has(keyOf(i));
                        return (
                          <li key={i.id} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                            <span className="min-w-0 flex-1 truncate text-ink" title={i.quote}>
                              {i.quote}
                            </span>
                            <span className={clsx("shrink-0 font-medium", stillFlagged ? "text-cite" : "text-ink-soft")}>
                              {stillFlagged ? "still flagged in the newest pass" : "clear in the newest pass"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-[12.5px] text-ink-soft">
                      This manuscript has no findings on record; see below for what the newest pass scores.
                    </p>
                  )}
                  {extraRows.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-[11.5px] font-medium text-ink-soft">
                        Flagged in the newest pass, absent from this manuscript&apos;s record:
                      </p>
                      <ul className="mt-1.5 space-y-1.5">
                        {extraRows.map((p) => (
                          <li key={p.id} className="text-[12.5px] leading-snug">
                            <span className="font-medium text-flag">{p.headline}:</span>{" "}
                            <span className="text-ink">{p.quote}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          {tray.length === 0 && review.status === "analyzing" ? (
            <p className="rounded-lg border border-line bg-sheet p-4 text-[13px] text-ink-soft">
              The margin fills in as the reading finishes.
            </p>
          ) : null}

          {tray.length === 0 && review.status !== "analyzing" ? (
            <p className="rounded-lg border border-line bg-sheet p-4 text-[13px] text-ink-soft">
              Nothing was flagged. A human still signs off — that part never goes away.
            </p>
          ) : null}

          {tray.length > 0 ? (
            <ul className="space-y-3">
              {tray.map((i, idx) => (
                <MarginaliaNote key={i.id} issue={i} reviewId={review.id} focusId={focusId} index={idx} />
              ))}
            </ul>
          ) : null}

          <p className="pt-1 text-[11.5px] leading-snug text-ink-soft/80">
            Three verdicts only — keep the line as-is, rewrite it yourself, or send the flag back with a reason.
          </p>
        </aside>
      </div>
    </div>
  );
}
