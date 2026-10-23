import useHealth from '../hooks/useHealth.js';

const styles = {
  loading: ['bg-slate-100 text-slate-600', 'Checking…'],
  ok: ['bg-emerald-100 text-emerald-700', 'API online'],
  degraded: ['bg-amber-100 text-amber-700', 'API up, DB down'],
  offline: ['bg-red-100 text-red-700', 'API offline'],
};

export default function Topbar({ onMenu }) {
  const { status } = useHealth();
  const [cls, label] = styles[status];

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <button
        onClick={onMenu}
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Open navigation"
      >
        ☰
      </button>
      <h1 className="hidden text-sm font-medium text-slate-500 lg:block">Retail intelligence platform</h1>
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${cls}`}>{label}</span>
    </header>
  );
}
