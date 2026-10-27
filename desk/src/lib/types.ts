export type Role = "creator" | "reviewer" | "approver" | "admin";

export type Severity = "high" | "medium" | "low";

export type IssueStatus = "open" | "accepted" | "edited" | "dismissed";

/**
 * What the review service's evidence pass decided about the claim behind a
 * finding. Deliberately a four-way story: "unverified" means the knowledge
 * base had nothing either way — it never means false.
 */
export type Verification =
  | "supported"
  | "contradicted"
  | "unverified"
  | "inconclusive";

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
  /** Node ids of the evidence backing this finding; empty when none applies. */
  evidenceIds: string[];
  /** Machine truth about the claim behind the finding; null = not verified. */
  verification: Verification | null;
  /** Which checker spoke: "policy_checks" (cited rules) or "advisory" (uncited). */
  agent: string;
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
  /** Guideline version pinned at analysis time — may trail the desk's current. */
  policyVersion: string;
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

// ---------------------------------------------------------------------------
// Trust graph — GET /trust (every signed-in role: VIEW_TRUST_GRAPH).
// Nodes link reviews → findings → cited rules → evidence → human decisions.
// ---------------------------------------------------------------------------

export type TrustNodeKind =
  | "review"
  | "issue"
  | "rule"
  | "evidence"
  | "decision"
  | "audit";

export interface TrustNode {
  /** Prefixed id — e.g. "issue:rv1-i2" or "audit:ae-…". */
  id: string;
  kind: TrustNodeKind;
  label: string;
  /** Audit nodes carry the actor here; most kinds leave it null. */
  detail?: string | null;
}

export interface TrustEdge {
  id: string;
  src: string;
  dst: string;
  /** has_finding · cites · backed_by · decision_for */
  rel: string;
}

export interface TrustGraphResponse {
  nodes: TrustNode[];
  edges: TrustEdge[];
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

export const VERIFICATION_LABELS: Record<Verification, string> = {
  supported: "Supported",
  contradicted: "Contradicted",
  unverified: "Unverified",
  inconclusive: "Inconclusive",
};
