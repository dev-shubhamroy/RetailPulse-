import { useCallback, useEffect, useState } from 'react';
import { createProposal, decideProposal, getAudit, getProducts, getProposals } from '../services/api.js';
import { ErrorBox, Notice } from '../components/ui.jsx';

const STATUS = {
  pending: 'bg-amber-100 text-amber-700', approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-slate-200 text-slate-700', failed: 'bg-red-100 text-red-700',
};
const fmt = (d) => new Date(d).toLocaleString();

export default function StoreOperations() {
  const [pin, setPin] = useState(() => sessionStorage.getItem('managerPin') ?? '');
  const [proposals, setProposals] = useState([]);
  const [audit, setAudit] = useState([]);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);

  const [search, setSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [form, setForm] = useState({ productId: '', action: 'increase', quantity: 1, reason: '' });

  const refresh = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([getProposals(), getAudit()]);
      setProposals(p); setAudit(a); setError(null);
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { sessionStorage.setItem('managerPin', pin); }, [pin]);
  useEffect(() => {
    const t = setTimeout(() => getProducts({ q: search, pageSize: 10 }).then((r) => setOptions(r.data)).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [search]);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await createProposal({ ...form, productId: Number(form.productId), quantity: Number(form.quantity) });
      setMsg('Proposal submitted and awaiting manager approval. Stock has not changed.');
      setForm({ ...form, reason: '' });
      refresh();
    } catch (err) { setError(err.message); }
  }

  async function decide(id, decision) {
    setMsg(null);
    try {
      await decideProposal(id, decision, pin);
      setError(null);
      setMsg(`Proposal #${id} ${decision === 'approve' ? 'approved and stock updated' : 'rejected'}.`);
    } catch (err) { setError(err.message); }
    refresh();
  }

  const input = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Store Operations</h2>
        <p className="mt-1 text-slate-500">Staff propose stock adjustments; a manager approves before anything changes.</p>
      </div>

      <Notice><strong>Demo access control:</strong> managers are identified by a shared PIN, not real authentication. Default PIN is in <code>.env.example</code>.</Notice>
      {error && <ErrorBox message={error} />}
      {msg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</div>}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Propose an adjustment</h3>
        <form onSubmit={submit} className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product to adjust…" className={`${input} mb-2 w-full`} />
            <select required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className={`${input} w-full`}>
              <option value="">Select a product listing…</option>
              {options.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.storeName} · stock {p.stockQuantity}</option>)}
            </select>
          </div>
          <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} className={input}>
            <option value="increase">Increase stock</option>
            <option value="decrease">Decrease stock</option>
          </select>
          <input type="number" min="1" max="10000" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={input} />
          <input required minLength={3} maxLength={300} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason (e.g. Supplier delivery received)" className={`${input} md:col-span-2`} />
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white md:col-span-2">Submit proposal</button>
        </form>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Proposals</h3>
          <label className="flex items-center gap-2 text-sm">Manager PIN
            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className={`${input} w-40`} placeholder="demo PIN" />
          </label>
        </div>
        <div className="mt-3 space-y-3">
          {proposals.length === 0 && <p className="text-sm text-slate-500">No proposals yet.</p>}
          {proposals.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <div>
                <p className="font-medium">#{p.id} {p.action === 'increase' ? '+' : '−'}{p.quantity} · {p.productName} <span className="font-normal text-slate-500">({p.storeName})</span></p>
                <p className="text-slate-600">{p.reason} <span className="text-slate-400">— {p.proposedBy}, {fmt(p.createdAt)}</span></p>
                {p.status === 'approved' && <p className="text-emerald-700">Stock {p.stockBefore} → {p.stockAfter} by {p.decidedBy}</p>}
                {(p.status === 'rejected' || p.status === 'failed') && <p className="text-slate-500">{p.decisionNote || `Decided by ${p.decidedBy}`}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[p.status]}`}>{p.status}</span>
                {p.status === 'pending' && (
                  <>
                    <button onClick={() => decide(p.id, 'approve')} className="rounded-lg bg-emerald-600 px-3 py-1 text-white">Approve</button>
                    <button onClick={() => decide(p.id, 'reject')} className="rounded-lg border border-slate-300 px-3 py-1">Reject</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-semibold">Audit log</h3>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Time</th><th className="p-3">Event</th><th className="p-3">Proposal</th><th className="p-3">Product</th><th className="p-3">Actor</th></tr></thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id} className="border-t border-slate-100"><td className="p-3">{fmt(a.createdAt)}</td><td className="p-3">{a.event}</td><td className="p-3">#{a.proposalId}</td><td className="p-3">{a.productName}</td><td className="p-3">{a.actor}</td></tr>
              ))}
              {audit.length === 0 && <tr><td colSpan="5" className="p-3 text-slate-500">No activity yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
