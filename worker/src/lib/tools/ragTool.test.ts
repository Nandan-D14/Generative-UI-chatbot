import { describe, expect, it, vi } from 'vitest';
import { RAGTool } from './ragTool';
import type { Env } from '../../types';

const DOCUMENT_FALLBACK_SQL =
  "SELECT name, content, created_at FROM documents WHERE user_id = ? AND status = 'indexed' AND content IS NOT NULL AND TRIM(content) != '' ORDER BY created_at DESC LIMIT 15";

describe('RAGTool', () => {
  it('requests metadata when querying Vectorize', async () => {
    const query = vi.fn().mockResolvedValue({
      matches: [
        {
          metadata: {
            docName: 'Roadmap.md',
            chunk: 'Q4 launch details'
          }
        }
      ]
    });
    const embedder = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);
    const env = {} as Env;
    const tool = new RAGTool(
      { query } as unknown as VectorizeIndex,
      env,
      'user-123',
      embedder
    );

    const result = await tool.call('What is in my roadmap?');

    expect(embedder).toHaveBeenCalledWith('What is in my roadmap?', 'query', env);
    expect(query).toHaveBeenCalledWith([0.1, 0.2, 0.3], {
      topK: 5,
      filter: { userId: 'user-123' },
      returnMetadata: 'all'
    });
    expect(result).toContain('Roadmap.md');
    expect(result).toContain('Q4 launch details');
  });

  it('falls back to D1 indexed documents when vector matches are empty', async () => {
    const vectorQuery = vi.fn().mockResolvedValue({ matches: [] });
    const embedder = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);

    const all = vi.fn().mockResolvedValue({
      results: [
        {
          name: 'Revenue.csv',
          content: 'Q4 revenue forecast is 22 percent growth with stronger enterprise renewals.',
          created_at: 300
        },
        {
          name: 'Notes.md',
          content: 'General retrospective notes.',
          created_at: 200
        }
      ]
    });
    const bind = vi.fn().mockReturnValue({ all });
    const prepare = vi.fn().mockReturnValue({ bind });

    const env = {
      DB: { prepare }
    } as unknown as Env;

    const tool = new RAGTool(
      { query: vectorQuery } as unknown as VectorizeIndex,
      env,
      'user-123',
      embedder
    );

    const result = await tool.call('What does my csv say about revenue forecast?');

    expect(embedder).toHaveBeenCalledWith('What does my csv say about revenue forecast?', 'query', env);
    expect(vectorQuery).toHaveBeenCalledTimes(1);
    expect(prepare).toHaveBeenCalledWith(DOCUMENT_FALLBACK_SQL);
    expect(bind).toHaveBeenCalledWith('user-123');
    expect(result).toContain('[Doc: Revenue.csv]');
    expect(result).toContain('revenue forecast');
  });

  it('returns no-results when vectors and indexed docs are both empty', async () => {
    const vectorQuery = vi.fn().mockResolvedValue({ matches: [] });
    const embedder = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);

    const all = vi.fn().mockResolvedValue({ results: [] });
    const bind = vi.fn().mockReturnValue({ all });
    const prepare = vi.fn().mockReturnValue({ bind });

    const env = {
      DB: { prepare }
    } as unknown as Env;

    const tool = new RAGTool(
      { query: vectorQuery } as unknown as VectorizeIndex,
      env,
      'user-123',
      embedder
    );

    await expect(tool.call('Summarize my uploaded docs')).resolves.toBe('No relevant documents found.');
    expect(prepare).toHaveBeenCalledWith(DOCUMENT_FALLBACK_SQL);
    expect(bind).toHaveBeenCalledWith('user-123');
  });

  it('scopes fallback lookup to selected document IDs', async () => {
    const vectorQuery = vi.fn().mockResolvedValue({
      matches: [
        {
          metadata: {
            docId: 'other-doc',
            docName: 'Other.csv',
            chunk: 'Should be ignored due to selected scope.'
          }
        }
      ]
    });
    const embedder = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);

    const all = vi.fn().mockResolvedValue({
      results: [
        {
          name: 'Selected.csv',
          content: 'Selected file says churn rate dropped to 2.1 percent in Q4.',
          created_at: 500
        }
      ]
    });
    const bind = vi.fn().mockReturnValue({ all });
    const prepare = vi.fn().mockReturnValue({ bind });

    const env = {
      DB: { prepare }
    } as unknown as Env;

    const tool = new RAGTool(
      { query: vectorQuery } as unknown as VectorizeIndex,
      env,
      'user-123',
      embedder,
      ['selected-doc']
    );

    const result = await tool.call('What is in the selected file?');

    expect(prepare).toHaveBeenCalledWith(
      "SELECT name, content, created_at FROM documents WHERE user_id = ? AND status = 'indexed' AND content IS NOT NULL AND TRIM(content) != '' AND id IN (?) ORDER BY created_at DESC LIMIT 15"
    );
    expect(bind).toHaveBeenCalledWith('user-123', 'selected-doc');
    expect(result).toContain('[Doc: Selected.csv]');
    expect(result).toContain('churn rate dropped');
  });
});
