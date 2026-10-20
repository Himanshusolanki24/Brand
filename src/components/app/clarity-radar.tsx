import { wobblePath } from "../sketch";

const INK = "var(--color-ink)";

export function ClarityRadar({
  scores,
  size = 210,
}: {
  scores: Array<{ axis: string; score: number }>;
  size?: number;
}) {
  const cx = 105;
  const cy = 96;
  const r = 70;
  const n = scores.length;
  const pt = (i: number, radius: number): [number, number] => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };

  const ring = (radius: number, seed: number) =>
    wobblePath(
      Array.from({ length: n + 1 }, (_, i) => pt(i, radius)),
      seed,
      1.4,
    );

  const dataPoly = wobblePath(
    Array.from(
      { length: n + 1 },
      (_, i) => pt(i, (scores[i % n].score / 100) * r),
    ),
    77,
    2,
  );

  return (
    <svg viewBox="0 0 210 200" width={size} height={size} role="img" aria-label="Guideline Clarity Radar">
      {[0.25, 0.5, 0.75, 1].map((f, idx) => (
        <path
          key={f}
          d={ring(r * f, idx * 13 + 3)}
          fill="none"
          stroke={INK}
          strokeOpacity={idx === 3 ? 0.4 : 0.22}
          strokeWidth="1.2"
          strokeDasharray={idx === 3 ? undefined : "4 5"}
        />
      ))}
      {scores.map((s, i) => {
        const [x1, y1] = pt(i, 0);
        const [x2, y2] = pt(i, r);
        const [lx, ly] = pt(i, r + 17);
        return (
          <g key={s.axis}>
            <path d={`M ${x1} ${y1} L ${x2} ${y2}`} stroke={INK} strokeOpacity="0.3" strokeWidth="1.1" />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="var(--font-caveat)"
              fontSize="14.5"
              fill="var(--color-ink-soft)"
            >
              {s.axis}
            </text>
            <text
              x={lx}
              y={ly + 13}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="var(--font-caveat)"
              fontSize="13"
              fill="var(--color-ink)"
            >
              {s.score}
            </text>
          </g>
        );
      })}
      <path d={dataPoly} fill="var(--color-greenink)" fillOpacity="0.13" stroke="var(--color-greenink)" strokeWidth="2.3" strokeLinejoin="round" />
    </svg>
  );
}
