import type { MiddlewareHandler } from 'hono';
import { ensureSchema } from '../lib/db';
import type { AppEnv } from '../types';

export const dbMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  await ensureSchema(c.env);
  await next();
};
