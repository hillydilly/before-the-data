// rate-limit.js — simple in-memory rate limiter
const requests = new Map();

export function rateLimit(ip, maxAttempts = 5, windowMs = 60000) {
  const now = Date.now();
  const key = ip || 'unknown';
  
  if (!requests.has(key)) {
    requests.set(key, []);
  }
  
  const timestamps = requests.get(key).filter(t => now - t < windowMs);
  
  if (timestamps.length >= maxAttempts) {
    return { limited: true, retryAfter: Math.ceil((timestamps[0] + windowMs - now) / 1000) };
  }
  
  timestamps.push(now);
  requests.set(key, timestamps);
  
  if (requests.size > 10000) {
    for (const [k, v] of requests) {
      if (v.every(t => now - t > windowMs)) requests.delete(k);
    }
  }
  
  return { limited: false };
}
