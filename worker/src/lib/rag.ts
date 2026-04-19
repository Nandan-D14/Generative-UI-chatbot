import { reactAgent } from './agent';
import type { ChatMessage, Env } from '../types';
import type { LLMResponse } from '../../../shared/types';

export async function streamReActResponse(
  userMessage: string,
  chatHistory: ChatMessage[],
  userId: string,
  env: Env,
  options: {
    useWebSearch?: boolean;
    selectedDocumentIds?: string[];
  } = {}
): Promise<ReadableStream> {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(payload) + '\n'));
      };

      try {
        const result = await reactAgent(userMessage, chatHistory, userId, env, {
          onStepStart(step) {
            send({ type: 'thought-start', step });
          },
          onStepComplete(step) {
            send({ type: 'thought-complete', step });
          }
        }, options);

        console.log('=== LLM RAW FINAL RESPONSE ===');
        console.log(result.finalResponse);
        console.log('=============================');

        let finalResponse: LLMResponse;
        try {
          finalResponse = typeof result.finalResponse === 'string' 
            ? JSON.parse(result.finalResponse) 
            : result.finalResponse;
            
          if (!finalResponse || typeof finalResponse !== 'object') {
            throw new Error('Parsed response is not an object');
          }
          if (typeof finalResponse.text !== 'string') {
            finalResponse.text = '';
          }
        } catch (e) {
          console.error('Failed to parse final response:', e);
          finalResponse = {
            text: typeof result.finalResponse === 'string' ? result.finalResponse : '',
            renderType: 'none',
            saveAsArtifact: false,
            sources: []
          };
        }
        
        const textChunks = chunkText(finalResponse.text || '');

        if (textChunks.length) {
          send({ type: 'response-start' });

          for (const chunk of textChunks) {
            send({ type: 'text-delta', content: chunk });
            await delay(8);
          }
        }

        send({ type: 'response', content: JSON.stringify(finalResponse) });

        controller.close();
      } catch (error) {
        console.error('Error in streamReActResponse:', error);
        send({ type: 'error', message: (error as Error).message });
        controller.close();
      }
    }
  });
}

function chunkText(text: string): string[] {
  if (typeof text !== 'string' || !text.trim()) return [];

  const chunks: string[] = [];
  const paragraphs = text.split(/(\n\s*\n)/);

  for (const paragraph of paragraphs) {
    if (!paragraph) continue;
    if (/^\n\s*\n$/.test(paragraph)) {
      chunks.push(paragraph);
      continue;
    }

    const words = paragraph.split(/(\s+)/).filter(Boolean);
    let current = '';

    for (const word of words) {
      if ((current + word).length > 36 && current) {
        chunks.push(current);
        current = word;
      } else {
        current += word;
      }
    }

    if (current) chunks.push(current);
  }

  return chunks;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
