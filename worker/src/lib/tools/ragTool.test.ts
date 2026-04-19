import { describe, expect, it, vi } from 'vitest';
import { RAGTool } from './ragTool';
import type { Env } from '../../types';

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
});
