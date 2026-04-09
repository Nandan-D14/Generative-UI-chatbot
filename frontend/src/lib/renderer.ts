const sharedDocumentHead = `
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: transparent;
      overflow: hidden;
    }

    body {
      min-height: 0;
    }
  </style>
`;

export function buildIframeHTML(code: string, renderType: 'html' | 'react'): string {
  if (renderType === 'html') {
    return wrapHTMLDocument(code);
  }

  return `<!DOCTYPE html>
<html>
<head>
  ${sharedDocumentHead}
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"><\/script>
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

function wrapHTMLDocument(code: string): string {
  if (/<html[\s>]/i.test(code)) {
    let wrapped = code;

    if (/<head[^>]*>/i.test(wrapped)) {
      wrapped = wrapped.replace(/<head([^>]*)>/i, `<head$1>${sharedDocumentHead}`);
    } else {
      wrapped = wrapped.replace(/<html([^>]*)>/i, `<html$1><head>${sharedDocumentHead}</head>`);
    }

    wrapped = wrapped.replace(
      /<body([^>]*)>/i,
      (_match, attrs: string) => `<body${attrs} style="margin:0;padding:0;background:transparent;overflow:hidden;">`
    );

    return wrapped;
  }

  return `<!DOCTYPE html>
<html>
<head>
  ${sharedDocumentHead}
</head>
<body>
  ${code}
</body>
</html>`;
}

export function renderToIframe(iframe: HTMLIFrameElement, code: string, renderType: 'html' | 'react') {
  iframe.srcdoc = buildIframeHTML(code, renderType);
}
