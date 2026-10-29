"""Semantic review (Layer 2) — the grounded model pass.

The deterministic layer (``app.checks.engine``) catches what regex can. This
stage catches what regex cannot: tone drift from the guideline voice, messaging
that contradicts the brand's positioning, superlative and comparison claims
phrased in novel ways. Its contract is the same as every other finding's —
**cite the clause, or ride as an explicit advisory.**

Grounding rules enforced here (in code, not just prompted):

* a finding's ``quote`` must be a verbatim substring of the submitted section
  body — a paraphrased quote is dropped, not "fixed up";
* a finding's ``clause`` must exist in the org's live ruleset to become a
  citation — anything else is downgraded to ``advisory, uncited``;
* the pipeline's critic stage re-validates every citation against the live
  ruleset anyway, so a hallucinated clause is dropped like any other bad cite.

The stage is additive and best-effort: any provider error, timeout, or
malformed response yields zero findings and a trace entry — the engine's
deterministic behavior is never degraded by the model layer.
"""

import json
import time
from typing import Any

from openai import AsyncOpenAI

from app.contracts import (
    Citation,
    GuidelineSection,
    Issue,
    IssueStatus,
    ProofFact,
    SectionInput,
    Severity,
)
from app.settings import Settings

_SYSTEM_PROMPT = """\
You are the semantic reviewer inside BrandProof's governance pipeline. You
flag what deterministic rules cannot: tone drift from the guideline voice,
messaging that contradicts the brand's positioning, superlative or comparison
claims phrased in novel ways, promotional exaggeration.

Grounding contract (non-negotiable):
- Flag ONLY text that a listed clause clearly disallows, or a claim that
  clearly lacks any approved fact.
- "clause" must be a clause number EXACTLY as listed, or null.
- "quote" must be a verbatim substring (at least 8 characters) of the
  section body. Never paraphrase, never trim into the middle of a word.
- Do not invent rules, facts, or figures. When unsure, do not flag.

Respond with ONLY this JSON — no prose, no code fences:
{"findings":[{"section":<section index:int>,"quote":"<verbatim>",
"category":"tone|messaging|claim|promotional","severity":"low|medium|high",
"confidence":<0.0-1.0>,"headline":"<max 90 chars>","detail":"<why, citing the
rule in your own words>","suggested":"<corrected sentence that preserves the
author's meaning>","clause":"<clause number or null>"}]}
"""

_MAX_SECTION_CHARS = 4_000
_MAX_CLAUSE_CHARS = 400
_VALID_SEVERITY = {"low", "medium", "high"}


def _digest_rules(rules: dict[str, GuidelineSection]) -> str:
    lines = [
        f"§{number} — {section.label}: {section.text[:_MAX_CLAUSE_CHARS]}"
        for number, section in sorted(rules.items())
    ]
    return "\n".join(lines)


def _digest_facts(facts: list[ProofFact]) -> str:
    if not facts:
        return "(none — every checkable claim is unsupported by definition)"
    return "\n".join(f"[{fact.id}] {fact.claim}" for fact in facts)


def _digest_content(sections: list[SectionInput]) -> str:
    return "\n\n".join(
        f"SECTION {idx} — {section.heading}:\n{section.body[:_MAX_SECTION_CHARS]}"
        for idx, section in enumerate(sections)
    )


def _extract_json(raw: str) -> dict[str, Any]:
    """Tolerant JSON extraction: strips code fences and surrounding prose."""
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("no JSON object in model response")
    parsed = json.loads(text[start : end + 1])
    if not isinstance(parsed, dict):
        raise ValueError("model response is not a JSON object")
    return parsed


def _verbatim_locate(quote: str, body: str) -> tuple[int, int] | None:
    """Exact substring first, then case-insensitive — else give up (no fixup)."""
    pos = body.find(quote)
    if pos >= 0:
        return pos, pos + len(quote)
    lowered_pos = body.lower().find(quote.lower())
    if lowered_pos >= 0:
        return lowered_pos, lowered_pos + len(quote)
    return None


