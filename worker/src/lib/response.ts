import { createFallbackLLMResponse, parseStructuredLLMResponse } from '../../../shared/llm-response';

export function normalizeLLMResponse(raw: string): string {
  const parsed = parseStructuredLLMResponse(raw) ?? createFallbackLLMResponse(raw);
  return JSON.stringify(parsed);
}
