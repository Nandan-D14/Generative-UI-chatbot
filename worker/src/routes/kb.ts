import { Hono } from 'hono';
import { generateEmbeddings } from '../lib/llm';
import type { AppEnv, Env } from '../types';

export function kbRoutes(app: Hono<AppEnv>) {
  const router = new Hono<AppEnv>();

  router.post('/upload', async (c) => {
    const userId = c.get('userId') as string;
    const formData = await c.req.formData();
    const fileEntry = formData.get('file');

    if (!fileEntry || typeof fileEntry === 'string') {
      return c.json({ error: 'No file provided' }, 400);
    }

    const file = fileEntry as File;
    const content = await file.text();

    const id = crypto.randomUUID();

    await c.env.DB.prepare(
      'INSERT INTO documents (id, user_id, name, type, size, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, userId, file.name, file.type, file.size, content, Date.now()).run();

    try {
      await processDocument(id, userId, file.name, content, c.env);
    } catch {
      await c.env.DB.prepare('UPDATE documents SET status = ? WHERE id = ?').bind('failed', id).run();
      return c.json({ error: 'Processing failed', id, status: 'failed' }, 500);
    }

    return c.json({ id, status: 'indexed' });
  });

  router.get('/documents', async (c) => {
    const userId = c.get('userId') as string;
    const docs = await c.env.DB.prepare(
      'SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all();

    return c.json(docs.results);
  });

  router.delete('/documents/:id', async (c) => {
    const userId = c.get('userId') as string;
    const docId = c.req.param('id');

    const doc = await c.env.DB.prepare(
      'SELECT * FROM documents WHERE id = ? AND user_id = ?'
    ).bind(docId, userId).first();

    if (!doc) return c.json({ error: 'Not found' }, 404);

    await c.env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(docId).run();

    return c.json({ success: true });
  });

  app.route('/api/kb', router);
}

async function processDocument(docId: string, userId: string, docName: string, content: string, env: Env) {
  if (!content) throw new Error('File content empty');

  const chunks = chunkText(content, 512, 50);
  const embeddings = await generateEmbeddings(chunks, 'passage', env);
  const vectors = embeddings.map((vec, i) => ({
    id: `${docId}-${i}`,
    values: vec,
    metadata: { userId, docId, docName, chunk: chunks[i] }
  }));

  await env.VECTORIZE.upsert(vectors);

  await env.DB.prepare(
    'UPDATE documents SET status = ?, chunk_count = ? WHERE id = ?'
  ).bind('indexed', chunks.length, docId).run();
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize * 4));
    start += (chunkSize - overlap) * 4;
  }
  return chunks;
}

