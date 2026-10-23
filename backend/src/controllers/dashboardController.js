import { pool } from '../db/pool.js';

export async function summary(req, res) {
  const [counts, low, recent] = await Promise.all([
    pool.query(`SELECT
        (SELECT count(*)::int FROM stores WHERE is_active) AS stores,
        (SELECT count(*)::int FROM products) AS products,
        (SELECT count(*)::int FROM products WHERE stock_quantity = 0) AS "outOfStock",
        (SELECT count(*)::int FROM products WHERE stock_quantity BETWEEN 1 AND 5) AS "lowStock",
        (SELECT count(*)::int FROM inventory_proposals WHERE status = 'pending') AS "pendingProposals",
        (SELECT count(*)::int FROM policies) AS policies,
        (SELECT count(*)::int FROM policy_chunks) AS "policyPassages",
        (SELECT count(*)::int FROM policy_chunks WHERE embedding IS NOT NULL) AS "embeddedPassages"`),
    pool.query(`SELECT p.id::int AS id, p.name, p.sku, p.stock_quantity AS "stockQuantity", s.name AS "storeName"
        FROM products p JOIN stores s ON s.id = p.store_id WHERE p.stock_quantity <= 5
        ORDER BY p.stock_quantity, p.name LIMIT 6`),
    pool.query(`SELECT a.event, a.actor, a.created_at AS "createdAt", p.name AS "productName"
        FROM inventory_audit_log a JOIN inventory_proposals i ON i.id = a.proposal_id JOIN products p ON p.id = i.product_id
        ORDER BY a.created_at DESC, a.id DESC LIMIT 5`),
  ]);
  res.json({ data: { ...counts.rows[0], lowStockItems: low.rows, recentActivity: recent.rows } });
}
