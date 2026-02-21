interface QualityScoreBadgeProps {
  score: number | null;
}

function getScoreColor(score: number): string {
  if (score >= 71) return 'text-success border-success/30';
  if (score >= 41) return 'text-warning border-warning/30';
  return 'text-error border-error/30';
}

export function QualityScoreBadge({ score }: QualityScoreBadgeProps) {
  if (score === null) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-xs font-bold ${getScoreColor(score)}`}
    >
      {score}
      <span className="text-text-muted font-normal">/100</span>
    </span>
  );
}
