import type { LLMResponse } from './types';

type RenderType = LLMResponse['renderType'];

export function parseStructuredLLMResponse(raw: string): LLMResponse | null {
  let parsed = parseResponseObject(raw);

  if (
    parsed &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    !('text' in parsed) &&
    !('renderType' in parsed) &&
    !('code' in parsed)
  ) {
    parsed = null; // False positive (e.g. parsed an inner empty object like "props": {})
  }

  parsed = parsed ?? recoverResponseObject(raw);
  if (!parsed) return null;
  return sanitizeResponseObject(parsed, raw);
}

export function createFallbackLLMResponse(raw: string): LLMResponse {
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
    extractFencedJsonBlock(raw),
    extractAfterFinalAnswer(raw),
    extractJsonObject(raw)
  ].filter((candidate): candidate is string => Boolean(candidate && candidate.trim()));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next representation.
    }
  }

  return null;
}

function recoverResponseObject(raw: string): Record<string, unknown> | null {
  const candidates = [
    extractAfterFinalAnswer(raw),
    extractFencedJsonBlock(raw),
    extractJsonObject(raw),
    raw
  ].filter((candidate): candidate is string => Boolean(candidate && candidate.trim()));

  for (const candidate of candidates) {
    const recovered = recoverObjectFromText(candidate);
    if (recovered) return recovered;
  }

  return null;
}

function recoverObjectFromText(text: string): Record<string, unknown> | null {
  const recovered: Record<string, unknown> = {};

  const textValue = extractJsonLikeValueByKey(text, 'text');
  const renderType = extractJsonLikeValueByKey(text, 'renderType');
  const componentName = extractJsonLikeValueByKey(text, 'componentName');
  const props = extractJsonLikeValueByKey(text, 'props');
  const code = extractJsonLikeValueByKey(text, 'code');
  const saveAsComponent = extractJsonLikeValueByKey(text, 'saveAsComponent');
  const saveAsArtifact = extractJsonLikeValueByKey(text, 'saveAsArtifact');
  const sources = extractJsonLikeValueByKey(text, 'sources');

  if (typeof textValue === 'string') recovered.text = textValue;
  if (typeof renderType === 'string') recovered.renderType = renderType;
  if (typeof componentName === 'string' || componentName === null) recovered.componentName = componentName;
  if (isRecord(props)) recovered.props = props;
  if (typeof code === 'string') recovered.code = code;
  if (isRecord(saveAsComponent) || saveAsComponent === null) recovered.saveAsComponent = saveAsComponent;
  if (typeof saveAsArtifact === 'boolean') recovered.saveAsArtifact = saveAsArtifact;
  if (Array.isArray(sources)) recovered.sources = sources;

  if (!('text' in recovered) && !('code' in recovered) && !('renderType' in recovered)) {
    return null;
  }

  return recovered;
}

function sanitizeResponseObject(value: unknown, raw: string): LLMResponse {
  const record = isRecord(value) ? value : {};
  const code = typeof record.code === 'string' && record.code.trim()
    ? record.code
    : undefined;

  const requestedRenderType = isRenderType(record.renderType) ? record.renderType : 'none';
  const renderType: RenderType = requestedRenderType !== 'none' && !code
    ? 'none'
    : requestedRenderType;

  let text = typeof record.text === 'string' && record.text.trim()
    ? record.text
    : cleanupText(raw);

  // Strip out any JSON code blocks that accidentally got included in the text field
  text = stripJsonBlocksFromText(text);

  return {
    text,
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
  if (value === null) return undefined;
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

function stripJsonBlocksFromText(text: string): string {
  // Remove fenced JSON code blocks that contain response-like fields
  // This regex handles ```json blocks and ``` blocks
  const fencedPattern = /```(?:json)?\s*\n?([\s\S]*?)```/g;
  
  let cleaned = text.replace(fencedPattern, (match, content) => {
    const trimmedContent = content.trim();
    // Check if this looks like a response object by looking for key patterns
    if (trimmedContent.includes('"renderType"') || 
        trimmedContent.includes('"render_type"') ||
        trimmedContent.includes('"code"') ||
        trimmedContent.includes('"componentName"') ||
        trimmedContent.includes('"component_name"')) {
      return ''; // Remove it entirely
    }
    return match; // Keep it if it doesn't look like a response object
  });

  // Also try to remove unfenced JSON objects that look like responses
  // This handles cases where the JSON appears without code fences
  const unfencedPattern = /\{[\s\S]*?"renderType"[\s\S]*?"code"[\s\S]*?\}/g;
  cleaned = cleaned.replace(unfencedPattern, (match) => {
    try {
      const parsed = JSON.parse(match);
      if (parsed && typeof parsed === 'object' && 
          ('renderType' in parsed || 'code' in parsed)) {
        return '';
      }
    } catch {
      // Try to validate by checking key patterns
      if (match.includes('"renderType"') && match.includes('"code"')) {
        return '';
      }
    }
    return match;
  });

  // Clean up extra whitespace that may result from removal
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

function extractFencedJsonBlock(text: string): string | null {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return match ? match[1].trim() : null;
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
        // Keep scanning in case a later object is valid.
      }
    }
  }

  return null;
}

