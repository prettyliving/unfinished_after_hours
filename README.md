# Unfinished, After Hours

> A burnout and stress support platform that validates how you feel — not just tells you to breathe.

---

## Project Overview

**Unfinished, After Hours** is a web-based wellness platform designed to support students and workers experiencing burnout. Unlike typical wellness apps, the platform treats burnout as a natural human response rather than a productivity problem to solve. The design and content philosophy centers on genuine validation, adaptive personalization, and the deliberate avoidance of toxic positivity and hustle culture messaging.

This project originated as a class concept with real-world application in mind.

---

## Core Features

All features below are fully implemented and live.

- **Onboarding Quiz** — Multi-step intake flow that assigns users one of four burnout profiles and personalizes the entire experience (colors, prompts, tone) based on their answers
- **Dashboard** — Personalized home screen with profile-aware greeting, journal prompt widget, and upgrade banner for free users
- **Have a Conversation** — CBT-informed AI chat powered by Claude (Anthropic API). Validates emotions, follows natural conversation phases, detects crisis language, and organically routes users to relevant tools. Free tier limited to 3 conversations per session
- **Crisis Detection** — Conversation feature detects self-harm language and responds with warmth plus 988 Lifeline and Crisis Text Line (text HOME to 741741)
- **Resets** — Library of 9 guided micro-resets (2–5 min) across four categories: Body, Mind, Guilt Disruptors, and Movement. Includes in-page modal with step-by-step instructions and a live countdown timer. Free tier limited to 3 resets per session
- **Journal Space** — Rotating profile-personalized journal prompts with a writing area, word counter, and saved entry history. Free tier limited to 1 save per session
- **Unsent Letters** — Private writing space with 8 recipient archetypes (e.g. "My burnout," "My inner critic"). Saves letters to an in-session vault. No audience, no send button
- **Soft To-Do** — Two-column task list (Must Do / Could Do) with a single-use "That's Enough" button that marks one task as sufficient for the day
- **Adaptive Theming** — Color palette dynamically adjusts across all pages based on the user's quiz-selected color swatches, with contrast-safe accent generation
- **Freemium / Upgrade Flow** — Upgrade page with monthly ($5) and yearly ($45) After Hours+ plans plus three à-la-carte tool kits. Stripe Checkout integration scaffolded and ready for live keys


---

## File Structure

```
├── index.html              # Landing page (auto-redirects returning users to dashboard)
├── quiz.html               # Onboarding quiz — profile assignment + account creation
├── dashboard.html          # Main home screen post-login
├── conversation.html       # AI chat feature (inline logic, no external page script)
├── resets.html             # Micro-reset library
├── journal.html            # Journal space
├── letters.html            # Unsent letters
├── todo.html               # Soft to-do list
├── upgrade.html            # Upgrade / pricing page
├── contact.html            # Contact page
├── profile.html            # User profile
├── privacy.html            # Privacy policy
├── kit-bundle.html         # Bundle kit product page
├── kit-deadline.html       # Deadline kit product page
├── kit-guilt.html          # Guilt kit product page
├── kit-plateau.html        # Plateau kit product page
├── pack-audio.html         # Audio pack product page
├── pack-theme.html         # Theme pack product page
├── css/
│   └── base.css            # Shared design system (colors, layout, components)
├── js/
│   ├── main.js             # Shared utilities: session, theme engine, auth guard, toast
│   ├── mobile-nav.js       # Mobile bottom nav bar (injected on authenticated pages)
│   ├── stripe.js           # Stripe Checkout integration
│   ├── page-conversation.js# Conversation logic (alt external version — inline is active)
│   ├── page-dashboard.js   # Dashboard personalization
│   ├── page-journal.js     # Journal prompts + entry saving
│   ├── page-letters.js     # Unsent letters logic
│   ├── page-resets.js      # Reset library, modal, and countdown timer
│   ├── page-todo.js        # Soft to-do list logic
│   └── server.js           # Local dev server
├── api/
│   ├── chat.js             # Vercel serverless: Anthropic Claude proxy
│   ├── checkout.js         # Vercel serverless: Stripe Checkout session creator
│   └── signup.js           # Vercel serverless: account signup
└── samples/
    ├── kit-deadline-sample.pdf
    ├── kit-guilt-sample.pdf
    ├── kit-plateau-sample.pdf
    └── theme-test.html
```
---

