interface Props {
  score: number; // 0–1
  size?: number;
}

export function MatchScoreGauge({ score, size = 72 }: Props) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const filled = score * circ;
  const pct = Math.round(score * 100);

  const color = score >= 0.85 ? "#10b981" : score >= 0.7 ? "#f59e0b" : "#f97316";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={8} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <span
        className="absolute text-sm font-bold"
        style={{ color }}
      >
        {pct}%
      </span>
    </div>
  );
}
