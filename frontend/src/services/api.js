const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function apiGet(path) {
  const res = await fetch(`${API_URL}${path}`);
  const body = await res.json().catch(() => null);
  if (!res.ok && !body) throw new Error(`Request failed (${res.status})`);
  return body;
}

export const getHealth = () => apiGet('/api/health');
