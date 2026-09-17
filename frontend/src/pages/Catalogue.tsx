import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ProductCard } from '../components/ProductCard';
import type { PublicProduct } from '../../../shared/types';

export function Catalogue() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getProducts(query ? { q: query } : undefined)
      .then((res) => setProducts(res.products))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="ss-container">
      <h1>Wholesale Catalogue</h1>
      <input
        type="text"
        placeholder="Search products or SKU..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: '100%', padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc', marginBottom: '1.5rem' }}
      />

      {loading && <p>Loading catalogue...</p>}
      {error && <p style={{ color: 'var(--ss-danger)' }}>{error}</p>}
      {!loading && !error && products.length === 0 && <p>No products match your search.</p>}

      <div className="ss-product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
