import { createFallbackLLMResponse, parseStructuredLLMResponse } from '../../../shared/llm-response';
import type { LLMResponse } from '../../../shared/types';

export function parseLLMResponsePayload(payload: unknown): LLMResponse {
  if (isResponseObject(payload)) {
    return payload;
  }

  const raw = typeof payload === 'string' ? payload : '';
  return parseStructuredLLMResponse(raw) ?? createFallbackLLMResponse(raw);
}

function isResponseObject(value: unknown): value is LLMResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as LLMResponse).text === 'string' &&
    isRenderType((value as LLMResponse).renderType)
  );
}

function isRenderType(value: unknown): value is LLMResponse['renderType'] {
  return value === 'none' || value === 'html' || value === 'react';
}
