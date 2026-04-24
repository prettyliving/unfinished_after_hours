/* ============================================================
   Unfinished, After Hours — main.js
   Shared utilities: theme engine, session helpers, sidebar init.
   ============================================================ */
'use strict';

// ── Colour helpers ──────────────────────────────────────────
function hexToRgb(hex) {
  if (!hex) return [160,120,160];
  var rgb = hex.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (rgb) return [+rgb[1],+rgb[2],+rgb[3]];
  if (hex.length < 7) return [160,120,160];
  return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
}
function rgbStr(r,g,b) { return 'rgb('+Math.round(r)+','+Math.round(g)+','+Math.round(b)+')'; }
function darken(rgb,p)  { return [rgb[0]*p,rgb[1]*p,rgb[2]*p]; }
function lighten(rgb,m) { return [rgb[0]+(255-rgb[0])*m,rgb[1]+(255-rgb[1])*m,rgb[2]+(255-rgb[2])*m]; }
function lum(rgb) {
  return rgb.map(function(v){ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); })
    .reduce(function(s,v,i){ return s+v*[.2126,.7152,.0722][i]; }, 0);
}
function contrast(a,b) { var l1=lum(a),l2=lum(b); return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05); }

// ── Session ─────────────────────────────────────────────────
function getUser() { try { return JSON.parse(sessionStorage.getItem('uah_user')||'{}'); } catch(e) { return {}; } }
function setUser(u) { try { sessionStorage.setItem('uah_user', JSON.stringify(u)); } catch(e) {} }
function isPlusMember(u) { u = u||getUser(); return !!(u.plus); }
function getAccounts() { try { return JSON.parse(localStorage.getItem('uah_accounts')||'{}'); } catch(e) { return {}; } }
function getAccount(email) { return getAccounts()[email.toLowerCase()]||null; }

// ── Adaptive theme ──────────────────────────────────────────
function applyTheme(u, sidebarEl) {
  u = u||getUser();
  if (!u.swatches||!u.swatches.length) return;
  var av   = u.avoidColor||null;
  var safe = u.swatches.filter(function(h) {
    if (!av) return true;
    var a=hexToRgb(av),b=hexToRgb(h);
    return (Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])+Math.abs(a[2]-b[2]))>40;
  });
  if (!safe.length) safe = ['#7BAE8E','#C9A84C'];
  var p=hexToRgb(safe[0]), s=safe[1]?hexToRgb(safe[1]):darken(p,.75);
  var dp=darken(p,.45),dpm=darken(p,.65),dpl=darken(p,.80);
  var acc=s; if(contrast(acc,[255,255,255])<3) acc=darken(acc,.6);
  var root=document.documentElement;
  root.style.setProperty('--plum',         rgbStr.apply(null,dp));
  root.style.setProperty('--plum-mid',     rgbStr.apply(null,dpm));
  root.style.setProperty('--plum-light',   rgbStr.apply(null,dpl));
  root.style.setProperty('--coral',        rgbStr.apply(null,acc));
  root.style.setProperty('--coral-hover',  rgbStr.apply(null,darken(acc,.85)));
  root.style.setProperty('--warm-white',   rgbStr.apply(null,lighten(p,.92)));
  root.style.setProperty('--cream',        rgbStr.apply(null,lighten(p,.94)));
  root.style.setProperty('--muted',        rgbStr.apply(null,lighten(dp,.45)));
  root.style.setProperty('--text-soft',    rgbStr.apply(null,darken(p,.5)));
  document.body.style.background = rgbStr.apply(null,lighten(p,.92));
  if (sidebarEl) sidebarEl.style.background = rgbStr.apply(null,dp);
}

// ── Sidebar init ────────────────────────────────────────────
function initSidebar() {
  var u  = getUser();
  var sb = document.getElementById('sidebar');
  applyTheme(u, sb);
  var av=document.getElementById('profile-avatar'),pn=document.getElementById('profile-name'),pt=document.getElementById('profile-tag');
  if (av) av.textContent = u.name ? u.name.charAt(0).toUpperCase() : '?';
  if (pn) pn.textContent = u.name||'You';
  if (pt) pt.textContent = u.profile||'—';
  var soBtn = document.getElementById('signout-btn');
  if (soBtn) {
    soBtn.addEventListener('click', function() {
      sessionStorage.removeItem('uah_user');
      try { localStorage.removeItem('uah_last_email'); } catch(e) {}
      window.location.href = 'index.html';
    });
  }
  // Show upgrade link for free users
  var ul = document.getElementById('upgrade-nav-link');
  if (ul) ul.style.display = isPlusMember(u) ? 'none' : 'flex';
}

// ── Toast ───────────────────────────────────────────────────
function showToast(msg, toastId) {
  toastId = toastId||'toast';
  var t = document.getElementById(toastId);
  if (!t) return;
  if (msg) t.textContent = msg;
  t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 2200);
}

// ── Free-tier limit check ───────────────────────────────────
// localStorage + date-keyed buckets (daily or monthly)
var MONTHLY_KEYS = ['convos', 'checkins'];
var DAILY_KEYS   = ['resets', 'journal_saves', 'todo_tasks'];

function todayKey()  { return new Date().toISOString().slice(0, 10); }
function monthKey()  { return new Date().toISOString().slice(0, 7);  }

function _getLimitBucket(period) {
  var isMonthly = (period === 'monthly');
  var currentKey = isMonthly ? monthKey() : todayKey();
  var storageKey = 'uah_limits_' + period + '_' + currentKey;
  // Prune stale buckets
  try {
    var prefix = 'uah_limits_' + period + '_';
    Object.keys(localStorage).forEach(function(k) {
      if (k.indexOf(prefix) === 0 && k !== storageKey)
        localStorage.removeItem(k);
    });
  } catch(e) {}
  var bucket = {};
  try { bucket = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch(e) {}
  return { storageKey: storageKey, bucket: bucket };
}

function checkFreeLimit(key, limit, bannerId) {
  var u = getUser();
  if (isPlusMember(u)) return true;
  var period = MONTHLY_KEYS.indexOf(key) >= 0 ? 'monthly' : 'daily';
  var data   = _getLimitBucket(period);
  var count  = (data.bucket[key] || 0) + 1;
  data.bucket[key] = count;
  try { localStorage.setItem(data.storageKey, JSON.stringify(data.bucket)); } catch(e) {}
  if (count > limit) {
    var el = document.getElementById(bannerId);
    if (el) el.classList.add('show');
    return false;
  }
  return true;
}

// Read usage without incrementing (for "X left today" badges)
function getLimitStatus(key, limit) {
  var u = getUser();
  if (isPlusMember(u)) return { used:0, limit:Infinity, remaining:Infinity };
  var period = MONTHLY_KEYS.indexOf(key) >= 0 ? 'monthly' : 'daily';
  var data   = _getLimitBucket(period);
  var used   = data.bucket[key] || 0;
  return { used:used, limit:limit, remaining:Math.max(0, limit - used) };
}

// Gate entirely-Plus features (export, audio)
function requirePlus(bannerId) {
  var u = getUser();
  if (isPlusMember(u)) return true;
  var el = document.getElementById(bannerId);
  if (el) el.classList.add('show');
  return false;
}

// ── Auth guard ───────────────────────────────────────────────
// Call on any authenticated page. Redirects to quiz.html if no session.
function requireAuth() {
  var u = getUser();
  if (!u || !u.name) {
    window.location.href = 'quiz.html';
    return false;
  }
  return true;
}

document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('sidebar')) initSidebar();
});
