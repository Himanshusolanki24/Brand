import type {
  ApprovalEntry,
  Amendment,
  ClarityAxisScore,
  DemoState,
  GuidelineSection,
  Issue,
  ProofAsset,
  ProofFact,
  ProofTerm,
  Review,
  TrustEdge,
  TrustGraphResponse,
  TrustNode,
} from "./types";

export const BRAND = "Meridian Coffee";
/**
 * The sample desk's dedicated approver — mirroring the review service's
 * assignment rule: a dedicated approver signs, admins only fall back. Demo
 * approvals never show anyone who isn't a named fixture in this file.
 */
export const DEMO_APPROVER = "Maya Okafor";
export const GUIDELINE_VERSION = "v2.3";

export const GUIDELINES: GuidelineSection[] = [
  {
    number: "1.1",
    label: "Voice & tone",
    text: "Write like a knowledgeable friend who loves coffee. Short sentences, second person, no marketing filler. Playful is allowed; snarky is not.",
    clarity: 74,
  },
  {
    number: "1.2",
    label: "Honesty default",
    text: "State plain strengths over hype. When in doubt, make no claim at all — a quiet sentence we can prove beats a loud one we can't.",
    clarity: null,
  },
  {
    number: "2.1",
    label: "Numbers match the fact sheet",
    text: "Every percentage, weight, date or quantity must appear in the fact sheet, or be deleted. No near-matches.",
    clarity: 38,
  },
  {
    number: "3.1",
    label: "Health and physiology claims",
    text: "Digestive, energy, and wellness claims (\"smoother on your stomach\", \"clean energy\", boosted immunity…) are banned unless the regulator-reviewed claims deck has a signed line for the exact phrasing.",
    clarity: 61,
  },
  {
    number: "3.2",
    label: "Competitor comparisons",
    text: "Named competitor comparisons appear only in the approved comparison chart. Never in ad copy, banners, or email.",
    clarity: 69,
  },
  {
    number: "4.1",
    label: "Every claim needs an anchor",
    text: "A claim may stand on a fact sheet entry, a named third party, or a recorded source captured at review time. Unanchored claims go back to the writer.",
    clarity: 52,
  },
  {
    number: "4.2",
    label: "No unverifiable superlatives",
    text: "Never rank the brand (\"best\", \"finest\", \"America's top\", \"best price\") unless a named third-party ranking supports it. Say what the product is, not what place it came in.",
    clarity: 44,
  },
  {
    number: "5.1",
    label: "Sustainability language",
    text: "Only certified terms appear in copy, exactly as the certificates spell them. \"Eco-friendly\" and \"zero impact\" are not certified terms.",
    clarity: 47,
  },
];

export const FACTS: ProofFact[] = [
  {
    id: "f1",
    claim: "USDA Organic certified (cert #4471, Oregon Tilth, renewed Sep 2025)",
    verified: "2025-09-14",
    source: "Oregon Tilth certificate",
  },
  {
    id: "f2",
    claim: "12 fl oz cold brew = 235 mg caffeine",
    verified: "2025-06-02",
    source: "Third-party lab panel, LabDirect",
  },
  {
    id: "f3",
    claim: "Two smallholder partners: Huila, Colombia and Yirgacheffe, Ethiopia",
    verified: "2026-01-20",
    source: "Sourcing ledger 2026",
  },
  {
    id: "f4",
    claim: "Average roast-to-ship time is 2.1 days",
    verified: "2025-10-02",
    source: "Fulfilment metrics dashboard",
  },
  {
    id: "f5",
    claim: "30-day money-back guarantee applies to first orders",
    verified: "2025-11-08",
    source: "Shop policy, signed by Ops",
  },
];

export const TERMS: ProofTerm[] = [
  {
    id: "t1",
    term: "Cold brew",
    definition: "Ground coffee steeped in cold water for 16–24 hours, then flash-chilled. Not the same as iced coffee (hot-brewed, cooled).",
  },
  {
    id: "t2",
    term: "Smallholder lot",
    definition: "Coffee bought directly from a named farm or family co-op. We print the region, not the farm, on labels.",
  },
  {
    id: "t3",
    term: "Roast date",
    definition: "The date beans were roasted — printed on every bag. Never approximate it in copy (\"recently roasted\" is banned).",
  },
  {
    id: "t4",
    term: "Flash-chill",
    definition: "Brewing hot then chilling fast. Use only for the iced line, never for cold brew.",
  },
];

