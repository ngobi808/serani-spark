// shared/types.ts
// Import these from both backend and frontend so the API contract can't silently drift.

export type StockStatus = 'in_stock' | 'limited' | 'out_of_stock';

// Public-facing product shape — NEVER include cost_price_kes here.
export interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  category: string;
  sku: string | null;
  packaging_unit: string;
  units_per_package: number | null;
  price_kes: number;          // selling_price_kes, renamed for the customer-facing API
  moq: number;
  stock_status: StockStatus;  // derived — never expose the raw number publicly
  image_urls: string[];
}

// Admin-facing product shape — full visibility including cost/margin.
export interface AdminProduct extends Omit<PublicProduct, 'stock_status'> {
  cost_price_kes: number | null;
  stock_quantity: number;
  available_quantity: number; // stock_quantity minus active reservations
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'fulfilled'
  | 'cancelled'
  | 'failed';

export interface CartItem {
  product_id: string;
  quantity: number;
}

export interface CheckoutPayload {
  business_name?: string;
  contact_name: string;
  phone_number: string;
  mpesa_phone_number: string;
  delivery_zone?: string;
  address?: string;
  landmark?: string;
  city_or_county?: string;
  items: CartItem[];
}

export interface OrderSummary {
  id: string;
  order_reference: string;
  status: OrderStatus;
  total_kes: number;
  amount_paid_kes: number;
  created_at: string;
}

// M-Pesa single-transaction ceiling. Orders above this must be routed to
// WhatsApp/manual support instead of STK Push (per spec: no split payments in V1).
export const MPESA_TRANSACTION_CEILING_KES = 150000;

export const RESERVATION_EXPIRY_MINUTES = 10;
