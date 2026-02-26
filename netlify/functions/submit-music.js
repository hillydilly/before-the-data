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
    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:520px;margin:0 auto;">
    <div style="background:#000000;padding:24px 32px;">
      <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:18px;font-weight:400;margin:0;letter-spacing:0.5px;">Before The Data</h1>
    </div>
    <div style="padding:40px 32px;">
      <h2 style="font-size:28px;font-weight:700;color:#000;margin:0 0 20px;letter-spacing:-0.5px;">We got it.</h2>
      <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">
        ${tier === 'paid'
          ? "Your track is in the guaranteed listen queue. Chad personally listens within 7 days. You'll hear back either way."
          : "Your track is in the queue. No guarantee on timeline — but it's in there. If it's right for us, you'll hear back."}
      </p>
      <p style="font-size:14px;color:#666;line-height:1.6;margin:0;">
        — Before The Data
      </p>
    </div>
    <div style="padding:24px 32px;border-top:1px solid #eee;">
      <p style="font-size:11px;color:#aaa;margin:0;">
        <a href="https://beforethedata.com" style="color:#000;text-decoration:none;">beforethedata.com</a>
      </p>
    </div>
  </div>
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
        subject: 'We got it. — Before The Data',
        html: emailHtml
      })
    }).catch(err => console.warn('Confirmation email failed:', err));
  }

  return new Response(JSON.stringify({ success: true, id: docId }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
};

export const config = { path: '/api/submit-music' };
