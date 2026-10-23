import { pool } from './pool.js';
import { PRODUCTS, STORES } from './seeds/catalog.js';
import { POLICIES } from './seeds/policies.js';

// Idempotent: safe to run repeatedly. Re-running resets demo products' price/description
// but does NOT overwrite stock quantities of products that already exist.
async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const storeIds = [];
    for (const s of STORES) {
      const { rows } = await client.query(
        `INSERT INTO stores (code, name, city, address) VALUES ($1,$2,$3,$4)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city, address = EXCLUDED.address
         RETURNING id`,
        [s.code, s.name, s.city, s.address],
      );
      storeIds.push(rows[0].id);
    }

    for (const [sku, name, category, brand, price, description, stocks] of PRODUCTS) {
      for (let i = 0; i < storeIds.length; i++) {
        await client.query(
          `INSERT INTO products (store_id, sku, name, category, brand, price, description, stock_quantity)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (store_id, sku) DO UPDATE SET
             name = EXCLUDED.name, category = EXCLUDED.category, brand = EXCLUDED.brand,
             price = EXCLUDED.price, description = EXCLUDED.description`,
          [storeIds[i], sku, name, category, brand, price, description, stocks[i]],
        );
      }
    }

    for (const p of POLICIES) {
      const { rows } = await client.query(
        `INSERT INTO policies (slug, title, category, version, effective_date) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, category = EXCLUDED.category,
           version = EXCLUDED.version, effective_date = EXCLUDED.effective_date
         RETURNING id`,
        [p.slug, p.title, p.category, p.version, p.effectiveDate],
      );
      for (const [section, content] of p.sections) {
        // Changed content invalidates the stored embedding so ingest re-embeds it.
        await client.query(
          `INSERT INTO policy_chunks (policy_id, section, content) VALUES ($1,$2,$3)
           ON CONFLICT (policy_id, section) DO UPDATE SET
             embedding = CASE WHEN policy_chunks.content = EXCLUDED.content THEN policy_chunks.embedding ELSE NULL END,
             embedding_model = CASE WHEN policy_chunks.content = EXCLUDED.content THEN policy_chunks.embedding_model ELSE NULL END,
             content = EXCLUDED.content`,
          [rows[0].id, section, content],
        );
      }
    }

    await client.query('COMMIT');
    const c = await pool.query(
      'SELECT (SELECT count(*) FROM stores) stores, (SELECT count(*) FROM products) products, (SELECT count(*) FROM policy_chunks) chunks',
    );
    console.log('Seed complete:', c.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

seed()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error('Seed failed:', err.message);
    await pool.end();
    process.exit(1);
  });
