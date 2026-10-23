const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the backend. Is it running on port 4000?');
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const fields = json?.error?.details?.fieldErrors;
    const detail = fields ? Object.values(fields).flat().join(' ') : '';
    throw new Error([json?.error?.message ?? `Request failed (${res.status})`, detail].filter(Boolean).join(': '));
  }
  return json;
}

const qs = (params) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== '' && v != null && p.set(k, v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

// /api/health reports degraded state in its body, so return it even on non-2xx.
export const getHealth = () => request('/api/health');
export const getDashboard = () => request('/api/dashboard').then((r) => r.data);
export const getFilters = () => request('/api/filters').then((r) => r.data);
export const getProducts = (params) => request(`/api/products${qs(params)}`);
export const askRecommendation = (message) => request('/api/ai/recommendations', { method: 'POST', body: { message } }).then((r) => r.data);
export const askPolicy = (message) => request('/api/ai/policy-question', { method: 'POST', body: { message } }).then((r) => r.data);
export const getPolicies = () => request('/api/policies').then((r) => r.data);
export const ingestPolicies = (pin) => request('/api/policies/ingest', { method: 'POST', headers: { 'x-manager-pin': pin } }).then((r) => r.data);
export const getProposals = () => request('/api/inventory/proposals').then((r) => r.data);
export const getAudit = () => request('/api/inventory/audit').then((r) => r.data);
export const createProposal = (body) => request('/api/inventory/proposals', { method: 'POST', body }).then((r) => r.data);
export const decideProposal = (id, decision, pin, note) =>
  request(`/api/inventory/proposals/${id}/${decision}`, { method: 'POST', headers: { 'x-manager-pin': pin }, body: { note: note || undefined } }).then((r) => r.data);
