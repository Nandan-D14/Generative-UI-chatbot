import { verifyToken } from '@clerk/backend';
import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../types';

export const clerkMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.req.method === 'OPTIONS') return next();

  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const result = await verifyToken(token, { secretKey: c.env.CLERK_SECRET_KEY });

    const userId = result.sub;
    const emailClaim = (result as { email?: unknown }).email;
    const email = typeof emailClaim === 'string' ? emailClaim : '';

    c.set('userId', userId);
    c.set('userEmail', email);

    // Auto-create user if not exists (fallback when webhook hasn't fired)
    try {
      await c.env.DB.prepare(
        'INSERT OR IGNORE INTO users (id, email, created_at) VALUES (?, ?, ?)'
      ).bind(userId, email, Math.floor(Date.now() / 1000)).run();
    } catch {
      // User already exists, ignore
    }

    await next();
  } catch (err) {
    return c.json({ error: `Invalid token: ${(err as Error).message}` }, 401);
  }
};
