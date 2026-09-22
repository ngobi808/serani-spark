interface TrendPoint {
  day: string;
  revenue_kes: number;
}

export function SalesTrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.revenue_kes), 1);
  const width = 700;
  const height = 120;
  const barGap = 4;
  const barWidth = (width - barGap * (data.length - 1)) / data.length;

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height + 24}`} style={{ width: '100%', maxWidth: 700, height: 'auto' }}>
        {data.map((d, i) => {
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
