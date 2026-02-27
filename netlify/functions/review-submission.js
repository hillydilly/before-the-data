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

    const subject = isApprove
      ? `We are posting this. (Before The Data)`
      : `Thanks for submitting. (Before The Data)`;

    const emailHtml = isApprove
      ? `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000000;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#000000">
<tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <!-- Banner -->
  <tr>
    <td align="center" bgcolor="#000000" style="padding:0;">
      <img src="https://res.cloudinary.com/dd9nbystx/image/upload/v1772201417/btd/btd-email-header-submit.png"
           alt="Before The Data — Music Discovery"
           width="480"
           style="display:block;max-width:100%;border:0;">
    </td>
  </tr>

  <!-- Headline -->
  <tr>
    <td bgcolor="#000000" style="padding:36px 32px 0;">
      <h2 style="margin:0 0 20px;font-size:32px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:1px;line-height:1.1;">WE LIKE IT.</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#aaaaaa;line-height:1.8;">We listened to your submission and we want to post it on Before The Data.</p>
      <p style="margin:0 0 16px;font-size:15px;color:#aaaaaa;line-height:1.8;">Check the site within 48 hours. Your track will be live.</p>
      <p style="margin:0 0 32px;font-size:15px;color:#aaaaaa;line-height:1.8;">Keep making music. We will keep watching.</p>
      <a href="https://beforethedata.com" style="display:inline-block;background:#ffffff;color:#000000;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:13px 28px;text-decoration:none;">Check the site →</a>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td bgcolor="#000000" style="padding:40px 32px 0;border-top:0;">
      <p style="margin:32px 0 0;font-size:11px;color:#333333;text-align:left;">
        <a href="https://beforethedata.com" style="color:#555555;text-decoration:none;">beforethedata.com</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body></html>`
      : `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000000;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#000000">
<tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <!-- Banner -->
  <tr>
    <td align="center" bgcolor="#000000" style="padding:0;">
      <img src="https://res.cloudinary.com/dd9nbystx/image/upload/v1772201417/btd/btd-email-header-submit.png"
           alt="Before The Data — Music Discovery"
           width="480"
           style="display:block;max-width:100%;border:0;">
    </td>
  </tr>

  <!-- Headline -->
  <tr>
    <td bgcolor="#000000" style="padding:36px 32px 0;">
      <h2 style="margin:0 0 20px;font-size:32px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:1px;line-height:1.1;">THANK YOU.</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#aaaaaa;line-height:1.8;">We genuinely appreciate you submitting to Before The Data.</p>
      <p style="margin:0 0 16px;font-size:15px;color:#aaaaaa;line-height:1.8;">After listening, this one is not the right fit for us right now. We are going to pass.</p>
      <p style="margin:0 0 16px;font-size:15px;color:#aaaaaa;line-height:1.8;">Please know this is just our opinion, and opinions change. We approve on a song by song basis, so we encourage you to keep submitting. You never know what will land.</p>
      <p style="margin:0 0 32px;font-size:15px;color:#aaaaaa;line-height:1.8;">Keep creating. The right one is coming.</p>
      <a href="https://beforethedata.com/submit.html" style="display:inline-block;background:#ffffff;color:#000000;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:13px 28px;text-decoration:none;">Submit again →</a>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td bgcolor="#000000" style="padding:40px 32px 0;">
      <p style="margin:32px 0 0;font-size:11px;color:#333333;text-align:left;">
        <a href="https://beforethedata.com" style="color:#555555;text-decoration:none;">beforethedata.com</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body></html>`;

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
