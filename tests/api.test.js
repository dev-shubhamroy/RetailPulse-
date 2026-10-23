// Integration tests. They run the real Express app against the real local database.
// Ollama is replaced by a STUB server (hash-based embeddings, canned JSON chat), so they verify
// our code paths, validation and fallbacks, NOT the quality of a real model.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

let server, baseUrl, stub, env, pool, productId, originalStock, embeddingBackup;
const created = [];
const PIN = 'test-pin-1234';
process.env.DEMO_MANAGER_PIN = PIN;
process.env.OLLAMA_EMBED_MODEL = 'stub-test-model';
process.env.RAG_MAX_DISTANCE = '0.95';

function embedText(text) {
  const v = new Array(768).fill(0);
  for (const w of text.toLowerCase().match(/[a-z]{3,}/g) ?? []) {
    let h = 0;
    for (const c of w) h = (h * 31 + c.charCodeAt(0)) % 768;
    v[h] += 1;
  }
  const n = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) || 1;
  return v.map((x) => x / n);
}

function startStub() {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      let body = '';
      req.on('data', (d) => (body += d));
      req.on('end', () => {
        const j = JSON.parse(body);
        res.setHeader('content-type', 'application/json');
        if (req.url === '/api/embed') return res.end(JSON.stringify({ embeddings: j.input.map(embedText) }));
        const sys = j.messages[0].content;
        const user = j.messages[1].content;
        let out;
        if (sys.includes('convert a shopping request') || sys.includes('You convert a shopping request')) {
          out = { category: 'laptop', keywords: [], maxPrice: 70000, minPrice: null, inStockOnly: true, storeCode: 'NOT-A-STORE' };
        } else if (sys.includes('why it fits the shopper')) {
          // n=1 is a safe sentence; n=2 states a price (must be rejected); n=999 is an invalid index.
          out = { reasons: [{ n: 1, why: 'A stub sentence about fit.' }, { n: 2, why: 'Costs only 5000 rupees today.' }, { n: 999, why: 'Invented product here.' }] };
        } else {
          const first = user.match(/\[id (\d+)\]/)?.[1];
          out = /pizza/i.test(user) ? { answerable: false, answer: '', usedPassages: [] } : { answerable: true, answer: 'Stub answer from passages.', quote: user.match(/\[id \d+\] [^:]+: ([^.]+\.)/)?.[1] ?? '', usedPassages: [Number(first)] };
        }
        res.end(JSON.stringify({ message: { content: JSON.stringify(out) } }));
      });
    }).listen(0, () => resolve(s));
  });
}

