import type { PublicProduct, CheckoutPayload } from '../../../shared/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed.' }));
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  getProducts: (params?: { q?: string; category?: string }) => {
    const search = new URLSearchParams(params as Record<string, string>).toString();
    return fetch(`${API_BASE}/products${search ? `?${search}` : ''}`).then((r) => handle<{ products: PublicProduct[] }>(r));
  },

  getProduct: (id: string) => fetch(`${API_BASE}/products/${id}`).then((r) => handle<PublicProduct>(r)),

  createOrder: (payload: CheckoutPayload & { discount_code?: string }) =>
    fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handle<any>(r)),

  startStkPush: (orderId: string) =>
    fetch(`${API_BASE}/payments/stk-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
    }).then((r) => handle<any>(r)),

  getOrderStatus: (orderId: string) =>
    fetch(`${API_BASE}/orders/${orderId}/status`).then((r) => handle<any>(r)),
};
