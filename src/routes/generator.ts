import express, { Request, Response } from 'express';
import multer from 'multer';
import { createPdfGeneratorService } from '../services/pdfGenerator.js';
import { createOfficeConverterService } from '../services/officeConverter.js';
import { createFlatOpcConverterService } from '../services/flatOpcConverter.js';
import type { PDFOptions } from 'puppeteer';


const router = express.Router();

// Create service instances with dependency injection
const pdfGeneratorService = createPdfGeneratorService();
const officeConverterService = createOfficeConverterService();
const flatOpcConverterService = createFlatOpcConverterService();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

interface PdfGenerationRequest {
  contentType: string;
  content: string;
  options?: PDFOptions;
}

const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;

const decodeBase64Docx = (content: string): Buffer | null => {
  const stripped = content.replace(/\s+/g, '');
  if (!BASE64_RE.test(stripped) || stripped.length % 4 !== 0) {
    return null;
  }
  const buf = Buffer.from(stripped, 'base64');
  // DOCX is a ZIP archive; all valid ZIPs start with the PK magic bytes.
  if (buf.length < 4 || buf[0] !== 0x50 || buf[1] !== 0x4b) {
    return null;
  }
  return buf;
};

const normalizeContentType = (contentType: string): 'html' | 'docx' | 'word-xml' | null => {
  const normalized = contentType.toLowerCase();
  if (normalized === 'xml') {
    return 'word-xml';
  }

  if (normalized === 'html' || normalized === 'docx' || normalized === 'word-xml') {
    return normalized;
  }

  return null;
};

/**
 * Sanitize a filename for use in a Content-Disposition header.
 * Strips path separators, CR/LF, and double-quotes that would break or
 * inject into the header value (RFC 6266 / response-splitting prevention).
 */
const sanitizeFilename = (filename: string): string => {
  const stripped = filename
    .replace(/[/\\]/g, '_')   // path separators
    .replace(/["\r\n]/g, '_') // header-breaking characters
    .trim();
  return stripped.length > 0 ? stripped : 'generated';
};

const sendPdfResponse = (res: Response, pdfBuffer: Buffer, filename: string): void => {
  const safeName = sanitizeFilename(filename);
  const encodedName = encodeURIComponent(`${safeName}.pdf`);

  res.setHeader('Content-Type', 'application/pdf');
  // Force file download and provide UTF-8 safe filename for Swagger/browser clients.
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"; filename*=UTF-8''${encodedName}`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(pdfBuffer);
};

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

    const normalizedContentType = normalizeContentType(contentType);
    if (!normalizedContentType) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'Request validation failed',
        details: ['contentType must be one of: html, docx, word-xml'],
      });
      return;
    }

    let pdfBuffer: Buffer;

    if (normalizedContentType === 'docx') {
      const docxBuffer = decodeBase64Docx(content);
      if (!docxBuffer) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Request validation failed',
          details: ['content must be a valid base64-encoded DOCX (ZIP) file'],
        });
        return;
      }
      pdfBuffer = await officeConverterService.convertToPdf(docxBuffer, 'docx');
    } else if (normalizedContentType === 'word-xml') {
      if (flatOpcConverterService.isFlatOpcXml(content)) {
        const docxBuffer = await flatOpcConverterService.convertToDocx(content);
        pdfBuffer = await officeConverterService.convertToPdf(docxBuffer, 'docx');
      } else {
        const xmlBuffer = Buffer.from(content, 'utf8');
        pdfBuffer = await officeConverterService.convertToPdf(xmlBuffer, 'xml');
      }
    } else {
      pdfBuffer = await pdfGeneratorService.generatePdf(content, options || {});
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="generated.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
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

/**
 * POST /documents/pdf/upload
 * Generate PDF from uploaded HTML, DOCX, XML, or Word XML file.
 *
 * Multipart form-data fields:
 * - file: uploaded file (required)
 * - contentType: html | docx | xml | word-xml (required)
 * - options: JSON string with Puppeteer PDF options (optional)
 */
router.post(
  '/pdf/upload',
  upload.single('file'),
  async (
    req: Request<object, object, { contentType?: string; options?: string }, { contentType?: string; options?: string }>,
    res: Response,
  ) => {
    try {
      const file = req.file;
      const requestedContentType = req.body?.contentType;

      if (!file) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Request validation failed',
          details: ['file is required'],
        });
        return;
      }

      if (!requestedContentType) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Request validation failed',
          details: ['contentType is required'],
        });
        return;
      }

      const normalizedContentType = normalizeContentType(requestedContentType);
      if (!normalizedContentType) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Request validation failed',
          details: ['contentType must be one of: html, docx, xml, word-xml'],
        });
        return;
      }

      let options: PDFOptions = {};
      if (req.body?.options) {
        try {
          const parsedOptions = JSON.parse(req.body.options) as unknown;
          if (typeof parsedOptions !== 'object' || parsedOptions === null || Array.isArray(parsedOptions)) {
            throw new Error('options must be a JSON object');
          }
          options = parsedOptions as PDFOptions;
        } catch {
          res.status(400).json({
            error: 'Invalid request',
            message: 'Request validation failed',
            details: ['options must be a valid JSON object string'],
          });
          return;
        }
      }

      if (normalizedContentType === 'docx') {
        const pdfBuffer = await officeConverterService.convertToPdf(file.buffer, 'docx');
        const fileBaseName = file.originalname.replace(/\.[^.]+$/, '') || 'generated';
        sendPdfResponse(res, pdfBuffer, fileBaseName);
        return;
      }

      if (normalizedContentType === 'word-xml') {
        const xmlContent = file.buffer.toString('utf8');
        let pdfBuffer: Buffer;

        if (flatOpcConverterService.isFlatOpcXml(xmlContent)) {
          const docxBuffer = await flatOpcConverterService.convertToDocx(xmlContent);
          pdfBuffer = await officeConverterService.convertToPdf(docxBuffer, 'docx');
        } else {
          pdfBuffer = await officeConverterService.convertToPdf(file.buffer, 'xml');
        }

        const fileBaseName = file.originalname.replace(/\.[^.]+$/, '') || 'generated';
        sendPdfResponse(res, pdfBuffer, fileBaseName);
        return;
      }

      const htmlContent = file.buffer.toString('utf8');

      const pdfBuffer = await pdfGeneratorService.generatePdf(htmlContent, options);
      const fileBaseName = file.originalname.replace(/\.[^.]+$/, '') || 'generated';
      sendPdfResponse(res, pdfBuffer, fileBaseName);
    } catch (error) {
      console.error('PDF generation from upload error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate PDF from uploaded file',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

export default router;