export const ASSETS: ProofAsset[] = [
  { id: "a1", name: "Primary logo lockup", kind: "Logo", note: "Clear space = one bean width. Never on busy photography." },
  { id: "a2", name: "Palette — Warm Paper / Dew / Kiln", kind: "Palette", note: "Kiln red is reserved for CTA on powder backgrounds only." },
  { id: "a3", name: "Voice card — warm, plain, honest", kind: "Voice", note: "Three test sentences every draft must pass." },
  { id: "a4", name: "Approved comparison chart vs. national brands", kind: "Claims", note: "The only place competitor names may appear (§3.2)." },
];

const ts = (daysAgo: number, hour = 9) => {
  const d = new Date();
  d.setUTCHours(hour, 12, 0, 0);
  return d.getTime() - daysAgo * 86_400_000;
};

const rv1Issues: Issue[] = [
  {
    id: "rv1-i1",
    sectionId: "rv1-s1",
    quote: "The best cold brew in America",
    severity: "high",
    confidence: 0.87,
    headline: "Unverifiable superlative",
    detail:
      "Ranks the product against every other in the country with no third-party source attached. Rank claims are exactly what §4.2 was written for.",
    citation: {
      clause: "4.2",
      sectionLabel: "No unverifiable superlatives",
      version: GUIDELINE_VERSION,
      text: GUIDELINES[6].text,
    },
    suggested: "A cold brew we are genuinely proud of",
    rationale:
      "Keeps the launch excitement; states a claim you can stand behind every day, not just launch week.",
    status: "open",
    evidenceIds: [],
    verification: null,
    agent: "policy_checks",
  },
  {
    id: "rv1-i2",
    sectionId: "rv1-s1",
    quote: "40% less acidic than iced coffee",
    severity: "high",
    confidence: 0.91,
    headline: "Number with no fact anchor",
    detail:
      "The fact sheet has no acidity comparison. §2.1 is simple about this: numbers match the fact sheet, or they go.",
    citation: {
      clause: "2.1",
      sectionLabel: "Numbers match the fact sheet",
      version: GUIDELINE_VERSION,
      text: GUIDELINES[2].text,
    },
    suggested: "cold-brewed overnight for a naturally smooth cup",
    rationale:
      "Keeps the smoothness story and drops the figure you cannot defend from anyone's reply-all chain.",
    status: "open",
    // A number the sheet doesn't hold: unverified, and unverified is not false.
    evidenceIds: [],
    verification: null,
    agent: "policy_checks",
  },
  {
    id: "rv1-i3",
    sectionId: "rv1-s2",
    quote: "smooth on your stomach and delivers clean energy with no crash",
    severity: "high",
    confidence: 0.88,
    headline: "Physiology claim needs the compliance deck",
    detail:
      "Digestive and energy claims sit on the banned-without-review list, and the signed claims deck has no line for this wording.",
    citation: {
      clause: "3.1",
      sectionLabel: "Health and physiology claims",
      version: GUIDELINE_VERSION,
      text: GUIDELINES[3].text,
    },
    suggested: "brewed slow for a cup that never turns bitter",
    rationale:
      "Moves the claim from physiology to taste — same intent, provable, and honestly a better sentence.",
    status: "open",
    evidenceIds: [],
    verification: null,
    agent: "policy_checks",
  },
  {
    id: "rv1-i4",
    sectionId: "rv1-s3",
    quote: "best price anywhere",
    severity: "medium",
    confidence: 0.74,
    headline: "Price superlative with no market data",
    detail:
      "\"Best\" attached to price is still a rank claim. Nothing in the fact sheet compares your price to anyone else's.",
    citation: {
      clause: "4.2",
      sectionLabel: "No unverifiable superlatives",
      version: GUIDELINE_VERSION,
      text: GUIDELINES[6].text,
    },
    suggested: "today's subscriber offer",
    rationale:
      "Anchors the offer honestly and without ranking it; the discount itself is fine.",
    status: "open",
    evidenceIds: [],
    verification: null,
    agent: "policy_checks",
  },
  {
    id: "rv1-i5",
    sectionId: "rv1-s3",
    quote: "guaranteed fresh from the roast room",
    severity: "medium",
    confidence: 0.72,
    headline: "Absolute guarantee",
    detail:
      "\"Guaranteed\" promises an outcome. The house rule prefers plain facts — like the roast-to-ship median you actually measure.",
    citation: {
      clause: "4.1",
      sectionLabel: "Every claim needs an anchor",
      version: GUIDELINE_VERSION,
      text: GUIDELINES[5].text,
    },
    suggested: "shipped within days of roasting",
    rationale:
      "Anchors to fact F4 (average roast-to-ship 2.1 days) instead of promising the sky.",
    status: "open",
    evidenceIds: [],
    verification: null,
    agent: "policy_checks",
  },
  {
    id: "rv1-i6",
    sectionId: "rv1-s1",
    quote: "Nitro-smooth",
    severity: "low",
    confidence: 0.55,
    headline: "Stacked promise in one line",
    detail:
      "Launch urgency, a product trait and a stat share a single line. Nothing in the knowledge base anchors this pattern, so it lands here as a look-over item for a human.",
    citation: null,
    suggested: "Nitro-smooth, and it starts with a roast date you can see",
    rationale:
      "One idea per line, and the roast date does the freshness job a stat was doing.",
    status: "open",
    evidenceIds: [],
    verification: null,
    agent: "advisory",
  },
];

