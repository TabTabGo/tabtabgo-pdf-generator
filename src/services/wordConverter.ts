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
    let buffer: Buffer;

    if (contentType === 'docx') {
      // DOCX is a binary ZIP format; content must be base64-encoded
      buffer = Buffer.from(content, 'base64');
    } else {
      // word-xml is a text-based format (flat OOXML or Word 2003 XML)
      buffer = Buffer.from(content, 'utf8');
    }

    const result = await mammoth.convertToHtml({ buffer });

    const warnings = result.messages
      .filter((m) => m.type === 'warning')
      .map((m) => m.message);

    return {
      html: result.value,
      warnings,
    };
  }
}

export const createWordConverterService = (): WordConverterService => {
  return new WordConverterService();
};
