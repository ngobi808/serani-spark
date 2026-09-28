import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';
import { AuthedRequest } from '../middleware/auth';
import { hasPermission, permissionsFor } from '../config/permissions';

/** POST /api/admin/login */
export async function adminLogin(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  const result = await pool.query(
    `SELECT id, password_hash, is_active FROM admin_users WHERE LOWER(email) = LOWER($1)`,
    [String(email).trim()]
  );
  if (result.rowCount === 0) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const admin = result.rows[0];
  const valid = await bcrypt.compare(password, admin.password_hash);
  // Same message for wrong password and deactivated account, so it doesn't reveal which.
  if (!valid || !admin.is_active) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  await pool.query(`UPDATE admin_users SET last_login_at = now() WHERE id = $1`, [admin.id]);

  const token = jwt.sign(
    { adminId: admin.id },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? '8h') as jwt.SignOptions['expiresIn'] }
  );

  res.json({ token });
}

/**
 * GET /api/admin/dashboard?range=today|week|month|all
 * Metrics grouped by what they mean operationally, not just raw DB status:
 * - pending: waiting on the customer to pay, no action needed from Serani Spark
 * - awaiting_fulfillment: money received (paid or processing), delivery needs arranging
 * - fulfilled: fully completed orders
 * Order-count tiles are always all-time (they reflect current operational state).
 * Sales Total and Average Order Value respect the ?range filter, since those are
 * financial reporting figures, not a snapshot of what needs action right now.
 * daily_sales_trend is always the last 14 days regardless of range, for the sparkline.
 */
export async function getDashboard(req: AuthedRequest, res: Response) {
  const range = ['today', 'week', 'month', 'all'].includes(req.query.range as string) ? req.query.range : 'all';

  const rangeCondition =
    range === 'today' ? `AND created_at >= CURRENT_DATE` :
    range === 'week' ? `AND created_at >= CURRENT_DATE - INTERVAL '6 days'` :
    range === 'month' ? `AND created_at >= date_trunc('month', now())` :
    '';

  const counts = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending_payment') AS pending_orders,
      COUNT(*) FILTER (WHERE status IN ('paid','processing')) AS awaiting_fulfillment_orders,
      COUNT(*) FILTER (WHERE status = 'fulfilled') AS fulfilled_orders,
      COUNT(*) AS total_orders
    FROM orders
  `);

  const rangeStats = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('paid','processing','fulfilled')) AS revenue_order_count,
      COALESCE(SUM(total_kes) FILTER (WHERE status IN ('paid','processing','fulfilled')), 0) AS sales_total
    FROM orders
    WHERE true ${rangeCondition}
  `);

  const trend = await pool.query(`
    SELECT d::date AS day, COALESCE(SUM(o.total_kes), 0) AS revenue_kes
    FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day') d
    LEFT JOIN orders o ON o.created_at::date = d::date AND o.status IN ('paid','processing','fulfilled')
    GROUP BY d
    ORDER BY d
  `);

  const topProducts = await pool.query(`
    SELECT p.name, SUM(oi.quantity) AS units_sold, SUM(oi.quantity * oi.unit_price_kes) AS revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE o.status IN ('paid','processing','fulfilled')
    GROUP BY p.name
    ORDER BY revenue DESC
    LIMIT 5
  `);

  const row = counts.rows[0];
  const rangeRow = rangeStats.rows[0];
  const revenueOrderCount = Number(rangeRow.revenue_order_count);
  const salesTotal = Number(rangeRow.sales_total);

  const counts_only = {
    total_orders: Number(row.total_orders),
    pending_orders: Number(row.pending_orders),
    awaiting_fulfillment_orders: Number(row.awaiting_fulfillment_orders),
    fulfilled_orders: Number(row.fulfilled_orders),
  };

  // Roles without reports access (e.g. Operations & Support) get the order counts
  // they need for their daily to-do list, and nothing about money.
  if (!hasPermission(req.adminRole, 'reports:view')) {
    return res.json(counts_only);
  }

  res.json({
    ...counts_only,
    sales_total_kes: salesTotal,
    average_order_value_kes: revenueOrderCount > 0 ? Math.round((salesTotal / revenueOrderCount) * 100) / 100 : 0,
    range,
    daily_sales_trend: trend.rows.map((r) => ({ day: r.day, revenue_kes: Number(r.revenue_kes) })),
    top_products: topProducts.rows.map((r) => ({
      name: r.name,
      units_sold: Number(r.units_sold),
      revenue_kes: Number(r.revenue),
    })),
  });
}

/** GET /api/admin/me: who am I, what role, and what am I allowed to do. */
export async function getMe(req: AuthedRequest, res: Response) {
  const result = await pool.query(
    `SELECT id, email, full_name, role, must_change_password FROM admin_users WHERE id = $1`,
    [req.adminId]
  );
  const me = result.rows[0];
  res.json({
    id: me.id,
    email: me.email,
    full_name: me.full_name,
    role: me.role,
    must_change_password: me.must_change_password,
    permissions: permissionsFor(me.role),
  });
}

const MIN_PASSWORD_LENGTH = 10;

/** PUT /api/admin/me/password: change your own password (also clears a forced-change flag). */
export async function changeMyPassword(req: AuthedRequest, res: Response) {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password are required.' });
  }
  if (String(new_password).length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }
  if (new_password === current_password) {
    return res.status(400).json({ error: 'New password must be different from the current one.' });
  }

  const result = await pool.query(`SELECT password_hash FROM admin_users WHERE id = $1`, [req.adminId]);
  const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  const newHash = await bcrypt.hash(new_password, 10);
  await pool.query(
    `UPDATE admin_users SET password_hash = $1, must_change_password = false WHERE id = $2`,
    [newHash, req.adminId]
  );
  res.json({ message: 'Password changed.' });
}
