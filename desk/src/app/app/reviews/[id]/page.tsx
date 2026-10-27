"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { bySeverity, fmtDate, unresolved, useDemo } from "@/lib/store";
import { api } from "@/lib/api";
import { analyzeDraft } from "@/lib/analyze";
import { StatusPill, Stamp } from "@/components/ui/pills";
import { Button } from "@/components/ui/button";
import { IssueCard } from "@/components/app/issue-card";
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
        title={`${r.issue.severity} flag — click to open the issue card`}
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
      <h3 className="font-display text-[13.5px] font-semibold text-ink-soft">{heading}</h3>
      {/* The reviewed copy itself reads serif — the register distinction. */}
      <p className="mt-2 font-serif text-[16px] leading-[1.9]">{out}</p>
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
    <div className="mt-6 rounded-lg border border-pencil/30 bg-pencil-wash px-5 py-4">
      <p className="font-medium">Analyzing this piece…</p>
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
      <p className="pt-2 font-hand text-[15px] text-pencil">
        demo note: the trained model runs this pass in the real product; the demo walks the same four steps
      </p>
    </div>
  );
}

export default function ReviewDetailPage() {
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
  // highlight that finding's ledger row.
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
        <p className="font-display text-xl font-semibold">Not on the desk.</p>
        <p className="mt-1 text-sm text-ink-soft">This review was never submitted to the workspace.</p>
        <Link href="/app/reviews" className="mt-4 inline-block text-sm font-medium text-cite hover:underline">
          Back to reviews
        </Link>
      </div>
    );
  }

  const open = unresolved(review);
  const tray = bySeverity(review.issues);
  // The hand-off rule, mirrored from the review service: unresolved
  // high-severity findings block approval; everything else may ride along.
  const openHigh = open.filter((i) => i.severity === "high").length;
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
        <div className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-redpen/30 bg-redpen-wash px-5 py-3.5">
          <p className="text-[13px] leading-snug text-redpen">{engineError}</p>
          <button
            onClick={dismissError}
            className="text-[12px] font-medium text-redpen/80 hover:text-redpen"
          >
            dismiss
          </button>
        </div>
      ) : null}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/app/reviews"
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-soft hover:text-ink"
          >
            <ArrowLeft size={13} aria-hidden /> All reviews
          </Link>
          <h1 className="mt-1 font-display text-[24px] font-semibold tracking-tight">
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
                title={`This review was checked under ${review.policyVersion}; the desk currently shows ${state.guidelineVersion}. The findings above cite their own pinned versions.`}
              >
                pinned to {review.policyVersion}
              </span>
            ) : null}
          </div>
        </div>
        {review.status === "approved" ? <Stamp label="Approved" /> : null}
      </header>

      {review.status === "changes_requested" && review.approverNote ? (
        <aside className="mt-6 rounded-lg border border-redpen/30 bg-redpen-wash px-5 py-4">
          <p className="font-display text-[15px] font-semibold text-redpen">
            {review.returnedBy} sent this back
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink">{review.approverNote}</p>
        </aside>
      ) : null}

      {review.status === "ready_for_approval" ? (
        <aside className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-cite/30 bg-cite-wash px-5 py-4">
          <BadgeCheck size={17} className="text-cite" aria-hidden />
          <p className="text-[13.5px]">
            Every flag is decided. This piece is waiting on{" "}
            <span className="font-medium">
              {state.approvals.find((a) => a.reviewId === review.id)?.approver ?? "the assigned approver"}
              &apos;s
            </span>{" "}
            signature — see{" "}
            <Link href="/app/approvals" className="font-medium text-cite hover:underline">
              Approvals
            </Link>
            .
          </p>
        </aside>
      ) : null}

      {review.status === "analyzing" ? <AnalyzingPanel /> : null}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_386px]">
        {/* The document on the desk */}
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
        </article>

        {/* The proofing tray */}
        <aside className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-[17px] font-semibold">Proofing tray</h2>
            <p className="text-[12.5px] text-ink-soft">
              {review.issues.length - open.length} of {review.issues.length} decided
            </p>
          </div>

          {sendableStatus ? (
            <div>
              <Button
                variant="approve"
                className="w-full"
                disabled={openHigh > 0}
                onClick={() => dispatch({ type: "ready", reviewId: review.id })}
                title={openHigh > 0 ? `${openHigh} unresolved high-severity ${openHigh === 1 ? "finding blocks" : "findings block"} approval` : undefined}
              >
                Send for approval
              </Button>
              <p className="pt-1.5 text-[11.5px] leading-snug text-ink-soft/80">
                {openHigh > 0
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
              <h3 className="font-display text-[15px] font-semibold">Recheck against the newest rules</h3>
              <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">
                Runs the same copy through the deterministic checks under{" "}
                <span className="font-medium">{state.guidelineVersion}</span> — before you commit to
                anything. The review stays pinned to <span className="font-medium">{review.policyVersion}</span>;
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
                <p className="mt-2 text-[12.5px] font-medium text-redpen">{previewError}</p>
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
                      This review has no findings on record; see below for what the newest pass scores.
                    </p>
                  )}
                  {extraRows.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-[11.5px] font-medium text-ink-soft">
                        Flagged in the newest pass, absent from this review&apos;s record:
                      </p>
                      <ul className="mt-1.5 space-y-1.5">
                        {extraRows.map((p) => (
                          <li key={p.id} className="text-[12.5px] leading-snug">
                            <span className="font-medium text-redpen">{p.headline}:</span>{" "}
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
              The tray fills in as the analysis finishes.
            </p>
          ) : null}

          {tray.length === 0 && review.status !== "analyzing" ? (
            <p className="rounded-lg border border-line bg-sheet p-4 text-[13px] text-ink-soft">
              Nothing was flagged. A human still signs off — that part never goes away.
            </p>
          ) : null}

          {tray.length > 0 ? (
            <ul className="space-y-3">
              {tray.map((i) => (
                <IssueCard key={i.id} issue={i} reviewId={review.id} focusId={focusId} />
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
