/* ============================================================
   Unfinished, After Hours — page-dashboard.js
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
  if (!requireAuth()) return;

  var PROFILES = {
    'The Over-Functioner': {
      greeting:    'Still going. <em>Let\'s find a way to breathe.</em>',
      greetingSub: 'You don\'t have to earn being here.',
      focus:       'Releasing pressure without losing your footing.',
      reset: {
        badge: '5 min · Guilt disruptor',
        title: 'You Don\'t Need to Optimize This Moment',
        desc:  'For the part of you that turns every rest into a task. This one asks nothing from you except to stop performing for five minutes.'
      },
      convos: [
        { title: 'Why I can\'t stop even when I\'m exhausted', meta: '2 days ago · 18 min' },
        { title: 'Productivity guilt and what it costs',       meta: '5 days ago · 12 min' },
        { title: 'What does rest even feel like?',             meta: '1 week ago · 22 min' }
      ]
    },
    'The Spiral Planner': {
      greeting:    'You\'re here. <em>That\'s already something.</em>',
      greetingSub: 'No to-do list required to be in this space.',
      focus:       'Redefining what "enough" actually means.',
      reset: {
        badge: '4 min · Mind reset',
        title: 'Stare at Something Green',
        desc:  'Your brain has been working overtime making plans. This is a deliberate input change — no analyzing, no optimizing, just looking at something that asks nothing of you.'
      },
      convos: [
        { title: 'When planning becomes another form of anxiety', meta: '1 day ago · 9 min' },
        { title: 'I finished things but nothing feels done',      meta: '4 days ago · 15 min' },
        { title: 'Setting a lower bar — and surviving it',        meta: '1 week ago · 11 min' }
      ]
    },
    'The Quiet Quitter': {
      greeting:    'No pressure. <em>Just space.</em>',
      greetingSub: 'Showing up quietly counts.',
      focus:       'Reconnection, not motivation.',
      reset: {
        badge: '3 min · Movement',
        title: 'Three Long Breaths and a Walk',
        desc:  'When everything feels like going through motions, even a slow walk changes something. No destination. No podcast. Just you, moving.'
      },
      convos: [
        { title: 'Going through the motions and feeling hollow', meta: '3 days ago · 14 min' },
        { title: 'When caring feels like too much to ask',       meta: '6 days ago · 8 min' },
        { title: 'What I actually want from work',               meta: '2 weeks ago · 19 min' }
      ]
    },
    'The Numb Drifter': {
      greeting:    'Take it slow. <em>This space holds no expectations.</em>',
      greetingSub: 'You don\'t have to feel anything in particular right now.',
      focus:       'Gentle re-entry into yourself.',
      reset: {
        badge: '2 min · Body reset',
        title: 'Unclench Your Jaw',
        desc:  'When everything feels flat, your body is still holding things quietly. This is just two minutes of noticing — no pressure to feel better, just to check in.'
      },
      convos: [
        { title: 'Everything feels flat — I don\'t know why', meta: '2 days ago · 11 min' },
        { title: 'Trying to feel something again',            meta: '5 days ago · 17 min' },
        { title: 'Is this burnout or something else?',        meta: '1 week ago · 20 min' }
      ]
    }
  };

  // Default reset shown when no profile is set
  var DEFAULT_RESET = {
    badge: '3 min · Body reset',
    title: 'Unclench Your Jaw',
    desc:  'You\'ve probably been holding tension there for hours. This one\'s about noticing what your body has been quietly carrying.'
  };

  var u = getUser();

  // If the session is missing profile data, restore it from localStorage
  if (!u.profile && u.email) {
    try {
      var acct = getAccount(u.email);
      if (acct && acct.profile) {
        u.profile    = acct.profile;
        u.swatches   = acct.swatches   || u.swatches   || null;
        u.avoidColor = acct.avoidColor || u.avoidColor || null;
        setUser(u);
        // Re-apply theme now that we have the swatches
        var sb = document.getElementById('sidebar');
        if (typeof applyTheme === 'function') applyTheme(u, sb);
      }
    } catch(e) {}
  }

  var profile    = u.profile || '';
  var name       = u.name || '';
  // Show the profile as long as it's a recognised one — profileComplete flag not required
  var hasProfile = !!(profile && PROFILES[profile]);
  var pd = hasProfile ? PROFILES[profile] : null;

  // Greeting
  var greetEl = document.getElementById('main-greeting');
  if (greetEl) {
    if (pd) greetEl.innerHTML = (name ? 'Hey '+name+'. ' : '') + pd.greeting;
    else if (name) greetEl.innerHTML = 'Hey '+name+'. <em>What do you need today?</em>';
  }
  var subEl = document.getElementById('greeting-sub');
  if (subEl && pd) subEl.textContent = pd.greetingSub;

  // Profile banner
  var bName  = document.getElementById('banner-profile-name');
  var bFocus = document.getElementById('banner-profile-focus');
  if (bName)  bName.textContent  = profile || '—';
  if (bFocus) bFocus.textContent = pd ? pd.focus : 'Take the quiz to discover your burnout profile.';

  // Today's reset — profile-specific or default
  var resetData = (pd && pd.reset) ? pd.reset : DEFAULT_RESET;
  var rBadge = document.getElementById('reset-badge');
  var rTitle = document.getElementById('reset-title');
  var rDesc  = document.getElementById('reset-desc');
  if (rBadge) rBadge.textContent = resetData.badge;
  if (rTitle) rTitle.textContent = resetData.title;
  if (rDesc)  rDesc.textContent  = resetData.desc;

  // Journal prompt save
  var saveBtn = document.querySelector('.btn-save');
  var promptInput = document.querySelector('.prompt-input');
  var promptQ = document.querySelector('.prompt-q');
  if (saveBtn && promptInput) {
    saveBtn.addEventListener('click', function() {
      var text = promptInput.value.trim();
      if (!text) return;
      var entries = [];
      try { entries = JSON.parse(sessionStorage.getItem('uah_journal')||'[]'); } catch(e) {}
      entries.unshift({
        prompt: promptQ ? promptQ.textContent : 'Journal entry',
        text: text,
        date: new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
      });
      try { sessionStorage.setItem('uah_journal', JSON.stringify(entries.slice(0,50))); } catch(e) {}
      promptInput.value = '';
      saveBtn.textContent = 'Saved ✓';
      saveBtn.style.background = 'var(--sage)';
      setTimeout(function(){ saveBtn.textContent='Save entry'; saveBtn.style.background=''; }, 2000);
    });
  }

  // Upgrade banner on dashboard for free users
  if (!isPlusMember(u)) {
    var pb = document.getElementById('dashboard-paywall');
    if (pb) pb.classList.add('show');
  }
});
