import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/sketch";

export const metadata: Metadata = {
  title: "How this review works — BrandProof",
  description: "What is automated, what is simulated, and what the AI is never allowed to do.",
};

const NEVER = [
  "It never flags without a citation. A flag with nothing behind it is labeled advisory, on the record as what it is.",
  "It never applies a fix by itself. Every suggested rewrite waits for Accept or Edit — and Edit is the human's own text.",
  "It never closes a flag silently. Dismiss requires a written reason; that is the part this product is made of.",
  "It never approves or ships anything. Approval lives on the manifest, signed by a named human at a named rulebook version.",
];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-8">
      <h2 className="font-display text-[20px] font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-baseline justify-between px-6 pt-7">
        <Link href="/">
          <Wordmark className="text-[18px]" />
        </Link>
        <Link href="/app" className="text-[13.5px] font-medium text-ink hover:text-cite">
          Open the workspace
        </Link>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-6 pb-24 pt-14">
        <h1 className="font-display text-[34px] font-bold leading-tight tracking-tight">
          How this review works.
        </h1>
        <p className="-mt-6 max-w-2xl text-[15.5px] leading-relaxed text-ink-soft">
          Straight answers in plain order: what is automated here, what is only pretending, and the four
          things the AI is never allowed to do — at any confidence score.
        </p>

        <Block title="What the analysis pass is, in this demo">
          <p>
            Paste copy and it walks four steps: extract the text, anchor each sentence to your knowledge
            base, check claims against the guideline set, then draft intent-preserving rewrites. In this
            frontend-only build the pass runs on a small open, hand-written rule set (superlatives,
            unanchored numbers, physiology claims, named competitors, absolutes, uncertified eco terms)
            so you can see the whole loop live. It is a faithful shape-check, not the trained model.
          </p>
        </Block>

        <Block title="What the real product runs">
          <p>
            Per the Round&nbsp;1 plan: Gemini&nbsp;2.5&nbsp;Flash as the primary review model, grounded by
            retrieval over your guidelines, fact sheet, terminology and approved assets, with a
            GPT-4.1-mini fallback behind one adapter. Retrieval is a first-class step — the review scene
            cites the clause because the retrieved clause is part of the prompt, not because the model was
            told to sound sure.
          </p>
        </Block>

        <Block title="What is simulated in this demo">
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Sign-in and role switching (email code, RBAC labels).</li>
            <li>The seeded workspace — a fictional brand, Meridian Coffee, with its reviews pre-drawn.</li>
            <li>The review model pass (four visible steps instead of a live model call).</li>
            <li>Persistence: the demo resets when you reload; nothing is stored server-side.</li>
          </ul>
        </Block>

        <Block title="What the AI is never allowed to do">
          <ul className="mt-2 space-y-2">
            {NEVER.map((n) => (
              <li key={n} className="flex gap-2.5 text-[14.5px] leading-relaxed text-ink-soft">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-redpen" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </Block>

        <Block title="AI-use disclosure (hackathon compliance)">
          <p>
            This build was made with AI coding assistance: project scaffolding, component code, copy
            drafting, and the hand-sketch diagram system were drafted with AI tools under team direction,
            then reviewed and assembled by the team. The judge-facing claim chain stays honest end to end:
            the demo workspace runs on fictional data, no real customer content exists anywhere in this
            build, and every simulated or hardcoded behavior is listed on this page.
          </p>
        </Block>

        <Block title="The stack behind the demo">
          <p>
            Next.js 15 (App Router, React 19, TypeScript strict), Tailwind CSS v4, a typed demo data layer
            with no backend, and no UI kit beyond a small native-HTML set. The planned pairing stays as
            written in Round&nbsp;1: FastAPI services, PostgreSQL with pgvector retrieval, Supabase auth and
            storage, deployed on Vercel.
          </p>
        </Block>

        <p className="border-t border-line pt-6 text-[13px] text-ink-soft">
          Questions a judge would ask are welcome — the workflow, the data model, and the three named
          improvements all trace to the Round&nbsp;1 plan.
          <br />
          <Link href="/app" className="font-medium text-cite hover:underline">
            Back to the workspace
          </Link>
        </p>
      </main>
    </div>
  );
}
