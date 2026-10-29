"""Controlled review workflow — deterministic stages, one shared state.

Blueprint architecture: NOT twelve autonomous agents. One orchestrator runs
short, inspectable, mostly-deterministic stages in sequence and records an
agent-run audit trail:

  understanding → policy_checks → evidence → semantic_review → critic → risk_router

Every stage works over the shared ``WorkflowState`` (the blueprint's
"short-term memory"), producing contract objects the desk app and the Trust
Graph can consume without translation. ``semantic_review`` (the grounded
model pass) runs only when an LLM provider is configured — with no key the
engine stays deterministic-only, and its findings face the same critic gate
as every other finding's.
"""

import time
import uuid
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.checks.engine import CheckContext, advisories, run_rule_issues
from app.contracts import (
    AnalyzeRequest,
    ContentSection,
    GuidelineSection,
    Issue,
    IssueStatus,
    ProofFact,
    Review,
    ReviewStatus,
    Severity,
)
from app.db.models import (
    AuditEvent,
    ContentItem,
    ContentVersion,
    GuidelineVersion,
)
from app.db.models import (
    GuidelineSection as GuidelineRow,
)
from app.db.models import (
    Issue as IssueRow,
)
from app.db.models import (
    ProofFact as FactRow,
)
from app.db.models import (
    Review as ReviewRow,
)
from app.db.models import (
    TrustEdge as TrustEdgeRow,
)
from app.services.llm_review import semantic_findings
from app.services.retrieval import RetrievedPassage, get_retriever
from app.settings import get_settings

# Retrieval gates: a passage must clear both to count as real evidence.
_MIN_COMBINED_SCORE = 0.10
_MIN_TOKEN_OVERLAP = 2

_STOP = {"the", "a", "an", "of", "to", "in", "on", "for", "and", "or", "is", "are"}


@dataclass
class StageTrace:
    """One agent-run entry for the audit trail."""

    stage: str
    duration_ms: int
    detail: dict[str, Any] = field(default_factory=dict)


@dataclass
class WorkflowState:
    """Shared workflow state across stages (the blueprint's 'memory')."""

    org_id: str
    actor_name: str
    actor_id: str
    request: AnalyzeRequest
    guideline_version: str = "v2.3"
    sections: dict[str, GuidelineSection] = field(default_factory=dict)
    facts: list[ProofFact] = field(default_factory=list)
    issues: list[Issue] = field(default_factory=list)
    evidence_hits: dict[int, list[RetrievedPassage]] = field(default_factory=dict)
    route: str | None = None
    review: Review | None = None
    traces: list[StageTrace] = field(default_factory=list)


class _StageContext:
    def __init__(self, stage: str, state: WorkflowState) -> None:
        self.stage = stage
        self.state = state
        self.detail: dict[str, Any] = {}
        self._started = 0.0

    async def __aenter__(self) -> "_StageContext":
        self._started = time.perf_counter()
        return self

    async def __aexit__(self, exc_type: object, exc: object, tb: object) -> None:
        duration = int((time.perf_counter() - self._started) * 1000)
        self.state.traces.append(
            StageTrace(stage=self.stage, duration_ms=duration, detail=self.detail)
        )


def _stage(stage_name: str, state: WorkflowState) -> _StageContext:
    return _StageContext(stage_name, state)


async def load_org_context(
    session: AsyncSession, org_id: str
) -> tuple[str, dict[str, GuidelineSection], list[ProofFact]]:
    """Display version + sections-by-number + facts for the org."""

    from app.db.models import GuidelineSection as _GS

    rule_rows = (await session.execute(
        select(GuidelineRow).where(GuidelineRow.org_id == org_id)
    )).scalars().all()
    facts = (await session.execute(
        select(FactRow).where(FactRow.org_id == org_id)
    )).scalars().all()

    version = "v2.3"
    if rule_rows:
        gv = (await session.execute(
            select(GuidelineVersion).where(
                GuidelineVersion.id == rule_rows[0].version_id,
                GuidelineVersion.org_id == org_id,
            )
        )).scalar_one_or_none()
        if gv is not None:
            version = gv.version

    sections = {
        rule.number: GuidelineSection(
            number=rule.number, label=rule.label, text=rule.text, clarity=rule.clarity
        )
        for rule in rule_rows
    }
    fact_contracts = [
        ProofFact(id=f.id, claim=f.claim, verified=f.verified, source=f.source)
        for f in facts
    ]
    _ = _GS  # type guard during development
    return version, sections, fact_contracts


