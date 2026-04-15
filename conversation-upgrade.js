/* ================================================================
   CONVERSATION.JS — Prompt Caching + Soft Session Pause
   Drop these functions into your existing conversation.html <script>
   or a linked conversation.js file.

   Requires your existing:
   - getUserProfile()       → returns { profile, theme, quizAnswers }
   - checkFreeLimit()       → returns bool (free tier gate)
   - localStorage account   → window.currentUser

   ================================================================ */


// ── 1. SYSTEM PROMPT (with cache_control) ──────────────────────
// Build once per page load. The static CBT instructions go in the
// first block (cached). The user's profile goes in the second block
// (also cached but shorter TTL since it changes per user).

function buildSystemPrompt(userProfile) {
  const staticInstructions = `You are a CBT-informed burnout support guide for Unfinished, After Hours.

ROLE: You are not a therapist. You are a thought-unpacking guide — reflective, warm, and honest.

WHAT YOU DO:
- Ask one question at a time. Never more.
- Respond in 2–3 short sentences maximum unless the user is clearly in distress.
- Mirror language back to the user. Use their exact words in your questions.
- Move through phases naturally, never announce them.
- Suggest tools organically mid-conversation when relevant.

PHASES (move through these naturally, not mechanically):
1. Opening — Establish safety. "There's no agenda here."
2. Exploration — CBT Layer 1. Ask what their words mean to them.
3. Pattern Recognition — Gently mirror. "I'm noticing... does that track?"
4. Explore Alternatives — Softly. "If that weren't true, what would change?"
5. Tool Suggestion — Contextual only. Offer, never prescribe.

TOOL ROUTING (suggest only when it fits naturally):
- Guilt about rest → Reset: "You Don't Need to Earn Rest"
- Feeling numb → Journal: "What needs to feel lighter?"
- Overwhelm → Soft To-Do: "Let's break this into small steps"
- Can't talk to someone → Unsent Letters
- Comparing to others → "Productivity Guilt Survival Kit"

WHAT YOU NEVER DO:
- Diagnose or use clinical language
- Give medical advice
- Say "I understand how you feel" or similar (you don't have feelings)
- Make promises ("You'll feel better")
- Use the words: should, just, self-care, wellness journey, optimize, crush your goals
- Ask multiple questions in one response
- Force resolution or a "landing"

TONE: Honest. Warm without being saccharine. Short sentences. Poetic but clear. Validate before suggesting.

CRISIS PROTOCOL:
If the user mentions self-harm, suicidal ideation, or severe crisis:
- Immediately and gently provide: "988 Suicide & Crisis Lifeline (call or text 988)" and "Crisis Text Line (text HOME to 741741)"
- Say you're glad they shared this and that this is beyond what you can hold
- Do not continue the conversation. Do not ask follow-up questions.
- End with: "Please reach out to one of these. You don't have to be alone in this."`;

  const userContext = `USER PROFILE:
Burnout archetype: ${userProfile.profile || 'Unknown'}
Primary pressure: ${userProfile.quizAnswers?.pressureSource || 'Not specified'}
Current intent: ${userProfile.quizAnswers?.intent || 'Not specified'}
Emotional tone needed: ${userProfile.quizAnswers?.colorMood || 'Neutral'}

Adapt your language and pacing to this profile. If the user is a "${userProfile.profile}", they likely ${getProfileHint(userProfile.profile)}.`;

  return [
    {
      type: "text",
      text: staticInstructions,
      cache_control: { type: "ephemeral" }  // cached for 5 min, 90% cost reduction on re-reads
    },
    {
      type: "text",
      text: userContext,
      cache_control: { type: "ephemeral" }  // cached per user session
    }
  ];
}

function getProfileHint(profile) {
  const hints = {
    'Over-Functioner': 'feels unsafe stopping, needs permission to rest without losing control',
    'Spiral Planner': 'over-plans as coping, needs help redefining "enough"',
    'Quiet Quitter': 'has emotionally stepped back, needs reconnection not motivation',
    'Numb Drifter': 'is overloaded not failing, needs gentle re-entry not urgency'
  };
  return hints[profile] || 'may be experiencing multiple burnout patterns';
}


// ── 2. SOFT SESSION PAUSE ──────────────────────────────────────
// 30-minute soft pause. Not a hard cutoff — shows a gentle banner,
// user can dismiss and keep going, or save and come back.

const SESSION_SOFT_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_WARN_AT_MS    = 25 * 60 * 1000; // warn at 25 min

let sessionStartTime   = null;
let sessionTimer       = null;
let warningShown       = false;
let sessionPaused      = false;

