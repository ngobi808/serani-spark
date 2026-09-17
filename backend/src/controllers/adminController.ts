import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';

/** POST /api/admin/login */
export async function adminLogin(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  const result = await pool.query(`SELECT id, password_hash FROM admin_users WHERE email = $1`, [email]);
  if (result.rowCount === 0) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const admin = result.rows[0];
  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
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
 * GET /api/admin/dashboard
 * MVP metrics only (per spec: total orders, paid orders, pending orders, sales total,
 * top-selling products, average order value). Deeper analytics deferred to Metabase.
 */
export async function getDashboard(_req: Request, res: Response) {
  const counts = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'paid' OR status = 'processing' OR status = 'fulfilled') AS paid_orders,
      COUNT(*) FILTER (WHERE status = 'pending_payment') AS pending_orders,
      COUNT(*) AS total_orders,
      COALESCE(SUM(total_kes) FILTER (WHERE status IN ('paid','processing','fulfilled')), 0) AS sales_total
    FROM orders
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
  const paidOrders = Number(row.paid_orders);
  const salesTotal = Number(row.sales_total);

  res.json({
    total_orders: Number(row.total_orders),
    paid_orders: paidOrders,
    pending_orders: Number(row.pending_orders),
    sales_total_kes: salesTotal,
    average_order_value_kes: paidOrders > 0 ? Math.round((salesTotal / paidOrders) * 100) / 100 : 0,
    top_products: topProducts.rows.map((r) => ({
      name: r.name,
      units_sold: Number(r.units_sold),
      revenue_kes: Number(r.revenue),
    })),
  });
}
