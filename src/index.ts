import express, { Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/index.js';
import { apiKeyAuth } from './middleware/apiKeyAuth.js';
import generatorRoutes from './routes/generator.js';
import openApiSpec from './openapi.js';

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' })); // Support larger HTML content
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (no auth required)
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'tabtabgo-pdf-generator',
    timestamp: new Date().toISOString(),
  });
});

// API documentation (Swagger UI) – no auth required
app.use('/', swaggerUi.serve);
app.get('/', swaggerUi.setup(openApiSpec, { customSiteTitle: 'TabTabGo PDF Generator API' }));

// Apply API key authentication to protected routes
app.use('/documents', apiKeyAuth, generatorRoutes);

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
