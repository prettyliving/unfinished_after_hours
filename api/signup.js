/* ============================================================
   api/signup.js — Vercel Serverless Function
   Logs new signups so you can see them in Vercel dashboard
   under Deployments → your deployment → Logs tab.

   You'll see lines like:
     [SIGNUP] name="Alex" email="alex@example.com" time="2025-04-30T..."
     [SIGNIN] email="alex@example.com" time="2025-04-30T..."
   ============================================================ */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  const { type, email, name } = body || {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email required' });
  }

  // Sanitise — only log, never store
  const safeEmail = email.toLowerCase().trim().slice(0, 254);
  const safeName  = (name || '').trim().slice(0, 100);
  const time      = new Date().toISOString();

  if (type === 'signup') {
    console.log(`[SIGNUP] name="${safeName}" email="${safeEmail}" time="${time}"`);
  } else {
    console.log(`[SIGNIN] email="${safeEmail}" time="${time}"`);
  }

  return res.status(200).json({ ok: true });
};
