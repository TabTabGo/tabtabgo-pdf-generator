import mammoth from 'mammoth';

export type WordContentType = 'docx' | 'word-xml';

export interface WordConversionResult {
  html: string;
  warnings: string[];
}

/**
 * Word Document Converter Service
 * Converts Microsoft Word documents (DOCX and Word XML) to HTML
 * using the mammoth library.
 */
export class WordConverterService {
  /**
   * Convert a Word document to HTML
   * @param content - For 'docx': base64-encoded binary content; for 'word-xml': raw XML string
   * @param contentType - The type of Word document ('docx' or 'word-xml')
   * @returns HTML string and any conversion warnings
   */
  async convertToHtml(content: string, contentType: WordContentType): Promise<WordConversionResult> {
    if (contentType === 'docx') {
      // DOCX is a binary ZIP format; content must be base64-encoded
      const buffer = Buffer.from(content, 'base64');
      const result = await mammoth.convertToHtml({ buffer });

      const warnings = result.messages
        .filter((m) => m.type === 'warning')
        .map((m) => m.message);

      return {
        html: result.value,
        warnings,
      };
    }

    // word-xml is XML text, not a ZIP package. Converting through the DOCX
    // parser causes zip-related failures, so we extract paragraph text directly.
    return this.convertWordXmlToHtml(content);
  }

  private convertWordXmlToHtml(content: string): WordConversionResult {
    const paragraphs = Array.from(content.matchAll(/<w:p\b[\s\S]*?<\/w:p>/gi));
    const warnings: string[] = [];

    if (paragraphs.length === 0) {
      warnings.push('No Word XML paragraphs found; falling back to plain text extraction.');
      const fallbackText = this.decodeXmlEntities(content.replace(/<[^>]+>/g, ' ')).trim();
      return {
        html: `<html><body><p>${this.escapeHtml(fallbackText || 'No readable content found')}</p></body></html>`,
        warnings,
      };
    }

    const htmlParagraphs = paragraphs
      .map((paragraphMatch) => {
        const paragraph = paragraphMatch[0];
        const withBreaks = paragraph.replace(/<w:br\s*\/?\s*>/gi, '\n');
        const textParts = Array.from(withBreaks.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi))
          .map((textMatch) => this.decodeXmlEntities(textMatch[1]));

        return `<p>${this.escapeHtml(textParts.join(''))}</p>`;
      })
      .filter((paragraph) => paragraph !== '<p></p>');

    if (htmlParagraphs.length === 0) {
      warnings.push('No text runs found in Word XML; generated output may be empty.');
    }

    return {
      html: `<html><body>${htmlParagraphs.join('')}</body></html>`,
      warnings,
    };
  }

  private decodeXmlEntities(value: string): string {
    return value
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(parseInt(decimal, 10)))
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

export const createWordConverterService = (): WordConverterService => {
  return new WordConverterService();
};