## Design System

The platform uses a seven-color psychological palette and a dual-typeface system. All values are defined as CSS custom properties in `base.css` and are overridden dynamically via the adaptive theme engine.

| Role | Value |
|------|-------|
| Primary Typeface | Cormorant Garamond |
| Secondary Typeface | DM Sans |
| `--plum` | Deep plum — authority without aggression |
| `--coral` | Muted coral — human, not alarming |
| `--lavender` | Soft lavender — secondary accents |
| `--blush` | Blush — active/selected states |
| `--muted` | Muted purple-grey — supporting text |
| `--sage` | Sage green — success/confirmation states |
| `--warm-white` | Off-white background — easy on the eyes |

Design principle: every visual choice is made with psychological intent for users in a vulnerable state.

---
## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript — no build tools or frameworks required
- **AI:** Anthropic Claude API (Still working it out) — conversation feature
- **Payments:** Stripe Checkout (scaffolded — requires live keys and backend endpoint to activate)
- **Session Storage:** `sessionStorage` for in-session data; `localStorage` for account persistence across sessions
- **Hosting:** Vercel (continuous deployment from GitHub)
- **Domain:** Managed via Namecheap, pointed to Vercel

---

## Domain & Hosting

| Field | Details |
|-------|---------|
| **Domain** | `unfinishedafter.com` |
| **Registered** | February 23rd, 2026 |
| **Renewal** | Auto-renews |
| **Registrar** | Namecheap |
| **Hosting** | Vercel |

---

## Setup & Deployment

```

### Deploying to Vercel

1. Push changes to your connected GitHub repository
2. Vercel automatically detects and deploys on each push to `main`
3. Custom domain (`unfinishedafter.com`) is configured in Vercel → Settings → Domains

### Connecting Domain (Namecheap → Vercel)

1. In **Vercel**, go to your project → Settings → Domains → Add `unfinishedafter.com`
2. In **Namecheap**, update the DNS records:
   - Add an **A Record** pointing `@` → Vercel's IP (`76.76.21.21`)
   - Add a **CNAME Record** pointing `www` → `cname.vercel-dns.com`
3. DNS propagation typically takes up to 48 hours

### Activating Stripe Payments

1. Open `stripe.js`
2. Replace `STRIPE_PUBLISHABLE_KEY` with your `pk_live_...` key
3. Replace price IDs in `UAH_PRICES` with your actual Stripe Price IDs
4. Deploy a backend endpoint at `POST /api/create-checkout-session` (see comment block in `stripe.js` for the expected request/response shape), or use Stripe Payment Links as a no-backend alternative

---

## Project Status

| Component | Status |
|-----------|--------|
| Landing / Sign-in Page | ✅ Complete |
| Onboarding Quiz | ✅ Complete |
| Dashboard | ✅ Complete |
| Have a Conversation (AI) | ✅ Complete |
| Crisis Detection | ✅ Complete |
| Resets Library | ✅ Complete |
| Journal Space | ✅ Complete |
| Unsent Letters | ✅ Complete |
| Soft To-Do | ✅ Complete |
| Upgrade / Pricing Page | ✅ Complete |
| Stripe Integration | ⚙️ Scaffolded — awaiting live keys |
| Backend (Checkout Sessions) | 📋 Planned |
| Persistent Database (cross-device) | 📋 Planned |

---

## Business Context

- **Target Audience:** Students and workers experiencing burnout
- **Differentiator:** Validation-first approach vs. fix-it productivity framing
- **Model:** Freemium — free access with session-based limits; After Hours+ ($5/mo or $45/yr) removes limits and unlocks personalization; optional à-la-carte tool kits ($7–$20)
- **Academic Context:** Class project — Alicia (individual contributor, research & design lead)

---

## User Research

Google Form used for early user feedback:
https://docs.google.com/forms/d/e/1FAIpQLSf5U1S8wguBUfuruJwsVuOsboKQJA6jzFHAk2HVqcoeipgSCg/viewform?usp=header

---

*Built with care for people who are running on empty.*
