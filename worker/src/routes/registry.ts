import { Hono } from 'hono';
import { getRegistryContext, deleteComponent } from '../lib/registry';
import type { AppEnv } from '../types';

export function registryRoutes(app: Hono<AppEnv>) {
  const router = new Hono<AppEnv>();

  router.get('/', async (c) => {
    const userId = c.get('userId') as string;
    const components = await c.env.DB.prepare(
      'SELECT id, name, description, render_type, props_schema, use_count, created_at, updated_at FROM components WHERE user_id = ? ORDER BY use_count DESC'
    ).bind(userId).all();

    return c.json(components.results);
  });

  router.get('/:name/code', async (c) => {
    const userId = c.get('userId') as string;
    const name = c.req.param('name');

    const component = await c.env.DB.prepare(
      'SELECT code, render_type FROM components WHERE user_id = ? AND name = ?'
    ).bind(userId, name).first();

    if (!component) return c.json({ error: 'Not found' }, 404);

    return c.json({ code: (component as any).code, renderType: (component as any).render_type });
  });

  router.delete('/:name', async (c) => {
    const userId = c.get('userId') as string;
    const name = c.req.param('name');

    const deleted = await deleteComponent(userId, name, c.env.DB);
    if (!deleted) return c.json({ error: 'Not found' }, 404);
    return c.json({ success: true });
  });

  router.post('/context', async (c) => {
    const userId = c.get('userId') as string;
    const context = await getRegistryContext(userId, c.env.DB);
    return c.json({ context });
  });

  app.route('/api/registry', router);
}