const rv2Issues: Issue[] = [
  {
    id: "rv2-i1",
    sectionId: "rv2-s1",
    quote: "Better than Blue Bottle, no contest",
    severity: "high",
    confidence: 0.83,
    headline: "Competitor comparison in ad copy",
    detail:
      "§3.2 keeps named comparisons inside the approved chart. This banner names a competitor directly.",
    citation: {
      clause: "3.2",
      sectionLabel: "Competitor comparisons",
      version: GUIDELINE_VERSION,
      text: GUIDELINES[4].text,
    },
    suggested: "Our cold brew, made for the morning you actually have",
    rationale: "Drops the comparison, keeps the hook, stays in the approved chart lane.",
    status: "dismissed",
    reason:
      "Dismissed with reason: a signed third-party ranking (Coffee Compass 2025) was filed into the fact sheet this morning, which satisfies §4.1.",
    evidenceIds: [],
    verification: null,
    agent: "policy_checks",
  },
  {
    id: "rv2-i2",
    sectionId: "rv2-s1",
    quote: "a single farm in Ethiopia",
    severity: "medium",
    confidence: 0.71,
    headline: "Fact sheet says two farms, two countries",
    detail:
      "Fact F3 lists Huila (Colombia) and Yirgacheffe (Ethiopia) — two smallholder partners, not one. \"Single farm\" would also strand the Colombia coffee.",
    citation: {
      clause: "2.1",
      sectionLabel: "Numbers match the fact sheet",
      version: GUIDELINE_VERSION,
      text: GUIDELINES[2].text,
    },
    suggested: "sourced from two smallholder farms we know by name",
    rationale: "Matches the fact sheet and keeps the intimacy that made the line work.",
    status: "accepted",
    // The one genuinely contradicted finding: fact F3 says two partners, the
    // copy says one. Contradicted by evidence, not merely unverified.
    evidenceIds: ["f3"],
    verification: "contradicted",
    agent: "policy_checks",
  },
];

const rv3Issues: Issue[] = [
  {
    id: "rv3-i1",
    sectionId: "rv3-s1",
    quote: "your cart is lonely",
    severity: "medium",
    confidence: 0.66,
    headline: "Anthropomorphised cart",
    detail:
      "Voice allows playful, but giving products feelings reads gimmicky to recent customers — flagging for a human judgement, not a rule.",
    citation: null,
    suggested: "You left something cold brewing in your cart",
    rationale: "Same warmth, no imaginary feelings.",
    status: "edited",
    replacement: "Something cold is waiting in your cart",
    reason: "Edited during review: shortened by hand.",
    evidenceIds: [],
    verification: null,
    agent: "policy_checks",
  },
  {
    id: "rv3-i2",
    sectionId: "rv3-s2",
    quote: "Loyalty points expire soon",
    severity: "low",
    confidence: 0.55,
    headline: "Manufactured urgency",
    detail:
      "The points balance does have a runway, but \"soon!\" adds pressure the data doesn't. Advisory — no rule covers urgency language yet.",
    citation: null,
    suggested: "A heads-up: your loyalty balance has 14 days left",
    rationale: "Says the real deadline instead of the scammy vibe.",
    status: "accepted",
    evidenceIds: [],
    verification: null,
    agent: "policy_checks",
  },
];

