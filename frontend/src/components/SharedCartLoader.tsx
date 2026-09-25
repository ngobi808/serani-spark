import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { decodeCart } from '../utils/cartShare';
import { api } from '../api/client';
import type { PublicProduct } from '../../../shared/types';

/**
 * Mounted once at the top of the storefront. If the URL has a ?cart= param
 * (from someone's shared cart link), this fetches each product's CURRENT
 * price/stock from the real API - never trusting price data embedded in the
 * link itself - loads it into the cart, then cleans the URL and sends the
 * person straight to their now-populated cart.
 */
export function SharedCartLoader() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loadCart } = useCart();
  const [banner, setBanner] = useState('');

  useEffect(() => {
    const encoded = searchParams.get('cart');
    if (!encoded) return;

    const items = decodeCart(encoded);
    if (items.length === 0) return;

    Promise.all(
      items.map((i) =>
        api
          .getProduct(i.productId)
          .then((product: PublicProduct) => ({ product, quantity: i.quantity }))
          .catch(() => null)
      )
    ).then((results) => {
      const validLines = results.filter((r): r is { product: PublicProduct; quantity: number } => r !== null);
      const skipped = results.length - validLines.length;

      if (validLines.length > 0) {
        loadCart(validLines);
        setBanner(
          skipped > 0
            ? `Loaded a shared cart with ${validLines.length} item(s) — ${skipped} item(s) are no longer available and were skipped.`
            : `Loaded a shared cart with ${validLines.length} item(s).`
        );
      }
      // Clear the ?cart= param and land on the actual cart page.
      navigate('/cart', { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (!banner) return null;
  return (
    <div style={{ background: 'var(--ss-success)', color: 'white', padding: '0.75rem 1rem', textAlign: 'center' }}>
      {banner}
    </div>
  );
}
