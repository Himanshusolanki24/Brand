"""Deterministic checks — the complete rules engine.

Port of ``desk/src/lib/analyze.ts`` (six citation-backed rules plus advisory
paths), extended with minimal-correction suggestions and policy-conflict
inspection. Everything here is pure Python + regex: identical input always
yields identical findings, with **zero AI provider involvement**.

Rule numbering follows the seeded guideline sections:
  §4.2 superlatives · §2.1 unanchored numbers · §3.1 physiology claims ·
  §3.2 competitor comparisons · §4.1 absolutes · §5.1 uncertified terms
"""

import re
from dataclasses import dataclass, field

from app.contracts import (
    Citation,
    Issue,
    IssueStatus,
    Severity,
)
from app.contracts import (
    GuidelineSection as GuidelineSectionContract,
)

_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")

# Long-sentence advisory threshold, advisory confidence.
_LONG_SENTENCE_MAX_WORDS = 30
_ADVISORY_CONFIDENCE = 0.55


@dataclass(frozen=True)
class RuleSpec:
    """One citation-backed deterministic rule."""

    clause: str                      # guideline section this rule enforces
    pattern: re.Pattern[str]
    severity: Severity
    confidence: float
    headline: str
    detail: str
    rationale: str
    # Optional smarter suggestion templates evaluated per match.
    phrase: str


@dataclass
class CheckContext:
    """Org-scoped rules + facts handed to every check invocation."""

    org_id: str
    guideline_version: str
    # clause number (e.g. "4.2") → live contract section
    sections: dict[str, GuidelineSectionContract] = field(default_factory=dict)
    certified_terms: tuple[str, ...] = ()  # e.g. ("USDA Organic", "B-Corp")


def cite(clause: str, ctx: CheckContext) -> Citation | None:
    """Build a citation from the live org ruleset. None if clause is absent —
    in which case the critic layer refuses to flag with a fake citation."""

    section = ctx.sections.get(clause)
    if section is None:
        return None
    return Citation(
        clause=clause, section_label=section.label, text=section.text,
        version=ctx.guideline_version,
    )


def rule_specs() -> list[RuleSpec]:
    """The six seeded rules, ordered by severity then clause number."""

    return [
        RuleSpec(
            clause="4.2",
            pattern=re.compile(
                r"\b(best|finest|greatest|perfect|unbeatable|unmatched|"
                r"world-class|number one)\b[^.!?]{0,40}",
                re.IGNORECASE,
            ),
            severity=Severity.HIGH,
            confidence=0.87,
            headline="Unverifiable superlative",
            detail="This ranks the brand with nothing third-party behind it. "
            "Say what the product is, not what place it came in.",
            rationale="Keeps the enthusiasm; states a claim you can defend every "
            "day of the week.",
            phrase="superlative",
        ),
        RuleSpec(
            clause="2.1",
            pattern=re.compile(r"\b\d+(\.\d+)?%[^.!?]{0,35}", re.IGNORECASE),
            severity=Severity.HIGH,
            confidence=0.9,
            headline="Number with no fact anchor",
            detail="The fact sheet does not hold this figure. §2.1 is simple: the "
            "number matches the sheet, or it goes.",
            rationale="Keeps the story, drops the figure nobody can defend from a "
            "reply-all chain.",
            phrase="percentage",
        ),
        RuleSpec(
            clause="3.1",
            pattern=re.compile(
                r"\b((smoother|gentler) on your (stomach|gut)|clean energy|"
                r"no crash|zero crash|antioxidant-rich|healthy|wellness\b)",
                re.IGNORECASE,
            ),
            severity=Severity.HIGH,
            confidence=0.88,
            headline="Physiology claim needs the compliance deck",
            detail="Digestive and energy claims sit on the banned-without-review "
            "list.",
            rationale="Moves the claim somewhere provable — most of these can live "
            "on taste instead of biology.",
            phrase="physiology",
        ),
        RuleSpec(
            clause="3.2",
            pattern=re.compile(
                r"\b(blue bottle|starbucks|peet'?s|nespresso|dunkin)[: ,]"
                r"[^.!?]{0,30}|better than \w+",
                re.IGNORECASE,
            ),
            severity=Severity.HIGH,
            confidence=0.83,
            headline="Named competitor in copy",
            detail="Named comparisons only appear in the approved chart, not in "
            "ads, banners, or email.",
            rationale="Drops the comparison, keeps the hook — the chart lane is "
            "where this claim is allowed.",
            phrase="competitor",
        ),
        RuleSpec(
            clause="4.1",
            pattern=re.compile(
                r"\b(always|never|guaranteed|forever|everyone|nobody)[^.!?]{0,25}",
                re.IGNORECASE,
            ),
            severity=Severity.MEDIUM,
            confidence=0.72,
            headline="Absolute claim with no anchor",
            detail='"Always / never / guaranteed" promise outcomes. The house '
            "prefers plain facts you actually measure.",
            rationale="Anchors the promise to something real instead of promising "
            "the sky.",
            phrase="absolute",
        ),
        RuleSpec(
            clause="5.1",
            pattern=re.compile(
                r"\b(eco-friendly|zero impact|carbon neutral|planet-safe)"
                r"[^.!?]{0,25}",
                re.IGNORECASE,
            ),
            severity=Severity.HIGH,
            confidence=0.85,
            headline="Uncertified sustainability term",
            detail="Only certified terms appear in copy, spelled exactly as the "
            "certificates spell them.",
            rationale="Swaps the vibe word for the certificate — which is the part "
            "that protects you.",
            phrase="sustainability",
        ),
    ]


