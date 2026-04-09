import { renderMarkdownToHtml } from '../../lib/markdown';

type Props = {
  content: string;
  inverse?: boolean;
};

export function MarkdownContent({ content, inverse = false }: Props) {
  return (
    <div
      className={`vm-markdown ${inverse ? 'vm-markdown--inverse' : ''}`}
      dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(content) }}
    />
  );
}
