/**
 * Encodes a cart (product IDs + quantities) into a URL-safe base64 string, so a
 * shareable link can carry the entire cart with no backend/database needed.
 * Decoding just gets you back the raw {productId, quantity} pairs - the caller
 * is responsible for fetching each product's current price/details before
 * loading them into the cart, since prices should always come from the live
 * API, never trusted from a link someone else generated.
 */

function toUrlSafe(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromUrlSafe(safe: string): string {
  let base64 = safe.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return base64;
}

export function encodeCart(items: { productId: string; quantity: number }[]): string {
  const compact = items.map((i) => [i.productId, i.quantity]);
  return toUrlSafe(btoa(JSON.stringify(compact)));
}

export function decodeCart(param: string): { productId: string; quantity: number }[] {
  try {
    const compact: [string, number][] = JSON.parse(atob(fromUrlSafe(param)));
    return compact.map(([productId, quantity]) => ({ productId, quantity }));
  } catch {
    return [];
  }
}
