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
          <div className="flex flex-1 items-center justify-center my-auto">
            <div className="w-full max-w-2xl text-center fade-in">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl shadow-neutral-900/10">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl mb-2">How can I help you today?</h2>
              <p className="mt-3 text-base leading-relaxed text-neutral-500 max-w-lg mx-auto">
                VisualMind is your AI assistant. Ask questions, generate UI components, or visualize data interactively and live.
              </p>
              <div className="mt-10 grid gap-4 text-left sm:grid-cols-2">
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
    <div className="group rounded-2xl border border-neutral-200 bg-white p-5 cursor-pointer hover:border-neutral-300 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-600 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
        <p className="text-sm font-semibold text-neutral-800">{title}</p>
      </div>
      <p className="text-sm leading-relaxed text-neutral-500 group-hover:text-neutral-700 transition-colors">{prompt}</p>
    </div>
  );
}
