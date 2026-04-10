import { useState } from 'react';
import { VisualPanel } from './VisualPanel';
import { ThinkingSteps } from './ThinkingSteps';
import { MarkdownContent } from './MarkdownContent';
import type { LLMResponse, ReActStep } from '../../../../shared/types';

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
        {thinkingSteps && thinkingSteps.length > 0 ? (
          <div className={visualPayload || text.trim() ? 'mb-6' : 'mb-4'}>
            <ThinkingSteps steps={thinkingSteps} />
          </div>
        ) : null}

        {visualPayload ? (
          <div className="mb-6">
            <VisualPanel
              code={visualPayload.code}
              renderType={visualPayload.renderType}
              componentName={visualPayload.componentName}
              onSaveArtifact={onSaveArtifact}
            />
          </div>
        ) : null}

        {text.trim() ? (
          <MarkdownContent content={text} inverse={false} />
        ) : (
          <div className="flex items-center gap-3 text-sm text-neutral-400">
            <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-neutral-400" />
            Working on it...
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <MessageActions steps={thinkingSteps} text={text} />
          <div className="text-[11px] text-neutral-400">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </article>
    </div>
  );
}

function MessageActions({ steps, text }: { steps?: ReActStep[]; text: string }) {
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const urls: string[] = [];
  if (steps) {
    steps.forEach((step) => {
      if (step.action === 'web_search' && step.observation) {
        const urlRegex = /URL:\s*(https?:\/\/[^\s]+)/g;
        let match;
        while ((match = urlRegex.exec(step.observation)) !== null) {
          urls.push(match[1]);
        }
      }
    });
  }
  const uniqueUrls = Array.from(new Set(urls));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-neutral-400">
        <button
          onClick={handleCopy}
          className="p-1.5 hover:bg-neutral-100 rounded-md transition-colors text-neutral-500 hover:text-neutral-700"
          title="Copy"
        >
          {copied ? (
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          )}
        </button>
        <button className="p-1.5 hover:bg-neutral-100 rounded-md transition-colors text-neutral-500 hover:text-neutral-700" title="Good response">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.514" /></svg>
        </button>
        <button className="p-1.5 hover:bg-neutral-100 rounded-md transition-colors text-neutral-500 hover:text-neutral-700" title="Bad response">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.514" /></svg>
        </button>
        <button className="p-1.5 hover:bg-neutral-100 rounded-md transition-colors text-neutral-500 hover:text-neutral-700" title="Reload">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
        
        {uniqueUrls.length > 0 && (
          <div className="relative ml-2">
            <button 
              onClick={() => setShowSources(!showSources)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-medium transition-all ${showSources ? 'bg-neutral-100 border-neutral-200 text-neutral-800' : 'bg-neutral-50/50 border-neutral-200/60 text-neutral-600 hover:bg-neutral-100'}`}
            >
              <div className="flex -space-x-1.5">
                 {uniqueUrls.slice(0, 3).map((url, i) => {
                   let domain = '';
                   try {
                     domain = new URL(url).hostname;
                   } catch { /* ignore */ }
                   return (
                     <div key={i} className="w-4 h-4 rounded-full bg-white border border-neutral-200 flex items-center justify-center overflow-hidden shrink-0">
                       {domain ? (
                         <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`} alt={domain} className="w-3 h-3 object-contain" />
                       ) : (
                         <div className="w-2 h-2 bg-neutral-300 rounded-full" />
                       )}
                     </div>
                   );
                 })}
              </div>
              Sources
            </button>

            {showSources && (
              <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-white rounded-xl shadow-lg border border-neutral-200/60 z-10 animate-in fade-in slide-in-from-bottom-2">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2 px-2 pt-1">
                  Sources ({uniqueUrls.length})
                </div>
                <div className="flex flex-col max-h-48 overflow-y-auto">
                  {uniqueUrls.map((url, i) => {
                    let domain = url;
                    try {
                      domain = new URL(url).hostname.replace(/^www\./, '');
                    } catch { /* ignore */ }
                    return (
                      <a 
                        key={i} 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 px-2 py-2 hover:bg-neutral-50 rounded-lg transition-colors truncate"
                      >
                        <div className="w-5 h-5 rounded-full bg-neutral-100 border border-neutral-200/60 flex items-center justify-center overflow-hidden shrink-0">
                           {domain ? (
                             <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`} alt="" className="w-3 h-3 text-neutral-400" />
                           ) : (
                             <svg className="w-2.5 h-2.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                           )}
                        </div>
                        <span className="text-xs text-neutral-600 truncate hover:text-blue-600">{domain}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
