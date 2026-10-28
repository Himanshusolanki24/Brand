import clsx from "clsx";
import { VERIFICATION_LABELS, type Verification } from "@/lib/types";

export function SeverityPill({ severity }: { severity: "high" | "medium" | "low" }) {
  const styles = {
    high: { cls: "bg-flag-wash text-flag", label: "High" },
    medium: { cls: "bg-amber-wash text-amber", label: "Medium" },
    low: { cls: "bg-cite-wash text-cite", label: "Low" },
  }[severity];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-semibold", styles.cls)}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {styles.label}
    </span>
  );
}

export function ConfidenceTag({ confidence }: { confidence: number }) {
  return (
    <span
      className="text-[12px] text-ink-soft tabular-nums"
      title="Analysis confidence — how sure the check that raised this flag is"
    >
      Analysis confidence {Math.round(confidence * 100)}%
    </span>
  );
}

/**
 * The evidence verdict on a finding, in the vocabulary the book teaches:
 * Unverified means the knowledge base had nothing either way — never false.
 */
export function VerificationPill({ verification }: { verification: Verification }) {
  const styles: Record<Verification, { cls: string }> = {
    supported: { cls: "bg-keep-wash text-keep" },
    contradicted: { cls: "bg-flag-wash text-flag" },
    unverified: { cls: "bg-amber-wash text-amber" },
    inconclusive: { cls: "bg-amber-wash text-amber" },
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-semibold",
        styles[verification].cls,
      )}
      title={
        verification === "unverified"
          ? "The knowledge base had nothing backing or contradicting this claim. Not verified is not false."
          : "Evidence verdict from the knowledge-base pass"
      }
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {VERIFICATION_LABELS[verification]}
    </span>
  );
}

export function AdvisoryTag() {
  return (
    <span className="font-hand text-[17px] leading-none text-amber" title="No house rule anchors this — a human decides">
      advisory, uncited
    </span>
  );
}

const REVIEW_STATUS: Record<string, { cls: string; label: string }> = {
  analyzing: { cls: "bg-amber-wash text-amber", label: "Analyzing" },
  in_review: { cls: "bg-ink/5 text-ink border border-line", label: "In review" },
  changes_requested: { cls: "bg-flag-wash text-flag", label: "Sent back for fixes" },
  ready_for_approval: { cls: "bg-cite-wash text-cite", label: "Ready for approval" },
  approved: { cls: "bg-keep-wash text-keep", label: "Approved" },
};

export function StatusPill({ status }: { status: string }) {
  const known = REVIEW_STATUS[status];
  return known ? (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium", known.cls)}>
      {known.label}
    </span>
  ) : (
    // An honest neutral state: the desk never guesses an unknown status back
    // into a familiar-looking one.
    <span
      className="inline-flex items-center rounded-full bg-ink/5 px-2.5 py-0.5 text-[12px] font-medium text-ink border border-line"
      title="Status this desk does not have a label for"
    >
      Status: {status}
    </span>
  );
}

/** Vocabulary for states the review service returns. */
export const STATUS_VERBS: Record<string, string> = {
  ...Object.fromEntries(Object.entries(REVIEW_STATUS).map(([k, v]) => [k, v.label])),
};

/** Loading placeholder for fetch-driven read screens. */
export function SkeletonRow() {
  return (
    <div className="h-9 animate-pulse rounded-md border border-line bg-ink/5" />
  );
}

export function Stamp({ label, tone = "green", tilt = -3 }: { label: string; tone?: "green" | "red"; tilt?: number }) {
  return (
    <span
      className={clsx("stamp inline-block text-[13px] font-semibold", tone === "green" ? "text-keep" : "text-flag")}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {label}
    </span>
  );
}
