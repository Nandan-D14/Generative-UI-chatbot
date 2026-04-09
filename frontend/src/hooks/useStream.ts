import { useState, useCallback } from 'react';
import type { LLMResponse } from '../../../shared/types';

export type ReActStep = {
  thought: string;
  action: string;
  actionInput: string;
  observation: string;
};

export function useStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [thinkingSteps, setThinkingSteps] = useState<ReActStep[]>([]);
  const [completeResponse, setCompleteResponse] = useState<LLMResponse | null>(null);

  const startStream = useCallback(async (
    message: string,
    chatId: string,
    history: Array<{ role: string; content: string }>,
    token: string
  ) => {
    setIsStreaming(true);
    setCurrentText('');
    setThinkingSteps([]);
    setCompleteResponse(null);

    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ chatId, message, history })
    });

    if (!response.ok || !response.body) {
      setIsStreaming(false);
      return null;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResponse: LLMResponse | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);

          if (parsed.type === 'thought') {
            setThinkingSteps(prev => [...prev, parsed.step]);
          }

          if (parsed.type === 'response') {
            try {
              const llmResponse: LLMResponse = JSON.parse(parsed.content);
              setCurrentText(llmResponse.text);
              setCompleteResponse(llmResponse);
              finalResponse = llmResponse;
            } catch {
              const textMatch = parsed.content.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/);
              const text = textMatch ? textMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '';
              setCurrentText(text);
              finalResponse = { text, renderType: 'none' };
              setCompleteResponse(finalResponse);
            }
          }

          if (parsed.type === 'error') {
            setCurrentText(`Error: ${parsed.message}`);
            finalResponse = { text: `Error: ${parsed.message}`, renderType: 'none' };
            setCompleteResponse(finalResponse);
          }
        } catch {}
      }
    }

    setIsStreaming(false);
    return finalResponse;
  }, []);

  const reset = useCallback(() => {
    setIsStreaming(false);
    setCurrentText('');
    setThinkingSteps([]);
    setCompleteResponse(null);
  }, []);

  return { isStreaming, currentText, thinkingSteps, completeResponse, startStream, reset };
}
