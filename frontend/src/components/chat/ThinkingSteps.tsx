import { useState } from 'react';

type ReActStep = {
  thought: string;
  action: string;
  actionInput: string;
  observation: string;
};

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
    <div className="mb-5 overflow-hidden rounded-[22px] border border-stone-200/80 bg-[linear-gradient(180deg,rgba(249,247,242,0.95),rgba(244,240,232,0.84))] shadow-sm">
      <div className="border-b border-stone-200/70 px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
          Thinking · {steps.length} step{steps.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="divide-y divide-stone-200/70">
        {steps.map((step, i) => (
          <StepItem key={i} step={step} index={i} />
        ))}
      </div>
    </div>
  );
}

function StepItem({ step, index }: { step: ReActStep; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="cursor-pointer px-4 py-3 transition-colors hover:bg-white/60"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 w-4 text-xs text-stone-300">{index + 1}</span>
        <span className="text-sm">{actionIcons[step.action] || '🔧'}</span>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-neutral-700">{step.thought}</p>
          <p className="mt-0.5 text-xs text-neutral-400">
            {step.action.replace('_', ' ')}
          </p>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 ml-6 max-h-32 overflow-y-auto rounded-2xl border border-stone-200 bg-white/80 p-3 font-mono text-xs whitespace-pre-wrap text-neutral-600">
          {step.observation}
        </div>
      )}
    </div>
  );
}
