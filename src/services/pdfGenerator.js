import { config } from '../config/index.js';

/**
 * PDF Generator Service using dependency injection pattern
 * This allows for better testing and control over the Puppeteer library
 */
export class PdfGeneratorService {
  constructor(puppeteerInstance = null) {
    // Dependency injection for Puppeteer library
    this.puppeteer = puppeteerInstance;
  }

  /**
   * Initialize Puppeteer if not already injected
   */
  async initializePuppeteer() {
    if (!this.puppeteer) {
      const puppeteer = await import('puppeteer');
      this.puppeteer = puppeteer.default;
    }
  }

  /**
   * Generate PDF from HTML content
   * @param {string} content - HTML content as string
   * @param {Object} options - Puppeteer PDF options
   * @returns {Promise<Buffer>} - PDF buffer
   */
  async generatePdf(content, options = {}) {
    await this.initializePuppeteer();

    let browser = null;

    try {
      // Launch browser with custom executable path if configured
      const launchOptions = {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      };

      if (config.puppeteerExecutablePath) {
        launchOptions.executablePath = config.puppeteerExecutablePath;
      }

      browser = await this.puppeteer.launch(launchOptions);
      const page = await browser.newPage();

      // Set content and wait for any network requests to complete
      await page.setContent(content, {
        waitUntil: 'networkidle0',
      });

      // Default PDF options with user overrides
      const pdfOptions = {
        format: 'A4',
        printBackground: true,
        ...options,
      };

      // Generate PDF buffer
      const pdfBuffer = await page.pdf(pdfOptions);

      return pdfBuffer;
    } catch (error) {
      throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Validate PDF generation request payload
   * @param {Object} payload - Request payload
   * @returns {Object} - Validation result
   */
  validatePayload(payload) {
    const errors = [];

    if (!payload) {
      return { valid: false, errors: ['Request payload is required'] };
    }

    // contentType validation
    if (!payload.contentType) {
      errors.push('contentType is required');
    } else if (payload.contentType.toLowerCase() !== 'html') {
      errors.push('contentType must be "html"');
    }

    // content validation
    if (!payload.content) {
      errors.push('content is required');
    } else if (typeof payload.content !== 'string') {
      errors.push('content must be a string');
    }

    // options validation (optional)
    if (payload.options && typeof payload.options !== 'object') {
      errors.push('options must be an object');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Create a singleton instance with dependency injection support
export const createPdfGeneratorService = (puppeteerInstance = null) => {
  return new PdfGeneratorService(puppeteerInstance);
};
