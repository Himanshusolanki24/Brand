"""Workspace snapshot — the single hydration endpoint for the desk app."""

from fastapi import APIRouter
from sqlalchemy import select

from app.contracts import (
    Amendment,
    ApprovalEntry,
    ApprovalState,
    Citation,
    ClarityAxisScore,
    ContentSection,
    GuidelineSection,
    Issue,
    IssueStatus,
    ProofAsset,
    ProofFact,
    ProofTerm,
    ProposalState,
    Review,
    Severity,
    User,
    WorkspaceSnapshot,
)
from app.db.models import (
    Approval,
    ContentVersion,
    GuidelineVersion,
    LearningProposal,
)
from app.db.models import (
    GuidelineSection as GuidelineRow,
)
from app.db.models import (
    Issue as IssueRow,
)
from app.db.models import (
    ProofAsset as AssetRow,
)
from app.db.models import (
    ProofFact as FactRow,
)
from app.db.models import (
    ProofTerm as TermRow,
)
from app.db.models import (
    Review as ReviewRow,
)
from app.db.models import (
    User as UserRow,
)
from app.security.deps import CurrentUser, DbSession
from app.services.embeddings import org_chunk_count
from app.services.embeddings.providers import get_provider

router = APIRouter(prefix="/workspace", tags=["workspace"])

# Radar axes are **illustrative** and labelled as such in the desk (blueprint
# §4.9: dashboard values must be visibly non-claims until real data lands).
ILLUSTRATIVE_RADAR: list[ClarityAxisScore] = [
    ClarityAxisScore(axis="Specificity", score=42,
                     note='"Avoid hype" appears three times but hype is never defined anywhere.'),
    ClarityAxisScore(axis="Testability", score=58,
                     note="Most clauses can decide a concrete draft; voice clauses can't."),
    ClarityAxisScore(axis="Consistency", score=64,
                     note="§4.1 and §5.1 disagree slightly about what counts as a source."),
    ClarityAxisScore(axis="Coverage", score=38,
                     note="No rule touches pricing language, urgency language, or decks."),
    ClarityAxisScore(axis="Predictability", score=71,
                     note="Reviewers can usually see a flag coming — usually."),
]


def _issue_from_row(row: IssueRow) -> Issue:
    citation = Citation.model_validate(row.citation_json) if row.citation_json else None
    return Issue(
        id=row.id, section_id=row.section_id, quote=row.quote,
        severity=Severity(row.severity), confidence=row.confidence,
        headline=row.headline, detail=row.detail,
        citation=citation, suggested=row.suggested, rationale=row.rationale,
        status=IssueStatus(row.status), reason=row.reason,
        replacement=row.replacement, evidence_ids=list(row.evidence_ids or []),
        verification=row.verification, agent=row.agent,
    )


@router.get("", response_model=WorkspaceSnapshot)
async def workspace(principal: CurrentUser, session: DbSession) -> WorkspaceSnapshot:
    org = principal.org_id

    gv = (await session.execute(
        select(GuidelineVersion).where(GuidelineVersion.org_id == org)
    )).scalars().first()
    guideline_version = gv.version if gv else "v2.3"
    brand = gv.brand if gv else "Meridian Coffee"

    review_rows = (await session.execute(
        select(ReviewRow).where(ReviewRow.org_id == org)
        .order_by(ReviewRow.submitted_at.desc())
    )).scalars().all()

    # Latest content version per item (store as JSON list of sections).
    versions: dict[str, list[dict[str, str]]] = {}
    for row in (await session.execute(
        select(ContentVersion).where(ContentVersion.org_id == org)
        .order_by(ContentVersion.ordinal)
    )).scalars().all():
        versions[row.item_id] = list(row.body_json)

    issue_rows = (await session.execute(
        select(IssueRow).where(IssueRow.org_id == org)
    )).scalars().all()
    issues_by_review: dict[str, list[Issue]] = {}
    for issue_row in issue_rows:
        issues_by_review.setdefault(issue_row.review_id, []).append(_issue_from_row(issue_row))

    reviews: list[Review] = []
    for review_row in review_rows:
        body = versions.get(review_row.item_id, [])
        reviews.append(Review(
            id=review_row.id, title=review_row.title, channel=review_row.channel,
            author=review_row.author,
            submitted_at=review_row.submitted_at, status=review_row.status,
            sections=[
                ContentSection(id=sb["id"], heading=sb["heading"], body=sb["body"])
                for sb in body
            ],
            issues=issues_by_review.get(review_row.id, []),
            approver_note=review_row.approver_note, returned_by=review_row.returned_by,
            policy_version=review_row.policy_version,
        ))

    guidelines = [
        GuidelineSection(number=g.number, label=g.label, text=g.text, clarity=g.clarity)
        for g in (await session.execute(
            select(GuidelineRow).where(GuidelineRow.org_id == org)
            .order_by(GuidelineRow.number)
        )).scalars().all()
    ]
    facts = [
        ProofFact(id=f.id, claim=f.claim, verified=f.verified, source=f.source)
        for f in (await session.execute(select(FactRow).where(FactRow.org_id == org)))
        .scalars().all()
    ]
    terms = [
        ProofTerm(id=t.id, term=t.term, definition=t.definition)
        for t in (await session.execute(select(TermRow).where(TermRow.org_id == org)))
        .scalars().all()
    ]
    assets = [
        ProofAsset(id=a.id, name=a.name, kind=a.kind, note=a.note)
        for a in (await session.execute(select(AssetRow).where(AssetRow.org_id == org)))
        .scalars().all()
    ]

    user_rows = {
        u.id: u.name for u in (await session.execute(
            select(UserRow).where(UserRow.org_id == org)
        )).scalars().all()
    }
    approvals = [
        ApprovalEntry(
            id=a.id, review_id=a.review_id,
            approver=user_rows.get(a.approver_id, "—"),
            state=ApprovalState(a.state), signed_at=a.signed_at, note=a.note,
        )
        for a in (await session.execute(
            select(Approval).where(Approval.org_id == org).order_by(Approval.id)
        )).scalars().all()
    ]
    amendments_contracts = [
        Amendment(
            id=m.id, clause=m.clause, based_on=m.based_on, draft=m.draft,
            state=ProposalState(m.state),
        )
        for m in (await session.execute(
            select(LearningProposal).where(LearningProposal.org_id == org)
            .order_by(LearningProposal.id)
        )).scalars().all()
    ]

    provider = get_provider()
    chunks = await org_chunk_count(session, org)

    return WorkspaceSnapshot(
        user=User(id=principal.user_id, email=principal.email,
                  name=principal.name, role=principal.role, org_id=org),
        brand=brand,
        guideline_version=guideline_version,
        reviews=reviews,
        guidelines=guidelines,
        facts=facts,
        terms=terms,
        assets=assets,
        approvals=approvals,
        amendments=amendments_contracts,
        radar=ILLUSTRATIVE_RADAR,
        engine_info={
            "embeddingModel": provider.model_id,
            "knowledgeChunks": chunks,
            "deterministicChecks": 6,
        },
    )
