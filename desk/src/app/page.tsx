import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { Reveal, Tagline } from "@/components/motion";

export const metadata: Metadata = {
  title: "Inkloom — proof your brand before the world does",
};

const NEVER = [
  "It never flags without a citation. A flag with nothing behind it is labeled advisory, on the record as what it is.",
  "It never applies a fix by itself. Every suggested rewrite waits for Accept or Edit — and Edit is the human's own text.",
  "It never closes a flag silently. Dismiss requires a written reason; that is the part this product is made of.",
  "It never approves or ships anything. Approval lives on the manifest, signed by a named human at a named rulebook version.",
];

const PILLARS: Array<{ title: string; body: string }> = [
  {
    title: "Cite it or don't flag it",
    body: "Every finding anchors to the exact guideline clause it broke, with the evidence joined from your fact sheet. A claim the knowledge base cannot back is labeled unverified — and unverified is never allowed to sound like false.",
  },
  {
    title: "Nothing ships unsigned",
    body: "The review ends at a manifest, not a score: a deterministic PDF pinned to a rulebook version, signed by a named human who typed their own name. No auto-approval exists at any confidence score.",
  },
  {
    title: "Governance that learns",
    body: "The clarity radar doesn't just score your rulebook — it drafts the amendment, and a human ratifies it into the standards. The rules get easier to follow with every review cycle.",
  },
];

export default function CoverPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 pt-7">
        <Link href="/" aria-label="Inkloom home">
          <Wordmark className="text-[19px]" />
        </Link>
        <nav className="flex items-center gap-5 text-[13.5px] font-medium">
          <Link href="/how-it-works" className="text-ink-soft hover:text-ink">
            How this review works
          </Link>
          <Link href="/signin" className="text-ink hover:text-cite">
            Open the book →
          </Link>
        </nav>
      </header>

      <main id="app-main" className="mx-auto max-w-4xl px-6">
        {/* The title page */}
        <section className="rise-in pb-16 pt-20 md:pt-28">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-ink-soft">
            The brand book, proofed
          </p>
          <Tagline
            text="Proof your brand before the world does."
            className="mt-4 max-w-3xl font-display text-[40px] font-semibold leading-[1.15] tracking-tight md:text-[54px]"
          />
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
            Inkloom reads your copy against your own standards — every flag cites the clause it
            broke, every fix keeps your intent, and nothing ships without a human signature.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signin"
              className="inline-flex h-11 items-center rounded-md bg-ink px-5 text-[15px] font-semibold text-paper transition-[background-color,transform] duration-300 [transition-timing-function:var(--ease-settle)] hover:bg-ink/85 active:scale-[0.98]"
            >
              Open the book
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex h-11 items-center rounded-md border border-line-strong bg-sheet px-5 text-[15px] font-medium text-ink transition-[border-color,transform] duration-300 [transition-timing-function:var(--ease-settle)] hover:border-ink active:scale-[0.98]"
            >
              What is real, what is simulated
            </Link>
          </div>
        </section>

        {/* The three pillars */}
        <section aria-label="What the book enforces" className="border-t border-line py-14">
          <div className="grid gap-8 md:grid-cols-3">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delayMs={i * 90}>
                <h2 className="font-display text-[19px] font-semibold tracking-tight">{p.title}</h2>
                <p className="mt-2.5 text-[14px] leading-relaxed text-ink-soft">{p.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* The four nevers */}
        <section aria-label="What the AI is never allowed to do" className="border-t border-line py-14">
          <Reveal>
            <h2 className="font-display text-[24px] font-semibold tracking-tight">
              Four things the AI is never allowed to do.
            </h2>
            <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-ink-soft">
              At any confidence score. These are enforced in the product&apos;s flow, not promised in a slide.
            </p>
            <ul className="mt-6 max-w-2xl space-y-3">
              {NEVER.map((n) => (
                <li key={n} className="flex gap-2.5 text-[14.5px] leading-relaxed text-ink-soft">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-flag" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        {/* The honest close */}
        <section className="border-t border-line py-14">
          <Reveal>
            <div className="rounded-lg border border-line bg-sheet px-6 py-6">
              <p className="font-display text-[18px] font-semibold">Two lanes, both labeled</p>
              <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-soft">
                With the governance engine running, the desk is live: real sign-in, real retrieval,
                real governed actions. Without it, the same book opens on a seeded, fictional
                workspace — every simulated surface labeled as sample data, nothing pretending to be
                the trained model. The sidebar always tells you which desk you are reading.
              </p>
              <div className="mt-5">
                <Link
                  href="/signin"
                  className="inline-flex h-10 items-center rounded-md bg-ink px-4 text-sm font-semibold text-paper transition-[background-color,transform] duration-300 [transition-timing-function:var(--ease-settle)] hover:bg-ink/85 active:scale-[0.98]"
                >
                  Open the book
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-8 text-[12.5px] text-ink-soft">
          <Wordmark className="text-[13px] text-ink-soft/80" />
          <p>Inkloom AI Hackathon — Round 2 build. The workflow, the data model, and every claim trace to the plan.</p>
        </footer>
      </main>
    </div>
  );
}
