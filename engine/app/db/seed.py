"""Idempotent demo seed — the Meridian Coffee corpus.

Ported field-for-field from ``desk/src/lib/seed.ts`` so product mode shows the
same workspace as demo mode, plus governance metadata (rule owners, effective
dates, expiry) the frontend seed never needed. Also seeds four RBAC users.
"""

import argparse
import asyncio
import sys
import time
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from sqlalchemy import func, select  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession  # noqa: E402

from app.contracts import Role  # noqa: E402
from app.db.database import get_session_factory, init_db  # noqa: E402
from app.db.models import (  # noqa: E402
    Approval,
    AuditEvent,
    ContentItem,
    ContentVersion,
    GuidelineSection,
    GuidelineVersion,
    Issue,
    LearningProposal,
    Organization,
    ProofAsset,
    ProofFact,
    ProofTerm,
    Review,
    User,
)
from app.services.embeddings import index_org_knowledge  # noqa: E402

ORG_ID = "org-meridian"
ORG_NAME = "Meridian Coffee"
BRAND = "Meridian Coffee"
GUIDELINE_VERSION = "v2.3"
VERSION_ID = "gv-meridian-v2-3"

USERS = [
    {
        "id": "u-priya",
        "email": "priya@meridiancoffee.com",
        "name": "Priya Raman",
        "role": Role.CREATOR,
    },
    {
        "id": "u-ravi",
        "email": "ravi@meridiancoffee.com",
        "name": "Ravi Suri",
        "role": Role.REVIEWER,
    },
    {
        "id": "u-maya",
        "email": "maya@meridiancoffee.com",
        "name": "Maya Okafor",
        "role": Role.APPROVER,
    },
    {
        "id": "u-ada",
        "email": "admin@brandproof.app",
        "name": "Ada Lindqvist",
        "role": Role.ADMIN,
    },
]

GUIDELINE_SECTION_SEED = [
    # number, label, text, clarity, owner, effective_from, expires_on
    (
        "1.1", "Voice & tone",
        "Write like a knowledgeable friend who loves coffee. Short sentences, "
        "second person, no marketing filler. Playful is allowed; snarky is not.",
        74, "Maya Okafor", "2025-01-15", None,
    ),
    (
        "1.2", "Honesty default",
        "State plain strengths over hype. When in doubt, make no claim at all — "
        "a quiet sentence we can prove beats a loud one we can't.",
        None, None, "2025-01-15", None,
    ),
    (
        "2.1", "Numbers match the fact sheet",
        "Every percentage, weight, date or quantity must appear in the fact sheet, "
        "or be deleted. No near-matches.",
        38, "Maya Okafor", "2025-01-15", None,
    ),
    (
        "3.1", "Health and physiology claims",
        'Digestive, energy, and wellness claims ("smoother on your stomach", '
        '"clean energy", boosted immunity…) are banned unless the '
        "regulator-reviewed claims deck has a signed line for the exact phrasing.",
        61, "Ravi Suri", "2025-01-15", None,
    ),
    (
        "3.2", "Competitor comparisons",
        "Named competitor comparisons appear only in the approved comparison chart. "
        "Never in ad copy, banners, or email.",
        69, "Ravi Suri", "2025-01-15", None,
    ),
    (
        "4.1", "Every claim needs an anchor",
        "A claim may stand on a fact sheet entry, a named third party, or a recorded "
        "source captured at review time. Unanchored claims go back to the writer.",
        52, "Maya Okafor", "2025-01-15", None,
    ),
    (
        "4.2", "No unverifiable superlatives",
        'Never rank the brand ("best", "finest", "America\'s top", "best price") '
        "unless a named third-party ranking supports it. Say what the product is, "
        "not what place it came in.",
        44, "Maya Okafor", "2025-01-15", None,
    ),
    (
        "5.1", "Sustainability language",
        "Only certified terms appear in copy, exactly as the certificates spell them. "
        "\"Eco-friendly\" and \"zero impact\" are not certified terms.",
        47, "Ravi Suri", "2025-01-15", None,
    ),
    (
        "6.1", "Spring campaign claims",
        "Spring bundle copy may reference the cherry blossom limited roast once the "
        "fact sheet carries its roast date. Applies to the spring window only.",
        55, "Maya Okafor", "2025-02-01", "2025-05-31",  # expired on purpose
    ),
]

