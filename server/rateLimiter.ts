/**
 * In-Memory Token Bucket Rate Limiter
 * Guards API endpoints against abuse with configurable window and request thresholds.
 */

interface RateBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, RateBucket>();
const MAX_TOKENS = 120; // 120 requests per minute
const REFILL_RATE = 120 / 60000; // tokens per ms

export function checkRateLimit(clientId: string = "anonymous"): { allowed: boolean; remaining: number } {
  const now = Date.now();
  let bucket = buckets.get(clientId);

  if (!bucket) {
    bucket = { tokens: MAX_TOKENS, lastRefill: now };
    buckets.set(clientId, bucket);
  } else {
    const elapsed = now - bucket.lastRefill;
    bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + elapsed * REFILL_RATE);
    bucket.lastRefill = now;
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, remaining: Math.floor(bucket.tokens) };
  }

  return { allowed: false, remaining: 0 };
}
