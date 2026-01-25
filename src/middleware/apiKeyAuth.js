import { config } from '../config/index.js';

/**
 * API Key Authentication Middleware
 * Uses the latest approach with constant-time comparison to prevent timing attacks
 */
export const apiKeyAuth = (req, res, next) => {
  // Support both x-api-key and authorization headers (latest approach)
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key is required. Provide it in x-api-key header or Authorization header as Bearer token.',
    });
  }

  // Use constant-time comparison to prevent timing attacks
  const isValidKey = config.apiKeys.some((validKey) => {
    return constantTimeCompare(apiKey, validKey);
  });

  if (!isValidKey) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid API key.',
    });
  }

  next();
};

/**
 * Constant-time string comparison to prevent timing attacks
 * This is the latest security best practice for API key validation
 */
function constantTimeCompare(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
