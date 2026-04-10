import { useState } from 'react';
import type { ReActStep } from '../../../../shared/types';

type Props = {
  steps: ReActStep[];
};

const actionIcons: Record<string, string> = {
  rag_search: '📚',
  web_search: '🌐',
  registry_lookup: '🧩',
  generate_component: '🎨',
};

export function ThinkingSteps({ steps }: Props) {
  const [isAllExpanded, setIsAllExpanded] = useState(false);

  if (!steps.length) return null;

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-transparent dark:border-neutral-800 bg-transparent transition-all">
      <div 
        className="flex lg:w-fit cursor-pointer items-center justify-between px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-lg transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
        onClick={() => setIsAllExpanded(!isAllExpanded)}
      >
        <div className="flex items-center gap-2 text-neutral-400 dark:text-neutral-500">
          <svg className="w-3.5 h-3.5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-[11px] font-medium uppercase tracking-widest">
            Thought Process ({steps.length})
          </span>
        </div>
        <div className="ml-3 text-neutral-400 dark:text-neutral-500">
          {isAllExpanded ? (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          )}
        </div>
      </div>
      
      {isAllExpanded && (
        <div className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-800 border-l border-neutral-200 dark:border-neutral-700 ml-3 pl-2">
          {steps.map((step) => (
            <StepItem key={step.id} step={step} />
          ))}
        </div>
      )}
    </div>
  );
}

function StepItem({ step }: { step: ReActStep }) {
  const [expanded, setExpanded] = useState(true);
  const isRunning = step.status === 'running';

  return (
    <div className="py-3 pl-3">
      <div 
        className="flex cursor-pointer items-start gap-3 group"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">{actionIcons[step.action] || '🔧'}</span>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 capitalize leading-none">{step.action.replace(/_/g, ' ')}</p>
            <span className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest ${
              isRunning
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 animate-pulse'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
            }`}>
              {isRunning ? 'Running' : 'Done'}
            </span>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{step.thought}</p>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 ml-[28px] space-y-3">
          {step.actionInput && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Input</div>
              <div className="whitespace-pre-wrap break-words rounded-lg border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 px-3 py-2 font-mono text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                {step.actionInput}
              </div>
            </div>
          )}
          {step.observation && (
             <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Output</div>
              <div className="whitespace-pre-wrap break-words rounded-lg border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 px-3 py-2 font-mono text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400 max-h-48 overflow-y-auto">
                {step.observation.trim()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
