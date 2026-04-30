/* ============================================================
   api/chat.js  —  Vercel Serverless Function

   FIXES applied:
   1. CommonJS module.exports (was "export default" — caused
      a silent 500 on every single API call).
   2. system array with cache_control stripped → joined to
      plain string. Caching requires a special Anthropic plan;
      sending cache_control without it returns a 400.
   3. Explicit JSON body parsing fallback.
   4. console.error on failures so Vercel logs show the cause.
   ============================================================ */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Vercel usually auto-parses JSON; this handles the edge case where it doesn't
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Missing request body' });
  }

  const { model, max_tokens, system, messages } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' });
  }
  if (messages.length > 40) {
    return res.status(429).json({ error: 'Conversation too long' });
  }

  // Normalise system prompt: strip cache_control blocks (not supported on all
  // plans) and join array of text blocks into a plain string.
  let systemValue = '';
  if (Array.isArray(system)) {
    systemValue = system
      .filter(function(b) { return b && b.type === 'text' && b.text; })
      .map(function(b) { return b.text; })
      .join('\n\n');
  } else if (typeof system === 'string') {
    systemValue = system;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-haiku-4-5-20251001',
        max_tokens: max_tokens || 1000,
        system: systemValue,
        messages: messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic API error', response.status, JSON.stringify(data));
      return res.status(response.status).json({
        error: (data && data.error && data.error.message) || 'Anthropic API error',
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Proxy fetch error:', err.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
