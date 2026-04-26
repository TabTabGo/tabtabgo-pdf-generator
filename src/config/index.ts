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
  /** IP addresses allowed to reach the internal office-files endpoint. */
  internalAllowedIps: string[];
}

/**
 * Parse a required positive integer from an env-var string.
 * Throws at startup with an actionable message rather than propagating NaN.
 */
function parsePositiveInt(value: string | undefined, name: string, defaultValue: number): number {
  const raw = value ?? String(defaultValue);
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(
      `Configuration error: ${name} must be a positive integer, got: ${JSON.stringify(value)}`,
    );
  }
  return n;
}

const port = parsePositiveInt(process.env.PORT, 'PORT', 3000);
const onlyOfficeRequestTimeoutMs = parsePositiveInt(
  process.env.ONLYOFFICE_REQUEST_TIMEOUT_MS,
  'ONLYOFFICE_REQUEST_TIMEOUT_MS',
  120000,
);

const onlyOfficeJwtSecret =
  process.env.ONLYOFFICE_JWT_SECRET || process.env.JWT_SECRET || undefined;

export const config: Config = {
  port,
  apiKeys: process.env.API_KEYS ? process.env.API_KEYS.split(',').map(key => key.trim()) : [],
  nodeEnv: process.env.NODE_ENV || 'development',
  puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  onlyOfficeDocumentServerUrl: process.env.ONLYOFFICE_DOCUMENT_SERVER_URL || 'http://127.0.0.1',
  officeDocumentFetchBaseUrl: process.env.OFFICE_DOCUMENT_FETCH_BASE_URL || `http://127.0.0.1:${port}`,
  onlyOfficeJwtSecret,
  onlyOfficeRequestTimeoutMs,
  internalAllowedIps: process.env.INTERNAL_ALLOWED_IPS
    ? process.env.INTERNAL_ALLOWED_IPS.split(',').map(ip => ip.trim()).filter(Boolean)
    : ['127.0.0.1', '::1', '::ffff:127.0.0.1'],
};

if (config.apiKeys.length === 0) {
  console.warn('WARNING: No API keys configured. Set API_KEYS environment variable.');
}

if (config.nodeEnv === 'production' && !config.onlyOfficeJwtSecret) {
  console.error(
    'ERROR: ONLYOFFICE_JWT_SECRET is not set in production. ' +
    'If OnlyOffice JWT enforcement is enabled, all conversions will fail silently. ' +
    'Set ONLYOFFICE_JWT_SECRET or disable JWT enforcement in the OnlyOffice configuration.',
  );
}
