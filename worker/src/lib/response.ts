type RenderType = 'none' | 'html' | 'react';

type NormalizedLLMResponse = {
  text: string;
  renderType: RenderType;
  componentName?: string;
  props?: Record<string, unknown>;
  code?: string;
  saveAsComponent?: {
    name: string;
    description: string;
    propsSchema: Record<string, unknown>;
  } | null;
  saveAsArtifact?: boolean;
  sources?: unknown[];
};

export function normalizeLLMResponse(raw: string): string {
  return JSON.stringify(parseLLMResponse(raw));
}

function parseLLMResponse(raw: string): NormalizedLLMResponse {
  const parsed = parseResponseObject(raw);
  if (!parsed) {
    return {
      text: cleanupText(raw),
      renderType: 'none',
      saveAsArtifact: false,
      sources: []
    };
  }

  return sanitizeResponseObject(parsed, raw);
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
      // Try the next representation.
    }
  }

  return null;
}

function sanitizeResponseObject(value: unknown, raw: string): NormalizedLLMResponse {
  const record = isRecord(value) ? value : {};
  const text = typeof record.text === 'string' && record.text.trim()
    ? record.text
    : cleanupText(raw);

  const code = typeof record.code === 'string' && record.code.trim()
    ? record.code
    : undefined;

  const requestedRenderType = isRenderType(record.renderType) ? record.renderType : 'none';
  const renderType: RenderType = requestedRenderType !== 'none' && !code
    ? 'none'
    : requestedRenderType;

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

function normalizeSaveAsComponent(value: unknown): NormalizedLLMResponse['saveAsComponent'] {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;

  if (typeof value.name !== 'string' || !value.name.trim()) return undefined;
  if (typeof value.description !== 'string') return undefined;
  if (!isRecord(value.propsSchema)) return undefined;

  return {
    name: value.name,
    description: value.description,
    propsSchema: value.propsSchema
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

function isRenderType(value: unknown): value is RenderType {
  return value === 'none' || value === 'html' || value === 'react';
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
