# Unfinished, After Hours — Stripe Setup Guide

## What was added

| File | Purpose |
|---|---|
| `server.js` | Express backend — creates Checkout Sessions, handles webhooks |
| `package.json` | Node dependencies (stripe, express, dotenv) |
| `.env.example` | All environment variables you need to fill in |
| `.gitignore` | Keeps `.env` and `node_modules` out of git |
| `stripe.js` *(updated)* | Now sends `productKey` to backend so price IDs stay server-side |

---

## Quick-start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Open `.env` and fill in:
- `STRIPE_SECRET_KEY` — from [Stripe Dashboard → API keys](https://dashboard.stripe.com/apikeys)
- `STRIPE_PUBLISHABLE_KEY` — same page (also paste into `stripe.js` line 40)
- All `STRIPE_PRICE_*` values — from [Stripe Dashboard → Products](https://dashboard.stripe.com/products)

### 3. Create your Stripe products

In the Stripe Dashboard, create these products and paste the **Price IDs** into `.env`:

| Product | Type | Price |
|---|---|---|
| After Hours+ Monthly | Recurring | $5/month |
| After Hours+ Yearly | Recurring | $45/year |
| Productivity Guilt Survival Kit | One-time | $7 |
| Deadline Season Mode | One-time | $10 |
| The Burnout Plateau | One-time | $12 |
| Bundle of 3 Kits | One-time | $20 |
| Theme Pack | One-time | $4 |
| Audio Pack | One-time | $5 |

### 4. Set up webhooks

**For local development:**
```bash
# Install Stripe CLI, then:
stripe listen --forward-to localhost:4242/api/webhook
# Copy the whsec_... secret it prints into .env as STRIPE_WEBHOOK_SECRET
```

**For production:** Add `https://yourdomain.com/api/webhook` in [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks).

Subscribe to these events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### 5. Run the server
```bash
npm start
# or for auto-restart during dev:
npm run dev
```

Visit `http://localhost:4242/upgrade.html` — all buy buttons are now live.

---

## How the payment flow works

```
User clicks buy → stripe.js → POST /api/create-checkout-session
  → server creates Stripe session → returns { url }
  → stripe.js redirects to Stripe Checkout
  → User pays → Stripe redirects to upgrade.html?success=1
  → activatePlusMembership() marks user as Plus in localStorage
  → Stripe also fires webhook → server confirms payment server-side
```

---

## Production checklist

- [ ] Switch `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` from `sk_test_` / `pk_test_` to live keys
- [ ] Update `APP_URL` in `.env` to your real domain
- [ ] Deploy webhook endpoint and add to Stripe Dashboard
- [ ] Add database persistence in the webhook handler `TODO` blocks in `server.js`
- [ ] Enable HTTPS on your server
- [ ] Set `STRIPE_WEBHOOK_SECRET` to the production webhook secret

---

## Optional: Payment Links (no backend needed)

If you'd rather skip the backend entirely, create Payment Links in Stripe Dashboard and paste the `https://buy.stripe.com/...` URLs directly into the `UAH_PAYMENT_LINKS` object in `stripe.js`. The client will redirect straight there, bypassing the server entirely.
