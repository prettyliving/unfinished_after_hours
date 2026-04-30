/* ============================================================
   Unfinished, After Hours — stripe.js
   UPDATED: Uses Payment Links (no backend needed).

   SETUP — 3 steps:
   1. Go to Stripe Dashboard → Payment Links → Create link
   2. Create one link per product (see catalogue below)
   3. Paste each link URL into UAH_PAYMENT_LINKS below
   ============================================================

   PRODUCT CATALOGUE:
   ─────────────────────────────────────────────────────────────
   plus_monthly  →  After Hours+  $5 / month  (recurring)
   plus_yearly   →  After Hours+  $45 / year  (recurring)
   kit_guilt     →  Productivity Guilt Survival Kit  $7  (one-time)
   kit_deadline  →  Deadline Season Mode  $10  (one-time)
   kit_plateau   →  The Burnout Plateau  $12  (one-time)
   bundle_kits   →  Bundle of 3 Kits  $20  (one-time)
   theme_pack    →  Theme Pack  $4  (one-time)
   audio_pack    →  Audio Pack  $5  (one-time)
   ============================================================ */

'use strict';

// ── PASTE YOUR STRIPE PAYMENT LINK URLs HERE ────────────────
// Format: 'https://buy.stripe.com/...'
// Leave as '' if not yet created — button will go to upgrade.html
var UAH_PAYMENT_LINKS = {
  plus_monthly:  'https://buy.stripe.com/fZu7sK6706hGb1Z7WPfAc01',
  plus_yearly:   'https://buy.stripe.com/aFaaEW9jcfSg8TR3GzfAc00',
  kit_guilt:     'https://buy.stripe.com/28EcN46707lKeebeldfAc02',
  kit_deadline:  'https://buy.stripe.com/fZu5kC52WbC0fifdh9fAc03',
  kit_plateau:   'https://buy.stripe.com/cNidR81QKdK88TR90TfAc04',
  bundle_kits:   'https://buy.stripe.com/dRmbJ0brk9tS3zxeldfAc05',
  theme_pack:    'https://buy.stripe.com/aFa7sKeDw5dCb1Z6SLfAc06',
  audio_pack:    'https://buy.stripe.com/8x24gydzs0Xmda75OHfAc07'
};

// ── AFTER-PURCHASE: tell Stripe to redirect here ─────────────
// In each Payment Link settings → set "Confirmation page" to:
//   Redirect to: https://YOUR_DOMAIN/upgrade.html?success=1
// The activatePlusMembership() function below handles that URL.
// ─────────────────────────────────────────────────────────────

// ── Core checkout function ──────────────────────────────────
function openStripeCheckout(productKey) {
  var link = UAH_PAYMENT_LINKS[productKey];

  if (link && link.startsWith('https://')) {
    window.location.href = link;
    return;
  }

  // Not yet configured — send to upgrade page
  window.location.href = 'upgrade.html';
}

// ── Convenience wrappers (called from HTML buttons) ─────────
function buyPlusMonthly() { openStripeCheckout('plus_monthly'); }
function buyPlusYearly()  { openStripeCheckout('plus_yearly');  }
function buyKitGuilt()    { openStripeCheckout('kit_guilt');    }
function buyKitDeadline() { openStripeCheckout('kit_deadline'); }
function buyKitPlateau()  { openStripeCheckout('kit_plateau');  }
function buyBundleKits()  { openStripeCheckout('bundle_kits');  }
function buyThemePack()   { openStripeCheckout('theme_pack');   }
function buyAudioPack()   { openStripeCheckout('audio_pack');   }

// ── Post-purchase activation ─────────────────────────────────
// Called from upgrade.html when ?success=1 is in the URL.
// Marks the current session as Plus. NOTE: this is client-side
// only — see setup guide for the webhook approach.
function activatePlusMembership() {
  if (typeof getUser !== 'function') return;
  var u = getUser();
  u.plus = true;
  u.plusActivatedAt = Date.now();
  if (typeof setUser === 'function') setUser(u);
  // account lookup by email removed for privacy
}
