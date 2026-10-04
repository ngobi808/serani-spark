import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { ProductCard } from '../components/ProductCard';
import { useCategories } from '../hooks/useCategories';
import type { PublicProduct } from '../../../shared/types';

export function Catalogue() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();
  const activeCategory = searchParams.get('category');
  const { categories } = useCategories();

  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The header search and the menu both just change the URL; this page reacts to it.
  // A search looks across the whole catalogue, so it takes priority over a category.
  useEffect(() => {
    let superseded = false; // set if a newer search starts before this one finishes
    setLoading(true);
    setError(null);

    const params: { q?: string; category?: string } = {};
    if (query) params.q = query;
    else if (activeCategory) params.category = activeCategory;

    api
      .getProducts(Object.keys(params).length ? params : undefined)
      .then((res) => {
        if (!superseded) setProducts(res.products);
      })
      .catch((err) => {
        if (!superseded) setError(err.message);
      })
      .finally(() => {
        if (!superseded) setLoading(false);
      });

    return () => {
      superseded = true;
    };
  }, [query, activeCategory]);

  // New results should start at the top, not wherever the previous list was scrolled to.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
  }, [query, activeCategory]);

  function selectCategory(category: string | null) {
    setSearchParams(category ? { category } : {});
  }

  const filtering = Boolean(query || activeCategory);
  const heading = query ? `Results for “${query}”` : activeCategory || 'Catalogue';

  return (
    <div className="ss-container">
      <h1>{heading}</h1>

      {filtering && (
        <p style={{ margin: '0 0 1rem' }}>
          <Link to="/" style={{ color: 'var(--ss-green-dark)', fontWeight: 500 }}>← All products</Link>
        </p>
      )}

      {/* Wide screens keep a visible category row; phones use the menu button instead. */}
      {categories.length > 0 && (
        <div className="ss-category-pills">
          <button
            onClick={() => selectCategory(null)}
            className={!query && !activeCategory ? 'ss-btn-primary' : 'ss-btn-secondary'}
            style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => selectCategory(cat)}
              className={!query && activeCategory === cat ? 'ss-btn-primary' : 'ss-btn-secondary'}
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
        <p>
          {query
            ? `No products match “${query}”.`
            : activeCategory
              ? `No products in ${activeCategory} right now.`
              : 'No products available right now.'}
        </p>
      )}

      <div className="ss-product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
