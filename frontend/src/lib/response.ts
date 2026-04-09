import type { LLMResponse } from '../../../shared/types';

export function parseLLMResponsePayload(payload: unknown): LLMResponse {
  if (isResponseObject(payload)) {
    return sanitizeResponseObject(payload, payload.text);
  }

  const raw = typeof payload === 'string' ? payload : '';
  const parsed = parseResponseObject(raw);
  if (parsed) {
    return sanitizeResponseObject(parsed, raw);
  }

  return {
    text: cleanupText(raw),
    renderType: 'none',
    saveAsArtifact: false,
    sources: []
  };
}

function parseResponseObject(raw: string): unknown {
  const candidates = [
    raw.trim(),
    stripCodeFence(raw),
    extractAfterFinalAnswer(raw),
    extractJsonObject(raw)
  ].filter((candidate): candidate is string => Boolean(candidate && candidate.trim()));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function sanitizeResponseObject(value: unknown, raw: string): LLMResponse {
  const record = isRecord(value) ? value : {};
  const code = typeof record.code === 'string' && record.code.trim()
    ? record.code
    : undefined;

  const requestedRenderType = isRenderType(record.renderType) ? record.renderType : 'none';
  const renderType = requestedRenderType !== 'none' && !code ? 'none' : requestedRenderType;

  return {
    text: typeof record.text === 'string' && record.text.trim()
      ? record.text
      : cleanupText(raw),
    renderType,
    componentName: typeof record.componentName === 'string' && record.componentName.trim()
      ? record.componentName
      : undefined,
    props: isRecord(record.props) ? record.props : undefined,
    code,
    saveAsComponent: normalizeSaveAsComponent(record.saveAsComponent),
    saveAsArtifact: typeof record.saveAsArtifact === 'boolean' ? record.saveAsArtifact : false,
    sources: Array.isArray(record.sources) ? record.sources : []
  };
}

function normalizeSaveAsComponent(value: unknown): LLMResponse['saveAsComponent'] {
  if (!isRecord(value)) return undefined;

  if (typeof value.name !== 'string' || !value.name.trim()) return undefined;
  if (typeof value.description !== 'string') return undefined;
  if (!isRecord(value.propsSchema)) return undefined;

  return {
    name: value.name,
    description: value.description,
    propsSchema: value.propsSchema as Record<string, string>
  };
}

function stripCodeFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function extractAfterFinalAnswer(text: string): string | null {
  const match = text.match(/Final Answer:\s*([\s\S]*)$/i);
  if (!match) return null;

  const candidate = stripCodeFence(match[1]);
  return extractJsonObject(candidate) ?? candidate;
}

function extractJsonObject(text: string): string | null {
  for (let start = 0; start < text.length; start++) {
    if (text[start] !== '{') continue;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < text.length; index++) {
      const char = text[index];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === '\\') {
          escaped = true;
          continue;
        }

        if (char === '"') {
          inString = false;
        }

        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === '{') {
        depth++;
        continue;
      }

      if (char !== '}') continue;

      depth--;
      if (depth !== 0) continue;

      const candidate = text.slice(start, index + 1);
      try {
        JSON.parse(candidate);
        return candidate;
      } catch {
        break;
      }
    }
  }

  return null;
}

function cleanupText(raw: string): string {
  const trimmed = stripCodeFence(raw)
    .replace(/^Thought:\s*/i, '')
    .replace(/^Final Answer:\s*/i, '')
    .trim();

  return trimmed || 'No response generated.';
}

function isRenderType(value: unknown): value is LLMResponse['renderType'] {
  return value === 'none' || value === 'html' || value === 'react';
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isResponseObject(value: unknown): value is LLMResponse {
  return isRecord(value) && typeof value.text === 'string' && isRenderType(value.renderType);
}