export const REVIEWS: Review[] = [
  {
    id: "rv1",
    title: "April email — cold brew launch",
    channel: "Email",
    author: "Priya Raman",
    submittedAt: ts(1, 9),
    status: "in_review",
    sections: [
      {
        id: "rv1-s1",
        heading: "Headline block",
        body:
          "The best cold brew in America just landed. Nitro-smooth, certified organic, and 40% less acidic than iced coffee.",
      },
      {
        id: "rv1-s2",
        heading: "Why it's different",
        body:
          "We cold-steep coffee from the Huila highlands for 18 hours, then flash-chill it the same morning. The result is smooth on your stomach and delivers clean energy with no crash.",
      },
      {
        id: "rv1-s3",
        heading: "Offer",
        body: "Take an extra 10% off your first order — best price anywhere, guaranteed fresh from the roast room.",
      },
    ],
    issues: rv1Issues,
    policyVersion: GUIDELINE_VERSION,
  },
  {
    id: "rv2",
    title: "Homepage banner refresh",
    channel: "Website",
    author: "Jonas Feld",
    submittedAt: ts(4, 14),
    status: "changes_requested",
    returnedBy: "Ravi Suri",
    approverNote:
      "Comparison claim needs the signed ranking attached before this can go up. The rest was fine.",
    sections: [
      {
        id: "rv2-s1",
        heading: "Banner copy",
        body:
          "Better than Blue Bottle, no contest. Sourced from a single farm in Ethiopia, roasted the night it ships.",
      },
    ],
    issues: rv2Issues,
    policyVersion: GUIDELINE_VERSION,
  },
  {
    id: "rv3",
    title: "SMS re-engagement flow",
    channel: "SMS",
    author: "Priya Raman",
    submittedAt: ts(9, 11),
    status: "approved",
    sections: [
      { id: "rv3-s1", heading: "Push 1 — 48h after cart", body: "Still thinking it over? Your cart is lonely." },
      { id: "rv3-s2", heading: "Push 2 — day 10", body: "Loyalty points expire soon! Quick browse and your favorite is back in season." },
    ],
    issues: rv3Issues,
    policyVersion: GUIDELINE_VERSION,
  },
  {
    id: "rv4",
    title: "Investor deck v4 — traction slide",
    channel: "Deck",
    author: "Jonas Feld",
    submittedAt: ts(0, 8),
    status: "analyzing",
    sections: [
      {
        id: "rv4-s1",
        heading: "Traction slide",
        body: "Melting retention, cohort over cohort. Growth is compounding into our best quarter ever.",
      },
    ],
    issues: [],
    policyVersion: GUIDELINE_VERSION,
  },
];

export const APPROVALS: ApprovalEntry[] = [
  { id: "apr2", reviewId: "rv2", approver: "Ravi Suri", state: "returned", note: "Comparison claim needs the signed ranking attached before this can go up." },
  { id: "apr3", reviewId: "rv3", approver: "Maya Okafor", state: "signed", signedAt: ts(8, 16) },
];

export const AMENDMENTS: Amendment[] = [
  {
    id: "amp1",
    clause: "5.1",
    basedOn: "Three review cycles flagged \"eco-friendly\" language this month, and reviewers dismissed none of them",
    draft:
      "Add to §5.1: \"Eco-friendly\" is banned in all copy. Use the exact certification name from the fact sheet (USDA Organic, B-Corp) — nothing looser.",
    state: "proposed",
  },
  {
    id: "amp2",
    clause: "2.1",
    basedOn: "Number checks keep failing on stats the fact sheet doesn't hold, and the guidance never says what to do instead",
    draft:
      "Add to §2.1: a number claim may cite either a fact sheet entry or a third-party source recorded at review time. Otherwise delete the number, not the story.",
    state: "proposed",
  },
];

