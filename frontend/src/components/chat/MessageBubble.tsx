import { VisualPanel } from './VisualPanel';
import { ThinkingSteps } from './ThinkingSteps';
import type { LLMResponse } from '../../../../shared/types';

type ReActStep = {
  thought: string;
  action: string;
  actionInput: string;
  observation: string;
};

type Props = {
  role: 'user' | 'assistant';
  text: string;
  visualData?: LLMResponse;
  thinkingSteps?: ReActStep[];
  onSaveArtifact?: () => void;
  timestamp: Date;
};

export function MessageBubble({ role, text, visualData, thinkingSteps, onSaveArtifact, timestamp }: Props) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`max-w-3xl ${isUser ? 'bg-blue-600 text-white' : 'bg-white text-neutral-900'} rounded-2xl px-5 py-3 shadow-sm`}>
        {!isUser && thinkingSteps && thinkingSteps.length > 0 && (
          <ThinkingSteps steps={thinkingSteps} />
        )}

        <p className="whitespace-pre-wrap leading-relaxed">{text}</p>

        {visualData && visualData.renderType !== 'none' && visualData.code && (
          <VisualPanel
            code={visualData.code}
            renderType={visualData.renderType}
            componentName={visualData.componentName}
            onSaveArtifact={onSaveArtifact}
          />
        )}

        <div className={`mt-2 text-xs ${isUser ? 'text-blue-200' : 'text-neutral-400'}`}>
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
