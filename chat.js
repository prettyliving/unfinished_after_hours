/* ============================================================
   api/chat.js  —  Vercel Serverless Function
   Proxies requests to the Anthropic API so your API key
   never touches the browser.

   Deploy path: /api/chat
   Called from: page-conversation.js  →  fetch('/api/chat', ...)
   ============================================================ */

export default async function handler(req, res) {
  /* ── Only allow POST ── */
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  /* ── Basic origin check (optional but recommended) ──────
     Uncomment and set YOUR_DOMAIN once you have a real domain.
     This stops other sites from using your proxy.

  const origin = req.headers.origin || '';
  const allowed = ['https://YOUR_DOMAIN.com', 'https://www.YOUR_DOMAIN.com'];
  if (!allowed.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  ───────────────────────────────────────────────────────── */

  const { model, max_tokens, system, messages } = req.body;

  /* ── Validate payload ── */
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  /* ── Rate limit: max 20 messages per conversation ──
     Keeps runaway sessions from burning your quota.     */
  if (messages.length > 40) {
    return res.status(429).json({ error: 'Conversation too long. Please start a new one.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'x-api-key':            process.env.ANTHROPIC_API_KEY,  // ← set in Vercel dashboard
        'anthropic-version':    '2023-06-01',
      },
      body: JSON.stringify({
        model:      model      || 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || 1000,
        system:     system     || '',
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Forward Anthropic's error status without leaking internal details
      return res.status(response.status).json({
        error: data?.error?.message || 'API error',
      });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
