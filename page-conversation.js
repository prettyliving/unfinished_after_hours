/* ============================================================
   Unfinished, After Hours — page-conversation.js
   UPDATED: fetch() now calls /api/chat (your Vercel proxy)
            instead of api.anthropic.com directly.
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
  if (!requireAuth()) return;
  var u = getUser();
  var conversationHistory = [];

  var profileContext = window._uahProfileContext || '';
  if (!profileContext) {
    var pn = u.profile || '';
    if (pn) profileContext = ' The user has identified as "'+pn+'".'+
      (pn==='The Over-Functioner' ? ' They tend to overwork and struggle to rest without guilt.' :
       pn==='The Spiral Planner'  ? ' They care deeply but struggle with over-planning and perfectionism.' :
       pn==='The Quiet Quitter'   ? ' They\'ve mentally stepped back but still show up. Reconnection is the goal.' :
       pn==='The Numb Drifter'    ? ' They feel emotionally flat and overloaded. Gentle, no-pressure responses work best.' : '');
  }

  var STATIC_SYSTEM = 'You are the conversational guide inside "Unfinished, After Hours," a burnout support platform.\n\nCore principles:\n- Reflective, not directive — ask questions, don\'t give advice\n- Validate before exploring: name the feeling first\n- Keep responses SHORT (2-4 sentences max) and conversational\n- Use gentle, grounded language — no toxic positivity, no slogans\n- Never say "self-care", "wellness journey", "optimize", "crush your goals", or "just"\n- Follow CBT phases naturally\n- Occasionally (sparingly) suggest: resets, journal prompts, unsent letters, or soft to-do\n- If user mentions self-harm or crisis: respond with warmth and share 988 Lifeline and Crisis Text Line (text HOME to 741741)\n- Never diagnose or make promises\n\nTone: honest, warm, grounded. Short sentences. Real language.';
  var USER_CONTEXT_SYSTEM = profileContext ? ('User context: ' + profileContext) : 'No additional user context.';

  // Auto-save conversation ID
  var convoId = sessionStorage.getItem('uah_active_convo_id');
  if (!convoId) {
    convoId = 'convo_' + Date.now();
    sessionStorage.setItem('uah_active_convo_id', convoId);
  }
  function saveConvo() {
    try {
      localStorage.setItem(convoId, JSON.stringify({
        messages: conversationHistory,
        updatedAt: Date.now()
      }));
    } catch(e) {}
  }

  // Soft pause timer — Plus: 60-min session (50-min notice), Free: 30-min (25-min notice)
  var isPlus = isPlusMember(u);
  var SESSION_WARN_MS  = (isPlus ? 50 : 25) * 60 * 1000;
  var SESSION_PAUSE_MS = (isPlus ? 60 : 30) * 60 * 1000;
  var sessionStart = Date.now();
  var warnShown = false, pauseActive = false;
  setInterval(function() {
    var elapsed = Date.now() - sessionStart;
    if (!warnShown && elapsed >= SESSION_WARN_MS) {
      warnShown = true;
      showSessionNotice();
    }
    if (!pauseActive && elapsed >= SESSION_PAUSE_MS) {
      pauseActive = true;
      showPauseScreen();
    }
  }, 10000);

  function showSessionNotice() {
    var msgs = document.getElementById('messages');
    if (!msgs) return;
    var div = document.createElement('div');
    div.className = 'msg msg-ai session-notice';
    var warnMins = isPlus ? 50 : 25;
    div.innerHTML = '<div class="bubble notice-bubble">You\'ve been here for ' + warnMins + ' minutes. That\'s a lot of thinking. A pause is here whenever you want it. <button onclick="this.closest(\'.session-notice\').remove()" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:.8rem;margin-left:.5rem;">Dismiss</button></div>';
    msgs.appendChild(div);
    scrollToBottom();
  }

  function showPauseScreen() {
    var inputArea = document.getElementById('chatInput');
    if (inputArea) inputArea.disabled = true;
    var sendBtn = document.querySelector('.send-btn');
    if (sendBtn) sendBtn.disabled = true;
    var msgs = document.getElementById('messages');
    if (!msgs) return;
    var div = document.createElement('div');
    div.className = 'msg msg-ai pause-screen';
    div.innerHTML = '<div class="bubble pause-bubble">' +
      var pauseMins = isPlus ? 60 : 30;
      '<p><strong>You\'ve been here for ' + pauseMins + ' minutes.</strong></p>' +
      '<p>Rest. Come back when you\'re ready. There\'s no timer on that part.</p>' +
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
    var inputArea = document.getElementById('chatInput');
    if (inputArea) inputArea.disabled = false;
    var sendBtn = document.querySelector('.send-btn');
    if (sendBtn) sendBtn.disabled = false;
    document.querySelectorAll('.pause-screen').forEach(function(el){ el.remove(); });
    var msgs = document.getElementById('messages');
    if (msgs) {
      var div = document.createElement('div');
      div.className = 'msg msg-ai';
      div.innerHTML = '<div class="bubble">Welcome back. Pick up wherever feels right.</div>';
      msgs.appendChild(div);
    }
    scrollToBottom();
  };

  // Free tier: 3 conversations per month
  var FREE_CONVO_LIMIT = 3;

  function sendMessage() {
    var input = document.getElementById('chatInput');
    var text  = input.value.trim();
    if (!text) return;

    // Check free limit on first message of new conversation
    if (conversationHistory.length === 0) {
      if (!checkFreeLimit('convos', FREE_CONVO_LIMIT, 'convo-paywall')) return;
    }

    input.value = ''; input.style.height = 'auto';
    appendMessage('user', text);
    conversationHistory.push({ role: 'user', content: text });
    showTyping(true); scrollToBottom();

    // ── Proxy with prompt caching ──
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 1000,
        system: [
          { type: 'text', text: STATIC_SYSTEM,        cache_control: { type: 'ephemeral' } },
          { type: 'text', text: USER_CONTEXT_SYSTEM,  cache_control: { type: 'ephemeral' } }
        ],
        messages:        conversationHistory,
        anthropic_beta:  'prompt-caching-2024-07-31'
      })
    })
    .then(function(r){ return r.json(); })
    .then(function(data) {
      var reply = data.content?.[0]?.text || "I'm here. Take your time.";
      showTyping(false);
      conversationHistory.push({ role: 'assistant', content: reply });
      saveConvo();
      appendMessage('ai', reply);
      if (conversationHistory.length === 2) {
        var convos = [];
        try { convos = JSON.parse(sessionStorage.getItem('uah_convos')||'[]'); } catch(e) {}
        var title = text.length > 50 ? text.slice(0,50)+'...' : text;
        convos.unshift({ title: title, date: 'Just now' });
        try { sessionStorage.setItem('uah_convos', JSON.stringify(convos.slice(0,10))); } catch(e) {}
      }
      var lower = reply.toLowerCase();
      if (lower.includes('reset')||lower.includes('journal')||lower.includes('unsent')||lower.includes('to-do')||lower.includes('todo')) {
        appendToolSuggestion(lower);
      }
    })
    .catch(function() {
      showTyping(false);
      appendMessage('ai', "I'm still here. Something went quiet on my end — want to try again?");
    });
    scrollToBottom();
  }

  function appendMessage(role, text) {
    var msgs = document.getElementById('messages');
    var div = document.createElement('div');
    div.className = 'msg msg-'+role;
    var formatted = text.replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>');
    div.innerHTML = '<div class="bubble">'+formatted+'</div>';
    msgs.appendChild(div);
    var spacer = document.createElement('div'); spacer.className = 'msg-spacer'; msgs.appendChild(spacer);
  }

  function appendToolSuggestion(lower) {
    var href='resets.html', name='"You Don\'t Need to Earn Rest"';
    if (lower.includes('journal'))  { href='journal.html';  name='your journal'; }
    else if (lower.includes('unsent')) { href='letters.html'; name='Unsent Letters'; }
    else if (lower.includes('to-do')||lower.includes('todo')) { href='todo.html'; name='Soft To-Do'; }
    var msgs = document.getElementById('messages');
    var wrap = document.createElement('div'); wrap.className = 'tool-suggest';
    var inner = document.createElement('div'); inner.className = 'tool-suggest-inner';
    inner.innerHTML = '<span class="tool-suggest-text">There\'s a space called <strong>'+name+'</strong> that might fit right now.</span>'+
      '<div class="tool-suggest-btns">'+
      '<button class="ts-btn ts-btn-yes" onclick="window.location.href=\''+href+'\'">Try it</button>'+
      '<button class="ts-btn ts-btn-no" onclick="this.closest(\'.tool-suggest\').remove()">Keep talking</button></div>';
    wrap.appendChild(inner); msgs.appendChild(wrap);
  }

  function showTyping(show) { document.getElementById('typing').classList.toggle('visible', show); }
  function scrollToBottom() { setTimeout(function(){ var m=document.getElementById('messages'); m.scrollTop=m.scrollHeight; }, 50); }

  window.handleKey   = function(e) { if (e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMessage(); } };
  window.autoResize  = function(el) { el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,130)+'px'; };
  window.sendMessage = sendMessage;
});
