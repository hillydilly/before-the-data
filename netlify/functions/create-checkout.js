/**
 * Netlify Function: POST /api/create-checkout
 * Creates a Stripe checkout session for Heard First ($9/mo) or Heard First Pro ($49.99/mo)
 */

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  const origin = req.headers.get('origin') || 'https://beforethedata.com';
  const url = new URL(req.url);
  const plan = url.searchParams.get('plan');

  // Plan config
  let productName, productDesc, unitAmount, successUrl, cancelUrl;

  if (plan === 'pro') {
    successUrl = `${origin}/pro?session_id={CHECKOUT_SESSION_ID}`;
    cancelUrl = `${origin}/pro`;
  } else {
    productName = 'Heard First';
    productDesc = 'A&R intel. 48 hours early.';
    unitAmount = '900';
    successUrl = `${origin}/heard-first.html?success=1&session_id={CHECKOUT_SESSION_ID}`;
    cancelUrl = `${origin}/heard-first.html`;
  }

  try {
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(plan === 'pro' ? {
        'mode': 'subscription',
        'line_items[0][price]': 'price_1T5x5hRev2oEsauycwzDuJiO',
        'line_items[0][quantity]': '1',
        'success_url': successUrl,
        'cancel_url': cancelUrl,
        'billing_address_collection': 'auto',
        'allow_promotion_codes': 'true',
      } : {
        'mode': 'subscription',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': productName,
        'line_items[0][price_data][product_data][description]': productDesc,
        'line_items[0][price_data][recurring][interval]': 'month',
        'line_items[0][price_data][unit_amount]': unitAmount,
        'line_items[0][quantity]': '1',
        'success_url': successUrl,
        'cancel_url': cancelUrl,
        'billing_address_collection': 'auto',
        'allow_promotion_codes': 'true',
      }).toString()
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
    console.error('Checkout error:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/api/create-checkout' };