const api = async (path, { method = 'GET', body, pin } = {}) => {
  const res = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(pin ? { 'x-manager-pin': pin } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
};

before(async () => {
  stub = await startStub();
  process.env.OLLAMA_BASE_URL = `http://127.0.0.1:${stub.address().port}`;
  ({ env } = await import('../backend/src/config/env.js'));
  ({ pool } = await import('../backend/src/db/pool.js'));
  const app = (await import('../backend/src/app.js')).default;
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  // Ingesting under the stub model overwrites embeddings, so back up and restore the real ones.
  embeddingBackup = (await pool.query('SELECT id, embedding::text AS emb, embedding_model AS model FROM policy_chunks')).rows;
  const p = (await pool.query('SELECT id, stock_quantity FROM products WHERE stock_quantity >= 5 ORDER BY id LIMIT 1')).rows[0];
  productId = p.id;
  originalStock = p.stock_quantity;
});

after(async () => {
  if (created.length) await pool.query('DELETE FROM inventory_proposals WHERE id = ANY($1)', [created]);
  if (productId) await pool.query('UPDATE products SET stock_quantity = $2 WHERE id = $1', [productId, originalStock]);
  for (const r of embeddingBackup ?? []) {
    await pool.query('UPDATE policy_chunks SET embedding = $2::vector, embedding_model = $3 WHERE id = $1', [r.id, r.emb, r.model]);
  }
  server.close();
  stub.close();
  await pool.end();
});

test('health reports database connected', async () => {
  const r = await api('/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.database.connected, true);
});

test('products: search, pagination, details, validation', async () => {
  const s = await api('/products?q=aero');
  assert.ok(s.body.data.length >= 1 && s.body.data.every((p) => /aero/i.test(p.name + p.sku)));
  const p1 = await api('/products?page=1&pageSize=5');
  const p2 = await api('/products?page=2&pageSize=5');
  assert.equal(p1.body.data.length, 5);
  assert.notEqual(p1.body.data[0].id, p2.body.data[0].id);
  assert.ok(p1.body.meta.total >= 60);
  const d = await api(`/products/${p1.body.data[0].id}`);
  assert.equal(d.body.data.id, p1.body.data[0].id);
  assert.equal((await api('/products/99999999')).status, 404);
  assert.equal((await api('/products?page=0')).status, 400);
  assert.equal((await api("/products?q=%25_'--")).status, 200); // wildcards/quotes are safe
});

test('recommendations: Ollama down -> deterministic fallback enforces budget', async () => {
  const saved = env.OLLAMA_BASE_URL;
  env.OLLAMA_BASE_URL = 'http://127.0.0.1:1';
  try {
    const r = await api('/ai/recommendations', { method: 'POST', body: { message: 'Find me a laptop under ₹70,000' } });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.source, 'fallback');
    assert.ok(r.body.data.products.length > 0);
    assert.ok(r.body.data.products.every((p) => p.price <= 70000 && p.category === 'laptop'));
  } finally { env.OLLAMA_BASE_URL = saved; }
});

test('recommendations (stub LLM): invalid store ignored, stock enforced, invented ids ignored', async () => {
  const r = await api('/ai/recommendations', { method: 'POST', body: { message: 'a laptop please' } });
  const d = r.body.data;
  assert.equal(d.source, 'ollama');
  assert.equal(d.criteria.storeCode, null);
  assert.ok(d.products.length > 0 && d.products.every((p) => p.inStock && p.stockQuantity > 0 && p.price <= 70000));
  assert.ok(d.products[0].reason.startsWith('A stub sentence about fit.')); // vetted AI sentence kept
  assert.ok(d.products.every((p) => !/5000|rupees today/.test(p.reason))); // sentence with a price is rejected
  assert.ok(d.products.every((p) => /in stock at/.test(p.reason))); // deterministic facts always present
  const prices = d.products.map((p) => p.score);
  assert.deepEqual(prices, [...prices].sort((a, b) => b - a)); // ranked deterministically
});

test('policy QA: ingest, grounded answer with citations, no-evidence refusal (stub)', async () => {
  assert.equal((await api('/policies/ingest', { method: 'POST' })).status, 403);
  const ing = await api('/policies/ingest', { method: 'POST', pin: PIN });
  assert.equal(ing.status, 200);
  assert.ok(ing.body.data.embedded >= 13);

  const ok = await api('/ai/policy-question', { method: 'POST', body: { message: 'What is the return window for laptops in days?' } });
  assert.equal(ok.body.data.answered, true);
  assert.equal(ok.body.data.retrieval, 'vector');
  assert.ok(ok.body.data.citations.length >= 1 && ok.body.data.citations[0].policy && ok.body.data.citations[0].section);

  const none = await api('/ai/policy-question', { method: 'POST', body: { message: 'Do you sell pizza zzzz qqqq?' } });
  assert.equal(none.body.data.answered, false);
  assert.match(none.body.data.answer, /do not support a confident answer/);
});

test('policy QA: Ollama down -> keyword fallback with citations', async () => {
  const saved = env.OLLAMA_BASE_URL;
  env.OLLAMA_BASE_URL = 'http://127.0.0.1:1';
  try {
    const r = await api('/ai/policy-question', { method: 'POST', body: { message: 'warranty on headphones' } });
    assert.equal(r.body.data.retrieval, 'keyword');
    assert.equal(r.body.data.generated, false);
    assert.ok(r.body.data.citations.some((c) => c.policy === 'Warranty Policy'));
  } finally { env.OLLAMA_BASE_URL = saved; }
});

test('inventory: propose -> pending -> approve updates stock + audit; no double approval', async () => {
  const bad = await api('/inventory/proposals', { method: 'POST', body: { productId, action: 'delete', quantity: 1, reason: 'x y z' } });
  assert.equal(bad.status, 400);
  assert.equal((await api('/inventory/proposals', { method: 'POST', body: { productId, action: 'decrease', quantity: 100000, reason: 'too many' } })).status, 400);
  assert.equal((await api('/inventory/proposals', { method: 'POST', body: { productId, action: 'decrease', quantity: 9999, reason: 'too many' } })).status, 422);

  const c = await api('/inventory/proposals', { method: 'POST', body: { productId, action: 'increase', quantity: 3, reason: 'Restock delivery' } });
  assert.equal(c.status, 201);
  const id = c.body.data.id;
  created.push(id);
  assert.equal(c.body.data.status, 'pending');

  const stockNow = async () => (await pool.query('SELECT stock_quantity FROM products WHERE id=$1', [productId])).rows[0].stock_quantity;
  assert.equal(await stockNow(), originalStock); // proposal alone changes nothing

  assert.equal((await api(`/inventory/proposals/${id}/approve`, { method: 'POST' })).status, 403);
  assert.equal((await api(`/inventory/proposals/${id}/approve`, { method: 'POST', pin: 'wrong' })).status, 403);
  assert.equal(await stockNow(), originalStock);

  const ok = await api(`/inventory/proposals/${id}/approve`, { method: 'POST', pin: PIN, body: { note: 'ok' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.status, 'approved');
  assert.equal(ok.body.data.stockBefore, originalStock);
  assert.equal(ok.body.data.stockAfter, originalStock + 3);
  assert.equal(await stockNow(), originalStock + 3);

  assert.equal((await api(`/inventory/proposals/${id}/approve`, { method: 'POST', pin: PIN })).status, 409);
  assert.equal((await api(`/inventory/proposals/${id}/reject`, { method: 'POST', pin: PIN })).status, 409);
  assert.equal(await stockNow(), originalStock + 3); // applied exactly once

  const audit = (await api('/inventory/audit')).body.data.filter((a) => a.proposalId === id).map((a) => a.event).sort();
  assert.deepEqual(audit, ['approved', 'proposed']);
});

test('inventory: reject leaves stock unchanged; stale decrease fails safely', async () => {
  const cur = (await pool.query('SELECT stock_quantity FROM products WHERE id=$1', [productId])).rows[0].stock_quantity;

  const r = await api('/inventory/proposals', { method: 'POST', body: { productId, action: 'increase', quantity: 5, reason: 'Will be rejected' } });
  created.push(r.body.data.id);
  const rej = await api(`/inventory/proposals/${r.body.data.id}/reject`, { method: 'POST', pin: PIN, body: { note: 'no' } });
  assert.equal(rej.body.data.status, 'rejected');
  assert.equal((await pool.query('SELECT stock_quantity FROM products WHERE id=$1', [productId])).rows[0].stock_quantity, cur);

  // Two decreases that each fit alone but not together: second must fail on re-check.
  const a = await api('/inventory/proposals', { method: 'POST', body: { productId, action: 'decrease', quantity: cur, reason: 'Write-off A' } });
  const b = await api('/inventory/proposals', { method: 'POST', body: { productId, action: 'decrease', quantity: cur, reason: 'Write-off B' } });
  created.push(a.body.data.id, b.body.data.id);
  assert.equal((await api(`/inventory/proposals/${a.body.data.id}/approve`, { method: 'POST', pin: PIN })).status, 200);
  const second = await api(`/inventory/proposals/${b.body.data.id}/approve`, { method: 'POST', pin: PIN });
  assert.equal(second.status, 409);
  assert.equal((await pool.query('SELECT stock_quantity FROM products WHERE id=$1', [productId])).rows[0].stock_quantity, 0);
  const list = (await api('/inventory/proposals?status=failed')).body.data;
  assert.ok(list.some((p) => p.id === b.body.data.id));
});

test('dashboard returns real counts', async () => {
  const r = await api('/dashboard');
  assert.ok(r.body.data.products >= 60 && r.body.data.stores >= 3);
});
