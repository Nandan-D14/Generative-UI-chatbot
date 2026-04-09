import { useEffect, useRef } from 'react';
import { renderToIframe } from '../../lib/renderer';

type Props = {
  code: string;
  renderType: 'html' | 'react';
  componentName?: string;
  onSaveArtifact?: () => void;
};

export function VisualPanel({ code, renderType, componentName, onSaveArtifact }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) renderToIframe(iframeRef.current, code, renderType);
  }, [code, renderType]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let cancelled = false;
    let intervalId: number | null = null;
    let timeoutIds: number[] = [];

    const measure = () => {
      if (cancelled) return;

      try {
        const doc = iframe.contentDocument;
        const body = doc?.body;
        const html = doc?.documentElement;
        if (!doc || !body || !html) return;

        const height = Math.max(
          body.scrollHeight,
          body.offsetHeight,
          html.scrollHeight,
          html.offsetHeight
        );

        iframe.style.height = `${Math.max(height, 120)}px`;
      } catch {
        // Ignore transient cross-document timing issues while the iframe boots.
      }
    };

    const startWatching = () => {
      measure();
      timeoutIds = [50, 150, 300, 600, 1000, 1600].map((delay) =>
        window.setTimeout(measure, delay)
      );
      intervalId = window.setInterval(measure, 1200);
    };

    const handleLoad = () => {
      if (cancelled) return;
      startWatching();
    };

    iframe.addEventListener('load', handleLoad);
    measure();

    return () => {
      cancelled = true;
      iframe.removeEventListener('load', handleLoad);
      timeoutIds.forEach((id) => window.clearTimeout(id));
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [code, renderType]);

  return (
    <div className="group relative mt-6">
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
        className="block w-full border-0 bg-transparent"
        style={{ minHeight: '120px', height: '120px', overflow: 'hidden' }}
      />
    </div>
  );
}
