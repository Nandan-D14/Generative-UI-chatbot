import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { chunkText, extractPdfText, parseCsvToText } from './kb';

describe('chunkText', () => {
  it('uses exact character windows with overlap', () => {
    expect(chunkText('abcdefghijklmnopqr', 8, 2)).toEqual([
      'abcdefgh',
      'ghijklmn',
      'mnopqr'
    ]);
  });
});

describe('parseCsvToText', () => {
  it('preserves headers and handles quoted commas', () => {
    const csv = [
      'name,notes,status',
      '"Ada","builds, tests",active',
      '"Lin","keeps ""quotes"" tidy",review'
    ].join('\n');

    const parsed = parseCsvToText(csv);

    expect(parsed).toContain('Row 1');
    expect(parsed).toContain('name: Ada');
    expect(parsed).toContain('notes: builds, tests');
    expect(parsed).toContain('notes: keeps "quotes" tidy');
  });
});

describe('extractPdfText', () => {
  it('extracts text from a fixture PDF', async () => {
    const pdfPath = join(process.cwd(), 'src', 'lib', '__fixtures__', 'sample.pdf');
    const pdfBytes = new Uint8Array(readFileSync(pdfPath));

    const result = await extractPdfText(pdfBytes);

    expect(result.pageCount).toBe(1);
    expect(result.content).toContain('Hello PDF fixture');
  });
});
