import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useHealth from '../hooks/useHealth.js';
import { getDashboard } from '../services/api.js';
import { ErrorBox } from '../components/ui.jsx';

function Card({ label, value, tone = 'text-slate-900', to }) {
  const body = (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value ?? '—'}</p>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function Dashboard() {
  const { status, data: health } = useHealth();
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { getDashboard().then(setD).catch((e) => setError(e.message)); }, []);

  return (
    <div>
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <p className="mt-1 text-slate-500">Stock-aware recommendations, policy answers with citations, and approval-gated inventory changes.</p>
      {error && <div className="mt-4"><ErrorBox message={error} /></div>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card label="Stores" value={d?.stores} />
        <Card label="Product listings" value={d?.products} to="/products" />
        <Card label="Out of stock" value={d?.outOfStock} tone="text-red-600" />
        <Card label="Low stock (≤5)" value={d?.lowStock} tone="text-amber-600" />
        <Card label="Pending approvals" value={d?.pendingProposals} tone="text-amber-600" to="/operations" />
        <Card label="Policy passages embedded" value={d ? `${d.embeddedPassages}/${d.policyPassages}` : null} tone={d && d.embeddedPassages < d.policyPassages ? 'text-amber-600' : 'text-emerald-600'} to="/assistant" />
        <Card label="Backend API" value={{ loading: 'Checking…', ok: 'Online', degraded: 'Online', offline: 'Offline' }[status]} tone={status === 'offline' ? 'text-red-600' : 'text-emerald-600'} />
        <Card label="PostgreSQL" value={health ? (health.database?.connected ? 'Connected' : 'Unavailable') : '—'} tone={health?.database?.connected ? 'text-emerald-600' : 'text-amber-600'} />
      </div>

      {d && d.embeddedPassages < d.policyPassages && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Policy passages are not embedded yet, so policy answers use keyword search. Run <code>npm run ingest:policies</code> in <code>backend/</code> (needs Ollama).
        </p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold">Needs restocking</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {d?.lowStockItems.map((i) => (
              <li key={i.id} className="flex justify-between"><span>{i.name} <span className="text-slate-400">· {i.storeName}</span></span>
                <span className={i.stockQuantity === 0 ? 'text-red-600' : 'text-amber-600'}>{i.stockQuantity}</span></li>
            ))}
            {d && d.lowStockItems.length === 0 && <li className="text-slate-500">Everything is well stocked.</li>}
          </ul>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold">Recent inventory activity</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {d?.recentActivity.map((a, i) => (
              <li key={i}><span className="font-medium">{a.event}</span> · {a.productName} <span className="text-slate-400">by {a.actor}</span></li>
            ))}
            {d && d.recentActivity.length === 0 && <li className="text-slate-500">No activity yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
