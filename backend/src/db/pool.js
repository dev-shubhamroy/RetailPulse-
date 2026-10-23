import pg from 'pg';
import { env } from '../config/env.js';

export const pool = new pg.Pool({
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  user: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,
  max: 10,
  connectionTimeoutMillis: 2000,
});

// Prevent idle-client errors from crashing the process.
pool.on('error', (err) => console.error('Unexpected PG pool error:', err.message));

export async function checkDatabase() {
  try {
    await pool.query('SELECT 1');
    return { connected: true };
  } catch (err) {
    return { connected: false, error: err.message || err.code || 'connection failed' };
  }
}
