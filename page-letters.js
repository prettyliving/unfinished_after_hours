/* ============================================================
   Unfinished, After Hours — page-letters.js
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
  if (!requireAuth()) return;
  var hints = {
    'My burnout':                   'You\'ve been carrying this for a while. You don\'t need to be fair or reasonable. Just honest.',
    'My inner critic':              'Say what you\'ve always wanted to say back. No filters needed here.',
    'Someone I can\'t talk to':     'This is the conversation you couldn\'t have. Have it here instead.',
    'My future self':               'What do you need them to know? What do you want them to remember?',
    'My past self':                 'What would you say if you could reach back? Comfort, anger, love — all allowed.',
    'The version of me that\'s tired': 'Speak directly to that exhausted part of you. It\'s listening.',
    'The pressure I carry':         'Name it. Address it. You don\'t have to make peace with it.',
    'No one in particular':         'Sometimes it just needs to go somewhere. This is that place.'
  };
  var placeholders = {
    'My burnout':                   'Dear my burnout...',
    'My inner critic':              'Dear the voice that says I\'m not enough...',
    'Someone I can\'t talk to':     'There\'s something I\'ve needed to say...',
    'My future self':               'I want you to know...',
    'My past self':                 'Looking back, I wish I could tell you...',
    'The version of me that\'s tired': 'I see you. You\'ve been...',
    'The pressure I carry':         'I\'ve been meaning to tell you...',
    'No one in particular':         'I just need to say this somewhere...'
  };

  var currentRecipient = 'My burnout';
  var letters = [];
  try { letters = JSON.parse(sessionStorage.getItem('uah_letters')||'[]'); } catch(e) {}

  document.querySelectorAll('.recipient-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      currentRecipient = btn.dataset.recipient;
      document.querySelectorAll('.recipient-btn').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      document.getElementById('toValue').textContent = currentRecipient;
      document.getElementById('letterHint').textContent = hints[currentRecipient]||hints['No one in particular'];
      var ta = document.getElementById('letterText');
      ta.placeholder = placeholders[currentRecipient]||'Dear...';
      ta.value = '';
      ta.focus();
      var h = document.getElementById('letterHeader');
      h.classList.remove('fade-in'); void h.offsetWidth; h.classList.add('fade-in');
    });
  });

  function renderLetterList() {
    var list = document.getElementById('letterList');
    if (!list) return;
    if (!letters.length) { list.innerHTML='<p class="no-letters">No saved letters yet.</p>'; return; }
    list.innerHTML = letters.map(function(l,i){
      return '<div class="letter-item'+(i===0?' active':'')+'" data-idx="'+i+'">'+
        '<div class="letter-recipient">'+l.recipient+'</div>'+
        '<div class="letter-preview">'+l.preview+'</div>'+
        '<div class="letter-date">'+l.date+'</div></div>';
    }).join('');
    list.querySelectorAll('.letter-item').forEach(function(el){
      el.addEventListener('click', function(){ loadLetter(parseInt(el.dataset.idx)); });
    });
  }

  function loadLetter(i) {
    var l = letters[i]; if (!l) return;
    currentRecipient = l.recipient;
    document.getElementById('toValue').textContent = l.recipient;
    document.getElementById('letterHint').textContent = hints[l.recipient]||hints['No one in particular'];
    var ta = document.getElementById('letterText');
    ta.placeholder = placeholders[l.recipient]||'Dear...';
    ta.value = l.full;
    document.querySelectorAll('.recipient-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.recipient===l.recipient); });
    document.querySelectorAll('.letter-item').forEach(function(el,j){ el.classList.toggle('active', j===i); });
  }

  var saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      var text = document.getElementById('letterText').value.trim();
      if (!text) return;
      var dateStr = new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'});
      letters.unshift({ recipient: currentRecipient, preview: text.slice(0,55)+(text.length>55?'...':''), full: text, date: dateStr });
      try { sessionStorage.setItem('uah_letters', JSON.stringify(letters)); } catch(e) {}
      document.getElementById('letterText').value = '';
      renderLetterList();
      showToast('Saved to vault ✓');
    });
  }

  var discardBtn = document.getElementById('discardBtn');
  if (discardBtn) {
    discardBtn.addEventListener('click', function() { document.getElementById('letterText').value=''; document.getElementById('letterText').focus(); });
  }

  renderLetterList();
  // Show export button for Plus members (Fix #7)
  var exportBtn = document.getElementById('exportBtn');
  if (exportBtn && isPlusMember(getUser())) exportBtn.style.display = 'inline-flex';
});