import { reactAgent } from './agent';
import type { ChatMessage, Env } from '../types';

export async function streamReActResponse(
  userMessage: string,
  chatHistory: ChatMessage[],
  userId: string,
  env: Env
): Promise<ReadableStream> {
  return new ReadableStream({
    async start(controller) {
      try {
        const result = await reactAgent(userMessage, chatHistory, userId, env);

        console.log('=== LLM RAW FINAL RESPONSE ===');
        console.log(result.finalResponse);
        console.log('=============================');

        for (const step of result.steps) {
          controller.enqueue(new TextEncoder().encode(
            JSON.stringify({ type: 'thought', step }) + '\n'
          ));
        }

        controller.enqueue(new TextEncoder().encode(
          JSON.stringify({ type: 'response', content: result.finalResponse }) + '\n'
        ));

        controller.close();
      } catch (error) {
        console.error('Error in streamReActResponse:', error);
        controller.enqueue(new TextEncoder().encode(
          JSON.stringify({ type: 'error', message: (error as Error).message }) + '\n'
        ));
        controller.close();
      }
    }
  });
}
