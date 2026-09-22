interface TrendPoint {
  day: string;
  revenue_kes: number;
}

export function SalesTrendChart({ data }: { data: TrendPoint[] | undefined | null }) {
  const points = data ?? [];
  if (points.length === 0) return <p style={{ color: '#666', fontSize: '0.85rem' }}>No trend data available yet.</p>;

  const max = Math.max(...points.map((d) => d.revenue_kes), 1);
  const width = 700;
  const height = 120;
  const barGap = 4;
  const barWidth = (width - barGap * (points.length - 1)) / points.length;

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height + 24}`} style={{ width: '100%', maxWidth: 700, height: 'auto' }}>
        {points.map((d, i) => {
          const barHeight = (d.revenue_kes / max) * height;
          const x = i * (barWidth + barGap);
          const y = height - barHeight;
          const dateLabel = new Date(d.day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
          return (
            <g key={d.day}>
              <rect
                x={x} y={y} width={barWidth} height={barHeight}
                fill={d.revenue_kes > 0 ? 'var(--ss-gold)' : '#e5e0d5'}
                rx={2}
              >
                <title>{dateLabel}: KSh {d.revenue_kes.toLocaleString()}</title>
              </rect>
              {i % 2 === 0 && (
                <text x={x + barWidth / 2} y={height + 16} fontSize="9" textAnchor="middle" fill="#888">
                  {dateLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
