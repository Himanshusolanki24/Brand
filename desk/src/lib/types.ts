export type Role = "creator" | "reviewer" | "approver" | "admin";

export type Severity = "high" | "medium" | "low";

export type IssueStatus = "open" | "accepted" | "edited" | "dismissed";

export type ReviewStatus =
  | "analyzing"
  | "in_review"
  | "changes_requested"
  | "ready_for_approval"
  | "approved";

export type Channel = "Email" | "Website" | "Paid ad" | "SMS" | "Deck";

export interface Citation {
  clause: string;
  sectionLabel: string;
  text: string;
  version: string;
}

export interface GuidelineSection {
  number: string;
  label: string;
  text: string;
  clarity: number | null;
}

export interface ProofFact {
  id: string;
  claim: string;
  verified: string;
  source: string;
}

export interface ProofTerm {
  id: string;
  term: string;
  definition: string;
}

export interface ProofAsset {
  id: string;
  name: string;
  kind: string;
  note: string;
}

export interface ContentSection {
  id: string;
  heading: string;
  body: string;
}

export interface Issue {
  id: string;
  sectionId: string;
  quote: string;
  severity: Severity;
  confidence: number;
  headline: string;
  detail: string;
  citation: Citation | null;
  suggested: string;
  rationale: string;
  status: IssueStatus;
  reason?: string;
  replacement?: string;
}

export interface Review {
  id: string;
  title: string;
  channel: Channel;
  author: string;
  submittedAt: number;
  status: ReviewStatus;
  sections: ContentSection[];
  issues: Issue[];
  approverNote?: string;
  returnedBy?: string;
}

export interface ApprovalEntry {
  id: string;
  reviewId: string;
  approver: string;
  state: "waiting" | "signed" | "returned";
  signedAt?: number;
  note?: string;
}

export interface Amendment {
  id: string;
  clause: string;
  basedOn: string;
  draft: string;
  state: "proposed" | "ratified";
}

export interface ClarityAxisScore {
  axis: string;
  score: number;
  note: string;
}

export interface DemoState {
  role: Role;
  reviews: Review[];
  guidelines: GuidelineSection[];
  guidelineVersion: string;
  facts: ProofFact[];
  terms: ProofTerm[];
  assets: ProofAsset[];
  approvals: ApprovalEntry[];
  amendments: Amendment[];
  radar: ClarityAxisScore[];
}

export const ROLE_LABELS: Record<Role, string> = {
  creator: "Creator",
  reviewer: "Reviewer",
  approver: "Approver",
  admin: "Admin",
};

export const STATUS_LABELS: Record<ReviewStatus, string> = {
  analyzing: "Analyzing",
  in_review: "In review",
  changes_requested: "Changes requested",
  ready_for_approval: "Ready for approval",
  approved: "Approved",
};
