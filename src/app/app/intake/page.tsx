"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDemo } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { SketchDiagram } from "@/components/sketch";
import type { Channel, Review } from "@/lib/types";

const CHANNELS: Channel[] = ["Email", "Website", "Paid ad", "SMS", "Deck"];

const CHECKS: Array<[string, string]> = [
  ["Superlatives without a named source", "§4.2"],
  ["Numbers the fact sheet doesn't hold", "§2.1"],
  ["Health and energy claims", "§3.1"],
  ["Named competitors in ad copy", "§3.2"],
  ["Absolutes: always, never, guaranteed", "§4.1"],
  ["Uncertified eco language", "§5.1"],
];

export default function IntakePage() {
  const { dispatch } = useDemo();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState<Channel>("Email");
  const [body, setBody] = useState("");

  const ready = title.trim().length > 2 && body.trim().length > 20;

  const submit = () => {
    const id = `r${Date.now()}`;
    const review: Review = {
      id,
      title: title.trim(),
      channel,
      author: "You",
      submittedAt: Date.now(),
      status: "analyzing",
      sections: [{ id: "new-s1", heading: "Draft", body: body.trim() }],
      issues: [],
    };
    dispatch({ type: "analyze", review });
    router.push(`/app/reviews/${id}`);
  };

  return (
    <div>
      <header>
        <h1 className="font-display text-[24px] font-semibold tracking-tight">Proof a new piece</h1>
        <p className="text-sm text-ink-soft">
          Paste copy and put it on the desk. It comes back with cited flags and suggested fixes — you make every call.
        </p>
      </header>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-lg border border-line bg-sheet p-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <label className="block">
              <span className="block pb-1.5 text-[12.5px] font-medium text-ink-soft">What is this piece?</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="April email — cold brew launch"
                className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="block pb-1.5 text-[12.5px] font-medium text-ink-soft">Channel</span>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as Channel)}
                className="h-10 w-full rounded-md border border-line-strong bg-paper px-2.5 text-sm"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="block pb-1.5 text-[12.5px] font-medium text-ink-soft">The copy</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="Paste the draft here — email body, banner copy, deck text…"
              className="w-full resize-y rounded-md border border-line-strong bg-paper px-3 py-2.5 text-[14.5px] leading-relaxed"
            />
          </label>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            <p className="mr-auto font-hand text-[15px] text-pencil">
              try: “the best cold brew, 40% less acid, clean energy — guaranteed”
            </p>
            <Button variant="approve" disabled={!ready} onClick={submit}>
              Run proof review
            </Button>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-line bg-sheet p-5">
            <h2 className="font-display text-[16px] font-semibold">What the pass checks</h2>
            <ul className="mt-3 space-y-2">
              {CHECKS.map(([label, clause]) => (
                <li key={clause} className="flex items-baseline gap-2.5 text-[13.5px]">
                  <span className="font-display text-[11.5px] font-bold text-cite">§{clause}</span>
                  <span className="text-ink">{label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-line bg-sheet p-4">
            <SketchDiagram variant="cite" />
            <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">
              Every flag must cite its clause. If nothing in the knowledge base anchors it, the flag
              rides along as <span className="font-hand text-[15px] text-pencil">advisory, uncited</span>.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
