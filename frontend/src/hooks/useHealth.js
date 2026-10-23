import { useEffect, useState } from 'react';
import { getHealth } from '../services/api.js';

// Polls GET /api/health. status: 'loading' | 'ok' | 'degraded' | 'offline'
export default function useHealth(intervalMs = 15000) {
  const [state, setState] = useState({ status: 'loading', data: null });

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const data = await getHealth();
        if (!cancelled) setState({ status: data.status === 'ok' ? 'ok' : 'degraded', data });
      } catch {
        if (!cancelled) setState({ status: 'offline', data: null });
      }
    }
    check();
    const id = setInterval(check, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return state;
}
