/* ============================================================
   db.js — Supabase client + auth + database helpers
   All data is scoped to auth.uid() via RLS — users can only
   ever read or write their own rows.
   ============================================================ */

var SUPABASE_URL  = 'https://aohagyyptppnoqnxujod.supabase.co';
var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvaGFneXlwdHBwbm9xbnh1am9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMzU5MTUsImV4cCI6MjA5NDgxMTkxNX0.q86wEdRSUqOn3OHHxcFRR0mLWUc_ebZJgTU5f63vv54';

var db = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON)
  : null;

if (!db) console.warn('[db] Supabase client not initialised — CDN may not have loaded yet.');

// ── Auth helpers ─────────────────────────────────────────────

/**
 * Send a magic-link / OTP email. No password ever stored.
 * redirectTo should be the full URL of quiz.html.
 */
async function dbSendMagicLink(email) {
  if (!db) return { error: 'no db' };
  return db.auth.signInWithOtp({
    email: email.toLowerCase().trim(),
    options: {
      shouldCreateUser: true,
      emailRedirectTo: window.location.origin + '/quiz.html'
    }
  });
}

/** Get the current Supabase session (null if not authenticated). */
async function dbGetSession() {
  if (!db) return { data: { session: null }, error: 'no db' };
  return db.auth.getSession();
}

/** Returns the logged-in user's UUID, or null. */
async function dbGetUserId() {
  var res = await dbGetSession();
  return res.data && res.data.session ? res.data.session.user.id : null;
}

/** Sign out from Supabase (clears the session cookie/token). */
async function dbSignOut() {
  if (!db) return;
  return db.auth.signOut();
}

/** Listen for auth state changes (SIGNED_IN, SIGNED_OUT, etc.). */
function dbOnAuthChange(callback) {
  if (!db) return;
  return db.auth.onAuthStateChange(callback);
}

// ── Profiles ─────────────────────────────────────────────────

async function dbUpsertProfile(profile) {
  if (!db) return { error: 'no db' };
  var uid = await dbGetUserId();
  if (!uid) return { error: 'not authenticated' };
  return db.from('profiles').upsert({
    user_id:      uid,
    email:        profile.email.toLowerCase().trim(),
    name:         profile.name,
    profile_type: profile.profile  || null,
    swatches:     profile.swatches || [],
    avoid_color:  profile.avoidColor || null,
    updated_at:   new Date().toISOString()
  }, { onConflict: 'user_id' }).select().single();
}

async function dbGetProfile() {
  if (!db) return { data: null, error: 'no db' };
  var uid = await dbGetUserId();
  if (!uid) return { data: null, error: 'not authenticated' };
  return db.from('profiles').select('*').eq('user_id', uid).maybeSingle();
}

async function dbActivatePlus() {
  if (!db) return { error: 'no db' };
  var uid = await dbGetUserId();
  if (!uid) return { error: 'not authenticated' };
  return db.from('profiles')
    .update({ plus: true, plus_activated_at: new Date().toISOString() })
    .eq('user_id', uid);
}

// ── Journal entries ──────────────────────────────────────────

async function dbSaveJournalEntry(prompt, content) {
  if (!db) return { error: 'no db' };
  var uid = await dbGetUserId();
  if (!uid) return { error: 'not authenticated' };
  var words = content.trim().split(/\s+/).filter(Boolean).length;
  return db.from('journal_entries').insert({
    user_id:    uid,
    prompt:     prompt || null,
    content:    content,
    word_count: words
  }).select().single();
}

async function dbGetJournalEntries(limit) {
  if (!db) return { data: [], error: 'no db' };
  var uid = await dbGetUserId();
  if (!uid) return { data: [], error: 'not authenticated' };
  return db.from('journal_entries')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(limit || 20);
}

async function dbDeleteJournalEntry(id) {
  if (!db) return { error: 'no db' };
  return db.from('journal_entries').delete().eq('id', id);
}

// ── Unsent letters ───────────────────────────────────────────

async function dbSaveLetter(recipient, content) {
  if (!db) return { error: 'no db' };
  var uid = await dbGetUserId();
  if (!uid) return { error: 'not authenticated' };
  return db.from('letters').insert({
    user_id:   uid,
    recipient: recipient,
    content:   content
  }).select().single();
}

async function dbGetLetters() {
  if (!db) return { data: [], error: 'no db' };
  var uid = await dbGetUserId();
  if (!uid) return { data: [], error: 'not authenticated' };
  return db.from('letters')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
}

async function dbDeleteLetter(id) {
  if (!db) return { error: 'no db' };
  return db.from('letters').delete().eq('id', id);
}

// ── Conversations ────────────────────────────────────────────

async function dbSaveConversation(messages, existingId) {
  if (!db) return { error: 'no db' };
  var uid = await dbGetUserId();
  if (!uid) return { error: 'not authenticated' };
  if (existingId) {
    return db.from('conversations')
      .update({ messages: messages, updated_at: new Date().toISOString() })
      .eq('id', existingId).eq('user_id', uid).select().single();
  }
  return db.from('conversations').insert({
    user_id:  uid,
    messages: messages
  }).select().single();
}

async function dbGetConversations(limit) {
  if (!db) return { data: [], error: 'no db' };
  var uid = await dbGetUserId();
  if (!uid) return { data: [], error: 'not authenticated' };
  return db.from('conversations')
    .select('id, created_at, updated_at, messages')
    .eq('user_id', uid)
    .order('updated_at', { ascending: false })
    .limit(limit || 10);
}

// ── To-dos ───────────────────────────────────────────────────

async function dbGetTodosForToday() {
  if (!db) return { data: [], error: 'no db' };
  var uid = await dbGetUserId();
  if (!uid) return { data: [], error: 'not authenticated' };
  var today = new Date().toISOString().slice(0, 10);
  return db.from('todos')
    .select('*')
    .eq('user_id', uid)
    .eq('date', today)
    .order('created_at', { ascending: true });
}

async function dbAddTodo(text, type) {
  if (!db) return { error: 'no db' };
  var uid = await dbGetUserId();
  if (!uid) return { error: 'not authenticated' };
  return db.from('todos').insert({
    user_id: uid,
    text:    text,
    type:    type || 'must',
    date:    new Date().toISOString().slice(0, 10)
  }).select().single();
}

async function dbUpdateTodo(id, fields) {
  if (!db) return { error: 'no db' };
  return db.from('todos').update(fields).eq('id', id).select().single();
}

async function dbDeleteTodo(id) {
  if (!db) return { error: 'no db' };
  return db.from('todos').delete().eq('id', id);
}

async function dbMarkEnough() {
  if (!db) return { error: 'no db' };
  var uid = await dbGetUserId();
  if (!uid) return { error: 'not authenticated' };
  var today = new Date().toISOString().slice(0, 10);
  await db.from('todos').update({ is_enough: false }).eq('user_id', uid).eq('date', today);
  var { data } = await db.from('todos')
    .select('id').eq('user_id', uid).eq('date', today)
    .eq('type', 'must').eq('completed', false)
    .order('created_at', { ascending: true }).limit(1);
  if (data && data[0]) {
    return db.from('todos').update({ is_enough: true, completed: true }).eq('id', data[0].id).select().single();
  }
  return { data: null, error: null };
}
