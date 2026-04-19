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
  detail?: string;
  title?: string;
  status?: number;
};

type EmbeddingsRequestBody = {
  input: string[];
  model: string;
  input_type?: EmbeddingInputType;
  truncate?: 'NONE' | 'START' | 'END';
};

export function createChatModel(env: Env) {
  return new ChatOpenAI({
    apiKey: env.LLM_API_KEY,
    model: env.LLM_CHAT_MODEL.toLowerCase(),
    temperature: 0.3,
    maxTokens: 16384,
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
  const expectedDimensions = Number(env.LLM_EMBED_DIMENSIONS);

  if (!Number.isFinite(expectedDimensions) || expectedDimensions <= 0) {
    throw new Error(`Invalid embedding dimension configuration: ${env.LLM_EMBED_DIMENSIONS}`);
  }

  const body: EmbeddingsRequestBody = {
    input,
    model: env.LLM_EMBED_MODEL
  };

  console.log(`[LLM API] Making request to: ${env.LLM_BASE_URL}/embeddings`);
  console.log(`[LLM API] Request Body:`, JSON.stringify(body).slice(0, 200) + '...');

  if (usesNvidiaEmbeddings(env)) {
    body.input_type = inputType;
    body.truncate = 'END';
  }

  const response = await fetch(`${env.LLM_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.LLM_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const payload = await readEmbeddingsResponse(response);

  if (!response.ok) {
    const providerMessage = payload.error?.message || payload.detail || payload.title;
    const message = providerMessage
      ? `Embedding request failed with status ${response.status}: ${providerMessage}`
      : `Embedding request failed with status ${response.status}`;
    console.error('[LLM API] Error:', message);
    throw new Error(message);
  }

  if (!Array.isArray(payload.data) || payload.data.length !== input.length) {
    throw new Error('Embedding response was malformed.');
  }

  return payload.data.map((item) => normalizeEmbeddingDimensions(item.embedding, expectedDimensions, env));
}

function usesNvidiaEmbeddings(env: Env): boolean {
  return env.LLM_BASE_URL.includes('integrate.api.nvidia.com') || env.LLM_EMBED_MODEL.startsWith('nvidia/');
}

async function readEmbeddingsResponse(response: Response): Promise<EmbeddingsResponse> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as EmbeddingsResponse;
  } catch {
    return { error: { message: text } };
  }
}

function normalizeEmbeddingDimensions(vector: number[], expectedDimensions: number, env: Env): number[] {
  if (!Array.isArray(vector)) {
    throw new Error('Embedding response was malformed.');
  }

  if (vector.length === expectedDimensions) {
    return vector;
  }

  if (usesNvidiaEmbeddings(env) && vector.length > expectedDimensions) {
    console.warn(
      `[LLM API] Oversized embedding from ${env.LLM_EMBED_MODEL}. Truncating from ${vector.length} to ${expectedDimensions}.`
    );
    return vector.slice(0, expectedDimensions);
  }

  console.error(
    `[LLM API] Dimension mismatch for model ${env.LLM_EMBED_MODEL}. Expected ${expectedDimensions}, got ${vector.length}.`
  );
  throw new Error(`Embedding dimension mismatch. Expected ${expectedDimensions}, got ${vector.length}.`);
}
