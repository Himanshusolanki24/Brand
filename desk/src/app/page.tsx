import Link from "next/link";
import type { CSSProperties } from "react";
import { Reveal, Tagline } from "@/components/motion";
import { SketchDiagram, Wordmark } from "@/components/sketch";

const IMPROVEMENTS = [
  {
    name: "Cite it or don't flag it",
    body: "Every flag points at the exact clause it broke — guideline number, one click to the text. If nothing in your rulebook anchors it, the flag rides along marked advisory rather than pretending a rule said something a rule never said.",
    variant: "cite" as const,
  },
  {
    name: "Fix, don't fight",
    body: "Flags arrive with a rewrite that keeps your intent — same excitement, same joke, defended claim. Nothing is ever auto-applied: accept it, edit it in your own words, or dismiss it with a reason. The reason is the part that makes your rulebook smarter.",
    variant: "fix" as const,
  },
  {
    name: "Close the loop",
    body: "When reviewers keep dismissing the same kind of flag, the rule is the thing that failed. The Guideline Clarity Radar drafts the amendment; a human ratifies it. Governance that learns, instead of just grieves.",
    variant: "radar" as const,
  },
];

const FAQ = [
  {
    q: "Is this a real app or a mockup?",
    a: "A real frontend with two lanes. With the engine running, the desk hydrates from live endpoints — real findings, real approval states, a signed manifest at the end. Without it, the desk runs a labeled sample lane so nothing pretends to be live.",
  },
  {
    q: "Can the AI approve or apply changes by itself?",
    a: "No. Nothing is auto-applied, and nothing ships unsigned. Reviewers accept, edit, or dismiss with a written reason; approval is a named human on a signed manifest, pinned to a rulebook version.",
  },
  {
    q: "Where does my content go?",
    a: "Nowhere beyond your machine. The engine runs locally, and the sample lane is a fictional brand, Meridian Coffee, built from seed fixtures. No real customer content exists anywhere in this build.",
  },
  {
    q: "What runs automatically today?",
    a: "The review pass is deterministic and reproducible in this build: six explicit rules, retrieval against your knowledge base, and evidence lookups tied to fact-sheet entries. The trained-model pass is the layer the Round 1 plan adds next.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <a href="#app-main" className="skip-link">
        Skip to content
      </a>
      <header className="mx-auto flex max-w-5xl items-baseline justify-between px-6 pt-7">
        <Link href="/" aria-label="Inkloom — back to the top" className="text-lg">
          <Wordmark />
        </Link>
        <nav className="flex items-baseline gap-5 text-sm">
          <Link href="/how-it-works" className="text-ink-soft hover:text-ink">
            How this review works
          </Link>
          <Link href="/signin" className="font-semibold text-ink hover:text-cite">
            Sign in
          </Link>
        </nav>
      </header>

      <main id="app-main" className="mx-auto max-w-5xl px-6">
        {/* Hero — opens plain, settles in */}
        <section className="pb-16 pt-16 md:pb-20 md:pt-24">
          <h1 className="rise-in hero-grad max-w-[680px] font-display text-4xl font-bold leading-[1.08] tracking-tight text-balance md:text-6xl md:leading-[1.05]">
            <span className="hero-grad-flat relative inline-block">
              Proof your brand
            </span>{" "}
            before the world does.
          </h1>
          <p
            className="rise-in mt-4 max-w-[680px] text-base leading-relaxed text-pretty text-ink-soft md:mt-5"
            style={{ "--d": "60ms" } as CSSProperties}
          >
            Most brand mistakes are caught after the deadline — by customers, lawyers, or whoever
            happens to be reading. Inkloom checks every piece against your rulebook before it ships:
            each flag cites the clause it broke, each fix keeps your intent, and nothing goes out
            without a human signature.
          </p>
          <div
            className="rise-in mt-6 flex flex-wrap items-center gap-4 md:mt-7"
            style={{ "--d": "120ms" } as CSSProperties}
          >
            <Link
              href="/app"
              className="inline-flex h-11 items-center rounded-md bg-ink px-5 text-base font-semibold text-paper transition-[background-color,transform] duration-300 [transition-timing-function:var(--ease-settle)] hover:bg-ink/85 active:scale-[0.98]"
            >
              Open the demo workspace
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex h-11 items-center text-base font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
            >
              How this review works
            </Link>
          </div>
          <p
            className="rise-in mt-4 font-hand text-xl text-pencil"
            style={{ "--d": "180ms" } as CSSProperties}
          >
            no sign-up — the desk is already loaded
          </p>
        </section>

        {/* Proof signal — a flag from the desk itself (seed fixture, not a mock) */}
        <section aria-label="What a flag looks like" className="pb-20">
          <Reveal>
            <div className="mx-auto max-w-3xl rounded-lg border border-line bg-sheet px-8 py-6 md:px-10">
              <p className="font-display text-xs font-semibold text-ink-soft">
                On the desk — a review, mid-flight
              </p>
              <p className="mt-3 text-base leading-[1.85]">
                The <mark className="proof" data-sev="high">best cold brew in America</mark> just
                landed. Nitro-smooth, certified organic, and{" "}
                <mark className="proof" data-sev="high">40% less acidic than iced coffee</mark>.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-redpen-wash px-2 py-0.5 text-xs font-semibold text-redpen">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> High
                </span>
                <span className="text-xs text-ink-soft">Analysis confidence 87% · 40% figure</span>
                <span className="rounded-md border border-cite/25 bg-cite-wash px-2.5 py-1 text-xs font-semibold text-cite">
                  Guidelines §4.2 — <span className="underline underline-offset-2">Read the clause</span>
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                <span className="font-medium text-ink">Suggested rewrite, intent kept:</span>{" "}
                <span className="text-redpen/70 line-through">The best cold brew in America</span>{" "}
                <span className="font-medium text-greenink">A cold brew we are genuinely proud of</span>
              </p>
            </div>
            <p className="mt-4 text-center text-sm text-ink-soft">
              Accept, edit, or dismiss with a reason — and the desk keeps the why on record.
            </p>
          </Reveal>
        </section>

        {/* Tagline reveal — the sentence weaves itself as you read */}
        <section aria-label="The desk, in one sentence" className="pb-20 md:pb-24">
          <Tagline
            className="mx-auto max-w-[680px] font-display text-3xl font-semibold leading-[1.25] tracking-tight md:text-4xl"
            text="Every claim answers to the rulebook. Every fix keeps the writer's own intent. Every signature is a person."
          />
        </section>

        {/* The three improvements */}
        <section className="border-t border-line pb-20 pt-12">
          <Reveal>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-balance">
              Three rules the tool makes for itself first
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-8 md:grid-cols-3 md:gap-6">
            {IMPROVEMENTS.map((imp, i) => (
              <Reveal key={imp.name} delayMs={i * 80} className="border-t-2 border-ink/80 pt-4">
                <h3 className="font-display text-base font-semibold">{imp.name}</h3>
                <div className="my-3">
                  <SketchDiagram variant={imp.variant} />
                </div>
                <p className="text-sm leading-relaxed text-pretty text-ink-soft">{imp.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Why this exists */}
        <section className="border-t border-line pb-16 pt-12">
          <div className="grid gap-8 md:grid-cols-2">
            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-balance">
                Rework is the tax; claims are the exposure
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-pretty text-ink-soft">
                Brand studies put rework at a couple of hours per asset that missed the shelf anyway,
                on top of the risk that travels downstream in your marketing and legal channels. The
                check currently lives in the one person everyone waits on, after the piece is already
                late.
              </p>
            </Reveal>
            <Reveal delayMs={80}>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-balance">
                The check belongs before the deadline, not after it
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-pretty text-ink-soft">
                Inkloom reviews at intake, cites its authority, and records its human decisions.
                Nothing advances without a signature — not at any confidence score, and nothing that
                looks like red tape: three verdicts and a name on a manifest.
              </p>
            </Reveal>
          </div>
        </section>

        {/* FAQ — straight answers, the disclosure page carries the rest */}
        <section className="border-t border-line pb-16 pt-12">
          <Reveal>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Questions a judge would ask
            </h2>
          </Reveal>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {FAQ.map((item, i) => (
              <Reveal key={item.q} delayMs={(i % 2) * 80} className="border-t border-line pt-4">
                <h3 className="font-display text-[15px] font-semibold leading-snug">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-pretty text-ink-soft">{item.a}</p>
              </Reveal>
            ))}
          </div>
          <Reveal delayMs={120}>
            <p className="mt-8 text-sm text-ink-soft">
              The full confession — what is automated, what is simulated, the four{" "}
              <span className="font-medium text-ink">nevers</span> — is on{" "}
              <Link
                href="/how-it-works"
                className="font-medium text-cite underline decoration-cite/30 underline-offset-4 hover:decoration-cite"
              >
                How this review works
              </Link>
              .
            </p>
          </Reveal>
        </section>

        {/* Final CTA — same action, one offer */}
        <section className="border-t border-line pb-24 pt-12 md:pb-28 md:pt-16">
          <Reveal>
            <div className="max-w-[680px]">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-balance md:text-3xl md:font-bold">
                Take a seat at the desk.
              </h2>
              <p className="mt-3 text-base text-pretty text-ink-soft">
                Seeded reviews are waiting — open a flag, read its evidence, keep or rewrite the
                line, and watch a decision end with a name instead of a guess.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Link
                  href="/app"
                  className="inline-flex h-11 items-center rounded-md bg-ink px-5 text-base font-semibold text-paper transition-[background-color,transform] duration-300 [transition-timing-function:var(--ease-settle)] hover:bg-ink/85 active:scale-[0.98]"
                >
                  Open the demo workspace
                </Link>
                <p className="font-hand text-xl text-pencil">demo code 0007, openly shown</p>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-baseline justify-between gap-3 px-6 py-6 text-xs text-ink-soft">
          <span>
            <Wordmark className="text-[13px]" /> — demo desk for the Inkloom AI Hackathon, Round 2.
          </span>
          <Link href="/how-it-works" className="font-medium text-cite hover:underline">
            AI use is disclosed here
          </Link>
        </div>
      </footer>
    </div>
  );
}