FACT_SEED: list[dict[str, Any]] = [
    {
        "id": "f1",
        "claim": "USDA Organic certified (cert #4471, Oregon Tilth, renewed Sep 2025)",
        "verified": "2025-09-14",
        "source": "Oregon Tilth certificate",
    },
    {
        "id": "f2",
        "claim": "12 fl oz cold brew = 235 mg caffeine",
        "verified": "2025-06-02",
        "source": "Third-party lab panel, LabDirect",
    },
    {
        "id": "f3",
        "claim": "Two smallholder partners: Huila, Colombia and Yirgacheffe, Ethiopia",
        "verified": "2026-01-20",
        "source": "Sourcing ledger 2026",
    },
    {
        "id": "f4",
        "claim": "Average roast-to-ship time is 2.1 days",
        "verified": "2025-10-02",
        "source": "Fulfilment metrics dashboard",
    },
    {
        "id": "f5",
        "claim": "30-day money-back guarantee applies to first orders",
        "verified": "2025-11-08",
        "source": "Shop policy, signed by Ops",
    },
]

TERM_SEED: list[dict[str, Any]] = [
    {
        "id": "t1",
        "term": "Cold brew",
        "definition": "Ground coffee steeped in cold water for 16–24 hours, then "
        "flash-chilled. Not the same as iced coffee (hot-brewed, cooled).",
    },
    {
        "id": "t2",
        "term": "Smallholder lot",
        "definition": "Coffee bought directly from a named farm or family co-op. "
        "We print the region, not the farm, on labels.",
    },
    {
        "id": "t3",
        "term": "Roast date",
        "definition": "The date beans were roasted — printed on every bag. "
        'Never approximate it in copy ("recently roasted" is banned).',
    },
    {
        "id": "t4",
        "term": "Flash-chill",
        "definition": "Brewing hot then chilling fast. Use only for the iced line, "
        "never for cold brew.",
    },
]

ASSET_SEED: list[dict[str, Any]] = [
    {
        "id": "a1",
        "name": "Primary logo lockup",
        "kind": "Logo",
        "note": "Clear space = one bean width. Never on busy photography.",
    },
    {
        "id": "a2",
        "name": "Palette — Warm Paper / Dew / Kiln",
        "kind": "Palette",
        "note": "Kiln red is reserved for CTA on powder backgrounds only.",
    },
    {
        "id": "a3",
        "name": "Voice card — warm, plain, honest",
        "kind": "Voice",
        "note": "Three test sentences every draft must pass.",
    },
    {
        "id": "a4",
        "name": "Approved comparison chart vs. national brands",
        "kind": "Claims",
        "note": "The only place competitor names may appear (§3.2).",
    },
]

