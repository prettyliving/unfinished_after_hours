/* ============================================================
   page-conversation.js
   All scripts loaded via defer in <head> — no inline script
   conflicts, no strict-mode redeclaration crashes.
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {

  // ── Auth guard ─────────────────────────────────────────────
  if (!requireAuth()) return;
  var u = getUser();

  // ── Build system prompt ────────────────────────────────────
  var pn = u.profile || '';
  var profileContext = '';
  if (pn) {
    profileContext =
      ' The user has identified as "' + pn + '".' +
      (pn === 'The Over-Functioner' ? ' They tend to overwork and struggle to rest without guilt.' :
       pn === 'The Spiral Planner'  ? ' They care deeply but struggle with over-planning and perfectionism.' :
       pn === 'The Quiet Quitter'   ? ' They\'ve mentally stepped back but still show up. Reconnection is the goal.' :
       pn === 'The Numb Drifter'    ? ' They feel emotionally flat and overloaded. Gentle, no-pressure responses work best.' : '');
  }

  var SYSTEM_PROMPT =
    'You are the conversational guide inside "Unfinished, After Hours," a burnout support platform.\n\n' +
    'Your role is to help people unpack what they\'re feeling — not fix it. You reflect, you ask, you sit with them.\n\n' +
    'How you respond:\n' +
    '- 2–4 sentences max. Every time. No exceptions.\n' +
    '- Always end with a single question — never two.\n' +
    '- Validate first, then gently explore. Name the feeling before anything else.\n' +
    '- Mirror the user\'s own words back. If they say "stuck", you use "stuck".\n' +
    '- Short sentences. Plain language. No lists, no headers, no structure.\n' +
    '- Never give advice or tell them what to do.\n' +
    '- Avoid: self-care, wellness journey, optimize, crush your goals, toxic positivity, mindset, actionable, "just".\n' +
    '- No slogans. No affirmations. No silver linings.\n\n' +
    'Follow-up questions: zoom in on a specific word or phrase they used. Not "Can you tell me more?" but "What does stuck actually look like for you right now?"\n\n' +
    'Occasionally (sparingly): suggest a reset, journal prompt, unsent letter, or soft to-do — only when the conversation has genuinely led there.\n\n' +
    'If the user mentions self-harm or crisis: warmth first. Then share 988 (call or text) and Crisis Text Line (text HOME to 741741).\n\n' +
    'Never diagnose. Never promise outcomes. Tone: honest, warm, unhurried.' +
    (profileContext ? '\n\nUser context:' + profileContext : '');

  // ── Conversation state ─────────────────────────────────────
  var OPENING = "Hi. You wanted to talk this through. There's no agenda here — just space to think out loud. What's sitting heavy right now?";
  var history = [{ role: 'assistant', content: OPENING }];
  var conversationStarted = false;

  var convoId = sessionStorage.getItem('uah_active_convo_id');
  if (!convoId) {
    convoId = 'convo_' + Date.now();
    sessionStorage.setItem('uah_active_convo_id', convoId);
  }
  function saveConvo() {
    try { localStorage.setItem(convoId, JSON.stringify({ messages: history, updatedAt: Date.now() })); } catch(e) {}
  }

  // ── Session timer ──────────────────────────────────────────
  var isPlus = isPlusMember(u);
  var WARN_MS  = (isPlus ? 50 : 25) * 60 * 1000;
  var PAUSE_MS = (isPlus ? 60 : 30) * 60 * 1000;
  var sessionStart = Date.now();
  var warnShown = false, pauseActive = false;

  setInterval(function() {
    var el = Date.now() - sessionStart;
    if (!warnShown && el >= WARN_MS)  { warnShown = true;  showSessionNotice(); }
    if (!pauseActive && el >= PAUSE_MS) { pauseActive = true; showPauseScreen(); }
  }, 10000);

  function showSessionNotice() {
    var msgs = document.getElementById('messages');
    if (!msgs) return;
    var div = document.createElement('div');
    div.className = 'msg msg-ai session-notice';
    div.innerHTML = '<div class="bubble notice-bubble">You\'ve been here for ' + (isPlus ? 50 : 25) + ' minutes. That\'s a lot of thinking. A pause is here whenever you want it. <button onclick="this.closest(\'.session-notice\').remove()" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:.8rem;margin-left:.5rem;">Dismiss</button></div>';
    msgs.appendChild(div);
    scrollToBottom();
  }

  function showPauseScreen() {
    var input = document.getElementById('chatInput');
    var btn = document.querySelector('.send-btn');
    if (input) input.disabled = true;
    if (btn) btn.disabled = true;
    var msgs = document.getElementById('messages');
    if (!msgs) return;
    var div = document.createElement('div');
    div.className = 'msg msg-ai pause-screen';
    div.innerHTML = '<div class="bubble pause-bubble">' +
      '<p><strong>You\'ve been here for ' + (isPlus ? 60 : 30) + ' minutes.</strong></p>' +
      '<p>Rest. Come back when you\'re ready.</p>' +
      '<div style="display:flex;gap:.75rem;margin-top:1rem;">' +
      '<button onclick="resumeSession()" class="ts-btn ts-btn-yes">Keep going</button>' +
      '<a href="dashboard.html" class="ts-btn ts-btn-no">Go to dashboard</a>' +
      '</div></div>';
    msgs.appendChild(div);
    scrollToBottom();
  }

  window.resumeSession = function() {
    pauseActive = false; warnShown = false;
    sessionStart = Date.now();
    var input = document.getElementById('chatInput');
    var btn = document.querySelector('.send-btn');
    if (input) input.disabled = false;
    if (btn) btn.disabled = false;
    document.querySelectorAll('.pause-screen').forEach(function(el){ el.remove(); });
    appendMessage('ai', 'Welcome back. Pick up wherever feels right.');
    scrollToBottom();
  };

  // ── Send ───────────────────────────────────────────────────
  function sendMessage() {
    var input = document.getElementById('chatInput');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    if (!conversationStarted) {
      if (!checkFreeLimit('convos', 3, 'convo-paywall')) return;
      conversationStarted = true;
    }

    input.value = '';
    input.style.height = 'auto';
    appendMessage('user', text);
    history.push({ role: 'user', content: text });
    showTyping(true);
    scrollToBottom();

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: history
      })
    })
    .then(function(r) {
      return r.json().then(function(data) {
        if (!r.ok) throw new Error((data && data.error) ? data.error : 'HTTP ' + r.status);
        return data;
      });
    })
    .then(function(data) {
      var reply = (data.content && data.content[0] && data.content[0].text)
                  ? data.content[0].text : "I'm here. Take your time.";
      showTyping(false);
      history.push({ role: 'assistant', content: reply });
      saveConvo();
      appendMessage('ai', reply);
      if (history.length === 3) {
        var convos = [];
        try { convos = JSON.parse(sessionStorage.getItem('uah_convos') || '[]'); } catch(e) {}
        convos.unshift({ title: text.length > 50 ? text.slice(0, 50) + '...' : text, date: 'Just now' });
        try { sessionStorage.setItem('uah_convos', JSON.stringify(convos.slice(0, 10))); } catch(e) {}
      }
      var lower = reply.toLowerCase();
      if (lower.indexOf('reset') !== -1 || lower.indexOf('journal') !== -1 ||
          lower.indexOf('unsent') !== -1 || lower.indexOf('to-do') !== -1 || lower.indexOf('todo') !== -1) {
        appendToolSuggestion(lower);
      }
    })
    .catch(function(err) {
      showTyping(false);
      console.error('Chat error:', err);
      appendMessage('ai', "Something went quiet on my end. Want to try again?");
    });

    scrollToBottom();
  }

  // ── Therapist safety card ──────────────────────────────────
  var CRISIS_WORDS = ['therapist','therapy','professional help','psychiatrist','counselor',
    'counselling','counseling','can\'t cope','can\'t handle','falling apart','breaking down',
    'not okay','not ok','hopeless','worthless','nobody cares','give up','no point','end it',
    'hurt myself','self harm','self-harm','suicidal','want to die','988','crisis line'];
  var safetyCardShown = false;

  function checkSafety(text) {
    if (safetyCardShown) return;
    var lower = text.toLowerCase();
    var hit = CRISIS_WORDS.some(function(w) { return lower.indexOf(w) !== -1; });
    if (hit) { safetyCardShown = true; setTimeout(showSafetyCard, 800); }
  }

  function showSafetyCard() {
    if (document.getElementById('safety-card')) return;
    var msgs = document.getElementById('messages');
    if (!msgs) return;
    var card = document.createElement('div');
    card.id = 'safety-card';
    card.className = 'therapist-safety-card';
    card.innerHTML =
      '<div class="tsc-inner">' +
        '<div class="tsc-header"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
        '<span>You don\'t have to do this alone</span></div>' +
        '<p class="tsc-body">What you\'re carrying sounds heavy. A real therapist can offer something I can\'t — consistent, professional support over time.</p>' +
        '<div class="tsc-actions">' +
          '<a class="tsc-btn tsc-btn-primary" href="https://www.psychologytoday.com/us/therapists" target="_blank" rel="noopener">Find a therapist near me</a>' +
          '<a class="tsc-btn tsc-btn-secondary" href="https://www.betterhelp.com" target="_blank" rel="noopener">Try online therapy</a>' +
        '</div>' +
        '<div class="tsc-crisis"><strong>If you\'re in crisis right now:</strong><span>Call or text 988 &nbsp;·&nbsp; Text HOME to 741741</span></div>' +
        '<button class="tsc-dismiss" onclick="document.getElementById(\'safety-card\').remove()">Keep talking here</button>' +
      '</div>';
    msgs.appendChild(card);
    scrollToBottom();
  }

  // ── DOM helpers ────────────────────────────────────────────
  function appendMessage(role, text) {
    var msgs = document.getElementById('messages');
    if (!msgs) return;
    var div = document.createElement('div');
    div.className = 'msg msg-' + role;
    div.innerHTML = '<div class="bubble">' + text.replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>') + '</div>';
    msgs.appendChild(div);
    var sp = document.createElement('div'); sp.className = 'msg-spacer'; msgs.appendChild(sp);
    if (role === 'user') checkSafety(text);
  }

  function appendToolSuggestion(lower) {
    var href = 'resets.html', name = '"You Don\'t Need to Earn Rest"';
    if (lower.indexOf('journal') !== -1)     { href = 'journal.html';  name = 'your journal'; }
    else if (lower.indexOf('unsent') !== -1) { href = 'letters.html'; name = 'Unsent Letters'; }
    else if (lower.indexOf('to-do') !== -1 || lower.indexOf('todo') !== -1) { href = 'todo.html'; name = 'Soft To-Do'; }
    var msgs = document.getElementById('messages');
    if (!msgs) return;
    var wrap = document.createElement('div'); wrap.className = 'tool-suggest';
    var inner = document.createElement('div'); inner.className = 'tool-suggest-inner';
    inner.innerHTML =
      '<span class="tool-suggest-text">There\'s a space called <strong>' + name + '</strong> that might fit right now.</span>' +
      '<div class="tool-suggest-btns">' +
        '<button class="ts-btn ts-btn-yes" onclick="window.location.href=\'' + href + '\'">Try it</button>' +
        '<button class="ts-btn ts-btn-no" onclick="this.closest(\'.tool-suggest\').remove()">Keep talking</button>' +
      '</div>';
    wrap.appendChild(inner); msgs.appendChild(wrap);
  }

  function showTyping(show) { var t = document.getElementById('typing'); if (t) t.classList.toggle('visible', show); }
  function scrollToBottom() { setTimeout(function(){ var m = document.getElementById('messages'); if(m) m.scrollTop = m.scrollHeight; }, 50); }

  // Expose to inline HTML handlers
  window.sendMessage = sendMessage;
  window.handleKey   = function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  window.autoResize  = function(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 130) + 'px'; };
});
