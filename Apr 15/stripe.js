/* ============================================================
   Unfinished, After Hours — stripe.js
   Client-side Stripe Checkout integration.

   HOW TO ACTIVATE:
   1. Replace STRIPE_PUBLISHABLE_KEY with your pk_live_... key.
   2. Replace the price IDs (UAH_PRICE_*) with your actual
      Stripe Price IDs from your dashboard.
   3. Deploy a backend that creates Checkout Sessions (see docs
      comment below), or use Stripe Payment Links as a shortcut.

   PRODUCT CATALOGUE:
   ─────────────────────────────────────────────────────────────
   UAH_PRICE_PLUS_MONTHLY  →  After Hours+  $5 / month
   UAH_PRICE_PLUS_YEARLY   →  After Hours+  $45 / year
   UAH_PRICE_KIT_GUILT     →  Productivity Guilt Survival Kit  $7
   UAH_PRICE_KIT_DEADLINE  →  Deadline Season Mode  $10
   UAH_PRICE_KIT_PLATEAU   →  The Burnout Plateau  $12
   UAH_PRICE_BUNDLE_KITS   →  Bundle of 3 Kits  $20
   UAH_PRICE_THEME_PACK    →  Theme Pack (per pack)  $4
   UAH_PRICE_AUDIO_PACK    →  Audio Pack (per pack)  $5

   BACKEND NOTE:
   Stripe requires a server to create Checkout Sessions for
   security. Use Vercel Edge Functions, Netlify Functions,
   or a simple Node/Express API. Example endpoint skeleton:

     POST /api/create-checkout-session
     Body: { priceId, mode: 'payment'|'subscription', successUrl, cancelUrl }
     Returns: { url: 'https://checkout.stripe.com/...' }

   Then replace openStripeCheckout() below with a fetch() to that
   endpoint instead of the direct Stripe.js call shown here.
   ============================================================ */

'use strict';

// ── CONFIGURATION — swap these placeholders ─────────────────
var STRIPE_PUBLISHABLE_KEY = 'pk_test_YOUR_PUBLISHABLE_KEY_HERE';

var UAH_PRICES = {
  plus_monthly:  'price_MONTHLY_PRICE_ID',
  plus_yearly:   'price_YEARLY_PRICE_ID',
  kit_guilt:     'price_KIT_GUILT_ID',
  kit_deadline:  'price_KIT_DEADLINE_ID',
  kit_plateau:   'price_KIT_PLATEAU_ID',
  bundle_kits:   'price_BUNDLE_KITS_ID',
  theme_pack:    'price_THEME_PACK_ID',
  audio_pack:    'price_AUDIO_PACK_ID'
};

// Payment Links (alternative to Checkout Sessions — no backend needed).
// Create these in Stripe Dashboard → Payment Links, then paste here.
// If set, these take priority over Checkout Session flow.
var UAH_PAYMENT_LINKS = {
  plus_monthly:  '',  // e.g. 'https://buy.stripe.com/...'
  plus_yearly:   '',
  kit_guilt:     '',
  kit_deadline:  '',
  kit_plateau:   '',
  bundle_kits:   '',
  theme_pack:    '',
  audio_pack:    ''
};

// ── Stripe loader ───────────────────────────────────────────
var _stripeInstance = null;
function loadStripe(cb) {
  if (_stripeInstance) { cb(_stripeInstance); return; }
  if (window.Stripe) { _stripeInstance = Stripe(STRIPE_PUBLISHABLE_KEY); cb(_stripeInstance); return; }
  var s = document.createElement('script');
  s.src = 'https://js.stripe.com/v3/';
  s.onload = function() { _stripeInstance = Stripe(STRIPE_PUBLISHABLE_KEY); cb(_stripeInstance); };
  document.head.appendChild(s);
}

// ── Core checkout function ──────────────────────────────────
// productKey: one of the keys in UAH_PRICES / UAH_PAYMENT_LINKS
// mode: 'subscription' for recurring, 'payment' for one-time
function openStripeCheckout(productKey, mode) {
  mode = mode || 'payment';

  // If a Payment Link is configured, just redirect there (no backend needed)
  var link = UAH_PAYMENT_LINKS[productKey];
  if (link && link.startsWith('https://')) {
    window.location.href = link;
    return;
  }

  var priceId = UAH_PRICES[productKey];
  if (!priceId || priceId.startsWith('price_') && priceId.length < 20) {
    // Key not yet configured — open upgrade page for now
    window.location.href = 'upgrade.html';
    return;
  }

  var u = (typeof getUser === 'function') ? getUser() : {};
  var baseUrl = window.location.origin + (window.location.pathname.replace(/\/[^/]*$/, '/'));

  loadStripe(function(stripe) {
    // Call your backend to create a session, then redirect
    fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId:    priceId,
        mode:       mode,
        customerEmail: u.email || '',
        successUrl: baseUrl + 'upgrade.html?success=1',
        cancelUrl:  baseUrl + 'upgrade.html?cancelled=1'
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.url) {
        window.location.href = data.url;
      } else if (data.sessionId) {
        stripe.redirectToCheckout({ sessionId: data.sessionId });
      } else {
        console.error('Stripe: no url or sessionId in response', data);
        alert('Something went quiet on our end. Please try again.');
      }
    })
    .catch(function(err) {
      console.error('Stripe checkout error:', err);
      // Graceful fallback — open the upgrade page
      window.location.href = 'upgrade.html';
    });
  });
}

// ── Convenience wrappers (called from HTML) ─────────────────
function buyPlusMonthly() { openStripeCheckout('plus_monthly', 'subscription'); }
function buyPlusYearly()  { openStripeCheckout('plus_yearly',  'subscription'); }
function buyKitGuilt()    { openStripeCheckout('kit_guilt',    'payment'); }
function buyKitDeadline() { openStripeCheckout('kit_deadline', 'payment'); }
function buyKitPlateau()  { openStripeCheckout('kit_plateau',  'payment'); }
function buyBundleKits()  { openStripeCheckout('bundle_kits',  'payment'); }
function buyThemePack()   { openStripeCheckout('theme_pack',   'payment'); }
function buyAudioPack()   { openStripeCheckout('audio_pack',   'payment'); }

// ── Post-purchase: mark user as Plus ───────────────────────
// Called from upgrade.html when ?success=1 param detected.
function activatePlusMembership() {
  if (typeof getUser !== 'function') return;
  var u = getUser();
  u.plus = true;
  u.plusActivatedAt = Date.now();
  if (typeof setUser === 'function') setUser(u);
  // Also persist to localStorage account
  if (u.email) {
    var accounts = {};
    try { accounts = JSON.parse(localStorage.getItem('uah_accounts')||'{}'); } catch(e) {}
    if (accounts[u.email]) {
      accounts[u.email].plus = true;
      try { localStorage.setItem('uah_accounts', JSON.stringify(accounts)); } catch(e) {}
    }
  }
}
