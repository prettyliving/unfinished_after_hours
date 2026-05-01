/* ============================================================
   api/checkout.js — Vercel Serverless Function
   Creates a Stripe Checkout Session with an optional coupon.

   Required env vars in Vercel (Settings → Environment Variables):
     STRIPE_SECRET_KEY   — your Stripe secret key (sk_live_... or sk_test_...)

   Price IDs — get these from Stripe Dashboard → Products → your product → Price ID
   Set them in the PRICE_IDS object below, or pass them as env vars.

   Coupon IDs — create in Stripe Dashboard → Coupons, then paste the ID below.
   ============================================================ */

// ── CONFIGURE THESE ─────────────────────────────────────────
// Paste your Stripe Price IDs here (from Dashboard → Products)
const PRICE_IDS = {
  plus_monthly: process.env.STRIPE_PRICE_PLUS_MONTHLY || '',
  plus_yearly:  process.env.STRIPE_PRICE_PLUS_YEARLY  || '',
  kit_guilt:    process.env.STRIPE_PRICE_KIT_GUILT    || '',
  kit_deadline: process.env.STRIPE_PRICE_KIT_DEADLINE || '',
  kit_plateau:  process.env.STRIPE_PRICE_KIT_PLATEAU  || '',
  bundle_kits:  process.env.STRIPE_PRICE_BUNDLE_KITS  || '',
  theme_pack:   process.env.STRIPE_PRICE_THEME_PACK   || '',
  audio_pack:   process.env.STRIPE_PRICE_AUDIO_PACK   || '',
};

// Which products are subscriptions vs one-time
const SUBSCRIPTION_PRODUCTS = ['plus_monthly', 'plus_yearly'];

// Your site's base URL — used for success/cancel redirects
// Handles whether the env var includes https:// or not
function buildBaseUrl() {
  var raw = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || '';
  if (!raw) return 'https://www.unfinshedafter.com'; // hardcoded fallback
  // Strip any trailing slash
  raw = raw.replace(/\/+$/, '');
  // Add https:// if not already present
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    raw = 'https://' + raw;
  }
  return raw;
}
const BASE_URL = buildBaseUrl();
// ─────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error('[checkout] STRIPE_SECRET_KEY not set');
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  const { product, coupon, email } = body || {};

  if (!product || !PRICE_IDS[product]) {
    return res.status(400).json({ error: 'Invalid or unconfigured product: ' + product });
  }

  const priceId    = PRICE_IDS[product];
  const isRecurring = SUBSCRIPTION_PRODUCTS.includes(product);

  // Build the Checkout Session params
  const params = new URLSearchParams();
  params.append('payment_method_types[]', 'card');
  params.append('line_items[][price]',    priceId);
  params.append('line_items[][quantity]', '1');
  params.append('mode',                  isRecurring ? 'subscription' : 'payment');
  params.append('success_url',           BASE_URL + '/upgrade.html?success=1');
  params.append('cancel_url',            BASE_URL + '/upgrade.html?cancelled=1');

  // Attach coupon/promotion code if provided
  // Stripe uses different keys depending on ID prefix:
  //   promo_... = promotion code  → discounts[][promotion_code]
  //   coupon ID (no prefix)       → discounts[][coupon]
  if (coupon && typeof coupon === 'string' && coupon.trim()) {
    const cleanCoupon = coupon.trim();
    if (cleanCoupon.startsWith('promo_')) {
      params.append('discounts[][promotion_code]', cleanCoupon);
    } else {
      params.append('discounts[][coupon]', cleanCoupon);
    }
    console.log(`[checkout] discount applied: "${cleanCoupon}" for product "${product}"`);
  }

  // Pre-fill email if we have it
  if (email && typeof email === 'string') {
    params.append('customer_email', email.toLowerCase().trim().slice(0, 254));
  }

  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(stripeKey + ':').toString('base64'),
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[checkout] Stripe error:', JSON.stringify(data));
      return res.status(response.status).json({
        error: (data.error && data.error.message) || 'Stripe error'
      });
    }

    console.log(`[checkout] session created: product="${product}" coupon="${coupon || 'none'}" session="${data.id}"`);
    return res.status(200).json({ url: data.url });

  } catch (err) {
    console.error('[checkout] fetch error:', err.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
