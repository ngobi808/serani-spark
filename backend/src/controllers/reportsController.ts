import { Request, Response } from 'express';
import { pool } from '../config/db';

// Only orders where money has actually been received count as sales.
const REVENUE_STATUSES = ['paid', 'processing', 'fulfilled'];

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * GET /api/admin/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD&group=product|category
 * ADMIN ONLY.
 *
 * Dates are interpreted in Africa/Nairobi time, so "today" means today in Kenya
 * rather than today in UTC.
 *
 * Per-row revenue is BEFORE discount codes, because a discount is applied to the
 * whole order and isn't allocated to individual products. Discounts are reported
 * as a separate total, so net sales = gross line revenue - discounts.
 * Cost comes from the unit cost snapshotted on each order line at order time, so
 * it stays accurate even if buying prices change later.
 */
export async function getSalesReport(req: Request, res: Response) {
  const { from, to } = req.query;
  const group = req.query.group === 'category' ? 'category' : 'product';

  if (!isDateString(from) || !isDateString(to)) {
    return res.status(400).json({ error: 'from and to are required, formatted as YYYY-MM-DD.' });
  }
  if (from > to) {
    return res.status(400).json({ error: '"from" must not be after "to".' });
  }

  const dateFilter = `
    o.status = ANY($1)
    AND (o.created_at AT TIME ZONE 'Africa/Nairobi')::date BETWEEN $2::date AND $3::date
  `;

  const rowsSql = group === 'product'
    ? `
      SELECT p.name AS label, p.category, p.packaging_unit,
             SUM(oi.quantity) AS units_sold,
             COUNT(DISTINCT o.id) AS order_count,
             SUM(oi.quantity * oi.unit_price_kes) AS revenue_kes,
             SUM(oi.quantity * COALESCE(oi.unit_cost_kes, 0)) AS cost_kes,
             SUM(CASE WHEN oi.unit_cost_kes IS NULL THEN oi.quantity ELSE 0 END) AS units_without_cost
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE ${dateFilter}
      GROUP BY p.id, p.name, p.category, p.packaging_unit
      ORDER BY revenue_kes DESC`
    : `
      SELECT p.category AS label, NULL AS category, NULL AS packaging_unit,
             SUM(oi.quantity) AS units_sold,
             COUNT(DISTINCT o.id) AS order_count,
             SUM(oi.quantity * oi.unit_price_kes) AS revenue_kes,
             SUM(oi.quantity * COALESCE(oi.unit_cost_kes, 0)) AS cost_kes,
             SUM(CASE WHEN oi.unit_cost_kes IS NULL THEN oi.quantity ELSE 0 END) AS units_without_cost
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE ${dateFilter}
      GROUP BY p.category
      ORDER BY revenue_kes DESC`;

  const params = [REVENUE_STATUSES, from, to];

  const [rowsResult, ordersResult] = await Promise.all([
    pool.query(rowsSql, params),
    pool.query(
      `SELECT COUNT(*) AS order_count, COALESCE(SUM(o.discount_amount_kes), 0) AS discounts_kes
       FROM orders o WHERE ${dateFilter}`,
      params
    ),
  ]);

  const rows = rowsResult.rows.map((r) => {
    const revenue = Number(r.revenue_kes);
    const cost = Number(r.cost_kes);
    const profit = revenue - cost;
    return {
      label: r.label as string,
      category: r.category as string | null,
      packaging_unit: r.packaging_unit as string | null,
      units_sold: Number(r.units_sold),
      order_count: Number(r.order_count),
      revenue_kes: revenue,
      cost_kes: cost,
      profit_kes: profit,
      margin_percent: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : null,
      units_without_cost: Number(r.units_without_cost),
    };
  });

  const grossRevenue = rows.reduce((s, r) => s + r.revenue_kes, 0);
  const cost = rows.reduce((s, r) => s + r.cost_kes, 0);
  const discounts = Number(ordersResult.rows[0].discounts_kes);
  const netRevenue = grossRevenue - discounts;
  const grossProfit = netRevenue - cost;

  res.json({
    from,
    to,
    group,
    rows,
    totals: {
      order_count: Number(ordersResult.rows[0].order_count),
      units_sold: rows.reduce((s, r) => s + r.units_sold, 0),
      gross_revenue_kes: grossRevenue,
      discounts_kes: discounts,
      net_revenue_kes: netRevenue,
      cost_kes: cost,
      gross_profit_kes: grossProfit,
      margin_percent: netRevenue > 0 ? Math.round((grossProfit / netRevenue) * 1000) / 10 : null,
      units_without_cost: rows.reduce((s, r) => s + r.units_without_cost, 0),
    },
  });
}
