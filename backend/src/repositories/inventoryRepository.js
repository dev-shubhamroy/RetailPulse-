import { pool } from '../db/pool.js';
import { HttpError } from '../utils/httpError.js';

const PROPOSAL_SELECT = `
  SELECT i.id::int AS id, i.product_id::int AS "productId", p.sku, p.name AS "productName", s.name AS "storeName",
         p.stock_quantity AS "currentStock", i.action, i.quantity, i.reason, i.status,
         i.proposed_by AS "proposedBy", i.decided_by AS "decidedBy", i.decision_note AS "decisionNote",
         i.decided_at AS "decidedAt", i.stock_before AS "stockBefore", i.stock_after AS "stockAfter",
         i.created_at AS "createdAt"
  FROM inventory_proposals i JOIN products p ON p.id = i.product_id JOIN stores s ON s.id = p.store_id`;

export async function getProposal(id, db = pool) {
  return (await db.query(`${PROPOSAL_SELECT} WHERE i.id = $1`, [id])).rows[0] ?? null;
}

export async function listProposals(status) {
  const { rows } = await pool.query(
    `${PROPOSAL_SELECT} ${status ? 'WHERE i.status = $1' : ''} ORDER BY i.created_at DESC, i.id DESC LIMIT 100`,
    status ? [status] : [],
  );
  return rows;
}

export async function listAudit() {
  const { rows } = await pool.query(
    `SELECT a.id::int AS id, a.proposal_id::int AS "proposalId", a.event, a.actor, a.details, a.created_at AS "createdAt",
            p.name AS "productName", p.sku
     FROM inventory_audit_log a JOIN inventory_proposals i ON i.id = a.proposal_id JOIN products p ON p.id = i.product_id
     ORDER BY a.created_at DESC, a.id DESC LIMIT 100`,
  );
  return rows;
}

export async function createProposal({ productId, action, quantity, reason, proposedBy }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const prod = (await client.query('SELECT id, stock_quantity FROM products WHERE id = $1', [productId])).rows[0];
    if (!prod) throw new HttpError(404, 'Product not found');
    if (action === 'decrease' && quantity > prod.stock_quantity) {
      throw new HttpError(422, `Cannot propose removing ${quantity}; only ${prod.stock_quantity} in stock.`);
    }
    const { rows } = await client.query(
      `INSERT INTO inventory_proposals (product_id, action, quantity, reason, proposed_by) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [productId, action, quantity, reason, proposedBy],
    );
    await client.query(
      `INSERT INTO inventory_audit_log (proposal_id, event, actor, details) VALUES ($1,'proposed',$2,$3)`,
      [rows[0].id, proposedBy, { productId, action, quantity, reason, stockAtProposal: prod.stock_quantity }],
    );
    await client.query('COMMIT');
    return getProposal(rows[0].id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Approve or reject a pending proposal. The only code path that changes product stock.
 * Row locks on the proposal and product make double-approval and races impossible.
 */
export async function decideProposal(id, decision, { decidedBy, note }) {
  const client = await pool.connect();
  let failure = null;
  try {
    await client.query('BEGIN');
    const prop = (await client.query('SELECT * FROM inventory_proposals WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!prop) throw new HttpError(404, 'Proposal not found');
    if (prop.status !== 'pending') throw new HttpError(409, `Proposal already ${prop.status}; it cannot be decided again.`);

    if (decision === 'reject') {
      await client.query(
        `UPDATE inventory_proposals SET status='rejected', decided_by=$2, decision_note=$3, decided_at=now() WHERE id=$1`,
        [id, decidedBy, note ?? null],
      );
      await client.query(`INSERT INTO inventory_audit_log (proposal_id, event, actor, details) VALUES ($1,'rejected',$2,$3)`,
        [id, decidedBy, { note: note ?? null }]);
    } else {
      const prod = (await client.query('SELECT id, stock_quantity FROM products WHERE id = $1 FOR UPDATE', [prop.product_id])).rows[0];
      const before = prod.stock_quantity;
      const after = prop.action === 'increase' ? before + prop.quantity : before - prop.quantity;
      if (after < 0) {
        // Stock changed since the proposal was made; record the failure instead of applying.
        failure = `Stock is now ${before}; cannot remove ${prop.quantity}. Proposal marked failed.`;
        await client.query(
          `UPDATE inventory_proposals SET status='failed', decided_by=$2, decision_note=$3, decided_at=now(), stock_before=$4 WHERE id=$1`,
          [id, decidedBy, failure, before],
        );
        await client.query(`INSERT INTO inventory_audit_log (proposal_id, event, actor, details) VALUES ($1,'failed',$2,$3)`,
          [id, decidedBy, { reason: failure, stockBefore: before }]);
      } else {
        await client.query('UPDATE products SET stock_quantity = $2 WHERE id = $1', [prod.id, after]);
        await client.query(
          `UPDATE inventory_proposals SET status='approved', decided_by=$2, decision_note=$3, decided_at=now(), stock_before=$4, stock_after=$5 WHERE id=$1`,
          [id, decidedBy, note ?? null, before, after],
        );
        await client.query(`INSERT INTO inventory_audit_log (proposal_id, event, actor, details) VALUES ($1,'approved',$2,$3)`,
          [id, decidedBy, { action: prop.action, quantity: prop.quantity, stockBefore: before, stockAfter: after, note: note ?? null }]);
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  if (failure) throw new HttpError(409, failure);
  return getProposal(id);
}
