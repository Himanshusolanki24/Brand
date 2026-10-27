"""Policy Conflict Detector — deterministic pass over the ruleset.

Blueprint §4.3: identify contradictory, ambiguous, outdated, or overlapping
rules — without an LLM preference deciding winners. Three detection families:

1. ``expired``        — rule past its expires_on date but still retrievable.
2. ``governance_gap`` — rule missing an owner, or missing an effective date.
3. ``overlap``        — two rules whose scope keywords overlap heavily
                       (Jaccard over content words) and may contradict.

Every conflict carries the rule ids and a human-readable explanation; routing
unresolved conflicts to a policy owner is a separate human step.
"""

import re
from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import GuidelineSection

_STOPWORDS = {
    "the", "a", "an", "is", "are", "or", "and", "of", "to", "in", "on", "for",
    "with", "that", "this", "not", "no", "be", "as", "at", "by", "it", "its",
    "from", "their", "our", "we", "you", "your", "may", "must", "should",
}
_CONTENT_WORD = re.compile(r"[a-zà-ÿ]{4,}", re.IGNORECASE)


@dataclass(frozen=True)
class ConflictFinding:
    kind: str           # expired | governance_gap | overlap | stale_clarity
    rule_ids: list[str]
    numbers: list[str]
    headline: str
    explanation: str
    route_to: str       # owner name, when known


def _content_words(text: str) -> set[str]:
    words = {w.lower() for w in _CONTENT_WORD.findall(text)}
    return words - _STOPWORDS


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def detect_conflicts(sections: list[GuidelineSection], today: date) -> list[ConflictFinding]:
    findings: list[ConflictFinding] = []

    for section in sections:
        # 1. Expired but still retrieved
        if section.expires_on:
            try:
                expiry = date.fromisoformat(section.expires_on)
            except ValueError:
                expiry = None
            if expiry and expiry < today:
                findings.append(ConflictFinding(
                    kind="expired",
                    rule_ids=[section.id],
                    numbers=[section.number],
                    headline="Expired rule is still in the retrievable corpus",
                    explanation=(
                        f"§{section.number} expired on {section.expires_on} but is "
                        f"still indexed. Retrieval should not surface it as an "
                        f"enforcement basis until its status is re-confirmed."
                    ),
                    route_to=section.owner or "the policy owner",
                ))

        # 2. Governance gaps
        if not section.owner:
            findings.append(ConflictFinding(
                kind="governance_gap",
                rule_ids=[section.id],
                numbers=[section.number],
                headline="Rule has no recorded owner",
                explanation=(
                    f"§{section.number} has no owner. Unowned rules cannot be "
                    f"escalated when they're ambiguous — that's a governance "
                    f"gap, not a wording problem."
                ),
                route_to="a brand administrator",
            ))
        if not section.effective_from:
            findings.append(ConflictFinding(
                kind="governance_gap",
                rule_ids=[section.id],
                numbers=[section.number],
                headline="Rule has no effective date",
                explanation=(
                    f"§{section.number} lacks an effective date, so reviews can't "
                    f"prove which version applied at evaluation time."
                ),
                route_to="a brand administrator",
            ))

    # 3. Overlapping scope — deterministic keyword overlap between pairs
    for i, a in enumerate(sections):
        words_a = _content_words(f"{a.label} {a.text}")
        for b in sections[i + 1:]:
            words_b = _content_words(f"{b.label} {b.text}")
            overlap = _jaccard(words_a, words_b)
            # 0.6 is deliberately strict: it suppresses incidental overlap
            # (e.g. both rules mentioning "copy") but still catches near-dupes.
            if overlap >= 0.6:
                findings.append(ConflictFinding(
                    kind="overlap",
                    rule_ids=[a.id, b.id],
                    numbers=[a.number, b.number],
                    headline="Two rules may overlap on the same scope",
                    explanation=(
                        f"§{a.number} and §{b.number} share a high proportion of "
                        f"scope language ({overlap:.0%}). If both can apply to one "
                        f"draft, the tie-break must be human, not a model's "
                        f"preference."
                    ),
                    route_to=a.owner or b.owner or "the policy owner",
                ))

    return findings


def stale_clarity(sections: list[GuidelineSection]) -> list[ConflictFinding]:
    """Optional family: rules whose clarity score is missing."""

    out = []
    for section in sections:
        if section.clarity is None:
            out.append(ConflictFinding(
                kind="stale_clarity",
                rule_ids=[section.id],
                numbers=[section.number],
                headline="Clause has never been clarity-scored",
                explanation=(
                    f"§{section.number} has no clarity score, so the Clarity "
                    f"Radar can't grade what reviewers feel about it."
                ),
                route_to="the radar owner",
            ))
    return out


async def collect_conflicts(
    session: AsyncSession, org_id: str, today: date
) -> list[ConflictFinding]:
    result = await session.execute(
        select(GuidelineSection).where(GuidelineSection.org_id == org_id)
    )
    sections = list(result.scalars().all())
    return detect_conflicts(sections, today)
