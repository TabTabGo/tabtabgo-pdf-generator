const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'TabTabGo PDF Generator Service',
    version: '1.0.0',
    description:
      'A service for generating PDF documents from HTML, DOCX, or Word XML content using Puppeteer.',
    contact: {
      name: 'TabTabGo',
      url: 'https://github.com/TabTabGo/tabtabgo-pdf-generator',
    },
    license: {
      name: 'ISC',
    },
  },
  servers: [
    {
      url: '/',
      description: 'Current server',
    },
  ],
  tags: [
    {
      name: 'Documents',
      description: 'PDF document generation endpoints',
    },
    {
      name: 'Health',
      description: 'Service health check endpoints',
    },
  ],
  components: {
    securitySchemes: {
      ApiKeyHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'API key passed via the `x-api-key` header',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'API key passed as a Bearer token in the `Authorization` header',
      },
    },
    schemas: {
      PdfGenerationRequest: {
        type: 'object',
        required: ['contentType', 'content'],
        properties: {
          contentType: {
            type: 'string',
            enum: ['html', 'docx', 'word-xml'],
            description: 'The type of input content to convert to PDF.',
            example: 'html',
          },
          content: {
            type: 'string',
            description:
              'The input content. For `html` provide an HTML string; for `docx` provide a base64-encoded DOCX binary; for `word-xml` provide a Flat OPC / Word XML string.',
            example: '<html><body><h1>Hello World</h1></body></html>',
          },
          options: {
            type: 'object',
            description: 'Puppeteer PDF generation options (all fields optional).',
            properties: {
              format: {
                type: 'string',
                enum: ['Letter', 'Legal', 'Tabloid', 'Ledger', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'],
                description: 'Paper format.',
                example: 'A4',
              },
              landscape: {
                type: 'boolean',
                description: 'Paper orientation.',
                example: false,
              },
              printBackground: {
                type: 'boolean',
                description: 'Print background graphics.',
                example: true,
              },
              scale: {
                type: 'number',
                description: 'Scale of the webpage rendering (0.1–2).',
                example: 1,
              },
              margin: {
                type: 'object',
                description: 'Page margins.',
                properties: {
                  top: { type: 'string', example: '1cm' },
                  right: { type: 'string', example: '1cm' },
                  bottom: { type: 'string', example: '1cm' },
                  left: { type: 'string', example: '1cm' },
                },
              },
              width: {
                type: 'string',
                description: 'Paper width (overrides `format`).',
                example: '210mm',
              },
              height: {
                type: 'string',
                description: 'Paper height (overrides `format`).',
                example: '297mm',
              },
            },
          },
        },
        example: {
          contentType: 'html',
          content: '<html><body><h1>Hello World</h1></body></html>',
          options: {
            format: 'A4',
            printBackground: true,
            margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Invalid request' },
          message: { type: 'string', example: 'Request validation failed' },
          details: {
            oneOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } },
            ],
          },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          service: { type: 'string', example: 'tabtabgo-pdf-generator' },
          timestamp: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns the current health status and timestamp of the service.',
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/documents/pdf': {
      post: {
        tags: ['Documents'],
        summary: 'Generate PDF',
        description:
          'Converts HTML, DOCX, or Word XML content into a PDF document and returns the binary PDF stream.',
        operationId: 'generatePdf',
        security: [{ ApiKeyHeader: [] }, { BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PdfGenerationRequest' },
              examples: {
                html: {
                  summary: 'Generate PDF from HTML',
                  value: {
                    contentType: 'html',
                    content: '<html><body><h1>Hello World</h1></body></html>',
                    options: {
                      format: 'A4',
                      printBackground: true,
                      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
                    },
                  },
                },
                docx: {
                  summary: 'Generate PDF from DOCX (base64)',
                  value: {
                    contentType: 'docx',
                    content: '<base64-encoded-docx-file-content>',
                    options: { format: 'A4', printBackground: true },
                  },
                },
                wordXml: {
                  summary: 'Generate PDF from Word XML',
                  value: {
                    contentType: 'word-xml',
                    content: '<flat-ooxml-or-word-xml-string>',
                    options: { format: 'A4', printBackground: true },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'PDF generated successfully',
            content: {
              'application/pdf': {
                schema: {
                  type: 'string',
                  format: 'binary',
                },
              },
            },
            headers: {
              'Content-Disposition': {
                schema: { type: 'string', example: 'inline; filename="generated.pdf"' },
              },
            },
          },
          '400': {
            description: 'Bad request – validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized – missing API key',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '403': {
            description: 'Forbidden – invalid API key',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
  },
};

export default openApiSpec;
