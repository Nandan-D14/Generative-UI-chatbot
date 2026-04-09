import { VisualPanel } from './VisualPanel';
import { ThinkingSteps } from './ThinkingSteps';
import { MarkdownContent } from './MarkdownContent';
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
  const visualPayload =
    visualData && visualData.renderType !== 'none' && visualData.code
      ? {
          code: visualData.code,
          renderType: visualData.renderType as 'html' | 'react',
          componentName: visualData.componentName
        }
      : null;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-8`}>
      <article
        className={`w-full max-w-4xl rounded-[28px] px-6 py-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] transition-shadow ${
          isUser
            ? 'max-w-2xl bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_55%,#1e40af_100%)] text-white'
            : 'border border-white/70 bg-white/88 text-neutral-900 backdrop-blur'
        }`}
      >
        <div className={`mb-4 flex items-center justify-between gap-3 ${isUser ? 'text-blue-100' : 'text-neutral-500'}`}>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em]">
            <span className={`inline-flex h-2.5 w-2.5 rounded-full ${isUser ? 'bg-blue-200' : 'bg-emerald-500'}`} />
            {isUser ? 'You' : 'VisualMind'}
          </div>
          <div className="text-xs">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {!isUser && thinkingSteps && thinkingSteps.length > 0 && (
          <ThinkingSteps steps={thinkingSteps} />
        )}

        <MarkdownContent content={text} inverse={isUser} />

        {visualPayload ? (
          <VisualPanel
            code={visualPayload.code}
            renderType={visualPayload.renderType}
            componentName={visualPayload.componentName}
            onSaveArtifact={onSaveArtifact}
          />
        ) : null}
      </article>
    </div>
  );
}
