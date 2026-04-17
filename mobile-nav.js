/* ============================================================
   Unfinished, After Hours — mobile-nav.js
   Injects a bottom navigation bar on mobile (<= 900px).
   Add <script src="mobile-nav.js"></script> to every page
   just before </body>, after main.js and stripe.js.

   Detects the active page automatically from window.location.
   ============================================================ */

(function () {
  'use strict';

  var NAV_ITEMS = [
    {
      href: 'dashboard.html',
      label: 'Home',
      match: 'dashboard',
      icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>'
    },
    {
      href: 'conversation.html',
      label: 'Talk',
      match: 'conversation',
      icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
    },
    {
      href: 'resets.html',
      label: 'Resets',
      match: 'resets',
      icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>'
    },
    {
      href: 'journal.html',
      label: 'Journal',
      match: 'journal',
      icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>'
    },
    {
      href: '#more',
      label: 'More',
      match: '__more__',
      icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>'
    }
  ];

  var MORE_ITEMS = [
    { href: 'todo.html',    label: 'Soft To-Do',     icon: '✓' },
    { href: 'letters.html', label: 'Unsent Letters',  icon: '✉' },
    { href: 'upgrade.html', label: 'After Hours+',    icon: '✦' },
  ];

  function getCurrentPage() {
    var path = window.location.pathname.split('/').pop() || 'index.html';
    return path.replace('.html', '');
  }

  function injectStyles() {
    if (document.getElementById('uah-mobile-nav-styles')) return;
    var style = document.createElement('style');
    style.id = 'uah-mobile-nav-styles';
    style.textContent = [
      /* ── Only show below 900px ── */
      '@media (min-width: 901px) {',
      '  #uah-mobile-nav, #uah-mobile-drawer, #uah-drawer-backdrop { display: none !important; }',
      '}',

      /* ── Bottom nav bar ── */
      '#uah-mobile-nav {',
      '  position: fixed; bottom: 0; left: 0; right: 0; z-index: 500;',
      '  background: var(--plum);',
      '  display: flex; align-items: stretch;',
      '  padding-bottom: env(safe-area-inset-bottom, 0px);',
      '  border-top: 1px solid rgba(255,255,255,.08);',
      '  box-shadow: 0 -4px 24px rgba(0,0,0,.18);',
      '}',
      '.uah-nav-item {',
      '  flex: 1; display: flex; flex-direction: column;',
      '  align-items: center; justify-content: center;',
      '  gap: 4px; padding: 10px 4px 8px;',
      '  text-decoration: none; border: none; background: none;',
      '  cursor: pointer; color: rgba(250,247,242,.45);',
      '  font-family: "DM Sans", sans-serif;',
      '  font-size: 10px; letter-spacing: .04em;',
      '  transition: color .15s, background .15s;',
      '  -webkit-tap-highlight-color: transparent;',
      '}',
      '.uah-nav-item.active { color: rgba(250,247,242,1); }',
      '.uah-nav-item:active { background: rgba(255,255,255,.06); }',
      '.uah-nav-item svg { flex-shrink: 0; }',
      '.uah-nav-item.active svg { stroke: var(--coral); }',

      /* ── Page body padding so content isn't hidden behind nav ── */
      '@media (max-width: 900px) {',
      '  body { padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px)); }',
      '  .app-layout { padding-bottom: 0; }',
      /* conversation page has overflow:hidden on body — override */
      '  body.page-conversation { padding-bottom: 0; }',
      '  body.page-conversation .chat-wrap { padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px)); }',
      '}',

      /* ── Drawer backdrop ── */
      '#uah-drawer-backdrop {',
      '  position: fixed; inset: 0; z-index: 498;',
      '  background: rgba(0,0,0,.45);',
      '  opacity: 0; pointer-events: none;',
      '  transition: opacity .25s;',
      '}',
      '#uah-drawer-backdrop.open { opacity: 1; pointer-events: auto; }',

      /* ── More drawer (slides up from bottom) ── */
      '#uah-mobile-drawer {',
      '  position: fixed; bottom: 0; left: 0; right: 0; z-index: 499;',
      '  background: var(--warm-white);',
      '  border-radius: 20px 20px 0 0;',
      '  padding: 1.4rem 1.2rem calc(80px + env(safe-area-inset-bottom, 0px));',
      '  transform: translateY(100%);',
      '  transition: transform .28s cubic-bezier(.4,0,.2,1);',
      '  box-shadow: 0 -8px 40px rgba(0,0,0,.15);',
      '}',
      '#uah-mobile-drawer.open { transform: translateY(0); }',
      '.drawer-handle {',
      '  width: 36px; height: 4px; border-radius: 2px;',
      '  background: rgba(45,27,78,.15);',
      '  margin: 0 auto 1.4rem;',
      '}',
      '.drawer-title {',
      '  font-size: .65rem; letter-spacing: .14em; text-transform: uppercase;',
      '  color: var(--muted); font-weight: 500;',
      '  margin-bottom: 1rem; padding: 0 .4rem;',
      '}',
      '.drawer-item {',
      '  display: flex; align-items: center; gap: .9rem;',
      '  padding: .9rem 1rem; border-radius: 12px;',
      '  text-decoration: none; color: var(--text);',
      '  font-size: .95rem; font-weight: 300;',
      '  transition: background .15s;',
      '  -webkit-tap-highlight-color: transparent;',
      '}',
      '.drawer-item:active { background: var(--blush); }',
      '.drawer-item-icon {',
      '  width: 36px; height: 36px; border-radius: 10px;',
      '  background: var(--cream); border: 1px solid rgba(59,31,58,.09);',
      '  display: flex; align-items: center; justify-content: center;',
      '  font-size: .95rem; flex-shrink: 0; color: var(--coral);',
      '}',
      '.drawer-item-label { font-size: .92rem; color: var(--plum); font-weight: 400; }',
      '.drawer-divider {',
      '  height: 1px; background: rgba(59,31,58,.07);',
      '  margin: .6rem 0;',
      '}',
      '.drawer-signout {',
      '  display: flex; align-items: center; gap: .9rem;',
      '  padding: .9rem 1rem; border-radius: 12px;',
      '  width: 100%; background: none; border: none; cursor: pointer;',
      '  font-family: "DM Sans", sans-serif; font-size: .92rem;',
      '  color: var(--muted); font-weight: 300;',
      '  -webkit-tap-highlight-color: transparent;',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }

  function buildNav() {
    var current = getCurrentPage();
    var nav = document.createElement('nav');
    nav.id = 'uah-mobile-nav';
    nav.setAttribute('aria-label', 'Mobile navigation');

    NAV_ITEMS.forEach(function (item) {
      var isMore = item.match === '__more__';
      var isActive = !isMore && (current === item.match.replace('.html', ''));

      var el;
      if (isMore) {
        el = document.createElement('button');
        el.type = 'button';
        el.addEventListener('click', toggleDrawer);
      } else {
        el = document.createElement('a');
        el.href = item.href;
      }

      el.className = 'uah-nav-item' + (isActive ? ' active' : '');
      el.setAttribute('aria-label', item.label);
      el.innerHTML = item.icon + '<span>' + item.label + '</span>';
      nav.appendChild(el);
    });

    document.body.appendChild(nav);
  }

  function buildDrawer() {
    // Backdrop
    var backdrop = document.createElement('div');
    backdrop.id = 'uah-drawer-backdrop';
    backdrop.addEventListener('click', closeDrawer);
    document.body.appendChild(backdrop);

    // Drawer
    var drawer = document.createElement('div');
    drawer.id = 'uah-mobile-drawer';
    drawer.setAttribute('aria-hidden', 'true');

    var handle = '<div class="drawer-handle"></div>';
    var title  = '<div class="drawer-title">More</div>';

    var items = MORE_ITEMS.map(function (item) {
      return '<a class="drawer-item" href="' + item.href + '" onclick="document.getElementById(\'uah-mobile-drawer\').classList.remove(\'open\');document.getElementById(\'uah-drawer-backdrop\').classList.remove(\'open\')">' +
        '<div class="drawer-item-icon">' + item.icon + '</div>' +
        '<span class="drawer-item-label">' + item.label + '</span>' +
        '</a>';
    }).join('');

    var divider  = '<div class="drawer-divider"></div>';
    var signout  = '<button class="drawer-signout" id="drawer-signout-btn">' +
      '<div class="drawer-item-icon" style="font-size:1rem">↩</div>' +
      '<span>Sign out</span>' +
      '</button>';

    drawer.innerHTML = handle + title + items + divider + signout;
    document.body.appendChild(drawer);

    // Sign out
    var soBtn = drawer.querySelector('#drawer-signout-btn');
    if (soBtn) {
      soBtn.addEventListener('click', function () {
        sessionStorage.removeItem('uah_user');
        try { localStorage.removeItem('uah_last_email'); } catch (e) {}
        window.location.href = 'index.html';
      });
    }
  }

  function toggleDrawer() {
    var drawer   = document.getElementById('uah-mobile-drawer');
    var backdrop = document.getElementById('uah-drawer-backdrop');
    var isOpen   = drawer.classList.contains('open');
    if (isOpen) {
      closeDrawer();
    } else {
      drawer.classList.add('open');
      backdrop.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
    }
  }

  function closeDrawer() {
    var drawer   = document.getElementById('uah-mobile-drawer');
    var backdrop = document.getElementById('uah-drawer-backdrop');
    if (drawer)   { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); }
    if (backdrop) { backdrop.classList.remove('open'); }
  }

  function init() {
    injectStyles();
    buildNav();
    buildDrawer();

    // conversation.html has overflow:hidden on body — add helper class
    var page = getCurrentPage();
    if (page === 'conversation') {
      document.body.classList.add('page-conversation');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
