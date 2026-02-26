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

    const RESEND_KEY = 're_GEpDNamo_ES7dvBB6SzemdjpATYtErpGb';
    const FROM = 'Before The Data <hello@beforethedata.com>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2f2f2;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2;">
<tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <!-- Header -->
  <tr>
    <td style="background:#000000;padding:32px;text-align:center;">
      <img src="https://beforethedata.com/assets/brand/wordmark-full.png" alt="Before The Data" width="160" style="display:inline-block;max-width:160px;">
    </td>
  </tr>

  <!-- Hero -->
  <tr>
    <td style="background:#ffffff;padding:40px 40px 32px;">
      <h1 style="margin:0 0 16px;font-size:32px;font-weight:700;color:#000000;text-transform:uppercase;letter-spacing:1px;line-height:1;">Welcome.</h1>
      <p style="margin:0;font-size:15px;color:#444444;line-height:1.8;">Before The Data is a music discovery project built on one thing: finding artists before anyone else. Billie Eilish. Lorde. Halsey. LANY. Daniel Caesar. All found here first. Now you're part of that.</p>
    </td>
  </tr>

  <!-- Divider -->
  <tr><td style="background:#ffffff;padding:0 40px;"><div style="height:1px;background:#eeeeee;"></div></td></tr>

  <!-- Free tier -->
  <tr>
    <td style="background:#ffffff;padding:32px 40px;">
      <p style="margin:0 0 20px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#999999;font-weight:600;">YOUR FREE ACCESS</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f5f5f5;">
            <p style="margin:0;font-size:14px;color:#000;font-weight:600;">Every pick, as it drops</p>
            <p style="margin:4px 0 0;font-size:13px;color:#666;line-height:1.5;">One artist at a time. No algorithm. Just taste.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;">
            <p style="margin:0;font-size:14px;color:#000;font-weight:600;">30-second previews + full write-ups</p>
            <p style="margin:4px 0 0;font-size:13px;color:#666;line-height:1.5;">Context behind every pick: what it is, why it matters, where it's going.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Divider -->
  <tr><td style="background:#ffffff;padding:0 40px;"><div style="height:1px;background:#eeeeee;"></div></td></tr>

  <!-- Paid tier -->
  <tr>
    <td style="background:#ffffff;padding:32px 40px 40px;">
      <p style="margin:0 0 20px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#999999;font-weight:600;">HEARD FIRST: PAID TIER (COMING SOON)</p>
      <p style="margin:0 0 20px;font-size:14px;color:#444;line-height:1.7;">For the people who want the edge. Not just the pick. The intelligence behind it.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eeeeee;">
        <tr>
          <td style="padding:16px 20px;border-bottom:1px solid #f5f5f5;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#000;">48hr early access</p>
            <p style="margin:0;font-size:12px;color:#666;line-height:1.5;">Every ARTIST DISCOVERY pick lands in your inbox the moment it's found. 48 hours before it goes public.</p>
          </td>
        </tr>
        <tr style="background:#fafafa;">
          <td style="padding:16px 20px;border-bottom:1px solid #f5f5f5;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#000;">Full A&amp;R scouting report</p>
            <p style="margin:0;font-size:12px;color:#666;line-height:1.5;">Spotify listeners, TikTok UGC count, viral gap ratio, save ratio, stream trajectory. The data behind every pick.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 20px;border-bottom:1px solid #f5f5f5;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#000;">Weekly artist tracker</p>
            <p style="margin:0;font-size:12px;color:#666;line-height:1.5;">Auto-pulled from our A&amp;R dashboard every week. See how every scouted artist's numbers moved since we called them: streams, followers, UGC..</p>
          </td>
        </tr>
        <tr style="background:#fafafa;">
          <td style="padding:16px 20px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#000;">Monthly ones to watch</p>
            <p style="margin:0;font-size:12px;color:#666;line-height:1.5;">Top momentum artists of the month, ranked by data. The names worth paying attention to before the industry does.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- CTA -->
  <tr>
    <td style="background:#000000;padding:32px 40px;text-align:center;">
      <a href="https://beforethedata.com" style="display:inline-block;background:#ffffff;color:#000000;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:14px 36px;text-decoration:none;">Start Listening →</a>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f2f2f2;padding:24px 40px;text-align:center;">
      <p style="margin:0 0 6px;font-size:11px;color:#999999;">
        <a href="https://beforethedata.com" style="color:#000000;font-weight:600;text-decoration:none;">beforethedata.com</a>
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <a href="https://twitter.com/beforethedata" style="color:#999999;text-decoration:none;">@beforethedata</a>
      </p>
      <p style="margin:0;font-size:11px;color:#bbbbbb;">You signed up at beforethedata.com.</p>
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