def certified_terms_from(facts: list[ProofFact]) -> tuple[str, ...]:
    """Certifications the org actually holds — the §5.1 smart swap source."""

    certs: list[str] = []
    for fact in facts:
        lowered = fact.claim.lower()
        if "usda organic" in lowered:
            certs.append("USDA Organic")
        if "b-corp" in lowered:
            certs.append("B-Corp")
        if "rainforest" in lowered:
            certs.append("Rainforest Alliance")
        if "fair trade" in lowered:
            certs.append("Fair Trade")
    return tuple(dict.fromkeys(certs))


def token_overlap(a: str, b: str) -> int:
    set_a = {w for w in a.lower().split() if w.isalpha() and w not in _STOP}
    set_b = {w for w in b.lower().split() if w.isalpha() and w not in _STOP}
    return len(set_a & set_b)


def _percentage(text: str) -> float | None:
    import re

    match = re.search(r"(\d+(?:\.\d+)?)\s*%", text)
    return float(match.group(1)) if match else None


# ---------------------------------------------------------------------------
# Stages
# ---------------------------------------------------------------------------


async def stage_policy_checks(state: WorkflowState) -> None:
    """Deterministic rule findings per section, plus whole-content advisories."""

    async with _stage("policy_checks", state):
        ctx = CheckContext(
            org_id=state.org_id,
            guideline_version=state.guideline_version,
            sections=state.sections,
            certified_terms=certified_terms_from(state.facts),
        )
        whole = "\n".join(s.body for s in state.request.sections)

        issues: list[Issue] = []
        for idx, section in enumerate(state.request.sections):
            for issue in run_rule_issues(section.body, ctx):
                issue.section_id = str(idx)
                issues.append(issue)
        issues.extend(advisories(whole, len(issues)))
        state.issues = issues


async def stage_evidence(session: AsyncSession, state: WorkflowState) -> None:
    """Retrieve applicable approved evidence for sections with claim-like
    language (percentages, energy, certification, comparison words)."""

    async with _stage("evidence", state):
        for idx, section in enumerate(state.request.sections):
            lowered = section.body.lower()
            if not any(
                marker in lowered
                for marker in ("%", "energy", "certified", "better than", "compared", "guarantee")
            ):
                continue
            hits = await get_retriever().retrieve(
                session,
                state.org_id,
                f"{section.heading} {section.body}",
                source_types=("fact", "term", "guideline"),
                k=6,
            )
            state.evidence_hits[idx] = hits


async def stage_semantic_review(state: WorkflowState) -> None:
    """Grounded model pass (Layer 2) — additive, best-effort, never required.

    Runs only when the LLM provider is configured; with no key there is no
    network call, no trace, and no failure — the engine stays deterministic-
    only. The model brief carries the desk's whole record at this point:
    clauses, fact sheet, retrieved evidence, and every deterministic finding
    already raised — so it decides with all agents' knowledge and adds depth
    instead of repeating. Findings ride into the critic stage, which enforces
    the citation gate on them exactly as on deterministic findings.
    """

    settings = get_settings()
    if settings.llm_provider != "openrouter" or settings.openrouter_api_key is None:
        return  # no key → Layer 1 only

    async with _stage("semantic_review", state) as ctx:
        issues, meta = await semantic_findings(
            sections=state.request.sections,
            rules=state.sections,
            facts=state.facts,
            guideline_version=state.guideline_version,
            settings=settings,
            known_issues=list(state.issues),
            evidence=state.evidence_hits,
        )
        state.issues.extend(issues)
        ctx.detail = meta


