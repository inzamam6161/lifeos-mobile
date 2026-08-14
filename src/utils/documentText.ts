export type TextSection = {
  text: string;
  pageNumber?: number | null;
  sourceLocator?: string | null;
};

export type KnowledgeChunkDraft = {
  contentText: string;
  pageNumber: number | null;
  sourceLocator: string | null;
};

const XML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

export function decodeXmlEntities(value: string) {
  return value.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos);/gi, (_match, entity: string) => {
    const lower = entity.toLowerCase();
    if (XML_ENTITIES[lower]) return XML_ENTITIES[lower];
    if (lower.startsWith('#x')) {
      const code = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    }
    if (lower.startsWith('#')) {
      const code = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    }
    return '';
  });
}

export function docxXmlToText(xml: string) {
  const marked = xml
    .replace(/<w:tab\b[^>]*\/>/gi, '\t')
    .replace(/<w:br\b[^>]*\/>/gi, '\n')
    .replace(/<w:cr\b[^>]*\/>/gi, '\n')
    .replace(/<\/w:tc>/gi, '\t')
    .replace(/<\/w:p>/gi, '\n\n');
  return normalizeExtractedText(decodeXmlEntities(marked.replace(/<[^>]+>/g, '')));
}

export function normalizeExtractedText(value: string) {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function splitLongParagraph(paragraph: string, maxChars: number) {
  if (paragraph.length <= maxChars) return [paragraph];
  const pieces: string[] = [];
  let cursor = 0;
  while (cursor < paragraph.length) {
    let end = Math.min(cursor + maxChars, paragraph.length);
    if (end < paragraph.length) {
      const boundary = Math.max(
        paragraph.lastIndexOf('. ', end),
        paragraph.lastIndexOf('? ', end),
        paragraph.lastIndexOf('! ', end),
        paragraph.lastIndexOf(' ', end),
      );
      if (boundary > cursor + Math.floor(maxChars * 0.55)) end = boundary + 1;
    }
    const piece = paragraph.slice(cursor, end).trim();
    if (piece) pieces.push(piece);
    cursor = end;
  }
  return pieces;
}

export function buildKnowledgeChunks(
  sections: TextSection[],
  maxChars = 900,
  maxChunks = 400,
): KnowledgeChunkDraft[] {
  const output: KnowledgeChunkDraft[] = [];
  for (const section of sections) {
    const normalized = normalizeExtractedText(section.text);
    if (!normalized) continue;
    const paragraphs = normalized.split(/\n{2,}/).flatMap(item => splitLongParagraph(item.trim(), maxChars));
    let buffer = '';
    const flush = () => {
      const text = buffer.trim();
      if (!text || output.length >= maxChunks) return;
      output.push({
        contentText: text,
        pageNumber: section.pageNumber ?? null,
        sourceLocator: section.sourceLocator ?? (section.pageNumber ? `Page ${section.pageNumber}` : null),
      });
      buffer = '';
    };
    for (const paragraph of paragraphs) {
      if (!paragraph) continue;
      if (buffer && buffer.length + paragraph.length + 2 > maxChars) flush();
      buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
      if (output.length >= maxChunks) break;
    }
    flush();
    if (output.length >= maxChunks) break;
  }
  return output;
}
