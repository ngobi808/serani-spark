import { Request, Response } from 'express';
import { pool } from '../config/db';
import { deriveStockStatus } from '../services/stockService';
import { AuthedRequest } from '../middleware/auth';

/**
 * GET /api/products
 * GET /api/products?q=<term>&category=<category>
 * PUBLIC — must never return cost_price_kes or the raw stock_quantity.
 */
export async function listPublicProducts(req: Request, res: Response) {
  const { q, category } = req.query;

  const conditions: string[] = ['is_active = true'];
  const params: any[] = [];

  if (q) {
    params.push(`%${q}%`);
    conditions.push(`(name ILIKE $${params.length} OR sku ILIKE $${params.length})`);
  }
  if (category) {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }

  const query = `
    SELECT p.id, p.name, p.description, p.category, p.sku, p.packaging_unit,
           p.units_per_package, p.selling_price_kes, p.moq, p.image_urls,
           p.stock_quantity,
           COALESCE((
             SELECT SUM(quantity) FROM stock_reservations
             WHERE product_id = p.id AND status = 'active' AND expires_at >= now()
           ), 0) AS reserved
    FROM products p
    WHERE ${conditions.join(' AND ')}
    ORDER BY p.category, p.name
  `;

  const result = await pool.query(query, params);

  const products = result.rows.map((row) => {
    const available = row.stock_quantity - Number(row.reserved);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      sku: row.sku,
      packaging_unit: row.packaging_unit,
      units_per_package: row.units_per_package,
      price_kes: Number(row.selling_price_kes),
      moq: row.moq,
      stock_status: deriveStockStatus(available),
      image_urls: row.image_urls,
      // NOTE: cost_price_kes and raw stock_quantity intentionally omitted.
    };
  });

  res.json({ products });
}

/** GET /api/products/:id — PUBLIC, same field restriction as above. */
export async function getPublicProduct(req: Request, res: Response) {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT id, name, description, category, sku, packaging_unit, units_per_package,
            selling_price_kes, moq, image_urls, stock_quantity,
            (SELECT COALESCE(SUM(quantity),0) FROM stock_reservations
             WHERE product_id = products.id AND status = 'active' AND expires_at >= now()) AS reserved
     FROM products WHERE id = $1 AND is_active = true`,
    [id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const row = result.rows[0];
  const available = row.stock_quantity - Number(row.reserved);

  res.json({
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    sku: row.sku,
    packaging_unit: row.packaging_unit,
    units_per_package: row.units_per_package,
    price_kes: Number(row.selling_price_kes),
    moq: row.moq,
    stock_status: deriveStockStatus(available),
    image_urls: row.image_urls,
  });
}

/** GET /api/admin/products — ADMIN ONLY. Full visibility incl. cost price + real stock. */
export async function listAdminProducts(_req: Request, res: Response) {
  const result = await pool.query(`
    SELECT p.*,
           COALESCE((
             SELECT SUM(quantity) FROM stock_reservations
             WHERE product_id = p.id AND status = 'active' AND expires_at >= now()
           ), 0) AS reserved
    FROM products p
    ORDER BY p.category, p.name
  `);

  const products = result.rows.map((row) => ({
    ...row,
    selling_price_kes: Number(row.selling_price_kes),
    cost_price_kes: row.cost_price_kes !== null ? Number(row.cost_price_kes) : null,
    available_quantity: row.stock_quantity - Number(row.reserved),
  }));

  res.json({ products });
}

/** POST /api/admin/products — ADMIN ONLY. */
export async function createProduct(req: Request, res: Response) {
  const {
    name, description, category, sku, packaging_unit, units_per_package,
    selling_price_kes, cost_price_kes, moq, stock_quantity, image_urls,
  } = req.body;

  if (!name || !category || !packaging_unit || selling_price_kes === undefined) {
    return res.status(400).json({ error: 'name, category, packaging_unit and selling_price_kes are required.' });
  }

  const result = await pool.query(
    `INSERT INTO products
      (name, description, category, sku, packaging_unit, units_per_package,
       selling_price_kes, cost_price_kes, moq, stock_quantity, image_urls)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [name, description ?? null, category, sku ?? null, packaging_unit, units_per_package ?? null,
     selling_price_kes, cost_price_kes ?? null, moq ?? 1, stock_quantity ?? 0, image_urls ?? []]
  );

  res.status(201).json(result.rows[0]);
}

/** PUT /api/admin/products/:id — ADMIN ONLY. Partial update. */
export async function updateProduct(req: Request, res: Response) {
  const { id } = req.params;
  const allowedFields = [
    'name', 'description', 'category', 'sku', 'packaging_unit', 'units_per_package',
    'selling_price_kes', 'cost_price_kes', 'moq', 'stock_quantity', 'image_urls', 'is_active',
  ];

  const updates: string[] = [];
  const values: any[] = [];

  for (const field of allowedFields) {
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
    `UPDATE products SET ${updates.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
    values
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  res.json(result.rows[0]);
}

/** DELETE /api/admin/products/:id — ADMIN ONLY. Soft delete (deactivate), never hard-delete. */
export async function deactivateProduct(req: Request, res: Response) {
  const { id } = req.params;
  const result = await pool.query(
    `UPDATE products SET is_active = false, updated_at = now() WHERE id = $1 RETURNING *`,
    [id]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  res.json({ message: 'Product deactivated.', product: result.rows[0] });
}

/**
 * PUT /api/admin/products/stock-take — ADMIN ONLY.
 * Body: { updates: [{ id, counted_quantity }], reason?: 'stock_take' | 'received' | 'damaged' | 'correction' }
 *
 * Updates many products' stock in one atomic transaction, matching a morning
 * walk-the-shelves stock take. Only products whose counted number actually
 * differs from the current database value get updated and logged — unchanged
 * rows are silently skipped, so re-running a stock take with no real changes
 * doesn't clutter the audit trail.
 */
export async function bulkStockTake(req: AuthedRequest, res: Response) {
  const { updates, reason } = req.body;
  const validReason = ['stock_take', 'received', 'damaged', 'correction'].includes(reason) ? reason : 'stock_take';

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: 'updates must be a non-empty array of { id, counted_quantity }.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let changedCount = 0;
    let unchangedCount = 0;

    for (const u of updates) {
      const productResult = await client.query(
        `SELECT stock_quantity FROM products WHERE id = $1 FOR UPDATE`,
        [u.id]
      );
      if (productResult.rowCount === 0) continue; // skip unknown ids rather than fail the whole batch

      const previousQuantity = productResult.rows[0].stock_quantity;
      const newQuantity = Number(u.counted_quantity);

      if (previousQuantity === newQuantity) {
        unchangedCount++;
        continue;
      }

      await client.query(
        `UPDATE products SET stock_quantity = $1, updated_at = now() WHERE id = $2`,
        [newQuantity, u.id]
      );

      await client.query(
        `INSERT INTO stock_adjustments (product_id, previous_quantity, new_quantity, difference, reason, admin_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [u.id, previousQuantity, newQuantity, newQuantity - previousQuantity, validReason, req.adminId ?? null]
      );

      changedCount++;
    }

    await client.query('COMMIT');
    res.json({ message: 'Stock take saved.', changed: changedCount, unchanged: unchangedCount });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('bulkStockTake error', err);
    res.status(500).json({ error: 'Failed to save stock take.' });
  } finally {
    client.release();
  }
}
