import { Hono } from 'hono';
import type { AppEnv } from '../types';

export function artifactRoutes(app: Hono<AppEnv>) {
  const router = new Hono<AppEnv>();

  router.post('/', async (c) => {
    const userId = c.get('userId') as string;
    const { chatId, messageId, title, renderType, code } = await c.req.json();
    const id = crypto.randomUUID();
    const supportsMessageId = await artifactsHaveMessageIdColumn(c.env.DB);

    if (supportsMessageId) {
      await c.env.DB.prepare(
        'INSERT INTO artifacts (id, user_id, chat_id, message_id, title, render_type, code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, userId, chatId || null, messageId || null, title, renderType, code, Date.now()).run();
    } else {
      await c.env.DB.prepare(
        'INSERT INTO artifacts (id, user_id, chat_id, title, render_type, code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, userId, chatId || null, title, renderType, code, Date.now()).run();
    }

    return c.json({ id, success: true });
  });

  router.get('/', async (c) => {
    const userId = c.get('userId') as string;
    const supportsMessageId = await artifactsHaveMessageIdColumn(c.env.DB);

    try {
      if (supportsMessageId) {
        await c.env.DB.prepare(
          `INSERT INTO artifacts (id, user_id, chat_id, message_id, title, render_type, code, created_at)
           SELECT
             lower(hex(randomblob(16))),
             ?,
             m.chat_id,
             m.id,
             COALESCE(NULLIF(m.component_name, ''), CASE WHEN m.render_type = 'react' THEN 'React Component' ELSE 'HTML View' END),
             m.render_type,
             m.code,
             m.created_at
           FROM messages m
           JOIN chats ch ON ch.id = m.chat_id
           LEFT JOIN artifacts a ON
             a.user_id = ?
             AND (
               a.message_id = m.id
               OR (a.chat_id = m.chat_id AND a.render_type = m.render_type AND a.code = m.code)
             )
           WHERE
             ch.user_id = ?
             AND m.role = 'assistant'
             AND m.render_type IN ('html', 'react')
             AND m.code IS NOT NULL
             AND TRIM(m.code) <> ''
             AND a.id IS NULL`
        ).bind(userId, userId, userId).run();
      } else {
        await c.env.DB.prepare(
          `INSERT INTO artifacts (id, user_id, chat_id, title, render_type, code, created_at)
           SELECT
             lower(hex(randomblob(16))),
             ?,
             m.chat_id,
             COALESCE(NULLIF(m.component_name, ''), CASE WHEN m.render_type = 'react' THEN 'React Component' ELSE 'HTML View' END),
             m.render_type,
             m.code,
             m.created_at
           FROM messages m
           JOIN chats ch ON ch.id = m.chat_id
           LEFT JOIN artifacts a ON
             a.user_id = ?
             AND a.chat_id = m.chat_id
             AND a.render_type = m.render_type
             AND a.code = m.code
           WHERE
             ch.user_id = ?
             AND m.role = 'assistant'
             AND m.render_type IN ('html', 'react')
             AND m.code IS NOT NULL
             AND TRIM(m.code) <> ''
             AND a.id IS NULL`
        ).bind(userId, userId, userId).run();
      }
    } catch (syncError) {
      // Keep list endpoint functional even if background sync fails.
      console.error('Error syncing artifacts from messages:', syncError);
    }

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

async function artifactsHaveMessageIdColumn(db: D1Database): Promise<boolean> {
  try {
    const schema = await db.prepare('PRAGMA table_info(artifacts)').all<{ name: string }>();
    return schema.results.some((column) => column.name === 'message_id');
  } catch {
    return false;
  }
}
