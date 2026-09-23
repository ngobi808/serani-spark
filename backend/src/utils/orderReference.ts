import { pool } from '../config/db';

/**
 * Generates a human-readable order reference like SS-1042, using a real
 * Postgres sequence (order_reference_seq) rather than COUNT(*) — a plain row
 * count collides the moment any order is ever deleted, since the count drops
 * but old reference numbers still exist. A sequence only ever increases.
 */
export async function generateOrderReference(): Promise<string> {
  const result = await pool.query(`SELECT nextval('order_reference_seq') AS next`);
  return `SS-${result.rows[0].next}`;
}
