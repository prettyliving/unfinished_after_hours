/**
 * Unfinished, After Hours — Stripe Backend
 * ─────────────────────────────────────────
 * Node / Express server that creates Checkout Sessions
 * and handles Stripe webhooks for all UAH products.
 *
 * SETUP:
 *   1. cp .env.example .env  → fill in your keys
 *   2. npm install
 *   3. node server.js
 *
 * Deploy to Vercel, Railway, Render, or any Node host.
 */

'use strict';

require('dotenv').config();

const express  = require('express');
const stripe   = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path     = require('path');

const app = express();

// ── Webhook route MUST use raw body — register BEFORE express.json() ──
app.post(
  '/api/webhook',
  express.raw({ type: 'application/json' }),
  handleWebhook
);

// ── All other routes get JSON body parsing ─────────────────────────────
app.use(express.json());

// Serve the static front-end files from the same directory
app.use(express.static(path.join(__dirname)));

// ── Product catalogue ──────────────────────────────────────────────────
// Map each product key → { priceEnvVar, mode }
// Price IDs are read from .env so no secrets live in source code.
const PRODUCTS = {
  plus_monthly: { priceEnv: 'STRIPE_PRICE_PLUS_MONTHLY', mode: 'subscription' },
  plus_yearly:  { priceEnv: 'STRIPE_PRICE_PLUS_YEARLY',  mode: 'subscription' },
  kit_guilt:    { priceEnv: 'STRIPE_PRICE_KIT_GUILT',    mode: 'payment' },
  kit_deadline: { priceEnv: 'STRIPE_PRICE_KIT_DEADLINE', mode: 'payment' },
  kit_plateau:  { priceEnv: 'STRIPE_PRICE_KIT_PLATEAU',  mode: 'payment' },
  bundle_kits:  { priceEnv: 'STRIPE_PRICE_BUNDLE_KITS',  mode: 'payment' },
  theme_pack:   { priceEnv: 'STRIPE_PRICE_THEME_PACK',   mode: 'payment' },
  audio_pack:   { priceEnv: 'STRIPE_PRICE_AUDIO_PACK',   mode: 'payment' },
};

// ── POST /api/create-checkout-session ─────────────────────────────────
app.post('/api/create-checkout-session', async (req, res) => {
  const { priceId, mode, productKey, customerEmail, successUrl, cancelUrl } = req.body;

  try {
    // Resolve price ID: prefer explicit priceId from client,
    // fall back to env-based lookup via productKey.
    let resolvedPrice = priceId;
    if (!resolvedPrice && productKey) {
      const product = PRODUCTS[productKey];
      if (!product) {
        return res.status(400).json({ error: `Unknown product key: ${productKey}` });
      }
      resolvedPrice = process.env[product.priceEnv];
    }

    if (!resolvedPrice) {
      return res.status(400).json({ error: 'No price ID provided or configured.' });
    }

    // Determine mode — client can pass it directly, or we infer from catalogue
    let resolvedMode = mode;
    if (!resolvedMode && productKey && PRODUCTS[productKey]) {
      resolvedMode = PRODUCTS[productKey].mode;
    }
    resolvedMode = resolvedMode || 'payment';

    const origin = process.env.APP_URL || (req.headers.origin || `${req.protocol}://${req.headers.host}`);

    const sessionParams = {
      line_items: [{ price: resolvedPrice, quantity: 1 }],
      mode: resolvedMode,
      success_url: successUrl || `${origin}/upgrade.html?success=1`,
      cancel_url:  cancelUrl  || `${origin}/upgrade.html?cancelled=1`,
      automatic_tax: { enabled: true },
      // Store the product key in metadata so webhooks can act on it
      metadata: { productKey: productKey || '' },
    };

    // Pre-fill email if available (improves conversion)
    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    // For subscriptions, allow promotion codes
    if (resolvedMode === 'subscription') {
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.json({ url: session.url, sessionId: session.id });

  } catch (err) {
    console.error('Stripe checkout session error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/webhook ──────────────────────────────────────────────────
// Receives Stripe events and activates Plus memberships server-side.
// In a real app, you'd persist this to a database instead of just logging.
async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {

    // ── One-time payment completed ─────────────────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object;
      const email   = session.customer_details?.email;
      const key     = session.metadata?.productKey;

      if (session.payment_status === 'paid') {
        console.log(`✔ Payment complete — ${email} bought: ${key || session.id}`);
        // TODO: persist to your database, e.g.:
        //   await db.orders.create({ email, productKey: key, sessionId: session.id });
      }
      break;
    }

    // ── Subscription activated or renewed ─────────────────────────────
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub    = event.data.object;
      const custId = sub.customer;

      if (sub.status === 'active') {
        const customer = await stripe.customers.retrieve(custId);
        const email    = customer.email;
        const isYearly = sub.items.data.some(i =>
          i.price.id === process.env.STRIPE_PRICE_PLUS_YEARLY
        );
        console.log(`✔ Subscription active — ${email}, yearly=${isYearly}`);
        // TODO: set plus=true in your user database for this email
        //   await db.users.update({ email }, { plus: true, planYearly: isYearly });
      }
      break;
    }

    // ── Subscription cancelled or payment failed ───────────────────────
    case 'customer.subscription.deleted': {
      const sub      = event.data.object;
      const customer = await stripe.customers.retrieve(sub.customer);
      const email    = customer.email;
      console.log(`✘ Subscription cancelled — ${email}`);
      // TODO: revoke Plus access in your database
      //   await db.users.update({ email }, { plus: false });
      break;
    }

    default:
      // Ignore unhandled event types
      break;
  }

  res.json({ received: true });
}

// ── Start ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`Unfinished, After Hours — server running on http://localhost:${PORT}`);
});
