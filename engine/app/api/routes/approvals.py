"""Approvals — sign, return, and export the deterministic manifest PDF."""

import time

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select

from app.api.routes.reviews import load_review, review_contract
from app.contracts import (
    ApprovalDecisionRequest,
    ApprovalEntry,
    ApprovalState,
    Review,
    ReviewStatus,
)
from app.db.models import Approval as ApprovalRow
from app.db.models import GuidelineVersion
from app.db.models import User as UserRow
from app.security.deps import CurrentUser, DbSession, Principal, require_permission
from app.security.rbac import Permission
from app.services import graph as graph_service
from app.services.manifest_pdf import build_manifest_pdf

router = APIRouter(prefix="/approvals", tags=["approvals"])


async def _approval(
    principal: Principal, approval_id: str, session: DbSession
) -> tuple[ApprovalRow, str]:
    row = (await session.execute(
        select(ApprovalRow).where(
            ApprovalRow.id == approval_id, ApprovalRow.org_id == principal.org_id
        )
    )).scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "approval.not_found",
                    "message": "No such approval lane in this organisation."},
        )
    approver = (await session.execute(
        select(UserRow).where(UserRow.id == row.approver_id)
    )).scalar_one_or_none()
    name = approver.name if approver else principal.name
    return row, name


async def _brand(session: DbSession, org_id: str) -> str:
    gv = (await session.execute(
        select(GuidelineVersion).where(GuidelineVersion.org_id == org_id)
    )).scalars().first()
    return gv.brand if gv else "BrandProof"


def _contract(row: ApprovalRow, approver_name: str) -> ApprovalEntry:
    return ApprovalEntry(
        id=row.id, review_id=row.review_id, approver=approver_name,
        state=ApprovalState(row.state), signed_at=row.signed_at, note=row.note,
    )


async def _decided_guard(
    row: ApprovalRow, principal: Principal, session: DbSession
) -> None:
    if row.state != ApprovalState.WAITING.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error_code": "approval.already_decided",
                    "message": "This lane has already been signed or returned."},
        )
    if principal.name != (await _row_approver_name(row, session)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error_code": "approval.not_assigned",
                    "message": "This lane is assigned to another approver."},
        )
    _ = principal


async def _row_approver_name(row: ApprovalRow, session: DbSession) -> str:
    name = await session.scalar(
        select(UserRow.name).where(UserRow.id == row.approver_id)
    )
    return name or "the assigned approver"


async def _mark_review(
    session: DbSession, org_id: str, review_id: str
) -> Review:
    review_row, issue_rows, sections = await load_review(org_id, review_id, session)
    return review_contract(review_row, issue_rows, sections)


@router.get("/{approval_id}", response_model=ApprovalEntry)
async def get_lane(
    approval_id: str, principal: CurrentUser, session: DbSession
) -> ApprovalEntry:
    row, approver_name = await _approval(principal, approval_id, session)
    return _contract(row, approver_name)


@router.post("/{approval_id}/sign", response_model=ApprovalEntry)
async def sign(
    approval_id: str,
    request: ApprovalDecisionRequest,
    session: DbSession,
    principal: Principal = Depends(require_permission(Permission.SIGN_APPROVAL)),
) -> ApprovalEntry:
    """The approver's signature. Only the seat named on the lane may sign."""
    row, approver_name = await _approval(principal, approval_id, session)
    if row.state != ApprovalState.WAITING.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error_code": "approval.already_decided",
                    "message": "This lane has already been signed or returned."},
        )
    if approver_name != principal.name:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error_code": "approval.not_assigned",
                    "message": "This lane is assigned to another approver."},
        )
    row.state = ApprovalState.SIGNED.value
    row.signed_at = int(time.time() * 1000)
    row.note = None

    review_row, _, _ = await load_review(principal.org_id, row.review_id, session)
    review_row.status = ReviewStatus.APPROVED.value
    await graph_service.record(
        session, principal.org_id, principal.name, "approval.signed",
        row.review_id, {"approver": principal.name},
    )
    await session.commit()
    return _contract(row, approver_name)


@router.post("/{approval_id}/return", response_model=ApprovalEntry)
async def return_changes(
    approval_id: str,
    request: ApprovalDecisionRequest,
    session: DbSession,
    principal: Principal = Depends(require_permission(Permission.SIGN_APPROVAL)),
) -> ApprovalEntry:
    """Return the review to its author with the approver's note."""
    row, approver_name = await _approval(principal, approval_id, session)
    if row.state != ApprovalState.WAITING.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error_code": "approval.already_decided",
                    "message": "This lane has already been signed or returned."},
        )
    if approver_name != principal.name:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error_code": "approval.not_assigned",
                    "message": "This lane is assigned to another approver."},
        )
    note = request.note.strip()
    if not note:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error_code": "approval.note_required",
                    "message": "A return needs a note — the writer has to know why."},
        )
    row.state = ApprovalState.RETURNED.value
    row.note = note

    review_row, _, _ = await load_review(principal.org_id, row.review_id, session)
    review_row.status = ReviewStatus.CHANGES_REQUESTED.value
    review_row.returned_by = principal.name
    review_row.approver_note = note
    await graph_service.record(
        session, principal.org_id, principal.name, "approval.returned",
        row.review_id, {"approver": principal.name},
    )
    await session.commit()
    return _contract(row, approver_name)


@router.get("/{approval_id}/manifest.pdf")
async def export_manifest(
    approval_id: str,
    session: DbSession,
    principal: Principal = Depends(require_permission(Permission.EXPORT_MANIFEST)),
) -> Response:
    """Deterministic approval-manifest PDF for this lane's review."""
    row, approver_name = await _approval(principal, approval_id, session)
    review_row, issue_rows, sections = await load_review(
        principal.org_id, row.review_id, session
    )
    review = review_contract(review_row, issue_rows, sections)
    approval_entry = _contract(row, approver_name)
    data, digest = build_manifest_pdf(
        review=review, approval=approval_entry,
        brand=await _brand(session, principal.org_id),
    )
    row.manifest_sha256 = digest
    await graph_service.record(
        session, principal.org_id, principal.name, "manifest.exported",
        row.review_id, {"sha256": digest},
    )
    await session.commit()
    return Response(
        content=data, media_type="application/pdf",
        headers={
            "Content-Disposition":
                f'attachment; filename="manifest-{approval_id}.pdf"',
            "X-Manifest-SHA256": digest,
        },
    )
