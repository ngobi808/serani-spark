// Loads products-seed-data.json (exported from the catalogue spreadsheet) into the database.
// Safe to run more than once: matches existing products by name and UPDATES them instead
// of creating duplicates, so re-running this after you edit the spreadsheet again
// (e.g. adding more image URLs or fixing real stock counts) just refreshes those fields.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function run() {
  const dataPath = path.join(__dirname, 'products-seed-data.json');
  const products = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  let created = 0;
  let updated = 0;

  for (const p of products) {
    const existing = await pool.query(
      `SELECT id FROM products WHERE LOWER(name) = LOWER($1)`,
      [p.name]
    );

    if (existing.rowCount > 0) {
      await pool.query(
        `UPDATE products SET
           description = $1, category = $2, sku = $3, packaging_unit = $4,
           units_per_package = $5, selling_price_kes = $6, cost_price_kes = $7,
           moq = $8, stock_quantity = $9, image_urls = $10, is_active = $11,
           updated_at = now()
         WHERE id = $12`,
        [
          p.description, p.category, p.sku, p.packaging_unit,
          p.units_per_package, p.selling_price_kes, p.cost_price_kes,
          p.moq, p.stock_quantity, p.image_urls, p.is_active,
          existing.rows[0].id,
        ]
      );
      updated++;
      console.log(`updated: ${p.name}`);
    } else {
      await pool.query(
        `INSERT INTO products
           (name, description, category, sku, packaging_unit, units_per_package,
            selling_price_kes, cost_price_kes, moq, stock_quantity, image_urls, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          p.name, p.description, p.category, p.sku, p.packaging_unit, p.units_per_package,
          p.selling_price_kes, p.cost_price_kes, p.moq, p.stock_quantity, p.image_urls, p.is_active,
        ]
      );
      created++;
      console.log(`created: ${p.name}`);
    }
  }

  console.log(`\nDone. ${created} created, ${updated} updated.`);
  await pool.end();
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
