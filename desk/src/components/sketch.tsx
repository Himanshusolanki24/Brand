import type { SVGProps } from "react";

/* Deterministic wobble — same run on server and client, no hydration drift. */
function jitter(i: number, seed: number): number {
  const v = Math.sin((i + 1) * 12.9898 + seed) * 43758.5453;
  return v - Math.floor(v) - 0.5;
}

export function wobblePath(
  pts: Array<[number, number]>,
  seed = 1,
  amp = 1.6,
): string {
  const p = pts.map(
    ([x, y], i) =>
      [
        x + jitter(i, seed) * amp * 2,
        y + jitter(i + 57, seed) * amp * 2,
      ] as [number, number],
  );
  let d = `M ${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1];
    const b = p[i];
    const mx = (a[0] + b[0]) / 2 + jitter(i + 101, seed) * amp;
    const my = (a[1] + b[1]) / 2 + jitter(i + 131, seed) * amp;
    d += ` Q ${mx.toFixed(1)} ${my.toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  }
  return d;
}

const INK = "var(--color-ink)";

export function SketchUnderline({ seed = 3, className }: { seed?: number; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 10"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute -bottom-1 left-0 h-[0.32em] w-full ${className ?? ""}`}
    >
      <path
        d={wobblePath(
          [
            [2, 7],
            [30, 4],
            [62, 7],
            [90, 4],
            [118, 6],
          ],
          seed,
        )}
        fill="none"
        stroke="var(--color-redpen)"
        strokeWidth="2.6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`font-display font-bold tracking-tight ${className ?? ""}`}>
      Ink
      <span className="relative inline-block">
        loom
        <SketchUnderline seed={7} />
      </span>
      <span className="text-redpen">.</span>
    </span>
  );
}

/* Hand-sketch diagrams that echo the Round 1 napkin set. */

function DiagramCite() {
  return (
    <svg viewBox="0 0 260 150" fill="none" className="w-full">
      <path d={wobblePath([[18, 30], [18, 120], [98, 120], [98, 30], [18, 30]], 4, 1.4)} stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d={wobblePath([[32, 55], [72, 55]], 11)} stroke={INK} strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
      <path d={wobblePath([[32, 72], [72, 72]], 13)} stroke={INK} strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
      <path d={wobblePath([[32, 89], [60, 89]], 17)} stroke="var(--color-redpen)" strokeWidth="2.6" strokeLinecap="round" />
      <path d={wobblePath([[112, 75], [134, 75]], 21)} stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M134 75 l-5 -4 m5 4 l-5 4" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <path d={wobblePath([[150, 28], [150, 118], [238, 118], [238, 28], [150, 28]], 9, 1.2)} stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <text x="168 " y="48" fontFamily="var(--font-caveat)" fontSize="17" fill={INK}>§4.2</text>
      <text x="166" y="78" fontFamily="var(--font-caveat)" fontSize="13" fill="var(--color-ink-soft)">one clause,</text>
      <text x="166" y="94" fontFamily="var(--font-caveat)" fontSize="13" fill="var(--color-ink-soft)">cited, clicked</text>
      <text x="24" y="140" fontFamily="var(--font-caveat)" fontSize="13" fill="var(--color-ink-soft)">your draft</text>
      <text x="176" y="140" fontFamily="var(--font-caveat)" fontSize="13" fill="var(--color-ink-soft)">the rulebook</text>
    </svg>
  );
}

function DiagramFix() {
  return (
    <svg viewBox="0 0 260 150" fill="none" className="w-full">
      <path d={wobblePath([[24, 34], [24, 116], [120, 116], [120, 34], [24, 34]], 6, 1.3)} stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d={wobblePath([[42, 62], [100, 62]], 15)} stroke="var(--color-redpen)" strokeWidth="2.6" strokeLinecap="round" />
      <text x="40" y="52" fontFamily="var(--font-caveat)" fontSize="14" fill="var(--color-ink-soft)">flagged line</text>
      <text x="150" y="52" fontFamily="var(--font-caveat)" fontSize="14" fill="var(--color-greenink)">same intent,</text>
      <text x="150" y="70" fontFamily="var(--font-caveat)" fontSize="14" fill="var(--color-greenink)">honest wording</text>
      <path d={wobblePath([[136, 74], [168, 46], [172, 88]], 22)} stroke="var(--color-greenink)" strokeWidth="2.2" strokeLinecap="round" />
      <path d={wobblePath([[168, 46], [172, 88]], 30)} stroke="var(--color-greenink)" strokeWidth="2.2" strokeLinecap="round" />
      <path d={wobblePath([[148, 112], [60, 128]], 26)} stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.6" strokeDasharray="5 6" />
      <text x="36" y="142" fontFamily="var(--font-caveat)" fontSize="13" fill="var(--color-ink-soft)">never auto-applied</text>
    </svg>
  );
}

function DiagramRadar() {
  return (
    <svg viewBox="0 0 260 150" fill="none" className="w-full">
      <path d={wobblePath([[130, 24], [190, 64], [168, 116], [92, 116], [70, 64], [130, 24]], 8, 1.6)} stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <path d={wobblePath([[130, 46], [162, 68], [152, 100], [108, 100], [98, 68], [130, 46]], 14, 1.2)} stroke="var(--color-greenink)" strokeWidth="2.2" strokeLinecap="round" />
      {[[130, 24, 130, 120], [190, 64, 74, 74], [168, 116, 96, 42], [70, 64, 188, 96]].map(([x1, y1, x2, y2], i) => (
        <path key={i} d={wobblePath([[x1, y1], [x2, y2]], 40 + i)} stroke={INK} strokeWidth="1.2" opacity="0.35" strokeLinecap="round" />
      ))}
      <text x="118" y="140" fontFamily="var(--font-caveat)" fontSize="14" fill="var(--color-ink-soft)">the Guideline Clarity Radar</text>
      <text x="196" y="70" fontFamily="var(--font-caveat)" fontSize="13" fill="var(--color-ink-soft)">fuzzy rules</text>
      <text x="196" y="88" fontFamily="var(--font-caveat)" fontSize="13" fill="var(--color-ink-soft)">become drafts</text>
    </svg>
  );
}

export function SketchDiagram({ variant, ...props }: { variant: "cite" | "fix" | "radar" } & SVGProps<SVGSVGElement>) {
  const Diagram = { cite: DiagramCite, fix: DiagramFix, radar: DiagramRadar }[variant];
  return <Diagram {...props} />;
}
