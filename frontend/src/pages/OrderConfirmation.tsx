import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { WhatsAppFab } from '../components/WhatsAppFab';

export function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (!orderId) return;
    api.getOrderStatus(orderId).then(setOrder).catch(() => {});
  }, [orderId]);

  if (!order) return <div className="ss-container"><p>Loading order...</p></div>;

  return (
    <div className="ss-container">
      <h1>✅ Order Confirmed</h1>
      <div className="ss-card" style={{ maxWidth: 480 }}>
        <p><strong>Order reference:</strong> {order.order_reference}</p>
        <p><strong>Amount paid:</strong> KSh {Number(order.amount_paid_kes).toLocaleString()}</p>
        <p><strong>Status:</strong> {order.status}</p>
        <p style={{ color: '#666' }}>Our team will contact you shortly on WhatsApp to arrange delivery. Keep your order reference handy.</p>
      </div>
      <WhatsAppFab orderReference={order.order_reference} />
    </div>
  );
}
