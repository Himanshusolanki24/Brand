"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Wordmark } from "@/components/sketch";
import { Button } from "@/components/ui/button";

const DEMO_CODE = "0007";

export default function SignInPage() {
  const router = useRouter();
  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const sendCode = () => {
    setStage("code");
    setError(null);
  };

  const verify = () => {
    if (code.trim() !== DEMO_CODE) {
      setError("That code doesn't match. The demo code is written right below the field.");
      return;
    }
    router.push("/app");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <p>
          <Wordmark className="text-[20px]" />
        </p>
        <h1 className="mt-5 font-display text-[22px] font-semibold tracking-tight">
          {stage === "email" ? "Sign in to your desk" : "Enter the code"}
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          {stage === "email"
            ? "One code, no passwords to reset on deadline day."
            : "The demo code is 0007 — it appears here because no one is really emailing you."}
        </p>

        {stage === "email" ? (
          <form
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (emailOk) sendCode();
            }}
          >
            <label htmlFor="email" className="block pb-1.5 text-[12.5px] font-medium text-ink-soft">
              Work email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maya@meridiancoffee.com"
              className="h-10 w-full rounded-md border border-line-strong bg-sheet px-3 text-sm"
            />
            {!emailOk && email.length > 0 ? (
              <p className="pt-1.5 text-[12px] text-pencil">A full email, please — any address works in the demo.</p>
            ) : null}
            <Button type="submit" disabled={!emailOk} className="mt-4 w-full">
              Send the code
            </Button>
          </form>
        ) : (
          <form
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault();
              verify();
            }}
          >
            <label htmlFor="code" className="block pb-1.5 text-[12.5px] font-medium text-ink-soft">
              4-digit code
            </label>
            <input
              id="code"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
              placeholder="0007"
              className="h-10 w-full rounded-md border border-line-strong bg-sheet px-3 text-sm tabular-nums"
            />
            {error ? <p className="pt-1.5 text-[12px] text-redpen">{error}</p> : null}
            <Button type="submit" disabled={code.length < 4} className="mt-4 w-full">
              Step onto the desk
            </Button>
          </form>
        )}

        <p className={clsx("mt-6 text-[12px] leading-snug text-ink-soft")}>
          Demo of the Inkloom AI Hackathon Round 2 build. Auth is simulated — every character typed here
          stays in your browser.
        </p>
      </div>
    </div>
  );
}
