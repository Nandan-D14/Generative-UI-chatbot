import { useEffect, useRef, useState } from 'react';
import { renderToIframe } from '../../lib/renderer';

type Props = {
  code: string;
  renderType: 'html' | 'react';
  componentName?: string;
  onSaveArtifact?: () => void;
};

export function VisualPanel({ code, renderType, componentName, onSaveArtifact }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (iframeRef.current) renderToIframe(iframeRef.current, code, renderType);
  }, [code, renderType]);

  return (
    <div className="mt-3 rounded-xl border border-neutral-200 overflow-hidden bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-100 bg-neutral-50">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 font-medium uppercase tracking-wide">
            {componentName || (renderType === 'react' ? 'Interactive' : 'Visual')}
          </span>
          <button onClick={() => setIsExpanded(!isExpanded)} className="text-neutral-400 hover:text-neutral-600">
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
        <button onClick={onSaveArtifact} className="text-xs text-neutral-500 hover:text-neutral-900 px-2 py-1 rounded hover:bg-neutral-100">
          Save artifact
        </button>
      </div>
      {isExpanded && (
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts"
          className="w-full border-0"
          style={{ minHeight: '300px', height: 'auto' }}
          onLoad={(e) => {
            const el = e.currentTarget;
            try { el.style.height = el.contentDocument?.body.scrollHeight + 'px'; } catch {}
          }}
        />
      )}
    </div>
  );
}
