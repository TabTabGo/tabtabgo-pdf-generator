import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  apiKeys: string[];
  nodeEnv: string;
  puppeteerExecutablePath?: string;
  officeConversionEngine: 'libreoffice' | 'onlyoffice';
  libreofficePath?: string;
  onlyOfficeDocumentServerUrl?: string;
  officeDocumentFetchBaseUrl?: string;
  onlyOfficeJwtSecret?: string;
  onlyOfficeRequestTimeoutMs: number;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  apiKeys: process.env.API_KEYS ? process.env.API_KEYS.split(',').map(key => key.trim()) : [],
  nodeEnv: process.env.NODE_ENV || 'development',
  puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  officeConversionEngine: process.env.OFFICE_CONVERSION_ENGINE === 'onlyoffice' ? 'onlyoffice' : 'libreoffice',
  libreofficePath: process.env.LIBREOFFICE_PATH || undefined,
  onlyOfficeDocumentServerUrl: process.env.ONLYOFFICE_DOCUMENT_SERVER_URL || undefined,
  officeDocumentFetchBaseUrl: process.env.OFFICE_DOCUMENT_FETCH_BASE_URL || undefined,
  onlyOfficeJwtSecret: process.env.ONLYOFFICE_JWT_SECRET || undefined,
  onlyOfficeRequestTimeoutMs: parseInt(process.env.ONLYOFFICE_REQUEST_TIMEOUT_MS || '120000', 10),
};

// Validate configuration
if (config.apiKeys.length === 0) {
  console.warn('WARNING: No API keys configured. Set API_KEYS environment variable.');
}

if (config.officeConversionEngine === 'onlyoffice') {
  if (!config.onlyOfficeDocumentServerUrl) {
    throw new Error('ONLYOFFICE_DOCUMENT_SERVER_URL is required when OFFICE_CONVERSION_ENGINE=onlyoffice.');
  }

  if (!config.officeDocumentFetchBaseUrl) {
    throw new Error('OFFICE_DOCUMENT_FETCH_BASE_URL is required when OFFICE_CONVERSION_ENGINE=onlyoffice.');
  }
}
