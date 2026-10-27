import clsx from "clsx";

export function SeverityPill({ severity }: { severity: "high" | "medium" | "low" }) {
  const styles = {
    high: { cls: "bg-redpen-wash text-redpen", label: "High" },
    medium: { cls: "bg-pencil-wash text-pencil", label: "Medium" },
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
    <span className="text-[12px] text-ink-soft tabular-nums" title="How sure the analysis is about this flag">
      sure {confidence.toFixed(2)}
    </span>
  );
}

export function AdvisoryTag() {
  return (
    <span className="font-hand text-[17px] leading-none text-pencil" title="No house rule anchors this — a human decides">
      advisory, uncited
    </span>
  );
}

const REVIEW_STATUS: Record<string, { cls: string; label: string }> = {
  analyzing: { cls: "bg-pencil-wash text-pencil", label: "Analyzing" },
  in_review: { cls: "bg-ink/5 text-ink border border-line", label: "In review" },
  changes_requested: { cls: "bg-redpen-wash text-redpen", label: "Changes requested" },
  ready_for_approval: { cls: "bg-cite-wash text-cite", label: "Ready for approval" },
  approved: { cls: "bg-greenink-wash text-greenink", label: "Approved" },
};

export function StatusPill({ status }: { status: string }) {
  const s = REVIEW_STATUS[status] ?? REVIEW_STATUS.in_review;
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium", s.cls)}>
      {s.label}
    </span>
  );
}

export function Stamp({ label, tone = "green", tilt = -3 }: { label: string; tone?: "green" | "red"; tilt?: number }) {
  return (
    <span
      className={clsx("stamp inline-block text-[13px] font-semibold", tone === "green" ? "text-greenink" : "text-redpen")}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {label}
    </span>
  );
}
