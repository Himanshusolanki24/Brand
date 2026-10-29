"""Pydantic v2 contract — the single source of truth for the engine's JSON.

Mirrors `desk/src/lib/types.ts` field-for-field. Every model uses a
``to_camel`` alias generator so the wire format matches the frontend contract
exactly (``sectionLabel``, ``submittedAt``, …) while the Python code reads and
writes plain snake_case.
"""

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict


def to_camel(value: str) -> str:
    """``section_label`` -> ``sectionLabel``."""
    first, *rest = value.split("_")
    return first + "".join(word.capitalize() for word in rest)


class APIModel(BaseModel):
    """Base model: snake_case in Python, camelCase on the wire."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
    )


class Role(StrEnum):
    """Server-side roles. The client never gets to *claim* a role."""

    CREATOR = "creator"
    REVIEWER = "reviewer"
    APPROVER = "approver"
    ADMIN = "admin"


class Severity(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class IssueStatus(StrEnum):
    OPEN = "open"
    ACCEPTED = "accepted"
    EDITED = "edited"
    DISMISSED = "dismissed"


class ReviewStatus(StrEnum):
    ANALYZING = "analyzing"
    IN_REVIEW = "in_review"
    CHANGES_REQUESTED = "changes_requested"
    READY_FOR_APPROVAL = "ready_for_approval"
    APPROVED = "approved"


class Channel(StrEnum):
    EMAIL = "Email"
    WEBSITE = "Website"
    PAID_AD = "Paid ad"
    SMS = "SMS"
    DECK = "Deck"


class ApprovalState(StrEnum):
    WAITING = "waiting"
    SIGNED = "signed"
    RETURNED = "returned"


class ProposalState(StrEnum):
    PROPOSED = "proposed"
    RATIFIED = "ratified"


# ---------------------------------------------------------------------------
# Read models (responses)
# ---------------------------------------------------------------------------


class Citation(APIModel):
    """A finding must point at the rule it rests on — cite it or don't flag it."""

    clause: str
    section_label: str
    text: str
    version: str


class GuidelineSection(APIModel):
    number: str
    label: str
    text: str
    clarity: int | None = None


class ProofFact(APIModel):
    """An evidence source: approved, dated, and retrievable via embeddings."""

    id: str
    claim: str
    verified: str
    source: str


class ProofTerm(APIModel):
    id: str
    term: str
    definition: str


class ProofAsset(APIModel):
    id: str
    name: str
    kind: str
    note: str


class ContentSection(APIModel):
    id: str
    heading: str
    body: str


class User(APIModel):
    id: str
    email: str
    name: str
    role: Role
    org_id: str


class Issue(APIModel):
    id: str
    section_id: str
    quote: str
    severity: Severity
    confidence: float
    headline: str
    detail: str
    citation: Citation | None = None
    suggested: str
    rationale: str
    status: IssueStatus
    reason: str | None = None
    replacement: str | None = None
    # Evidence traceback (Trust Graph node ids backing this finding).
    evidence_ids: list[str] = []
    verification: str | None = None  # supported | contradicted | unverified | inconclusive
    agent: str = "policy_checks"


class Review(APIModel):
    id: str
    title: str
    channel: Channel
    author: str
    submitted_at: int
    status: ReviewStatus
    sections: list[ContentSection]
    issues: list[Issue]
    approver_note: str | None = None
    returned_by: str | None = None
    policy_version: str = "v2.3"


class ApprovalEntry(APIModel):
    id: str
    review_id: str
    approver: str
    state: ApprovalState
    signed_at: int | None = None
    note: str | None = None


class Amendment(APIModel):
    """A learning proposal — reviewer feedback turned into draft policy text."""

    id: str
    clause: str
    based_on: str
    draft: str
    state: ProposalState


class ClarityAxisScore(APIModel):
    axis: str
    score: int
    note: str


class WorkspaceSnapshot(APIModel):
    """GET /api/workspace — everything the desk app hydrates from."""

    user: User
    brand: str
    guideline_version: str
    reviews: list[Review]
    guidelines: list[GuidelineSection]
    facts: list[ProofFact]
    terms: list[ProofTerm]
    assets: list[ProofAsset]
    approvals: list[ApprovalEntry]
    amendments: list[Amendment]
    radar: list[ClarityAxisScore]
    engine_info: dict[str, Any]


# ---------------------------------------------------------------------------
# Write models (requests)
# ---------------------------------------------------------------------------


class LoginRequest(APIModel):
    email: str
    role: Role | None = None  # optional, used by the desk's demo role picker


class SectionInput(APIModel):
    heading: str
    body: str


class AnalyzeRequest(APIModel):
    title: str
    channel: Channel
    sections: list[SectionInput]


class ResolveRequest(APIModel):
    status: IssueStatus  # accepted | edited
    replacement: str | None = None


class IssueAction(APIModel):
    """Resolve payload for POST /reviews/{rid}/issues/{iid}/resolve."""

    status: IssueStatus  # accepted | edited
    replacement: str | None = None


class DismissRequest(APIModel):
    reason: str


class ApprovalDecisionRequest(APIModel):
    note: str = ""
    by: str | None = None  # optional display name assertion; server wins


class ChecksPreviewRequest(APIModel):
    text: str


class ChecksPreviewResponse(APIModel):
    issues: list[Issue]


# ---------------------------------------------------------------------------
# Trust graph
# ---------------------------------------------------------------------------


class TrustNode(APIModel):
    id: str
    kind: str  # review | claim | issue | rule | evidence | decision
    label: str
    detail: str | None = None


class TrustEdge(APIModel):
    id: str
    src: str
    dst: str
    rel: str  # cites | backed_by | resolved_by | approved_by | depends_on


class TrustGraph(APIModel):
    nodes: list[TrustNode]
    edges: list[TrustEdge]


# ---------------------------------------------------------------------------
# Deterministic results & machine issues
# ---------------------------------------------------------------------------


class HealthInfo(APIModel):
    status: str = "ok"
    app: str
    database: str
    embedding_provider: str
    embedding_model: str
    llm_provider: str = "none"
    llm_model: str = "none"
    deterministic_checks: int
    version: str
