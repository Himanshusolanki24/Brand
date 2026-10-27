"""SQLAlchemy 2.0 models.

Every tenant-owned table carries ``org_id`` and every repository query is
scoped through :func:`app.auth.deps` so one organisation's data can never
reach another's — server-side, never client-side.

Postgres note: when BRANDPROOF_DATABASE_URL points at PostgreSQL 16+ with the
pgvector extension, migrations/migrations_pgvector.sql provisions the chunk
embedding column and HNSW index; the demo SQLite path stores vectors as JSON
and computes hybrid retrieval in-process.
"""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    """Declarative base with JSON-serializable ids."""


def pk() -> Mapped[str]:
    """String PK with an automatic random id when a caller omits one."""
    import uuid

    return mapped_column(
        String(40),
        primary_key=True,
        default=lambda: uuid.uuid4().hex[:12],
    )


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = pk()
    name: Mapped[str] = mapped_column(String(120))


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = pk()
    org_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("organizations.id"), index=True
    )
    email: Mapped[str] = mapped_column(String(180), index=True)
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(20))  # Role enum value
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (UniqueConstraint("org_id", "email", name="uq_user_org_email"),)


class GuidelineVersion(Base):
    __tablename__ = "guideline_versions"

    id: Mapped[str] = pk()
    org_id: Mapped[str] = mapped_column(String(40), index=True)
    brand: Mapped[str] = mapped_column(String(120))
    version: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="approved")


class GuidelineSection(Base):
    """A versioned brand rule. Effective/expiry metadata powers the
    deterministic Policy Conflict Detector."""

    __tablename__ = "guideline_sections"

    id: Mapped[str] = pk()
    org_id: Mapped[str] = mapped_column(String(40), index=True)
    version_id: Mapped[str] = mapped_column(String(40), ForeignKey("guideline_versions.id"))
    number: Mapped[str] = mapped_column(String(10))  # e.g. "4.2"
    label: Mapped[str] = mapped_column(String(120))
    text: Mapped[str] = mapped_column(Text)
    clarity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    effective_from: Mapped[str | None] = mapped_column(String(10), nullable=True)  # ISO date
    expires_on: Mapped[str | None] = mapped_column(String(10), nullable=True)
    owner: Mapped[str | None] = mapped_column(String(120), nullable=True)


class ProofFact(Base):
    """Evidence source — approved claims with verification dates."""

    __tablename__ = "proof_facts"

    id: Mapped[str] = pk()
    org_id: Mapped[str] = mapped_column(String(40), index=True)
    claim: Mapped[str] = mapped_column(Text)
    verified: Mapped[str] = mapped_column(String(10))  # ISO date
    source: Mapped[str] = mapped_column(String(200))


class ProofTerm(Base):
    __tablename__ = "proof_terms"

    id: Mapped[str] = pk()
    org_id: Mapped[str] = mapped_column(String(40), index=True)
    term: Mapped[str] = mapped_column(String(160))
    definition: Mapped[str] = mapped_column(Text)


class ProofAsset(Base):
    __tablename__ = "proof_assets"

    id: Mapped[str] = pk()
    org_id: Mapped[str] = mapped_column(String(40), index=True)
    name: Mapped[str] = mapped_column(String(200))
    kind: Mapped[str] = mapped_column(String(40))
    note: Mapped[str] = mapped_column(Text)


class ContentItem(Base):
    __tablename__ = "content_items"

    id: Mapped[str] = pk()
    org_id: Mapped[str] = mapped_column(String(40), index=True)
    title: Mapped[str] = mapped_column(String(200))
    author_id: Mapped[str] = mapped_column(String(40), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ContentVersion(Base):
    __tablename__ = "content_versions"

    id: Mapped[str] = pk()
    org_id: Mapped[str] = mapped_column(String(40), index=True)
    item_id: Mapped[str] = mapped_column(String(40), ForeignKey("content_items.id"))
    ordinal: Mapped[int] = mapped_column(Integer, default=1)
    # [{id, heading, body}] — list-typed JSON payload.
    body_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[str] = pk()
    org_id: Mapped[str] = mapped_column(String(40), index=True)
    item_id: Mapped[str] = mapped_column(String(40), ForeignKey("content_items.id"))
    title: Mapped[str] = mapped_column(String(200), default="")
    version_ordinal: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(30), default="in_review")
    channel: Mapped[str] = mapped_column(String(20))
    author: Mapped[str] = mapped_column(String(120))
    submitted_at: Mapped[int] = mapped_column(Integer)  # epoch ms for contract parity
    policy_version: Mapped[str] = mapped_column(String(20), default="v2.3")
    approver_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    returned_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # Risk router outcome: pass | review | escalate
    route: Mapped[str | None] = mapped_column(String(20), nullable=True)


