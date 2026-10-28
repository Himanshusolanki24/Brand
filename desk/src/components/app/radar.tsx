const INK = "var(--color-ink)";

/**
 * Guideline Clarity Radar — a printed plate, not a sketch: hairline rings,
 * a filled data polygon, axis labels in the interface face and scores in
 * mono. Pure SVG, deterministic on server and client.
 */
export function ClarityRadar({
  scores,
  size = 210,
}: {
  scores: Array<{ axis: string; score: number }>;
  size?: number;
}) {
  const cx = 105;
  const cy = 98;
  const r = 66;
  const n = scores.length;
  const pt = (i: number, radius: number): [number, number] => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };

  const dataPoly =
    n > 0
      ? Array.from(
          { length: n + 1 },
          (_, i) => pt(i, (Math.max(0, Math.min(100, scores[i % n].score)) / 100) * r),
        )
      : [];
  const toPath = (pts: Array<[number, number]>) =>
    pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + " Z";

  return (
    <svg viewBox="0 0 210 200" width={size} height={size} role="img" aria-label="Guideline Clarity Radar">
      {[0.25, 0.5, 0.75, 1].map((f, idx) => (
        <path
          key={f}
          d={toPath(Array.from({ length: n + 1 }, (_, i) => pt(i, r * f)))}
          fill="none"
          stroke={INK}
          strokeOpacity={idx === 3 ? 0.4 : 0.2}
          strokeWidth="1.1"
          strokeDasharray={idx === 3 ? undefined : "3 5"}
        />
      ))}
      {scores.map((s, i) => {
        const [x1, y1] = pt(i, 0);
        const [x2, y2] = pt(i, r);
        const [lx, ly] = pt(i, r + 19);
        return (
          <g key={s.axis}>
            <path d={`M ${x1} ${y1} L ${x2} ${y2}`} stroke={INK} strokeOpacity="0.28" strokeWidth="1" />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="var(--font-plex-sans)"
              fontSize="11.5"
              fontWeight="500"
              fill="var(--color-ink-soft)"
            >
              {s.axis}
            </text>
            <text
              x={lx}
              y={ly + 13}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="var(--font-plex-mono)"
              fontSize="11"
              fill="var(--color-ink)"
            >
              {s.score}
            </text>
          </g>
        );
      })}
      {n > 0 ? (
        <path
          d={toPath(dataPoly)}
          fill="var(--color-keep)"
          fillOpacity="0.12"
          stroke="var(--color-keep)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}
