# Stripe Payment Link Redirect Setup

After a user completes payment, Stripe needs to redirect them back to the app so their membership activates. Do this once per payment link.

## Steps (repeat for all 8 links)

1. Go to [Stripe Dashboard → Payment Links](https://dashboard.stripe.com/payment-links)
2. Click on a payment link to open it
3. Click **Edit**
4. Scroll to **"After payment"** section
5. Set **Confirmation page** to: **"Redirect customers to your website"**
6. Enter this URL:
   ```
   https://unfinishedafter.com/upgrade.html?success=1
   ```
7. Click **Save**

## Your 8 Payment Links to Update

| Product | Key |
|---------|-----|
| After Hours+ Monthly ($5/mo) | plus_monthly |
| After Hours+ Yearly ($45/yr) | plus_yearly |
| Productivity Guilt Survival Kit ($7) | kit_guilt |
| Deadline Season Mode ($10) | kit_deadline |
| The Burnout Plateau ($12) | kit_plateau |
| Bundle of 3 Kits ($20) | bundle_kits |
| Theme Pack ($4) | theme_pack |
| Audio Pack ($5) | audio_pack |

## Testing

After setting redirects, test with a Stripe test-mode payment link if you have one, or do a real $5 purchase and verify you land on `upgrade.html?success=1` and see the "you're now a member" confirmation.
