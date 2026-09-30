import { Response } from 'express';
import { pool } from '../config/db';
import { CustomerAuthedRequest } from '../middleware/customerAuth';

/**
 * GET /api/customer/orders
 * Only ever returns orders belonging to the signed-in account - scoped by
 * customer_account_id in every query, never by anything the client sends.
 */
export async function listMyOrders(req: CustomerAuthedRequest, res: Response) {
  const result = await pool.query(
    `SELECT id, order_reference, status, total_kes, created_at
     FROM orders WHERE customer_account_id = $1 ORDER BY created_at DESC`,
    [req.customerId]
  );
  res.json({ orders: result.rows.map((r) => ({ ...r, total_kes: Number(r.total_kes) })) });
}

/**
 * GET /api/customer/orders/:id/reorder-items
 * Returns this past order's line items, re-joined to CURRENT product data (price,
 * stock, whether it's still active) - never the old snapshot - so "reorder" always
 * reflects today's real catalogue, and a product that's since been discontinued is
 * clearly flagged rather than silently added to the cart.
 */
export async function getReorderItems(req: CustomerAuthedRequest, res: Response) {
  const { id } = req.params;

  const orderCheck = await pool.query(
    `SELECT id FROM orders WHERE id = $1 AND customer_account_id = $2`,
    [id, req.customerId]
  );
  if (orderCheck.rowCount === 0) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const result = await pool.query(
    `SELECT p.id AS product_id, p.name, p.is_active, p.moq, p.stock_quantity,
            p.selling_price_kes AS current_price_kes, oi.quantity AS original_quantity
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1`,
    [id]
  );

  const items = result.rows.map((r) => ({
    product_id: r.product_id,
    name: r.name,
    still_available: r.is_active && r.stock_quantity > 0,
    quantity: Math.max(r.original_quantity, r.moq), // never suggest less than today's MOQ
    current_price_kes: Number(r.current_price_kes),
  }));

  res.json({ items });
}
