/**
 * Netlify Function: POST /api/stripe-webhook
 * Handles Stripe events — upgrades subscriber tier on successful payment
 */

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  const FIREBASE_KEY = process.env.FIREBASE_API_KEY;
  const FIREBASE_BASE = 'https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents';
  const RESEND_KEY = process.env.RESEND_API_KEY;

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
      const sessionType = session.metadata?.type || '';

      if (!email) {
        console.warn('No email in checkout session');
        return new Response('OK', { status: 200 });
      }

      // If this is a music submission payment — not a Heard First subscription
      if (sessionType === 'submit') {
        console.log(`Submit payment from ${email} — no Heard First email fired`);
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
<body style="margin:0;padding:0;background:#f2f2f2;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2;">
<tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <!-- Banner -->
  <tr>
    <td align="center" bgcolor="#000000" style="padding:28px 32px 20px;">
      <img src="https://res.cloudinary.com/dd9nbystx/image/upload/v1772201268/btd/btd-email-header-2x.png"
           alt="Before The Data - Heard First"
           width="480"
           style="display:block;max-width:100%;border:0;">
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td bgcolor="#ffffff" style="padding:40px 40px 16px;">
      <p style="margin:0 0 12px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#999999;font-weight:600;">PAID SUBSCRIBER</p>
      <h2 style="margin:0 0 20px;font-size:36px;font-weight:700;color:#000000;text-transform:uppercase;letter-spacing:-0.5px;line-height:1.1;">YOU'RE IN.</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#333333;line-height:1.8;">Welcome to Heard First. You now get every Artist Discovery pick 48 hours before the public, plus the full A&amp;R data behind it. This is what the industry pays for. You just got it for $9.</p>
      <p style="margin:0 0 16px;font-size:15px;color:#333333;line-height:1.8;">We run a 24/7 autonomous AI agent trained to scroll TikTok and surface artists before they break. Every pick is then curated by Chad. You get the signal before anyone else does.</p>
    </td>
  </tr>

  <!-- Divider -->
  <tr><td bgcolor="#ffffff" style="padding:0 40px;"><div style="height:1px;background:#eeeeee;"></div></td></tr>

  <!-- Perks -->
  <tr>
    <td bgcolor="#ffffff" style="padding:24px 40px 32px;">
      <p style="margin:0 0 20px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#999999;font-weight:600;">WHAT YOU GET</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:10px 0;vertical-align:top;width:24px;font-size:14px;color:#000000;">&#x2192;</td>
          <td style="padding:10px 0;">
            <p style="margin:0;font-size:14px;font-weight:700;color:#000000;line-height:1.4;">48hr early access</p>
            <p style="margin:4px 0 0;font-size:13px;color:#666666;line-height:1.5;">Every Artist Discovery pick lands in your inbox before it goes public.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;vertical-align:top;width:24px;font-size:14px;color:#000000;">&#x2192;</td>
          <td style="padding:10px 0;">
            <p style="margin:0;font-size:14px;font-weight:700;color:#000000;line-height:1.4;">Full A&amp;R scouting report</p>
            <p style="margin:4px 0 0;font-size:13px;color:#666666;line-height:1.5;">Spotify listeners, TikTok UGC, YouTube views, Instagram following. The data at the moment of discovery.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;vertical-align:top;width:24px;font-size:14px;color:#000000;">&#x2192;</td>
          <td style="padding:10px 0;">
            <p style="margin:0;font-size:14px;font-weight:700;color:#000000;line-height:1.4;">Weekly artist tracker</p>
            <p style="margin:4px 0 0;font-size:13px;color:#666666;line-height:1.5;">Every artist we're watching, updated weekly. Who's breaking out. Who stalled.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;vertical-align:top;width:24px;font-size:14px;color:#000000;">&#x2192;</td>
          <td style="padding:10px 0;">
            <p style="margin:0;font-size:14px;font-weight:700;color:#000000;line-height:1.4;">Monthly ones to watch</p>
            <p style="margin:4px 0 0;font-size:13px;color:#666666;line-height:1.5;">Top momentum artists of the month, ranked by data. Before the industry catches on.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Divider -->
  <tr><td bgcolor="#ffffff" style="padding:0 40px;"><div style="height:1px;background:#eeeeee;"></div></td></tr>

  <!-- Closing -->
  <tr>
    <td bgcolor="#ffffff" style="padding:24px 40px 40px;">
      <p style="margin:0;font-size:15px;color:#333333;line-height:1.8;">Your first pick is coming. When the next artist gets flagged, you will hear it here before the blogs, before the playlists, before anyone else. Keep an ear out.</p>
    </td>
  </tr>

  <!-- CTA -->
  <tr>
    <td bgcolor="#000000" style="padding:32px 40px;text-align:center;">
      <a href="https://beforethedata.com" style="display:inline-block;background:#ffffff;color:#000000;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:14px 36px;text-decoration:none;">START LISTENING &#x2192;</a>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td bgcolor="#000000" style="padding:16px 40px 32px;text-align:center;border-top:1px solid #222222;">
      <p style="margin:0;font-size:11px;color:#555555;">
        <a href="https://beforethedata.com" style="color:#888888;text-decoration:none;">beforethedata.com</a>
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