REVIEW_SEED: list[dict[str, Any]] = [
    {
        "id": "rv1",
        "title": "April email — cold brew launch",
        "channel": "Email",
        "author": "Priya Raman",
        "author_id": "u-priya",
        "days_ago": 1,
        "hour": 9,
        "status": "in_review",
        "sections": [
            {
                "id": "rv1-s1",
                "heading": "Headline block",
                "body": "The best cold brew in America just landed. Nitro-smooth, "
                "certified organic, and 40% less acidic than iced coffee.",
            },
            {
                "id": "rv1-s2",
                "heading": "Why it's different",
                "body": "We cold-steep coffee from the Huila highlands for 18 hours, "
                "then flash-chill it the same morning. The result is smooth on your "
                "stomach and delivers clean energy with no crash.",
            },
            {
                "id": "rv1-s3",
                "heading": "Offer",
                "body": "Take an extra 10% off your first order — best price anywhere, "
                "guaranteed fresh from the roast room.",
            },
        ],
        "issues": [
            {
                "id": "rv1-i1",
                "section_id": "rv1-s1",
                "quote": "The best cold brew in America",
                "severity": "high",
                "confidence": 0.87,
                "headline": "Unverifiable superlative",
                "detail": "Ranks the product against every other in the country with no "
                "third-party source attached. Rank claims are exactly what §4.2 was "
                "written for.",
                "citation_json": {
                    "clause": "4.2",
                    "sectionLabel": "No unverifiable superlatives",
                    "version": GUIDELINE_VERSION,
                    "text": GUIDELINE_SECTION_SEED[6][2],
                },
                "suggested": "A cold brew we are genuinely proud of",
                "rationale": "Keeps the launch excitement; states a claim you can stand "
                "behind every day, not just launch week.",
                "status": "open",
            },
            {
                "id": "rv1-i2",
                "section_id": "rv1-s1",
                "quote": "40% less acidic than iced coffee",
                "severity": "high",
                "confidence": 0.91,
                "headline": "Number with no fact anchor",
                "detail": "The fact sheet has no acidity comparison. §2.1 is simple about "
                "this: numbers match the fact sheet, or they go.",
                "citation_json": {
                    "clause": "2.1",
                    "sectionLabel": "Numbers match the fact sheet",
                    "version": GUIDELINE_VERSION,
                    "text": GUIDELINE_SECTION_SEED[2][2],
                },
                "suggested": "cold-brewed overnight for a naturally smooth cup",
                "rationale": "Keeps the smoothness story and drops the figure you cannot "
                "defend from anyone's reply-all chain.",
                "status": "open",
            },
            {
                "id": "rv1-i3",
                "section_id": "rv1-s2",
                "quote": "smooth on your stomach and delivers clean energy with no crash",
                "severity": "high",
                "confidence": 0.88,
                "headline": "Physiology claim needs the compliance deck",
                "detail": "Digestive and energy claims sit on the banned-without-review "
                "list, and the signed claims deck has no line for this wording.",
                "citation_json": {
                    "clause": "3.1",
                    "sectionLabel": "Health and physiology claims",
                    "version": GUIDELINE_VERSION,
                    "text": GUIDELINE_SECTION_SEED[3][2],
                },
                "suggested": "brewed slow for a cup that never turns bitter",
                "rationale": "Moves the claim from physiology to taste — same intent, "
                "provable, and honestly a better sentence.",
                "status": "open",
            },
            {
                "id": "rv1-i4",
                "section_id": "rv1-s3",
                "quote": "best price anywhere",
                "severity": "medium",
                "confidence": 0.74,
                "headline": "Price superlative with no market data",
                "detail": '"Best" attached to price is still a rank claim. Nothing in the '
                "fact sheet compares your price to anyone else's.",
                "citation_json": {
                    "clause": "4.2",
                    "sectionLabel": "No unverifiable superlatives",
                    "version": GUIDELINE_VERSION,
                    "text": GUIDELINE_SECTION_SEED[6][2],
                },
                "suggested": "today's subscriber offer",
                "rationale": "Anchors the offer honestly and without ranking it; the "
                "discount itself is fine.",
                "status": "open",
            },
            {
                "id": "rv1-i5",
                "section_id": "rv1-s3",
                "quote": "guaranteed fresh from the roast room",
                "severity": "medium",
                "confidence": 0.72,
                "headline": "Absolute guarantee",
                "detail": '"Guaranteed" promises an outcome. The house rule prefers plain '
                "facts — like the roast-to-ship median you actually measure.",
                "citation_json": {
                    "clause": "4.1",
                    "sectionLabel": "Every claim needs an anchor",
                    "version": GUIDELINE_VERSION,
                    "text": GUIDELINE_SECTION_SEED[5][2],
                },
                "suggested": "shipped within days of roasting",
                "rationale": "Anchors to fact F4 (average roast-to-ship 2.1 days) instead "
                "of promising the sky.",
                "status": "open",
            },
            {
                "id": "rv1-i6",
                "section_id": "rv1-s1",
                "quote": "Nitro-smooth",
                "severity": "low",
                "confidence": 0.55,
                "headline": "Stacked promise in one line",
                "detail": "Launch urgency, a product trait and a stat share a single line. "
                "Nothing in the knowledge base anchors this pattern, so it lands here as a "
                "look-over item for a human.",
                "citation_json": None,
                "suggested": "Nitro-smooth, and it starts with a roast date you can see",
                "rationale": "One idea per line, and the roast date does the freshness job "
                "a stat was doing.",
                "status": "open",
                "agent": "advisory",
            },
        ],
    },
    {
        "id": "rv2",
        "title": "Homepage banner refresh",
        "channel": "Website",
        "author": "Jonas Feld",
        "author_id": "u-priya",
        "days_ago": 4,
        "hour": 14,
        "status": "changes_requested",
        "returned_by": "Ravi Suri",
        "approver_note": "Comparison claim needs the signed ranking attached before "
        "this can go up. The rest was fine.",
        "sections": [
            {
                "id": "rv2-s1",
                "heading": "Banner copy",
                "body": "Better than Blue Bottle, no contest. Sourced from a single "
                "farm in Ethiopia, roasted the night it ships.",
            },
        ],
        "issues": [
            {
                "id": "rv2-i1",
                "section_id": "rv2-s1",
                "quote": "Better than Blue Bottle, no contest",
                "severity": "high",
                "confidence": 0.83,
                "headline": "Competitor comparison in ad copy",
                "detail": "§3.2 keeps named comparisons inside the approved chart. "
                "This banner names a competitor directly.",
                "citation": {
                    "clause": "3.2",
                    "section_label": "Competitor comparisons",
                    "version": GUIDELINE_VERSION,
                    "text": GUIDELINE_SECTION_SEED[3][2],
                },
                "suggested": "Our cold brew, made for the morning you actually have",
                "rationale": "Drops the comparison, keeps the hook, stays in the "
                "approved chart lane.",
                "status": "dismissed",
                "reason": "Dismissed with reason: a signed third-party ranking "
                "(Coffee Compass 2025) was filed into the fact sheet this morning, "
                "which satisfies §4.1.",
                "evidence_ids": [],
            },
            {
                "id": "rv2-i2",
                "section_id": "rv2-s1",
                "quote": "a single farm in Ethiopia",
                "severity": "medium",
                "confidence": 0.71,
                "headline": "Fact sheet says two farms, two countries",
                "detail": "Fact F3 lists Huila (Colombia) and Yirgacheffe (Ethiopia) — "
                'two smallholder partners, not one. "Single farm" would also strand '
                "the Colombia coffee.",
                "citation": {
                    "clause": "2.1",
                    "section_label": "Numbers match the fact sheet",
                    "version": GUIDELINE_VERSION,
                    "text": GUIDELINE_SECTION_SEED[1][2],
                },
                "suggested": "sourced from two smallholder farms we know by name",
                "rationale": "Matches the fact sheet and keeps the intimacy that made "
                "the line work.",
                "status": "accepted",
                "evidence_ids": ["f3"],
                "verification": "contradicted",
            },
        ],
    },
    {
        "id": "rv3",
        "title": "SMS re-engagement flow",
        "channel": "SMS",
        "author": "Priya Raman",
        "author_id": "u-priya",
        "days_ago": 9,
        "hour": 11,
        "status": "approved",
        "sections": [
            {
                "id": "rv3-s1",
                "heading": "Push 1 — 48h after cart",
                "body": "Still thinking it over? Your cart is lonely.",
            },
            {
                "id": "rv3-s2",
                "heading": "Push 2 — day 10",
                "body": "Loyalty points expire soon! Quick browse and your favorite "
                "is back in season.",
            },
        ],
        "issues": [
            {
                "id": "rv3-i1",
                "section_id": "rv3-s1",
                "quote": "your cart is lonely",
                "severity": "medium",
                "confidence": 0.66,
                "headline": "Anthropomorphised cart",
                "detail": "Voice allows playful, but giving products feelings reads "
                "gimmicky to recent customers — flagging for a human judgement, "
                "not a rule.",
                "citation": None,
                "suggested": "You left something cold brewing in your cart",
                "rationale": "Same warmth, no imaginary feelings.",
                "status": "edited",
                "replacement": "Something cold is waiting in your cart",
                "reason": "Edited during review: shortened by hand.",
                "evidence_ids": [],
            },
            {
                "id": "rv3-i2",
                "section_id": "rv3-s2",
                "quote": "Loyalty points expire soon",
                "severity": "low",
                "confidence": 0.55,
                "headline": "Manufactured urgency",
                "detail": "The points balance does have a runway, but \"soon!\" adds "
                "pressure the data doesn't. Advisory — no rule covers urgency "
                "language yet.",
                "citation": None,
                "suggested": "A heads-up: your loyalty balance has 14 days left",
                "rationale": "Says the real deadline instead of the scammy vibe.",
                "status": "accepted",
                "evidence_ids": [],
            },
        ],
    },
    {
        "id": "rv4",
        "title": "Investor deck v4 — traction slide",
        "channel": "Deck",
        "author": "Jonas Feld",
        "author_id": "u-priya",
        "days_ago": 0,
        "hour": 8,
        "status": "analyzing",
        "sections": [
            {
                "id": "rv4-s1",
                "heading": "Traction slide",
                "body": "Melting retention, cohort over cohort. Growth is compounding "
                "into our best quarter ever.",
            },
        ],
        "issues": [],
    },
]

