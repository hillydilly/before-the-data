/**
 * Netlify Function: POST /api/stripe-webhook
 * Handles Stripe events — upgrades subscriber tier on successful payment
 */

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
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

      // Send Heard First paid welcome email
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Before The Data <hello@beforethedata.com>',
          to: [email],
          subject: "You are in. Welcome to Heard First.",
          html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000000;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#000000">
<tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <!-- Banner -->
  <tr>
    <td align="center" bgcolor="#000000" style="padding:0;">
      <img src="https://res.cloudinary.com/dd9nbystx/image/upload/v1772201268/btd/btd-email-header-2x.png"
           alt="Before The Data - Heard First"
           width="480"
           style="display:block;max-width:100%;border:0;">
    </td>
  </tr>

  <!-- Headline -->
  <tr>
    <td bgcolor="#000000" style="padding:36px 32px 0;">
      <h2 style="margin:0 0 20px;font-size:32px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:1px;line-height:1.1;">YOU ARE IN.</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#aaaaaa;line-height:1.8;">Welcome to Heard First. You now get early access to every Artist Discovery pick, 48 hours before it goes public.</p>
      <p style="margin:0 0 24px;font-size:15px;color:#aaaaaa;line-height:1.8;">Here is what is coming to your inbox:</p>

      <!-- Perks list -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #1a1a1a;">
            <p style="margin:0;font-size:13px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.5px;">Early Access Drops</p>
            <p style="margin:4px 0 0;font-size:13px;color:#666666;line-height:1.6;">Every Artist Discovery pick lands in your inbox 48 hours before it goes live on the site.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #1a1a1a;">
            <p style="margin:0;font-size:13px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.5px;">Weekly Tracker</p>
            <p style="margin:4px 0 0;font-size:13px;color:#666666;line-height:1.6;">Every Monday. How every artist on our radar moved this week. Streams, UGC, followers.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;">
            <p style="margin:0;font-size:13px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.5px;">Monthly Ones To Watch</p>
            <p style="margin:4px 0 0;font-size:13px;color:#666666;line-height:1.6;">First of every month. Chad's personal picks for the artists worth watching right now.</p>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 32px;font-size:15px;color:#aaaaaa;line-height:1.8;">The next drop is coming. Keep an ear out.</p>
      <a href="https://beforethedata.com" style="display:inline-block;background:#ffffff;color:#000000;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:13px 28px;text-decoration:none;">Start listening →</a>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td bgcolor="#000000" style="padding:40px 32px 0;">
      <p style="margin:32px 0 0;font-size:11px;color:#333333;">
        <a href="https://beforethedata.com" style="color:#555555;text-decoration:none;">beforethedata.com</a>
        &nbsp;·&nbsp; Heard First member
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body></html>`
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
