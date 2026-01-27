import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

/**
 * API Key Authentication Middleware
 * Uses the latest approach with constant-time comparison to prevent timing attacks
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction): void => {
  // Support both x-api-key and authorization headers (latest approach)
  const apiKey = req.headers['x-api-key'] as string | undefined || req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'API key is required. Provide it in x-api-key header or Authorization header as Bearer token.',
    });
    return;
  }

  // Use constant-time comparison to prevent timing attacks
  const isValidKey = config.apiKeys.some((validKey) => {
    return constantTimeCompare(apiKey, validKey);
  });

  if (!isValidKey) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid API key.',
    });
    return;
  }

  next();
};

/**
 * Constant-time string comparison to prevent timing attacks
 * Uses Node.js's built-in crypto.timingSafeEqual which is designed for this purpose
 */
function constantTimeCompare(a: string, b: string): boolean {
  // timingSafeEqual requires buffers of the same length
  if (a.length !== b.length) {
    return false;
  }

  try {
    const bufferA = Buffer.from(a, 'utf8');
    const bufferB = Buffer.from(b, 'utf8');
    return crypto.timingSafeEqual(bufferA, bufferB);
  } catch (error) {
    return false;
  }
}