APPROVAL_SEED: list[dict[str, Any]] = [
    {
        "id": "apr2",
        "review_id": "rv2",
        "approver_id": "u-ravi",
        "state": "returned",
        "note": "Comparison claim needs the signed ranking attached before this can "
        "go up.",
    },
    {
        "id": "apr3",
        "review_id": "rv3",
        "approver_id": "u-maya",
        "state": "signed",
        "days_signed_ago": 8,
    },
]

PROPOSAL_SEED: list[dict[str, Any]] = [
    {
        "id": "amp1",
        "clause": "5.1",
        "based_on": "Three review cycles flagged \"eco-friendly\" language this "
        "month, and reviewers dismissed none of them",
        "draft": "Add to §5.1: \"Eco-friendly\" is banned in all copy. Use the exact "
        "certification name from the fact sheet (USDA Organic, B-Corp) — "
        "nothing looser.",
        "state": "proposed",
    },
    {
        "id": "amp2",
        "clause": "2.1",
        "based_on": "Number checks keep failing on stats the fact sheet doesn't hold, "
        "and the guidance never says what to do instead",
        "draft": "Add to §2.1: a number claim may cite either a fact sheet entry or "
        "a third-party source recorded at review time. Otherwise delete the "
        "number, not the story.",
        "state": "proposed",
    },
]

