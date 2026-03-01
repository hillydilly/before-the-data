/**
 * Netlify Function: POST /api/customer-portal
 * Creates a Stripe customer portal session so subscribers can manage/cancel
 * Body: { email: "..." }
 */

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  const origin = req.headers.get('origin') || 'https://beforethedata.com';

  let email;
  try {
    const body = await req.json();
    email = body.email?.trim().toLowerCase();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!email) {
    return new Response(JSON.stringify({ error: 'Email required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    // Look up customer by email
    const searchRes = await fetch(`https://api.stripe.com/v1/customers/search?query=email:'${encodeURIComponent(email)}'&limit=1`, {
      headers: { 'Authorization': `Bearer ${STRIPE_SECRET}` }
    });
    const searchData = await searchRes.json();
    const customer = searchData.data?.[0];

    if (!customer) {
      return new Response(JSON.stringify({ error: 'No subscription found for that email.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // Create portal session
    const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'customer': customer.id,
        'return_url': origin + '/heard-first',
      }).toString()
    });
    const portal = await portalRes.json();

    if (!portalRes.ok) {
      console.error('Portal error:', portal);
      return new Response(JSON.stringify({ error: portal.error?.message || 'Could not create portal session' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ url: portal.url }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Portal error:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const config = { path: '/api/customer-portal' };
