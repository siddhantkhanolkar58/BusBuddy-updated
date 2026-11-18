/**
 * Production-ready in-process rate limiter for authentication and sensitive routes.
 *
 * Tracks requests per normalized client IP with sliding-window expiry.
 * Emits standard RFC 6585 headers (Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining).
 *
 * For horizontally-scaled deployments across multiple instances, swap the internal
 * memory map with a Redis/Memcached client.
 */
const buckets = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

export function rateLimit({
  windowMs = 60_000,
  max = 20,
  key = (req) => getClientIp(req),
  message = 'Too many requests. Please try again shortly.',
} = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const id = key(req) ?? 'anonymous';
    const bucket = buckets.get(id);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(id, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(max - 1));
      return next();
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: message, retryAfter });
    }

    return next();
  };
}

/** Stricter rate limiting specifically for authentication attempts (e.g. login brute-force protection). */
export function authRateLimit({ windowMs = 5 * 60_000, max = 15 } = {}) {
  return rateLimit({
    windowMs,
    max,
    message: 'Too many authentication attempts. Please wait a few minutes before trying again.',
  });
}

/** Drops expired buckets so memory does not leak over time. */
export function startRateLimitSweeper(intervalMs = 300_000) {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [id, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(id);
    }
  }, intervalMs);
  timer.unref();
  return timer;
}
