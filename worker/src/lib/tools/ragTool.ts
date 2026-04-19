import { generateEmbedding } from '../llm';
import type { Env } from '../../types';

type VectorMatchMetadata = {
  chunk?: string;
  docName?: string;
};

export class RAGTool {
  name = 'rag_search';
  description = "Search the user's knowledge base for relevant document chunks. Use this when the user asks about their documents, policies, or internal information.";

  constructor(
    private vectorize: VectorizeIndex,
    private env: Env,
    private userId: string,
    private embedder: typeof generateEmbedding = generateEmbedding
  ) {}

  async call(query: string): Promise<string> {
    const embedding = await this.embedder(query, 'query', this.env);
    const results = await this.vectorize.query(embedding, {
      topK: 5,
      filter: { userId: this.userId },
      returnMetadata: 'all'
    });

    if (!results.matches.length) return 'No relevant documents found.';

    return results.matches.map((m) =>
      {
        const metadata = (m.metadata || {}) as VectorMatchMetadata;
        return `[Doc: ${metadata.docName || 'unknown'}]\n${metadata.chunk || ''}`;
      }
    ).join('\n\n---\n\n');
  }
}
