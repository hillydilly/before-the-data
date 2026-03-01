/**
 * Netlify Function: POST /api/submit-music
 * Saves submission to Firebase and sends confirmation email to artist
 */

const FIREBASE_KEY = process.env.FIREBASE_API_KEY;
const FIREBASE_BASE = 'https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents';
const RESEND_KEY = process.env.RESEND_API_KEY;

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const {
    email = '',
    spotifyUrl = '',
    artistName = '',
    genre = '',
    instagramUrl = '',
    tiktokUrl = '',
    bio = '',
    stripeSessionId = '',
    tier = 'free'
  } = body;

  // Validate required fields
  if (!spotifyUrl || !artistName || !genre) {
    return new Response(JSON.stringify({ error: 'Missing required fields: spotifyUrl, artistName, genre' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const timestamp = Date.now();
  const docId = `btd_submission_${timestamp}`;

  try {
    // Save to Firebase
    await fetch(`${FIREBASE_BASE}/config/${docId}?key=${FIREBASE_KEY}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          email:           { stringValue: email },
          spotifyUrl:      { stringValue: spotifyUrl },
          artistName:      { stringValue: artistName },
          genre:           { stringValue: genre },
          instagramUrl:    { stringValue: instagramUrl },
          tiktokUrl:       { stringValue: tiktokUrl },
          bio:             { stringValue: bio },
          stripeSessionId: { stringValue: stripeSessionId },
          tier:            { stringValue: tier },
          guaranteed:      { booleanValue: tier === 'paid' },
          submittedAt:     { stringValue: new Date(timestamp).toISOString() },
          status:          { stringValue: 'pending' }
        }
      })
    });
  } catch (err) {
    console.error('Firebase save error:', err);
    return new Response(JSON.stringify({ error: 'Failed to save submission' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Send confirmation email to artist (fire and don't block on failure)
  if (email) {
    const isPaid = tier === 'paid';
    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <style>:root { color-scheme: light only; }</style>
</head>
<body style="margin:0;padding:0;background:#f2f2f2;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2;">
<tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <!-- HEADER: logo on forced black -->
  <tr>
    <td style="padding:0;line-height:0;font-size:0;">
      <a href="https://beforethedata.com" style="display:block;text-decoration:none;">
        <img src="https://res.cloudinary.com/dd9nbystx/image/upload/v1772326488/btd/btd-email-header-submit-dark.png"
             alt="BEFORE THE DATA" width="560"
             style="display:block;width:100%;max-width:560px;border:0;" />
      </a>
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td bgcolor="#ffffff" style="background:#ffffff;padding:40px 40px 16px;">
      <p style="margin:0 0 12px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#999999;font-weight:600;">${isPaid ? 'GUARANTEED LISTEN' : 'SUBMISSION RECEIVED'}</p>
      <h1 style="margin:0 0 24px;font-size:36px;font-weight:700;color:#000000;text-transform:uppercase;letter-spacing:-0.5px;line-height:1.1;">${isPaid ? "YOU'RE IN." : 'WE GOT IT.'}</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#333333;line-height:1.75;">
        ${isPaid
          ? 'Your track is in the guaranteed listen queue. Chad personally listens within 7 days. You will hear back either way.'
          : 'Your track is in the queue. No timeline guarantee. We go through everything. If it is right for us, we will be in touch.'}
      </p>
    </td>
  </tr>

  <!-- DIVIDER -->
  <tr><td bgcolor="#ffffff" style="background:#ffffff;padding:0 40px;"><div style="height:1px;background:#eeeeee;"></div></td></tr>

  <!-- WHAT HAPPENS NEXT -->
  <tr>
    <td bgcolor="#ffffff" style="background:#ffffff;padding:24px 40px 16px;">
      <p style="margin:0 0 20px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#999999;font-weight:600;">WHAT HAPPENS NEXT</p>
      ${isPaid ? `
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:8px 0;vertical-align:top;width:24px;font-size:14px;color:#000;">&#x2192;</td><td style="padding:8px 0;"><p style="margin:0;font-size:14px;color:#000000;font-weight:600;line-height:1.4;">Chad listens within 7 days</p><p style="margin:4px 0 0;font-size:13px;color:#666666;line-height:1.5;">Personal listen. Every guaranteed submission gets heard.</p></td></tr>
        <tr><td style="padding:8px 0;vertical-align:top;width:24px;font-size:14px;color:#000;">&#x2192;</td><td style="padding:8px 0;"><p style="margin:0;font-size:14px;color:#000000;font-weight:600;line-height:1.4;">You hear back either way</p><p style="margin:4px 0 0;font-size:13px;color:#666666;line-height:1.5;">Not ghosted. Feedback or a pass, but always a response.</p></td></tr>
        <tr><td style="padding:8px 0;vertical-align:top;width:24px;font-size:14px;color:#000;">&#x2192;</td><td style="padding:8px 0;"><p style="margin:0;font-size:14px;color:#000000;font-weight:600;line-height:1.4;">If it connects, we talk</p><p style="margin:4px 0 0;font-size:13px;color:#666666;line-height:1.5;">We work with artists early. If there is something here, we will find it.</p></td></tr>
      </table>` : `
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:8px 0;vertical-align:top;width:24px;font-size:14px;color:#000;">&#x2192;</td><td style="padding:8px 0;"><p style="margin:0;font-size:14px;color:#000000;font-weight:600;line-height:1.4;">It goes into the queue</p><p style="margin:4px 0 0;font-size:13px;color:#666666;line-height:1.5;">No timeline guarantee. We go through submissions when we go through them.</p></td></tr>
        <tr><td style="padding:8px 0;vertical-align:top;width:24px;font-size:14px;color:#000;">&#x2192;</td><td style="padding:8px 0;"><p style="margin:0;font-size:14px;color:#000000;font-weight:600;line-height:1.4;">If it connects, you hear from us</p><p style="margin:4px 0 0;font-size:13px;color:#666666;line-height:1.5;">We do not respond to every submission. If it is right for us, we will be in touch.</p></td></tr>
        <tr><td style="padding:8px 0;vertical-align:top;width:24px;font-size:14px;color:#000;">&#x2192;</td><td style="padding:8px 0;"><p style="margin:0;font-size:14px;color:#000000;font-weight:600;line-height:1.4;">Want to jump the queue?</p><p style="margin:4px 0 0;font-size:13px;color:#666666;line-height:1.5;"><a href="https://beforethedata.com/submit.html" style="color:#000000;font-weight:600;text-decoration:underline;">Upgrade to Heard First ($5)</a>. Guaranteed listen within 7 days, you hear back either way.</p></td></tr>
      </table>`}
    </td>
  </tr>

  <!-- CLOSING -->
  <tr>
    <td bgcolor="#ffffff" style="background:#ffffff;padding:24px 40px 40px;">
      <div style="height:1px;background:#eeeeee;margin-bottom:24px;"></div>
      <p style="margin:0;font-size:14px;color:#333333;line-height:1.75;">
        ${isPaid
          ? 'Keep an ear out. You will hear back within 7 days.'
          : 'Keep listening. If it is right, you will hear from us.'}
      </p>
    </td>
  </tr>

  <!-- CTA -->
  <tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 40px 32px;text-align:center;">
    <a href="https://beforethedata.com" style="display:inline-block;padding:14px 36px;background:#000000;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;">START LISTENING &#x2192;</a>
  </td></tr>
  <!-- Footer -->
  <tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 40px 40px;">
    <p style="margin:0;font-size:13px;color:#999999;line-height:1.8;border-top:1px solid #eeeeee;padding-top:24px;">You heard it here first.<br><strong style="color:#333333;">Before The Data</strong></p>
  </td></tr>
  <tr><td style="padding:24px 40px;text-align:center;background:#f2f2f2;">
    <p style="margin:0;font-size:11px;color:#999999;"><a href="https://beforethedata.com" style="color:#999999;text-decoration:none;">beforethedata.com</a> &nbsp;|&nbsp; <a href="https://beforethedata.com/unsubscribe" style="color:#999999;text-decoration:none;">Unsubscribe</a></p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Before The Data <hello@beforethedata.com>',
          to: [email],
          subject: isPaid ? "You are in. (Before The Data)" : "We got it. (Before The Data)",
          html: emailHtml
        })
      });
      const emailData = await emailRes.json();
      console.log('Resend response:', emailRes.status, JSON.stringify(emailData));
    } catch (err) {
      console.warn('Confirmation email failed:', err);
    }
  }

  return new Response(JSON.stringify({ success: true, id: docId }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
};

export const config = { path: '/api/submit-music' };
