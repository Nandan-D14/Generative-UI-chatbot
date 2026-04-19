import { useState, useCallback } from 'react';
import type { LLMResponse, ReActStep } from '../../../shared/types';
import { parseLLMResponsePayload } from '../lib/response';

export function useStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [thinkingSteps, setThinkingSteps] = useState<ReActStep[]>([]);
  const [completeResponse, setCompleteResponse] = useState<LLMResponse | null>(null);

  const startStream = useCallback(async (
    message: string,
    chatId: string,
    history: Array<{ role: string; content: string }>,
    token: string,
    options: { useWebSearch: boolean; selectedDocumentIds: string[] }
  ) => {
    setIsStreaming(true);
    setCurrentText('');
    setThinkingSteps([]);
    setCompleteResponse(null);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          chatId,
          message,
          history,
          useWebSearch: options.useWebSearch,
          selectedDocumentIds: options.selectedDocumentIds
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(await readStreamError(response, 'Unable to start chat stream.'));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResponse: LLMResponse | null = null;
      let finalSteps: ReActStep[] = [];

      const mergeStep = (step: ReActStep) => {
        finalSteps = upsertSteps(finalSteps, step);
        setThinkingSteps(prev => upsertSteps(prev, step));
      };

      while (true) {
        const { done, value } = await reader.read();
      
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);

              if (parsed.type === 'thought-start' && parsed.step) {
                mergeStep(parsed.step as ReActStep);
              }

              if (parsed.type === 'thought-complete' && parsed.step) {
                mergeStep(parsed.step as ReActStep);
              }

              if (parsed.type === 'response-start') {
                setCurrentText('');
              }

              if (parsed.type === 'text-delta' && typeof parsed.content === 'string') {
                setCurrentText(prev => prev + parsed.content);
              }

              if (parsed.type === 'response') {
                const llmResponse: LLMResponse = parseLLMResponsePayload(parsed.content);
                setCurrentText(llmResponse.text);
                setCompleteResponse(llmResponse);
                finalResponse = llmResponse;
              }

              if (parsed.type === 'error') {
                setCurrentText(`Error: ${parsed.message}`);
                finalResponse = { text: `Error: ${parsed.message}`, renderType: 'none', saveAsArtifact: false, sources: [] };
                setCompleteResponse(finalResponse);
              }
            } catch {}
          }
        }

        if (done) {
          if (buffer.trim()) {
            try {
              const parsed = JSON.parse(buffer);
              if (parsed.type === 'response') {
                const llmResponse: LLMResponse = parseLLMResponsePayload(parsed.content);
                setCurrentText(llmResponse.text);
                setCompleteResponse(llmResponse);
                finalResponse = llmResponse;
              }
            } catch {}
          }
          break;
        }
      }

      return { response: finalResponse, steps: finalSteps };
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsStreaming(false);
    setCurrentText('');
    setThinkingSteps([]);
    setCompleteResponse(null);
  }, []);

  return { isStreaming, currentText, thinkingSteps, completeResponse, startStream, reset };
}

async function readStreamError(response: Response, fallback: string) {
  try {
    const text = await response.text();
    if (!text.trim()) return fallback;

    try {
      const payload = JSON.parse(text);
      return typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : text;
    } catch {
      return text;
    }
  } catch {
    return fallback;
  }
}

function upsertSteps(steps: ReActStep[], incoming: ReActStep): ReActStep[] {
  const index = steps.findIndex((step) => step.id === incoming.id);
  if (index === -1) {
    return [...steps, incoming];
  }

  return steps.map((step, currentIndex) => (
    currentIndex === index
      ? { ...step, ...incoming }
      : step
  ));
}
