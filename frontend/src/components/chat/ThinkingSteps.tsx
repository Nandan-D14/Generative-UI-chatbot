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
  if (!steps.length) return null;

  return (
    <div className="mb-5 overflow-hidden rounded-[24px] border border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,250,240,0.96),rgba(255,247,237,0.82))] shadow-sm">
      <div className="border-b border-amber-200/70 px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700/80">
          Thinking And Tool Use · {steps.length} step{steps.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="divide-y divide-amber-100/80">
        {steps.map((step, i) => (
          <StepItem key={step.id} step={step} index={i} />
        ))}
      </div>
    </div>
  );
}

function StepItem({ step, index }: { step: ReActStep; index: number }) {
  const [expanded, setExpanded] = useState(true);
  const isRunning = step.status === 'running';

  return (
    <div
      className="cursor-pointer px-4 py-3 transition-colors hover:bg-white/60"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-amber-700 shadow-sm">
          {index + 1}
        </span>
        <span className="mt-0.5 text-base">{actionIcons[step.action] || '🔧'}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-neutral-800">{step.action.replace(/_/g, ' ')}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${
              isRunning
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {isRunning ? 'Running' : 'Done'}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-neutral-700">{step.thought}</p>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 ml-8 space-y-3 rounded-2xl border border-amber-100 bg-white/90 p-4 text-sm text-neutral-700">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Tool Input</div>
            <div className="mt-1 whitespace-pre-wrap break-words rounded-xl bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-600">
              {step.actionInput || 'No explicit input'}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Tool Output</div>
            <div className="mt-1 whitespace-pre-wrap break-words rounded-xl bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-600">
              {step.observation?.trim() || 'Waiting for tool output...'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
