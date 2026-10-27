"""Learning proposals — approvals-gated policy change ('Close the loop')."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.contracts import Amendment, ProposalState
from app.db.models import (
    GuidelineSection as GuidelineRow,
)
from app.db.models import (
    GuidelineVersion,
    LearningProposal,
)
from app.security.deps import DbSession, Principal, require_permission
from app.security.rbac import Permission
from app.services import graph as graph_service
from app.services.embeddings import index_org_knowledge
from app.services.retrieval import invalidate_cache

router = APIRouter(prefix="/proposals", tags=["proposals"])


def _contract(proposal: LearningProposal) -> Amendment:
    return Amendment(
        id=proposal.id, clause=proposal.clause, based_on=proposal.based_on,
        draft=proposal.draft, state=ProposalState(proposal.state),
    )


@router.get("", response_model=list[Amendment])
async def list_proposals(
    session: DbSession,
    principal: Principal = Depends(require_permission(Permission.VIEW_TRUST_GRAPH)),
) -> list[Amendment]:
    rows = (await session.execute(
        select(LearningProposal).where(LearningProposal.org_id == principal.org_id)
        .order_by(LearningProposal.id)
    )).scalars().all()
    return [_contract(row) for row in rows]


@router.post("/{proposal_id}/ratify", response_model=Amendment)
async def ratify(
    proposal_id: str,
    session: DbSession,
    principal: Principal = Depends(require_permission(Permission.RATIFY_PROPOSAL)),
) -> Amendment:
    """Ratify a proposal: the ONLY path from reviewer feedback to policy text.

    Ratification (1) applies the draft language to the clause, (2) cuts a new
    guideline version so every later review cites a different, honest version
    string, and (3) re-indexes the knowledge chunks so retrieval picks the new
    wording up. Everything stays deterministic and fully audited.
    """
    proposal = (await session.execute(
        select(LearningProposal).where(
            LearningProposal.id == proposal_id,
            LearningProposal.org_id == principal.org_id,
        )
    )).scalar_one_or_none()
    if proposal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "proposal.not_found",
                    "message": "No such learning proposal in this organisation."},
        )
    if proposal.state != ProposalState.PROPOSED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error_code": "proposal.already_ratified",
                    "message": "This proposal was already ratified."},
        )
    proposal.state = ProposalState.RATIFIED.value

    section = (await session.execute(
        select(GuidelineRow).where(
            GuidelineRow.org_id == principal.org_id,
            GuidelineRow.number == proposal.clause,
        ).order_by(GuidelineRow.id)
    )).scalars().first()
    draft_text = proposal.draft
    if section is not None and draft_text.startswith(f"Add to §{proposal.clause}: "):
        draft_text = draft_text[len(f"Add to §{proposal.clause}: "):]
    if section is not None:
        section.text = f"{section.text} {draft_text}".strip()
        if section.clarity is not None:
            section.clarity = min(95, section.clarity + 10)

    # New display version — the governance toggle the desk shows top-right.
    current = (await session.execute(
        select(GuidelineVersion).where(
            GuidelineVersion.org_id == principal.org_id
        ).order_by(GuidelineVersion.id)
    )).scalars().first()
    if current is not None and not current.version.endswith("draft"):
        current.version = f"v{_bump(current.version)}-draft"

    await graph_service.record(
        session, principal.org_id, principal.name, "proposal.ratified",
        proposal_id, {"clause": proposal.clause},
    )
    await session.commit()

    # Retrieval must see the new wording immediately.
    await index_org_knowledge(session, principal.org_id)
    await session.commit()
    invalidate_cache()

    await session.refresh(proposal)
    return _contract(proposal)


def _bump(version: str) -> str:
    """v2.3 → 2.4 (numeric bump with the '-draft' suffix added upstream)."""
    try:
        major, minor = version.lstrip("v").split(".")
        return f"{major}.{int(minor) + 1}"
    except ValueError:
        return version
