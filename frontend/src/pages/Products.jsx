import { useEffect, useState } from 'react';
import { getFilters, getProducts } from '../services/api.js';
import { ErrorBox, ProductCard, Spinner } from '../components/ui.jsx';

export default function Products() {
  const [filters, setFilters] = useState({ stores: [], categories: [] });
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [storeId, setStoreId] = useState('');
  const [category, setCategory] = useState('');
  const [inStock, setInStock] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: null, items: [], meta: null });

  useEffect(() => { getFilters().then(setFilters).catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(() => { setQuery(q); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    getProducts({ q: query, storeId, category, inStock, page, pageSize: 12 })
      .then((r) => !cancelled && setState({ loading: false, error: null, items: r.data, meta: r.meta }))
      .catch((e) => !cancelled && setState({ loading: false, error: e.message, items: [], meta: null }));
    return () => { cancelled = true; };
  }, [query, storeId, category, inStock, page]);

  const sel = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
  const change = (setter) => (e) => { setter(e.target.value); setPage(1); };

  return (
    <div>
      <h2 className="text-2xl font-semibold">Products</h2>
      <p className="mt-1 text-slate-500">Live catalogue across all stores.</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or SKU…" className={`${sel} w-full sm:w-64`} />
        <select value={storeId} onChange={change(setStoreId)} className={sel}>
          <option value="">All stores</option>
          {filters.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={category} onChange={change(setCategory)} className={sel}>
          <option value="">All categories</option>
          {filters.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={inStock} onChange={change(setInStock)} className={sel}>
          <option value="">Any availability</option>
          <option value="true">In stock</option>
          <option value="false">Out of stock</option>
        </select>
      </div>

      <div className="mt-6">
        {state.error && <ErrorBox message={state.error} />}
        {state.loading && <Spinner />}
        {!state.loading && !state.error && state.items.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">No products match. Have you run <code>npm run seed</code>?</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {state.items.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </div>

      {state.meta && state.meta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button>
          <span>Page {state.meta.page} of {state.meta.totalPages} · {state.meta.total} listings</span>
          <button disabled={page >= state.meta.totalPages} onClick={() => setPage(page + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