class Issue(Base):
    """A finding. Every cited issue carries rule + evidence traceback."""

    __tablename__ = "issues"

    id: Mapped[str] = pk()
    org_id: Mapped[str] = mapped_column(String(40), index=True)
    review_id: Mapped[str] = mapped_column(String(40), ForeignKey("reviews.id"), index=True)
    section_id: Mapped[str] = mapped_column(String(40))
    quote: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(10))
    confidence: Mapped[float] = mapped_column(Float)
    headline: Mapped[str] = mapped_column(String(200))
    detail: Mapped[str] = mapped_column(Text)
    citation_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    suggested: Mapped[str] = mapped_column(Text, default="")
    rationale: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(12), default="open")
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    replacement: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    verification: Mapped[str | None] = mapped_column(String(20), nullable=True)
    agent: Mapped[str] = mapped_column(String(40), default="policy_checks")


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[str] = pk()
    org_id: Mapped[str] = mapped_column(String(40), index=True)
    review_id: Mapped[str] = mapped_column(String(40), ForeignKey("reviews.id"), index=True)
    approver_id: Mapped[str] = mapped_column(String(40), ForeignKey("users.id"))
    state: Mapped[str] = mapped_column(String(12), default="waiting")
    signed_at: Mapped[int | None] = mapped_column(Integer, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    manifest_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)


class LearningProposal(Base):
    """Reviewer feedback distilled into draft policy language.

    Kept strictly separate from approved rules until an authorised approver
    ratifies it — the 'approval-gated learning' safeguard.
    """

    __tablename__ = "learning_proposals"

    id: Mapped[str] = pk()
    org_id: Mapped[str] = mapped_column(String(40), index=True)
    clause: Mapped[str] = mapped_column(String(10))
    based_on: Mapped[str] = mapped_column(Text)
    draft: Mapped[str] = mapped_column(Text)
    state: Mapped[str] = mapped_column(String(12), default="proposed")


class KnowledgeChunk(Base):
    """Ingested + chunked text with its embedding.

    SQLite demo: ``embedding`` = JSON array. Postgres: mirrored into a
    pgvector column by migrations/migrations_pgvector.sql.
    """

    __tablename__ = "knowledge_chunks"

    id: Mapped[str] = pk()
    org_id: Mapped[str] = mapped_column(String(40), index=True)
    source_type: Mapped[str] = mapped_column(String(20))  # guideline | fact | term
    source_id: Mapped[str] = mapped_column(String(40))
    ordinal: Mapped[int] = mapped_column(Integer, default=0)
    text: Mapped[str] = mapped_column(Text)
    token_count: Mapped[int] = mapped_column(Integer, default=0)
    embedding: Mapped[list[float]] = mapped_column(JSON)
    embedding_model: Mapped[str] = mapped_column(String(60))


class AuditEvent(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = pk()
    org_id: Mapped[str] = mapped_column(String(40), index=True)
    actor: Mapped[str] = mapped_column(String(200))
    action: Mapped[str] = mapped_column(String(60))
    subject: Mapped[str] = mapped_column(String(80))
    meta: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class TrustEdge(Base):
    """Relational Trust Graph — content↔claim↔evidence↔rule↔decision links."""

    __tablename__ = "trust_edges"

    id: Mapped[str] = pk()
    org_id: Mapped[str] = mapped_column(String(40), index=True)
    review_id: Mapped[str] = mapped_column(String(40), index=True)
    src_kind: Mapped[str] = mapped_column(String(30))
    src_id: Mapped[str] = mapped_column(String(60))
    rel: Mapped[str] = mapped_column(String(30))
    dst_kind: Mapped[str] = mapped_column(String(30))
    dst_id: Mapped[str] = mapped_column(String(60))
