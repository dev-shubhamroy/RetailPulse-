export const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

export function StockBadge({ qty }) {
  if (qty === 0) return <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Out of stock</span>;
  if (qty <= 5) return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">Low stock: {qty}</span>;
  return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">In stock: {qty}</span>;
}

export function ErrorBox({ message }) {
  return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</div>;
}

export function Notice({ children }) {
  return <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{children}</div>;
}

export function Spinner({ label = 'Loading…' }) {
  return <p className="py-8 text-center text-sm text-slate-500">{label}</p>;
}

export function ProductCard({ p }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{p.name}</p>
          <p className="text-xs text-slate-500">{p.sku} · {p.category}</p>
        </div>
        <p className="whitespace-nowrap font-semibold">{inr(p.price)}</p>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{p.description}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-500">{p.storeName}, {p.storeCity}</span>
        <StockBadge qty={p.stockQuantity} />
      </div>
      {p.reason && <p className="mt-3 rounded-lg bg-slate-50 p-2 text-sm text-slate-700">{p.reason}</p>}
    </div>
  );
}
