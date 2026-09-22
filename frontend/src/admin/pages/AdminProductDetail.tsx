import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApi } from '../api/adminClient';

export function AdminProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAdminAuth();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !id) return;
    adminApi.getProductDetail(token, id).then(setData).catch((err) => setError(err.message));
  }, [token, id]);

  if (error) return <p style={{ color: 'var(--ss-danger)' }}>{error}</p>;
  if (!data) return <p>Loading...</p>;

  const { product, sales_summary, monthly_sales, stock_history, orders } = data;
  const margin = sales_summary.total_revenue_kes > 0
    ? Math.round((sales_summary.total_profit_kes / sales_summary.total_revenue_kes) * 1000) / 10
    : null;

  return (
    <div>
      <Link to="/admin/products" style={{ color: 'var(--ss-green-dark)' }}>← Back to Products</Link>
      <h1 style={{ marginTop: '0.5rem' }}>{product.name}</h1>
      <p style={{ color: '#666' }}>{product.category} · {product.packaging_unit} · MOQ {product.moq} · Stock: {product.stock_quantity}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', margin: '1.5rem 0' }}>
        <div className="ss-card">
          <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>Units Sold (all time)</p>
          <p style={{ margin: '0.3rem 0 0', fontSize: '1.4rem', fontWeight: 700, color: 'var(--ss-green-dark)' }}>{sales_summary.total_units_sold}</p>
        </div>
        <div className="ss-card">
          <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>Revenue</p>
          <p style={{ margin: '0.3rem 0 0', fontSize: '1.4rem', fontWeight: 700, color: 'var(--ss-green-dark)' }}>KSh {sales_summary.total_revenue_kes.toLocaleString()}</p>
        </div>
        <div className="ss-card">
          <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>Profit</p>
          <p style={{ margin: '0.3rem 0 0', fontSize: '1.4rem', fontWeight: 700, color: 'var(--ss-green-dark)' }}>KSh {sales_summary.total_profit_kes.toLocaleString()}</p>
        </div>
        <div className="ss-card">
          <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>Margin</p>
          <p style={{ margin: '0.3rem 0 0', fontSize: '1.4rem', fontWeight: 700, color: 'var(--ss-green-dark)' }}>{margin !== null ? `${margin}%` : '—'}</p>
        </div>
      </div>

      <h2>Monthly Sales</h2>
      {monthly_sales.length === 0 ? <p>No sales yet.</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '0.4rem' }}>Month</th>
              <th style={{ padding: '0.4rem' }}>Units Sold</th>
              <th style={{ padding: '0.4rem' }}>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {monthly_sales.map((m: any) => (
              <tr key={m.month} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.4rem' }}>{m.month}</td>
                <td style={{ padding: '0.4rem' }}>{m.units_sold}</td>
                <td style={{ padding: '0.4rem' }}>KSh {m.revenue_kes.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Stock Adjustment History</h2>
      {stock_history.length === 0 ? <p>No stock adjustments recorded yet.</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '0.4rem' }}>Date</th>
              <th style={{ padding: '0.4rem' }}>Change</th>
              <th style={{ padding: '0.4rem' }}>Reason</th>
              <th style={{ padding: '0.4rem' }}>By</th>
            </tr>
          </thead>
          <tbody>
            {stock_history.map((h: any, i: number) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.4rem' }}>{new Date(h.created_at).toLocaleString()}</td>
                <td style={{ padding: '0.4rem', color: h.difference >= 0 ? 'var(--ss-success)' : 'var(--ss-danger)' }}>
                  {h.previous_quantity} → {h.new_quantity} ({h.difference >= 0 ? '+' : ''}{h.difference})
                </td>
                <td style={{ padding: '0.4rem' }}>{h.reason}</td>
                <td style={{ padding: '0.4rem' }}>{h.admin_email ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Recent Orders</h2>
      {orders.length === 0 ? <p>No orders yet.</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '0.4rem' }}>Order</th>
              <th style={{ padding: '0.4rem' }}>Date</th>
              <th style={{ padding: '0.4rem' }}>Qty</th>
              <th style={{ padding: '0.4rem' }}>Unit Price</th>
              <th style={{ padding: '0.4rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o: any, i: number) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.4rem' }}>{o.order_reference}</td>
                <td style={{ padding: '0.4rem' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '0.4rem' }}>{o.quantity}</td>
                <td style={{ padding: '0.4rem' }}>KSh {o.unit_price_kes.toLocaleString()}</td>
                <td style={{ padding: '0.4rem' }}>{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
