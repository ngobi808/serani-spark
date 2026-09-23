import { useEffect, useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApi } from '../api/adminClient';

const EMPTY_FORM = { code: '', discount_type: 'percent', discount_value: '', max_uses: '', expires_at: '' };

export function AdminDiscountCodes() {
  const { token } = useAdminAuth();
  const [codes, setCodes] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    if (!token) return;
    adminApi.listDiscountCodes(token).then((res) => setCodes(res.codes)).catch((err) => setError(err.message));
  }

  useEffect(load, [token]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await adminApi.createDiscountCode(token, {
        code: form.code,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      });
      setForm(EMPTY_FORM);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: any) {
    if (!token) return;
    try {
      await adminApi.updateDiscountCode(token, c.id, { is_active: !c.is_active });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Discount Codes</h1>
      {error && <p style={{ color: 'var(--ss-danger)' }}>{error}</p>}

      <form onSubmit={handleSubmit} className="ss-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
        <h3 style={{ gridColumn: '1 / -1', margin: 0 }}>Create New Code</h3>
        <input placeholder="Code (e.g. LAUNCH10)" required value={form.code} onChange={(e) => updateField('code', e.target.value.toUpperCase())} />
        <select value={form.discount_type} onChange={(e) => updateField('discount_type', e.target.value)}>
          <option value="percent">Percent off</option>
          <option value="fixed">Fixed amount off (KSh)</option>
        </select>
        <input
          placeholder={form.discount_type === 'percent' ? 'e.g. 10 (for 10%)' : 'e.g. 500 (KSh)'}
          type="number" required value={form.discount_value}
          onChange={(e) => updateField('discount_value', e.target.value)}
        />
        <input placeholder="Max uses (optional)" type="number" value={form.max_uses} onChange={(e) => updateField('max_uses', e.target.value)} />
        <label style={{ gridColumn: '1 / -1', fontSize: '0.85rem', color: '#666' }}>
          Expires on (optional):{' '}
          <input type="date" value={form.expires_at} onChange={(e) => updateField('expires_at', e.target.value)} />
        </label>
        <button className="ss-btn-primary" type="submit" disabled={saving} style={{ gridColumn: '1 / -1' }}>
          {saving ? 'Creating...' : 'Create Code'}
        </button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '0.5rem' }}>Code</th>
            <th style={{ padding: '0.5rem' }}>Discount</th>
            <th style={{ padding: '0.5rem' }}>Used</th>
            <th style={{ padding: '0.5rem' }}>Expires</th>
            <th style={{ padding: '0.5rem' }}>Status</th>
            <th style={{ padding: '0.5rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {codes.map((c) => (
            <tr key={c.id} style={{ borderBottom: '1px solid #eee', opacity: c.is_active ? 1 : 0.5 }}>
              <td style={{ padding: '0.5rem', fontWeight: 700 }}>{c.code}</td>
              <td style={{ padding: '0.5rem' }}>{c.discount_type === 'percent' ? `${c.discount_value}%` : `KSh ${c.discount_value.toLocaleString()}`}</td>
              <td style={{ padding: '0.5rem' }}>{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
              <td style={{ padding: '0.5rem' }}>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'}</td>
              <td style={{ padding: '0.5rem' }}>{c.is_active ? 'Active' : 'Inactive'}</td>
              <td style={{ padding: '0.5rem' }}>
                <button className="ss-btn-secondary" onClick={() => toggleActive(c)}>
                  {c.is_active ? 'Deactivate' : 'Reactivate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
