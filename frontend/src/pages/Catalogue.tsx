import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ProductCard } from '../components/ProductCard';
import type { PublicProduct } from '../../../shared/types';

export function Catalogue() {
  const [allProducts, setAllProducts] = useState<PublicProduct[]>([]);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load the full catalogue once, up front, purely to derive the list of
  // categories that actually exist right now — so the filter row never goes
  // stale as products are added, removed, or recategorised.
  useEffect(() => {
    api.getProducts().then((res) => setAllProducts(res.products)).catch(() => {});
  }, []);

  const categories = Array.from(new Set(allProducts.map((p) => p.category))).sort();

  useEffect(() => {
    setLoading(true);
    const params: { q?: string; category?: string } = {};
    if (query) params.q = query;
    if (activeCategory) params.category = activeCategory;

    api
      .getProducts(Object.keys(params).length ? params : undefined)
      .then((res) => setProducts(res.products))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [query, activeCategory]);

  return (
    <div className="ss-container">
      <h1>Catalogue</h1>

      <input
        type="text"
        placeholder="Search products or SKU..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: '100%', padding: '0.7rem', borderRadius: 8, border: '1px solid #ccc', marginBottom: '1rem' }}
      />

      {categories.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button
            onClick={() => setActiveCategory(null)}
            className={activeCategory === null ? 'ss-btn-primary' : 'ss-btn-secondary'}
            style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={activeCategory === cat ? 'ss-btn-primary' : 'ss-btn-secondary'}
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading && <p>Loading catalogue...</p>}
      {error && <p style={{ color: 'var(--ss-danger)' }}>{error}</p>}
      {!loading && !error && products.length === 0 && (
        <p>No products match {query && `"${query}"`}{query && activeCategory && ' in '}{activeCategory && `${activeCategory}`}.</p>
      )}

      <div className="ss-product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
