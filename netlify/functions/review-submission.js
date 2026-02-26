/**
 * Netlify Function: POST /api/review-submission
 * Called from Mission Control to approve or deny a music submission.
 * Updates Firebase status and sends email to artist.
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

  const { id, action } = body; // id = doc name like "btd_submission_1234567890", action = "approve" | "deny"

  if (!id || !['approve', 'deny'].includes(action)) {
    return new Response(JSON.stringify({ error: 'id and action (approve|deny) are required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Fetch the submission to get artist email + track info
  let submission;
  try {
    const docRes = await fetch(`${FIREBASE_BASE}/config/${id}?key=${FIREBASE_KEY}`);
    if (!docRes.ok) throw new Error('Not found');
    const doc = await docRes.json();
    const f = doc.fields || {};
    submission = {
      email: f.email?.stringValue || '',
      artistName: f.artistName?.stringValue || '',
      spotifyUrl: f.spotifyUrl?.stringValue || '',
      genre: f.genre?.stringValue || ''
    };
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Submission not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Update status in Firebase
  const newStatus = action === 'approve' ? 'approved' : 'denied';
  try {
    await fetch(`${FIREBASE_BASE}/config/${id}?key=${FIREBASE_KEY}&updateMask.fieldPaths=status&updateMask.fieldPaths=reviewedAt`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          status: { stringValue: newStatus },
          reviewedAt: { stringValue: new Date().toISOString() }
        }
      })
    });
  } catch (err) {
    console.error('Firebase update error:', err);
    return new Response(JSON.stringify({ error: 'Failed to update status' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Send email to artist
  if (submission.email) {
    const isApprove = action === 'approve';

    // Extract a short track descriptor from spotify URL or artist name
    const trackLabel = submission.artistName || 'your track';

    const subject = isApprove
      ? 'We listened. (Before The Data)'
      : 'Thanks for submitting. (Before The Data)';

    const bodyText = isApprove
      ? `We listened to ${trackLabel}. Keep going. We're watching.`
      : `Not right for us right now. Keep creating. The right moment comes.`;

    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:520px;margin:0 auto;">
    <div style="background:#000000;padding:24px 32px;">
      <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:18px;font-weight:400;margin:0;letter-spacing:0.5px;">Before The Data</h1>
    </div>
    <div style="padding:40px 32px;">
      <h2 style="font-size:28px;font-weight:700;color:#000;margin:0 0 20px;letter-spacing:-0.5px;">${isApprove ? 'We listened.' : 'Thanks for submitting.'}</h2>
      <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">
        ${bodyText}
      </p>
      <p style="font-size:14px;color:#666;line-height:1.6;margin:0;">
        Before The Data
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

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Before The Data <hello@beforethedata.com>',
          to: [submission.email],
          subject,
          html: emailHtml
        })
      });
    } catch (err) {
      console.warn('Review email send failed:', err);
      // Don't fail the whole request — status was updated
    }
  }

  return new Response(JSON.stringify({ success: true, status: newStatus }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
};

export const config = { path: '/api/review-submission' };
