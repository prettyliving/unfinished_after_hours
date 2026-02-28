# Unfinished, After Hours

> A burnout and stress support platform that validates how you feel — not just tells you to breathe.

---

## Project Overview

**Unfinished, After Hours** is a web-based wellness platform designed to support students and workers experiencing burnout. Unlike typical wellness apps, the platform treats burnout as a natural human response rather than a productivity problem to solve. The design and content philosophy centers on genuine validation, adaptive personalization, and the deliberate avoidance of toxic positivity and hustle culture messaging.

This project originated as a class concept with real-world application in mind.

---

## Core Features

- **Onboarding Quiz** — A streamlined intake flow that personalizes the experience from the start
- **Have a Conversation** — A CBT-informed chat feature that helps users identify thoughts and emotions, then organically routes them to relevant tools
- **Unsent Letters** — A private, unmoderated space for processing feelings through writing without an audience
- **Adaptive Tool Routing** — Tools surface naturally through conversation rather than rigid categorization
- **Crisis Detection** — Safety protocols built into the conversation flow

---

## Design System

The platform uses a seven-color psychological palette and a dual-typeface system:

| Role | Value |
|------|-------|
| Primary Typeface | Cormorant Garamond |
| Secondary Typeface | DM Sans |
| Signature Color | Deep Plum — authority without aggression |
| CTA Color | Muted Coral — human, not alarming |

Design principle: every visual choice is made with psychological intent for users in a vulnerable state.

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

## Tech Stack

- **Frontend:** HTML / CSS (web-only scope)
- **Hosting:** Vercel (continuous deployment)
- **Domain:** Managed via Namecheap, pointed to Vercel

---

## Setup & Deployment

```

### Deploying to Vercel

1. Push changes to your connected GitHub repository
2. Vercel will automatically detect and deploy on each push to `main`
3. Custom domain (`unfinishedafter.com`) is configured in Vercel's domain settings

### Connecting Domain (Namecheap → Vercel)

1. In **Vercel**, go to your project → Settings → Domains → Add `unfinishedafter.com`
2. In **Namecheap**, update the DNS records:
   - Add an **A Record** pointing `@` → Vercel's IP (`76.76.21.21`)
   - Add a **CNAME Record** pointing `www` → `cname.vercel-dns.com`
3. DNS propagation typically takes up to 48 hours

---

## Project Status

| Component | Status |
|-----------|--------|
| Landing / Coming Soon Page | ✅ Complete |
| Onboarding Quiz | 📋 Planned |
| Conversation Feature | 📋 Planned |
| Unsent Letters | 📋 Planned |

---

## Business Context

- **Target Audience:** Students and workers experiencing burnout
- **Differentiator:** Validation-first approach vs. fix-it productivity framing
- **Model:** Freemium with premium personalization features
- **Academic Context:** Class project — Alicia (individual contributor, research & design lead)

---

*Built with care for people who are running on empty.*
