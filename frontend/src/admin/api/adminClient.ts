const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export const ADMIN_TOKEN_KEY = 'serani-spark-admin-token';

/**
 * Turns a failed response into an Error that also carries the HTTP status and any
 * machine-readable code. For signed-in calls, a 401 (expired login, or the account
 * was just deactivated) sends the person back to the login page straight away.
 */
async function handle<T>(res: Response, authed = true): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed.' }));
    if (res.status === 401 && authed) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      window.location.href = '/admin/login';
    }
    const err: any = new Error(body.error || `Request failed with status ${res.status}`);
    err.status = res.status;
    err.code = body.code;
    throw err;
  }
  return res.json();
}

export interface AdminMe {
  id: string;
  email: string;
  full_name: string | null;
  role: 'owner' | 'operations' | 'finance';
  must_change_password: boolean;
  permissions: string[];
}

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: 'owner' | 'operations' | 'finance';
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  last_login_at: string | null;
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
    }).then((r) => handle<{ token: string }>(r, false)),

  getMe: (token: string) =>
    fetch(`${API_BASE}/admin/me`, { headers: authHeaders(token) }).then((r) => handle<AdminMe>(r)),

  changeMyPassword: (token: string, current_password: string, new_password: string) =>
    fetch(`${API_BASE}/admin/me/password`, {
      method: 'PUT', headers: authHeaders(token), body: JSON.stringify({ current_password, new_password }),
    }).then((r) => handle<{ message: string }>(r)),

  listUsers: (token: string) =>
    fetch(`${API_BASE}/admin/users`, { headers: authHeaders(token) }).then((r) => handle<{ users: AdminUserRow[] }>(r)),

  createUser: (token: string, payload: { email: string; full_name?: string; role: string; temporary_password: string }) =>
    fetch(`${API_BASE}/admin/users`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(payload) }).then((r) => handle<AdminUserRow>(r)),

  updateUser: (token: string, id: string, payload: { role?: string; is_active?: boolean; full_name?: string; temporary_password?: string }) =>
    fetch(`${API_BASE}/admin/users/${id}`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify(payload) }).then((r) => handle<AdminUserRow>(r)),

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

  deleteOrder: (token: string, id: string, password: string) =>
    fetch(`${API_BASE}/admin/orders/${id}`, { method: 'DELETE', headers: authHeaders(token), body: JSON.stringify({ password }) }).then((r) => handle<{ message: string }>(r)),

  listDiscountCodes: (token: string) =>
    fetch(`${API_BASE}/admin/discount-codes`, { headers: authHeaders(token) }).then((r) => handle<{ codes: any[] }>(r)),

  createDiscountCode: (token: string, payload: any) =>
    fetch(`${API_BASE}/admin/discount-codes`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(payload) }).then((r) => handle<any>(r)),

  updateDiscountCode: (token: string, id: string, payload: any) =>
    fetch(`${API_BASE}/admin/discount-codes/${id}`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify(payload) }).then((r) => handle<any>(r)),

  getSalesReport: (token: string, from: string, to: string, group: 'product' | 'category') =>
    fetch(`${API_BASE}/admin/reports/sales?from=${from}&to=${to}&group=${group}`, { headers: authHeaders(token) }).then((r) => handle<any>(r)),
};
