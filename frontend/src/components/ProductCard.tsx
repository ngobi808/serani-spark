import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PublicProduct } from '../../../shared/types';
import { StockBadge } from './StockBadge';
import { useCart } from '../context/CartContext';

export function ProductCard({ product }: { product: PublicProduct }) {
  const { addToCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const outOfStock = product.stock_status === 'out_of_stock';

  function handleAddToCart(e: React.MouseEvent) {
    // Stop the click from bubbling up to the surrounding <Link>, so adding
    // to cart doesn't also navigate the customer away to the product page.
    e.preventDefault();
    e.stopPropagation();
    addToCart(product); // defaults to the product's MOQ
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <Link to={`/products/${product.id}`} className="ss-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <img
        src={product.image_urls[0] || 'https://placehold.co/300x220?text=Serani+Spark'}
        alt={product.name}
        style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 8, marginBottom: '0.75rem' }}
      />
      <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem' }}>{product.name}</h3>
      <p style={{ margin: '0 0 0.4rem', color: '#555', fontSize: '0.9rem' }}>
        Per {product.packaging_unit} · MOQ {product.moq}
      </p>
      <p style={{ margin: '0 0 0.5rem', fontWeight: 700, color: 'var(--ss-green-dark)' }}>
        KSh {product.price_kes.toLocaleString()}
      </p>
      <StockBadge status={product.stock_status} />

      <button
        className="ss-btn-primary"
        style={{ width: '100%', marginTop: '0.7rem' }}
        disabled={outOfStock}
        onClick={handleAddToCart}
      >
        {outOfStock ? 'Out of Stock' : justAdded ? 'Added ✓' : 'Add to Cart'}
      </button>
    </Link>
  );
}
