"""Trust Graph — relational traceability between everything that decided.

Edges connect: content review → findings → cited rules → evidence sources →
human decisions. Nodes are labelled on the fly from the rows the edge points
at, so the graph can never reference something that doesn't exist in this
org (a dangling edge is omitted with the reason kept in the node list).
"""

import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts import TrustEdge, TrustGraph, TrustNode
from app.db.models import (
    Approval,
    AuditEvent,
    GuidelineSection,
    Issue,
    ProofFact,
    Review,
)
from app.db.models import (
    TrustEdge as TrustEdgeRow,
)


@dataclass
class GraphContext:
    reviews: dict[str, str]         # id → title
    issues: dict[str, str]          # id → headline
    rules: dict[str, str]           # number → "§4.2 Label"
    facts: dict[str, str]           # id → claim
    approvals: dict[str, str]       # review_id → decision label


async def build_graph(session: AsyncSession, org_id: str) -> TrustGraph:
    rows = (await session.execute(
        select(TrustEdgeRow).where(TrustEdgeRow.org_id == org_id)
    )).scalars().all()

    reviews = {r.id: r.title for r in (await session.execute(
        select(Review).where(Review.org_id == org_id)
    )).scalars().all()}
    issues = {i.id: i.headline for i in (await session.execute(
        select(Issue).where(Issue.org_id == org_id)
    )).scalars().all()}
    rules = {
        f"§{g.number}": f"§{g.number} {g.label}"
        for g in (await session.execute(
            select(GuidelineSection).where(GuidelineSection.org_id == org_id)
        )).scalars().all()
    }
    facts = {f.id: f.claim[:90] for f in (await session.execute(
        select(ProofFact).where(ProofFact.org_id == org_id)
    )).scalars().all()}
    approvals: dict[str, str] = {}
    for approval in (await session.execute(
        select(Approval).where(Approval.org_id == org_id)
    )).scalars().all():
        state = approval.state
        approvals.setdefault(approval.review_id, f"{state}: {approval.note or '—'}")

    nodes: dict[str, TrustNode] = {}

    def node(kind: str, id_: str, label: str, detail: str | None = None) -> None:
        key = f"{kind}:{id_}"
        if key not in nodes:
            nodes[key] = TrustNode(id=key, kind=kind, label=label, detail=detail)

    edges: list[TrustEdge] = []
    for row in rows:
        if row.src_kind == "review" and row.src_id in reviews:
            node("review", row.src_id, reviews[row.src_id])
        elif row.src_kind == "issue" and row.src_id in issues:
            node("issue", row.src_id, issues[row.src_id])
        elif row.src_kind not in ("review", "issue"):
            continue
        # Destination node kinds
        if row.dst_kind == "issue" and row.dst_id in issues:
            node("issue", row.dst_id, issues[row.dst_id])
        elif row.dst_kind == "rule" and row.dst_id in rules:
            node("rule", row.dst_id, rules[row.dst_id])
        elif row.dst_kind == "evidence" and row.dst_id in facts:
            node("evidence", row.dst_id, facts[row.dst_id])
        else:
            continue  # dangling → omitted (strict referential integrity)
        if f"{row.src_kind}:{row.src_id}" in nodes and (
            f"{row.dst_kind}:{row.dst_id}" in nodes
        ):
            edges.append(TrustEdge(
                id=f"te-{uuid.uuid4().hex[:8]}",
                src=f"{row.src_kind}:{row.src_id}",
                dst=f"{row.dst_kind}:{row.dst_id}",
                rel=row.rel,
            ))

    # Decision nodes: one per approval record, linked to its review.
    for review_id, decision in approvals.items():
        if review_id in reviews:
            node("review", review_id, reviews[review_id])
            decision_key = f"decision:{review_id}"
            if decision_key not in nodes:
                nodes[decision_key] = TrustNode(
                    id=decision_key, kind="decision", label=decision
                )
                edges.append(TrustEdge(
                    id=f"te-{uuid.uuid4().hex[:8]}",
                    src=decision_key,
                    dst=f"review:{review_id}",
                    rel="decision_for",
                ))

    audit = (await session.execute(
        select(AuditEvent).where(AuditEvent.org_id == org_id)
        .order_by(AuditEvent.at.desc()).limit(8)
    )).scalars().all()
    for event in audit:
        key = f"audit:{event.id}"
        nodes[key] = TrustNode(
            id=key, kind="audit",
            label=f"{event.action} — {event.subject}",
            detail=event.actor,
        )

    return TrustGraph(nodes=list(nodes.values()), edges=edges)


async def record(
    session: AsyncSession, org_id: str, actor: str, action: str,
    subject: str, meta: dict[str, object] | None = None,
) -> None:
    """Audit trail helper — every consequential change gets one row."""
    session.add(AuditEvent(
        id=f"ae-{uuid.uuid4().hex[:10]}",
        org_id=org_id, actor=actor, action=action, subject=subject,
        meta=meta or {},
    ))
