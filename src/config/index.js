import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  apiKeys: process.env.API_KEYS ? process.env.API_KEYS.split(',').map(key => key.trim()) : [],
  nodeEnv: process.env.NODE_ENV || 'development',
  puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
};

// Validate configuration
if (config.apiKeys.length === 0) {
  console.warn('WARNING: No API keys configured. Set API_KEYS environment variable.');
}
