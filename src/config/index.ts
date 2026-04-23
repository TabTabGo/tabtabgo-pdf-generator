import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  apiKeys: string[];
  nodeEnv: string;
  puppeteerExecutablePath?: string;
  onlyOfficeDocumentServerUrl: string;
  officeDocumentFetchBaseUrl: string;
  onlyOfficeJwtSecret?: string;
  onlyOfficeRequestTimeoutMs: number;
}

const port = parseInt(process.env.PORT || '3000', 10);

export const config: Config = {
  port,
  apiKeys: process.env.API_KEYS ? process.env.API_KEYS.split(',').map(key => key.trim()) : [],
  nodeEnv: process.env.NODE_ENV || 'development',
  puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  onlyOfficeDocumentServerUrl: process.env.ONLYOFFICE_DOCUMENT_SERVER_URL || 'http://127.0.0.1',
  officeDocumentFetchBaseUrl: process.env.OFFICE_DOCUMENT_FETCH_BASE_URL || `http://127.0.0.1:${port}`,
  onlyOfficeJwtSecret: process.env.ONLYOFFICE_JWT_SECRET || process.env.JWT_SECRET || undefined,
  onlyOfficeRequestTimeoutMs: parseInt(process.env.ONLYOFFICE_REQUEST_TIMEOUT_MS || '120000', 10),
};

if (config.apiKeys.length === 0) {
  console.warn('WARNING: No API keys configured. Set API_KEYS environment variable.');
}
