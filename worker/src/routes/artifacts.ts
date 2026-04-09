import { Hono } from 'hono';
import type { Env } from '../types';

export function artifactRoutes(app: Hono<{ Bindings: Env }>) {
  const router = new Hono<{ Bindings: Env }>();

  router.post('/', async (c) => {
    const userId = c.get('userId') as string;
    const { chatId, messageId, title, renderType, code } = await c.req.json();
    const id = crypto.randomUUID();

    await c.env.DB.prepare(
      'INSERT INTO artifacts (id, user_id, chat_id, message_id, title, render_type, code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, userId, chatId || null, messageId || null, title, renderType, code, Date.now()).run();

    return c.json({ id, success: true });
  });

  router.get('/', async (c) => {
    const userId = c.get('userId') as string;
    const artifacts = await c.env.DB.prepare(
      'SELECT * FROM artifacts WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all();

    return c.json(artifacts.results);
  });

  router.get('/:id', async (c) => {
    const userId = c.get('userId') as string;
    const id = c.req.param('id');

    const artifact = await c.env.DB.prepare(
      'SELECT * FROM artifacts WHERE id = ? AND user_id = ?'
    ).bind(id, userId).first();

    if (!artifact) return c.json({ error: 'Not found' }, 404);
    return c.json(artifact);
  });

  router.delete('/:id', async (c) => {
    const userId = c.get('userId') as string;
    const id = c.req.param('id');

    await c.env.DB.prepare(
      'DELETE FROM artifacts WHERE id = ? AND user_id = ?'
    ).bind(id, userId).run();

    return c.json({ success: true });
  });

  app.route('/api/artifacts', router);
}
