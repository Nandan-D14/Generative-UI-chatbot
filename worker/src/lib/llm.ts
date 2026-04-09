import { ChatOpenAI } from '@langchain/openai';
import type { Env } from '../types';

type EmbeddingInputType = 'query' | 'passage';

type EmbeddingRecord = {
  embedding: number[];
};

type EmbeddingsResponse = {
  data?: EmbeddingRecord[];
  error?: {
    message?: string;
  };
};

export function createChatModel(env: Env) {
  return new ChatOpenAI({
    apiKey: env.LLM_API_KEY,
    model: env.LLM_CHAT_MODEL,
    temperature: 0.3,
    maxTokens: 8064,
    configuration: { baseURL: env.LLM_BASE_URL }
  });
}

export async function generateEmbedding(
  input: string,
  inputType: EmbeddingInputType,
  env: Env
): Promise<number[]> {
  const [embedding] = await generateEmbeddings([input], inputType, env);
  return embedding;
}

export async function generateEmbeddings(
  input: string[],
  inputType: EmbeddingInputType,
  env: Env
): Promise<number[][]> {
  const response = await fetch(`${env.LLM_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.LLM_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input,
      model: env.LLM_EMBED_MODEL,
      input_type: inputType,
      encoding_format: 'float',
      truncate: 'END'
    })
  });

  const payload = await response.json() as EmbeddingsResponse;

  if (!response.ok) {
    const message = payload.error?.message || `Embedding request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (!Array.isArray(payload.data) || payload.data.length !== input.length) {
    throw new Error('Embedding response was malformed.');
  }

  const vectors = payload.data.map((item) => item.embedding);

  for (const vector of vectors) {
    if (!Array.isArray(vector) || vector.length !== env.LLM_EMBED_DIMENSIONS) {
      throw new Error(
        `Embedding dimension mismatch. Expected ${env.LLM_EMBED_DIMENSIONS}, got ${vector?.length ?? 'unknown'}.`
      );
    }
  }

  return vectors;
}
