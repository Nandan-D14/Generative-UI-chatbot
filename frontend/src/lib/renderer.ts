export function buildIframeHTML(code: string, renderType: 'html' | 'react'): string {
  if (renderType === 'html') return code;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"><\/script>
  <style>body{margin:0;padding:16px;background:transparent;}</style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${code}
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
  <\/script>
</body>
</html>`;
}

export function renderToIframe(iframe: HTMLIFrameElement, code: string, renderType: 'html' | 'react') {
  iframe.srcdoc = buildIframeHTML(code, renderType);
}