def _match_for_quote(
    quote: str, hits: list[RetrievedPassage], facts: list[ProofFact]
) -> tuple[RetrievedPassage | None, str]:
    """Deterministic applicability: supported / contradicted / unverified.

    Unverified ≠ false — the honest category is preserved, per blueprint §9.1.
    """

    best: RetrievedPassage | None = None
    best_overlap = 0
    for hit in hits:
        if hit.combined_score < _MIN_COMBINED_SCORE:
            continue
        overlap = token_overlap(quote, hit.text)
        if overlap > best_overlap:
            best, best_overlap = hit, overlap
    if best is None or best_overlap < _MIN_TOKEN_OVERLAP:
        return None, "unverified"

    fact = next((f for f in facts if f.id == best.source_id), None)
    if fact is None:
        return best, "supported"  # guideline/term passage: supportive context

    quote_pct = _percentage(quote)
    fact_pct = _percentage(fact.claim)
    if quote_pct is not None and fact_pct is not None and quote_pct != fact_pct:
        return best, "contradicted"
    return best, "supported"


async def stage_critic(state: WorkflowState) -> None:
    """Critic/validation: citations must resolve to live rules; evidence must
    pass applicability gates; advisory items ride with an explicit note."""

    async with _stage("critic", state):
        kept: list[Issue] = []
        for issue in state.issues:
            if issue.citation is None:
                if issue.agent == "advisory":
                    kept.append(issue)  # advisories are citation-free by design
                continue  # otherwise: cite it or don't flag it

            rule = state.sections.get(issue.citation.clause)
            if rule is None:
                continue  # never flag on a rule the org doesn't hold

            fact_hits = [
                hit
                for hits in state.evidence_hits.values()
                for hit in hits
                if hit.source_type == "fact"
            ]
            passage, verdict = _match_for_quote(issue.quote, fact_hits, state.facts)

            if issue.citation.clause == "2.1":
                if verdict == "supported":
                    continue  # number matches the sheet — §2.1 satisfied
                issue.verification = verdict
                if passage is not None and verdict == "contradicted":
                    issue.evidence_ids = [passage.source_id]
                    issue.detail = (
                        f"{issue.detail} A matching fact sheet entry exists with "
                        f"a different figure ('{passage.text}') — contradicted, "
                        f"not merely unverified."
                    )
                else:
                    issue.detail = f"{issue.detail} No fact-sheet entry matches."
            elif issue.citation.clause in {"4.1", "5.1", "3.1"}:
                if passage is not None:
                    issue.evidence_ids = [passage.source_id]
                issue.verification = verdict

            kept.append(issue)
        state.issues = kept


def route_of(state: WorkflowState) -> str:
    """Deterministic routing on open findings (always open at analysis time)."""

    open_issues = [i for i in state.issues if i.status == IssueStatus.OPEN]
    if any(i.severity == Severity.HIGH for i in open_issues):
        return "escalate"
    if any(i.severity == Severity.MEDIUM for i in open_issues):
        return "review"
    return "pass"


async def stage_risk_router(state: WorkflowState) -> None:
    async with _stage("risk_router", state):
        state.route = route_of(state)


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------


