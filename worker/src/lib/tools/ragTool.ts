export class RAGTool {
  name = 'rag_search';
  description = "Search the user's knowledge base for relevant document chunks. Use this when the user asks about their documents, policies, or internal information.";

  constructor(
    private vectorize: VectorizeIndex,
    private apiKey: string,
    private baseUrl: string,
    private userId: string
  ) {}

  async call(query: string): Promise<string> {
    const embedding = await this.generateEmbedding(query);
    const results = await this.vectorize.query(embedding, {
      topK: 5,
      filter: { userId: this.userId }
    });

    if (!results.matches.length) return 'No relevant documents found.';

    return results.matches.map((m, i) =>
      `[Doc: ${m.metadata.docName || 'unknown'}]\n${m.metadata.chunk}`
    ).join('\n\n---\n\n');
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input: text, model: 'nvidia/nv-embedqa-e5-v5' })
    });
    const data = await response.json();
    return data.data[0].embedding;
  }
}
