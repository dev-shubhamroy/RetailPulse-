import { pool } from '../db/pool.js';

const SELECT = `
  SELECT p.id::int AS id, p.sku, p.name, p.description, p.category, p.brand,
         p.price::float8 AS price, p.stock_quantity AS "stockQuantity",
         (p.stock_quantity > 0) AS "inStock",
         s.id::int AS "storeId", s.code AS "storeCode", s.name AS "storeName", s.city AS "storeCity"
  FROM products p JOIN stores s ON s.id = p.store_id`;

const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Shared filter builder, also used by the recommender. Returns { where, params }. */
export function buildFilters(f) {
  const where = [];
  const params = [];
  const add = (sql, val) => { params.push(val); where.push(sql.replace('?', `$${params.length}`)); };
  if (f.q) {
    params.push(`%${escapeLike(f.q)}%`);
    where.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
  }
  if (f.storeId) add('p.store_id = ?', f.storeId);
  if (f.storeCode) add('s.code = ?', f.storeCode);
  if (f.category) add('lower(p.category) = lower(?)', f.category);
  if (f.inStock === true) where.push('p.stock_quantity > 0');
  if (f.inStock === false) where.push('p.stock_quantity = 0');
  if (f.minPrice != null) add('p.price >= ?', f.minPrice);
  if (f.maxPrice != null) add('p.price <= ?', f.maxPrice);
  return { where: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

export async function listProducts(f) {
  const { where, params } = buildFilters(f);
  const total = (await pool.query(`SELECT count(*)::int AS n FROM products p JOIN stores s ON s.id = p.store_id ${where}`, params)).rows[0].n;
  const offset = (f.page - 1) * f.pageSize;
  const { rows } = await pool.query(
    `${SELECT} ${where} ORDER BY p.name, s.code LIMIT ${f.pageSize} OFFSET ${offset}`,
    params,
  );
  return { items: rows, total };
}

export async function getProduct(id) {
  const { rows } = await pool.query(`${SELECT} WHERE p.id = $1`, [id]);
  return rows[0] ?? null;
}

/** Candidate rows for recommendations (filters enforced in SQL). */
export async function findCandidates(f, limit = 200) {
  const { where, params } = buildFilters(f);
  const { rows } = await pool.query(`${SELECT} ${where} ORDER BY p.id LIMIT ${limit}`, params);
  return rows;
}

export async function listStores() {
  const { rows } = await pool.query('SELECT id::int AS id, code, name, city FROM stores WHERE is_active ORDER BY name');
  return rows;
}

export async function listCategories() {
  const { rows } = await pool.query("SELECT DISTINCT lower(category) AS category FROM products WHERE category IS NOT NULL ORDER BY 1");
  return rows.map((r) => r.category);
}
