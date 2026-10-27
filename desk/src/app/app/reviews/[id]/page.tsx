"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { bySeverity, fmtDate, unresolved, useDemo } from "@/lib/store";
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
      <p className="mt-2 text-[15.5px] leading-[1.85]">{out}</p>
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
  const { state, dispatch } = useDemo();
  const [focusId, setFocusId] = useState<string | null>(null);
  const analyzed = useRef(false);

  const review = state.reviews.find((r) => r.id === id);

  useEffect(() => {
    if (!review || review.status !== "analyzing" || analyzed.current) return;
    analyzed.current = true;
    const issues = analyzeDraft(review.sections.map((s) => s.body).join("\n\n"));
    const t = setTimeout(() => {
      dispatch({ type: "analysisDone", reviewId: review.id, issues });
    }, 3400);
    return () => clearTimeout(t);
  }, [review, dispatch]);

  const focus = (issueId: string) => {
    setFocusId(issueId);
    document
      .getElementById(`card-${issueId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
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
  const allDecided = open.length === 0;
  const canSend =
    (review.status === "in_review" || review.status === "changes_requested") &&
    review.issues.length > 0;

  return (
    <div>
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
            <span className="font-medium">Maya Okafor&apos;s</span> signature — see{" "}
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

          {canSend && allDecided ? (
            <Button
              variant="approve"
              className="w-full"
              onClick={() => dispatch({ type: "ready", reviewId: review.id })}
            >
              Send for approval
            </Button>
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
            Three verdicts only — accept, rewrite it yourself, or send the flag back with a reason.
          </p>
        </aside>
      </div>
    </div>
  );
}
