"""Semantic review (Layer 2) — grounding, downgrade, cap, and failure behavior.

No network in these tests: the chat client is injected as a stub, so the
citation contract (cited → kept, unresolvable clause → advisory, unfindable
quote → dropped, failure → empty) is pinned deterministically.
"""

import json
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

import httpx
import pytest

from app.contracts import GuidelineSection, ProofFact, SectionInput
from app.services.llm_review import _build_issue, semantic_findings
from app.services.retrieval import RetrievedPassage
from app.settings import Settings

RULES = {
    "4.2": GuidelineSection(
        number="4.2", label="Superlatives",
        text="Do not use superlatives you cannot verify.", clarity=90,
    ),
    "3.1": GuidelineSection(
        number="3.1", label="Physiology",
        text="Claims about the body require an approved fact.", clarity=90,
    ),
}

SECTIONS = [
    SectionInput(heading="Hook", body="The best cold brew in America, surely."),
    SectionInput(heading="Proof", body="USDA Organic certified."),
]

FACTS = [
    ProofFact(id="f1", claim="USDA Organic certified", verified="verified", source="cert"),
]

CITED: dict[str, Any] = {
    "section": 0,
    "quote": "best cold brew in America",
    "category": "promotional",
    "severity": "medium",
    "confidence": 0.9,
    "headline": "Unverifiable superlative",
    "detail": "The guideline disallows superlatives the brand cannot prove.",
    "suggested": "A cold brew we can stand behind.",
    "clause": "4.2",
}


def _settings(**kwargs: Any) -> Settings:
    return Settings(
        llm_provider="openrouter",
        openrouter_api_key="stub-key",
        llm_model="test/stub-model:free",
        **kwargs,
    )


def _payload(findings: list[dict[str, Any]]) -> str:
    return json.dumps({"findings": findings})


def _stub_client(content: str) -> SimpleNamespace:
    """Async chat client stub returning one completion with ``content``."""
    response = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
    )
    create = AsyncMock(return_value=response)
    return SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))


def _stub_client_failing(exc: Exception) -> SimpleNamespace:
    create = AsyncMock(side_effect=exc)
    return SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))


async def test_cited_finding_is_kept_with_citation() -> None:
    issues, meta = await semantic_findings(
        SECTIONS, RULES, FACTS, "v2.3", _settings(),
        client=_stub_client(_payload([CITED])),
    )
    assert len(issues) == 1
    issue = issues[0]
    assert issue.citation is not None
    assert issue.citation.clause == "4.2"
    assert issue.agent == "llm:stub-model:free"
    assert issue.status.value == "open"
    assert issue.section_id == "0"
    assert meta["kept_cited"] == 1
    assert meta["dropped"] == 0


async def test_uncited_finding_becomes_explicit_advisory() -> None:
    raw = dict(CITED, clause=None)
    issues, meta = await semantic_findings(
        SECTIONS, RULES, FACTS, "v2.3", _settings(),
        client=_stub_client(_payload([raw])),
    )
    issue = issues[0]
    assert issue.citation is None
    assert issue.agent == "advisory"
    assert issue.detail.startswith("[advisory, uncited]")
    assert issue.confidence < 0.9  # discounted: nothing to verify against
    assert meta["kept_advisory"] == 1


async def test_hallucinated_clause_is_downgraded_not_trusted() -> None:
    raw = dict(CITED, clause="9.9")
    issues, meta = await semantic_findings(
        SECTIONS, RULES, FACTS, "v2.3", _settings(),
        client=_stub_client(_payload([raw])),
    )
    assert issues[0].citation is None
    assert issues[0].agent == "advisory"
    assert meta["kept_advisory"] == 1


async def test_unfindable_quote_is_dropped() -> None:
    raw = dict(CITED, quote="text that appears nowhere in any section body")
    issues, meta = await semantic_findings(
        SECTIONS, RULES, FACTS, "v2.3", _settings(),
        client=_stub_client(_payload([raw])),
    )
    assert issues == []
    assert meta["dropped"] == 1


async def test_bad_severity_is_dropped() -> None:
    raw = dict(CITED, severity="catastrophic")
    issues, meta = await semantic_findings(
        SECTIONS, RULES, FACTS, "v2.3", _settings(),
        client=_stub_client(_payload([raw])),
    )
    assert issues == []
    assert meta["dropped"] == 1


async def test_cap_enforced() -> None:
    body = SectionInput(
        heading="Hook",
        body="Alpha claim one here. Bravo claim two here. "
             "Charlie claim three here. Delta claim four here.",
    )
    raws = [
        dict(CITED, quote=quote)
        for quote in ("Alpha claim one here", "Bravo claim two here",
                      "Charlie claim three here", "Delta claim four here")
    ]
    issues, meta = await semantic_findings(
        [body], RULES, FACTS, "v2.3", _settings(llm_max_issues=2),
        client=_stub_client(_payload(raws)),
    )
    assert len(issues) == 2
    assert meta["raw"] == 4
    assert meta["kept_cited"] == 2


async def test_code_fenced_json_is_tolerated() -> None:
    content = "```json\n" + _payload([CITED]) + "\n```"
    issues, meta = await semantic_findings(
        SECTIONS, RULES, FACTS, "v2.3", _settings(),
        client=_stub_client(content),
    )
    assert len(issues) == 1
    assert meta["status"] == "ok"


