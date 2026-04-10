import { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import type { LLMResponse, ReActStep } from '../../../../shared/types';

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
      className="flex-1 overflow-y-auto bg-white px-4 sm:px-6 py-6 md:py-10 scroll-smooth"
    >
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
        {errorMessage ? (
          <div className="mb-8 rounded-2xl border border-red-200/80 bg-red-50/90 px-5 py-4 text-sm text-red-700 shadow-sm flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errorMessage}
          </div>
        ) : null}
        {!messages.length && !errorMessage ? (
          <div className="flex flex-1 items-center justify-center my-auto px-4">
            <div className="w-full max-w-[640px] flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900/5 ring-1 ring-neutral-900/10 transition-all duration-300 hover:ring-neutral-900/20">
                <svg className="w-6 h-6 text-neutral-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-800 mb-8">What can I help with?</h2>
              <div className="w-full grid gap-3 sm:grid-cols-2">
                <PromptCard title="Research & Summarize" prompt="Summarize India's population growth since 2000 into a markdown table." icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                <PromptCard title="Data Visualization" prompt="Create a bar chart of product sales over the last 4 quarters." icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </div>
            </div>
          </div>
        ) : null}
        {messages.length ? (
          <div className="flex flex-col pb-20">
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

function PromptCard({ title, prompt, icon }: { title: string; prompt: string, icon: string }) {
  return (
    <div className="group rounded-2xl border border-neutral-100 bg-white/50 p-4 cursor-pointer hover:bg-neutral-50/80 hover:border-neutral-200 transition-all duration-200 flex flex-col gap-2 text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-neutral-900/5 flex items-center justify-center text-neutral-500 group-hover:text-neutral-700 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
          </div>
          <p className="text-sm font-medium text-neutral-700">{title}</p>
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-neutral-400 group-hover:text-neutral-500 transition-colors">{prompt}</p>
    </div>
  );
}
