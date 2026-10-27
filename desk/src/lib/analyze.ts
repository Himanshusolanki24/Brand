import type { Citation, Issue } from "./types";
import { GUIDELINES, GUIDELINE_VERSION } from "./seed";

function cite(clause: string, label: string, text: string): Citation {
  return { clause, sectionLabel: label, text, version: GUIDELINE_VERSION };
}

const C: Record<string, Citation> = {
  "4.2": cite("4.2", "No unverifiable superlatives", GUIDELINES[6].text),
  "2.1": cite("2.1", "Numbers match the fact sheet", GUIDELINES[2].text),
  "3.1": cite("3.1", "Health and physiology claims", GUIDELINES[3].text),
  "3.2": cite("3.2", "Competitor comparisons", GUIDELINES[4].text),
  "4.1": cite("4.1", "Every claim needs an anchor", GUIDELINES[5].text),
  "5.1": cite("5.1", "Sustainability language", GUIDELINES[7].text),
};

interface Rule {
  regex: RegExp;
  severity: "high" | "medium";
  confidence: number;
  citation: Citation | null;
  headline: string;
  detail: string;
  suggestedQuote: string;
  rationale: string;
}

const RULES: Rule[] = [
  {
    regex: /\b(best|finest|greatest|perfect|unbeatable|unmatched|world-class|number one)\b[^.!?]{0,40}/i,
    severity: "high",
    confidence: 0.87,
    citation: C["4.2"],
    headline: "Unverifiable superlative",
    detail: "This ranks the brand with nothing third-party behind it. Say what the product is, not what place it came in.",
    suggestedQuote: "",
    rationale: "Keeps the enthusiasm; states a claim you can defend every day of the week.",
  },
  {
    regex: /\b\d+(\.\d+)?%[^.!?]{0,35}/i,
    severity: "high",
    confidence: 0.9,
    citation: C["2.1"],
    headline: "Number with no fact anchor",
    detail: "The fact sheet does not hold this figure. §2.1 is simple: the number matches the sheet, or it goes.",
    suggestedQuote: "",
    rationale: "Keeps the story, drops the figure nobody can defend from a reply-all chain.",
  },
  {
    regex: /\b((smoother|gentler) on your (stomach|gut)|clean energy|no crash|zero crash|antioxidant-rich|healthy|wellness)[^.!?]{0,30}/i,
    severity: "high",
    confidence: 0.88,
    citation: C["3.1"],
    headline: "Physiology claim needs the compliance deck",
    detail: "Digestive and energy claims sit on the banned-without-review list.",
    suggestedQuote: "",
    rationale: "Moves the claim somewhere provable — most of these can live on taste instead of biology.",
  },
  {
    regex: /\b(blue bottle|starbucks|peet'?s|nespresso|dunkin)[: ,][^.!?]{0,30}|better than \w+/i,
    severity: "high",
    confidence: 0.83,
    citation: C["3.2"],
    headline: "Named competitor in copy",
    detail: "Named comparisons only appear in the approved chart, not in ads, banners, or email.",
    suggestedQuote: "",
    rationale: "Drops the comparison, keeps the hook — the chart lane is where this claim is allowed.",
  },
  {
    regex: /\b(always|never|guaranteed|forever|everyone|nobody)[^.!?]{0,25}/i,
    severity: "medium",
    confidence: 0.72,
    citation: C["4.1"],
    headline: "Absolute claim with no anchor",
    detail: "\"Always / never / guaranteed\" promise outcomes. The house prefers plain facts you actually measure.",
    suggestedQuote: "",
    rationale: "Anchors the promise to something real instead of promising the sky.",
  },
  {
    regex: /\b(eco-friendly|zero impact|carbon neutral|planet-safe)[^.!?]{0,25}/i,
    severity: "high",
    confidence: 0.85,
    citation: C["5.1"],
    headline: "Uncertified sustainability term",
    detail: "Only certified terms appear in copy, spelled exactly as the certificates spell them.",
    suggestedQuote: "",
    rationale: "Swaps the vibe word for the certificate — which is the part that protects you.",
  },
];

export function analyzeDraft(body: string): Issue[] {
  const issues: Issue[] = [];
  let n = 0;

  for (const rule of RULES) {
    const m = body.match(rule.regex);
    if (!m) continue;
    n += 1;
    const quote = m[0].trim();
    issues.push({
      id: `new-${n}`,
      sectionId: "new-s1",
      quote,
      severity: rule.severity,
      confidence: rule.confidence,
      headline: rule.headline,
      detail: rule.detail,
      citation: rule.citation,
      // The backend model drafts the precise rewrite; the demo leaves the
      // honest sentence to the human (Edit path) unless reason demands better.
      suggested: "",
      rationale: rule.rationale,
      status: "open",
      // The demo runner retrieves no evidence from a knowledge base, so its
      // findings are unverified — the UI must say "not verified", never
      // "false". The real review service fills both fields from retrieval.
      evidenceIds: [],
      verification: null,
      agent: "policy_checks",
    });
  }

  const longSentence = body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .find((s) => s.split(/\s+/).length > 30);

  if (longSentence) {
    n += 1;
    issues.push({
      id: `new-${n}`,
      sectionId: "new-s1",
      quote: longSentence.slice(0, 60) + (longSentence.length > 60 ? "…" : ""),
      severity: "low",
      confidence: 0.55,
      headline: "Long sentence, advisory",
      detail: "Over 30 words. No rule anchors sentence length, so this is a look-over item, not a citation.",
      citation: null,
      suggested: "Split it into two thoughts.",
      rationale: "One idea per line reads calmer — and this one carries two ideas.",
      status: "open",
      evidenceIds: [],
      verification: null,
      agent: "advisory",
    });
  }

  if (issues.length === 0 && body.trim().length > 0) {
    const first = body.trim().split(/(?<=[.!?])\s+/)[0] ?? body.trim();
    const peek = first.length > 48 ? first.slice(0, 48) + "…" : first;
    issues.push({
      id: "new-1",
      sectionId: "new-s1",
      quote: peek,
      severity: "low",
      confidence: 0.7,
      headline: "Clean pass, one look-over item",
      detail:
        "Nothing in the house rules matched. Hope alone is not governance — so a human still reads this once, which is the point.",
      citation: null,
      suggested: "Ship it — after one human pass.",
      rationale: "A clean automated pass plus a single human check beats either one alone.",
      status: "open",
      evidenceIds: [],
      verification: null,
      agent: "advisory",
    });
  }

  return issues;
}