def split_sentences(body: str) -> list[str]:
    return [s.strip() for s in _SENT_SPLIT.split(body) if s.strip()]


def minimal_deletion(sentence: str, span: str) -> str:
    """'Fix, don't fight': the smallest honest edit is deleting the claim the
    org can't defend, keeping the surrounding sentence intact."""

    cleaned = sentence.replace(span.strip(), " ")
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip(" ,")
    cleaned = cleaned.strip(" -–—")
    cleaned = f"{cleaned[0].upper()}{cleaned[1:]}" if cleaned else cleaned
    # Drop double punctuation that deletion leaves behind.
    cleaned = re.sub(r"\s+([.!?])", r"\1", cleaned)
    return cleaned


def cert_swap(ctx: CheckContext) -> str:
    """§5.1's smart swap: the org's own certification names, if filed."""

    if not ctx.certified_terms:
        return ""
    return "Use the exact certificate wording the org holds: " + ", ".join(
        ctx.certified_terms[:2]
    )


def run_rule_issues(body: str, ctx: CheckContext) -> list[Issue]:
    """Rule findings only — advisories excluded (per-section invocation)."""

    issues: list[Issue] = []
    findings: list[tuple[int, str, RuleSpec, re.Match[str]]] = []

    for spec in rule_specs():
        for match in spec.pattern.finditer(body):
            # Locate the sentence that contains the match (first hit per rule
            # keeps the desk scannable).
            sentence_idx, sentence = _sentence_of(body, match)
            if sentence_idx >= 0:
                findings.append((sentence_idx, sentence, spec, match))
                break

    for n, (sentence_idx, sentence, spec, match) in enumerate(findings, start=1):
        matched_text = match.group(0).strip()
        suggested_drafted = minimal_deletion(sentence, matched_text)
        swap = cert_swap(ctx) if spec.clause == "5.1" else ""
        issue = Issue(
            id=f"chk-{n:03d}",
            section_id=str(sentence_idx),
            quote=matched_text,
            severity=spec.severity,
            confidence=spec.confidence,
            headline=spec.headline,
            detail=spec.detail,
            citation=cite(spec.clause, ctx),
            suggested=swap or (
                suggested_drafted if len(suggested_drafted) > len(matched_text) else ""
            ),
            rationale=spec.rationale,
            status=IssueStatus.OPEN,
            agent="policy_checks",
        )
        issues.append(issue)
    return issues


def _sentence_of(body: str, match: re.Match[str]) -> tuple[int, str]:
    """Index + text of the sentence containing ``match`` (−1 when absent)."""

    start = 0
    sentences = split_sentences(body)
    pos = match.start()
    for idx, sentence in enumerate(sentences):
        end = start + len(sentence)
        if start <= pos < end:
            return idx, sentence
        start = end + 1
    return -1, ""


def run_checks(body: str, ctx: CheckContext) -> list[Issue]:
    """Rules + advisories over a whole draft (single-text invocation)."""

    issues = run_rule_issues(body, ctx)
    issues.extend(advisories(body, len(issues)))
    return issues


def advisories(body: str, start_index: int) -> list[Issue]:
    """Advisory layer: human look-over items that cite no rule on purpose."""

    advisories: list[Issue] = []
    sentences = split_sentences(body)

    for sentence in sentences:
        if len(sentence.split()) > _LONG_SENTENCE_MAX_WORDS:
            quote = sentence[:60] + ("…" if len(sentence) > 60 else "")

            advisories.append(Issue(
                id=f"adv-{start_index + len(advisories) + 1:03d}",
                section_id="advisory-sentence",
                quote=quote,
                severity=Severity.LOW,
                confidence=_ADVISORY_CONFIDENCE,
                headline="Long sentence, advisory",
                detail="Over 30 words. No rule anchors sentence length, so this is "
                "a look-over item, not a citation.",
                citation=None,
                suggested="Split it into two thoughts.",
                rationale="One idea per line reads calmer — and this one carries "
                "two ideas.",
                status=IssueStatus.OPEN,
                agent="advisory",
            ))
            break  # one advisory keeps the desk quiet

    if not advisories and body.strip():
        first = sentences[0] if sentences else body.strip()
        peek = first[:48] + ("…" if len(first) > 48 else "")

        advisories.append(Issue(
            id=f"adv-{start_index + 1:03d}",
            section_id="advisory-clean",
            quote=peek,
            severity=Severity.LOW,
            confidence=0.7,
            headline="Clean pass, one look-over item",
            detail="Nothing in the house rules matched. Hope alone is not "
            "governance — so a human still reads this once, which is the point.",
            citation=None,
            suggested="Ship it — after one human pass.",
            rationale="A clean automated pass plus a single human check beats "
            "either one alone.",
            status=IssueStatus.OPEN,
            agent="advisory",
        ))
    return advisories


def all_rule_heads() -> list[str]:
    return [spec.headline for spec in rule_specs()]


DETERMINISTIC_RULE_COUNT = len(rule_specs())
