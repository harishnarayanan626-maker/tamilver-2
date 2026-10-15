/**
 * Scholarly Citation Formatter for Tamil Literary, Epigraphic and Lexicographic Sources.
 * Generates APA (7th ed.), MLA (9th ed.), and Chicago (17th ed.) citations.
 */

export interface SourceCitationData {
  title: string;
  titleTa: string;
  author?: string | null;
  periodName: string;
  century?: string | null;
  type: string;
  referenceUrl?: string | null;
  verseNo?: string | null;
  lineRef?: string | null;
}

export function formatCitations(source: SourceCitationData) {
  const author = source.author ? source.author.trim() : "Unknown Author";
  const century = source.century ? source.century.trim() : "c. Classical Era";
  const title = source.title.trim();
  const titleTa = source.titleTa ? ` (${source.titleTa})` : "";
  const verseRef = source.verseNo ? `v. ${source.verseNo}` : source.lineRef ? `lines ${source.lineRef}` : "";
  const refSnippet = verseRef ? `, ${verseRef}` : "";

  // 1. APA 7th Edition
  // Author, A. A. (Century). Title in italics [Title in Tamil]. Ref.
  const apa = `${author}. (${century}). *${title}*${titleTa}${refSnippet}. Tamil Literary Corpus.`;

  // 2. MLA 9th Edition
  // Author. Title in Italics. Century. Tamil Literary Heritage Collection, Ref.
  const mla = `${author}. *${title}*${titleTa}. ${century}${refSnippet}.`;

  // 3. Chicago 17th Edition (Notes & Bibliography)
  const chicago = `${author}, *${title}*${titleTa} (${century})${refSnippet}.`;

  return {
    apa,
    mla,
    chicago,
  };
}
