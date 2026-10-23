import { env } from '../config/env.js';
import { checkDatabase } from '../db/pool.js';

export async function getHealth(req, res) {
  const database = await checkDatabase();
  res.status(200).json({
    status: database.connected ? 'ok' : 'degraded',
    service: 'retailpulse-backend',
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database,
  });
}
