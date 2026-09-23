import { Request, Response } from 'express';
import { pool, } from '../config/db';
import { PoolClient } from 'pg';

/** GET /api/admin/discount-codes — ADMIN ONLY. */
export async function listDiscountCodes(_req: Request, res: Response) {
  const result = await pool.query(`SELECT * FROM discount_codes ORDER BY created_at DESC`);
  res.json({
    codes: result.rows.map((r) => ({
      ...r,
      discount_value: Number(r.discount_value),
    })),
  });
}

/** POST /api/admin/discount-codes — ADMIN ONLY. */
export async function createDiscountCode(req: Request, res: Response) {
  const { code, discount_type, discount_value, max_uses, expires_at } = req.body;

  if (!code || !discount_type || discount_value === undefined) {
    return res.status(400).json({ error: 'code, discount_type, and discount_value are required.' });
  }
  if (!['percent', 'fixed'].includes(discount_type)) {
    return res.status(400).json({ error: "discount_type must be 'percent' or 'fixed'." });
  }
  if (discount_type === 'percent' && (discount_value <= 0 || discount_value > 100)) {
    return res.status(400).json({ error: 'A percent discount must be between 0 and 100.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO discount_codes (code, discount_type, discount_value, max_uses, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [code.trim().toUpperCase(), discount_type, discount_value, max_uses ?? null, expires_at ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') { // unique_violation
      return res.status(409).json({ error: `Code "${code.toUpperCase()}" already exists.` });
    }
    throw err;
  }
}

/** PUT /api/admin/discount-codes/:id — ADMIN ONLY. Mainly used to toggle is_active. */
export async function updateDiscountCode(req: Request, res: Response) {
  const { id } = req.params;
  const allowed = ['discount_type', 'discount_value', 'max_uses', 'expires_at', 'is_active'];
  const updates: string[] = [];
  const values: any[] = [];

  for (const field of allowed) {
    if (field in req.body) {
      values.push(req.body[field]);
      updates.push(`${field} = $${values.length}`);
    }
  }
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }

  values.push(id);
  const result = await pool.query(
    `UPDATE discount_codes SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Discount code not found.' });
  }
  res.json(result.rows[0]);
}

export class InvalidDiscountCodeError extends Error {}

/**
 * Validates a discount code and computes the discount for a given subtotal.
 * Called from order creation, inside the same transaction, with FOR UPDATE
 * locking so two simultaneous checkouts can't both slip past a max_uses limit.
 * Does NOT increment used_count itself — call incrementDiscountCodeUsage after
 * the order is confirmed to actually count as "used."
 */
export async function validateAndComputeDiscount(
  client: PoolClient,
  code: string,
  subtotalKes: number
): Promise<{ discountId: string; codeUpper: string; discountAmountKes: number }> {
  const result = await client.query(
    `SELECT * FROM discount_codes WHERE UPPER(code) = UPPER($1) FOR UPDATE`,
    [code]
  );

  if (result.rowCount === 0) {
    throw new InvalidDiscountCodeError('That discount code was not found.');
  }

  const dc = result.rows[0];

  if (!dc.is_active) {
    throw new InvalidDiscountCodeError('That discount code is no longer active.');
  }
  if (dc.expires_at && new Date(dc.expires_at) < new Date()) {
    throw new InvalidDiscountCodeError('That discount code has expired.');
  }
  if (dc.max_uses !== null && dc.used_count >= dc.max_uses) {
    throw new InvalidDiscountCodeError('That discount code has reached its usage limit.');
  }

  const discountValue = Number(dc.discount_value);
  const discountAmountKes = dc.discount_type === 'percent'
    ? Math.round(subtotalKes * (discountValue / 100) * 100) / 100
    : Math.min(discountValue, subtotalKes); // never discount below zero

  return { discountId: dc.id, codeUpper: dc.code, discountAmountKes };
}

export async function incrementDiscountCodeUsage(client: PoolClient, discountId: string) {
  await client.query(`UPDATE discount_codes SET used_count = used_count + 1 WHERE id = $1`, [discountId]);
}