export const RADAR: ClarityAxisScore[] = [
  { axis: "Specificity", score: 42, note: "\"Avoid hype\" appears three times but hype is never defined anywhere." },
  { axis: "Testability", score: 58, note: "Most clauses can decide a concrete draft; voice clauses can't." },
  { axis: "Consistency", score: 64, note: "§4.1 and §5.1 disagree slightly about what counts as a source." },
  { axis: "Coverage", score: 38, note: "No rule touches pricing language, urgency language, or decks." },
  { axis: "Predictability", score: 71, note: "Reviewers can usually see a flag coming — usually." },
];

export function seedState(): DemoState {
  return {
    role: "reviewer",
    reviews: REVIEWS,
    guidelines: GUIDELINES,
    guidelineVersion: GUIDELINE_VERSION,
    facts: FACTS,
    terms: TERMS,
    assets: ASSETS,
    approvals: APPROVALS,
    amendments: AMENDMENTS,
    radar: RADAR,
  };
}

/**
 * Sample Trust Graph, derived from the sample desk's own fixtures — the same
 * shape GET /trust returns live. Left empty in the product lane: signed-in
 * desks read their own graph from the review service.
 */
export function demoTrustGraph(): TrustGraphResponse {
  const nodes: TrustNode[] = [];
  const edges: TrustEdge[] = [];
  const node = (n: TrustNode) => {
    if (!nodes.some((x) => x.id === n.id)) nodes.push(n);
  };

  for (const r of REVIEWS) {
    node({ id: `review:${r.id}`, kind: "review", label: r.title });
    for (const i of r.issues) {
      node({ id: `issue:${i.id}`, kind: "issue", label: i.headline });
      edges.push({ id: `te-${i.id}-hf`, src: `review:${r.id}`, dst: `issue:${i.id}`, rel: "has_finding" });
      if (i.citation) {
        node({
          id: `rule:§${i.citation.clause}`,
          kind: "rule",
          label: `§${i.citation.clause} ${i.citation.sectionLabel}`,
        });
        edges.push({ id: `te-${i.id}-cites`, src: `issue:${i.id}`, dst: `rule:§${i.citation.clause}`, rel: "cites" });
      }
      for (const f of i.evidenceIds) {
        const claim = FACTS.find((x) => x.id === f)?.claim ?? f;
        node({ id: `evidence:${f}`, kind: "evidence", label: claim.slice(0, 90) });
        edges.push({ id: `te-${i.id}-f${f}`, src: `issue:${i.id}`, dst: `evidence:${f}`, rel: "backed_by" });
      }
    }
  }

  // One decision node per approval state on record — signed or sent back.
  for (const ap of APPROVALS) {
    const stateLabel =
      ap.state === "signed" ? "signed" : ap.state === "returned" ? "returned" : "waiting";
    node({
      id: `decision:${ap.reviewId}`,
      kind: "decision",
      label: `${stateLabel}: ${ap.note ?? "—"} (${ap.approver})`,
    });
    edges.push({
      id: `te-${ap.id}-dec`,
      src: `decision:${ap.reviewId}`,
      dst: `review:${ap.reviewId}`,
      rel: "decision_for",
    });
  }

  // Last-8 audit trail, mirroring the service: edge-less activity nodes.
  const audit: Array<[string, string, string]> = [
    ["review.analyzed", "rv1", "Meridian checks"],
    ["issue.dismissed", "rv2-i1", "Jonas Feld"],
    ["issue.resolved", "rv2-i2", "Jonas Feld"],
    ["approval.returned", "rv2", "Ravi Suri"],
    ["issue.resolved", "rv3-i1", "Priya Raman"],
    ["approval.signed", "rv3", "Maya Okafor"],
    ["proposal.proposed", "amp1", "Meridian checks"],
    ["proposal.proposed", "amp2", "Meridian checks"],
  ];
  for (const [action, subject, actor] of audit) {
    const id = `audit:ae-${action}-${subject}`;
    nodes.push({ id, kind: "audit", label: `${action} — ${subject}`, detail: actor });
  }

  return { nodes, edges };
}
