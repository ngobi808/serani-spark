const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export const CUSTOMER_TOKEN_KEY = 'serani-spark-customer-token';

export interface CustomerAccount {
  id: string;
  email: string;
  business_name: string | null;
  contact_name: string;
  phone_number: string;
  mpesa_phone_number: string | null;
  delivery_zone: string | null;
  address: string | null;
  landmark: string | null;
  city_or_county: string | null;
  created_at: string;
  last_login_at: string | null;
}

export interface CustomerOrderSummary {
  id: string;
  order_reference: string;
  status: string;
  total_kes: number;
  created_at: string;
}

export interface ReorderItem {
  product_id: string;
  name: string;
  still_available: boolean;
  quantity: number;
  current_price_kes: number;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed.' }));
    if (res.status === 401) localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export const customerApi = {
  register: (payload: {
    email: string; password: string; business_name?: string; contact_name: string;
    phone_number: string; mpesa_phone_number?: string; delivery_zone?: string;
    address?: string; landmark?: string; city_or_county?: string;
  }) =>
    fetch(`${API_BASE}/customer/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    }).then((r) => handle<{ token: string; account: CustomerAccount }>(r)),

  login: (email: string, password: string) =>
    fetch(`${API_BASE}/customer/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
    }).then((r) => handle<{ token: string }>(r)),

  forgotPassword: (email: string) =>
    fetch(`${API_BASE}/customer/forgot-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    }).then((r) => handle<{ message: string }>(r)),

  resetPassword: (token: string, new_password: string) =>
    fetch(`${API_BASE}/customer/reset-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, new_password }),
    }).then((r) => handle<{ message: string }>(r)),

  getMe: (token: string) =>
    fetch(`${API_BASE}/customer/me`, { headers: authHeaders(token) }).then((r) => handle<CustomerAccount>(r)),

  updateMe: (token: string, payload: Partial<CustomerAccount>) =>
    fetch(`${API_BASE}/customer/me`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify(payload) }).then((r) => handle<CustomerAccount>(r)),

  getMyOrders: (token: string) =>
    fetch(`${API_BASE}/customer/orders`, { headers: authHeaders(token) }).then((r) => handle<{ orders: CustomerOrderSummary[] }>(r)),

  getReorderItems: (token: string, orderId: string) =>
    fetch(`${API_BASE}/customer/orders/${orderId}/reorder-items`, { headers: authHeaders(token) }).then((r) => handle<{ items: ReorderItem[] }>(r)),
};