function startSessionTimer() {
  sessionStartTime = Date.now();
  warningShown     = false;
  sessionPaused    = false;

  sessionTimer = setInterval(() => {
    const elapsed = Date.now() - sessionStartTime;

    if (!warningShown && elapsed >= SESSION_WARN_AT_MS) {
      showSessionWarning();
      warningShown = true;
    }

    if (elapsed >= SESSION_SOFT_LIMIT_MS) {
      triggerSessionPause();
      clearInterval(sessionTimer);
    }
  }, 10000); // check every 10s
}

function stopSessionTimer() {
  if (sessionTimer) {
    clearInterval(sessionTimer);
    sessionTimer = null;
  }
}

function showSessionWarning() {
  // Inject a gentle in-chat notice (not a popup)
  const notice = document.createElement('div');
  notice.className = 'session-notice warning';
  notice.innerHTML = `
    <p>You've been here for 25 minutes.</p>
    <p>No rush — but whenever you're ready, this conversation will pause at 30 so you can breathe. It'll be here when you come back.</p>
    <button onclick="this.parentElement.remove()" class="notice-dismiss">Got it</button>
  `;
  appendToChat(notice);
}

function triggerSessionPause() {
  sessionPaused = true;
  saveConversationState();

  // Replace the input area with a soft pause screen
  const inputArea = document.getElementById('chat-input-area');
  if (inputArea) {
    inputArea.innerHTML = `
      <div class="session-pause-screen">
        <p class="pause-headline">You've been here for 30 minutes.</p>
        <p class="pause-body">That's enough for now. Your conversation is saved — every word.</p>
        <p class="pause-body">Rest. Come back when you're ready. There's no timer on that part.</p>
        <div class="pause-actions">
          <button onclick="resumeSession()" class="pause-btn primary">Keep going</button>
          <a href="dashboard.html" class="pause-btn secondary">Go to dashboard</a>
        </div>
        <p class="pause-fine">Your conversation is saved under "Past Conversations"</p>
      </div>
    `;
  }
}

function resumeSession() {
  sessionPaused = false;
  restoreInputArea();
  startSessionTimer(); // reset the 30-min clock

  // Add a gentle re-entry message
  const resumeNotice = document.createElement('div');
  resumeNotice.className = 'session-notice resume';
  resumeNotice.innerHTML = `<p>Welcome back. We're right where you left off.</p>`;
  appendToChat(resumeNotice);
}

function restoreInputArea() {
  const inputArea = document.getElementById('chat-input-area');
  if (inputArea) {
    inputArea.innerHTML = `
      <textarea id="user-input" placeholder="What's on your mind..." rows="3"></textarea>
      <button id="send-btn" onclick="sendMessage()">Send</button>
    `;
    document.getElementById('user-input').focus();
  }
}


// ── 3. SAVE / RESTORE CONVERSATION STATE ──────────────────────
// Saves to localStorage so users can resume across page loads

function saveConversationState() {
  const user = window.currentUser;
  if (!user) return;

  const state = {
    messages:      window.conversationHistory || [],
    savedAt:       new Date().toISOString(),
    profile:       getUserProfile()?.profile || null,
    sessionLength: Math.round((Date.now() - sessionStartTime) / 60000) // minutes
  };

  const key = `conversation_${user.email}_${getOrCreateConversationId()}`;
  localStorage.setItem(key, JSON.stringify(state));
}

function loadConversationState(conversationId) {
  const user = window.currentUser;
  if (!user) return null;

  const key = `conversation_${user.email}_${conversationId}`;
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

function getOrCreateConversationId() {
  if (!window._conversationId) {
    window._conversationId = `conv_${Date.now()}`;
  }
  return window._conversationId;
}


// ── 4. MAIN SEND FUNCTION (with caching + pause guard) ─────────

async function sendMessage() {
  if (sessionPaused) return;

  const input = document.getElementById('user-input');
  if (!input) return;

  const userText = input.value.trim();
  if (!userText) return;

  // Free tier gate (your existing function)
  if (!checkFreeLimit('conversation')) return;

  input.value = '';
  appendUserMessage(userText);

  // Add to conversation history
  if (!window.conversationHistory) window.conversationHistory = [];
  window.conversationHistory.push({ role: 'user', content: userText });

  // Start session timer on first message
  if (window.conversationHistory.length === 1) {
    startSessionTimer();
  }

  // Auto-save every message
  saveConversationState();

  // Show typing indicator
  const typingEl = showTypingIndicator();

  try {
    const userProfile = getUserProfile() || {};
    const systemPrompt = buildSystemPrompt(userProfile);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,            // keeps responses short — 2-3 sentences
        system: systemPrompt,       // array format enables prompt caching
        messages: window.conversationHistory
      })
    });

    const data = await response.json();
    removeTypingIndicator(typingEl);

    if (data.error) {
      appendSystemMessage("Something went quiet on our end. Try again in a moment.");
      return;
    }

    const reply = data.content?.[0]?.text || '';
    window.conversationHistory.push({ role: 'assistant', content: reply });

    appendAssistantMessage(reply);
    saveConversationState();

    // Log cache performance (dev only — remove in production)
    if (data.usage) {
      console.log('Cache stats:', {
        input_tokens:         data.usage.input_tokens,
        cache_read_tokens:    data.usage.cache_read_input_tokens,
        cache_write_tokens:   data.usage.cache_creation_input_tokens,
        output_tokens:        data.usage.output_tokens
      });
    }

  } catch (err) {
    removeTypingIndicator(typingEl);
    appendSystemMessage("Something went quiet on our end. Try again in a moment.");
    console.error('API error:', err);
  }
}


