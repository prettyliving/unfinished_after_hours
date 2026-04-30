/* ============================================================
   Unfinished, After Hours — stripe.js

   Now uses /api/checkout (Stripe Checkout Sessions) instead of
   Payment Links, so coupons/discounts work properly.

   SETUP:
   1. In Vercel → Settings → Environment Variables, add:
        STRIPE_SECRET_KEY        = sk_live_...
        STRIPE_PRICE_PLUS_MONTHLY = price_...
        STRIPE_PRICE_PLUS_YEARLY  = price_...
        STRIPE_PRICE_KIT_GUILT    = price_...
        STRIPE_PRICE_KIT_DEADLINE = price_...
        STRIPE_PRICE_KIT_PLATEAU  = price_...
        STRIPE_PRICE_BUNDLE_KITS  = price_...
        STRIPE_PRICE_THEME_PACK   = price_...
        STRIPE_PRICE_AUDIO_PACK   = price_...
        NEXT_PUBLIC_BASE_URL      = your-domain.com (no https://)

   2. Create coupons in Stripe Dashboard → Coupons.
      Copy the Coupon ID (e.g. "WELCOME20") and pass it to
      openStripeCheckout() as the second argument.

   3. In Stripe Dashboard → your product → set success URL to:
        https://your-domain.com/upgrade.html?success=1
   ============================================================ */

'use strict';

// ── Active coupon codes ──────────────────────────────────────
// Set a coupon ID here to apply it to ALL checkouts sitewide,
// or pass a specific coupon per button (see convenience wrappers).
// Leave as '' to apply no coupon.
var UAH_DEFAULT_COUPON = '';

// ── Core checkout function ───────────────────────────────────
// product  — key from PRICE_IDS in api/checkout.js
// coupon   — Stripe Coupon ID (optional, overrides default)
function openStripeCheckout(product, coupon) {
  var activeCoupon = coupon || UAH_DEFAULT_COUPON || '';
  var u = (typeof getUser === 'function') ? getUser() : {};

  // Show a brief loading state on the button if possible
  var activeBtn = document.activeElement;
  var originalText = '';
  if (activeBtn && activeBtn.tagName === 'BUTTON') {
    originalText = activeBtn.textContent;
    activeBtn.textContent = 'Loading…';
    activeBtn.disabled = true;
  }

  fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product: product,
      coupon:  activeCoupon,
      email:   u.email || ''
    })
  })
  .then(function(r) {
    return r.json().then(function(d) {
      if (!r.ok) throw new Error((d && d.error) ? d.error : 'HTTP ' + r.status);
      return d;
    });
  })
  .then(function(data) {
    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error('No checkout URL returned');
    }
  })
  .catch(function(err) {
    console.error('[stripe] checkout error:', err);
    // Restore button
    if (activeBtn && originalText) {
      activeBtn.textContent = originalText;
      activeBtn.disabled = false;
    }
    // Fallback: let user know something went wrong
    alert('Could not start checkout. Please try again in a moment.');
  });
}

// ── Convenience wrappers (called from HTML buttons) ──────────
// Pass a coupon ID as second arg for product-specific discounts.
// e.g. buyPlusMonthly('WELCOME20')
function buyPlusMonthly(coupon) { openStripeCheckout('plus_monthly', coupon); }
function buyPlusYearly(coupon)  { openStripeCheckout('plus_yearly',  coupon); }
function buyKitGuilt(coupon)    { openStripeCheckout('kit_guilt',    coupon); }
function buyKitDeadline(coupon) { openStripeCheckout('kit_deadline', coupon); }
function buyKitPlateau(coupon)  { openStripeCheckout('kit_plateau',  coupon); }
function buyBundleKits(coupon)  { openStripeCheckout('bundle_kits',  coupon); }
function buyThemePack(coupon)   { openStripeCheckout('theme_pack',   coupon); }
function buyAudioPack(coupon)   { openStripeCheckout('audio_pack',   coupon); }

// ── Post-purchase activation ─────────────────────────────────
// Called from upgrade.html when ?success=1 is in the URL.
function activatePlusMembership() {
  if (typeof getUser !== 'function') return;
  var u = getUser();
  u.plus = true;
  u.plusActivatedAt = Date.now();
  if (typeof setUser === 'function') setUser(u);
}
