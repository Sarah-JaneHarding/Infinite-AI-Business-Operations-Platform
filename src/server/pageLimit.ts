import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * A limit on page requests, by address. The app shell is a file read for every request, so it has its own allowance and page loads and API
 * calls from one address do not use each other's. This uses express-rate-limit, not the limiter in security.ts, because CodeQL recognises it
 * as a rate limiter (alerts 9 and 18); `requestLimits` still limits the API. A request over the limit gets 429 with `Retry-After`.
 */
export function pageLimiter(perMinute: number): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit: perMinute,
    standardHeaders: 'draft-7', // RateLimit headers, and Retry-After on a refusal
    legacyHeaders: false,
    message: { error: 'too many requests: slow down' },
  });
}
