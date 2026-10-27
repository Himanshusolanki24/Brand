"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Scroll arrival — a section rises once when about 30% of it is visible.
 * Reduced motion: renders straight into the final state (CSS guarantees
 * visibility even if JS never runs).
 */
export function Reveal({
  children,
  className,
  delayMs,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("is-in");
            io.disconnect();
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style = (delayMs ? { "--d": `${delayMs}ms` } : undefined) as CSSProperties | undefined;
  return (
    <div ref={ref} className={`reveal ${className ?? ""}`} style={style}>
      {children}
    </div>
  );
}

/**
 * Tagline activation — each word turns from muted ink to full ink as it
 * crosses a trigger line (~70% of the viewport), in reading order. The
 * sentence also reaches screen readers whole, whatever the visual state.
 */
export function Tagline({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const words = Array.from(root.querySelectorAll<HTMLElement>(".tagword"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      words.forEach((w) => w.classList.add("is-on"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-on");
            io.unobserve(entry.target);
          }
        }
      },
      // Trigger line sits 30% up from the bottom edge of the viewport.
      { rootMargin: "0px 0px -30% 0px", threshold: 1 },
    );
    words.forEach((w) => io.observe(w));
    return () => io.disconnect();
  }, [text]);

  return (
    <p ref={ref} className={className} aria-label={text}>
      {text.split(/\s+/).map((word, i) => (
        <span key={i} className="tagword" aria-hidden>
          {word}
          {" "}
        </span>
      ))}
    </p>
  );
}
