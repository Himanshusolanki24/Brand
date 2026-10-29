import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { AiLayerStatus } from "@/components/app/ai-layer-status";

export const metadata: Metadata = {
  title: "The AI layer — Inkloom",
  description:
    "The grounded semantic-review pass: what the model sees, the citation contract it answers to, and its live status on this deployment.",
};

const STAGES = [
  { name: "policy_checks", note: "deterministic rules" },
  { name: "evidence", note: "retrieval" },
  { name: "semantic_review", note: "the model pass" },
  { name: "critic", note: "citation gate" },
  { name: "risk_router", note: "route" },
];

const SEES = [
  "The submitted copy, verbatim and sectioned.",
  "The live guideline clauses — citable by their §number, at the version on record.",
  "The fact sheet — the brand's approved claims, with sources.",
  "The evidence stage's retrieved passages (facts, terms, guideline text) with match scores.",
  "The deterministic findings already raised — with one instruction: add depth, never repeat. A span the rule pass flagged is dropped in code if the model raises it again.",
];

const CONTRACT = [
  "Verbatim or nothing. The engine locates the model's quote in the submitted text — exact match first, case-insensitive second, dropped otherwise. A paraphrase is not a finding.",
  "Cite it or don't flag it. A finding's clause must resolve against the live ruleset to become a citation; anything else rides as advisory, uncited, with a confidence discount.",
  "A hallucinated clause is dropped. The critic stage re-validates every citation — model or rule — against the live ruleset before it reaches a human.",
  "Capped per review. Semantic depth never floods the desk.",
];

const RUNS_ON = [
  "One adapter, any model. The model is a setting, not a code change. Today's default: google/gemma-4-31b-it:free via OpenRouter. The Round 1 names — Gemini 2.5 Flash primary, GPT-4.1-mini fallback — sit one environment variable away on the same adapter.",
  "Key server-side only. The provider key lives in the engine's environment; never in the repository, never in the browser.",
  "No key, no network. With the provider off — the default — the stage doesn't run at all; the review is fully deterministic. The model layer is additive, never load-bearing.",
  "Failure is a trace, not an outage. A timeout, provider error, or malformed response yields zero model findings and an entry in the audit trail. The review never blocks on the model.",
];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-8">
      <h2 className="font-display text-[21px] font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

export default function AiLayerPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-baseline justify-between px-6 pt-7">
        <Link href="/">
          <Wordmark className="text-[18px]" />
        </Link>
        <Link href="/app" className="text-[13.5px] font-medium text-ink hover:text-cite">
          Open the book
        </Link>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-6 pb-24 pt-14">
        <h1 className="font-display text-[36px] font-bold leading-tight tracking-tight">
          The AI layer.
        </h1>
        <p className="-mt-6 max-w-2xl text-[15.5px] leading-relaxed text-ink-soft">
          One model pass inside the review pipeline — briefed with everything the other stages
          know, allowed to speak only when it can cite, and never load-bearing. This page is its
          contract, in full.
        </p>

        <AiLayerStatus />

        <Block title="Where the stage sits">
          <p>
            The pipeline is one orchestrator over short, inspectable stages — the model pass is
            stage three of five, placed deliberately between evidence and the critic, so the same
            citation gate polices it like every other finding:
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-1.5 font-mono text-[12px]">
            {STAGES.map((s, i) => (
              <span key={s.name} className="flex items-center gap-1.5">
                <span
                  className={
                    s.name === "semantic_review"
                      ? "rounded-md border border-cite/30 bg-cite-wash px-2 py-1 font-semibold text-cite"
                      : "rounded-md border border-line bg-paper px-2 py-1 text-ink-soft"
                  }
                  title={s.note}
                >
                  {s.name}
                </span>
                {i < STAGES.length - 1 ? <span className="text-ink-soft/50">→</span> : null}
              </span>
            ))}
          </div>
          <p className="mt-3">
            Findings from the pass arrive in the Reader tagged{" "}
            <span className="font-medium text-cite">semantic · model</span>; rule findings are
            tagged <span className="font-medium text-ink-soft">rule pass</span> — nothing is
            allowed to masquerade.
          </p>
        </Block>

        <Block title="What the model sees — the desk's whole record">
          <p>
            The brief is not just the raw text. At the moment the pass runs, it carries everything
            the other agents produced:
          </p>
          <ul className="mt-2 space-y-2">
            {SEES.map((s) => (
              <li key={s} className="flex gap-2.5">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cite" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3">
            That is the difference between a model that guesses and a model that decides: tone
            drift, messaging mismatch, and novel phrasings of prohibited claims are judged against
            the same clauses, facts, and evidence a human reviewer would pull up.
          </p>
        </Block>

        <Block title="The contract — enforced in code, not just prompted">
          <ul className="mt-2 space-y-2">
            {CONTRACT.map((c) => (
              <li key={c} className="flex gap-2.5">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-flag" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </Block>

        <Block title="What it runs on — and how it fails">
          <ul className="mt-2 space-y-2">
            {RUNS_ON.map((r) => (
              <li key={r} className="flex gap-2.5">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-soft/60" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Block>

        <p className="border-t border-line pt-6 text-[13px] text-ink-soft">
          The four nevers and the lane disclosure live on{" "}
          <Link href="/how-it-works" className="font-medium text-cite hover:underline">
            How this review works
          </Link>
          .
          <br />
          <Link href="/app" className="font-medium text-cite hover:underline">
            Back to the book
          </Link>
        </p>
      </main>
    </div>
  );
}
