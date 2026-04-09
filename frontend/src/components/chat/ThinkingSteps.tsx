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
    <div className="mb-4 border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50">
      <div className="px-4 py-2 border-b border-neutral-100 bg-white">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
          Thinking · {steps.length} step{steps.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="divide-y divide-neutral-100">
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
      className="px-4 py-2 hover:bg-neutral-100 cursor-pointer transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2">
        <span className="text-xs text-neutral-300 mt-0.5 w-4">{index + 1}</span>
        <span className="text-sm">{actionIcons[step.action] || '🔧'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-neutral-700 truncate">{step.thought}</p>
          <p className="text-xs text-neutral-400 mt-0.5">
            {step.action.replace('_', ' ')}
          </p>
        </div>
      </div>
      {expanded && (
        <div className="mt-2 ml-6 p-2 bg-white rounded border border-neutral-200 text-xs text-neutral-600 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
          {step.observation}
        </div>
      )}
    </div>
  );
}
