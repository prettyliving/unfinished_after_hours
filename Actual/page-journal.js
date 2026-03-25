/* ============================================================
   Unfinished, After Hours — page-journal.js
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
  if (!requireAuth()) return;
  var u = getUser();

  var allPrompts = [
    '"What am I tired of explaining?"',
    '"What am I avoiding right now?"',
    '"What would \'done enough\' actually look like?"',
    '"What do I wish someone would just say to me?"',
    '"Where does the pressure actually come from?"',
    '"What am I pretending is fine?"',
    '"What would I do if no one was watching or judging?"',
    '"What do I want to put down for a while?"'
  ];
  var profilePrompts = {
    'The Over-Functioner': ['"What would feel like enough, right now?"','"What am I afraid will happen if I slow down?"','"When did I start believing rest had to be earned?"'],
    'The Spiral Planner':  ['"What would \'done enough\' actually look like today?"','"What am I trying to control by planning?"','"If the plan fell apart, what would actually happen?"'],
    'The Quiet Quitter':   ['"What did I used to love doing that I\'ve set aside?"','"What would I do today if I had no obligations?"','"What part of me stepped back, and why?"'],
    'The Numb Drifter':    ['"What am I pretending is fine?"','"What did I feel before everything went flat?"','"What\'s one small thing that still feels real?"']
  };

  var prompts = allPrompts.slice();
  if (u.profile && profilePrompts[u.profile]) prompts = profilePrompts[u.profile].concat(prompts);
  var currentPrompt = 0;

  function renderPrompt() {
    var el = document.getElementById('promptText');
    var counter = document.getElementById('promptCounter');
    if (el) el.textContent = prompts[currentPrompt];
    if (counter) counter.textContent = (currentPrompt+1)+' / '+prompts.length;
    var pd = document.getElementById('promptDisplay');
    if (pd) { pd.classList.remove('fade-in'); void pd.offsetWidth; pd.classList.add('fade-in'); }
  }
  window.nextPrompt = function() { currentPrompt=(currentPrompt+1)%prompts.length; renderPrompt(); };
  window.prevPrompt = function() { currentPrompt=(currentPrompt-1+prompts.length)%prompts.length; renderPrompt(); };

  var hints = ['Nothing to fix. Just write.','You don\'t have to make sense.','This is just for you.','No right way to do this.','Write badly. That\'s allowed.'];
  window.updateCount = function() {
    var text = document.getElementById('journalText').value;
    var words = text.trim() ? text.trim().split(/\s+/).length : 0;
    var wc = document.getElementById('wordCount');
    if (wc) wc.textContent = words+' word'+(words!==1?'s':'');
    if (words>0&&words%20===0) { var h=document.getElementById('writeHint'); if(h) h.textContent=hints[Math.floor(Math.random()*hints.length)]; }
  };

  var entries = [];
  try { entries = JSON.parse(sessionStorage.getItem('uah_journal')||'[]'); } catch(e) {}

  // Free tier: 1 prompt per day = 1 save per session for demo
  window.saveEntry = function() {
    if (!checkFreeLimit('journal_saves', 1, 'journal-paywall')) return;
    var text = document.getElementById('journalText').value.trim();
    if (!text) return;
    entries.unshift({ prompt: prompts[currentPrompt], date: 'Just now', preview: text.slice(0,160)+(text.length>160?'...':'') });
    try { sessionStorage.setItem('uah_journal', JSON.stringify(entries)); } catch(e) {}
    document.getElementById('journalText').value = '';
    var wc = document.getElementById('wordCount'); if(wc) wc.textContent='0 words';
    renderEntries();
    showToast('Entry saved ✓');
  };
  window.discardEntry = function() { document.getElementById('journalText').value=''; var wc=document.getElementById('wordCount'); if(wc) wc.textContent='0 words'; };

  function renderEntries() {
    var list = document.getElementById('entriesList');
    if (!list) return;
    if (!entries.length) { list.innerHTML='<p style="font-size:.88rem;color:var(--muted);font-style:italic;text-align:center;padding:2rem 0;">No entries yet. Write something — even one line.</p>'; return; }
    list.innerHTML = entries.map(function(e){ return '<div class="entry-card"><div class="entry-meta"><span class="entry-prompt-ref">'+e.prompt+'</span><span class="entry-date">'+e.date+'</span></div><p class="entry-preview">'+e.preview+'</p></div>'; }).join('');
  }

  renderPrompt();
  renderEntries();
});
