/* ============================================================
   Unfinished, After Hours — page-todo.js
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
  if (!requireAuth()) return;
  var tasks = { must: [], could: [] };
  var enoughUsed = false;
  var nextId = 1;
  try {
    var saved = JSON.parse(sessionStorage.getItem('uah_tasks')||'null');
    if (saved) { tasks=saved.tasks; enoughUsed=saved.enoughUsed||false; nextId=saved.nextId||1; }
  } catch(e) {}

  function saveTasks() { try { sessionStorage.setItem('uah_tasks', JSON.stringify({tasks,enoughUsed,nextId})); } catch(e) {} }

  function render() {
    ['must','could'].forEach(function(col) {
      var list = document.getElementById(col+'-list');
      var items = tasks[col];
      if (!items.length) { list.innerHTML='<div class="empty-state">Nothing here yet.</div>'; }
      else {
        list.innerHTML = items.map(function(t) {
          return '<div class="task'+(t.done?' done':'')+(t.enough?' enough-mark':'')+'" id="task-'+t.id+'">'+
            '<div class="task-check" data-id="'+t.id+'" data-col="'+col+'"></div>'+
            '<span class="task-text" data-id="'+t.id+'" data-col="'+col+'">'+t.text+'</span>'+
            (t.enough?'<span class="task-enough-badge">Enough</span>':'')+
            '<button class="task-archive" data-id="'+t.id+'" data-col="'+col+'" title="Not today, and that\'s okay">✕</button></div>';
        }).join('');
      }
      var countEl = document.getElementById(col+'-count');
      if (countEl) countEl.textContent = items.length+' task'+(items.length!==1?'s':'');
    });
    // Wire up task events
    document.querySelectorAll('.task-check, .task-text').forEach(function(el) {
      el.addEventListener('click', function() { toggleDone(parseInt(el.dataset.id), el.dataset.col); });
    });
    document.querySelectorAll('.task-archive').forEach(function(el) {
      el.addEventListener('click', function() { archiveTask(parseInt(el.dataset.id), el.dataset.col); });
    });
    var eb = document.getElementById('enoughBtn');
    if (eb && enoughUsed) eb.disabled = true;
  }

  window.addTask = function(col) {
    var input = document.getElementById(col+'-input');
    var text  = input.value.trim();
    if (!text) return;
    // Gate: 5 tasks per day for free users
    if (!checkFreeLimit('todo_tasks', 5, 'todo-paywall')) return;
    tasks[col].push({ id: nextId++, text, done: false, enough: false });
    input.value = '';
    saveTasks(); render();
  };

  function toggleDone(id, col) {
    var t = tasks[col].find(function(x){ return x.id===id; });
    if (t) { t.done=!t.done; saveTasks(); render(); }
  }

  function archiveTask(id, col) {
    tasks[col] = tasks[col].filter(function(t){ return t.id!==id; });
    saveTasks(); render();
  }

  window.markEnough = function() {
    if (enoughUsed) return;
    var target = tasks.must.find(function(t){ return !t.done; })||tasks.could.find(function(t){ return !t.done; });
    var banner = document.getElementById('enoughBanner');
    if (!target) {
      if (banner) banner.innerHTML='<p class="enough-text"><strong>You\'re already done.</strong> Everything\'s checked off. That is enough.</p>';
    } else {
      target.enough = true;
      if (banner) banner.innerHTML='<p class="enough-text"><strong>That\'s enough for today.</strong> You can close this list now. The rest will be here if and when you want it.</p>';
    }
    enoughUsed = true; saveTasks(); render();
  };

  function updateRemainingBadge() {
    var badge = document.getElementById('tasks-remaining-badge');
    if (!badge || isPlusMember(getUser())) {
      if (badge) badge.style.display = 'none'; return;
    }
    var status = getLimitStatus('todo_tasks', 5);
    badge.style.display = 'block';
    if (status.remaining <= 0) {
      badge.textContent = 'Daily limit reached — upgrade for unlimited';
      badge.style.color = 'var(--coral)';
    } else {
      badge.textContent = status.remaining + ' task' +
        (status.remaining !== 1 ? 's' : '') + ' left today';
      badge.style.color = 'var(--muted)';
    }
  }

  // Patch render to also update badge
  var _origRender = render;
  render = function() { _origRender(); updateRemainingBadge(); };

  render();
});
