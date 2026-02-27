/**
 * Netlify Function: POST /api/create-submit-checkout
 * Creates a Stripe one-time $5 checkout for music submission
 */

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  const origin = req.headers.get('origin') || 'https://beforethedata.com';

  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email || '';

    const params = new URLSearchParams({
      'mode': 'payment',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': 'Submit Music — Before The Data',
      'line_items[0][price_data][product_data][description]': 'One-time submission fee. Chad listens to everything personally.',
      'line_items[0][price_data][unit_amount]': '500',
      'line_items[0][quantity]': '1',
      'success_url': `${origin}/submit.html?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${origin}/submit.html`,
      'billing_address_collection': 'auto',
      'allow_promotion_codes': 'true',
    });

    // Pre-fill email if provided
    if (email) {
      params.set('customer_email', email);
    }

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const session = await res.json();
    if (!res.ok) {
      console.error('Stripe error:', session);
      return new Response(JSON.stringify({ error: session.error?.message || 'Stripe error' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Submit checkout error:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/api/create-submit-checkout' };
