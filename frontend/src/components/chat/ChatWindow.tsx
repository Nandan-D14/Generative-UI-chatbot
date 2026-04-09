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
  onSaveArtifact?: (messageId: string) => void;
};

export function ChatWindow({ messages, onSaveArtifact }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-6 bg-neutral-50">
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