async def run_pipeline(session: AsyncSession, state: WorkflowState) -> Review:
    """Run all stages, persist, and return the contract Review."""

    await stage_policy_checks(state)
    await stage_evidence(session, state)
    await stage_semantic_review(state)
    await stage_critic(state)
    await stage_risk_router(state)

    review_id = f"rv-{uuid.uuid4().hex[:8]}"
    item_id = f"ci-{uuid.uuid4().hex[:8]}"

    sections_out = [
        ContentSection(id=f"{review_id}-s{idx}", heading=s.heading, body=s.body)
        for idx, s in enumerate(state.request.sections)
    ]

    issue_rows_out: list[Issue] = []
    for issue in state.issues:
        if issue.agent == "advisory":
            issue.section_id = sections_out[-1].id if sections_out else "none"
        elif issue.section_id.isdigit():
            idx = int(issue.section_id)
            idx = min(max(idx, 0), len(sections_out) - 1) if sections_out else 0
            issue.section_id = sections_out[idx].id
        # The persisted row id IS the wire id — the desk must be able to
        # resolve a finding it was just shown.
        issue.id = f"iss-{uuid.uuid4().hex[:10]}"
        issue_rows_out.append(issue)

    now_ms = int(time.time() * 1000)
    state.review = Review(
        id=review_id,
        title=state.request.title,
        channel=state.request.channel,
        author=state.actor_name,
        submitted_at=now_ms,
        status=ReviewStatus.IN_REVIEW,
        sections=sections_out,
        issues=issue_rows_out,
        policy_version=state.guideline_version,
    )

    session.add(ContentItem(
        id=item_id, org_id=state.org_id, title=state.request.title,
        author_id=state.actor_id,
    ))
    session.add(ContentVersion(
        id=f"cv-{uuid.uuid4().hex[:8]}", org_id=state.org_id, item_id=item_id,
        ordinal=1,
        body_json=[
            {"id": s.id, "heading": s.heading, "body": s.body} for s in sections_out
        ],
    ))
    session.add(ReviewRow(
        id=review_id, org_id=state.org_id, item_id=item_id, version_ordinal=1,
        title=state.request.title,
        status=ReviewStatus.IN_REVIEW.value, channel=state.request.channel.value,
        author=state.actor_name, submitted_at=now_ms,
        policy_version=state.guideline_version, route=state.route,
    ))
    for issue in issue_rows_out:
        session.add(IssueRow(
            id=issue.id, org_id=state.org_id, review_id=review_id,
            section_id=issue.section_id, quote=issue.quote,
            severity=issue.severity.value, confidence=issue.confidence,
            headline=issue.headline, detail=issue.detail,
            citation_json=(
                issue.citation.model_dump(by_alias=True) if issue.citation else None
            ),
            suggested=issue.suggested, rationale=issue.rationale,
            status=issue.status.value,
            evidence_ids=list(issue.evidence_ids),
            verification=issue.verification, agent=issue.agent,
        ))

    edges: list[dict[str, str]] = [
        dict(src_kind="review", src_id=review_id, rel="has_finding",
             dst_kind="issue", dst_id=issue.id)
        for issue in issue_rows_out
    ]
    for issue in issue_rows_out:
        if issue.citation:
            edges.append(dict(
                src_kind="issue", src_id=issue.id, rel="cites",
                dst_kind="rule", dst_id=f"§{issue.citation.clause}",
            ))
        for evidence_id in issue.evidence_ids:
            edges.append(dict(
                src_kind="issue", src_id=issue.id, rel="backed_by",
                dst_kind="evidence", dst_id=evidence_id,
            ))
    for edge in edges:
        session.add(TrustEdgeRow(
            id=f"te-{uuid.uuid4().hex[:10]}", org_id=state.org_id,
            review_id=review_id, **edge,
        ))

    import uuid as _uuid

    session.add(AuditEvent(
        id=f"ae-{_uuid.uuid4().hex[:10]}",
        org_id=state.org_id, actor=state.actor_name, action="review.analyzed",
        subject=review_id,
        meta={
            "stages": [
                {
                    "stage": t.stage,
                    "duration_ms": t.duration_ms,
                    **({"detail": t.detail} if t.detail else {}),
                }
                for t in state.traces
            ],
            "findings": len(issue_rows_out),
            "route": state.route,
            "policy_version": state.guideline_version,
        },
    ))
    return state.review


async def analyze_content(
    session: AsyncSession, org_id: str, actor_id: str, actor_name: str,
    request: AnalyzeRequest,
) -> Review:
    """One-shot workflow entry used by the API route."""

    version, sections, facts = await load_org_context(session, org_id)
    state = WorkflowState(
        org_id=org_id, actor_name=actor_name, actor_id=actor_id,
        request=request, guideline_version=version, sections=sections, facts=facts,
    )
    return await run_pipeline(session, state)
