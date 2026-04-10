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

    const timerIds: number[] = [];
    let acceptedMessageCount = 0;
    const MAX_IFRAME_HEIGHT = 1800;
    const MAX_MESSAGE_UPDATES = 16;

    const applySize = (width: number, height: number) => {
      const safeWidth = Math.max(Math.round(width || 0), 0);
      const boundedHeight = Math.min(Math.max(Math.round(height || 0), 120), MAX_IFRAME_HEIGHT);
      latestSizeRef.current = { width: safeWidth, height: boundedHeight };

      const availableWidth = wrapper.clientWidth || width || 0;
      const desiredWidth = Math.max(Math.min(width || availableWidth, availableWidth), Math.min(availableWidth, 320));

      iframe.style.width = desiredWidth >= availableWidth - 4 ? '100%' : `${desiredWidth}px`;
      iframe.style.maxWidth = '100%';
      iframe.style.height = `${boundedHeight}px`;
    };

    const measureFromIframeDocument = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return false;

        const body = doc.body;
        const html = doc.documentElement;
        if (!body || !html) return false;

        const measuredWidth = Math.max(body.scrollWidth, body.offsetWidth, html.scrollWidth, html.offsetWidth, wrapper.clientWidth || 0);
        const measuredHeight = Math.max(body.scrollHeight, body.offsetHeight, html.scrollHeight, html.offsetHeight);

        if (!Number.isFinite(measuredHeight) || measuredHeight <= 0) {
          return false;
        }

        applySize(measuredWidth, measuredHeight);
        return true;
      } catch {
        return false;
      }
    };

    const scheduleFallbackMeasurements = (reset: boolean) => {
      if (reset) {
        acceptedMessageCount = 0;
      }

      [0, 120, 360, 900, 1800].forEach((delay) => {
        const timerId = window.setTimeout(() => {
          const measured = measureFromIframeDocument();
          if (!measured && delay >= 900) {
            applySize(wrapper.clientWidth || latestSizeRef.current.width || 0, renderType === 'html' ? 680 : 420);
          }
        }, delay);

        timerIds.push(timerId);
      });
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

      if (acceptedMessageCount >= MAX_MESSAGE_UPDATES) {
        return;
      }

      acceptedMessageCount += 1;

      applySize(Number(payload.width) || wrapper.clientWidth || 0, Number(payload.height) || 120);
    };

    const handleLoad = () => {
      scheduleFallbackMeasurements(true);
    };

    const resizeObserver = new ResizeObserver(() => {
      applySize(latestSizeRef.current.width, latestSizeRef.current.height);
    });

    window.addEventListener('message', handleMessage);
    iframe.addEventListener('load', handleLoad);
    resizeObserver.observe(wrapper);
    applySize(latestSizeRef.current.width, latestSizeRef.current.height);
    scheduleFallbackMeasurements(true);

    return () => {
      window.removeEventListener('message', handleMessage);
      iframe.removeEventListener('load', handleLoad);
      resizeObserver.disconnect();
      timerIds.forEach((timerId) => window.clearTimeout(timerId));
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
        scrolling="auto"
        className="block border-0 bg-transparent"
        style={{ width: '100%', maxWidth: '100%', minHeight: '120px', height: '120px', overflow: 'auto' }}
      />
    </div>
  );
}
