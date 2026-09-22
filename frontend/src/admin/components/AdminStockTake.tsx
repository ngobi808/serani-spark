import { useEffect, useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApi } from '../api/adminClient';

export function AdminStockTake() {
  const { token } = useAdminAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('stock_take');
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
    }).catch((err) => setError(err.message));
  }, [token]);

  const grouped = products.reduce((acc: Record<string, any[]>, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    setError('');
    setResult(null);
    try {
      const updates = products.map((p) => ({ id: p.id, counted_quantity: Number(counts[p.id]) }));
      const res = await adminApi.bulkStockTake(token, updates, reason);
      setResult({ changed: res.changed, unchanged: res.unchanged });
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

      <div style={{ margin: '1rem 0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <label>
          Reason for this batch:{' '}
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="stock_take">Morning stock take</option>
            <option value="received">New stock received</option>
            <option value="damaged">Damaged / write-off</option>
            <option value="correction">Correction</option>
          </select>
        </label>
      </div>

      {error && <p style={{ color: 'var(--ss-danger)' }}>{error}</p>}
      {result && (
        <p style={{ color: 'var(--ss-success)' }}>
          Saved — {result.changed} product(s) updated, {result.unchanged} unchanged.
        </p>
      )}

      {Object.entries(grouped).map(([category, items]) => (
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
              {items.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.4rem' }}>{p.name}</td>
                  <td style={{ padding: '0.4rem' }}>{p.packaging_unit}</td>
                  <td style={{ padding: '0.4rem' }}>
                    <input
                      type="number"
                      min={0}
                      value={counts[p.id] ?? ''}
                      onChange={(e) => setCounts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      style={{ width: 90, padding: '0.3rem' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {products.length > 0 && (
        <button className="ss-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Stock Take'}
        </button>
      )}
    </div>
  );
}
