import { Request, Response } from 'express';
import { pool } from '../config/db';
import { reserveStockForOrder, InsufficientStockError, BelowMoqError, releaseReservationsForOrder } from '../services/stockService';
import { generateOrderReference } from '../utils/orderReference';
import { MPESA_TRANSACTION_CEILING_KES } from '../services/mpesaService';

/**
 * POST /api/orders
 * Creates a customer + pending order + reserves stock. Does NOT initiate payment —
 * that happens in a separate call to /api/payments/stk-push so the frontend can
 * show "order created, now pay" as a distinct step, and so a customer who abandons
 * before paying still has a traceable pending_payment order.
 */
export async function createOrder(req: Request, res: Response) {
  const {
    business_name, contact_name, phone_number, mpesa_phone_number,
    delivery_zone, address, landmark, city_or_county, items,
  } = req.body;

  if (!contact_name || !phone_number || !mpesa_phone_number || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'contact_name, phone_number, mpesa_phone_number and a non-empty items array are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Look up current prices server-side. NEVER trust a price sent from the frontend.
    const productIds = items.map((i: any) => i.product_id);
    const priceResult = await client.query(
      `SELECT id, name, selling_price_kes, cost_price_kes FROM products WHERE id = ANY($1) AND is_active = true`,
      [productIds]
    );
    const priceMap = new Map(priceResult.rows.map((r) => [r.id, r]));

    let total = 0;
    const lineItems: { product_id: string; quantity: number; unit_price_kes: number; unit_cost_kes: number | null }[] = [];

    for (const item of items) {
      const product = priceMap.get(item.product_id);
      if (!product) {
        throw new Error(`Product ${item.product_id} not found or inactive.`);
      }
      const unitPrice = Number(product.selling_price_kes);
      total += unitPrice * item.quantity;
      lineItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price_kes: unitPrice,
        unit_cost_kes: product.cost_price_kes !== null ? Number(product.cost_price_kes) : null,
      });
    }

    // 2. Create customer record (guest checkout — no account/login).
    const customerResult = await client.query(
      `INSERT INTO customers (business_name, contact_name, phone_number, mpesa_phone_number, delivery_zone, address, landmark, city_or_county)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [business_name ?? null, contact_name, phone_number, mpesa_phone_number, delivery_zone ?? null, address ?? null, landmark ?? null, city_or_county ?? null]
    );
    const customerId = customerResult.rows[0].id;

    // 3. Create the order in pending_payment state.
    const orderReference = await generateOrderReference();
    const orderResult = await client.query(
      `INSERT INTO orders (order_reference, customer_id, status, total_kes)
       VALUES ($1, $2, 'pending_payment', $3) RETURNING id, order_reference, total_kes, status, created_at`,
      [orderReference, customerId, total]
    );
    const order = orderResult.rows[0];

    // 4. Insert order_items (price snapshot).
    for (const li of lineItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price_kes, unit_cost_kes)
         VALUES ($1,$2,$3,$4,$5)`,
        [order.id, li.product_id, li.quantity, li.unit_price_kes, li.unit_cost_kes]
      );
    }

    await client.query('COMMIT');

    // 5. Reserve stock in its own transaction (MOQ + availability checked here).
    //    If this throws, the order already exists as pending_payment with no
    //    reservation — mark it failed so it doesn't linger ambiguously.
    try {
      await reserveStockForOrder(
        order.id,
        lineItems.map((li) => ({ productId: li.product_id, quantity: li.quantity }))
      );
    } catch (err) {
      await pool.query(`UPDATE orders SET status = 'failed', updated_at = now() WHERE id = $1`, [order.id]);
      if (err instanceof InsufficientStockError || err instanceof BelowMoqError) {
        return res.status(409).json({ error: err.message });
      }
      throw err;
    }

    const exceedsCeiling = total > MPESA_TRANSACTION_CEILING_KES;

    res.status(201).json({
      order: { ...order, total_kes: Number(order.total_kes) },
      exceeds_mpesa_ceiling: exceedsCeiling,
      whatsapp_required: exceedsCeiling,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createOrder error', err);
    res.status(500).json({ error: 'Failed to create order.' });
  } finally {
    client.release();
  }
}

/** GET /api/orders/:id/status — PUBLIC (customer polls this after STK push). */
export async function getOrderStatus(req: Request, res: Response) {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT id, order_reference, status, total_kes, amount_paid_kes, created_at FROM orders WHERE id = $1`,
    [id]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  const order = result.rows[0];
  res.json({ ...order, total_kes: Number(order.total_kes), amount_paid_kes: Number(order.amount_paid_kes) });
}

/** GET /api/admin/orders — ADMIN ONLY. */
export async function listAdminOrders(req: Request, res: Response) {
  const { status } = req.query;
  const conditions: string[] = [];
  const params: any[] = [];
  if (status && typeof status === 'string') {
    const statusList = status.split(',').map((s) => s.trim()).filter(Boolean);
    params.push(statusList);
    conditions.push(`o.status = ANY($${params.length})`);
  }

  const query = `
    SELECT o.id, o.order_reference, o.status, o.total_kes, o.amount_paid_kes, o.created_at,
           c.contact_name, c.business_name, c.phone_number
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
    ORDER BY o.created_at DESC
  `;
  const result = await pool.query(query, params);
  res.json({ orders: result.rows });
}

/** GET /api/admin/orders/:id — ADMIN ONLY. Full detail incl. items, customer, payment. */
export async function getAdminOrderDetail(req: Request, res: Response) {
  const { id } = req.params;

  const orderResult = await pool.query(
    `SELECT o.*, c.business_name, c.contact_name, c.phone_number, c.mpesa_phone_number,
            c.delivery_zone, c.address, c.landmark, c.city_or_county
     FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = $1`,
    [id]
  );
  if (orderResult.rowCount === 0) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const itemsResult = await pool.query(
    `SELECT oi.quantity, oi.unit_price_kes, oi.unit_cost_kes, p.name, p.packaging_unit
     FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = $1`,
    [id]
  );

  const paymentsResult = await pool.query(
    `SELECT status, mpesa_receipt_number, amount_kes, result_desc, created_at FROM payments WHERE order_id = $1 ORDER BY created_at DESC`,
    [id]
  );

  res.json({
    order: orderResult.rows[0],
    items: itemsResult.rows,
    payments: paymentsResult.rows,
  });
}

/** PUT /api/admin/orders/:id — ADMIN ONLY. Update status (e.g. processing -> fulfilled), or cancel + release stock. */
export async function updateOrderStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ['pending_payment', 'paid', 'processing', 'fulfilled', 'cancelled', 'failed'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }

  if (status === 'cancelled' || status === 'failed') {
    await releaseReservationsForOrder(id);
  }

  const result = await pool.query(
    `UPDATE orders SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  res.json(result.rows[0]);
}
