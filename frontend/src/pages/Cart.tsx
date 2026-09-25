import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ShareButton } from '../components/ShareButton';

export function Cart() {
  const { lines, updateQuantity, removeFromCart, subtotal } = useCart();
  const navigate = useNavigate();

  if (lines.length === 0) {
    return (
      <div className="ss-container">
        <h1>Your Cart</h1>
        <p>Your cart is empty. <Link to="/">Browse the catalogue</Link>.</p>
      </div>
    );
  }

  return (
    <div className="ss-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>Your Cart</h1>
        <ShareButton title="Serani Spark" text="Check out Serani Spark's wholesale catalogue" url={window.location.origin} />
      </div>
      {lines.map((line) => (
        <div key={line.product.id} className="ss-card" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.75rem' }}>
          <Link
            to={`/products/${line.product.id}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', textDecoration: 'none', color: 'inherit', flex: '1 1 220px', minWidth: 220 }}
          >
            <img
              src={line.product.image_urls[0] || 'https://placehold.co/80x80?text=SS'}
              alt={line.product.name}
              style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
            />
            <div style={{ minWidth: 0 }}>
              <strong>{line.product.name}</strong>
              <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                KSh {line.product.price_kes.toLocaleString()} per {line.product.packaging_unit}{line.product.moq > 1 ? ` · MOQ ${line.product.moq}` : ''}
              </p>
            </div>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              type="number"
              min={line.product.moq}
              value={line.quantity}
              onChange={(e) => updateQuantity(line.product.id, Number(e.target.value))}
              style={{ width: 70, padding: '0.4rem' }}
            />
            <strong>KSh {(line.product.price_kes * line.quantity).toLocaleString()}</strong>
            <button className="ss-btn-secondary" onClick={() => removeFromCart(line.product.id)}>Remove</button>
          </div>
        </div>
      ))}

      <div style={{ textAlign: 'right', marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
        <Link to="/" className="ss-btn-secondary" style={{ textDecoration: 'none' }}>Continue Shopping</Link>
        <h2 style={{ margin: 0 }}>Subtotal: KSh {subtotal.toLocaleString()}</h2>
        <button className="ss-btn-primary" onClick={() => navigate('/checkout')}>Proceed to Checkout</button>
      </div>
    </div>
  );
}
