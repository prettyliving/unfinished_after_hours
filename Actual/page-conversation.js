/* ============================================================
   Unfinished, After Hours — page-conversation.js
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

  var systemPrompt = 'You are the conversational guide inside "Unfinished, After Hours," a burnout support platform.' + profileContext + '\n\nCore principles:\n- Reflective, not directive — ask questions, don\'t give advice\n- Validate before exploring: name the feeling first\n- Keep responses SHORT (2-4 sentences max) and conversational\n- Use gentle, grounded language — no toxic positivity, no slogans\n- Never say "self-care", "wellness journey", "optimize", "crush your goals", or "just"\n- Follow CBT phases naturally\n- Occasionally (sparingly) suggest: resets, journal prompts, unsent letters, or soft to-do\n- If user mentions self-harm or crisis: respond with warmth and share 988 Lifeline and Crisis Text Line (text HOME to 741741)\n- Never diagnose or make promises\n\nTone: honest, warm, grounded. Short sentences. Real language.';

  // Free tier: 3 conversations per month (session-based for demo)
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

    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, system: systemPrompt, messages: conversationHistory })
    })
    .then(function(r){ return r.json(); })
    .then(function(data) {
      var reply = data.content?.[0]?.text || "I'm here. Take your time.";
      showTyping(false);
      conversationHistory.push({ role: 'assistant', content: reply });
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