// ── 5. DOM HELPERS ────────────────────────────────────────────

function appendUserMessage(text) {
  const el = document.createElement('div');
  el.className = 'message user-message';
  el.textContent = text;
  getChatContainer().appendChild(el);
  scrollToBottom();
}

function appendAssistantMessage(text) {
  const el = document.createElement('div');
  el.className = 'message assistant-message';
  el.textContent = text;
  getChatContainer().appendChild(el);
  scrollToBottom();
}

function appendSystemMessage(text) {
  const el = document.createElement('div');
  el.className = 'message system-message';
  el.textContent = text;
  getChatContainer().appendChild(el);
  scrollToBottom();
}

function appendToChat(el) {
  getChatContainer().appendChild(el);
  scrollToBottom();
}

function showTypingIndicator() {
  const el = document.createElement('div');
  el.className = 'message assistant-message typing-indicator';
  el.innerHTML = '<span></span><span></span><span></span>';
  getChatContainer().appendChild(el);
  scrollToBottom();
  return el;
}

function removeTypingIndicator(el) {
  if (el && el.parentElement) el.remove();
}

function getChatContainer() {
  return document.getElementById('chat-messages') || document.body;
}

function scrollToBottom() {
  const container = getChatContainer();
  container.scrollTop = container.scrollHeight;
}


// ── 6. CSS for pause screen + session notices ─────────────────
// Inject into your <style> block or conversation.css

const sessionStyles = `
.session-notice {
  margin: 1rem auto;
  max-width: 480px;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  font-size: 0.85rem;
  line-height: 1.6;
  font-family: 'DM Sans', sans-serif;
}

.session-notice.warning {
  background: var(--color-surface, #f5f2ec);
  border-left: 3px solid var(--color-accent, #6b5b4e);
  color: var(--color-text-secondary, #5f5e5a);
}

.session-notice.resume {
  background: transparent;
  color: var(--color-muted, #888780);
  text-align: center;
  font-style: italic;
}

.notice-dismiss {
  margin-top: 0.5rem;
  background: none;
  border: none;
  font-size: 0.75rem;
  color: var(--color-muted, #888780);
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  font-family: 'DM Sans', sans-serif;
}

.session-pause-screen {
  text-align: center;
  padding: 2.5rem 1.5rem;
  max-width: 480px;
  margin: 0 auto;
}

.pause-headline {
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--color-text, #2c2a25);
  margin-bottom: 0.75rem;
}

.pause-body {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #5f5e5a);
  line-height: 1.65;
  margin-bottom: 0.4rem;
}

.pause-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 1.5rem 0 0.75rem;
}

.pause-btn {
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  font-size: 0.83rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  font-family: 'DM Sans', sans-serif;
  transition: opacity 0.15s;
}

.pause-btn:hover { opacity: 0.75; }

.pause-btn.primary {
  background: var(--color-accent, #6b5b4e);
  color: #fff;
  border: none;
}

.pause-btn.secondary {
  background: transparent;
  border: 0.5px solid var(--color-border-dark, rgba(0,0,0,0.2));
  color: var(--color-text, #2c2a25);
}

.pause-fine {
  font-size: 0.72rem;
  color: var(--color-muted, #888780);
}

/* Typing indicator dots */
.typing-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 0.75rem 1rem;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-muted, #888780);
  animation: typing-bounce 1.2s infinite;
}

.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40%           { transform: translateY(-5px); opacity: 1; }
}
`;

// Auto-inject styles
const styleEl = document.createElement('style');
styleEl.textContent = sessionStyles;
document.head.appendChild(styleEl);
