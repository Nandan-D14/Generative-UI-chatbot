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
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(244,240,232,0.92)_46%,rgba(236,231,221,0.82)_100%)] px-6 py-8"
    >
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col">
        {errorMessage ? (
          <div className="mb-8 rounded-[24px] border border-red-200/80 bg-red-50/90 px-5 py-4 text-sm text-red-700 shadow-sm">
            {errorMessage}
          </div>
        ) : null}
        {!messages.length && !errorMessage ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-3xl rounded-[32px] border border-white/80 bg-white/78 px-8 py-10 text-center shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#111827_0%,#334155_100%)] text-lg font-semibold text-white shadow-lg">
                VM
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Ask for answers, layouts, or live visuals</h2>
              <p className="mt-3 text-sm leading-7 text-neutral-500">
                VisualMind now renders assistant replies as markdown-first chat content with inline visuals instead of detached widgets.
              </p>
              <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
                <PromptCard title="Research" prompt="Summarize India's population growth since 2000 in markdown with a short table." />
                <PromptCard title="Visualize" prompt="Create a bar chart of India's population from 2000 to 2023 with a short insight section." />
                <PromptCard title="Reuse" prompt="Turn this dataset into a compact executive dashboard with filters and key metrics." />
              </div>
            </div>
          </div>
        ) : null}
        {messages.length ? (
          <div className="space-y-1">
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
        ) : null}
      </div>
    </div>
  );
}

function PromptCard({ title, prompt }: { title: string; prompt: string }) {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,243,235,0.9))] px-4 py-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">{title}</p>
      <p className="mt-3 text-sm leading-6 text-neutral-700">{prompt}</p>
    </div>
  );
}
