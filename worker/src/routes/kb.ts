import { Hono } from 'hono';
import type { Env } from '../types';

export function kbRoutes(app: Hono<{ Bindings: Env }>) {
  const router = new Hono<{ Bindings: Env }>();

  router.post('/upload', async (c) => {
    const userId = c.get('userId') as string;
    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) return c.json({ error: 'No file provided' }, 400);

    const id = crypto.randomUUID();
    const r2Key = `documents/${userId}/${id}`;

    await c.env.R2.put(r2Key, file);

    await c.env.DB.prepare(
      'INSERT INTO documents (id, user_id, name, type, size, r2_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, userId, file.name, file.type, file.size, r2Key, Date.now()).run();

    try {
      await processDocument(id, r2Key, userId, c.env);
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

    await c.env.R2.delete((doc as any).r2_key);
    await c.env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(docId).run();

    return c.json({ success: true });
  });

  app.route('/api/kb', router);
}

async function processDocument(docId: string, r2Key: string, userId: string, env: Env) {
  const file = await env.R2.get(r2Key);
  const content = await file?.text();
  if (!content) throw new Error('File content empty');

  const chunks = chunkText(content, 512, 50);
  const embeddings = await generateEmbeddings(chunks, env);
  const vectors = embeddings.map((vec, i) => ({
    id: `${docId}-${i}`,
    values: vec,
    metadata: { userId, docId, chunk: chunks[i] }
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

async function generateEmbeddings(chunks: string[], env: Env): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.LLM_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ input: chunks, model: 'text-embedding-ada-002' })
  });
  const data = await response.json();
  return data.data.map((d: any) => d.embedding);
}
