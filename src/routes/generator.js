import express from 'express';
import { createPdfGeneratorService } from '../services/pdfGenerator.js';

const router = express.Router();

// Create PDF generator service instance with dependency injection
const pdfGeneratorService = createPdfGeneratorService();

/**
 * POST /documents/generator/pdf
 * Generate PDF from HTML content
 * 
 * Request body:
 * {
 *   contentType: "html",
 *   content: "<html>...</html>",
 *   options: { format: "A4", ... } // optional
 * }
 */
router.post('/pdf', async (req, res) => {
  try {
    const { contentType, content, options } = req.body;

    // Validate payload
    const validation = pdfGeneratorService.validatePayload({ contentType, content, options });
    
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Request validation failed',
        details: validation.errors,
      });
    }

    // Generate PDF
    const pdfBuffer = await pdfGeneratorService.generatePdf(content, options || {});

    // Set headers for PDF response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="generated.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF as stream
    res.send(pdfBuffer);
  } catch (error) {
    // Log sanitized error details (avoid exposing sensitive information)
    console.error('PDF generation error:', {
      message: error.message,
      timestamp: new Date().toISOString(),
    });
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate PDF',
      details: error.message,
    });
  }
});

export default router;
