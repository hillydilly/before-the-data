/**
 * Netlify Function: /api/subscribe
 * Receives email from gate modal → sends welcome email via Resend
 */

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { email } = await req.json();
    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const RESEND_KEY = process.env.RESEND_API_KEY || 're_GEpDNamo_ES7dvBB6SzemdjpATYtErpGb';
    const FROM = 'Before The Data <hello@beforethedata.com>';

    // Welcome email HTML (inline for Netlify function)
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
<tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid #e0e0e0;">
  <tr><td style="background:#000;padding:28px 32px;text-align:center;">
    <img src="https://beforethedata.com/assets/brand/wordmark-full.png" alt="Before The Data" width="180" style="display:inline-block;">
  </td></tr>
  <tr><td style="padding:40px 32px 28px;">
    <h1 style="margin:0 0 16px;font-size:36px;font-weight:700;color:#000;text-transform:uppercase;letter-spacing:0.5px;line-height:1.1;">You're in.</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.7;">Welcome to <strong style="color:#000;">Before The Data</strong> — the music discovery project built on a decade of finding artists before anyone else.</p>
    <p style="margin:0;font-size:15px;color:#444;line-height:1.7;">Billie Eilish, Lorde, Halsey, LANY, Daniel Caesar. Found first. Now you're part of that process.</p>
  </td></tr>
  <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid #e0e0e0;"></td></tr>
  <tr><td style="padding:28px 32px 0;">
    <p style="margin:0 0 16px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#000;font-weight:700;">COMING SOON — HEARD FIRST</p>
    <p style="margin:0 0 16px;font-size:14px;color:#444;line-height:1.7;">The paid tier is coming. When it drops, you'll get:</p>
    <p style="margin:0 0 8px;font-size:13px;color:#222;">→ &nbsp;<strong>48hr early access</strong> to every pick before it goes public</p>
    <p style="margin:0 0 8px;font-size:13px;color:#222;">→ &nbsp;<strong>Full A&R scouting reports</strong> — Spotify listeners, TikTok UGC, viral gap ratio, stream trajectory</p>
    <p style="margin:0;font-size:13px;color:#222;">→ &nbsp;<strong>Monthly RADAR roundup</strong> — top finds ranked by momentum</p>
  </td></tr>
  <tr><td style="padding:32px;text-align:center;">
    <a href="https://beforethedata.com" style="display:inline-block;background:#000;color:#fff;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:14px 32px;text-decoration:none;">Start Listening →</a>
  </td></tr>
  <tr><td style="padding:24px 32px;border-top:1px solid #e0e0e0;text-align:center;">
    <p style="margin:0;font-size:11px;color:#bbb;">You signed up at beforethedata.com.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: "You're in. Welcome to Before The Data.",
        html
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Resend error:', data);
      return new Response(JSON.stringify({ error: 'Email send failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Subscribe function error:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/api/subscribe' };
