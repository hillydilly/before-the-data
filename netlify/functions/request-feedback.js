// request-feedback.js
// Called when Chad denies a $5 submission that had feedbackRequested: true
// Marks the submission as needing feedback in Firebase — CLAWD picks it up and pings Chad in Discord

const FIREBASE_KEY = process.env.FIREBASE_API_KEY;
const FIREBASE_BASE = 'https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents';
const RESEND_KEY = process.env.RESEND_API_KEY;

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body;
  try { body = await req.json(); } catch(e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { id, artistName, spotifyUrl, email } = body;
  if (!id || !artistName || !email) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Mark the submission as needing feedback in Firebase
  // CLAWD monitors for feedbackPending: true submissions on heartbeat
  try {
    await fetch(`${FIREBASE_BASE}/config/${id}?key=${FIREBASE_KEY}&updateMask.fieldPaths=feedbackPending&updateMask.fieldPaths=feedbackRequestedAt`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          feedbackPending: { booleanValue: true },
          feedbackRequestedAt: { stringValue: new Date().toISOString() }
        }
      })
    });
  } catch(err) {
    console.error('Firebase update failed:', err.message);
    return new Response(JSON.stringify({ error: 'Firebase update failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const config = { path: '/api/request-feedback' };
