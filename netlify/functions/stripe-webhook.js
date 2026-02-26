/**
 * Netlify Function: POST /api/stripe-webhook
 * Handles Stripe events — upgrades subscriber tier on successful payment
 */

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const STRIPE_SECRET = 'STRIPE_SECRET_REMOVED';
  const FIREBASE_KEY = 'AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec';
  const FIREBASE_BASE = 'https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents';
  const RESEND_KEY = 're_GEpDNamo_ES7dvBB6SzemdjpATYtErpGb';

  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Parse event (skip signature verification if no webhook secret set yet)
    let event;
    try {
      event = JSON.parse(body);
    } catch(e) {
      return new Response('Bad request', { status: 400 });
    }

    // Handle successful checkout
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const email = session.customer_details?.email;
      const customerId = session.customer;

      if (!email) {
        console.warn('No email in checkout session');
        return new Response('OK', { status: 200 });
      }

      // Save/upgrade subscriber in Firebase
      const id = email.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      await fetch(`${FIREBASE_BASE}/config/btd_sub_${id}?key=${FIREBASE_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: {
          email: { stringValue: email },
          tier: { stringValue: 'paid' },
          stripeCustomerId: { stringValue: customerId || '' },
          subscribedAt: { stringValue: new Date().toISOString() },
          source: { stringValue: 'stripe' }
        }})
      });

      console.log(`✅ Upgraded to paid: ${email}`);

      // Send welcome email
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Before The Data <hello@beforethedata.com>',
          to: [email],
          subject: "You're in. Welcome to Heard First.",
          html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f2f2f2;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2;"><tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td style="background:#000;padding:28px 32px;text-align:center;">
  <img src="https://beforethedata.com/assets/brand/wordmark-full.png" alt="Before The Data" width="160" style="display:inline-block;">
  <p style="margin:8px 0 0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#666;">HEARD FIRST</p>
</td></tr>
<tr><td style="background:#fff;padding:40px 40px 32px;">
  <h1 style="margin:0 0 16px;font-size:36px;font-weight:700;color:#000;text-transform:uppercase;letter-spacing:1px;line-height:1;">You're in.</h1>
  <p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.7;">Welcome to <strong>Heard First</strong> — you now have early access to every Artist Discovery pick, 48 hours before the public. Plus the full A&R data behind it.</p>
  <p style="margin:0;font-size:14px;color:#666;line-height:1.7;">The next pick drops in your inbox before it goes anywhere else. Keep an ear out.</p>
</td></tr>
<tr><td style="background:#000;padding:28px 32px;text-align:center;">
  <a href="https://beforethedata.com" style="display:inline-block;background:#fff;color:#000;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:12px 28px;text-decoration:none;">Start Listening →</a>
</td></tr>
<tr><td style="background:#f2f2f2;padding:20px 32px;text-align:center;">
  <p style="margin:0;font-size:11px;color:#bbb;">Heard First — $9/mo. Manage your subscription at beforethedata.com.</p>
</td></tr>
</table></td></tr></table></body></html>`
        })
      });
    }

    // Handle subscription cancellation
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const customerId = sub.customer;

      // Look up email from Stripe
      const custRes = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
        headers: { 'Authorization': `Bearer ${STRIPE_SECRET}` }
      });
      const cust = await custRes.json();
      const email = cust.email;

      if (email) {
        const id = email.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        await fetch(`${FIREBASE_BASE}/config/btd_sub_${id}?updateMask.fieldPaths=tier&key=${FIREBASE_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { tier: { stringValue: 'free' } }})
        });
        console.log(`Downgraded to free: ${email}`);
      }
    }

    return new Response('OK', { status: 200 });

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('Server error', { status: 500 });
  }
};

export const config = { path: '/api/stripe-webhook' };
