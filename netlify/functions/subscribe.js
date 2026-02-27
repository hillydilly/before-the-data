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

    const RESEND_KEY = process.env.RESEND_API_KEY;
    const FROM = 'Before The Data <hello@beforethedata.com>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2f2f2;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2;">
<tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <!-- Banner -->
  <tr>
    <td align="center" bgcolor="#000000" style="padding:28px 32px 20px;">
      <img src="https://res.cloudinary.com/dd9nbystx/image/upload/v1772201268/btd/btd-email-header-2x.png"
           alt="Before The Data" width="480"
           style="display:block;max-width:100%;border:0;">
    </td>
  </tr>

  <!-- Hero -->
  <tr>
    <td bgcolor="#ffffff" style="padding:40px 40px 16px;">
      <h1 style="margin:0 0 16px;font-size:32px;font-weight:700;color:#000000;text-transform:uppercase;letter-spacing:1px;line-height:1;">Welcome.</h1>
      <p style="margin:0;font-size:15px;color:#333333;line-height:1.8;">Before The Data is a music discovery project built on one thing: finding artists before anyone else. Billie Eilish. Lorde. Halsey. LANY. Daniel Caesar. Dominic Fike. All found here first. Now you're part of that.</p>
    </td>
  </tr>

  <!-- Divider -->
  <tr><td bgcolor="#ffffff" style="padding:0 40px;"><div style="height:1px;background:#eeeeee;"></div></td></tr>

  <!-- Free access -->
  <tr>
    <td bgcolor="#ffffff" style="padding:32px 40px;">
      <p style="margin:0 0 20px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#999999;font-weight:600;">YOUR ACCESS</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:10px 0;">
            <p style="margin:0;font-size:14px;color:#000000;font-weight:600;">Full catalog. 30-second previews. Write-ups on every pick.</p>
            <p style="margin:4px 0 0;font-size:13px;color:#666666;line-height:1.5;">Every pick we've ever made. Context behind each one: what it is, why it matters, where it's going. No algorithm. Just taste.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Divider -->
  <tr><td bgcolor="#ffffff" style="padding:0 40px;"><div style="height:1px;background:#eeeeee;"></div></td></tr>

  <!-- Heard First pitch — lead with this -->
  <tr>
    <td bgcolor="#000000" style="padding:32px 40px 36px;">
      <p style="margin:0 0 8px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#888888;font-weight:600;">WANT THE EDGE?</p>
      <h2 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#ffffff;text-transform:uppercase;letter-spacing:1px;line-height:1.1;">Heard First.</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#aaaaaa;line-height:1.7;">We run a 24/7 AI agent trained to scroll TikTok and surface artists before they break. Chad curates every pick. Heard First members get the signal before it goes public.</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:10px 0;border-bottom:1px solid #222222;">
          <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff;">&#x2192; 48hr early access</p>
          <p style="margin:4px 0 0;font-size:13px;color:#888888;line-height:1.5;">Every Artist Discovery pick in your inbox before it goes public.</p>
        </td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #222222;">
          <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff;">&#x2192; Full A&amp;R scouting report</p>
          <p style="margin:4px 0 0;font-size:13px;color:#888888;line-height:1.5;">Spotify listeners, TikTok UGC, YouTube views. The data at the moment of discovery.</p>
        </td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #222222;">
          <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff;">&#x2192; Weekly artist tracker</p>
          <p style="margin:4px 0 0;font-size:13px;color:#888888;line-height:1.5;">Every artist we're watching, updated weekly. Who's breaking. Who stalled.</p>
        </td></tr>
        <tr><td style="padding:10px 0;">
          <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff;">&#x2192; Monthly ones to watch</p>
          <p style="margin:4px 0 0;font-size:13px;color:#888888;line-height:1.5;">Top momentum artists of the month, ranked by data. Before the industry catches on.</p>
        </td></tr>
      </table>
      <div style="margin-top:28px;text-align:center;">
        <a href="https://beforethedata.com/heard-first.html" style="display:inline-block;background:#ffffff;color:#000000;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:14px 36px;text-decoration:none;">JOIN HEARD FIRST &#x2192;</a>
      </div>
      <p style="margin:16px 0 0;text-align:center;font-size:11px;color:#555555;">$9/mo or $90/yr. Cancel anytime.</p>
    </td>
  </tr>

  <!-- Secondary CTA -->
  <tr>
    <td bgcolor="#ffffff" style="padding:28px 40px;text-align:center;">
      <a href="https://beforethedata.com/new-music.html" style="display:inline-block;background:#000000;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:14px 36px;text-decoration:none;">START LISTENING &#x2192;</a>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td bgcolor="#000000" style="padding:16px 40px 32px;text-align:center;border-top:1px solid #222222;">
      <p style="margin:0;font-size:11px;color:#555555;">
        <a href="https://beforethedata.com" style="color:#888888;text-decoration:none;">beforethedata.com</a>
      </p>
    </td>
  </tr>

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
        subject: "Welcome to Before The Data.",
        html
      })
    });

    const data = await res.json();
    if (!res.ok) {
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
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/api/subscribe' };
