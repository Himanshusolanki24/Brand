"""Reviews — analyze submissions, resolve/dismiss findings, route to approval."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.checks.engine import CheckContext, run_checks
from app.contracts import (
    AnalyzeRequest,
    ChecksPreviewRequest,
    ChecksPreviewResponse,
    Citation,
    ContentSection,
    DismissRequest,
    Issue,
    IssueAction,
    IssueStatus,
    Review,
    ReviewStatus,
    Severity,
)
from app.contracts import (
    ApprovalState as ApprovalState_,
)
from app.db.models import (
    Approval,
    ContentVersion,
)
from app.db.models import (
    Issue as IssueRow,
)
from app.db.models import (
    Review as ReviewRow,
)
from app.db.models import (
    User as UserRow,
)
from app.security.deps import CurrentUser, DbSession, Principal, require_permission
from app.security.rbac import Permission
from app.services import graph as graph_service
from app.workflow.pipeline import analyze_content, certified_terms_from, load_org_context

router = APIRouter(prefix="/reviews", tags=["reviews"])


async def load_review(
    org_id: str, review_id: str, session: DbSession
) -> tuple[ReviewRow, list[IssueRow], list[dict[str, str]]]:
    """Org-scoped fetch: review + issues + latest content version.

    A review id from another org is indistinguishable from a nonexistent id —
    both raise 404. That is the isolation property, deliberately.
    """
    row_review = (await session.execute(
        select(ReviewRow).where(
            ReviewRow.id == review_id, ReviewRow.org_id == org_id
        )
    )).scalar_one_or_none()
    if row_review is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "review.not_found",
                    "message": "No such review in this organisation."},
        )
    issue_rows = list((await session.execute(
        select(IssueRow).where(
            IssueRow.review_id == review_id, IssueRow.org_id == org_id
        )
    )).scalars().all())
    version_rows = (await session.execute(
        select(ContentVersion).where(
            ContentVersion.item_id == row_review.item_id,
            ContentVersion.org_id == org_id,
        ).order_by(ContentVersion.ordinal)
    )).scalars().all()
    version = version_rows[-1] if version_rows else None
    if version is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error_code": "review.no_content_version",
                    "message": "Review exists but its content version is missing."},
        )
    return row_review, issue_rows, list(version.body_json)


def _issue_of(issue_row: IssueRow) -> Issue:
    return Issue(
        id=issue_row.id,
        section_id=issue_row.section_id,
        quote=issue_row.quote,
        severity=Severity(issue_row.severity),
        confidence=issue_row.confidence,
        headline=issue_row.headline,
        detail=issue_row.detail,
        citation=(Citation.model_validate(issue_row.citation_json)
                  if issue_row.citation_json else None),
        suggested=issue_row.suggested,
        rationale=issue_row.rationale,
        status=IssueStatus(issue_row.status),
        reason=issue_row.reason,
        replacement=issue_row.replacement,
        evidence_ids=list(issue_row.evidence_ids or []),
        verification=issue_row.verification,
        agent=issue_row.agent,
    )


def review_contract(
    row_review: ReviewRow, issue_rows: list[IssueRow], sections: list[dict[str, str]]
) -> Review:
    return Review(
        id=row_review.id, title=row_review.title, channel=row_review.channel,
        author=row_review.author, submitted_at=row_review.submitted_at,
        status=ReviewStatus(row_review.status),
        sections=[
            ContentSection(id=s["id"], heading=s["heading"], body=s["body"])
            for s in sections
        ],
        issues=[_issue_of(issue_row) for issue_row in issue_rows],
        approver_note=row_review.approver_note,
        returned_by=row_review.returned_by,
        policy_version=row_review.policy_version,
    )


async def _refresh(review_id: str, principal: Principal, session: DbSession) -> Review:
    row_review, issue_rows, sections = await load_review(
        principal.org_id, review_id, session
    )
    return review_contract(row_review, issue_rows, sections)


async def _get_issue(
    principal: Principal, review_id: str, issue_id: str, session: DbSession
) -> IssueRow:
    row = (await session.execute(
        select(IssueRow).where(
            IssueRow.id == issue_id,
            IssueRow.review_id == review_id,
            IssueRow.org_id == principal.org_id,
        )
    )).scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "issue.not_found",
                    "message": "No such issue on this review."},
        )
    return row


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/analyze", response_model=Review, status_code=201)
async def analyze(
    request: AnalyzeRequest,
    session: DbSession,
    principal: Principal = Depends(require_permission(Permission.ANALYZE)),
) -> Review:
    """Submit content for the full deterministic review workflow."""
    review = await analyze_content(
        session, principal.org_id, principal.user_id, principal.name, request
    )
    await session.commit()  # commit BEFORE the response — teardown is too late
    return review


@router.post("/checks/preview", response_model=ChecksPreviewResponse)
async def checks_preview(
    request: ChecksPreviewRequest, principal: CurrentUser, session: DbSession
) -> ChecksPreviewResponse:
    """Deterministic-only dry run (no persistence) — intake screen helper."""
    version, sections, facts = await load_org_context(session, principal.org_id)
    ctx = CheckContext(
        org_id=principal.org_id, guideline_version=version,
        sections=sections, certified_terms=certified_terms_from(facts),
    )
    return ChecksPreviewResponse(issues=run_checks(request.text, ctx))


@router.get("/{review_id}", response_model=Review)
async def get_review(
    review_id: str, principal: CurrentUser, session: DbSession
) -> Review:
    row_review, issue_rows, sections = await load_review(
        principal.org_id, review_id, session
    )
    return review_contract(row_review, issue_rows, sections)


@router.post("/{review_id}/issues/{issue_id}/resolve", response_model=Review)
async def resolve_issue(
    review_id: str,
    issue_id: str,
    action: IssueAction,
    session: DbSession,
    principal: Principal = Depends(require_permission(Permission.RESOLVE_ISSUE)),
) -> Review:
    """Accept the finding as-is, or record an applied edit + replacement."""
    issue_row = await _get_issue(principal, review_id, issue_id, session)
    if issue_row.status == IssueStatus.DISMISSED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error_code": "issue.dismissed",
                    "message": "Re-open a dismissed issue before resolving it."},
        )
    issue_row.status = action.status.value
    if action.replacement is not None:
        issue_row.replacement = action.replacement
    await graph_service.record(
        session, principal.org_id, principal.name, "issue.resolved", issue_id,
        {"status": action.status.value},
    )
    reviewed = await _refresh(review_id, principal, session)
    await session.commit()
    return reviewed


@router.post("/{review_id}/issues/{issue_id}/dismiss", response_model=Review)
async def dismiss_issue(
    review_id: str,
    issue_id: str,
    request: DismissRequest,
    session: DbSession,
    principal: Principal = Depends(require_permission(Permission.DISMISS_ISSUE)),
) -> Review:
    """Dismiss with a reason — the reason is the fuel for learning proposals."""
    issue_row = await _get_issue(principal, review_id, issue_id, session)
    issue_row.status = IssueStatus.DISMISSED.value
    issue_row.reason = request.reason
    await graph_service.record(
        session, principal.org_id, principal.name, "issue.dismissed", issue_id,
        {"reason": request.reason[:280]},
    )
    reviewed = await _refresh(review_id, principal, session)
    await session.commit()
    return reviewed


@router.post("/{review_id}/issues/{issue_id}/reopen", response_model=Review)
async def reopen_issue(
    review_id: str,
    issue_id: str,
    session: DbSession,
    principal: Principal = Depends(require_permission(Permission.RESOLVE_ISSUE)),
) -> Review:
    issue_row = await _get_issue(principal, review_id, issue_id, session)
    issue_row.status = IssueStatus.OPEN.value
    issue_row.reason = None
    issue_row.replacement = None
    reviewed = await _refresh(review_id, principal, session)
    await session.commit()
    return reviewed


@router.post("/{review_id}/send-for-approval", response_model=Review)
async def send_for_approval(
    review_id: str,
    session: DbSession,
    principal: Principal = Depends(require_permission(Permission.SEND_FOR_APPROVAL)),
) -> Review:
    """Route the review to an approver — server-side risk gate (blueprint
    §4.6): unresolved HIGH findings block the hand-off deterministically."""
    row_review, issue_rows, sections = await load_review(
        principal.org_id, review_id, session
    )
    _ = sections
    open_rows = [i for i in issue_rows if i.status == IssueStatus.OPEN.value]
    blocking = [i for i in open_rows if i.severity == Severity.HIGH.value]

    if blocking:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error_code": "route.escalate",
                "message": f"{len(blocking)} unresolved high-severity finding(s) "
                "block approval. Resolve them, or the review is escalated to "
                "its policy owner.",
                "route": "escalate",
                "open_high": [i.id for i in blocking],
                "open_medium": [
                    i.id for i in open_rows if i.severity == Severity.MEDIUM.value
                ],
            },
        )

    # A fresh waiting lane replaces any previous waiting entry.
    for row in (await session.execute(
        select(Approval).where(
            Approval.review_id == review_id, Approval.org_id == principal.org_id,
            Approval.state == ApprovalState_.WAITING.value,
        )
    )).scalars().all():
        await session.delete(row)

    # Dedicated approvers first (Maya), admins second — assignment must be
    # deterministic and must not jump to an admin when an approver exists.
    approver = (await session.execute(
        select(UserRow).where(
            UserRow.org_id == principal.org_id, UserRow.role == "approver"
        ).order_by(UserRow.created_at, UserRow.id)
    )).scalars().first()
    if approver is None:
        approver = (await session.execute(
            select(UserRow).where(
                UserRow.org_id == principal.org_id, UserRow.role == "admin"
            ).order_by(UserRow.created_at, UserRow.id)
        )).scalars().first()
    if approver is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error_code": "approval.no_approver",
                    "message": "No approver exists in this org yet."},
        )
    session.add(Approval(
        id=f"apr-{review_id}", org_id=principal.org_id, review_id=review_id,
        approver_id=approver.id, state=ApprovalState_.WAITING.value,
    ))
    row_review.status = ReviewStatus.READY_FOR_APPROVAL.value
    await graph_service.record(
        session, principal.org_id, principal.name,
        "approval.requested", review_id, {},
    )
    reviewed = await _refresh(review_id, principal, session)
    await session.commit()
    return reviewed
