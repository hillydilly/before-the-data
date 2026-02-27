/**
 * Netlify Function: POST /api/submit-music
 * Saves submission to Firebase and sends confirmation email to artist
 */

const FIREBASE_KEY = 'AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec';
const FIREBASE_BASE = 'https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents';
const RESEND_KEY = 're_GEpDNamo_ES7dvBB6SzemdjpATYtErpGb';

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
  <style>
    :root { color-scheme: light only; }
  </style>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:system-ui,-apple-system,sans-serif;-webkit-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

        <!-- HEADER: pure HTML/CSS, forced black, works in dark + light mode -->
        <tr>
          <td bgcolor="#000000" style="background:#000000 !important;padding:32px 40px 24px;text-align:center;">
            <a href="https://beforethedata.com" style="text-decoration:none;">
              <p style="margin:0 0 8px;font-size:42px;font-weight:900;letter-spacing:-1px;color:#ffffff;font-family:'Arial Black','Arial Bold',Arial,sans-serif;line-height:1;text-transform:uppercase;">BEFORE<br>THE DATA</p>
              <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:6px;color:#888888;font-family:Arial,sans-serif;text-transform:uppercase;">HEARD FIRST</p>
            </a>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td bgcolor="#ffffff" style="background:#ffffff;padding:40px 40px 32px;">
            <h2 style="font-size:26px;font-weight:700;color:#000000;margin:0 0 20px;letter-spacing:-0.5px;">
              ${isPaid ? 'You are in. Guaranteed.' : 'We got it.'}
            </h2>
            <p style="font-size:15px;color:#333333;line-height:1.7;margin:0 0 20px;">
              ${isPaid
                ? 'Your track is in the guaranteed listen queue. Chad personally listens within 7 days. You will hear back either way.'
                : "Your track is in the queue. No guarantee on timeline. But it is in there. If it is right for us, you will hear back."}
            </p>
            ${!isPaid ? `<p style="font-size:14px;color:#666666;line-height:1.6;margin:0 0 20px;">Want a guaranteed listen within 7 days? <a href="https://beforethedata.com/submit.html" style="color:#000000;font-weight:600;text-decoration:underline;">Upgrade to Heard First ($5)</a> and jump to the top of the queue.</p>` : ''}
            <p style="font-size:14px;color:#666666;margin:0;">Before The Data</p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td bgcolor="#000000" style="background:#000000;padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#888888;">
              <a href="https://beforethedata.com" style="color:#888888;text-decoration:none;">beforethedata.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Before The Data <hello@beforethedata.com>',
        to: [email],
        subject: "We got it. (Before The Data)",
        html: emailHtml
      })
    }).catch(err => console.warn('Confirmation email failed:', err));
  }

  return new Response(JSON.stringify({ success: true, id: docId }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
};

export const config = { path: '/api/submit-music' };
