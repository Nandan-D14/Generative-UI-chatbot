import Papa from 'papaparse';

export const SUPPORTED_KB_EXTENSIONS = ['.pdf', '.csv', '.txt', '.md'] as const;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_PAGES = 40;
export const MAX_EXTRACTED_CHARS = 200000;
export const MAX_CHUNKS = 400;
export const CHUNK_SIZE = 512;
export const CHUNK_OVERLAP = 50;
export const EMBEDDING_BATCH_SIZE = 50;

export type SupportedDocumentKind = 'pdf' | 'csv' | 'text' | 'markdown';

export type ExtractedDocument = {
  content: string;
  kind: SupportedDocumentKind;
  pageCount?: number;
};

type PdfTextItem = {
  str?: string;
  hasEOL?: boolean;
  transform?: number[];
};

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
type PdfJsWorkerModule = typeof import('pdfjs-dist/legacy/build/pdf.worker.mjs');

type PdfJsGlobal = typeof globalThis & {
  DOMMatrix?: typeof MinimalDOMMatrix;
  pdfjsWorker?: PdfJsWorkerModule;
};

let pdfJsPromise: Promise<PdfJsModule> | null = null;

const textMimeTypes = new Set([
  'text/plain',
  'text/markdown',
  'text/x-markdown'
]);

const csvMimeTypes = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel'
]);

const pdfMimeTypes = new Set([
  'application/pdf'
]);

export class DocumentProcessingError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 422
  ) {
    super(message);
    this.name = 'DocumentProcessingError';
  }
}

export function detectDocumentKind(fileName: string, mimeType: string): SupportedDocumentKind | null {
  const normalizedName = fileName.trim().toLowerCase();
  const normalizedMime = mimeType.trim().toLowerCase();

  if (normalizedName.endsWith('.pdf') || pdfMimeTypes.has(normalizedMime)) {
    return 'pdf';
  }

  if (normalizedName.endsWith('.csv') || csvMimeTypes.has(normalizedMime)) {
    return 'csv';
  }

  if (normalizedName.endsWith('.md') || normalizedMime === 'text/markdown' || normalizedMime === 'text/x-markdown') {
    return 'markdown';
  }

  if (normalizedName.endsWith('.txt') || textMimeTypes.has(normalizedMime) || normalizedMime.startsWith('text/')) {
    return 'text';
  }

  return null;
}

export async function extractDocumentContent(file: Pick<File, 'name' | 'type' | 'arrayBuffer' | 'text'>): Promise<ExtractedDocument> {
  const kind = detectDocumentKind(file.name, file.type);

  if (!kind) {
    throw new DocumentProcessingError(
      `Unsupported file type. Supported formats: ${SUPPORTED_KB_EXTENSIONS.join(', ')}`,
      400
    );
  }

  switch (kind) {
    case 'pdf': {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const pdf = await extractPdfText(buffer);
      return { content: pdf.content, kind, pageCount: pdf.pageCount };
    }
    case 'csv': {
      const csvText = await file.text();
      return { content: parseCsvToText(csvText), kind };
    }
    default: {
      const text = await file.text();
      return { content: normalizeDocumentText(text), kind };
    }
  }
}

export function normalizeDocumentText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parseCsvToText(csvText: string): string {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader(header) {
      return header.trim();
    }
  });

  if (result.errors.length > 0) {
    const firstError = result.errors[0];
    throw new DocumentProcessingError(`CSV parsing failed: ${firstError.message}`);
  }

  const fields = (result.meta.fields ?? []).map((field) => field.trim()).filter(Boolean);

  if (!fields.length) {
    throw new DocumentProcessingError('CSV parsing failed: no header row found.');
  }

  const rows = result.data
    .map((row, index) => formatCsvRow(row, fields, index))
    .filter((row): row is string => Boolean(row));

  if (!rows.length) {
    throw new DocumentProcessingError('CSV file did not contain any data rows.');
  }

  return rows.join('\n\n');
}

