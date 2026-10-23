import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

const digest = (s) => createHash('sha256').update(String(s)).digest();

// DEMO ONLY: a shared PIN in the x-manager-pin header. Real deployments need proper authentication.
export function requireManager(req, res, next) {
  const supplied = req.get('x-manager-pin') ?? '';
  if (!timingSafeEqual(digest(supplied), digest(env.DEMO_MANAGER_PIN))) {
    return next(new HttpError(403, 'Manager approval requires the demo manager PIN.'));
  }
  next();
}
