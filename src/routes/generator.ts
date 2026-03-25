import express, { Request, Response } from 'express';
import { createPdfGeneratorService } from '../services/pdfGenerator.js';
import { createWordConverterService } from '../services/wordConverter.js';
import type { PDFOptions } from 'puppeteer';
import type { WordContentType } from '../services/wordConverter.js';

const router = express.Router();

// Create service instances with dependency injection
const pdfGeneratorService = createPdfGeneratorService();
const wordConverterService = createWordConverterService();

interface PdfGenerationRequest {
  contentType: string;
  content: string;
  options?: PDFOptions;
}

const wordContentTypes: WordContentType[] = ['docx', 'word-xml'];

/**
 * POST /documents/pdf
 * Generate PDF from HTML, DOCX, or Word XML content
 *
 * Request body:
 * {
 *   contentType: "html" | "docx" | "word-xml",
 *   content: "<html>...</html>" | "<base64-encoded-docx>" | "<word-xml-string>",
 *   options: { format: "A4", ... } // optional
 * }
 */
router.post('/pdf', async (req: Request<object, object, PdfGenerationRequest>, res: Response) => {
  try {
    const { contentType, content, options } = req.body;

    // Validate payload
    const validation = pdfGeneratorService.validatePayload({ contentType, content, options });

    if (!validation.valid) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'Request validation failed',
        details: validation.errors,
      });
      return;
    }

    // Convert Word documents to HTML before generating PDF
    let htmlContent = content;
    const normalizedContentType = contentType.toLowerCase();
    if (wordContentTypes.includes(normalizedContentType as WordContentType)) {
      const conversionResult = await wordConverterService.convertToHtml(
        content,
        normalizedContentType as WordContentType,
      );
      htmlContent = conversionResult.html;
    }

    // Generate PDF
    const pdfBuffer = await pdfGeneratorService.generatePdf(htmlContent, options || {});

    // Set headers for PDF response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="generated.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF as stream
    res.send(pdfBuffer);
  } catch (error) {
    // Log sanitized error details (avoid exposing sensitive information)
    console.error('PDF generation error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate PDF',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
