const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed.' }));
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export const adminApi = {
  login: (email: string, password: string) =>
    fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then((r) => handle<{ token: string }>(r)),

  getDashboard: (token: string, range?: string) =>
    fetch(`${API_BASE}/admin/dashboard${range ? `?range=${range}` : ''}`, { headers: authHeaders(token) }).then((r) => handle<any>(r)),

  listProducts: (token: string) =>
    fetch(`${API_BASE}/admin/products`, { headers: authHeaders(token) }).then((r) => handle<{ products: any[] }>(r)),

  createProduct: (token: string, payload: any) =>
    fetch(`${API_BASE}/admin/products`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(payload) }).then((r) => handle<any>(r)),

  updateProduct: (token: string, id: string, payload: any) =>
    fetch(`${API_BASE}/admin/products/${id}`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify(payload) }).then((r) => handle<any>(r)),

  deactivateProduct: (token: string, id: string) =>
    fetch(`${API_BASE}/admin/products/${id}`, { method: 'DELETE', headers: authHeaders(token) }).then((r) => handle<any>(r)),

  bulkStockTake: (token: string, updates: { id: string; counted_quantity: number }[], reason?: string) =>
    fetch(`${API_BASE}/admin/products/stock-take`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ updates, reason }),
    }).then((r) => handle<{ message: string; changed: number; unchanged: number }>(r)),

  getProductDetail: (token: string, id: string) =>
    fetch(`${API_BASE}/admin/products/${id}/detail`, { headers: authHeaders(token) }).then((r) => handle<any>(r)),

  listOrders: (token: string, status?: string) => {
    const q = status ? `?status=${status}` : '';
    return fetch(`${API_BASE}/admin/orders${q}`, { headers: authHeaders(token) }).then((r) => handle<{ orders: any[] }>(r));
  },

  getOrderDetail: (token: string, id: string) =>
    fetch(`${API_BASE}/admin/orders/${id}`, { headers: authHeaders(token) }).then((r) => handle<any>(r)),

  updateOrderStatus: (token: string, id: string, status: string) =>
    fetch(`${API_BASE}/admin/orders/${id}`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify({ status }) }).then((r) => handle<any>(r)),
};
