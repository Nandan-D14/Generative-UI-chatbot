import { Hono } from 'hono';
import {
  buildVectorIds,
  chunkText,
  CHUNK_OVERLAP,
  CHUNK_SIZE,
  detectDocumentKind,
  DocumentProcessingError,
  EMBEDDING_BATCH_SIZE,
  enforceInlineProcessingLimits,
  extractDocumentContent,
  MAX_UPLOAD_BYTES,
  SUPPORTED_KB_EXTENSIONS
} from '../lib/kb';
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
    const kind = detectDocumentKind(file.name, file.type);

    if (!kind) {
      return c.json(
        { error: `Unsupported file type. Supported formats: ${SUPPORTED_KB_EXTENSIONS.join(', ')}` },
        400
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return c.json({ error: 'File exceeds the 5 MB upload limit.' }, 413);
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    await c.env.DB.prepare(
      'INSERT INTO documents (id, user_id, name, type, size, content, chunk_count, status, error_message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, userId, file.name, file.type || kind, file.size, null, 0, 'processing', null, now).run();

    try {
      const result = await processDocument(id, userId, file, c.env);
      return c.json({ id, status: 'indexed', chunkCount: result.chunkCount });
    } catch (error) {
      const message = error instanceof DocumentProcessingError
        ? error.message
        : 'Document processing failed.';
      const statusCode: 422 | 500 = error instanceof DocumentProcessingError ? 422 : 500;

      if (!(error instanceof DocumentProcessingError)) {
        console.error('KB upload failed:', error);
      }

      await markDocumentFailed(c.env.DB, id, message);

      return c.json({
        error: message,
        id,
        status: 'failed',
        chunkCount: 0,
        errorMessage: message
      }, { status: statusCode });
    }
  });

  router.get('/documents', async (c) => {
    const userId = c.get('userId') as string;
    const docs = await c.env.DB.prepare(
      'SELECT id, name, type, size, chunk_count, status, error_message, created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all();

    return c.json(docs.results);
  });

  router.delete('/documents/:id', async (c) => {
    const userId = c.get('userId') as string;
    const docId = c.req.param('id');

    const doc = await c.env.DB.prepare(
      'SELECT id, chunk_count FROM documents WHERE id = ? AND user_id = ?'
    ).bind(docId, userId).first();

    if (!doc) return c.json({ error: 'Not found' }, 404);

    const chunkCount = Number((doc as { chunk_count?: unknown }).chunk_count ?? 0);
    const vectorIds = buildVectorIds(docId, chunkCount);

    if (vectorIds.length) {
      await c.env.VECTORIZE.deleteByIds(vectorIds);
    }

    await c.env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(docId).run();

    return c.json({ success: true });
  });

  app.route('/api/kb', router);
}

async function processDocument(docId: string, userId: string, file: File, env: Env): Promise<{ chunkCount: number }> {
  const extracted = await extractDocumentContent(file);
  const chunks = chunkText(extracted.content, CHUNK_SIZE, CHUNK_OVERLAP);

  enforceInlineProcessingLimits(extracted, chunks.length);

  const insertedVectorIds: string[] = [];

  try {
    for (let offset = 0; offset < chunks.length; offset += EMBEDDING_BATCH_SIZE) {
      const chunkBatch = chunks.slice(offset, offset + EMBEDDING_BATCH_SIZE);
      const embeddings = await generateEmbeddings(chunkBatch, 'passage', env);
      const vectors = embeddings.map((values, index) => ({
        id: `${docId}-${offset + index}`,
        values,
        metadata: {
          userId,
          docId,
          docName: file.name,
          chunk: chunkBatch[index]
        }
      }));

      await env.VECTORIZE.upsert(vectors);
      insertedVectorIds.push(...vectors.map((vector) => vector.id));
    }

    await env.DB.prepare(
      'UPDATE documents SET content = ?, status = ?, chunk_count = ?, error_message = ? WHERE id = ?'
    ).bind(extracted.content, 'indexed', chunks.length, null, docId).run();

    return { chunkCount: chunks.length };
  } catch (error) {
    if (insertedVectorIds.length) {
      try {
        await env.VECTORIZE.deleteByIds(insertedVectorIds);
      } catch (cleanupError) {
        console.error('Failed to clean up KB vectors after ingestion error:', cleanupError);
      }
    }

    throw error;
  }
}

async function markDocumentFailed(db: D1Database, docId: string, errorMessage: string) {
  await db.prepare(
    'UPDATE documents SET status = ?, error_message = ? WHERE id = ?'
  ).bind('failed', errorMessage, docId).run();
}

