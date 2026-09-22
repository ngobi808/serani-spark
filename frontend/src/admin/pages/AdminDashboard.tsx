import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApi } from '../api/adminClient';

export function AdminDashboard() {
  const { token } = useAdminAuth();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    adminApi.getDashboard(token).then(setData).catch((err) => setError(err.message));
  }, [token]);

  if (error) return <p style={{ color: 'var(--ss-danger)' }}>{error}</p>;
  if (!data) return <p>Loading dashboard...</p>;

  const cards = [
    { label: 'Total Orders', value: data.total_orders, link: '/admin/orders' },
    { label: 'Pending Payment', value: data.pending_orders, link: '/admin/orders?status=pending_payment' },
    { label: 'Awaiting Fulfillment', value: data.awaiting_fulfillment_orders, link: '/admin/orders?status=paid,processing' },
    { label: 'Fulfilled', value: data.fulfilled_orders, link: '/admin/orders?status=fulfilled' },
    { label: 'Sales Total', value: `KSh ${data.sales_total_kes.toLocaleString()}`, link: null },
    { label: 'Average Order Value', value: `KSh ${data.average_order_value_kes.toLocaleString()}`, link: null },
  ];

  return (
    <div>
      <h1>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {cards.map((c) => {
          const content = (
            <>
              <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>{c.label}</p>
              <p style={{ margin: '0.3rem 0 0', fontSize: '1.4rem', fontWeight: 700, color: 'var(--ss-green-dark)' }}>{c.value}</p>
            </>
          );
          return c.link ? (
            <Link key={c.label} to={c.link} className="ss-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              {content}
            </Link>
          ) : (
            <div key={c.label} className="ss-card">{content}</div>
          );
        })}
      </div>

      <h2>Top Products</h2>
      {data.top_products.length === 0 ? (
        <p>No sales yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '0.5rem' }}>Product</th>
              <th style={{ padding: '0.5rem' }}>Units Sold</th>
              <th style={{ padding: '0.5rem' }}>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.top_products.map((p: any) => (
              <tr key={p.name} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>{p.name}</td>
                <td style={{ padding: '0.5rem' }}>{p.units_sold}</td>
                <td style={{ padding: '0.5rem' }}>KSh {p.revenue_kes.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
