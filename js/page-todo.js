/* ============================================================
   Unfinished, After Hours — page-todo.js
   Loads / saves via Supabase; falls back to sessionStorage.
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
  if (!requireAuth()) return;
  var u = getUser();

  // tasks keyed by Supabase row id (string UUID) or temp id (negative int)
  var tasks     = { must: [], could: [] };
  var enoughUsed = false;
  var _tempId   = -1; // negative temps replaced once Supabase returns real id

  // ── Persist locally ──────────────────────────────────────────
  function saveLocal() {
    try { sessionStorage.setItem('uah_tasks', JSON.stringify({ tasks, enoughUsed })); } catch(e) {}
  }

  // ── Render ───────────────────────────────────────────────────
  function render() {
    ['must', 'could'].forEach(function(col) {
      var list  = document.getElementById(col + '-list');
      var items = tasks[col];
      if (!items.length) {
        list.innerHTML = '<div class="empty-state">Nothing here yet.</div>';
      } else {
        list.innerHTML = items.map(function(t) {
          return '<div class="task' + (t.done ? ' done' : '') + (t.enough ? ' enough-mark' : '') + '" id="task-' + t.id + '">' +
            '<div class="task-check" data-id="' + t.id + '" data-col="' + col + '"></div>' +
            '<span class="task-text" data-id="' + t.id + '" data-col="' + col + '">' + t.text + '</span>' +
            (t.enough ? '<span class="task-enough-badge">Enough</span>' : '') +
            '<button class="task-archive" data-id="' + t.id + '" data-col="' + col + '" title="Not today, and that\'s okay">✕</button>' +
          '</div>';
        }).join('');
      }
      var countEl = document.getElementById(col + '-count');
      if (countEl) countEl.textContent = items.length + ' task' + (items.length !== 1 ? 's' : '');
    });

    document.querySelectorAll('.task-check, .task-text').forEach(function(el) {
      el.addEventListener('click', function() { toggleDone(el.dataset.id, el.dataset.col); });
    });
    document.querySelectorAll('.task-archive').forEach(function(el) {
      el.addEventListener('click', function() { archiveTask(el.dataset.id, el.dataset.col); });
    });

    var eb = document.getElementById('enoughBtn');
    if (eb) eb.disabled = enoughUsed;

    updateRemainingBadge();
  }

  // ── Load today's tasks ────────────────────────────────────────
  function loadTasks() {
    // Show sessionStorage immediately
    try {
      var saved = JSON.parse(sessionStorage.getItem('uah_tasks') || 'null');
      if (saved) { tasks = saved.tasks; enoughUsed = saved.enoughUsed || false; }
    } catch(e) {}
    render();

    // Overlay with Supabase data
    if (u.email && typeof dbGetTodosForToday === 'function') {
      dbGetTodosForToday().then(function(res) {
        if (!res.data) return;
        tasks = { must: [], could: [] };
        enoughUsed = false;
        res.data.forEach(function(row) {
          var col = row.type === 'could' ? 'could' : 'must';
          tasks[col].push({ id: row.id, text: row.text, done: row.completed, enough: row.is_enough });
          if (row.is_enough) enoughUsed = true;
        });
        saveLocal();
        render();
      }).catch(function(err) { console.warn('[todo] Supabase load failed:', err); });
    }
  }

  // ── Add task ──────────────────────────────────────────────────
  window.addTask = function(col) {
    var input = document.getElementById(col + '-input');
    var text  = input.value.trim();
    if (!text) return;
    if (!checkFreeLimit('todo_tasks', 5, 'todo-paywall')) return;

    var tempId = String(_tempId--);
    tasks[col].push({ id: tempId, text: text, done: false, enough: false });
    input.value = '';
    saveLocal(); render();

    // Persist to Supabase and swap temp id for real UUID
    if (u.email && typeof dbAddTodo === 'function') {
      dbAddTodo(text, col).then(function(res) {
        if (res.data && res.data.id) {
          // Replace temp id with real UUID in the local array
          var item = tasks[col].find(function(t) { return t.id === tempId; });
          if (item) { item.id = res.data.id; saveLocal(); }
        }
      }).catch(function(err) { console.warn('[todo] Supabase add failed:', err); });
    }
  };

  // ── Toggle done ───────────────────────────────────────────────
  function toggleDone(id, col) {
    var t = tasks[col].find(function(x) { return String(x.id) === String(id); });
    if (!t) return;
    t.done = !t.done;
    saveLocal(); render();

    if (u.email && typeof dbUpdateTodo === 'function' && !String(id).startsWith('-')) {
      dbUpdateTodo(id, { completed: t.done })
        .catch(function(err) { console.warn('[todo] Supabase toggle failed:', err); });
    }
  }

  // ── Archive (remove) ─────────────────────────────────────────
  function archiveTask(id, col) {
    tasks[col] = tasks[col].filter(function(t) { return String(t.id) !== String(id); });
    saveLocal(); render();

    if (u.email && typeof dbDeleteTodo === 'function' && !String(id).startsWith('-')) {
      dbDeleteTodo(id)
        .catch(function(err) { console.warn('[todo] Supabase delete failed:', err); });
    }
  }

  // ── That's Enough ─────────────────────────────────────────────
  window.markEnough = function() {
    if (enoughUsed) return;
    var target = tasks.must.find(function(t) { return !t.done; }) ||
                 tasks.could.find(function(t) { return !t.done; });
    var banner = document.getElementById('enoughBanner');
    if (!target) {
      if (banner) banner.innerHTML = '<p class="enough-text"><strong>You\'re already done.</strong> Everything\'s checked off. That is enough.</p>';
    } else {
      target.enough = true;
      if (banner) banner.innerHTML = '<p class="enough-text"><strong>That\'s enough for today.</strong> You can close this list now. The rest will be here if and when you want it.</p>';
    }
    enoughUsed = true;
    saveLocal(); render();

    if (u.email && typeof dbMarkEnough === 'function') {
      dbMarkEnough()
        .catch(function(err) { console.warn('[todo] Supabase markEnough failed:', err); });
    }
  };

  // ── Remaining badge ───────────────────────────────────────────
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
      badge.textContent = status.remaining + ' task' + (status.remaining !== 1 ? 's' : '') + ' left today';
      badge.style.color = 'var(--muted)';
    }
  }

  loadTasks();
});
