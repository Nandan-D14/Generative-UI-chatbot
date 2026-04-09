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

        <MarkdownContent content={text} inverse={false} />

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
      </article>
    </div>
  );
}