def _build_issue(
    raw: dict[str, Any],
    sections: list[SectionInput],
    rules: dict[str, GuidelineSection],
    guideline_version: str,
    agent_cited: str,
    model_name: str,
) -> Issue | None:
    """Validate one raw model finding into a contract Issue, or None to drop."""
    if not isinstance(raw, dict):
        return None

    idx = raw.get("section")
    quote = raw.get("quote")
    if not isinstance(idx, int) or not isinstance(quote, str):
        return None
    if idx < 0 or idx >= len(sections):
        return None
    body = sections[idx].body
    if len(quote) < 8:
        return None
    span = _verbatim_locate(quote, body)
    if span is None:
        return None  # a quote we cannot find verbatim is not a finding
    quote = body[span[0] : span[1]]  # normalise case for the case-insensitive hit

    severity_raw = raw.get("severity")
    if not isinstance(severity_raw, str) or severity_raw.lower() not in _VALID_SEVERITY:
        return None
    try:
        confidence = min(1.0, max(0.0, float(raw.get("confidence", 0.5))))
    except (TypeError, ValueError):
        confidence = 0.5
    headline = str(raw.get("headline", ""))[:140].strip()
    detail = str(raw.get("detail", ""))[:600].strip()
    suggested = str(raw.get("suggested", ""))[:600].strip()
    if not headline:
        return None

    clause_raw = raw.get("clause")
    clause = clause_raw.strip() if isinstance(clause_raw, str) else None
    section = rules.get(clause) if clause else None

    if section is not None:
        return Issue(
            id=f"llm-{int(time.time() * 1000)}-{abs(hash(quote)) % 10_000}",
            section_id=str(idx),
            quote=quote,
            severity=Severity(severity_raw.lower()),
            confidence=round(confidence, 2),
            headline=headline,
            detail=detail,
            citation=Citation(
                clause=clause or "", section_label=section.label,
                text=section.text, version=guideline_version,
            ),
            suggested=suggested,
            rationale=f"Semantic review ({model_name}): {detail[:180]}",
            status=IssueStatus.OPEN,
            agent=agent_cited,
        )

    # No resolvable clause → advisory, uncited — explicitly labelled, kept only
    # because the critic layer preserves agent == "advisory" findings.
    return Issue(
        id=f"llm-{int(time.time() * 1000)}-{abs(hash(quote)) % 10_000}",
        section_id=str(idx),
        quote=quote,
        severity=Severity(severity_raw.lower()),
        confidence=round(confidence * 0.8, 2),  # discounted: nothing to verify against
        headline=headline,
        detail=f"[advisory, uncited] {detail}",
        citation=None,
        suggested=suggested,
        rationale=f"Semantic review ({model_name}) found no clause that covers "
                  "this — flagged as advisory only.",
        status=IssueStatus.OPEN,
        agent="advisory",
    )


def _model_label(model: str) -> str:
    return model.split("/")[-1]


async def _chat(
    client: Any, settings: Settings, user_prompt: str
) -> str:
    response = await client.chat.completions.create(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=settings.llm_temperature,
        max_tokens=1_600,
    )
    content = response.choices[0].message.content
    if not content:
        raise ValueError("empty model response")
    return str(content)


async def semantic_findings(
    sections: list[SectionInput],
    rules: dict[str, GuidelineSection],
    facts: list[ProofFact],
    guideline_version: str,
    settings: Settings,
    client: Any = None,
) -> tuple[list[Issue], dict[str, Any]]:
    """One grounded model pass over the submitted content.

    ``client`` accepts any OpenAI-compatible async chat client (structural —
    tests inject a stub; production builds an ``AsyncOpenAI`` pointed at the
    configured base URL). Returns ``(issues, meta)``. ``meta`` records what
    happened for the audit trail: model, raw finding count, kept/dropped
    breakdown, and any error. Never raises — a model-layer failure is a
    trace, not an outage.
    """
    meta: dict[str, Any] = {
        "model": settings.llm_model,
        "status": "ok",
        "raw": 0,
        "kept_cited": 0,
        "kept_advisory": 0,
        "dropped": 0,
    }
    try:
        if client is None:
            if settings.openrouter_api_key is None:
                meta["status"] = "error: no openrouter api key configured"
                return [], meta
            client = AsyncOpenAI(
                base_url=settings.openrouter_base_url,
                api_key=settings.openrouter_api_key.get_secret_value(),
                timeout=settings.llm_timeout_seconds,
            )
        user_prompt = (
            f"GUIDELINE CLAUSES (cite these by their §number):\n"
            f"{_digest_rules(rules)}\n\n"
            f"APPROVED FACTS (a claim matching none of these is unsupported):\n"
            f"{_digest_facts(facts)}\n\n"
            f"CONTENT UNDER REVIEW:\n{_digest_content(sections)}\n\n"
            f"Find semantic issues per your grounding contract."
        )
        raw = await _chat(client, settings, user_prompt)
        findings = _extract_json(raw).get("findings", [])
        if not isinstance(findings, list):
            raise ValueError("'findings' is not a list")
        meta["raw"] = len(findings)

        agent_cited = f"llm:{_model_label(settings.llm_model)}"
        issues: list[Issue] = []
        for item in findings:
            if len(issues) >= settings.llm_max_issues:
                break
            issue = _build_issue(
                item, sections, rules, guideline_version,
                agent_cited, _model_label(settings.llm_model),
            )
            if issue is None:
                meta["dropped"] += 1
                continue
            if issue.citation is None:
                meta["kept_advisory"] += 1
            else:
                meta["kept_cited"] += 1
            issues.append(issue)
        return issues, meta
    except Exception as exc:  # noqa: BLE001 — the model layer must never take the review down
        meta["status"] = f"error: {type(exc).__name__}: {exc}"[:300]
        return [], meta
