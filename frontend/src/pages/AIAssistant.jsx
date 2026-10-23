import { useEffect, useRef, useState } from 'react';
import { askPolicy, askRecommendation } from '../services/api.js';
import { Notice, ProductCard } from '../components/ui.jsx';

const MODES = {
  products: { label: 'Find products', placeholder: 'e.g. Find me a laptop under ₹70,000', examples: ['Find me a laptop under ₹70,000', 'Which headphones are available in stock?', 'smartphone below 30k in Mumbai'] },
  policy: { label: 'Policy question', placeholder: 'e.g. How long do I have to return a laptop?', examples: ['How long do I have to return a laptop?', 'Can I return opened earbuds?', 'How long do refunds take?'] },
};

function Citations({ items }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {items.map((c) => (
        <div key={c.chunkId} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="font-medium">{c.policy} <span className="font-normal text-slate-500">v{c.version} · {c.section}</span></p>
          <p className="mt-1 text-slate-600">{c.excerpt}</p>
        </div>
      ))}
    </div>
  );
}

function Message({ m }) {
  if (m.role === 'user') return <div className="ml-auto max-w-lg rounded-2xl bg-slate-900 px-4 py-2 text-sm text-white">{m.text}</div>;
  if (m.error) return <div className="max-w-2xl rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{m.error}</div>;
  const d = m.data;
  return (
    <div className="max-w-3xl space-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
      {d.notice && <Notice>{d.notice}</Notice>}
      {m.mode === 'products' ? (
        <>
          <p>{d.summary}</p>
          <p className="text-xs text-slate-500">
            {d.source === 'ollama' ? 'Interpreted by local AI; results filtered and ranked by the backend.' : 'Interpreted by rule-based fallback (AI unavailable).'}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">{d.products.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </>
      ) : (
        <>
          <p>{d.answer}</p>
          {d.quote && <blockquote className="border-l-4 border-emerald-500 pl-3 text-slate-600">“{d.quote}”</blockquote>}
          <Citations items={d.citations} />
        </>
      )}
    </div>
  );
}

export default function AIAssistant() {
  const [mode, setMode] = useState('products');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  async function send(text) {
    const message = text.trim();
    if (message.length < 2 || busy) return;
    setInput('');
    setBusy(true);
    setMessages((m) => [...m, { role: 'user', text: message }]);
    try {
      const data = await (mode === 'products' ? askRecommendation(message) : askPolicy(message));
      setMessages((m) => [...m, { role: 'assistant', mode, data }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', error: e.message }]);
    } finally {
      setBusy(false);
    }
  }

  const cfg = MODES[mode];
  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">AI Assistant</h2>
        <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
          {Object.entries(MODES).map(([key, v]) => (
            <button key={key} onClick={() => setMode(key)} className={`rounded-md px-3 py-1.5 ${mode === key ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>{v.label}</button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-slate-100/50 p-4">
        {messages.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-500">
            <p>Ask about products (stock-aware) or store policies (with citations).</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {cfg.examples.map((ex) => <button key={ex} onClick={() => send(ex)} className="rounded-full border border-slate-300 bg-white px-3 py-1 hover:bg-slate-50">{ex}</button>)}
            </div>
          </div>
        )}
        {messages.map((m, i) => <Message key={i} m={m} />)}
        {busy && <p className="text-sm text-slate-500">Thinking… (local models can take a few seconds)</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mt-3 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={500} placeholder={cfg.placeholder}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm" />
        <button disabled={busy || input.trim().length < 2} className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">Send</button>
      </form>
    </div>
  );
}
