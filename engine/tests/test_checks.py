"""Deterministic checks — golden tests: identical input ⇒ identical findings."""

import pytest

from app.checks.engine import CheckContext, run_checks
from app.contracts import GuidelineSection

RULES = {
    "4.2": ("No unverifiable superlatives", "Never rank the brand"),
    "2.1": ("Numbers match the fact sheet", "Every percentage, weight, date or quantity"),
    "3.1": ("Health and physiology claims", "Digestive, energy, and wellness claims"),
    "3.2": ("Competitor comparisons", "Named competitor comparisons appear"),
    "4.1": ("Every claim needs an anchor", "A claim may stand on a fact sheet entry"),
    "5.1": ("Sustainability language", "Only certified terms appear in copy"),
}


def make_ctx() -> CheckContext:
    sections = {
        clause: GuidelineSection(number=clause, label=label, text=text, clarity=50)
        for clause, (label, text) in RULES.items()
    }
    return CheckContext(
        org_id="org-test", guideline_version="v2.3",
        sections=sections, certified_terms=("USDA Organic",),
    )


SAMPLES: dict[str, str] = {
    "4.2": "We make the best cold brew in America.",
    "2.1": "Our blend is 40% less acidic than theirs.",
    "3.1": "It gives you clean energy with no crash.",
    "3.2": "Better than Starbucks, and we know it.",
    "4.1": "We have always delivered fresh beans.",
    "5.1": "Our packaging is eco-friendly and carbon neutral.",
}

CLEAN_TEXT = "Cold brew from Huila, stepped overnight and flash-chilled. Roast dates on every bag."


@pytest.mark.parametrize("clause,want_fired", [(c, True) for c in RULES])
def test_rule_fires_on_violation(clause: str, want_fired: bool) -> None:
    issues = run_checks(SAMPLES[clause], make_ctx())
    cited = [i for i in issues if i.citation and i.citation.clause == clause]
    assert want_fired is (len(cited) == 1)


def test_deterministic_output_is_stable() -> None:
    ctx = make_ctx()
    first = [i.model_dump(by_alias=True) for i in run_checks(SAMPLES["4.2"], ctx)]
    second = [i.model_dump(by_alias=True) for i in run_checks(SAMPLES["4.2"], ctx)]
    assert first == second


def test_each_finding_cites_its_rule() -> None:
    for clause in RULES:
        issues = run_checks(SAMPLES[clause], make_ctx())
        cited = [i for i in issues if i.citation and i.citation.clause == clause]
        assert cited, f"clause {clause} did not fire"
        issue = cited[0]
        assert issue.agent == "policy_checks"
        assert issue.citation.version == "v2.3"
        assert issue.citation.section_label == RULES[clause][0]


def test_clean_text_yields_advisory_not_citation() -> None:
    issues = run_checks(CLEAN_TEXT, make_ctx())
    assert all(i.citation is None for i in issues)
    assert all(i.agent == "advisory" for i in issues)


def test_absent_rule_is_never_cited() -> None:
    """§6 clause with no matching section ⇒ critic would drop; engine cites None-path."""
    ctx = make_ctx()
    ctx.sections.pop("5.1")
    issues = run_checks(SAMPLES["5.1"], ctx)
    flagged = [i for i in issues if "sustainability" in i.headline.lower()]
    assert flagged and flagged[0].citation is None
