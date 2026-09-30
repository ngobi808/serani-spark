import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { customerApi, CustomerOrderSummary } from '../api/customerClient';
import { api } from '../api/client';
import { useCart } from '../context/CartContext';

export function CustomerAccount() {
  const { token, account, loading, logout } = useCustomerAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!loading && !token) navigate('/login');
  }, [loading, token, navigate]);

  useEffect(() => {
    if (!token) return;
    customerApi.getMyOrders(token).then((r) => setOrders(r.orders)).finally(() => setOrdersLoading(false));
  }, [token]);

  async function handleReorder(orderId: string) {
    if (!token) return;
    setReorderingId(orderId);
    setNotice('');
    try {
      const { items } = await customerApi.getReorderItems(token, orderId);
      const available = items.filter((i) => i.still_available);
      const skipped = items.length - available.length;

      // The reorder endpoint tells us WHAT to add, but the cart needs full,
      // current product objects - fetch each one fresh rather than trust
      // anything about price or stock from the reorder response.
      for (const item of available) {
        const product = await api.getProduct(item.product_id);
        addToCart(product, item.quantity);
      }

      setNotice(
        skipped > 0
          ? `Added ${available.length} item(s) to your cart. ${skipped} item(s) from this order are no longer available.`
          : `Added ${available.length} item(s) to your cart.`
      );
      if (available.length > 0) setTimeout(() => navigate('/cart'), 1200);
    } catch (err: any) {
      setNotice(err.message);
    } finally {
      setReorderingId(null);
    }
  }

  if (loading || !account) return <div className="ss-container"><p>Loading...</p></div>;

  return (
    <div className="ss-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>My Account</h1>
        <button className="ss-btn-secondary" onClick={() => { logout(); navigate('/'); }}>Log out</button>
      </div>

      <div className="ss-card" style={{ marginBottom: '2rem' }}>
        <strong>{account.contact_name}</strong>{account.business_name ? ` · ${account.business_name}` : ''}<br />
        {account.email}<br />
        {account.phone_number}
        {account.address && <><br />{account.address}{account.city_or_county ? `, ${account.city_or_county}` : ''}</>}
      </div>

      <h2>Your Orders</h2>
      {notice && <p style={{ color: 'var(--ss-success)' }}>{notice}</p>}
      {ordersLoading ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '0.5rem' }}>Reference</th>
              <th style={{ padding: '0.5rem' }}>Date</th>
              <th style={{ padding: '0.5rem' }}>Status</th>
              <th style={{ padding: '0.5rem' }}>Total</th>
              <th style={{ padding: '0.5rem' }}></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem', fontWeight: 600 }}>{o.order_reference}</td>
                <td style={{ padding: '0.5rem' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '0.5rem' }}>{o.status}</td>
                <td style={{ padding: '0.5rem' }}>KSh {o.total_kes.toLocaleString()}</td>
                <td style={{ padding: '0.5rem' }}>
                  <button className="ss-btn-secondary" disabled={reorderingId === o.id} onClick={() => handleReorder(o.id)}>
                    {reorderingId === o.id ? 'Adding...' : 'Reorder'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
