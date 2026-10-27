"""Roles + server-side permission matrix.

Rules:
- The client may *display* whatever role it likes; the server derives the role
  from the signed JWT only. Nothing in the workspace snapshot or the API lets
  a caller escalate.
- Every write endpoint maps to exactly one permission; the route dependency
  checks membership before the handler runs.
- Organisation isolation is enforced here too: all queries filter ``org_id``
  from the authenticated user, never from request arguments.
"""

from dataclasses import dataclass
from enum import StrEnum

from fastapi import HTTPException, status

from app.contracts import Role


class Permission(StrEnum):
    ANALYZE = "analyze"                      # submit content for review
    RESOLVE_ISSUE = "resolve_issue"          # accept / edit an issue
    DISMISS_ISSUE = "dismiss_issue"          # dismiss with reason
    SEND_FOR_APPROVAL = "send_for_approval"  # hand a review to an approver
    SIGN_APPROVAL = "sign_approval"          # sign or return an approval
    EXPORT_MANIFEST = "export_manifest"      # download the approval manifest
    RATIFY_PROPOSAL = "ratify_proposal"      # approve a learning proposal
    MANAGE_BRAND = "manage_brand"            # edit rules, facts, ingestion
    MANAGE_USERS = "manage_users"            # role assignment, org admin
    VIEW_TRUST_GRAPH = "view_trust_graph"
    VIEW_CONFLICTS = "view_conflicts"        # policy conflict detector output


# Role → permission set. Deliberately explicit; a dataclass-style matrix in
# one place beats scattered role checks across handlers.
ROLE_PERMISSIONS: dict[Role, frozenset[Permission]] = {
    Role.CREATOR: frozenset({
        Permission.ANALYZE,
        Permission.RESOLVE_ISSUE,
        Permission.SEND_FOR_APPROVAL,
        Permission.VIEW_TRUST_GRAPH,
    }),
    Role.REVIEWER: frozenset({
        Permission.ANALYZE,
        Permission.RESOLVE_ISSUE,
        Permission.DISMISS_ISSUE,
        Permission.SEND_FOR_APPROVAL,
        Permission.EXPORT_MANIFEST,
        Permission.VIEW_TRUST_GRAPH,
        Permission.VIEW_CONFLICTS,
    }),
    Role.APPROVER: frozenset({
        Permission.ANALYZE,
        Permission.RESOLVE_ISSUE,
        Permission.DISMISS_ISSUE,
        Permission.SEND_FOR_APPROVAL,
        Permission.SIGN_APPROVAL,
        Permission.EXPORT_MANIFEST,
        Permission.RATIFY_PROPOSAL,
        Permission.MANAGE_BRAND,
        Permission.VIEW_TRUST_GRAPH,
        Permission.VIEW_CONFLICTS,
    }),
    Role.ADMIN: frozenset(p for p in Permission),  # all
}


@dataclass(frozen=True)
class Principal:
    """Authenticated caller resolved from the JWT."""

    user_id: str
    org_id: str
    email: str
    name: str
    role: Role

    def has(self, permission: Permission) -> bool:
        return permission in ROLE_PERMISSIONS[self.role]

    def require(self, permission: Permission) -> None:
        if not self.has(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error_code": "rbac.permission_denied",
                    "message": f"The {self.role.value} role does not "
                    f"include the '{permission.value}' permission.",
                    "required_permission": permission.value,
                    "role": self.role.value,
                },
            )
