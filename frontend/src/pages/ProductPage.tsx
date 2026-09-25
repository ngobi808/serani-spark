import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useCart } from '../context/CartContext';
import { StockBadge } from '../components/StockBadge';
import { ShareButton } from '../components/ShareButton';
import type { PublicProduct } from '../../../shared/types';

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getProduct(id)
      .then((p) => {
        setProduct(p);
        setQuantity(p.moq);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <div className="ss-container"><p style={{ color: 'var(--ss-danger)' }}>{error}</p></div>;
  if (!product) return <div className="ss-container"><p>Loading...</p></div>;

  const belowMoq = quantity < product.moq;

  return (
    <div className="ss-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
      <img
        src={product.image_urls[0] || 'https://placehold.co/500x400?text=Serani+Spark'}
        alt={product.name}
        style={{ width: '100%', borderRadius: 12 }}
      />
      <div>
        <h1>{product.name}</h1>
        <p style={{ color: '#555' }}>{product.description}</p>
        <p><strong>Packaging:</strong> {product.packaging_unit}{product.units_per_package ? ` (${product.units_per_package} units each)` : ''}</p>
        {product.moq > 1 && <p><strong>MOQ:</strong> {product.moq} {product.packaging_unit}(s)</p>}
        <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--ss-green-dark)' }}>
          KSh {product.price_kes.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 400 }}>per {product.packaging_unit}</span>
        </p>
        <StockBadge status={product.stock_status} />

        <div style={{ margin: '1.5rem 0' }}>
          <label>
            Quantity:{' '}
            <input
              type="number"
              min={product.moq}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              style={{ width: 80, padding: '0.4rem' }}
            />
          </label>
          {belowMoq && <p style={{ color: 'var(--ss-danger)', fontSize: '0.85rem' }}>Minimum order is {product.moq}.</p>}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="ss-btn-primary"
            disabled={belowMoq || product.stock_status === 'out_of_stock'}
            onClick={() => {
              addToCart(product, quantity);
              navigate('/cart');
            }}
          >
            Add to Cart
          </button>
          <ShareButton title={product.name} text={`Check out ${product.name} on Serani Spark`} url={window.location.href} />
        </div>
      </div>
    </div>
  );
}
