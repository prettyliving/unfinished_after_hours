/* page-conversation.js — loaded at bottom of body after main.js/stripe.js/mobile-nav.js */

(function() {

  // ── Auth ─────────────────────────────────────────────────────
  var u = getUser();
  if (!u || !u.name) {
    window.location.href = 'quiz.html';
    return;
  }

  // ── System prompt ─────────────────────────────────────────────
  var pn = u.profile || '';
  var profileCtx = pn ? (
    ' The user has identified as "' + pn + '".' +
    (pn === 'The Over-Functioner' ? ' They tend to overwork and struggle to rest without guilt.' :
     pn === 'The Spiral Planner'  ? ' They care deeply but struggle with over-planning and perfectionism.' :
     pn === 'The Quiet Quitter'   ? ' They\'ve mentally stepped back but still show up. Reconnection is the goal.' :
     pn === 'The Numb Drifter'    ? ' They feel emotionally flat and overloaded. Gentle, no-pressure responses work best.' : '')
  ) : '';

  var SYSTEM =
    'You are the conversational guide inside "Unfinished, After Hours," a burnout support platform. ' +
    'Your role: help people unpack what they\'re feeling — not fix it. Reflect, ask, sit with them. ' +
    'Rules: 2–4 sentences max, always end with one question, validate first then gently explore, ' +
    'mirror their words, plain language, no advice, no lists, no headers. ' +
    'Never say: self-care, wellness journey, optimize, mindset, actionable. ' +
    'If they mention self-harm or crisis: warmth first, then share 988 and Crisis Text Line (text HOME to 741741). ' +
    'Tone: honest, warm, unhurried.' +
    (profileCtx ? ' ' + profileCtx : '');

  // ── State ─────────────────────────────────────────────────────
  var history = [
    { role: 'assistant', content: "Hi. You wanted to talk this through. There's no agenda here — just space to think out loud. What's sitting heavy right now?" }
  ];
  var started = false;

  var convoId = sessionStorage.getItem('uah_active_convo_id') || ('convo_' + Date.now());
  sessionStorage.setItem('uah_active_convo_id', convoId);

  // ── DOM refs ──────────────────────────────────────────────────
  var inputEl  = document.getElementById('chatInput');
  var sendBtn  = document.getElementById('sendBtn');
  var msgsEl   = document.getElementById('messages');
  var typingEl = document.getElementById('typing');

  if (!inputEl || !sendBtn || !msgsEl) {
    console.error('UAH: required DOM elements missing');
    return;
  }

  // ── Event listeners (no inline onclick needed) ────────────────
  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  inputEl.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 130) + 'px';
  });

  // ── Send ──────────────────────────────────────────────────────
  function sendMessage() {
    var text = inputEl.value.trim();
    if (!text) return;

    // Free tier gate — once per session
    if (!started) {
      if (!checkFreeLimit('convos', 3, 'convo-paywall')) return;
      started = true;
    }

    inputEl.value = '';
    inputEl.style.height = 'auto';
    addMsg('user', text);
    history.push({ role: 'user', content: text });
    setTyping(true);
    scroll();

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1000, system: SYSTEM, messages: history })
    })
    .then(function(r) {
      return r.json().then(function(d) {
        if (!r.ok) throw new Error((d && d.error) ? d.error : 'HTTP ' + r.status);
        return d;
      });
    })
    .then(function(data) {
      var reply = (data.content && data.content[0] && data.content[0].text) || "I'm here. Take your time.";
      setTyping(false);
      history.push({ role: 'assistant', content: reply });
      try { localStorage.setItem(convoId, JSON.stringify({ messages: history, updatedAt: Date.now() })); } catch(e) {}
      addMsg('ai', reply);
      // Tool suggestion if Claude mentions one
      var low = reply.toLowerCase();
      if (low.indexOf('reset') !== -1 || low.indexOf('journal') !== -1 || low.indexOf('unsent') !== -1 || low.indexOf('to-do') !== -1) {
        addToolCard(low);
      }
    })
    .catch(function(err) {
      setTyping(false);
      console.error('Chat error:', err);
      addMsg('ai', 'Something went quiet on my end. Want to try again?');
    });
  }

  // ── Helpers ───────────────────────────────────────────────────
  function addMsg(role, text) {
    var div = document.createElement('div');
    div.className = 'msg msg-' + role;
    div.innerHTML = '<div class="bubble">' + text.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>') + '</div>';
    msgsEl.appendChild(div);
    var sp = document.createElement('div'); sp.className = 'msg-spacer'; msgsEl.appendChild(sp);
    checkSafety(text, role);
    scroll();
  }

  function addToolCard(low) {
    var href = 'resets.html', name = '"You Don\'t Need to Earn Rest"';
    if (low.indexOf('journal') !== -1)     { href = 'journal.html';  name = 'your journal'; }
    else if (low.indexOf('unsent') !== -1) { href = 'letters.html'; name = 'Unsent Letters'; }
    else if (low.indexOf('to-do') !== -1)  { href = 'todo.html';    name = 'Soft To-Do'; }
    var w = document.createElement('div'); w.className = 'tool-suggest';
    var i = document.createElement('div'); i.className = 'tool-suggest-inner';
    i.innerHTML = '<span class="tool-suggest-text">There\'s a space called <strong>' + name + '</strong> that might fit right now.</span>' +
      '<div class="tool-suggest-btns">' +
        '<button class="ts-btn ts-btn-yes" onclick="location.href=\'' + href + '\'">Try it</button>' +
        '<button class="ts-btn ts-btn-no" onclick="this.closest(\'.tool-suggest\').remove()">Keep talking</button>' +
      '</div>';
    w.appendChild(i); msgsEl.appendChild(w); scroll();
  }

  function setTyping(show) { if (typingEl) typingEl.classList.toggle('visible', show); }
  function scroll() { setTimeout(function() { msgsEl.scrollTop = msgsEl.scrollHeight; }, 50); }

  // ── Safety card ───────────────────────────────────────────────
  var SIGNALS = ['therapist','therapy','professional help','psychiatrist','counselor',
    'counselling','counseling','can\'t cope','can\'t handle','falling apart','breaking down',
    'not okay','not ok','hopeless','worthless','nobody cares','give up','no point','end it',
    'hurt myself','self harm','self-harm','suicidal','want to die','988','crisis line'];
  var safetyShown = false;

  function checkSafety(text, role) {
    if (safetyShown || role !== 'user') return;
    var low = text.toLowerCase();
    if (SIGNALS.some(function(w) { return low.indexOf(w) !== -1; })) {
      safetyShown = true;
      setTimeout(showSafetyCard, 800);
    }
  }

  function showSafetyCard() {
    if (document.getElementById('safety-card')) return;
    var card = document.createElement('div');
    card.id = 'safety-card';
    card.className = 'therapist-safety-card';
    card.innerHTML =
      '<div class="tsc-inner">' +
        '<div class="tsc-header"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><span>You don\'t have to do this alone</span></div>' +
        '<p class="tsc-body">What you\'re carrying sounds heavy. A real therapist can offer something I can\'t — consistent, professional support over time.</p>' +
        '<div class="tsc-actions">' +
          '<a class="tsc-btn tsc-btn-primary" href="https://www.psychologytoday.com/us/therapists" target="_blank" rel="noopener">Find a therapist near me</a>' +
          '<a class="tsc-btn tsc-btn-secondary" href="https://www.betterhelp.com" target="_blank" rel="noopener">Try online therapy</a>' +
        '</div>' +
        '<div class="tsc-crisis"><strong>If you\'re in crisis right now:</strong><span>Call or text 988 &nbsp;·&nbsp; Text HOME to 741741</span></div>' +
        '<button class="tsc-dismiss" onclick="document.getElementById(\'safety-card\').remove()">Keep talking here</button>' +
      '</div>';
    msgsEl.appendChild(card);
    scroll();
  }

})();