export function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  if (!text.trim()) return [];
  if (chunkSize <= 0) throw new Error('chunkSize must be greater than 0.');
  if (overlap < 0 || overlap >= chunkSize) {
    throw new Error('overlap must be between 0 and chunkSize - 1.');
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(text.length, start + chunkSize);
    const chunk = text.slice(start, end);

    if (chunk.trim()) {
      chunks.push(chunk);
    }

    if (end >= text.length) {
      break;
    }

    start += chunkSize - overlap;
  }

  return chunks;
}

export function buildVectorIds(docId: string, chunkCount: number): string[] {
  return Array.from({ length: Math.max(0, chunkCount) }, (_, index) => `${docId}-${index}`);
}

export function enforceInlineProcessingLimits(doc: ExtractedDocument, chunkCount: number) {
  if (doc.pageCount && doc.pageCount > MAX_PDF_PAGES) {
    throw new DocumentProcessingError(`PDF exceeds the ${MAX_PDF_PAGES}-page inline limit.`);
  }

  if (!doc.content.trim()) {
    throw new DocumentProcessingError('Document did not contain any extractable text.');
  }

  if (doc.content.length > MAX_EXTRACTED_CHARS) {
    throw new DocumentProcessingError(`Document exceeds the ${MAX_EXTRACTED_CHARS}-character inline limit.`);
  }

  if (chunkCount > MAX_CHUNKS) {
    throw new DocumentProcessingError(`Document exceeds the ${MAX_CHUNKS}-chunk inline limit.`);
  }
}

export async function extractPdfText(data: Uint8Array): Promise<{ content: string; pageCount: number }> {
  const { getDocument } = await loadPdfJs();
  const loadingTask = getDocument({
    data,
    isEvalSupported: false,
    stopAtErrors: true,
    useSystemFonts: false,
    useWorkerFetch: false
  });

  const pdf = await loadingTask.promise;

  try {
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new DocumentProcessingError(`PDF exceeds the ${MAX_PDF_PAGES}-page inline limit.`);
    }

    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent({
        includeMarkedContent: false,
        disableNormalization: false
      });
      const pageText = normalizeDocumentText(formatPdfTextItems(textContent.items as PdfTextItem[]));

      if (pageText) {
        pages.push(`[Page ${pageNumber}]\n${pageText}`);
      }
    }

    return {
      content: pages.join('\n\n'),
      pageCount: pdf.numPages
    };
  } finally {
    await pdf.destroy();
  }
}

function formatCsvRow(row: Record<string, string>, fields: string[], index: number): string | null {
  const lines = [`Row ${index + 1}`];
  let hasMeaningfulValue = false;

  for (const field of fields) {
    const rawValue = row[field];
    const value = normalizeInlineValue(rawValue);

    if (value) {
      hasMeaningfulValue = true;
    }

    lines.push(`${field}: ${value || '(empty)'}`);
  }

  return hasMeaningfulValue ? lines.join('\n') : null;
}

function formatPdfTextItems(items: PdfTextItem[]): string {
  let text = '';
  let lastY: number | null = null;

  for (const item of items) {
    if (typeof item.str !== 'string' || !item.str) {
      continue;
    }

    const currentY = typeof item.transform?.[5] === 'number' ? item.transform[5] : null;

    if (text && lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5) {
      text += '\n';
    }

    text += item.str;

    if (item.hasEOL) {
      text += '\n';
    }

    lastY = currentY;
  }

  return text;
}

function normalizeInlineValue(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfJsPromise) {
    pdfJsPromise = (async () => {
      ensurePdfJsGlobals();
      const worker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
      (globalThis as PdfJsGlobal).pdfjsWorker = worker;
      return import('pdfjs-dist/legacy/build/pdf.mjs');
    })();
  }

  return pdfJsPromise;
}

function ensurePdfJsGlobals() {
  const target = globalThis as PdfJsGlobal;

  if (!target.DOMMatrix) {
    target.DOMMatrix = MinimalDOMMatrix;
  }
}

class MinimalDOMMatrix {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;

  constructor(init?: number[]) {
    if (Array.isArray(init) && init.length >= 6) {
      [this.a, this.b, this.c, this.d, this.e, this.f] = init;
    }
  }

  multiplySelf() {
    return this;
  }

  preMultiplySelf() {
    return this;
  }

  translate() {
    return this;
  }

  scale() {
    return this;
  }

  invertSelf() {
    return this;
  }
}
