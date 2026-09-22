import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApi } from '../api/adminClient';

const STATUSES = ['pending_payment', 'paid', 'processing', 'fulfilled', 'cancelled', 'failed'];

export function AdminOrders() {
  const { token } = useAdminAuth();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? '');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [error, setError] = useState('');

  function load() {
    if (!token) return;
    adminApi.listOrders(token, statusFilter || undefined).then((res) => setOrders(res.orders)).catch((err) => setError(err.message));
  }

  useEffect(load, [token, statusFilter]);

  const filteredOrders = orders.filter((o) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      o.order_reference.toLowerCase().includes(term) ||
      (o.business_name ?? '').toLowerCase().includes(term) ||
      (o.contact_name ?? '').toLowerCase().includes(term) ||
      (o.phone_number ?? '').includes(search)
    );
  });

  async function openOrder(id: string) {
    if (!token) return;
    try {
      const detail = await adminApi.getOrderDetail(token, id);
      setSelected(detail);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function changeStatus(id: string, status: string) {
    if (!token) return;
    try {
      await adminApi.updateOrderStatus(token, id, status);
      load();
      if (selected?.order.id === id) openOrder(id);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '2rem', minHeight: '70vh' }}
      onClick={(e) => {
        // Only close when the click lands directly on this background container itself,
        // never when it bubbles up from an actual row, button, or input inside it.
        if (e.target === e.currentTarget) setSelected(null);
      }}
    >
      <div>
        <h1>Orders</h1>
        {error && <p style={{ color: 'var(--ss-danger)' }}>{error}</p>}

        <input
          type="text"
          placeholder="Search by order ref, customer, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginBottom: '0.75rem' }}
        />

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ marginBottom: '1rem', padding: '0.4rem' }}>
          <option value="">All statuses</option>
          <option value="paid,processing">Awaiting Fulfillment (paid or processing)</option>
          <option value="paid,processing,fulfilled">All Revenue Orders (paid, processing or fulfilled)</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '0.5rem' }}>Ref</th>
              <th style={{ padding: '0.5rem' }}>Customer</th>
              <th style={{ padding: '0.5rem' }}>Total</th>
              <th style={{ padding: '0.5rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o) => (
              <tr key={o.id} onClick={() => openOrder(o.id)} style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                <td style={{ padding: '0.5rem' }}>{o.order_reference}</td>
                <td style={{ padding: '0.5rem' }}>{o.business_name || o.contact_name}</td>
                <td style={{ padding: '0.5rem' }}>KSh {Number(o.total_kes).toLocaleString()}</td>
                <td style={{ padding: '0.5rem' }}>{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="ss-card">
          <h2>{selected.order.order_reference}</h2>
          <p><strong>Customer:</strong> {selected.order.contact_name} ({selected.order.business_name || 'individual'})</p>
          <p><strong>Phone:</strong> {selected.order.phone_number} · <strong>M-Pesa:</strong> {selected.order.mpesa_phone_number}</p>
          <p><strong>Delivery:</strong> {selected.order.address}, {selected.order.landmark}, {selected.order.city_or_county} ({selected.order.delivery_zone})</p>

          <label>
            <strong>Status:</strong>{' '}
            <select value={selected.order.status} onChange={(e) => changeStatus(selected.order.id, e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <h3>Items</h3>
          <ul>
            {selected.items.map((it: any, i: number) => (
              <li key={i}>{it.quantity} × {it.name} ({it.packaging_unit}) @ KSh {Number(it.unit_price_kes).toLocaleString()}</li>
            ))}
          </ul>

          <h3>Payments</h3>
          {selected.payments.length === 0 ? <p>No payment attempts yet.</p> : (
            <ul>
              {selected.payments.map((p: any, i: number) => (
                <li key={i}>
                  {p.status} — KSh {Number(p.amount_kes).toLocaleString()}
                  {p.mpesa_receipt_number && ` (receipt: ${p.mpesa_receipt_number})`}
                  {p.result_desc && <div style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.2rem' }}>Safaricom said: "{p.result_desc}"</div>}
                </li>
              ))}
            </ul>
          )}

          <a
            className="ss-btn-primary"
            style={{ display: 'inline-block', textDecoration: 'none', marginTop: '1rem' }}
            href={`https://wa.me/${selected.order.phone_number}?text=${encodeURIComponent(`Hi, this is Serani Spark regarding your order ${selected.order.order_reference}.`)}`}
            target="_blank" rel="noreferrer"
          >
            Open WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
