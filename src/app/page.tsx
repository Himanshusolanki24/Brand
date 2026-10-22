import Link from "next/link";
import { SketchDiagram, SketchUnderline } from "@/components/sketch";

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

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-baseline justify-between px-6 pt-7">
        <Link href="/" className="text-lg">
          <span className="font-display font-bold tracking-tight">
            Brand<span className="relative inline-block">Proof<SketchUnderline seed={7} /></span>
            <span className="text-redpen">.</span>
          </span>
        </Link>
        <nav className="flex items-baseline gap-5 text-[13.5px]">
          <Link href="/how-it-works" className="text-ink-soft hover:text-ink">
            How this review works
          </Link>
          <Link href="/signin" className="font-medium text-ink hover:text-cite">
            Sign in
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        {/* Hero */}
        <section className="pt-16 pb-14 md:pt-24 md:pb-20">
          <h1 className="max-w-3xl font-display text-[42px] font-bold leading-[1.08] tracking-tight md:text-[58px]">
            <span className="relative inline-block">
              Proof your brand
              <SketchUnderline seed={2} />
            </span>{" "}
            before the world does.
          </h1>
          <p className="mt-5 max-w-xl text-[16.5px] leading-relaxed text-ink-soft">
            Most brand mistakes are caught after the deadline — by customers, lawyers, or whoever
            happens to be reading. BrandProof checks every piece against your rulebook before it ships:
            each flag cites the clause it broke, each fix keeps your intent, and nothing goes out without
            a human signature.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              href="/app"
              className="inline-flex h-11 items-center rounded-md bg-ink px-5 text-sm font-medium text-paper transition-colors hover:bg-[#2A3A59]"
            >
              Open the demo workspace
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex h-11 items-center rounded-md border border-line-strong bg-sheet px-5 text-sm text-ink transition-colors hover:border-ink"
            >
              How this review works
            </Link>
            <p className="font-hand text-[16px] text-pencil">
              no sign-up — the desk is already loaded
            </p>
          </div>
        </section>

        {/* The flag, before the world sees it */}
        <section aria-label="What a flag looks like" className="pb-20">
          <div className="mx-auto max-w-3xl rounded-lg border border-line bg-sheet px-8 py-7 md:px-10">
            <p className="font-display text-[12.5px] font-semibold text-ink-soft">
              On the desk — a review, mid-flight
            </p>
            <p className="mt-3 text-[16.5px] leading-[1.85]">
              The <mark className="proof" data-sev="high">best cold brew in America</mark> just landed.
              Nitro-smooth, certified organic, and{" "}
              <mark className="proof" data-sev="high">40% less acidic than iced coffee</mark>.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-redpen-wash px-2 py-0.5 text-[12px] font-semibold text-redpen">
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> High
              </span>
              <span className="text-[12px] text-ink-soft">sure 0.87 · 40% figure</span>
              <span className="rounded-md border border-cite/25 bg-cite-wash px-2.5 py-1 text-[11.5px] font-semibold text-cite">
                Guidelines §4.2 — <span className="underline underline-offset-2">Read the clause</span>
              </span>
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">
              <span className="font-medium text-ink">Suggested rewrite, intent kept:</span>{" "}
              <span className="text-redpen/70 line-through">The best cold brew in America</span>{" "}
              <span className="font-medium text-greenink">A cold brew we are genuinely proud of</span>
            </p>
          </div>
          <p className="mt-4 text-center text-[13px] text-ink-soft">
            Accept, edit, or dismiss with a reason — and the desk keeps the why on record.
          </p>
        </section>

        {/* The three improvements */}
        <section className="border-t border-line pb-20 pt-14">
          <h2 className="font-display text-[26px] font-semibold tracking-tight">
            Three rules the tool makes for itself first
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3 md:gap-6">
            {IMPROVEMENTS.map((imp) => (
              <article key={imp.name} className="border-t-2 border-ink/80 pt-4">
                <h3 className="font-display text-[17px] font-semibold">{imp.name}</h3>
                <div className="my-3">
                  <SketchDiagram variant={imp.variant} />
                </div>
                <p className="text-[13.5px] leading-relaxed text-ink-soft">{imp.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Why this exists */}
        <section className="border-t border-line pb-16 pt-12">
          <div className="grid gap-8 md:grid-cols-[1fr_1fr]">
            <div>
              <h2 className="font-display text-[22px] font-semibold tracking-tight">
                Rework is the tax; claims are the exposure
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
                Brand studies put rework at a couple of hours per asset that missed the shelf anyway, on
                top of the risk that travels downstream in your marketing and legal channels. The check
                currently lives in the one person everyone waits on, after the piece is already late.
              </p>
            </div>
            <div>
              <h2 className="font-display text-[22px] font-semibold tracking-tight">
                The check belongs before the deadline, not after it
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
                BrandProof reviews at intake, cites its authority, and records its human decisions.
                Nothing advances without a signature — not at any confidence score, and nothing that
                looks like red tape: three verdicts and a name on a manifest.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-baseline justify-between gap-3 px-6 py-6 text-[12.5px] text-ink-soft">
          <span>
            Brand<span className="font-semibold">Proof</span> — demo workspace. Team Inkloom AI Hackathon, Round 2.
          </span>
          <Link href="/how-it-works" className="text-cite hover:underline">
            AI use is disclosed here
          </Link>
        </div>
      </footer>
    </div>
  );
}
