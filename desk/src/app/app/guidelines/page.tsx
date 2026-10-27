"use client";

// /app/guidelines moved to /app/dna — keep the old route as a redirect so
// nothing out there lands on a dead end.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GuidelinesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/app/dna");
  }, [router]);
  return (
    <p className="mt-16 text-center text-sm text-ink-soft">
      Moved — taking you to <span className="font-medium text-ink">Brand DNA</span>…
    </p>
  );
}
