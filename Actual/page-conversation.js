/* ============================================================
   Unfinished, After Hours — page-conversation.js

   Features implemented per design spec:
   ─────────────────────────────────────────────────────────────
   • Prompt caching: two cache_control blocks (static + user
     context) reduce per-message input cost ~90% on cached tokens
   • localStorage auto-save: survives page refresh, feeds
     dashboard "Past Conversations" widget
   • 30-minute soft pause: 25-min quiet notice, 30-min pause
     screen with "Keep going" / "Go to dashboard" options
   • Model: claude-sonnet-4-5-20251001 (Claude Sonnet 4.6)
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
  if (!requireAuth()) return;

  var u = getUser();
  var conversationHistory = [];

  // ── Conversation ID for localStorage persistence ─────────
  // Reuse the same ID on refresh; new one for each page load
  // without an existing ID in sessionStorage.
  var convoId = sessionStorage.getItem('uah_active_convo_id');
  if (!convoId) {
    convoId = 'convo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    sessionStorage.setItem('uah_active_convo_id', convoId);
  }

  // Restore in-progress conversation from localStorage on refresh
  (function restoreConvo() {
    try {
      var saved = JSON.parse(localStorage.getItem(convoId) || 'null');
      if (!saved || !saved.messages || !saved.messages.length) return;
      conversationHistory = saved.messages;
      conversationHistory.forEach(function(msg) {
        appendMessage(msg.role === 'user' ? 'user' : 'ai', msg.content);
      });
      scrollToBottom();
    } catch (e) {}
  })();

  // ── Profile context (for the cached user-context block) ──
  var profileContext = window._uahProfileContext || '';
  if (!profileContext) {
    var pn = u.profile || '';
    if (pn) profileContext = ' The user has identified as "' + pn + '".' +
      (pn === 'The Over-Functioner' ? ' They tend to overwork and struggle to rest without guilt.' :
       pn === 'The Spiral Planner'  ? ' They care deeply but struggle with over-planning and perfectionism.' :
       pn === 'The Quiet Quitter'   ? ' They\'ve mentally stepped back but still show up. Reconnection is the goal.' :
       pn === 'The Numb Drifter'    ? ' They feel emotionally flat and overloaded. Gentle, no-pressure responses work best.' : '');
  }

  // ── System prompt: split into two cache blocks ───────────
  // Block 1 — static: never changes across any user or session.
  // Block 2 — user context: stable within a session, changes per user.
  // Both flagged ephemeral (5-min TTL). After the first message,
  // subsequent messages retrieve both blocks from cache at ~10% input cost.

  var STATIC_SYSTEM = 'You are the conversational guide inside "Unfinished, After Hours," a burnout support platform.\n\nCore principles:\n- Reflective, not directive — ask questions, don\'t give advice\n- Validate before exploring: name the feeling first\n- Keep responses SHORT (2-4 sentences max) and conversational\n- Use gentle, grounded language — no toxic positivity, no slogans\n- Never say "self-care", "wellness journey", "optimize", "crush your goals", or "just"\n- Follow CBT phases naturally\n- Occasionally (sparingly) suggest: resets, journal prompts, unsent letters, or soft to-do\n- If user mentions self-harm or crisis: respond with warmth and share 988 Lifeline and Crisis Text Line (text HOME to 741741)\n- Never diagnose or make promises\n\nTone: honest, warm, grounded. Short sentences. Real language.';

  var USER_CONTEXT_SYSTEM = profileContext
    ? 'User context:' + profileContext
    : 'No burnout profile set for this user yet.';

  // Free tier: 3 conversations per month (session-based for demo)
  var FREE_CONVO_LIMIT = 3;

  // ── 30-minute soft pause ─────────────────────────────────
  var SESSION_WARN_MS  = 25 * 60 * 1000; // 25 min → quiet notice
  var SESSION_PAUSE_MS = 30 * 60 * 1000; // 30 min → pause screen
  var sessionStartTime = Date.now();
  var warnShown = false;
  var pauseActive = false;

  var sessionTimer = setInterval(function() {
    var elapsed = Date.now() - sessionStartTime;

    if (!warnShown && elapsed >= SESSION_WARN_MS) {
      warnShown = true;
      showSessionNotice();
    }

    if (!pauseActive && elapsed >= SESSION_PAUSE_MS) {
      pauseActive = true;
      clearInterval(sessionTimer);
      showPauseScreen();
    }
  }, 10000); // check every 10 s

  function showSessionNotice() {
    var msgs = document.getElementById('messages');
    var notice = document.createElement('div');
    notice.className = 'session-notice';
    notice.id = 'session-notice';
    notice.innerHTML =
      '<span class="sn-text">You\'ve been here for 25 minutes. That\'s a lot of thinking. ' +
      'A pause is here whenever you want it.</span>' +
      '<button class="sn-dismiss" onclick="document.getElementById(\'session-notice\').remove()">Dismiss</button>';
    msgs.appendChild(notice);
    scrollToBottom();
  }

  function showPauseScreen() {
    var inputArea = document.querySelector('.input-area');
    if (!inputArea) return;
    // Replace input area with pause screen (input preserved in DOM, just hidden)
    var chatInput = document.getElementById('chatInput');
    if (chatInput) chatInput.disabled = true;

    var pauseEl = document.getElementById('session-pause');
    if (!pauseEl) {
      pauseEl = document.createElement('div');
      pauseEl.id = 'session-pause';
      pauseEl.className = 'session-pause';
      pauseEl.innerHTML =
        '<div class="sp-inner">' +
          '<p class="sp-headline">You\'ve been here for 30 minutes.</p>' +
          '<p class="sp-sub">Rest. Come back when you\'re ready.<br>There\'s no timer on that part.</p>' +
          '<div class="sp-btns">' +
            '<button class="sp-btn-keep" id="sp-keep">Keep going</button>' +
            '<a class="sp-btn-dash" href="dashboard.html">Go to dashboard</a>' +
          '</div>' +
        '</div>';
      inputArea.parentNode.insertBefore(pauseEl, inputArea);
      inputArea.style.display = 'none';
    }

    document.getElementById('sp-keep').addEventListener('click', function() {
      // Reset clock, re-enable input, remove pause screen
      sessionStartTime = Date.now();
      warnShown = false;
      pauseActive = false;
      pauseEl.remove();
      if (inputArea) inputArea.style.display = '';
      if (chatInput) chatInput.disabled = false;
      // Append a brief welcome-back message without hitting the API
      appendMessage('ai', 'Welcome back. Pick up wherever feels right.');
      conversationHistory.push({ role: 'assistant', content: 'Welcome back. Pick up wherever feels right.' });
      saveConvo();
      scrollToBottom();
      // Restart the soft-pause timer
      sessionTimer = setInterval(function() {
        var el = Date.now() - sessionStartTime;
        if (!warnShown && el >= SESSION_WARN_MS) { warnShown = true; showSessionNotice(); }
        if (!pauseActive && el >= SESSION_PAUSE_MS) { pauseActive = true; clearInterval(sessionTimer); showPauseScreen(); }
      }, 10000);
    });
  }

  // ── localStorage save / load ─────────────────────────────
  function saveConvo() {
    try {
      // Save the live conversation
      var entry = {
        id: convoId,
        messages: conversationHistory,
        updatedAt: Date.now(),
        title: conversationHistory.length
          ? (conversationHistory[0].content.slice(0, 60) + (conversationHistory[0].content.length > 60 ? '…' : ''))
          : 'New conversation'
      };
      localStorage.setItem(convoId, JSON.stringify(entry));

      // Keep an index of conversation IDs for the dashboard widget
      var plus = isPlusMember(u);
      var MAX = plus ? 9999 : 3; // free users: 3 sessions retained
      var index = [];
      try { index = JSON.parse(localStorage.getItem('uah_convo_index') || '[]'); } catch(e) {}
      index = index.filter(function(id) { return id !== convoId; });
      index.unshift(convoId);
      if (!plus) index = index.slice(0, MAX);
      localStorage.setItem('uah_convo_index', JSON.stringify(index));
    } catch (e) {}
  }

  // ── Send message ─────────────────────────────────────────
  function sendMessage() {
    var input = document.getElementById('chatInput');
    var text  = input.value.trim();
    if (!text) return;

    // Check free limit on first message of a new conversation
    if (conversationHistory.length === 0) {
      if (!checkFreeLimit('convos', FREE_CONVO_LIMIT, 'convo-paywall')) return;
    }

    input.value = '';
    input.style.height = 'auto';
    appendMessage('user', text);
    conversationHistory.push({ role: 'user', content: text });
    saveConvo();
    showTyping(true);
    scrollToBottom();

    // Build message array for the API — plain content (no cache_control on messages)
    var apiMessages = conversationHistory.map(function(m) {
      return { role: m.role, content: m.content };
    });

    // Two-block system prompt with prompt caching
    // Block 1: static instructions — cache_control flags it for reuse
    // Block 2: user context — stable within session, cached separately
    var systemPayload = [
      {
        type: 'text',
        text: STATIC_SYSTEM,
        cache_control: { type: 'ephemeral' }
      },
      {
        type: 'text',
        text: USER_CONTEXT_SYSTEM,
        cache_control: { type: 'ephemeral' }
      }
    ];

    fetch('/api/chat', {x
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-beta': 'prompt-caching-2024-07-31'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: systemPayload,
        messages: apiMessages
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var reply = (data.content && data.content[0] && data.content[0].text)
        ? data.content[0].text
        : "I'm here. Take your time.";

      showTyping(false);
      conversationHistory.push({ role: 'assistant', content: reply });
      saveConvo();
      appendMessage('ai', reply);

      var lower = reply.toLowerCase();
      if (lower.includes('reset') || lower.includes('journal') || lower.includes('unsent') || lower.includes('to-do') || lower.includes('todo')) {
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
    div.className = 'msg msg-' + role;
    var formatted = text.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
    div.innerHTML = '<div class="bubble">' + formatted + '</div>';
    msgs.appendChild(div);
    var spacer = document.createElement('div');
    spacer.className = 'msg-spacer';
    msgs.appendChild(spacer);
  }

  function appendToolSuggestion(lower) {
    var href = 'resets.html', name = '"You Don\'t Need to Earn Rest"';
    if (lower.includes('journal'))             { href = 'journal.html';  name = 'your journal'; }
    else if (lower.includes('unsent'))         { href = 'letters.html'; name = 'Unsent Letters'; }
    else if (lower.includes('to-do') || lower.includes('todo')) { href = 'todo.html'; name = 'Soft To-Do'; }

    var msgs = document.getElementById('messages');
    var wrap  = document.createElement('div'); wrap.className = 'tool-suggest';
    var inner = document.createElement('div'); inner.className = 'tool-suggest-inner';
    inner.innerHTML =
      '<span class="tool-suggest-text">There\'s a space called <strong>' + name + '</strong> that might fit right now.</span>' +
      '<div class="tool-suggest-btns">' +
        '<button class="ts-btn ts-btn-yes" onclick="window.location.href=\'' + href + '\'">Try it</button>' +
        '<button class="ts-btn ts-btn-no" onclick="this.closest(\'.tool-suggest\').remove()">Keep talking</button>' +
      '</div>';
    wrap.appendChild(inner);
    msgs.appendChild(wrap);
  }

  function showTyping(show) {
    document.getElementById('typing').classList.toggle('visible', show);
  }

  function scrollToBottom() {
    setTimeout(function() {
      var m = document.getElementById('messages');
      if (m) m.scrollTop = m.scrollHeight;
    }, 50);
  }

  // ── Global handlers (called from HTML) ───────────────────
  window.handleKey   = function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  window.autoResize  = function(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 130) + 'px'; };
  window.sendMessage = sendMessage;

  // ── Inject soft-pause styles ─────────────────────────────
  (function injectStyles() {
    var style = document.createElement('style');
    style.textContent = [
      '.session-notice{',
        'display:flex;align-items:center;justify-content:space-between;gap:1rem;',
        'margin:.5rem auto;width:100%;max-width:720px;padding:.75rem 2.5rem;box-sizing:border-box;',
      '}',
      '.sn-text{font-size:.82rem;color:var(--text-soft);font-weight:300;font-style:italic;line-height:1.6}',
      '.sn-dismiss{',
        'flex-shrink:0;font-size:.7rem;letter-spacing:.07em;text-transform:uppercase;',
        'background:transparent;border:1px solid rgba(59,31,58,.15);color:var(--muted);',
        'font-family:"DM Sans",sans-serif;padding:.3rem .85rem;border-radius:100px;cursor:pointer;',
        'transition:border-color .2s,color .2s;',
      '}',
      '.sn-dismiss:hover{border-color:var(--plum);color:var(--plum)}',

      '.session-pause{',
        'padding:2rem 2rem 1.6rem;',
        'background:linear-gradient(135deg,rgba(45,27,78,.04),rgba(196,181,232,.08));',
        'border-top:1px solid rgba(196,181,232,.25);',
        'text-align:center;',
      '}',
      '.sp-inner{max-width:380px;margin:0 auto}',
      '.sp-headline{',
        'font-family:"Cormorant Garamond",serif;font-size:1.35rem;font-weight:400;',
        'color:var(--plum);margin-bottom:.5rem;',
      '}',
      '.sp-sub{',
        'font-size:.88rem;color:var(--text-soft);font-weight:300;line-height:1.75;margin-bottom:1.4rem;',
      '}',
      '.sp-btns{display:flex;gap:.75rem;justify-content:center;align-items:center;flex-wrap:wrap}',
      '.sp-btn-keep{',
        'background:var(--coral);color:#fff;border:none;border-radius:100px;',
        'font-family:"DM Sans",sans-serif;font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;',
        'padding:.65rem 1.5rem;cursor:pointer;transition:background .2s;',
      '}',
      '.sp-btn-keep:hover{background:var(--coral-hover)}',
      '.sp-btn-dash{',
        'font-size:.78rem;color:var(--muted);letter-spacing:.04em;text-transform:uppercase;',
        'text-decoration:none;font-family:"DM Sans",sans-serif;transition:color .2s;',
      '}',
      '.sp-btn-dash:hover{color:var(--plum)}',
    ].join('');
    document.head.appendChild(style);
  })();
});
