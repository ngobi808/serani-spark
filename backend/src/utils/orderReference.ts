import { pool } from '../config/db';

/**
 * Generates a human-readable order reference like SS-1042.
 * Uses the count of existing orders + a fixed offset so references are
 * short and sequential-looking without needing a separate sequence table.
 * (Fine for MVP volume; revisit if concurrent order creation ever collides.)
 */
export async function generateOrderReference(): Promise<string> {
  const result = await pool.query(`SELECT COUNT(*) AS count FROM orders`);
  const nextNumber = Number(result.rows[0].count) + 1001; // starts at SS-1001
  return `SS-${nextNumber}`;
}
