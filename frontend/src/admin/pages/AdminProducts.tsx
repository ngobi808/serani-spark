import { useEffect, useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApi } from '../api/adminClient';

const EMPTY_FORM = {
  id: null as string | null,
  name: '', description: '', category: '', sku: '',
  packaging_unit: '', units_per_package: '', selling_price_kes: '', cost_price_kes: '',
  moq: '1', stock_quantity: '0', image_urls: '',
};

export function AdminProducts() {
  const { token } = useAdminAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    if (!token) return;
    adminApi.listProducts(token).then((res) => setProducts(res.products)).catch((err) => setError(err.message));
  }

  useEffect(load, [token]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function startEdit(p: any) {
    setForm({
      id: p.id,
      name: p.name,
      description: p.description || '',
      category: p.category,
      sku: p.sku || '',
      packaging_unit: p.packaging_unit,
      units_per_package: p.units_per_package?.toString() || '',
      selling_price_kes: p.selling_price_kes.toString(),
      cost_price_kes: p.cost_price_kes?.toString() || '',
      moq: p.moq.toString(),
      stock_quantity: p.stock_quantity.toString(),
      image_urls: (p.image_urls || []).join(', '),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');

    const payload = {
      name: form.name,
      description: form.description || null,
      category: form.category,
      sku: form.sku || null,
      packaging_unit: form.packaging_unit,
      units_per_package: form.units_per_package ? Number(form.units_per_package) : null,
      selling_price_kes: Number(form.selling_price_kes),
      cost_price_kes: form.cost_price_kes ? Number(form.cost_price_kes) : null,
      moq: Number(form.moq),
      stock_quantity: Number(form.stock_quantity),
      image_urls: form.image_urls ? form.image_urls.split(',').map((s) => s.trim()).filter(Boolean) : [],
    };

    try {
      if (form.id) {
        await adminApi.updateProduct(token, form.id, payload);
      } else {
        await adminApi.createProduct(token, payload);
      }
      setForm(EMPTY_FORM);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function adjustStock(p: any, delta: number) {
    if (!token) return;
    try {
      await adminApi.updateProduct(token, p.id, { stock_quantity: p.stock_quantity + delta });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function deactivate(p: any) {
    if (!token) return;
    if (!confirm(`Deactivate "${p.name}"? It will disappear from the storefront but stay in past orders.`)) return;
    try {
      await adminApi.deactivateProduct(token, p.id);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Products</h1>
      {error && <p style={{ color: 'var(--ss-danger)' }}>{error}</p>}

      <form onSubmit={handleSubmit} className="ss-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
        <h3 style={{ gridColumn: '1 / -1', margin: 0 }}>{form.id ? `Editing: ${form.name}` : 'Add New Product'}</h3>
        <input placeholder="Name *" required value={form.name} onChange={(e) => updateField('name', e.target.value)} />
        <input placeholder="Category *" required value={form.category} onChange={(e) => updateField('category', e.target.value)} />
        <input placeholder="SKU" value={form.sku} onChange={(e) => updateField('sku', e.target.value)} />
        <input placeholder="Packaging unit (e.g. bale) *" required value={form.packaging_unit} onChange={(e) => updateField('packaging_unit', e.target.value)} />
        <input placeholder="Units per package" type="number" value={form.units_per_package} onChange={(e) => updateField('units_per_package', e.target.value)} />
        <input placeholder="MOQ *" type="number" required value={form.moq} onChange={(e) => updateField('moq', e.target.value)} />
        <input placeholder="Selling price (KSh) *" type="number" required value={form.selling_price_kes} onChange={(e) => updateField('selling_price_kes', e.target.value)} />
        <input placeholder="Cost price (KSh) — admin only" type="number" value={form.cost_price_kes} onChange={(e) => updateField('cost_price_kes', e.target.value)} />
        <input placeholder="Stock quantity *" type="number" required value={form.stock_quantity} onChange={(e) => updateField('stock_quantity', e.target.value)} />
        <input placeholder="Image URL(s), comma-separated" value={form.image_urls} onChange={(e) => updateField('image_urls', e.target.value)} style={{ gridColumn: '1 / -1' }} />
        <textarea placeholder="Description" value={form.description} onChange={(e) => updateField('description', e.target.value)} style={{ gridColumn: '1 / -1', padding: '0.5rem' }} />

        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem' }}>
          <button className="ss-btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : form.id ? 'Save Changes' : 'Add Product'}</button>
          {form.id && <button type="button" className="ss-btn-secondary" onClick={() => setForm(EMPTY_FORM)}>Cancel</button>}
        </div>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '0.5rem' }}>Name</th>
            <th style={{ padding: '0.5rem' }}>Price</th>
            <th style={{ padding: '0.5rem' }}>Cost</th>
            <th style={{ padding: '0.5rem' }}>Margin</th>
            <th style={{ padding: '0.5rem' }}>Stock</th>
            <th style={{ padding: '0.5rem' }}>MOQ</th>
            <th style={{ padding: '0.5rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const margin = p.cost_price_kes ? Math.round(((p.selling_price_kes - p.cost_price_kes) / p.selling_price_kes) * 1000) / 10 : null;
            return (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee', opacity: p.is_active ? 1 : 0.4 }}>
                <td style={{ padding: '0.5rem' }}>{p.name}{!p.is_active && ' (inactive)'}</td>
                <td style={{ padding: '0.5rem' }}>KSh {Number(p.selling_price_kes).toLocaleString()}</td>
                <td style={{ padding: '0.5rem' }}>{p.cost_price_kes ? `KSh ${Number(p.cost_price_kes).toLocaleString()}` : '—'}</td>
                <td style={{ padding: '0.5rem' }}>{margin !== null ? `${margin}%` : '—'}</td>
                <td style={{ padding: '0.5rem' }}>
                  {p.stock_quantity} (avail: {p.available_quantity})
                  <button onClick={() => adjustStock(p, 1)} style={{ marginLeft: 6 }}>+</button>
                  <button onClick={() => adjustStock(p, -1)} style={{ marginLeft: 2 }}>-</button>
                </td>
                <td style={{ padding: '0.5rem' }}>{p.moq}</td>
                <td style={{ padding: '0.5rem' }}>
                  <button className="ss-btn-secondary" onClick={() => startEdit(p)}>Edit</button>{' '}
                  {p.is_active && <button className="ss-btn-secondary" onClick={() => deactivate(p)}>Deactivate</button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
