import { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import type { LLMResponse } from '../../../../shared/types';

type ReActStep = {
  thought: string;
  action: string;
  actionInput: string;
  observation: string;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  visualData?: LLMResponse;
  thinkingSteps?: ReActStep[];
  timestamp: Date;
};

type Props = {
  messages: Message[];
  errorMessage?: string | null;
  onSaveArtifact?: (messageId: string) => void;
};

export function ChatWindow({ messages, errorMessage, onSaveArtifact }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-6 bg-neutral-50">
      {errorMessage ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}
      {!messages.length && !errorMessage ? (
        <div className="flex h-full items-center justify-center text-center">
          <div className="max-w-md">
            <h2 className="text-xl font-semibold text-neutral-800">Start a chat</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Ask a question, generate a UI, or query your knowledge base.
            </p>
          </div>
        </div>
      ) : null}
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          role={msg.role}
          text={msg.text}
          visualData={msg.visualData}
          thinkingSteps={msg.thinkingSteps}
          onSaveArtifact={() => onSaveArtifact?.(msg.id)}
          timestamp={msg.timestamp}
        />
      ))}
    </div>
  );
}
