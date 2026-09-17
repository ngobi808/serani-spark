import { PoolClient } from 'pg';
import { pool } from '../config/db';

const RESERVATION_EXPIRY_MINUTES = 10;

export class InsufficientStockError extends Error {
  constructor(productName: string, available: number, requested: number) {
    super(`Only ${available} unit(s) of "${productName}" available, but ${requested} requested.`);
    this.name = 'InsufficientStockError';
  }
}

export class BelowMoqError extends Error {
  constructor(productName: string, moq: number, requested: number) {
    super(`Minimum order quantity for "${productName}" is ${moq}, but ${requested} requested.`);
    this.name = 'BelowMoqError';
  }
}

/**
 * Releases any reservations that have passed their expiry and are still 'active'.
 * Call this opportunistically (e.g. at the top of every checkout attempt, and/or
 * on a periodic cron) rather than relying on a single background worker.
 */
export async function releaseExpiredReservations(client: PoolClient) {
  await client.query(
    `UPDATE stock_reservations
     SET status = 'released'
     WHERE status = 'active' AND expires_at < now()`
  );
}

/**
 * Returns available_quantity = stock_quantity - SUM(active reservations).
 * Must be run inside the same transaction as the reservation insert to avoid
 * a race between two customers checking out the last units simultaneously —
 * hence `FOR UPDATE` locking the product row.
 */
async function getAvailableQuantity(client: PoolClient, productId: string): Promise<{ available: number; stock: number; name: string; moq: number }> {
  const productResult = await client.query(
    `SELECT stock_quantity, name, moq FROM products WHERE id = $1 AND is_active = true FOR UPDATE`,
    [productId]
  );
  if (productResult.rowCount === 0) {
    throw new Error(`Product ${productId} not found or inactive.`);
  }
  const { stock_quantity, name, moq } = productResult.rows[0];

  const reservedResult = await client.query(
    `SELECT COALESCE(SUM(quantity), 0) AS reserved
     FROM stock_reservations
     WHERE product_id = $1 AND status = 'active' AND expires_at >= now()`,
    [productId]
  );
  const reserved = Number(reservedResult.rows[0].reserved);

  return { available: stock_quantity - reserved, stock: stock_quantity, name, moq };
}

/**
 * Validates MOQ + stock, then creates an 'active' reservation for each cart item.
 * Runs entirely inside one transaction: either every item reserves successfully,
 * or nothing is reserved (so a cart with one out-of-stock item doesn't partially lock others).
 */
export async function reserveStockForOrder(
  orderId: string,
  items: { productId: string; quantity: number }[]
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await releaseExpiredReservations(client);

    for (const item of items) {
      const { available, name, moq } = await getAvailableQuantity(client, item.productId);

      if (item.quantity < moq) {
        throw new BelowMoqError(name, moq, item.quantity);
      }
      if (item.quantity > available) {
        throw new InsufficientStockError(name, available, item.quantity);
      }

      await client.query(
        `INSERT INTO stock_reservations (order_id, product_id, quantity, status, expires_at)
         VALUES ($1, $2, $3, 'active', now() + interval '${RESERVATION_EXPIRY_MINUTES} minutes')`,
        [orderId, item.productId, item.quantity]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Called from the M-Pesa callback handler on confirmed payment.
 * Converts 'active' reservations for this order into a permanent stock deduction.
 */
export async function commitReservationsForOrder(orderId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reservations = await client.query(
      `SELECT id, product_id, quantity FROM stock_reservations
       WHERE order_id = $1 AND status = 'active'`,
      [orderId]
    );

    for (const res of reservations.rows) {
      await client.query(
        `UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = now() WHERE id = $2`,
        [res.quantity, res.product_id]
      );
      await client.query(
        `UPDATE stock_reservations SET status = 'committed' WHERE id = $1`,
        [res.id]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Called on payment failure or explicit cancellation — frees the reserved units
 * immediately rather than waiting for the 10-minute expiry.
 */
export async function releaseReservationsForOrder(orderId: string) {
  await pool.query(
    `UPDATE stock_reservations SET status = 'released' WHERE order_id = $1 AND status = 'active'`,
    [orderId]
  );
}

/** Derives the 🟢🟡🔴 status shown to customers, never the raw number. */
export function deriveStockStatus(availableQuantity: number): 'in_stock' | 'limited' | 'out_of_stock' {
  if (availableQuantity <= 0) return 'out_of_stock';
  if (availableQuantity <= 5) return 'limited';
  return 'in_stock';
}
