import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateEmbeddings } from './llm';
import type { Env } from '../types';

const baseEnv = {
  LLM_API_KEY: 'test-key',
  LLM_CHAT_MODEL: 'test-chat',
  LLM_EMBED_DIMENSIONS: 3
} as Env;

describe('generateEmbeddings', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends NVIDIA query/passage metadata for Retriever embeddings', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }] }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await generateEmbeddings(['hello'], 'passage', {
      ...baseEnv,
      LLM_BASE_URL: 'https://integrate.api.nvidia.com/v1',
      LLM_EMBED_MODEL: 'nvidia/llama-nemotron-embed-1b-v2'
    });

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(requestBody).toEqual({
      input: ['hello'],
      model: 'nvidia/llama-nemotron-embed-1b-v2',
      input_type: 'passage',
      truncate: 'END'
    });
  });

  it('does not send NVIDIA-only fields to non-NVIDIA embedding providers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }] }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await generateEmbeddings(['hello'], 'query', {
      ...baseEnv,
      LLM_BASE_URL: 'https://api.openai.com/v1',
      LLM_EMBED_MODEL: 'text-embedding-3-small'
    });

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(requestBody).toEqual({
      input: ['hello'],
      model: 'text-embedding-3-small'
    });
  });

  it('truncates oversized NVIDIA embeddings to configured dimensions', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3, 0.4] }] }), { status: 200 })
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', fetchMock);

    const vectors = await generateEmbeddings(['hello'], 'passage', {
      ...baseEnv,
      LLM_BASE_URL: 'https://integrate.api.nvidia.com/v1',
      LLM_EMBED_MODEL: 'nvidia/nv-embedqa-e5-v5',
      LLM_EMBED_DIMENSIONS: 3
    });

    expect(vectors).toEqual([[0.1, 0.2, 0.3]]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