RADAR_SEED = [
    ("Specificity", 42, "\"Avoid hype\" appears three times but hype is never defined anywhere."),
    ("Testability", 58, "Most clauses can decide a concrete draft; voice clauses can't."),
    ("Consistency", 64, "§4.1 and §5.1 disagree slightly about what counts as a source."),
    ("Coverage", 38, "No rule touches pricing language, urgency language, or decks."),
    ("Predictability", 71, "Reviewers can usually see a flag coming — usually."),
]

MS_PER_DAY = 86_400_000


def ts(days_ago: int, hour: int = 9) -> int:
    """Epoch-ms timestamp matching the desk seed's relative clock."""
    day_ms = 86_400_000
    now = time.time() * 1000
    midnight = int(now) // day_ms * day_ms
    return midnight + hour * 3_600_000 + 12 * 60_000 - days_ago * day_ms


async def is_seeded(session: AsyncSession) -> bool:
    result = await session.execute(
        select(func.count()).select_from(Organization).where(Organization.id == ORG_ID)
    )
    return bool(result.scalar_one())


async def run_seed(session: AsyncSession) -> None:
    if await is_seeded(session):
        return

    session.add(Organization(id=ORG_ID, name=ORG_NAME))
    session.add(
        GuidelineVersion(
            id=VERSION_ID, org_id=ORG_ID, brand=BRAND, version=GUIDELINE_VERSION
        )
    )

    for user in USERS:
        session.add(User(org_id=ORG_ID, **user))

    for number, label, text, clarity, owner, eff, exp in GUIDELINE_SECTION_SEED:
        session.add(
            GuidelineSection(
                id=f"gs-{number.replace('.', '-')}",
                org_id=ORG_ID,
                version_id=VERSION_ID,
                number=number,
                label=label,
                text=text,
                clarity=clarity,
                owner=owner,
                effective_from=eff,
                expires_on=exp,
            )
        )

    for fact in FACT_SEED:
        session.add(ProofFact(org_id=ORG_ID, **fact))
    for term in TERM_SEED:
        session.add(ProofTerm(org_id=ORG_ID, **term))
    for asset in ASSET_SEED:
        session.add(ProofAsset(org_id=ORG_ID, **asset))

    for seed_review in REVIEW_SEED:
        days, hour = seed_review["days_ago"], seed_review["hour"]
        submitted_at = int(ts(days, hour))
        sections = seed_review["sections"]
        issues = seed_review["issues"]

        session.add(
            ContentItem(
                id=f"ci-{seed_review['id']}", org_id=ORG_ID,
                title=seed_review["title"], author_id=seed_review["author_id"],
            )
        )
        session.add(
            ContentVersion(
                id=f"cv-{seed_review['id']}", org_id=ORG_ID,
                item_id=f"ci-{seed_review['id']}", ordinal=1, body_json=sections,
            )
        )
        session.add(
            Review(
                id=seed_review["id"], org_id=ORG_ID,
                item_id=f"ci-{seed_review['id']}", version_ordinal=1,
                title=seed_review["title"],
                submitted_at=submitted_at, status=seed_review["status"],
                channel=seed_review["channel"], author=seed_review["author"],
                policy_version=GUIDELINE_VERSION,
                approver_note=seed_review.get("approver_note"),
                returned_by=seed_review.get("returned_by"),
            )
        )
        for issue in issues:
            normalized = dict(issue)
            citation = normalized.pop("citation", None)
            if citation is not None:
                # Contract key `citation` maps to the model's citation_json.
                normalized["citation_json"] = citation
            session.add(Issue(org_id=ORG_ID, review_id=seed_review["id"], **normalized))

    for approval in APPROVAL_SEED:
        signed_at = None
        if approval.get("days_signed_ago") is not None:
            signed_at = int(ts(approval["days_signed_ago"], 16))
        session.add(
            Approval(
                id=approval["id"], org_id=ORG_ID, review_id=approval["review_id"],
                approver_id=approval["approver_id"], state=approval["state"],
                signed_at=signed_at, note=approval.get("note"),
            )
        )

    for proposal in PROPOSAL_SEED:
        session.add(LearningProposal(org_id=ORG_ID, **proposal))

    import uuid

    session.add(
        AuditEvent(
            id=f"ae-{uuid.uuid4().hex[:10]}",
            org_id=ORG_ID,
            actor="system",
            action="seed.bootstrap",
            subject="org",
            meta={"brand": BRAND, "version": GUIDELINE_VERSION},
        )
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the BrandProof demo corpus.")
    parser.parse_args()

    async def _seed() -> None:
        await init_db()
        factory = get_session_factory()
        async with factory() as session:
            if await is_seeded(session):
                print("Seed: already present, rebuilding embeddings only.")
                await index_org_knowledge(session, ORG_ID)
            else:
                await run_seed(session)
                await session.commit()
                await index_org_knowledge(session, ORG_ID)
            print("Seed: complete.")

    asyncio.run(_seed())


if __name__ == "__main__":
    main()
