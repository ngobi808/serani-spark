import { useEffect, useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApi } from '../api/adminClient';

type Group = 'product' | 'category';

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function presetRange(preset: string): { from: string; to: string } {
  const today = new Date();
  if (preset === 'today') return { from: toISODate(today), to: toISODate(today) };
  if (preset === 'week') {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return { from: toISODate(start), to: toISODate(today) };
  }
  if (preset === 'lastMonth') {
    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const last = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: toISODate(first), to: toISODate(last) };
  }
  // this month
  return { from: toISODate(new Date(today.getFullYear(), today.getMonth(), 1)), to: toISODate(today) };
}

const PRESETS: { key: string; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Last 7 days' },
  { key: 'month', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
];

const money = (n: number) => `KSh ${Math.round(n).toLocaleString()}`;

function csvCell(value: string | number | null): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function AdminReports() {
  const { token } = useAdminAuth();
  const initial = presetRange('month');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [group, setGroup] = useState<Group>('product');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !from || !to) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    adminApi
      .getSalesReport(token, from, to, group)
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err) => { if (!cancelled) { setError(err.message); setData(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, from, to, group]);

  function applyPreset(key: string) {
    const r = presetRange(key);
    setFrom(r.from);
    setTo(r.to);
  }

  function exportCsv() {
    if (!data) return;
    const lines: string[] = [];
    lines.push(['Item', 'Category', 'Packaging', 'Units sold', 'Orders', 'Revenue (KSh)', 'Cost (KSh)', 'Profit (KSh)', 'Margin (%)', 'Cost data'].map(csvCell).join(','));
    for (const r of data.rows) {
      const costMissing = r.units_without_cost > 0;
      lines.push([
        r.label, r.category ?? '', r.packaging_unit ?? '', r.units_sold, r.order_count,
        r.revenue_kes, r.cost_kes, r.profit_kes,
        costMissing ? '' : r.margin_percent ?? '',
        costMissing ? `missing on ${r.units_without_cost} unit(s)` : 'complete',
      ].map(csvCell).join(','));
    }
    const t = data.totals;
    lines.push('');
    lines.push([`Period: ${data.from} to ${data.to}`].map(csvCell).join(','));
    lines.push(['Gross revenue (before discounts)', t.gross_revenue_kes].map(csvCell).join(','));
    lines.push(['Discounts given', t.discounts_kes].map(csvCell).join(','));
    lines.push(['Net revenue', t.net_revenue_kes].map(csvCell).join(','));
    lines.push(['Cost of goods', t.cost_kes].map(csvCell).join(','));
    lines.push(['Gross profit', t.gross_profit_kes].map(csvCell).join(','));
    lines.push(['Orders', t.order_count].map(csvCell).join(','));

    // BOM so Excel opens the file as UTF-8
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serani-sales-by-${data.group}-${data.from}-to-${data.to}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const t = data?.totals;
  const cardStyle = { margin: 0, color: '#666', fontSize: '0.85rem' } as const;
  const valueStyle = { margin: '0.3rem 0 0', fontSize: '1.4rem', fontWeight: 700, color: 'var(--ss-green-dark)' } as const;

  return (
    <div>
      <h1>Sales Report</h1>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {PRESETS.map((p) => (
          <button key={p.key} className="ss-btn-secondary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem' }} onClick={() => applyPreset(p.key)}>
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
        <label>From <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>To <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
        <select value={group} onChange={(e) => setGroup(e.target.value as Group)} style={{ padding: '0.4rem' }}>
          <option value="product">Group by product</option>
          <option value="category">Group by category</option>
        </select>
        <button className="ss-btn-primary" onClick={exportCsv} disabled={!data || data.rows.length === 0} style={{ padding: '0.45rem 1rem' }}>
          Export CSV
        </button>
      </div>

      {error && <p style={{ color: 'var(--ss-danger)' }}>{error}</p>}
      {loading && <p>Loading report...</p>}

      {t && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div className="ss-card"><p style={cardStyle}>Net sales</p><p style={valueStyle}>{money(t.net_revenue_kes)}</p></div>
            <div className="ss-card">
              <p style={cardStyle}>Gross profit</p>
              <p style={valueStyle}>{money(t.gross_profit_kes)}{t.margin_percent !== null && t.units_without_cost === 0 ? ` (${t.margin_percent}%)` : ''}</p>
            </div>
            <div className="ss-card"><p style={cardStyle}>Paid orders</p><p style={valueStyle}>{t.order_count}</p></div>
            <div className="ss-card"><p style={cardStyle}>Discounts given</p><p style={valueStyle}>{money(t.discounts_kes)}</p></div>
          </div>

          {t.units_without_cost > 0 && (
            <p style={{ background: '#fbf0dc', color: '#7a5a1a', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.9rem' }}>
              {t.units_without_cost} unit(s) sold have no buying price recorded, so profit and margin for those items are overstated. Add cost prices in Products to fix future reports.
            </p>
          )}

          {data.rows.length === 0 ? (
            <p>No paid orders in this period.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '0.5rem' }}>{group === 'product' ? 'Product' : 'Category'}</th>
                  {group === 'product' && <th style={{ padding: '0.5rem' }}>Category</th>}
                  <th style={{ padding: '0.5rem' }}>Units sold</th>
                  <th style={{ padding: '0.5rem' }}>Orders</th>
                  <th style={{ padding: '0.5rem' }}>Revenue</th>
                  <th style={{ padding: '0.5rem' }}>Cost</th>
                  <th style={{ padding: '0.5rem' }}>Profit</th>
                  <th style={{ padding: '0.5rem' }}>Margin</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r: any) => (
                  <tr key={r.label} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 600 }}>{r.label}</td>
                    {group === 'product' && <td style={{ padding: '0.5rem' }}>{r.category}</td>}
                    <td style={{ padding: '0.5rem' }}>{r.units_sold}{r.packaging_unit ? ` ${r.packaging_unit}${r.units_sold === 1 ? '' : 's'}` : ''}</td>
                    <td style={{ padding: '0.5rem' }}>{r.order_count}</td>
                    <td style={{ padding: '0.5rem' }}>{money(r.revenue_kes)}</td>
                    <td style={{ padding: '0.5rem' }}>{money(r.cost_kes)}</td>
                    <td style={{ padding: '0.5rem' }}>{money(r.profit_kes)}</td>
                    <td style={{ padding: '0.5rem' }}>
                      {r.units_without_cost > 0
                        ? <span style={{ color: 'var(--ss-warning)' }}>cost missing</span>
                        : r.margin_percent !== null ? `${r.margin_percent}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '1rem' }}>
            Row revenue is before discount codes, since a code applies to the whole order. Discounts are subtracted in the totals above.
            {group === 'category' && ' Category unit counts add together different packaging types (bales, packs, cartons).'}
            {' '}Only paid, processing and fulfilled orders are counted. Dates are in Nairobi time.
          </p>
        </>
      )}
    </div>
  );
}
