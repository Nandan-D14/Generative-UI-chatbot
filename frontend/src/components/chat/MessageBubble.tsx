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

  if (isUser) {
    return (
      <div className="flex w-full justify-end mb-6">
        <div className="max-w-[-webkit-fill-available] sm:max-w-[70%] rounded-3xl rounded-tr-lg bg-[#f4f4f4] px-5 py-3.5 text-neutral-900">
          <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{text}</div>
          <div className="mt-2 text-right text-[11px] text-neutral-400">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mb-8 pt-2">
      <article className="w-full max-w-full">
        {thinkingSteps && thinkingSteps.length > 0 && (
          <div className="mb-4">
            <ThinkingSteps steps={thinkingSteps} />
          </div>
        )}

        {text.trim() ? (
          <MarkdownContent content={text} inverse={false} />
        ) : (
          <div className="flex items-center gap-3 text-sm text-neutral-400">
            <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-neutral-400" />
            Working on it...
          </div>
        )}

        {visualPayload ? (
          <div className="mt-8 mb-4">
            <VisualPanel
              code={visualPayload.code}
              renderType={visualPayload.renderType}
              componentName={visualPayload.componentName}
              onSaveArtifact={onSaveArtifact}
            />
          </div>
        ) : null}

        <div className="mt-4 text-[11px] text-neutral-400">
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </article>
    </div>
  );
}
