"""Trust Graph endpoint + admin surface (users, conflicts)."""

import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app.checks.conflicts import ConflictFinding, collect_conflicts
from app.contracts import Role, TrustGraph
from app.db.models import User as UserRow
from app.security.deps import DbSession, Principal, require_permission
from app.security.rbac import Permission
from app.services import graph as graph_service

router = APIRouter(prefix="/trust", tags=["trust"])

admin = APIRouter(prefix="/admin", tags=["admin"])


@router.get("", response_model=TrustGraph)
async def trust_graph(
    session: DbSession,
    principal: Principal = Depends(require_permission(Permission.VIEW_TRUST_GRAPH)),
) -> TrustGraph:
    """Nodes + edges linking content → findings → rules → evidence → decisions."""
    return await graph_service.build_graph(session, principal.org_id)


class UserView(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    id: str
    email: str
    name: str
    role: Role


class ConflictView(BaseModel):
    kind: str
    rule_ids: list[str]
    numbers: list[str]
    headline: str
    explanation: str
    route_to: str


class RoleChange(BaseModel):
    role: Role


@admin.get("/users", response_model=list[UserView])
async def list_users(
    session: DbSession,
    principal: Principal = Depends(require_permission(Permission.MANAGE_USERS)),
) -> list[UserView]:
    rows = (await session.execute(
        select(UserRow).where(UserRow.org_id == principal.org_id)
        .order_by(UserRow.id)
    )).scalars().all()
    return [
        UserView(id=r.id, email=r.email, name=r.name, role=Role(r.role))
        for r in rows
    ]


@admin.post("/users/{user_id}/role", response_model=UserView)
async def change_role(
    user_id: str,
    change: RoleChange,
    session: DbSession,
    principal: Principal = Depends(require_permission(Permission.MANAGE_USERS)),
) -> UserView:
    """Role change — audited. Only admins reach this handler at all."""
    row = (await session.execute(
        select(UserRow).where(
            UserRow.id == user_id, UserRow.org_id == principal.org_id
        )
    )).scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "user.not_found",
                    "message": "No such user in this organisation."},
        )
    old_role = row.role
    row.role = change.role.value
    await graph_service.record(
        session, principal.org_id, principal.name, "user.role_changed", user_id,
        {"from": old_role, "to": row.role},
    )
    await session.commit()
    return UserView(id=row.id, email=row.email, name=row.name, role=Role(row.role))


@admin.get("/conflicts", response_model=list[ConflictView])
async def policy_conflicts(
    session: DbSession,
    principal: Principal = Depends(require_permission(Permission.VIEW_CONFLICTS)),
) -> list[ConflictView]:
    """Deterministic Policy Conflict Detector output (expired / governance
    gaps / overlapping scope). Unresolved conflicts are routed to owners
    here — the engine never silently picks a winner."""
    findings: list[ConflictFinding] = await collect_conflicts(
        session, principal.org_id, dt.date.today()
    )
    return [
        ConflictView(
            kind=f.kind, rule_ids=f.rule_ids, numbers=f.numbers,
            headline=f.headline, explanation=f.explanation, route_to=f.route_to,
        )
        for f in findings
    ]



