import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { api } from '../api/client';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '254700000000';

type Stage = 'form' | 'submitting' | 'awaiting_payment' | 'exceeds_ceiling' | 'error';

export function Checkout() {
  const { lines, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number | null>(null);
  const [form, setForm] = useState({
    business_name: '', contact_name: '', phone_number: '', mpesa_phone_number: '',
    delivery_zone: '', address: '', landmark: '', city_or_county: '',
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStage('submitting');
    setErrorMsg('');

    try {
      const result = await api.createOrder({
        ...form,
        items: lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
        discount_code: discountCode.trim() || undefined,
      });

      setOrderRef(result.order.order_reference);
      setAppliedDiscount(result.order.discount_amount_kes || 0);

      if (result.exceeds_mpesa_ceiling) {
        setStage('exceeds_ceiling');
        return;
      }

      // Fire the STK push, then poll order status for payment confirmation.
      await api.startStkPush(result.order.id);
      setStage('awaiting_payment');
      pollOrderStatus(result.order.id);
    } catch (err: any) {
      setErrorMsg(err.message);
      setStage('error');
    }
  }

  function pollOrderStatus(orderId: string) {
    const interval = setInterval(async () => {
      try {
        const status = await api.getOrderStatus(orderId);
        if (status.status === 'paid') {
          clearInterval(interval);
          clearCart();
          navigate(`/order-confirmation/${orderId}`);
        } else if (status.status === 'failed' || status.status === 'cancelled') {
          clearInterval(interval);
          setErrorMsg('Payment was not completed. You can try again.');
          setStage('error');
        }
      } catch {
        // transient network error while polling — keep trying, don't hard-fail the user
      }
    }, 4000);

    // Stop polling after 3 minutes even if nothing resolved, to avoid an infinite spinner.
    setTimeout(() => clearInterval(interval), 3 * 60 * 1000);
  }

  if (lines.length === 0 && stage === 'form') {
    return <div className="ss-container"><p>Your cart is empty.</p></div>;
  }

  if (stage === 'exceeds_ceiling') {
    const message = `Hi Serani Spark, I'd like to complete a large order (ref ${orderRef}) totalling KSh ${subtotal.toLocaleString()}. It's above the online payment limit — can you help me pay?`;
    return (
      <div className="ss-container">
        <h1>Let's complete this by WhatsApp</h1>
        <p>Your order <strong>{orderRef}</strong> (KSh {subtotal.toLocaleString()}) is above our online payment limit for a single M-Pesa transaction.</p>
        <p>We've saved your order — just message us and our team will arrange payment and delivery directly.</p>
        <a className="ss-btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}
           href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
          Continue on WhatsApp
        </a>
      </div>
    );
  }

  if (stage === 'awaiting_payment') {
    return (
      <div className="ss-container">
        <h1>Check your phone</h1>
        <p>We've sent an M-Pesa payment prompt to <strong>{form.mpesa_phone_number}</strong>. Enter your PIN to complete order <strong>{orderRef}</strong>.</p>
        {appliedDiscount !== null && appliedDiscount > 0 && (
          <p style={{ color: 'var(--ss-success)' }}>Discount applied: -KSh {appliedDiscount.toLocaleString()}</p>
        )}
        <p style={{ color: '#666' }}>This page will update automatically once payment is confirmed.</p>
      </div>
    );
  }

  return (
    <div className="ss-container">
      <h1>Checkout</h1>
      {errorMsg && <p style={{ color: 'var(--ss-danger)' }}>{errorMsg}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem', maxWidth: 480 }}>
        <input placeholder="Business name (optional)" value={form.business_name} onChange={(e) => updateField('business_name', e.target.value)} />
        <input placeholder="Contact name *" required value={form.contact_name} onChange={(e) => updateField('contact_name', e.target.value)} />
        <input placeholder="Phone number *" required value={form.phone_number} onChange={(e) => updateField('phone_number', e.target.value)} />
        <input placeholder="M-Pesa phone number (2547...) *" required value={form.mpesa_phone_number} onChange={(e) => updateField('mpesa_phone_number', e.target.value)} />
        <input placeholder="Delivery zone" value={form.delivery_zone} onChange={(e) => updateField('delivery_zone', e.target.value)} />
        <input placeholder="Address" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
        <input placeholder="Landmark" value={form.landmark} onChange={(e) => updateField('landmark', e.target.value)} />
        <input placeholder="City / County" value={form.city_or_county} onChange={(e) => updateField('city_or_county', e.target.value)} />
        <input placeholder="Promo code (optional)" value={discountCode} onChange={(e) => setDiscountCode(e.target.value.toUpperCase())} />

        <p style={{ color: '#666', fontSize: '0.85rem' }}>
          This payment covers your product total (KSh {subtotal.toLocaleString()}{discountCode && ', minus any valid promo code'}) only. Serani Spark will contact you to arrange delivery.
        </p>

        <button className="ss-btn-primary" type="submit" disabled={stage === 'submitting'}>
          {stage === 'submitting' ? 'Processing...' : `Pay KSh ${subtotal.toLocaleString()} with M-Pesa`}
        </button>
      </form>
    </div>
  );
}
