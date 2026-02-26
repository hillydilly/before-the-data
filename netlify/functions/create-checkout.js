/**
 * Netlify Function: POST /api/create-checkout
 * Creates a Stripe checkout session for Heard First ($9/mo)
 */

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const STRIPE_SECRET = 'STRIPE_SECRET_REMOVED';
  const origin = req.headers.get('origin') || 'https://beforethedata.com';

  try {
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'mode': 'subscription',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': 'Heard First',
        'line_items[0][price_data][product_data][description]': 'A&R intel. 48 hours early.',
        'line_items[0][price_data][recurring][interval]': 'month',
        'line_items[0][price_data][unit_amount]': '900',
        'line_items[0][quantity]': '1',
        'success_url': `${origin}/heard-first.html?success=1&session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': `${origin}/heard-first.html`,
        'billing_address_collection': 'auto',
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