async def test_provider_failure_yields_empty_and_meta_error() -> None:
    issues, meta = await semantic_findings(
        SECTIONS, RULES, FACTS, "v2.3", _settings(),
        client=_stub_client_failing(RuntimeError("upstream down")),
    )
    assert issues == []
    assert meta["status"].startswith("error: RuntimeError")


async def test_empty_response_is_recorded_not_raised() -> None:
    issues, meta = await semantic_findings(
        SECTIONS, RULES, FACTS, "v2.3", _settings(),
        client=_stub_client(""),
    )
    assert issues == []
    assert meta["status"].startswith("error: ValueError")


async def test_brief_carries_the_whole_record() -> None:
    """The model sees every agent's knowledge: clauses, facts, evidence, findings."""
    known = _build_issue(CITED, SECTIONS, RULES, "v2.3", "llm:stub-model", "stub-model")
    assert known is not None
    passage = RetrievedPassage(
        chunk_id="ch-1", source_type="fact", source_id="f1", ordinal=0,
        text="USDA Organic certified", dense_score=0.4, keyword_score=0.1,
        combined_score=0.5,
    )
    raw = dict(CITED, quote="USDA Organic certified", section=1)
    client = _stub_client(_payload([raw]))
    issues, meta = await semantic_findings(
        SECTIONS, RULES, FACTS, "v2.3", _settings(), client=client,
        known_issues=[known], evidence={0: [passage]},
    )
    assert len(issues) == 1
    assert meta["duplicates"] == 0
    prompt = client.chat.completions.create.call_args.kwargs["messages"][1]["content"]
    assert "FINDINGS ALREADY ON RECORD" in prompt
    assert known.headline in prompt
    assert "RETRIEVED EVIDENCE" in prompt
    assert "(fact, score 0.50)" in prompt


async def test_duplicate_of_recorded_finding_is_dropped() -> None:
    known = _build_issue(CITED, SECTIONS, RULES, "v2.3", "llm:stub-model", "stub-model")
    assert known is not None
    raws = [
        dict(CITED, headline="Same span again"),
        dict(CITED, quote="best cold brew", headline="Token-overlap variant"),
    ]
    issues, meta = await semantic_findings(
        SECTIONS, RULES, FACTS, "v2.3", _settings(),
        client=_stub_client(_payload(raws)), known_issues=[known],
    )
    assert issues == []
    assert meta["duplicates"] == 2


# ---------------------------------------------------------------------------
# Pipeline wiring — the stage runs when configured, stays silent otherwise.
# ---------------------------------------------------------------------------


async def test_pipeline_runs_semantic_review_when_configured(
    client: httpx.AsyncClient, tokens: dict[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.workflow import pipeline as pipeline_mod

    posted = [
        SectionInput(heading="Hook", body="Our harvest-moon roast lands Friday.")
    ]
    raw = dict(CITED, quote="harvest-moon roast", section=0)
    stub_issue = _build_issue(raw, posted, RULES, "v2.3", "llm:stub-model", "stub-model")
    assert stub_issue is not None and stub_issue.citation is not None

    async def fake_findings(**kwargs: Any) -> tuple[list[Any], dict[str, Any]]:
        assert kwargs["guideline_version"] == "v2.3"
        return [stub_issue], {"model": "stub", "status": "ok"}

    monkeypatch.setattr(pipeline_mod, "get_settings", lambda: _settings())
    monkeypatch.setattr(pipeline_mod, "semantic_findings", fake_findings)

    resp = await client.post(
        "/reviews/analyze",
        headers={"Authorization": f"Bearer {tokens['creator']}"},
        json={
            "title": "LLM lane probe",
            "channel": "Email",
            "sections": [{"heading": "Hook", "body": "Our harvest-moon roast lands Friday."}],
        },
    )
    assert resp.status_code == 201
    agents = [i["agent"] for i in resp.json()["issues"]]
    assert "llm:stub-model" in agents


async def test_pipeline_stays_deterministic_without_provider(
    client: httpx.AsyncClient, tokens: dict[str, str]
) -> None:
    resp = await client.post(
        "/reviews/analyze",
        headers={"Authorization": f"Bearer {tokens['creator']}"},
        json={
            "title": "Deterministic lane probe",
            "channel": "Email",
            "sections": [{"heading": "Hook", "body": "Best cold brew in America."}],
        },
    )
    assert resp.status_code == 201
    agents = [i["agent"] for i in resp.json()["issues"]]
    assert not any(a.startswith("llm:") for a in agents)


# ---------------------------------------------------------------------------
# Settings robustness — the boot-crash guard for dashboard-mangled env values.
# ---------------------------------------------------------------------------


def test_cors_env_forms_all_normalize() -> None:
    json_form = Settings(cors_origins='["https://a.vercel.app"]')
    bare = Settings(cors_origins="https://a.vercel.app")
    csv = Settings(cors_origins="https://a.vercel.app, https://b.vercel.app")
    curly = Settings(cors_origins="“https://a.vercel.app”")
    pseudo = Settings(cors_origins="['https://a.vercel.app']")
    assert json_form.cors_origins == ["https://a.vercel.app"]
    assert bare.cors_origins == ["https://a.vercel.app"]
    assert csv.cors_origins == ["https://a.vercel.app", "https://b.vercel.app"]
    assert curly.cors_origins == ["https://a.vercel.app"]
    assert pseudo.cors_origins == ["https://a.vercel.app"]
    assert Settings().cors_origins[0] == "http://localhost:3000"  # default intact
