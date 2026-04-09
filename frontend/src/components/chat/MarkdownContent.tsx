import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

type Props = {
  content: string;
  inverse?: boolean;
};

export function MarkdownContent({ content, inverse = false }: Props) {
  return (
    <div
      className={`prose max-w-none transition-colors duration-200 ease-in-out ${
        inverse 
          ? 'prose-invert prose-p:text-blue-50 prose-headings:text-white prose-a:text-blue-200 prose-strong:text-blue-100 prose-code:text-blue-100 prose-ul:text-blue-50 prose-ol:text-blue-50' 
          : 'prose-neutral prose-p:text-neutral-700 prose-headings:text-neutral-900 prose-a:text-neutral-900 prose-strong:text-neutral-900'
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            return !inline && match ? (
              <div className="relative mt-4 mb-4 overflow-hidden rounded-xl bg-[#282c34] shadow-sm ring-1 ring-white/10">
                <div className="flex items-center justify-between px-4 py-2 bg-[#21252b] border-b border-white/5">
                  <span className="text-xs font-medium text-neutral-400 capitalize">{language}</span>
                </div>
                <SyntaxHighlighter
                  {...props}
                  style={oneDark}
                  language={language}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                    background: 'transparent',
                    fontSize: '0.85rem',
                  }}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code {...props} className={`${className} bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-md text-[0.85em] font-mono text-neutral-800 dark:text-neutral-200`}>
                {children}
              </code>
            );
          },
          table({ children, ...props }) {
            return (
              <div className="overflow-hidden rounded-xl border border-neutral-200 shadow-sm mt-4 mb-4">
                <table className="min-w-full divide-y divide-neutral-200" {...props}>
                  {children}
                </table>
              </div>
            );
          },
          th({ children, ...props }) {
            return (
              <th className="bg-neutral-50 px-4 py-3 text-left text-sm font-semibold text-neutral-900" {...props}>
                {children}
              </th>
            );
          },
          td({ children, ...props }) {
            return (
              <td className="px-4 py-3 text-sm text-neutral-700 border-t border-neutral-200" {...props}>
                {children}
              </td>
            );
          },
          a({ href, children, ...props }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4 decoration-neutral-300 hover:decoration-neutral-900 transition-colors" {...props}>
                {children}
              </a>
            );
          },
          p({ children, ...props }) {
            return <p className="leading-relaxed mb-4 last:mb-0" {...props}>{children}</p>;
          },
          h1({ children, ...props }) {
            return <h1 className="text-2xl font-bold mt-8 mb-4 tracking-tight" {...props}>{children}</h1>;
          },
          h2({ children, ...props }) {
            return <h2 className="text-xl font-bold mt-8 mb-4 tracking-tight" {...props}>{children}</h2>;
          },
          h3({ children, ...props }) {
            return <h3 className="text-lg font-semibold mt-6 mb-3 tracking-tight" {...props}>{children}</h3>;
          },
          ul({ children, ...props }) {
            return <ul className="list-disc pl-6 mb-4 space-y-2 marker:text-neutral-400" {...props}>{children}</ul>;
          },
          ol({ children, ...props }) {
            return <ol className="list-decimal pl-6 mb-4 space-y-2 marker:text-neutral-500 font-medium" {...props}>{children}</ol>;
          },
          li({ children, ...props }) {
            return <li className="pl-1" {...props}><span className="font-normal">{children}</span></li>;
          },
          blockquote({ children, ...props }) {
            return (
              <blockquote className="border-l-4 border-neutral-300 pl-4 py-1 italic text-neutral-600 bg-neutral-50/50 rounded-r-lg my-4" {...props}>
                {children}
              </blockquote>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
