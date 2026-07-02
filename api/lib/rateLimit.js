import { kv } from '@vercel/kv';

const LIMITS = {
  generate: { windowSec: 3600, max: 30 },
  autocomplete: { windowSec: 3600, max: 60 },
  auth: { windowSec: 900, max: 10 },
  share: { windowSec: 3600, max: 20 },
};

export async function checkRateLimit(type, identifier) {
  const config = LIMITS[type] || { windowSec: 3600, max: 50 };
  const key = `ratelimit:${type}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowSec * 1000;

  try {
    const record = (await kv.get(key)) || { count: 0, resetAt: now + config.windowSec * 1000 };

    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + config.windowSec * 1000;
    }

    if (record.count >= config.max) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      return { allowed: false, retryAfterSec, remaining: 0 };
    }

    record.count += 1;
    await kv.set(key, record, { ex: config.windowSec });

    return {
      allowed: true,
      remaining: config.max - record.count,
      retryAfterSec: 0,
    };
  } catch (e) {
    console.warn('Rate limit check failed, allowing request:', e.message);
    return { allowed: true, remaining: -1, retryAfterSec: 0 };
  }
}

export function getClientId(req, userEmail = null) {
  if (userEmail) return `user:${userEmail}`;
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers['x-real-ip'] || 'unknown';
  return `ip:${ip}`;
}

export async function applyRateLimit(req, res, type, userEmail = null) {
  const id = getClientId(req, userEmail);
  const result = await checkRateLimit(type, id);

  if (!result.allowed) {
    res.setHeader('Retry-After', result.retryAfterSec);
    res.status(429).json({
      error: `Rate limit exceeded. Try again in ${result.retryAfterSec} seconds.`,
      retryAfterSec: result.retryAfterSec,
    });
    return false;
  }

  if (result.remaining >= 0) {
    res.setHeader('X-RateLimit-Remaining', result.remaining);
  }
  return true;
}
