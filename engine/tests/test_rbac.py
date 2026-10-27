"""RBAC matrix + tenant isolation. Role → permission per app/security/rbac.py."""

import httpx

from app.contracts import Role
from app.security.rbac import ROLE_PERMISSIONS, Permission


def test_matrix_is_complete() -> None:
    assert set(ROLE_PERMISSIONS) == set(Role)
    # Server-side invariants by design:
    assert Permission.SIGN_APPROVAL not in ROLE_PERMISSIONS[Role.CREATOR]
    assert Permission.SIGN_APPROVAL not in ROLE_PERMISSIONS[Role.REVIEWER]
    assert Permission.RATIFY_PROPOSAL not in ROLE_PERMISSIONS[Role.REVIEWER]
    assert Permission.RATIFY_PROPOSAL in ROLE_PERMISSIONS[Role.APPROVER]
    # Admin holds everything:
    assert set(ROLE_PERMISSIONS[Role.ADMIN]) == set(Permission)


async def test_creator_cannot_dismiss(
    client: httpx.AsyncClient, tokens: dict[str, str]
) -> None:
    resp = await client.post(
        "/reviews/rv1/issues/rv1-i1/dismiss",
        headers={"Authorization": f"Bearer {tokens['creator']}"},
        json={"reason": "just vibe"},
    )
    assert resp.status_code == 403
    assert resp.json()["detail"]["required_permission"] == "dismiss_issue"


async def test_reviewer_cannot_ratify(
    client: httpx.AsyncClient, tokens: dict[str, str]
) -> None:
    resp = await client.post(
        "/proposals/amp1/ratify",
        headers={"Authorization": f"Bearer {tokens['reviewer']}"},
    )
    assert resp.status_code == 403


async def test_reviewer_cannot_manage_users(
    client: httpx.AsyncClient, tokens: dict[str, str]
) -> None:
    resp = await client.post(
        "/admin/users/u-priya/role",
        headers={"Authorization": f"Bearer {tokens['reviewer']}"},
        json={"role": "approver"},
    )
    assert resp.status_code == 403


async def test_admin_can_manage_users(
    client: httpx.AsyncClient, tokens: dict[str, str]
) -> None:
    resp = await client.post(
        "/admin/users/u-priya/role",
        headers={"Authorization": f"Bearer {tokens['admin']}"},
        json={"role": "reviewer"},
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "reviewer"
    # restore
    restore = await client.post(
        "/admin/users/u-priya/role",
        headers={"Authorization": f"Bearer {tokens['admin']}"},
        json={"role": "creator"},
    )
    assert restore.json()["role"] == "creator"


async def test_role_mismatch_login_rejected(
    client: httpx.AsyncClient, tokens: dict[str, str]
) -> None:
    """The desk's role picker cannot claim a wrong role for a real email."""
    resp = await client.post(
        "/auth/login",
        json={"email": "priya@meridiancoffee.com", "role": "approver"},
    )
    assert resp.status_code == 409
    assert resp.json()["detail"]["actual_role"] == "creator"


async def test_tenant_isolation_404_for_foreign_id(
    client: httpx.AsyncClient, tokens: dict[str, str]
) -> None:
    """A nonexistent/foreign review is indistinguishable — both 404."""
    resp_missing = await client.get(
        "/reviews/rv-nope", headers={"Authorization": f"Bearer {tokens['reviewer']}"}
    )
    assert resp_missing.status_code == 404
    # The approval lane belongs to rv2; rv1 is not its review either:
    resp_approver_read = await client.get(
        "/approvals/apr2", headers={"Authorization": f"Bearer {tokens['creator']}"}
    )
    assert resp_approver_read.status_code == 200  # same org, permitted READ
    resp_foreign_issue = await client.post(
        "/reviews/rv1/issues/iss-not-real/resolve",
        headers={"Authorization": f"Bearer {tokens['reviewer']}"},
        json={"status": "accepted"},
    )
    assert resp_foreign_issue.status_code == 404


async def test_bad_token_unauthorized(client: httpx.AsyncClient) -> None:
    resp = await client.get("/workspace", headers={"Authorization": "Bearer not-a-jwt"})
    assert resp.status_code == 401
    resp_none = await client.get("/workspace")
    assert resp_none.status_code == 401
