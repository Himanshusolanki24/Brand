import Link from "next/link";
import { Wordmark } from "@/components/sketch";

export default function NotFound() {
  return (
    <main id="app-main" className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
      <Wordmark className="text-lg" />
      <h1 className="mt-8 font-display text-3xl font-bold tracking-tight text-balance md:text-4xl">
        This page was never proved.
      </h1>
      <p className="mt-3 text-base text-pretty text-ink-soft">
        The desk keeps every decision on the record, but this address does not exist. Nothing was
        invented to fill the gap.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-md bg-ink px-5 text-base font-semibold text-paper transition-[background-color,transform] duration-300 [transition-timing-function:var(--ease-settle)] hover:bg-ink/85 active:scale-[0.98]"
        >
          Back to the desk
        </Link>
        <Link
          href="/how-it-works"
          className="inline-flex h-11 items-center rounded-md border border-line-strong bg-sheet px-5 text-base font-medium text-ink transition-[border-color,transform] duration-300 [transition-timing-function:var(--ease-settle)] hover:border-ink active:scale-[0.98]"
        >
          How this review works
        </Link>
      </div>
      <p className="mt-10 font-hand text-lg text-pencil">the paper is blank for a reason.</p>
    </main>
  );
}
