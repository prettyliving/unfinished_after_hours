/* Tests for api/chat.js — Vercel serverless handler */
const handler = require('../api/chat');

function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.headers = {};
  res.body = null;
  res.setHeader = (k, v) => { res.headers[k] = v; return res; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  res.end = () => res;
  return res;
}

describe('api/chat handler', () => {
  test('OPTIONS request returns 200', async () => {
    const req = { method: 'OPTIONS', body: {} };
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
  });

  test('non-POST method returns 405', async () => {
    const req = { method: 'GET', body: {} };
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toMatch(/Method not allowed/i);
  });

  test('missing messages returns 400', async () => {
    const req = { method: 'POST', body: { model: 'claude-haiku-4-5-20251001' } };
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  test('empty messages array returns 400', async () => {
    const req = { method: 'POST', body: { messages: [] } };
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  test('missing body returns 400', async () => {
    const req = { method: 'POST', body: null };
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  test('invalid JSON string body returns 400', async () => {
    const req = { method: 'POST', body: 'not-json' };
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  test('messages array longer than 40 returns 429', async () => {
    const msgs = Array.from({ length: 41 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: 'msg ' + i,
    }));
    const req = { method: 'POST', body: { messages: msgs } };
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(429);
  });

  test('valid request with mocked fetch returns 200', async () => {
    const mockData = { content: [{ type: 'text', text: 'Hello' }] };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    });

    const req = {
      method: 'POST',
      body: {
        model: 'claude-haiku-4-5-20251001',
        messages: [{ role: 'user', content: 'Hi' }],
        system: 'You are a guide.',
      },
    };
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockData);
    delete global.fetch;
  });

  test('Anthropic API error propagates status code', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Invalid API key' } }),
    });

    const req = {
      method: 'POST',
      body: { messages: [{ role: 'user', content: 'Hi' }] },
    };
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
    delete global.fetch;
  });

  test('CORS headers are set on all responses', async () => {
    const req = { method: 'GET', body: {} };
    const res = mockRes();
    await handler(req, res);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
  });
});
