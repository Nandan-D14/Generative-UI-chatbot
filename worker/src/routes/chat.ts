import { Hono } from 'hono';
import { streamReActResponse } from '../lib/rag';
import { saveComponent } from '../lib/registry';
import type { Env } from '../types';

export function chatRoutes(app: Hono<{ Bindings: Env }>) {
  const router = new Hono<{ Bindings: Env }>();

  router.post('/stream', async (c) => {
    const userId = c.get('userId') as string;
    const { chatId, message, history } = await c.req.json();

    const stream = await streamReActResponse(message, history, userId, c.env);

    return c.newResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  });

  router.post('/save-component', async (c) => {
    const userId = c.get('userId') as string;
    const body = await c.req.json();

    await saveComponent(
      userId, body.name, body.description, body.renderType,
      body.code, body.propsSchema, c.env.DB
    );

    return c.json({ success: true });
  });

  router.post('/new', async (c) => {
    const userId = c.get('userId') as string;
    const { title } = await c.req.json();
    const id = crypto.randomUUID();
    const now = Date.now();

    await c.env.DB.prepare(
      'INSERT INTO chats (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, userId, title || 'New Chat', now, now).run();

    return c.json({ id });
  });

  router.get('/list', async (c) => {
    const userId = c.get('userId') as string;
    const chats = await c.env.DB.prepare(
      'SELECT * FROM chats WHERE user_id = ? ORDER BY updated_at DESC'
    ).bind(userId).all();

    return c.json(chats.results);
  });

  router.post('/save-message', async (c) => {
    const userId = c.get('userId') as string;
    const body = await c.req.json();
    const id = crypto.randomUUID();

    await c.env.DB.prepare(
      'INSERT INTO messages (id, chat_id, role, text, render_type, component_name, component_props, code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id, body.chatId, body.role, body.text, body.renderType,
      body.componentName, body.componentProps ? JSON.stringify(body.componentProps) : null,
      body.code, Date.now()
    ).run();

    await c.env.DB.prepare(
      'UPDATE chats SET updated_at = ? WHERE id = ? AND user_id = ?'
    ).bind(Date.now(), body.chatId, userId).run();

    return c.json({ id });
  });

  router.get('/:id/messages', async (c) => {
    const userId = c.get('userId') as string;
    const chatId = c.req.param('id');

    const chat = await c.env.DB.prepare(
      'SELECT id FROM chats WHERE id = ? AND user_id = ?'
    ).bind(chatId, userId).first();

    if (!chat) return c.json({ error: 'Not found' }, 404);

    const messages = await c.env.DB.prepare(
      'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC'
    ).bind(chatId).all();

    return c.json(messages.results);
  });

  app.route('/api/chat', router);
}
