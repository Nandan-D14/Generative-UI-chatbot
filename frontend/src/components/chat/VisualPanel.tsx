import { useEffect, useRef } from 'react';
import { renderToIframe } from '../../lib/renderer';

type Props = {
  code: string;
  renderType: 'html' | 'react';
  componentName?: string;
  onSaveArtifact?: () => void;
};

export function VisualPanel({ code, renderType, componentName, onSaveArtifact }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const frameIdRef = useRef(`visual-${crypto.randomUUID()}`);
  const latestSizeRef = useRef({ width: 0, height: 120 });

  useEffect(() => {
    if (iframeRef.current) {
      renderToIframe(iframeRef.current, code, renderType, frameIdRef.current);
    }
  }, [code, renderType]);

  useEffect(() => {
    const iframe = iframeRef.current;
    const wrapper = wrapperRef.current;
    if (!iframe || !wrapper) return;

    const applySize = (width: number, height: number) => {
      latestSizeRef.current = { width, height };

      const availableWidth = wrapper.clientWidth || width || 0;
      const desiredWidth = Math.max(Math.min(width || availableWidth, availableWidth), Math.min(availableWidth, 320));

      iframe.style.width = desiredWidth >= availableWidth - 4 ? '100%' : `${desiredWidth}px`;
      iframe.style.maxWidth = '100%';
      iframe.style.height = `${Math.max(height, 120)}px`;
    };

    const handleMessage = (event: MessageEvent) => {
      const payload = event.data;
      if (
        !payload ||
        payload.source !== 'visualmind-iframe-size' ||
        payload.frameId !== frameIdRef.current
      ) {
        return;
      }

      applySize(Number(payload.width) || wrapper.clientWidth || 0, Number(payload.height) || 120);
    };

    const resizeObserver = new ResizeObserver(() => {
      applySize(latestSizeRef.current.width, latestSizeRef.current.height);
    });

    window.addEventListener('message', handleMessage);
    resizeObserver.observe(wrapper);
    applySize(latestSizeRef.current.width, latestSizeRef.current.height);

    return () => {
      window.removeEventListener('message', handleMessage);
      resizeObserver.disconnect();
    };
  }, [code, renderType]);

  return (
    <div ref={wrapperRef} className="group relative mt-6">
      {onSaveArtifact ? (
        <button
          onClick={onSaveArtifact}
          className="absolute right-2 top-2 z-10 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-[11px] font-medium text-neutral-600 shadow-sm opacity-0 backdrop-blur transition-opacity hover:text-neutral-900 group-hover:opacity-100"
        >
          Save artifact
        </button>
      ) : null}
      {componentName ? (
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
          {componentName}
        </div>
      ) : null}
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts allow-same-origin"
        scrolling="no"
        className="block border-0 bg-transparent"
        style={{ width: '100%', maxWidth: '100%', minHeight: '120px', height: '120px', overflow: 'hidden' }}
      />
    </div>
  );
}
