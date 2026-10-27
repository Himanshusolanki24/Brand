import type { Role } from "./types";

/**
 * Client-side mirror of the review service's RBAC (engine/app/security/rbac.py).
 * The server stays authoritative; the desk uses this to disable actions with
 * an honest reason instead of letting a 403 surprise the user.
 */
export type Permit =
  | "analyze"
  | "resolve_issue"
  | "dismiss_issue"
  | "send_for_approval"
  | "sign_approval"
  | "export_manifest"
  | "ratify_proposal"
  | "manage_brand"
  | "manage_users"
  | "view_trust_graph"
  | "view_conflicts";

const MATRIX: Record<Role, readonly Permit[]> = {
  creator: ["analyze", "resolve_issue", "send_for_approval", "view_trust_graph"],
  reviewer: [
    "analyze",
    "resolve_issue",
    "dismiss_issue",
    "send_for_approval",
    "export_manifest",
    "view_trust_graph",
    "view_conflicts",
  ],
  approver: [
    "analyze",
    "resolve_issue",
    "dismiss_issue",
    "send_for_approval",
    "sign_approval",
    "export_manifest",
    "ratify_proposal",
    "manage_brand",
    "view_trust_graph",
    "view_conflicts",
  ],
  admin: ["manage_users", "sign_approval", "ratify_proposal", "manage_brand", "export_manifest"],
};

/** The server stays authoritative; unknown seat ⇒ no permit (fail closed). */
export function can(role: Role | undefined | null, permit: Permit): boolean {
  if (role === undefined || role === null) return false;
  return role === "admin" || MATRIX[role].includes(permit);
}
