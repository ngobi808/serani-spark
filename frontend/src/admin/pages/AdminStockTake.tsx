import { useEffect, useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApi } from '../api/adminClient';

export function AdminStockTake() {
  const { token } = useAdminAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [originalCounts, setOriginalCounts] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('stock_take');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ changed: number; unchanged: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    adminApi.listProducts(token).then((res) => {
      setProducts(res.products);
      // Pre-fill every input with the current stock number, so staff only
      // need to type over the ones that actually changed during counting.
      const initial: Record<string, string> = {};
      res.products.forEach((p: any) => { initial[p.id] = String(p.stock_quantity); });
      setCounts(initial);
      setOriginalCounts(initial);
    }).catch((err) => setError(err.message));
  }, [token]);

  const grouped = products.reduce((acc: Record<string, any[]>, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  const changedIds = products.filter((p) => counts[p.id] !== originalCounts[p.id]).map((p) => p.id);
  const changedCount = changedIds.length;

  async function handleSave() {
    if (!token || changedCount === 0) return;
    setSaving(true);
    setError('');
    setResult(null);
    try {
      // Only send rows that actually changed — smaller request, and matches
      // exactly what the confirmation count promised before clicking Save.
      const updates = changedIds.map((id) => ({ id, counted_quantity: Number(counts[id]) }));
      const res = await adminApi.bulkStockTake(token, updates, reason);
      setResult({ changed: res.changed, unchanged: res.unchanged });
      setOriginalCounts(counts); // reset the "changed" baseline now that these are saved
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1>Stock Take</h1>
      <p style={{ color: '#666' }}>
        Every field is pre-filled with the current recorded stock. Walk the shelves and only change the numbers that are actually different — anything left untouched is skipped automatically.
      </p>

      <div style={{ margin: '1rem 0', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <label>
          Reason for this batch:{' '}
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="stock_take">Morning stock take</option>
            <option value="received">New stock received</option>
            <option value="damaged">Damaged / write-off</option>
            <option value="correction">Correction</option>
          </select>
        </label>
        <label>
          Category:{' '}
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All categories</option>
            {Object.keys(grouped).sort().map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <p style={{ color: 'var(--ss-danger)' }}>{error}</p>}
      {result && (
        <p style={{ color: 'var(--ss-success)' }}>
          Saved — {result.changed} product(s) updated.
        </p>
      )}

      {Object.entries(grouped)
        .filter(([category]) => !categoryFilter || category === categoryFilter)
        .map(([category, items]) => (
        <div key={category} style={{ marginBottom: '1.5rem' }}>
          <h3>{category}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '0.4rem' }}>Product</th>
                <th style={{ padding: '0.4rem' }}>Packaging</th>
                <th style={{ padding: '0.4rem' }}>Counted Quantity</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const isChanged = counts[p.id] !== originalCounts[p.id];
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #eee', background: isChanged ? '#fff8e6' : 'transparent' }}>
                    <td style={{ padding: '0.4rem' }}>{p.name}</td>
                    <td style={{ padding: '0.4rem' }}>{p.packaging_unit}</td>
                    <td style={{ padding: '0.4rem' }}>
                      <input
                        type="number"
                        min={0}
                        value={counts[p.id] ?? ''}
                        onChange={(e) => setCounts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        style={{ width: 90, padding: '0.3rem', border: isChanged ? '1.5px solid var(--ss-gold)' : '1px solid #ccc' }}
                      />
                      {isChanged && <span style={{ marginLeft: '0.5rem', color: '#a67c1f', fontSize: '0.8rem' }}>changed</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {products.length > 0 && (
        <div style={{ position: 'sticky', bottom: 0, background: 'var(--ss-cream)', padding: '1rem 0', borderTop: '1px solid #ddd' }}>
          <button className="ss-btn-primary" onClick={handleSave} disabled={saving || changedCount === 0}>
            {saving
              ? 'Saving...'
              : changedCount === 0
                ? 'No changes to save'
                : `Save Stock Take (${changedCount} changed)`}
          </button>
        </div>
      )}
    </div>
  );
}
