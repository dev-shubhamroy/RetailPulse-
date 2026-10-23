import useHealth from '../hooks/useHealth.js';

function Card({ label, value, tone = 'text-slate-900' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { status, data } = useHealth();
  const apiText = { loading: 'Checking…', ok: 'Online', degraded: 'Online', offline: 'Offline' }[status];
  const dbText = !data ? '—' : data.database?.connected ? 'Connected' : 'Unavailable';

  return (
    <div>
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <p className="mt-1 text-slate-500">Welcome to RetailPulse AI. Retail metrics will appear here in later milestones.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card label="Backend API" value={apiText} tone={status === 'offline' ? 'text-red-600' : 'text-emerald-600'} />
        <Card label="PostgreSQL" value={dbText} tone={data?.database?.connected ? 'text-emerald-600' : 'text-amber-600'} />
        <Card label="Environment" value={data?.environment ?? '—'} />
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        Sales, inventory and AI insights widgets arrive in later milestones.
      </div>
    </div>
  );
}