function extractJsonLikeValueByKey(text: string, key: string): unknown {
  const pattern = new RegExp(`"${escapeRegex(key)}"\\s*:\\s*`, 'g');
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    const start = skipWhitespace(text, match.index + match[0].length);
    const parsed = parseJsonLikeValue(text, start);
    if (parsed.found) return parsed.value;
  }

  return undefined;
}

function parseJsonLikeValue(text: string, start: number): { found: boolean; value?: unknown } {
  if (start >= text.length) return { found: false };

  const first = text[start];

  if (first === '"') {
    const stringResult = readQuotedString(text, start);
    return stringResult ? { found: true, value: stringResult.value } : { found: false };
  }

  if (first === '{' || first === '[') {
    const structuralResult = readBalancedValue(text, start, first === '{' ? '{' : '[', first === '{' ? '}' : ']');
    return structuralResult ? { found: true, value: structuralResult } : { found: false };
  }

  if (text.startsWith('true', start)) return { found: true, value: true };
  if (text.startsWith('false', start)) return { found: true, value: false };
  if (text.startsWith('null', start)) return { found: true, value: null };

  const numberMatch = text.slice(start).match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
  if (numberMatch) return { found: true, value: Number(numberMatch[0]) };

  return { found: false };
}

function readQuotedString(text: string, start: number): { value: string; end: number } | null {
  let index = start + 1;
  let escaped = false;

  while (index < text.length) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      index++;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      index++;
      continue;
    }

    if (char === '"') {
      const rawValue = text.slice(start, index + 1);
      return { value: decodeJsonLikeString(rawValue), end: index + 1 };
    }

    index++;
  }

  return null;
}

function readBalancedValue(text: string, start: number, open: '{' | '[', close: '}' | ']'): unknown {
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

    if (char === open) {
      depth++;
      continue;
    }

    if (char === close) {
      depth--;

      if (depth === 0) {
        const candidate = text.slice(start, index + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          return undefined;
        }
      }
    }
  }

  return undefined;
}

function decodeJsonLikeString(raw: string): string {
  try {
    return JSON.parse(raw);
  } catch {
    const inner = raw.slice(1, -1);
    return inner
      .replace(/\\\\/g, '\\')
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\//g, '/');
  }
}

function skipWhitespace(text: string, index: number): number {
  let cursor = index;
  while (cursor < text.length && /\s/.test(text[cursor])) {
    cursor++;
  }
  return cursor;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanupText(raw: string): string {
  const trimmed = stripCodeFence(raw)
    .replace(/^Thought:\s*/i, '')
    .replace(/^Final Answer:\s*/i, '')
    .trim();

  // Strip any JSON response blocks that got included
  const cleaned = stripJsonBlocksFromText(trimmed);

  if (/^\{[\s\S]*"renderType"[\s\S]*"code"[\s\S]*\}$/.test(cleaned)) {
    return 'Generated a visual response, but the model returned malformed JSON. Retry the prompt to regenerate it.';
  }

  return cleaned || 'No response generated.';
}

function isRenderType(value: unknown): value is RenderType {
  return value === 'none' || value === 'html' || value === 'react';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
