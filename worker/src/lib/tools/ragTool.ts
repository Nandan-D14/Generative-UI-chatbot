import { generateEmbedding } from '../llm';
import type { Env } from '../../types';

type VectorMatchMetadata = {
  chunk?: string;
  docName?: string;
  docId?: string;
};

type VectorQueryResult = {
  matches?: Array<{
    metadata?: unknown;
  }>;
};

type IndexedDocument = {
  name: string;
  content: string;
  createdAt: number;
};

type IndexedDocumentRow = {
  name?: unknown;
  content?: unknown;
  created_at?: unknown;
};

const DOCUMENT_FALLBACK_SQL =
  "SELECT name, content, created_at FROM documents WHERE user_id = ? AND status = 'indexed' AND content IS NOT NULL AND TRIM(content) != '' ORDER BY created_at DESC LIMIT 15";

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'how', 'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or',
  'our', 'that', 'the', 'their', 'them', 'there', 'these', 'they',
  'this', 'to', 'us', 'was', 'we', 'what', 'when', 'where', 'which',
  'who', 'why', 'with', 'you', 'your'
]);

export class RAGTool {
  name = 'rag_search';
  description = "Search the user's knowledge base for relevant document chunks. Use this when the user asks about their documents, policies, or internal information.";

  constructor(
    private vectorize: VectorizeIndex | undefined,
    private env: Env,
    private userId: string,
    private embedder: typeof generateEmbedding = generateEmbedding,
    private selectedDocumentIds: string[] = []
  ) {}

  async call(query: string): Promise<string> {
    const vectorResponse = await this.searchVectorIndex(query);
    if (vectorResponse) {
      return vectorResponse;
    }

    const docs = await this.fetchIndexedDocuments();
    if (!docs.length) {
      return 'No relevant documents found.';
    }

    const rankedDocs = this.rankDocumentsByKeywordOverlap(query, docs);
    if (!rankedDocs.length) {
      return 'No relevant documents found.';
    }

    return rankedDocs
      .slice(0, 3)
      .map((doc) => this.formatDocumentMatch(doc.name, this.buildSnippet(doc.content, query)))
      .join('\n\n---\n\n');
  }

  private async searchVectorIndex(query: string): Promise<string | null> {
    if (!this.hasVectorQuery(this.vectorize)) {
      return null;
    }

    try {
      const embedding = await this.embedder(query, 'query', this.env);
      const scopedIds = this.getScopedDocumentIds();
      const results = await this.vectorize.query(embedding, {
        topK: scopedIds.length > 0 ? 20 : 5,
        filter: { userId: this.userId },
        returnMetadata: 'all'
      }) as VectorQueryResult;

      const matches = (results.matches ?? []).filter((match) => {
        const metadata = (match.metadata || {}) as VectorMatchMetadata;
        return this.isWithinSelectedScope(metadata.docId, scopedIds);
      });

      if (!matches.length) {
        return null;
      }

      return matches
        .slice(0, 3)
        .map((match) => {
          const metadata = (match.metadata || {}) as VectorMatchMetadata;
          return this.formatDocumentMatch(metadata.docName || 'unknown', metadata.chunk || '');
        })
        .join('\n\n---\n\n');
    } catch {
      return null;
    }
  }

  private hasVectorQuery(index: VectorizeIndex | undefined): index is VectorizeIndex {
    return Boolean(index && typeof (index as { query?: unknown }).query === 'function');
  }

