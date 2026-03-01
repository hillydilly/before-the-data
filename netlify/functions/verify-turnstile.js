// verify-turnstile.js — server-side Turnstile verification
import { rateLimit } from './rate-limit.js';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('client-ip') || 'unknown';
  const rl = rateLimit(ip, 10, 60000);
  if (rl.limited) {
    return Response.json({ error: 'Too many requests. Try again in ' + rl.retryAfter + ' seconds.' }, { status: 429 });
  }

  try {
    const { token } = await req.json();
    if (!token) {
      return Response.json({ error: 'Missing Turnstile token' }, { status: 400 });
    }

    const secret = Netlify.env.get('TURNSTILE_SECRET_KEY') || '1x0000000000000000000000000000000AA';
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secret}&response=${token}&remoteip=${ip}`
    });
    const result = await resp.json();

    if (result.success) {
      return Response.json({ success: true });
    } else {
      return Response.json({ error: 'Verification failed' }, { status: 403 });
    }
  } catch (e) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
};

export const config = { path: '/api/verify-turnstile' };
