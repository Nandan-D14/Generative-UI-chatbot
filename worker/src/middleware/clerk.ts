import { verifyToken } from '@clerk/backend';
import type { Context, Next, MiddlewareHandler } from 'hono';
import type { Env } from '../types';

export const clerkMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  if (c.req.method === 'OPTIONS') return next();

  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = await verifyToken(token, {
      secretKey: c.env.CLERK_SECRET_KEY
    });

    c.set('userId', payload.sub);
    c.set('userEmail', payload.email || '');
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
};