  private async fetchIndexedDocuments(): Promise<IndexedDocument[]> {
    const scopedIds = this.getScopedDocumentIds();
    const sql = scopedIds.length > 0
      ? `SELECT name, content, created_at FROM documents WHERE user_id = ? AND status = 'indexed' AND content IS NOT NULL AND TRIM(content) != '' AND id IN (${scopedIds.map(() => '?').join(',')}) ORDER BY created_at DESC LIMIT 15`
      : DOCUMENT_FALLBACK_SQL;

    const result = await this.env.DB.prepare(sql)
      .bind(this.userId, ...scopedIds)
      .all<IndexedDocumentRow>();

    const rows = (result.results ?? []) as IndexedDocumentRow[];

    return rows
      .map((row) => {
        const rawCreatedAt = row.created_at;
        const createdAt = typeof rawCreatedAt === 'number'
          ? rawCreatedAt
          : typeof rawCreatedAt === 'string'
            ? Number(rawCreatedAt)
            : 0;

        return {
          name: typeof row.name === 'string' ? row.name.trim() : '',
          content: typeof row.content === 'string' ? row.content.trim() : '',
          createdAt: Number.isFinite(createdAt) ? createdAt : 0
        };
      })
      .filter((row) => row.name.length > 0 && row.content.length > 0);
  }

  private rankDocumentsByKeywordOverlap(query: string, docs: IndexedDocument[]): IndexedDocument[] {
    const keywords = this.extractKeywords(query);
    const scored = docs
      .map((doc) => ({
        doc,
        score: this.scoreDocument(doc, keywords)
      }))
      .sort((a, b) => (b.score - a.score) || (b.doc.createdAt - a.doc.createdAt));

    const matchedDocs = scored.filter((entry) => entry.score > 0).map((entry) => entry.doc);
    if (matchedDocs.length > 0) {
      return matchedDocs;
    }

    if (this.getScopedDocumentIds().length > 0 || this.isDocumentIntent(query)) {
      return [...docs].sort((a, b) => b.createdAt - a.createdAt);
    }

    return [];
  }

  private scoreDocument(doc: IndexedDocument, keywords: string[]): number {
    if (!keywords.length) {
      return 0;
    }

    const lowerName = doc.name.toLowerCase();
    const lowerContent = doc.content.toLowerCase();
    let score = 0;

    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        score += 3;
      }
      if (lowerContent.includes(keyword)) {
        score += 1;
      }
    }

    return score;
  }

  private extractKeywords(text: string): string[] {
    const tokens = (text.toLowerCase().match(/[a-z0-9]+/g) || [])
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token));

    return [...new Set(tokens)];
  }

  private buildSnippet(content: string, query: string): string {
    const normalized = content.replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return 'No excerpt available.';
    }

    const keywords = this.extractKeywords(query);
    const lowerContent = normalized.toLowerCase();

    let hitIndex = -1;
    for (const keyword of keywords) {
      hitIndex = lowerContent.indexOf(keyword);
      if (hitIndex >= 0) {
        break;
      }
    }

    if (hitIndex < 0) {
      return normalized.slice(0, 320);
    }

    const start = Math.max(0, hitIndex - 120);
    const end = Math.min(normalized.length, hitIndex + 200);
    const snippet = normalized.slice(start, end).trim();

    const prefix = start > 0 ? '... ' : '';
    const suffix = end < normalized.length ? ' ...' : '';
    return `${prefix}${snippet}${suffix}`;
  }

  private isDocumentIntent(query: string): boolean {
    return /\b(upload|uploaded|document|documents|doc|docs|file|files|csv|spreadsheet|knowledge\s*base|knowledge-base|kb|dataset|row|rows|column|columns)\b/i.test(query);
  }

  private formatDocumentMatch(name: string, snippet: string): string {
    return `[Doc: ${name || 'unknown'}]\n${snippet}`;
  }

  private getScopedDocumentIds(): string[] {
    const seen = new Set<string>();
    const normalized: string[] = [];

    for (const value of this.selectedDocumentIds) {
      if (typeof value !== 'string') continue;

      const id = value.trim();
      if (!id || seen.has(id)) continue;

      seen.add(id);
      normalized.push(id);
    }

    return normalized;
  }

  private isWithinSelectedScope(docId: string | undefined, scopedIds: string[]): boolean {
    if (scopedIds.length === 0) {
      return true;
    }

    if (!docId) {
      return false;
    }

    return scopedIds.includes(docId);
  }
}
