import { useEffect, useRef, useState, KeyboardEvent } from 'react';

type Props = {
  onSend: (message: string, options: { useWebSearch: boolean }) => void;
  isLoading: boolean;
};

export function InputBar({ onSend, isLoading }: Props) {
  const [input, setInput] = useState('');
  const [useWebSearch, setUseWebSearch] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = '0px';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim(), { useWebSearch });
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 px-4 sm:px-6 pb-6 pt-2 transition-colors duration-300">
      <div className="mx-auto max-w-3xl relative">
        <div className="relative rounded-[26px] bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 shadow-sm focus-within:border-neutral-300 dark:focus-within:border-neutral-600 focus-within:bg-white dark:focus-within:bg-neutral-800 focus-within:shadow-md transition-all duration-200 flex flex-row items-end px-2 py-2">
          <div className="flex-1 max-w-full">
            <div className="px-4 pt-2">
              <button
                type="button"
                onClick={() => setUseWebSearch((value) => !value)}
                disabled={isLoading}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                  useWebSearch
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-300'
                } disabled:opacity-40`}
              >
                <span className={`inline-flex h-2 w-2 rounded-full ${useWebSearch ? 'bg-blue-500' : 'bg-neutral-300 dark:bg-neutral-600'}`} />
                Web Search
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message VisualMind..."
              className="min-h-[44px] max-h-[40vh] w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-relaxed text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-500 focus:outline-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              rows={1}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="flex-shrink-0 mb-1 mr-1 h-9 w-9 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center transition-all hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Send message"
          >
            {isLoading ? (
              <div className="flex space-x-[2px]">
                <div className="h-1 w-1 rounded-full bg-white animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-1 w-1 rounded-full bg-white animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-1 w-1 rounded-full bg-white animate-bounce"></div>
              </div>
            ) : (
              <svg className="w-4 h-4 translate-x-[1px] translate-y-[-1px] transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            )}
          </button>
        </div>
        <div className="mt-2 text-center">
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
            VisualMind can make mistakes. Consider verifying important information.
          </p>
        </div>
      </div>
    </div>
  );
}
