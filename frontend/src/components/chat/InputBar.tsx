import { useEffect, useRef, useState, KeyboardEvent } from 'react';

type Props = {
  onSend: (message: string) => void;
  isLoading: boolean;
};

export function InputBar({ onSend, isLoading }: Props) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = '0px';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-stone-200/80 bg-white/72 px-6 py-5 backdrop-blur-xl">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,242,235,0.88))] p-3 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask for an answer, a layout, or an interactive visual..."
          className="min-h-[72px] w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-7 text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
          rows={1}
          disabled={isLoading}
        />
        <div className="mt-2 flex items-center justify-between gap-4 border-t border-stone-200/80 px-2 pt-3">
          <p className="text-xs font-medium text-neutral-400">
            Enter to send. Shift + Enter for a new line.
          </p>
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="inline-flex min-w-[112px] items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_50%,#1e40af_100%)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-transform duration-150 hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Thinking...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
