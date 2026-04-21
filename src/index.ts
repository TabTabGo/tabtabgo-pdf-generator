import express, { Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/index.js';
import { apiKeyAuth } from './middleware/apiKeyAuth.js';
import generatorRoutes from './routes/generator.js';
import openApiSpec from './openapi.js';
import { createOfficeFileStore } from './services/officeFileStore.js';

const app = express();
const officeFileStore = createOfficeFileStore();

// Middleware
app.use(express.json({ limit: '10mb' })); // Support larger HTML content
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (no auth required)
app.get('/v1/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'tabtabgo-pdf-generator',
    timestamp: new Date().toISOString(),
  });
});

app.get('/v1/internal/office-files/:id/:token', (req: Request<{ id: string; token: string }>, res: Response) => {
  const fileEntry = officeFileStore.get(req.params.id, req.params.token);

  if (!fileEntry) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Office conversion input file not found or expired',
    });
    return;
  }

  res.setHeader('Content-Type', fileEntry.contentType);
  res.setHeader('Content-Length', fileEntry.buffer.length);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Disposition', `inline; filename="${fileEntry.fileName}"`);
  res.send(fileEntry.buffer);
});

// API documentation (Swagger UI) – no auth required
app.use('/', swaggerUi.serve);
app.get('/', swaggerUi.setup(openApiSpec, { customSiteTitle: 'TabTabGo PDF Generator API' }));

// Apply API key authentication to protected routes
app.use('/v1/documents', apiKeyAuth, generatorRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong',
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`TabTabGo PDF Generator Service running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`API Keys configured: ${config.apiKeys.length > 0 ? 'Yes' : 'No'}`);
  
  if (config.apiKeys.length === 0) {
    console.warn('\n⚠️  WARNING: No API keys configured! Set API_KEYS environment variable.\n');
  }
});

export default app;
