function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderMarkdownToHtml(markdown: string): string {
  const normalized = markdown.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return '';

  const lines = normalized.split('\n');
  const blocks: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index++;
      continue;
    }

    const codeFence = line.match(/^```([\w-]+)?\s*$/);
    if (codeFence) {
      const language = codeFence[1] || '';
      index++;
      const codeLines: string[] = [];

      while (index < lines.length && !/^```/.test(lines[index])) {
        codeLines.push(lines[index]);
        index++;
      }

      if (index < lines.length) index++;

      blocks.push(
        `<pre><code${language ? ` data-language="${escapeHtml(language)}"` : ''}>${escapeHtml(codeLines.join('\n'))}</code></pre>`
      );
      continue;
    }

    if (/^#{1,6}\s+/.test(line)) {
      const [, hashes, text] = line.match(/^(#{1,6})\s+(.*)$/) as RegExpMatchArray;
      const level = hashes.length;
      blocks.push(`<h${level}>${renderInlineMarkdown(text)}</h${level}>`);
      index++;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      blocks.push('<hr />');
      index++;
      continue;
    }

    if (isTableStart(lines, index)) {
      const header = splitTableRow(lines[index]);
      const alignments = splitTableRow(lines[index + 1]).map(parseAlignment);
      index += 2;
      const rows: string[][] = [];

      while (index < lines.length && isTableRow(lines[index])) {
        rows.push(splitTableRow(lines[index]));
        index++;
      }

      blocks.push(renderTable(header, alignments, rows));
      continue;
    }

    if (isListLine(line)) {
      const { html, nextIndex } = renderList(lines, index);
      blocks.push(html);
      index = nextIndex;
      continue;
    }

    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ''));
        index++;
      }

      blocks.push(`<blockquote>${renderMarkdownToHtml(quoteLines.join('\n'))}</blockquote>`);
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !startsSpecialBlock(lines, index)
    ) {
      paragraphLines.push(lines[index].trim());
      index++;
    }

    blocks.push(`<p>${renderInlineMarkdown(paragraphLines.join('\n')).replace(/\n/g, '<br />')}</p>`);
  }

  return blocks.join('\n');
}

function startsSpecialBlock(lines: string[], index: number): boolean {
  const line = lines[index];
  return (
    /^```/.test(line) ||
    /^#{1,6}\s+/.test(line) ||
    /^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim()) ||
    isTableStart(lines, index) ||
    isListLine(line) ||
    line.trim().startsWith('>')
  );
}

function isListLine(line: string): boolean {
  return /^(\d+\.\s+|[-*+]\s+)/.test(line.trim());
}

function renderList(lines: string[], startIndex: number): { html: string; nextIndex: number } {
  const firstLine = lines[startIndex].trim();
  const orderedMatch = firstLine.match(/^(\d+)\.\s+(.*)$/);
  const ordered = Boolean(orderedMatch);
  const start = orderedMatch ? Number(orderedMatch[1]) : 1;
  const items: string[] = [];
  let index = startIndex;

  while (index < lines.length) {
    const current = lines[index].trim();
    const match = ordered
      ? current.match(/^(\d+)\.\s+(.*)$/)
      : current.match(/^[-*+]\s+(.*)$/);

    if (!match) break;

    const itemLines = [match[ordered ? 2 : 1]];
    index++;

    while (
      index < lines.length &&
      lines[index].trim() &&
      !isListLine(lines[index]) &&
      !startsSpecialBlock(lines, index)
    ) {
      itemLines.push(lines[index].trim());
      index++;
    }

    items.push(`<li>${renderInlineMarkdown(itemLines.join('\n')).replace(/\n/g, '<br />')}</li>`);

    if (index < lines.length && !lines[index].trim()) {
      index++;
      break;
    }
  }

  const tag = ordered ? 'ol' : 'ul';
  const startAttr = ordered && start !== 1 ? ` start="${start}"` : '';
  return { html: `<${tag}${startAttr}>${items.join('')}</${tag}>`, nextIndex: index };
}

function isTableStart(lines: string[], index: number): boolean {
  if (index + 1 >= lines.length) return false;
  return isTableRow(lines[index]) && /^\s*\|?[\s:-|]+\|?\s*$/.test(lines[index + 1]);
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.includes('|') && trimmed.replace(/\|/g, '').trim().length > 0;
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function parseAlignment(cell: string): 'left' | 'center' | 'right' {
  const trimmed = cell.trim();
  if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
  if (trimmed.endsWith(':')) return 'right';
  return 'left';
}

function renderTable(header: string[], alignments: Array<'left' | 'center' | 'right'>, rows: string[][]): string {
  const head = header
    .map((cell, index) => `<th style="text-align:${alignments[index] || 'left'}">${renderInlineMarkdown(cell)}</th>`)
    .join('');
  const body = rows
    .map((row) => `<tr>${row.map((cell, index) => `<td style="text-align:${alignments[index] || 'left'}">${renderInlineMarkdown(cell)}</td>`).join('')}</tr>`)
    .join('');

  return `<div class="vm-table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderInlineMarkdown(text: string): string {
  const pattern = /(`[^`]+`)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;
  let cursor = 0;
  let html = '';

  for (const match of text.matchAll(pattern)) {
    const fullMatch = match[0];
    const matchIndex = match.index ?? 0;
    html += renderBasicInline(text.slice(cursor, matchIndex));

    if (match[1]) {
      html += `<code>${escapeHtml(fullMatch.slice(1, -1))}</code>`;
    } else {
      html += `<a href="${escapeHtml(match[4])}" target="_blank" rel="noreferrer">${renderBasicInline(match[3])}</a>`;
    }

    cursor = matchIndex + fullMatch.length;
  }

  html += renderBasicInline(text.slice(cursor));
  return html;
}

function renderBasicInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*]+)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')
    .replace(/(^|[\s(])_([^_]+)_(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>');
}
