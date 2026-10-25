// Lumi - real-time chat on Firebase Auth + Realtime Database
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getDatabase, ref, get, set, update, push, remove, onValue, onChildAdded, onChildChanged, onChildRemoved, onDisconnect, serverTimestamp, query, limitToLast, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";

const app = initializeApp({
  apiKey: "AIzaSyBiqeXov1Fz4U6hJFV0VzCow3xY5a0Y4xY",
  authDomain: "authentication-app-ef808.firebaseapp.com",
  databaseURL: "https://authentication-app-ef808-default-rtdb.firebaseio.com",
  projectId: "authentication-app-ef808",
  storageBucket: "authentication-app-ef808.firebasestorage.app",
  messagingSenderId: "583467113014",
  appId: "1:583467113014:web:195a7c7fd74f308417d697"
});
const auth = getAuth(app), db = getDatabase(app);

const $ = s => document.querySelector(s);
const THEMES = ['rose', 'lavender', 'mint', 'ocean', 'sunset', 'berry', 'coffee', 'midnight', 'forest', 'night'];
const SWATCH = { rose: ['#d6456f', '#f0809f'], lavender: ['#6f58d6', '#a28df0'], mint: ['#1f9e75', '#5fd0a8'], ocean: ['#2a7fd4', '#5bb6f0'], night: ['#e0709a', '#8a6be0'], sunset: ['#f26a3d', '#ffa05b'], berry: ['#b83fb5', '#e66fd9'], coffee: ['#8a5a3a', '#c08a5e'], midnight: ['#5b8cff', '#8f6bff'], forest: ['#3ecf8e', '#8be0b6'] };
const REACTS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];
const EMOJIS = '😀 😂 😍 🥰 😎 🤔 😭 🥳 👍 🙏 ❤️ 🔥 🎉 ✨ 😴 🤗'.split(' ');
const STATUSES = ['😊 Feeling good', '💼 At work', '📚 Studying', '😴 Sleeping', '🎧 Listening to music', '🚫 Busy'];
const COLORS = ['#d6456f', '#6f58d6', '#1f9e75', '#e08a2e', '#2d8bd6', '#b4457a'];
const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { } } };

let me = null, users = {}, cur = null, msgs = {}, replyTo = null, mode = 'login', pendingName = '';
let theme = store.get('cn_theme', 'rose'), hid = store.get('cn_hid', []);
let friends = {}, requests = {}, statuses = {}, tab = 'friends';
const sent = {}; let lastMsg = {}, lastL = {}, groups = {}, gL = {}, autoDone = false;
const face = (e, c1, c2) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/><text x="50" y="70" font-size="58" text-anchor="middle">${e}</text></svg>`);
const BOTS = {
  b_ai: { uid: 'b_ai', name: 'Lumi AI', email: 'assistant@chatnest', photo: face('🤖', '#6f58d6', '#5bb6f0'), status: '✨ Ask me anything', online: true, bot: 'ai' },
  b_ayesha: { uid: 'b_ayesha', name: 'Ayesha', email: 'ayesha@chatnest', photo: face('👩', '#e5588a', '#ff9a6c'), status: '☕ Coffee first', online: true, bot: 'friend' },
  b_hussain: { uid: 'b_hussain', name: 'Hussain', email: 'hussain@chatnest', photo: face('👨', '#2a7fd4', '#5bb6f0'), status: '🎧 Listening to music', online: true, bot: 'friend' },
  b_group: { uid: 'b_group', name: 'Lumi Squad 🎉', email: 'squad@chatnest', photo: face('🎉', '#f26a3d', '#ffd36b'), status: 'Ayesha, Hussain, Fizza & AI', online: false, bot: 'group', group: true },
  b_fizza: { uid: 'b_fizza', name: 'Fizza', email: 'fizza@chatnest', photo: face('👧', '#1f9e75', '#a8e6cf'), status: '📚 Studying', online: true, bot: 'friend' }
};
const isB = id => typeof id === 'string' && id.startsWith('b_');
const withBots = o => ({ ...o, ...BOTS });
let opts = { sound: true, enter: true, hideTyping: false, size: 'm', ...store.get('cn_opts', {}) };
let pins = store.get('cn_pin', []), mutes = store.get('cn_mute', []), arch = store.get('cn_arch', []), filt = 'all', showArch = false;
let editing = null, searchQ = '', welcomed = false, botWho = '', pendingPhoto = '', starred = store.get('cn_star', []);
const rk = k => k === 'b_ai' ? 2 : k === 'b_group' ? 1 : 0;
let botTyping = '', botCallOn = false, botCallT = null, botCallId = null, botSecs = 0, recog = null, recogOn = false, speaking = false;
const isG = id => typeof id === 'string' && id.startsWith('g_');
const nm = id => (users[id]?.name || 'Someone').split(' ')[0];
const prevText = l => l.voice ? '🎤 Voice message' : l.image ? '📷 ' + (l.text ? esc(l.text) : 'Photo') : esc(l.text);
const readAt = uid => store.get('cn_read_' + uid, 0), markRead = uid => store.set('cn_read_' + uid, Date.now());
let unsubs = [], chatUnsubs = [], rec = null, stream = null, recTimer = null, raf = 0;

const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const colorOf = n => COLORS[[...(n || '?')].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const initial = u => esc((u?.name || '?')[0].toUpperCase());
const avStyle = u => u?.photo ? `background-image:url('${u.photo}')` : `background:${colorOf(u?.name)}`;
const avStr = (u, cls = '', uid = '') => `<div class="av ${cls}" data-uid="${uid}" style="${avStyle(u)}">${u?.photo ? '' : initial(u)}</div>`;
function setAv(el, u, on) { el.className = 'av' + (on ? ' on' : ''); el.setAttribute('style', avStyle(u)); el.textContent = u?.photo ? '' : (u?.name || '?')[0].toUpperCase() }
function toast(t) { if (/PERMISSION_DENIED/i.test(t)) t = 'Permission denied: publish the latest database.rules.json in Firebase > Realtime Database > Rules.'; const e = $('#toast'); e.textContent = t; e.classList.remove('hide'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.add('hide'), 4200) }
function setTheme(t) { theme = t; document.body.dataset.theme = t; store.set('cn_theme', t); document.querySelectorAll('.tname').forEach(e => e.textContent = t[0].toUpperCase() + t.slice(1)) }
const fmtTime = t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
function fmtDay(t) { const d = new Date(t), n = new Date(); if (d.toDateString() === n.toDateString()) return 'Today'; n.setDate(n.getDate() - 1); return d.toDateString() === n.toDateString() ? 'Yesterday' : d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) }
const chatPath = () => isG(cur) ? 'groupMessages/' + cur.slice(2) : 'messages/' + [me.uid, cur].sort().join('/');
const seenText = u => u.online ? 'Active now' : (u.lastSeen ? 'Last seen ' + (new Date(u.lastSeen).toDateString() === new Date().toDateString() ? 'today ' : fmtDay(u.lastSeen) + ' ') + fmtTime(u.lastSeen) : 'Offline');

/* ---------- Auth ---------- */
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  mode = b.dataset.tab;
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  $('#aName').classList.toggle('hide', mode === 'login');
  $('#aGo').textContent = mode === 'login' ? 'Log in' : 'Create account'; $('#aErr').textContent = '';
});
const authErr = e => ({
  'auth/invalid-credential': 'Wrong email or password.', 'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'This email already has an account. Log in instead.', 'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/popup-closed-by-user': 'Google sign-in was cancelled.', 'auth/unauthorized-domain': 'Add this website domain in Firebase > Authentication > Settings > Authorized domains.',
  'auth/operation-not-allowed': 'Enable this sign-in method in Firebase > Authentication > Sign-in method.', 'auth/network-request-failed': 'No internet connection.'
}[e.code] || e.message);
$('#authForm').onsubmit = async e => {
  e.preventDefault(); const email = $('#aEmail').value.trim(), pass = $('#aPass').value, name = $('#aName').value.trim();
  $('#aErr').textContent = '';
  try {
    if (mode === 'signup') {
      if (!name) return $('#aErr').textContent = 'Enter your name.';
      pendingName = name;
      const c = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(c.user, { displayName: name });
    } else await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) { pendingName = ''; $('#aErr').textContent = authErr(err) }
};
$('#gBtn').onclick = async () => {
  const b = $('#gBtn'), html = b.innerHTML; b.disabled = true; b.innerHTML = '<span class="spin"></span> Connecting…'; $('#aErr').textContent = '';
  const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
  try { await signInWithPopup(auth, p) }
  catch (err) {
    if (err.code === 'auth/popup-blocked') { try { return await signInWithRedirect(auth, p) } catch (e2) { err = e2 } }
    $('#aErr').textContent = authErr(err);
  }
  b.disabled = false; b.innerHTML = html;
};

onAuthStateChanged(auth, async u => {
  stopAll();
  if (!u) { me = null; cur = null; $('#app').classList.add('hide'); $('#app').classList.remove('open'); $('#auth').classList.remove('hide'); return }
  try {
    const r = ref(db, 'users/' + u.uid);
    if (!(await get(r)).exists()) await set(r, { name: pendingName || u.displayName || u.email.split('@')[0], email: u.email.toLowerCase(), photo: pendingPhoto || u.photoURL || '', status: '😊 Feeling good', open: true, createdAt: Date.now(), online: true, lastSeen: Date.now() });
    pendingName = ''; pendingPhoto = ''; me = { uid: u.uid }; initBots();
    $('#auth').classList.add('hide'); $('#app').classList.remove('hide');
    unsubs.push(onValue(ref(db, '.info/connected'), s => { if (s.val()) { onDisconnect(r).update({ online: false, lastSeen: serverTimestamp() }); update(r, { online: true }) } }));
    unsubs.push(onValue(ref(db, 'contacts/' + me.uid), s => { friends = s.val() || {}; watchLast(); renderList(); renderStrip();
      if (!autoDone) { autoDone = true; if (!Object.keys(friends).length && !store.get('cn_auto_' + me.uid)) { store.set('cn_auto_' + me.uid, 1); autoFriends() } }
    }));
    unsubs.push(onValue(ref(db, 'requests/' + me.uid), s => { requests = s.val() || {}; renderList() }));
    unsubs.push(onValue(ref(db, 'statuses'), s => {
      statuses = s.val() || {}; renderStrip();
      Object.entries(statuses[me.uid] || {}).forEach(([id, x]) => { if (x.at < Date.now() - 864e5) remove(ref(db, `statuses/${me.uid}/${id}`)) });
    }));
    unsubs.push(onValue(ref(db, 'incoming/' + me.uid), s => incomingCall(s.val())));
    unsubs.push(onValue(ref(db, 'userGroups/' + me.uid), s => {
      const ids = Object.keys(s.val() || {});
      ids.forEach(gid => {
        if (gL[gid]) return;
        gL[gid] = onValue(ref(db, 'groups/' + gid), s2 => { const v = s2.val(); if (v) groups[gid] = { id: gid, ...v, ...(gid === 'community' ? { name: 'Lumi Community' } : {}) }; else delete groups[gid]; renderList(); if (cur === 'g_' + gid) headInfo() }, () => { delete groups[gid]; renderList() });
        watchPath('g_' + gid, 'groupMessages/' + gid);
      });
      Object.keys(gL).forEach(gid => { if (!ids.includes(gid)) { gL[gid](); delete gL[gid]; delete groups[gid]; if (lastL['g_' + gid]) { lastL['g_' + gid](); delete lastL['g_' + gid]; delete lastMsg['g_' + gid] } } });
      renderList();
    }));
    unsubs.push(onValue(ref(db, 'users'), s => {
      users = s.val() || {}; for (const k in users) users[k].uid = k; users = withBots(users);
      const m = users[me.uid]; if (m) { setAv($('#meAv'), m, true); $('#meName').textContent = m.name; $('#meStatus').textContent = (m.status || '') + ' · tap to edit' }
      if (!welcomed && users[me.uid]) { welcomed = true; toast('Welcome to Lumi Chat, ' + users[me.uid].name.split(' ')[0] + '! 🎉') }
      renderList(); renderStrip(); if (cur && (users[cur] || isG(cur))) { headInfo(); render() }
    }, err => toast('Database error: ' + err.code)));
    joinCommunity();
  } catch (err) { toast('Could not load your profile: ' + err.code) }
});
function stopAll() { unsubs.forEach(f => f()); unsubs = []; chatUnsubs.forEach(f => f()); chatUnsubs = []; users = {}; msgs = {}; friends = {}; requests = {}; statuses = {}; Object.values(lastL).forEach(f => f()); lastL = {}; lastMsg = {}; Object.values(gL).forEach(f => f()); gL = {}; groups = {}; autoDone = false; welcomed = false }

/* ---------- People list ---------- */
function renderList() {
  if (!me) return; const q = $('#search').value.trim().toLowerCase(), box = $('#list'), nReq = Object.keys(requests).length;
  document.querySelectorAll('[data-tab2]').forEach(b => b.classList.toggle('on', b.dataset.tab2 === tab));
  $('#reqBadge').textContent = nReq; $('#reqBadge').classList.toggle('hide', !nReq); $('#chips2').classList.toggle('hide', tab !== 'friends'); document.querySelector('.searchbox').classList.toggle('hide', tab !== 'friends');
  if (tab === 'requests') {
    box.innerHTML = Object.keys(requests).map(uid => { const u = users[uid]; return u ? `<div class="row-c" style="cursor:default">${avStr(u)}<div class="grow"><b>${esc(u.name)}</b><small>wants to be your friend</small></div><button class="mini ok" data-acc="${uid}">Accept</button><button class="mini no" data-dec="${uid}">✕</button></div>` : '' }).join('') || '<p class="note">No friend requests right now.</p>';
    box.querySelectorAll('[data-acc]').forEach(b => b.onclick = () => acceptReq(b.dataset.acc));
    box.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => remove(ref(db, `requests/${me.uid}/${b.dataset.dec}`)));
    return;
  }
  if (tab === 'status') {
    const mine = activeSt(me.uid), lm = mine[mine.length - 1];
    const rows = Object.keys(friends).map(id => users[id]).filter(u => u && activeSt(u.uid).length).sort((a, b) => activeSt(b.uid).slice(-1)[0].at - activeSt(a.uid).slice(-1)[0].at);
    box.innerHTML = `<div class="row-c" data-stu="${me.uid}">${avStr(users[me.uid] || { name: '?' }, mine.length ? 'ring' : '')}<div class="grow"><b>My status</b><small>${mine.length ? mine.length + ' update' + (mine.length > 1 ? 's' : '') + ' · ' + fmtTime(lm.at) : 'Tap Add to share a status'}</small></div><button class="mini ok" data-newst>＋ Add</button></div><p class="sec">Recent updates</p>`
      + (rows.map(u => { const l = activeSt(u.uid).slice(-1)[0]; return `<div class="row-c" data-stu="${u.uid}">${avStr(u, 'ring')}<div class="grow"><b>${esc(u.name)}</b><small>${fmtDay(l.at)} ${fmtTime(l.at)}</small></div></div>` }).join('') || '<p class="note">No status updates from your friends yet.</p>');
    box.querySelectorAll('[data-stu]').forEach(r => r.onclick = () => { activeSt(r.dataset.stu).length ? viewStatus(r.dataset.stu) : statusComposer() });
    box.querySelector('[data-newst]').onclick = ev => { ev.stopPropagation(); statusComposer() };
    return;
  }
  const arr = Object.values(users).filter(u => (friends[u.uid] || isB(u.uid)) && (!q || (u.name + ' ' + u.email).toLowerCase().includes(q)))
    .sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0) || a.name.localeCompare(b.name));
  const gs = Object.values(groups).filter(g => !q || g.name.toLowerCase().includes(q));
  const all = [...arr.map(u => ({ k: u.uid, u })), ...gs.map(g => ({ k: 'g_' + g.id, g }))];
  const isUnread = k => { const l = lastMsg[k]; return l && l.from !== me.uid && l.at > readAt(k) && cur !== k };
  let items = all.filter(it => showArch ? arch.includes(it.k) : !arch.includes(it.k));
  if (filt === 'unread') items = items.filter(it => isUnread(it.k));
  if (filt === 'groups') items = items.filter(it => it.g || it.k === 'b_group');
  items.sort((x, y) => (pins.includes(y.k) - pins.includes(x.k)) || (lastMsg[y.k]?.at || 0) - (lastMsg[x.k]?.at || 0) || (rk(y.k) - rk(x.k)));
  const nArch = all.filter(it => arch.includes(it.k)).length;
  document.querySelectorAll('[data-f]').forEach(b => b.classList.toggle('on', b.dataset.f === filt));
  box.innerHTML = (showArch ? '<div class="row-c arch" data-arch="back"><span class="ai">‹</span><div class="grow"><b>Archived chats</b><small>Tap to go back</small></div></div>' : '') + items.map(({ k, u, g }) => {
    const l = lastMsg[k], unread = isUnread(k), muted = mutes.includes(k);
    const mine = l && l.from === me.uid, tk = mine ? `<span class="tk ${l.t === 2 || u?.online ? 'd' : ''}">${l.t === 2 || u?.online ? '✓✓' : '✓'}</span> ` : '';
    const who = (g || k === 'b_group') && l ? (mine ? 'You: ' : nm(l.from) + ': ') : '';
    const prev = l ? tk + who + prevText(l) : esc(g ? Object.keys(g.members || {}).length + ' members' : u.status || '');
    const when = l ? (new Date(l.at).toDateString() === new Date().toDateString() ? fmtTime(l.at) : fmtDay(l.at)) : '';
    return `<div class="row-c ${cur === k ? 'sel' : ''}" data-id="${k}">${g ? avStr({ name: g.name }) : avStr(u, u.online ? 'on' : '')}
      <div class="grow"><div class="rt"><b>${esc(g ? g.name : u.name)}</b><time class="${unread && !muted ? 'un' : ''}">${when}</time></div>
      <div class="rp"><small>${prev}</small><span class="flags">${pins.includes(k) ? '📌' : ''}${muted ? '🔕' : ''}</span>${unread ? `<i class="ub ${muted ? 'mu' : ''}">1</i>` : ''}</div></div><button class="rowmore" data-more="${k}" title="More">⌄</button></div>`;
  }).join('')
    || `<p class="note">${filt === 'all' && !showArch ? 'No chats yet.<br>Add someone below, or tap ＋ to add by email.' : 'Nothing here.'}</p>`;
  if (!showArch && nArch) box.innerHTML += `<div class="row-c arch" data-arch="open"><span class="ai">📦</span><div class="grow"><b>Archived</b><small>${nArch} chat${nArch > 1 ? 's' : ''}</small></div></div>`;
  const sug = Object.values(users).filter(u => u.uid !== me.uid && !isB(u.uid) && !friends[u.uid] && (!q || (u.name + ' ' + u.email).toLowerCase().includes(q)));
  if (sug.length && !showArch && filt === 'all') box.innerHTML += '<p class="sec">People on Lumi</p>' + sug.map(u => `<div class="row-c" style="cursor:default">${avStr(u, u.online ? 'on' : '')}<div class="grow"><b>${esc(u.name)}</b><small>${esc(u.status || '')}</small></div><button class="mini ok" data-add="${u.uid}">${requests[u.uid] ? 'Accept' : sent[u.uid] ? 'Sent ✓' : 'Add'}</button></div>`).join('');
  box.querySelectorAll('.row-c[data-id]').forEach(r => {
    r.onclick = ev => { if (r._lpd) { r._lpd = false; ev.stopPropagation(); return } openChat(r.dataset.id) };
    r.oncontextmenu = ev => { ev.preventDefault(); rowMenu(ev, r.dataset.id) };
    r.addEventListener('touchstart', ev => { r._lp = setTimeout(() => { r._lpd = true; const t = ev.touches[0]; rowMenu({ clientX: t.clientX, clientY: t.clientY, stopPropagation() { } }, r.dataset.id) }, 550) }, { passive: true });
    ['touchend', 'touchmove', 'touchcancel'].forEach(n => r.addEventListener(n, () => clearTimeout(r._lp), { passive: true }));
  });
  box.querySelectorAll('.row-c[data-id] .av').forEach(a => a.onclick = ev => { ev.stopPropagation(); infoFor(a.closest('.row-c').dataset.id) });
  box.querySelectorAll('[data-more]').forEach(b => b.onclick = ev => { ev.stopPropagation(); rowMenu(ev, b.dataset.more) });
  box.querySelectorAll('[data-arch]').forEach(r => r.onclick = () => { showArch = r.dataset.arch === 'open'; renderList() });
  box.querySelectorAll('[data-add]').forEach(b => b.onclick = () => quickAdd(b.dataset.add));
}
$('#search').oninput = renderList;
function headInfo() {
  if (isG(cur)) { const g = groups[cur.slice(2)]; if (!g) return; setAv($('#cAv'), { name: g.name }, false); $('#cName').textContent = g.name; $('#cSub').textContent = Object.keys(g.members || {}).map(id => id === me.uid ? 'You' : nm(id)).join(', '); return }
  if (cur === 'b_group') { setAv($('#cAv'), BOTS.b_group, false); $('#cName').textContent = BOTS.b_group.name; $('#cSub').innerHTML = botTyping === 'b_group' && botWho ? `<span class="dots">${esc(botWho)} is typing<i></i><i></i><i></i></span>` : 'Ayesha, Hussain, Fizza, Lumi AI, You'; return }
  const u = users[cur]; setAv($('#cAv'), u, u.online); $('#cName').textContent = u.name; $('#cSub').innerHTML = (u.typing === me.uid || botTyping === cur) ? '<span class="dots">typing<i></i><i></i><i></i></span>' : esc(seenText(u)) }

/* ---------- Chat ---------- */
function openChat(uid) {
  markRead(uid); syncComposer(); searchQ = ''; editing = null; $('#sbar').classList.add('hide'); $('#sIn').value = ''; $('#msgs').dataset.wp = store.get('cn_wp_' + uid, 'doodle');
  chatUnsubs.forEach(f => f()); chatUnsubs = []; msgs = {}; cur = uid; clearReply();
  $('#empty').classList.add('hide'); $('#pane').classList.remove('hide'); { const p = $('#pane'); p.classList.remove('enter'); void p.offsetWidth; p.classList.add('enter') } $('#app').classList.add('open');
  headInfo(); renderList(); render();
  if (isB(uid)) { msgs = botLoad(uid); render(); if (!Object.keys(msgs).length) botReply('__welcome'); return }
  const path = chatPath(), q = query(ref(db, path), limitToLast(200));
  const put = s => { const m = { id: s.key, ...s.val() }; msgs[m.id] = m; if (m.from !== me.uid) { markRead(cur); renderList() } if (m.from !== me.uid && m.t !== 2) update(ref(db, path + '/' + m.id), { t: 2 }); render() };
  chatUnsubs.push(onChildAdded(q, put), onChildChanged(q, put), onChildRemoved(q, s => { delete msgs[s.key]; render() }));
}
const hlt = t => { const e = esc(t); if (!searchQ) return e; const q = esc(searchQ).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); return e.replace(new RegExp(q, 'gi'), x => `<mark>${x}</mark>`) };
function render() {
  if (!cur) return; const box = $('#msgs'), peer = users[cur] || {};
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  const list = Object.values(msgs).filter(m => !hid.includes(m.id)).sort((a, b) => a.at - b.at);
  let html = '', day = '', prev = null;
  for (const m of list) {
    if (searchQ && !(m.text || '').toLowerCase().includes(searchQ)) continue;
    const d = new Date(m.at).toDateString(); if (d !== day) { day = d; prev = null; html += `<div class="day"><span>${fmtDay(m.at)}</span></div>` }
    const mine = m.from === me.uid, u = users[m.from] || { name: '?' }, first = prev !== m.from; prev = m.from;
    let quote = '';
    if (m.reply) { const qu = users[m.reply.uid] || { name: '?' }; quote = `<div class="quote">${avStr(qu, 'sm')}<div><b>${m.reply.uid === me.uid ? 'You' : esc(qu.name)}</b>${esc(m.reply.text)}</div></div>` }
    const body = m.voice ? `<audio controls src="${m.voice}"></audio>` : m.image ? `<img class="pic" src="${m.image}">${m.text ? '<div>' + hlt(m.text) + '</div>' : ''}` : hlt(m.text);
    const counts = {}; Object.values(m.react || {}).forEach(e => counts[e] = (counts[e] || 0) + 1);
    const rx = Object.keys(counts).length ? `<span class="react">${Object.entries(counts).map(([e, n]) => e + (n > 1 ? n : '')).join(' ')}</span>` : '';
    const dbl = m.t === 2 || peer.online, tick = mine ? `<span class="tick ${dbl ? 'd' : ''}">${dbl ? '✓✓' : '✓'}</span>` : '';
    const av = mine ? '' : first ? avStr(u, '', m.from) : '<div class="avsp"></div>';
    const gn = (isG(cur) || cur === 'b_group') && !mine && first ? `<b class="gn" style="color:${colorOf(u.name)}">${esc(u.name)}</b>` : '';
    html += `<div class="mrow ${mine ? 'me' : ''} ${first ? 'first' : ''}">${av}<div class="m ${mine ? 'me' : ''} ${first ? 'tail' : ''} ${rx ? 'has' : ''} ${m.voice ? 'v' : ''}" data-id="${m.id}">${gn}${m.fwd ? '<div class="fwd">↪ Forwarded</div>' : ''}${quote}<span class="tx">${body}</span><span class="meta">${starred.includes(m.id) ? '⭐ ' : ''}${m.edited ? '<em>edited</em> ' : ''}${fmtTime(m.at)} ${tick}</span>${rx}</div></div>`;
  }
  box.innerHTML = html || '<div class="empty" style="margin:auto"><p>Say hi 👋</p></div>';
  if (atBottom) box.scrollTop = box.scrollHeight;
  box.querySelectorAll('.m').forEach(el => { el.onclick = e => { if (e.target.tagName !== 'AUDIO') showMenu(e, el.dataset.id) }; el.ondblclick = () => toggleReact(el.dataset.id, '❤️') });
  box.querySelectorAll('.pic').forEach(i => i.onclick = e => { e.stopPropagation(); lightbox(i.src) });
  box.querySelectorAll('.mrow>.av').forEach(a => a.onclick = () => profile(a.dataset.uid));
}
function syncComposer() { const has = !!$('#msgIn').value.trim(); $('.send').classList.toggle('hide', !has); $('#micBtn').classList.toggle('hide', has) }
function watchLast() {
  Object.keys(friends).forEach(uid => watchPath(uid, 'messages/' + [me.uid, uid].sort().join('/')));
  Object.keys(lastL).forEach(k => { if (!isG(k) && !friends[k]) { lastL[k](); delete lastL[k]; delete lastMsg[k] } });
}
function watchPath(key, path) {
  if (lastL[key]) return;
  lastL[key] = onValue(query(ref(db, path), limitToLast(1)), s => {
    const v = s.val(), id = v && Object.keys(v)[0], prev = lastMsg[key]; lastMsg[key] = v ? { id, ...v[id] } : null;
    if (prev !== undefined && v && v[id].from !== me.uid && (!prev || prev.id !== id) && !mutes.includes(key)) beep();
    if (v && v[id].from !== me.uid && v[id].t !== 2) update(ref(db, path + '/' + id), { t: 2 });
    if (cur === key && v && v[id].from !== me.uid) markRead(key);
    renderList();
  }, () => { });
}
async function sendMsg(extra) {
  if (!cur) return; const peer = users[cur];
  const m = { from: me.uid, at: Date.now(), t: peer?.online ? 2 : 1, ...extra };
  if (replyTo) m.reply = replyTo;
  clearReply();
  if (isB(cur)) { m.id = 'm' + Date.now(); msgs[m.id] = m; botSave(); render(); botReply(m); return }
  try { await push(ref(db, chatPath()), m) } catch (err) { toast('Message not sent: ' + err.code) }
}
function send() {
  update(ref(db, 'users/' + me.uid), { typing: '' }).catch(() => { });
  const t = $('#msgIn').value.trim(); if (!t) return;
  $('#msgIn').value = ''; syncComposer(); $('#emojiBox').classList.add('hide');
  if (editing) {
    const id = editing, m = msgs[id]; clearReply(); if (!m) return;
    if (isB(cur)) { m.text = t; m.edited = true; botSave(); render() }
    else update(ref(db, `${chatPath()}/${id}`), { text: t, edited: true }).catch(err => toast('Could not edit: ' + err.code));
    return;
  }
  sendMsg({ text: t });
}
function clearReply() { editing = null; replyTo = null; $('#replyBar').classList.add('hide') }

/* ---------- Message menu ---------- */
const toggleReact = (id, e) => { const m = msgs[id]; if (!m) return; const mine = m.react?.[me.uid]; if (isB(cur)) { const r = { ...(m.react || {}) }; if (mine === e) delete r[me.uid]; else r[me.uid] = e; m.react = r; botSave(); render(); return } update(ref(db, `${chatPath()}/${id}/react`), { [me.uid]: mine === e ? null : e }) };
function showMenu(e, id) {
  const m = msgs[id], menu = $('#menu'), el = e.target.closest('.m'); if (!m || !el) return;
  document.querySelectorAll('.m.sel').forEach(x => x.classList.remove('sel')); el.classList.add('sel');
  const st = starred.includes(id), canEdit = m.from === me.uid && m.text && !m.voice && !m.image;
  menu.innerHTML = `<div class="rx">${REACTS.map(r => `<span data-r="${r}">${r}</span>`).join('')}</div>
    <button data-a="reply">↩️ Reply</button>${m.text ? '<button data-a="copy">📋 Copy</button>' : ''}
    <button data-a="star">${st ? '☆ Unstar' : '⭐ Star'}</button><button data-a="fwd">➡️ Forward</button>${canEdit ? '<button data-a="edit">✏️ Edit</button>' : ''}
    <button data-a="me" class="danger">🗑 Delete for me</button>${m.from === me.uid ? '<button data-a="all" class="danger">🗑 Delete for everyone</button>' : ''}`;
  menu.classList.remove('hide');
  const r = el.getBoundingClientRect(), w = menu.offsetWidth, h = menu.offsetHeight;
  let top = r.top - h - 8; if (top < 60) top = Math.min(r.bottom + 8, innerHeight - h - 8);
  let left = m.from === me.uid ? r.right - w : r.left; left = Math.max(8, Math.min(left, innerWidth - w - 8));
  menu.style.left = left + 'px'; menu.style.top = Math.max(8, top) + 'px';
  menu.querySelectorAll('[data-r]').forEach(s => s.onclick = () => { toggleReact(id, s.dataset.r); hideMenu() });
  menu.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a; hideMenu();
    if (a === 'reply') { editing = null; replyTo = { id, uid: m.from, text: m.voice ? '🎤 Voice message' : m.image ? '📷 Photo' : (m.text || '').slice(0, 60) }; $('#rWho').textContent = m.from === me.uid ? 'You' : users[m.from].name; $('#rTxt').textContent = replyTo.text; $('#replyBar').classList.remove('hide'); $('#msgIn').focus() }
    if (a === 'copy') navigator.clipboard?.writeText(m.text).then(() => toast('Copied'));
    if (a === 'star') { starred = st ? starred.filter(x => x !== id) : [...starred, id]; store.set('cn_star', starred); render(); toast(st ? 'Removed from starred' : 'Message starred ⭐') }
    if (a === 'fwd') forwardModal(id);
    if (a === 'edit') { replyTo = null; editing = id; $('#msgIn').value = m.text; syncComposer(); $('#rWho').textContent = 'Editing message'; $('#rTxt').textContent = m.text.slice(0, 60); $('#replyBar').classList.remove('hide'); $('#msgIn').focus() }
    if (a === 'me') { hid.push(id); store.set('cn_hid', hid); render(); toast('Message deleted for you') }
    if (a === 'all' && isB(cur)) { delete msgs[id]; botSave(); render(); toast('Message deleted for everyone') }
    else if (a === 'all') remove(ref(db, `${chatPath()}/${id}`)).then(() => toast('Message deleted for everyone')).catch(err => toast('Could not delete: ' + err.code));
  });
  e.stopPropagation();
}
const hideMenu = () => { $('#menu').classList.add('hide'); document.querySelectorAll('.m.sel').forEach(x => x.classList.remove('sel')) };
document.addEventListener('click', e => { if (!e.target.closest('#menu')) hideMenu(); if (!e.target.closest('#themeBox')) $('#themeBox').classList.add('hide'); if (!e.target.closest('#emojiBox,[data-action=emoji]')) $('#emojiBox').classList.add('hide') });

/* ---------- Voice message (max 30s, saved inside the message) ---------- */
async function mic() {
  const b = $('#micBtn');
  if (rec && rec.state === 'recording') { rec.stop(); return }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    rec = new MediaRecorder(stream); const chunks = [];
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = () => {
      clearTimeout(recTimer); stream.getTracks().forEach(t => t.stop()); b.classList.remove('rec'); b.textContent = '🎤';
      const fr = new FileReader();
      fr.onload = () => fr.result.length > 650000 ? toast('Voice note is too long.') : sendMsg({ voice: fr.result });
      fr.readAsDataURL(new Blob(chunks, { type: rec.mimeType }));
    };
    rec.start(); b.classList.add('rec'); b.textContent = '⏹'; toast('Recording… tap again to send (30s max)');
    recTimer = setTimeout(() => rec.state === 'recording' && rec.stop(), 30000);
  } catch { toast('Microphone access is blocked. Allow it in your browser settings.') }
}

/* ---------- Profiles ---------- */
function modal(html) { stopScan(); $('#sheet').innerHTML = html; $('#modal').classList.remove('hide') }
$('#modal').onclick = e => { if (e.target.id === 'modal') { stopScan(); $('#modal').classList.add('hide') } };
function profile(uid) {
  const u = users[uid || cur]; if (!u) return; const isMe = u.uid === me.uid, bot = isB(u.uid);
  const mutual = Object.values(groups).filter(g => g.members?.[u.uid]).map(g => g.name);
  modal(`${avStr(u, 'big ' + (u.online ? 'on' : ''))}<h2>${esc(u.name)}</h2>
    <span class="pill">${u.online ? '🟢 Active now' : '⚪ ' + esc(seenText(u))}</span>
    <div class="info">
      <div><small>About</small><p>${esc(u.about || (bot ? 'Built-in chat buddy' : 'Hey there! I am using Lumi.'))}</p></div>
      <div><small>Status</small><p>${esc(u.status || '—')}</p></div>
      ${bot ? '' : `<div><small>Email</small><p>${esc(u.email)}</p></div>`}
      ${u.createdAt ? `<div><small>Joined</small><p>${new Date(u.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })}</p></div>` : ''}
      ${mutual.length ? `<div><small>Groups in common</small><p>${esc(mutual.join(', '))}</p></div>` : ''}
    </div>
    <div class="qa">${isMe ? '' : '<button data-q="msg">💬 Message</button><button data-q="call">📞 Call</button>'}${u.photo ? '<button data-q="photo">🖼 Photo</button>' : ''}</div>
    ${friends[u.uid] ? '<button class="pill dangerp" id="unfr">Remove friend</button>' : ''}`);
  { const ba = $('#sheet .av.big'); if (u.photo && ba) { ba.style.cursor = 'zoom-in'; ba.onclick = () => lightbox(u.photo) } }
  document.querySelectorAll('.qa [data-q]').forEach(b => b.onclick = () => {
    const q = b.dataset.q; if (q === 'photo') return lightbox(u.photo);
    $('#modal').classList.add('hide'); openChat(u.uid); if (q === 'call') setTimeout(startCall, 400);
  });
  const ub = $('#unfr'); if (ub) ub.onclick = () => update(ref(db), { [`contacts/${me.uid}/${u.uid}`]: null, [`contacts/${u.uid}/${me.uid}`]: null }).then(() => { $('#modal').classList.add('hide'); if (cur === u.uid) actions.back(); toast('Friend removed') });
}
function resizePhoto(file, cb) {
  const r = new FileReader(); r.onload = () => { const i = new Image(); i.onload = () => {
    const c = document.createElement('canvas'); c.width = c.height = 160; const s = Math.min(i.width, i.height);
    c.getContext('2d').drawImage(i, (i.width - s) / 2, (i.height - s) / 2, s, s, 0, 0, 160, 160); cb(c.toDataURL('image/jpeg', .8))
  }; i.src = r.result }; r.readAsDataURL(file);
}
function myProfile() {
  const u = users[me.uid]; if (!u) return;
  modal(`${avStr(u, 'big')}<label class="up">📷 Change photo<input type="file" accept="image/*" id="dpIn"></label>
    <input id="nmIn" value="${esc(u.name)}" maxlength="40" placeholder="Your name"><input id="abIn" value="${esc(u.about || '')}" maxlength="120" placeholder="About (a short line)">
    <div class="chips">${STATUSES.map(s => `<span data-s="${s}">${s.split(' ')[0]}</span>`).join('')}</div>
    <input id="stIn" value="${esc(u.status || '')}" maxlength="40" placeholder="Status"><label class="chk2"><input type="checkbox" id="openCb" ${u.open !== false ? 'checked' : ''}> Let new people add me as a friend automatically</label><button class="primary" id="saveP" style="width:100%">Save</button>`);
  let photo = u.photo || '';
  $('#dpIn').onchange = e => e.target.files[0] && resizePhoto(e.target.files[0], d => { photo = d; $('#sheet .av.big').setAttribute('style', `background-image:url('${d}')`); $('#sheet .av.big').textContent = '' });
  document.querySelectorAll('[data-s]').forEach(s => s.onclick = () => $('#stIn').value = s.dataset.s);
  $('#saveP').onclick = async () => {
    try { await update(ref(db, 'users/' + me.uid), { name: $('#nmIn').value.trim() || u.name, status: $('#stIn').value.trim() || '😊 Feeling good', photo, open: $('#openCb').checked, about: $('#abIn').value.trim() }); $('#modal').classList.add('hide'); toast('Profile saved') }
    catch (err) { toast('Could not save: ' + err.code) }
  };
}

/* ---------- Actions ---------- */
const actions = {
  theme: e => {
    const box = $('#themeBox'), r = e.target.closest('[data-action]').getBoundingClientRect();
    box.innerHTML = THEMES.map(t => `<button data-t="${t}" title="${t}" class="${t === theme ? 'on' : ''}" style="background:linear-gradient(135deg,${SWATCH[t][0]},${SWATCH[t][1]})"></button>`).join('');
    box.classList.remove('hide'); box.style.top = (r.bottom + 8) + 'px'; box.style.left = Math.max(8, Math.min(r.right - box.offsetWidth, innerWidth - box.offsetWidth - 8)) + 'px';
    box.querySelectorAll('button').forEach(b => b.onclick = () => { setTheme(b.dataset.t); box.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)) });
  },
  logout: async () => { try { if (me) await update(ref(db, 'users/' + me.uid), { online: false, lastSeen: Date.now() }) } catch { } signOut(auth); toast('Signed out') },
  back: () => { $('#app').classList.remove('open'); cur = null; chatUnsubs.forEach(f => f()); chatUnsubs = []; $('#pane').classList.add('hide'); $('#empty').classList.remove('hide'); renderList() },
  profile: () => isG(cur) ? groupInfo() : cur === 'b_group' ? squadInfo() : profile(), more: showMore, closeSearch, attach: () => $('#imgIn').click(), newgroup: newGroupModal, myprofile: myProfile, mic, send, cancelReply: clearReply,
  call: startCall, accept: acceptCall, mute: toggleMute, newstatus: statusComposer, addfriend: addFriendModal,
  endCall: () => (botCallOn || botCallT) ? botEnd() : (ringingIn && !pc) ? declineCall() : endCall(true),
  qr: () => qrModal('my'), fab: fabMenu, settings: settingsModal,
  bottom: () => $('#msgs').scrollTo({ top: 1e9, behavior: 'smooth' }),
  clear: () => { if (confirm('Clear this chat for you? The other person will still see their messages.')) { hid.push(...Object.keys(msgs)); store.set('cn_hid', hid); render() } },
  emoji: () => $('#emojiBox').classList.toggle('hide')
};
document.addEventListener('click', e => { const a = e.target.closest('[data-action]'); if (a && actions[a.dataset.action]) actions[a.dataset.action](e) });
$('#msgIn').addEventListener('keydown', e => { if (e.key === 'Enter' && opts.enter) send() });
$('#emojiBox').innerHTML = EMOJIS.map(e => `<span>${e}</span>`).join('');
$('#emojiBox').onclick = e => { if (e.target.tagName === 'SPAN') { $('#msgIn').value += e.target.textContent; $('#msgIn').focus(); syncComposer() } };
document.querySelectorAll('[data-tab2]').forEach(b => b.onclick = () => { tab = b.dataset.tab2; renderList() });
$('#eye').onclick = () => { const p = $('#aPass'); p.type = p.type === 'password' ? 'text' : 'password' };
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => { $('#fName').classList.toggle('hide', b.dataset.tab === 'login'); $('#fPhoto').classList.toggle('hide', b.dataset.tab === 'login') }));
let tyT; $('#msgIn').addEventListener('input', () => { syncComposer(); if (!cur || isG(cur) || isB(cur) || opts.hideTyping) return; update(ref(db, 'users/' + me.uid), { typing: cur }); clearTimeout(tyT); tyT = setTimeout(() => update(ref(db, 'users/' + me.uid), { typing: '' }), 2000) });

/* ---------- Friends ---------- */
function addFriendModal() {
  modal(`<h3>Add a friend</h3><small>Enter the email they signed up with</small><input id="frIn" type="email" placeholder="friend@example.com"><button class="primary" id="frGo" style="width:100%">Send request</button>`);
  $('#frGo').onclick = async () => {
    const email = $('#frIn').value.trim().toLowerCase(); if (!email) return;
    try {
      const snap = await get(query(ref(db, 'users'), orderByChild('email'), equalTo(email)));
      if (!snap.exists()) return toast('No one found with that email.');
      const uid = Object.keys(snap.val())[0];
      if (uid === me.uid) return toast('That is your own email.');
      if (friends[uid]) return toast('You are already friends.');
      if (requests[uid]) { await acceptReq(uid); $('#modal').classList.add('hide'); return }
      await set(ref(db, `requests/${uid}/${me.uid}`), { from: me.uid, at: Date.now() });
      $('#modal').classList.add('hide'); toast('Friend request sent');
    } catch (err) { toast('Could not send: ' + err.code) }
  };
}
async function quickAdd(uid) {
  if (requests[uid]) return acceptReq(uid);
  try { await set(ref(db, `requests/${uid}/${me.uid}`), { from: me.uid, at: Date.now() }); sent[uid] = true; renderList(); toast('Friend request sent') }
  catch (err) { toast('Could not send: ' + err.code) }
}
async function acceptReq(uid) {
  try { await update(ref(db), { [`contacts/${me.uid}/${uid}`]: true, [`contacts/${uid}/${me.uid}`]: true, [`requests/${me.uid}/${uid}`]: null }); toast('You are now friends 🎉'); tab = 'friends'; renderList() }
  catch (err) { toast('Could not accept: ' + err.code) }
}

/* ---------- Status (24 hours) ---------- */
const BGS = ['linear-gradient(135deg,#e5588a,#ff9a6c)', 'linear-gradient(135deg,#6f58d6,#a28df0)', 'linear-gradient(135deg,#1f9e75,#5fd0a8)', 'linear-gradient(135deg,#2a7fd4,#5bb6f0)', 'linear-gradient(135deg,#232526,#5a5a6e)'];
const activeSt = uid => Object.entries(statuses[uid] || {}).map(([id, x]) => ({ id, ...x })).filter(x => x.at > Date.now() - 864e5).sort((a, b) => a.at - b.at);
function renderStrip() { if (tab === 'status') renderList() }
function renderStripOld() {
  if (!me || !users[me.uid]) return; const mine = activeSt(me.uid);
  let h = `<div class="st" data-st="${me.uid}">${avStr(users[me.uid], mine.length ? 'ring' : '')}<span class="plus" data-action="newstatus">＋</span><small>My status</small></div>`;
  Object.keys(friends).forEach(uid => { const u = users[uid]; if (u && activeSt(uid).length) h += `<div class="st" data-st="${uid}">${avStr(u, 'ring')}<small>${esc(u.name.split(' ')[0])}</small></div>` });
  $('#strip').innerHTML = h;
  $('#strip').querySelectorAll('.st').forEach(el => el.onclick = e => { if (e.target.closest('.plus')) return; activeSt(el.dataset.st).length ? viewStatus(el.dataset.st) : statusComposer() });
}
function resizeTo(file, max, cb) {
  const r = new FileReader(); r.onload = () => { const i = new Image(); i.onload = () => {
    const k = Math.min(1, max / Math.max(i.width, i.height)), c = document.createElement('canvas'); c.width = i.width * k; c.height = i.height * k;
    c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); cb(c.toDataURL('image/jpeg', .7)) }; i.src = r.result }; r.readAsDataURL(file);
}
function statusComposer() {
  let bg = BGS[0], photo = '';
  modal(`<h3>New status</h3><div class="stprev" id="stPrev" style="background:${bg}"><textarea id="stTxt" maxlength="200" placeholder="What's on your mind?"></textarea></div>
    <div class="chips" id="bgs">${BGS.map((b, i) => `<span class="sw ${i ? '' : 'on'}" data-bg="${i}" style="background:${b}"></span>`).join('')}</div>
    <label class="up">📷 Add photo<input type="file" accept="image/*" id="stPh"></label><button class="primary" id="stPost" style="width:100%">Post status</button><small>Your friends can see it for 24 hours</small>`);
  document.querySelectorAll('#bgs .sw').forEach(x => x.onclick = () => { bg = BGS[x.dataset.bg]; $('#stPrev').style.background = bg; photo = ''; document.querySelectorAll('#bgs .sw').forEach(y => y.classList.toggle('on', y === x)) });
  $('#stPh').onchange = e => e.target.files[0] && resizeTo(e.target.files[0], 480, d => { photo = d; $('#stPrev').style.background = `#000 url('${d}') center/cover` });
  $('#stPost').onclick = async () => {
    const text = $('#stTxt').value.trim(); if (!text && !photo) return toast('Write something or add a photo.');
    try { await push(ref(db, 'statuses/' + me.uid), { text, bg, photo, at: Date.now() }); $('#modal').classList.add('hide'); toast('Status posted') }
    catch (err) { toast('Could not post: ' + err.code) }
  };
}
let vTimer;
function viewStatus(uid) {
  const items = activeSt(uid), u = users[uid], v = $('#viewer'); let i = 0; v.classList.remove('hide');
  const close = () => { clearTimeout(vTimer); v.classList.add('hide'); v.innerHTML = '' };
  const show = () => {
    clearTimeout(vTimer); const x = items[i]; if (!x) return close();
    v.innerHTML = `<div class="bars">${items.map((_, k) => `<i class="${k < i ? 'full' : k === i ? 'run' : ''}"></i>`).join('')}</div>
      <div class="vh">${avStr(u, 'sm2')}<div class="grow"><b>${uid === me.uid ? 'You' : esc(u.name)}</b><small>${fmtTime(x.at)}</small></div>${uid === me.uid ? '<button class="ic" id="vdel">🗑</button>' : ''}<button class="ic" id="vx">✕</button></div>
      <div class="vbody" style="background:${x.photo ? '#000' : esc(x.bg || BGS[0])}">${x.photo ? `<img src="${x.photo}">` : ''}${x.text ? `<p>${esc(x.text)}</p>` : ''}</div><div class="vl"></div><div class="vr"></div>`;
    $('#vx').onclick = close; v.querySelector('.vl').onclick = () => { i = Math.max(0, i - 1); show() }; v.querySelector('.vr').onclick = () => { i++; show() };
    if (uid === me.uid) $('#vdel').onclick = () => remove(ref(db, `statuses/${uid}/${x.id}`)).then(() => { close(); toast('Status deleted') });
    vTimer = setTimeout(() => { i++; show() }, 5000);
  };
  show();
}

/* ---------- Voice call (WebRTC, signalling through Realtime Database) ---------- */
const RTC = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }] };
let pc = null, localStream = null, callPair = '', callRole = '', callPeer = null, callUnsubs = [], callTimer = null, ringT = null, ringingIn = false, incomingFrom = null, pendingIce = [];
const pairKey = (a, b) => [a, b].sort().join('/');
function showCall(u, text, incoming) {
  setAv($('#callAv'), u, false); $('#callAv').classList.add('big'); $('#callName').textContent = u.name; $('#callState').textContent = text;
  $('#accBtn').classList.toggle('hide', !incoming); $('#muteBtn').classList.toggle('hide', incoming); $('#call').classList.remove('hide');
}
const hideCall = () => { $('#call').classList.add('hide'); $('#call').classList.remove('live'); ringingIn = false };
function makePC() {
  pc = new RTCPeerConnection(RTC); pendingIce = [];
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  pc.ontrack = e => { const a = $('#remoteAudio'); a.srcObject = e.streams[0]; a.play().catch(() => { }) };
  pc.onicecandidate = e => { if (e.candidate) push(ref(db, `${callPair}/ice_${me.uid}`), e.candidate.toJSON()) };
  pc.onconnectionstatechange = () => { if (pc && pc.connectionState === 'failed') endCall(true, 'Could not connect (network blocked)') };
}
const addIce = c => pc && (pc.remoteDescription ? pc.addIceCandidate(c).catch(() => { }) : pendingIce.push(c));
const flushIce = () => { pendingIce.forEach(c => pc.addIceCandidate(c).catch(() => { })); pendingIce = [] };
function listenCall() {
  const peer = callPeer; let started = false;
  callUnsubs.push(onValue(ref(db, callPair + '/state'), s => {
    const st = s.val();
    if (st === 'ended' && pc) endCall(false, 'Call ended');
    if (st === 'active' && !started) { started = true; clearTimeout(ringT); $('#call').classList.add('live'); let n = 0; $('#callState').textContent = '00:00'; callTimer = setInterval(() => { n++; $('#callState').textContent = String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0') }, 1000) }
  }));
  if (callRole === 'caller') callUnsubs.push(onValue(ref(db, callPair + '/answer'), async s => { const a = s.val(); if (a && pc && !pc.currentRemoteDescription) { await pc.setRemoteDescription(a); flushIce() } }));
  callUnsubs.push(onChildAdded(ref(db, `${callPair}/ice_${peer}`), s => addIce(s.val())));
}
async function startCall() {
  if (!cur || pc) return; if (isG(cur) || cur === 'b_group') return toast('Group calls are not available yet.'); if (isB(cur)) return botCall(cur); const peer = users[cur];
  if (!peer.online) return toast(peer.name + ' is offline. You can call when they are active.');
  try { localStream = await navigator.mediaDevices.getUserMedia({ audio: true }) } catch { return toast('Microphone access is blocked. Allow it in your browser settings.') }
  callPeer = cur; callRole = 'caller'; callPair = 'calls/' + pairKey(me.uid, cur);
  try {
    await remove(ref(db, callPair)); makePC();
    const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
    await update(ref(db, callPair), { from: me.uid, to: cur, state: 'ringing', at: Date.now(), offer: { type: offer.type, sdp: offer.sdp } });
    await set(ref(db, 'incoming/' + cur), { from: me.uid, at: Date.now() });
    showCall(peer, 'Calling…', false); listenCall();
    ringT = setTimeout(() => endCall(true, 'No answer'), 35000);
  } catch (err) { toast('Could not start call: ' + (err.code || err.message)); endCall(false) }
}
function incomingCall(v) {
  if (!v) { if (ringingIn && !pc) hideCall(); return }
  if (Date.now() - v.at > 40000 || pc || !users[v.from]) { remove(ref(db, 'incoming/' + me.uid)); return }
  incomingFrom = v.from; ringingIn = true; showCall(users[v.from], 'Incoming voice call…', true);
}
async function acceptCall() {
  const from = incomingFrom; if (!from) return;
  try {
    const d = (await get(ref(db, 'calls/' + pairKey(me.uid, from)))).val();
    if (!d || d.state !== 'ringing') { toast('The call has ended.'); return hideCall() }
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    callPeer = from; callRole = 'callee'; callPair = 'calls/' + pairKey(me.uid, from); ringingIn = false;
    makePC(); await pc.setRemoteDescription(d.offer); flushIce();
    const ans = await pc.createAnswer(); await pc.setLocalDescription(ans);
    await update(ref(db, callPair), { answer: { type: ans.type, sdp: ans.sdp }, state: 'active' });
    remove(ref(db, 'incoming/' + me.uid)); showCall(users[from], 'Connecting…', false); listenCall();
  } catch (err) { toast('Could not answer: ' + (err.code || 'microphone blocked')); declineCall() }
}
function declineCall() { if (incomingFrom) update(ref(db, 'calls/' + pairKey(me.uid, incomingFrom)), { state: 'ended' }).catch(() => { }); remove(ref(db, 'incoming/' + me.uid)); hideCall(); endCall(false) }
function endCall(notify, msg) {
  if (notify && callPair) update(ref(db, callPair), { state: 'ended' }).catch(() => { });
  if (callRole === 'caller' && callPeer) remove(ref(db, 'incoming/' + callPeer)).catch(() => { });
  callUnsubs.forEach(f => f()); callUnsubs = []; clearTimeout(ringT); clearInterval(callTimer);
  if (pc) pc.close(); pc = null; if (localStream) localStream.getTracks().forEach(t => t.stop()); localStream = null;
  $('#remoteAudio').srcObject = null; if (msg) $('#callState').textContent = msg;
  setTimeout(hideCall, msg ? 1000 : 0); callPair = ''; callRole = ''; callPeer = null; $('#muteBtn').textContent = '🎙';
}
function toggleMute() { if (!localStream) { if (botCallOn) { const b = $('#muteBtn'); b.textContent = b.textContent === '🎙' ? '🔇' : '🎙' } return } const t = localStream.getAudioTracks()[0]; t.enabled = !t.enabled; $('#muteBtn').textContent = t.enabled ? '🎙' : '🔇' }

$('#imgIn').onchange = e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f || !cur) return;
  resizeTo(f, 800, d => {
    if (d.length > 380000) return toast('That photo is too large.');
    const cap = $('#msgIn').value.trim(); $('#msgIn').value = ''; syncComposer(); sendMsg(cap ? { image: d, text: cap } : { image: d });
  });
};
function lightbox(src) {
  const v = $('#viewer'); v.classList.remove('hide');
  v.innerHTML = `<div class="vh"><div class="grow"></div><button class="ic" id="vx">✕</button></div><div class="vbody" style="background:#000"><img src="${src}"></div>`;
  $('#vx').onclick = () => { v.classList.add('hide'); v.innerHTML = '' };
}

/* ---------- Auto friends (get started with a few people) ---------- */
async function autoFriends() {
  try {
    const all = Object.entries((await get(ref(db, 'users'))).val() || {}).filter(([id, u]) => id !== me.uid && u.open !== false).slice(0, 4);
    if (!all.length) return; const up = {};
    all.forEach(([id]) => { up[`contacts/${me.uid}/${id}`] = true; up[`contacts/${id}/${me.uid}`] = true });
    await update(ref(db), up); toast(`${all.length} friend${all.length > 1 ? 's' : ''} added to get you started 🎉`);
  } catch { }
}

/* ---------- Default group everyone joins ---------- */
async function joinCommunity() {
  if (store.get('cn_comm_' + me.uid)) return;
  try {
    const gr = ref(db, 'groups/community');
    if ((await get(gr)).exists()) await set(ref(db, 'groups/community/members/' + me.uid), true);
    else await set(gr, { name: 'Lumi Community', owner: me.uid, createdAt: Date.now(), members: { [me.uid]: true } });
    await set(ref(db, `userGroups/${me.uid}/community`), true);
    store.set('cn_comm_' + me.uid, 1);
  } catch { }
}

/* ---------- Groups ---------- */
function newGroupModal() {
  const fr = Object.keys(friends).map(id => users[id]).filter(Boolean);
  if (!fr.length) return toast('Add some friends first, then create a group.');
  modal(`<h3>New group</h3><input id="gName" maxlength="40" placeholder="Group name"><div class="pick">${fr.map(u => `<label class="chk">${avStr(u, 'sm2')}<span>${esc(u.name)}</span><input type="checkbox" value="${u.uid}"></label>`).join('')}</div><button class="primary" id="gGo" style="width:100%">Create group</button>`);
  $('#gGo').onclick = async () => {
    const name = $('#gName').value.trim(), ids = [...document.querySelectorAll('.pick input:checked')].map(x => x.value);
    if (!name) return toast('Enter a group name.'); if (!ids.length) return toast('Pick at least one friend.');
    try {
      const gr = push(ref(db, 'groups')), gid = gr.key, members = { [me.uid]: true }; ids.forEach(i => members[i] = true);
      await set(gr, { name, owner: me.uid, createdAt: Date.now(), members });
      const up = {}; Object.keys(members).forEach(i => up[`userGroups/${i}/${gid}`] = true); await update(ref(db), up);
      $('#modal').classList.add('hide'); toast('Group created'); setTimeout(() => openChat('g_' + gid), 500);
    } catch (err) { toast('Could not create group: ' + err.code) }
  };
}
function groupInfo(key = cur) {
  const g = groups[key.slice(2)]; if (!g) return; const mem = Object.keys(g.members || {});
  modal(`${avStr({ name: g.name }, 'big')}<h2>${esc(g.name)}</h2><small>${mem.length} members</small>
    <div class="mlist">${mem.map(id => `<div class="mrow2">${avStr(users[id] || { name: '?' }, 'sm2')}<span>${id === me.uid ? 'You' : esc(users[id]?.name || '?')}${id === g.owner ? ' <em>admin</em>' : ''}</span></div>`).join('')}</div>
    ${g.owner === me.uid ? '<button class="pill" id="gAdd">＋ Add members</button>' : ''}<button class="pill dangerp" id="gLeave">Leave group</button>`);
  $('#gLeave').onclick = () => { if (!confirm('Leave this group?')) return; update(ref(db), { [`groups/${g.id}/members/${me.uid}`]: null, [`userGroups/${me.uid}/${g.id}`]: null }).then(() => { $('#modal').classList.add('hide'); actions.back(); toast('You left the group') }).catch(err => toast('Could not leave: ' + err.code)) };
  if (g.owner === me.uid) $('#gAdd').onclick = () => {
    const cand = Object.keys(friends).filter(id => !g.members[id] && users[id]);
    if (!cand.length) return toast('All your friends are already in this group.');
    modal(`<h3>Add members</h3><div class="pick">${cand.map(id => `<label class="chk">${avStr(users[id], 'sm2')}<span>${esc(users[id].name)}</span><input type="checkbox" value="${id}"></label>`).join('')}</div><button class="primary" id="gAddGo" style="width:100%">Add</button>`);
    $('#gAddGo').onclick = async () => {
      const ids = [...document.querySelectorAll('.pick input:checked')].map(x => x.value); if (!ids.length) return;
      const up = {}; ids.forEach(i => { up[`groups/${g.id}/members/${i}`] = true; up[`userGroups/${i}/${g.id}`] = true });
      try { await update(ref(db), up); $('#modal').classList.add('hide'); toast('Members added') } catch (err) { toast('Could not add: ' + err.code) }
    };
  };
}


/* ---------- Chat extras: more menu, search, wallpaper, starred, forward ---------- */
const WALLS = [['doodle', 'Doodle'], ['plain', 'Plain'], ['aurora', 'Aurora'], ['dots', 'Dots'], ['grid', 'Grid'], ['sun', 'Glow']];
function showMore(e) {
  const menu = $('#menu'), r = e.target.closest('[data-action]').getBoundingClientRect();
  menu.innerHTML = '<button data-a="search">🔍 Search in chat</button><button data-a="wall">🎨 Chat wallpaper</button><button data-a="stars">⭐ Starred messages</button><button data-a="export">⬇️ Export chat</button><button data-a="info">ℹ️ Chat info</button><button data-a="clear" class="danger">🧹 Clear chat for me</button>';
  menu.classList.remove('hide'); const w = menu.offsetWidth;
  menu.style.top = (r.bottom + 6) + 'px'; menu.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + 'px';
  menu.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { hideMenu(); ({ export: exportChat, search: openSearch, wall: wallModal, stars: starsModal, info: () => actions.profile(), clear: () => actions.clear() })[b.dataset.a]() });
  e.stopPropagation();
}
function openSearch() { $('#sbar').classList.remove('hide'); $('#sIn').focus() }
function closeSearch() { $('#sbar').classList.add('hide'); $('#sIn').value = ''; searchQ = ''; render() }
$('#sIn').oninput = () => { searchQ = $('#sIn').value.trim().toLowerCase(); render() };
function wallModal() {
  const cur0 = store.get('cn_wp_' + cur, 'doodle');
  modal(`<h3>Chat wallpaper</h3><div class="walls">${WALLS.map(([k, n]) => `<div class="wtile ${k === cur0 ? 'on' : ''}" data-w="${k}"><div class="wprev" data-wp="${k}"></div><small>${n}</small></div>`).join('')}</div>`);
  document.querySelectorAll('.wtile').forEach(t => t.onclick = () => { store.set('cn_wp_' + cur, t.dataset.w); $('#msgs').dataset.wp = t.dataset.w; document.querySelectorAll('.wtile').forEach(x => x.classList.toggle('on', x === t)) });
}
function starsModal() {
  const list = Object.values(msgs).filter(m => starred.includes(m.id)).sort((a, b) => a.at - b.at);
  modal(`<h3>⭐ Starred messages</h3><div class="mlist">${list.map(m => `<div class="stm"><b>${m.from === me.uid ? 'You' : esc(users[m.from]?.name || '?')}</b> <small>${fmtDay(m.at)} ${fmtTime(m.at)}</small><div>${m.voice ? '🎤 Voice message' : m.image ? '📷 Photo' : esc(m.text)}</div></div>`).join('') || '<small>No starred messages in this chat yet. Tap a message and choose Star.</small>'}</div>`);
}
function forwardModal(id) {
  const m = msgs[id]; if (!m) return;
  const rows = [
    ...Object.keys(friends).filter(u => users[u]).map(u => ({ k: u, n: users[u].name, u: users[u] })),
    ...Object.values(groups).map(g => ({ k: 'g_' + g.id, n: g.name, u: { name: g.name } })),
    ...Object.values(BOTS).map(b => ({ k: b.uid, n: b.name, u: b }))
  ].filter(r => r.k !== cur);
  modal(`<h3>Forward to…</h3><div class="pick">${rows.map(r => `<div class="chk" data-k="${r.k}">${avStr(r.u, 'sm2')}<span>${esc(r.n)}</span></div>`).join('')}</div>`);
  document.querySelectorAll('.pick [data-k]').forEach(el => el.onclick = async () => {
    const p = { fwd: true }; if (m.text) p.text = m.text; if (m.image) p.image = m.image; if (m.voice) p.voice = m.voice;
    try { await sendRaw(el.dataset.k, p); $('#modal').classList.add('hide'); toast('Message forwarded') } catch (err) { toast('Could not forward: ' + (err.code || '')) }
  });
}
async function sendRaw(k, p) {
  const msg = { from: me.uid, at: Date.now(), t: 1, ...p };
  if (isB(k)) { const o = botLoad(k), id = 'm' + Date.now(); o[id] = { ...msg, id, t: 2 }; store.set(botKey(k), o); lastMsg[k] = o[id]; renderList(); return }
  const path = isG(k) ? 'groupMessages/' + k.slice(2) : 'messages/' + [me.uid, k].sort().join('/');
  if (!isG(k) && users[k]?.online) msg.t = 2;
  await push(ref(db, path), msg);
}
function squadInfo() {
  const mem = ['b_ayesha', 'b_hussain', 'b_fizza', 'b_ai'].map(id => BOTS[id]);
  modal(`${avStr(BOTS.b_group, 'big')}<h2>${esc(BOTS.b_group.name)}</h2><small>5 members</small><div class="mlist">${mem.map(b => `<div class="mrow2">${avStr(b, 'sm2')}<span>${esc(b.name)}</span></div>`).join('')}<div class="mrow2">${avStr(users[me.uid] || { name: 'Y' }, 'sm2')}<span>You</span></div></div><small>A built-in group where your chat buddies talk back.</small>`);
}
function squadReply(m) {
  const id = 'b_group', say = {
    b_ayesha: 'Welcome to the squad! 🎉 Say hi everyone 👋', b_hussain: 'Hey hey! 🎧 Kya chal raha hai?'
  };
  const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
  const who = m === '__welcome' ? ['b_ayesha', 'b_hussain'] : /\bai\b|lumi ai|chatnest ai/i.test(m.text || '') ? ['b_ai'] : shuffle(['b_ayesha', 'b_hussain', 'b_fizza']).slice(0, 1 + Math.floor(Math.random() * 2));
  let t0 = 500;
  who.forEach(b => {
    const text = m === '__welcome' ? say[b] : botAnswer(b, m), wait = Math.min(2600, 700 + text.length * 22);
    setTimeout(() => { botTyping = id; botWho = BOTS[b].name; if (cur === id) headInfo() }, t0);
    setTimeout(() => { botTyping = ''; if (cur === id) headInfo(); botPut(id, { id: 'r' + Date.now() + b, from: b, text, at: Date.now(), t: 2 }) }, t0 + wait);
    t0 += wait + 500;
  });
}
$('#aPhoto').onchange = e => e.target.files[0] && resizePhoto(e.target.files[0], d => { pendingPhoto = d; $('#pdp').style.backgroundImage = `url('${d}')`; $('#pdp').textContent = '' });


/* ---------- Chat list extras: pin, mute, archive ---------- */
function infoFor(k) { isG(k) ? groupInfo(k) : k === 'b_group' ? squadInfo() : profile(k) }
function rowMenu(e, k) {
  const menu = $('#menu'), pin = pins.includes(k), mu = mutes.includes(k), ar = arch.includes(k);
  menu.innerHTML = `<button data-a="pin">${pin ? '📌 Unpin chat' : '📌 Pin chat'}</button><button data-a="mute">${mu ? '🔔 Unmute' : '🔕 Mute'}</button><button data-a="arch">${ar ? '📤 Unarchive' : '📦 Archive'}</button><button data-a="read">✓ Mark as read</button><button data-a="info">ℹ️ View info</button>`;
  menu.classList.remove('hide'); const w = menu.offsetWidth, h = menu.offsetHeight;
  menu.style.left = Math.max(8, Math.min(e.clientX, innerWidth - w - 8)) + 'px'; menu.style.top = Math.max(8, Math.min(e.clientY + 6, innerHeight - h - 8)) + 'px';
  const tog = (list, name) => { const i = list.indexOf(k); i < 0 ? list.push(k) : list.splice(i, 1); store.set(name, list); renderList() };
  menu.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    hideMenu(); const a = b.dataset.a;
    if (a === 'pin') tog(pins, 'cn_pin'); if (a === 'mute') tog(mutes, 'cn_mute');
    if (a === 'arch') { tog(arch, 'cn_arch'); toast(ar ? 'Chat unarchived' : 'Chat archived') }
    if (a === 'read') { markRead(k); renderList() } if (a === 'info') infoFor(k);
  });
  e.stopPropagation();
}
document.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filt = b.dataset.f; renderList() });

/* ---------- QR code: my code + scan to add a friend ---------- */
let scanStream = null, scanRaf = 0;
function stopScan() { cancelAnimationFrame(scanRaf); if (scanStream) scanStream.getTracks().forEach(t => t.stop()); scanStream = null }
function qrModal(start) {
  modal('<div class="qrtabs"><button data-t="my">My code</button><button data-t="scan">Scan</button></div><div id="qrBody"></div>');
  const show = t => { stopScan(); document.querySelectorAll('.qrtabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); t === 'my' ? showMyQr() : showScan() };
  document.querySelectorAll('.qrtabs button').forEach(b => b.onclick = () => show(b.dataset.t)); show(start || 'my');
}
function showMyQr() {
  const u = users[me.uid] || {}, code = 'chatnest:add:' + me.uid;
  $('#qrBody').innerHTML = `<div class="qrbox" id="qrBox"></div><b>${esc(u.name || '')}</b><small>Ask a friend to scan this code to add you</small><button class="pill" id="qrCopy">📋 Copy my code</button>`;
  if (window.QRCode) new QRCode($('#qrBox'), { text: code, width: 200, height: 200, colorDark: '#1b1020', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
  else $('#qrBox').innerHTML = '<small>The QR library could not load. Check your internet and refresh.</small>';
  $('#qrCopy').onclick = () => navigator.clipboard?.writeText(code).then(() => toast('Code copied'));
}
async function showScan() {
  $('#qrBody').innerHTML = '<div class="scanbox"><video id="scanV" playsinline muted></video><i class="scanline"></i></div><small>Point the camera at a friend\'s Lumi QR code</small><input id="codeIn" placeholder="…or paste a friend\'s code"><button class="primary" id="codeGo" style="width:100%">Add with code</button>';
  $('#codeGo').onclick = () => handleCode($('#codeIn').value.trim());
  if (!window.jsQR) return toast('The scanner could not load. You can paste a code instead.');
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const v = $('#scanV'); v.srcObject = scanStream; await v.play();
    const c = document.createElement('canvas'), g = c.getContext('2d', { willReadFrequently: true });
    const tick = () => {
      if (!scanStream) return;
      if (v.videoWidth) { c.width = v.videoWidth; c.height = v.videoHeight; g.drawImage(v, 0, 0); const r = jsQR(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height); if (r && r.data) { stopScan(); handleCode(r.data); return } }
      scanRaf = requestAnimationFrame(tick);
    };
    tick();
  } catch { toast('Camera is blocked. You can paste a friend\'s code instead.') }
}
async function handleCode(code) {
  const m = /^chatnest:add:([A-Za-z0-9]+)$/.exec(code); if (!m) return toast('That is not a Lumi code.');
  const uid = m[1], u = users[uid];
  if (uid === me.uid) return toast('That is your own code.');
  if (!u) return toast('Could not find that person.');
  if (friends[uid]) { $('#modal').classList.add('hide'); return toast(u.name + ' is already your friend.') }
  try {
    if (requests[uid]) await acceptReq(uid);
    else if (u.open !== false) { await update(ref(db), { [`contacts/${me.uid}/${uid}`]: true, [`contacts/${uid}/${me.uid}`]: true }); toast(u.name + ' added as a friend 🎉') }
    else { await set(ref(db, `requests/${uid}/${me.uid}`), { from: me.uid, at: Date.now() }); toast('Friend request sent to ' + u.name) }
    $('#modal').classList.add('hide'); tab = 'friends'; renderList();
  } catch (err) { toast('Could not add: ' + (err.code || '')) }
}


/* ---------- Floating + menu, settings, sound, export ---------- */
function fabMenu(e) {
  const menu = $('#menu'), r = e.target.closest('[data-action]').getBoundingClientRect();
  menu.innerHTML = '<button data-a="friend">👤 Add friend</button><button data-a="qr">▦ QR code</button><button data-a="group">👥 New group</button><button data-a="status">✨ New status</button>';
  menu.classList.remove('hide'); const w = menu.offsetWidth, h = menu.offsetHeight;
  menu.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + 'px'; menu.style.top = Math.max(8, r.top - h - 8) + 'px';
  menu.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { hideMenu(); ({ friend: addFriendModal, qr: () => qrModal('my'), group: newGroupModal, status: statusComposer })[b.dataset.a]() });
  e.stopPropagation();
}
const applyOpts = () => { document.body.dataset.fs = opts.size };
function settingsModal() {
  modal(`<h3>⚙️ Settings</h3><div class="opts">
    <label class="opt"><span>🔔 Message sound</span><input type="checkbox" id="oSound" ${opts.sound ? 'checked' : ''}></label>
    <label class="opt"><span>↵ Enter key sends</span><input type="checkbox" id="oEnter" ${opts.enter ? 'checked' : ''}></label>
    <label class="opt"><span>✍️ Hide my "typing…"</span><input type="checkbox" id="oType" ${opts.hideTyping ? 'checked' : ''}></label>
    <div class="opt"><span>🔠 Text size</span><div class="seg" id="oSize">${[['s', 'Small'], ['m', 'Medium'], ['l', 'Large']].map(([k, n]) => `<button data-s="${k}" class="${opts.size === k ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <button class="pill" id="oRead">✓ Mark all chats as read</button></div>`);
  const save = () => { store.set('cn_opts', opts); applyOpts() };
  $('#oSound').onchange = e => { opts.sound = e.target.checked; save(); if (opts.sound) beep() };
  $('#oEnter').onchange = e => { opts.enter = e.target.checked; save() };
  $('#oType').onchange = e => { opts.hideTyping = e.target.checked; save() };
  document.querySelectorAll('#oSize [data-s]').forEach(b => b.onclick = () => { opts.size = b.dataset.s; save(); document.querySelectorAll('#oSize [data-s]').forEach(x => x.classList.toggle('on', x === b)) });
  $('#oRead').onclick = () => { Object.keys(lastMsg).forEach(k => markRead(k)); renderList(); toast('All chats marked as read') };
}
let actx = null;
function beep() {
  if (!opts.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume();
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(880, t); o.frequency.exponentialRampToValueAtTime(1320, t + .12);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.12, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .25);
    o.connect(g); g.connect(actx.destination); o.start(); o.stop(t + .26);
  } catch { }
}
function exportChat() {
  const list = Object.values(msgs).sort((a, b) => a.at - b.at); if (!list.length) return toast('Nothing to export yet.');
  const title = isG(cur) ? groups[cur.slice(2)]?.name : users[cur]?.name;
  const txt = `Lumi Chat · ${title}\n\n` + list.map(m => `[${new Date(m.at).toLocaleString()}] ${m.from === me.uid ? 'You' : users[m.from]?.name || '?'}: ${m.voice ? '[voice message]' : m.image ? '[photo] ' + (m.text || '') : m.text}`).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' })); a.download = 'Lumi-chat-' + String(title || 'chat').replace(/\W+/g, '-') + '.txt'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Chat exported');
}

/* ---------- Built-in chat buddies (AI + friends who reply) ---------- */
const botKey = id => `cn_bot_${me.uid}_${id}`;
const botLoad = id => store.get(botKey(id), {});
const lastOf = o => Object.values(o).sort((a, b) => a.at - b.at).slice(-1)[0] || null;
function initBots() { Object.keys(BOTS).forEach(id => { lastMsg[id] = lastOf(botLoad(id)) }) }
function botSave() { store.set(botKey(cur), msgs); lastMsg[cur] = lastOf(msgs); renderList() }
const pick = a => a[Math.floor(Math.random() * a.length)];
const POOLS = {
  b_ai: ['Interesting! Tell me more. 🙂', 'I am a simple built-in assistant, so try a joke, the time, or a calculation like 12*7.', 'Got it! Anything else I can help with?', 'Hmm, I am still learning. Ask me for a joke or say "help".'],
  b_ayesha: ['Haan bilkul! 😊', 'Acha, phir kya hua?', 'Haha 😂 sach mein?', 'Mujhe coffee chahiye abhi ☕', 'Wah, kamaal!', 'Theek hai 👍'],
  b_hussain: ['Haan yaar 👍', 'Ek zabardast gaana sun raha hoon abhi 🎧', 'Phir baat karte hain', 'Sahi kaha 😄', 'Acha acha, samajh gaya'],
  b_fizza: ['Hmm, sahi hai 😊', 'Abhi parh rahi hoon 📚 phir baat karte hain', 'Haha yeh to maza aa gaya', 'Bilkul theek!', 'Acha? Batao aur 😮']
};
const JOKES = ['Why did the developer go broke? Because he used up all his cache. 😄', 'Teacher: tum late kyun ho? Student: sir, sign board pe likha tha "School ahead, go slow". 😂', 'Computer ko cold kyun lagi? Kyunke uski Windows khuli thi. 🪟'];
function botAnswer(id, m) {
  const ai = id === 'b_ai', name = (users[me.uid]?.name || 'dost').split(' ')[0];
  if (m === '__welcome') return ai ? `Hi ${name}! 👋 I am Lumi AI, a simple built-in assistant. Ask me for a joke, the time, or a calculation, or just chat.` : pick([`Hey ${name}! 😊 Kaise ho?`, `Salam ${name}! Kya chal raha hai?`]);
  if (m.voice) return ai ? 'Got your voice note 🎤 I cannot listen yet, but you can type to me.' : pick(['Voice note mila 🎤 maza aa gaya!', 'Haha awaaz sunke achha laga 😄']);
  if (m.image) return ai ? 'Nice photo! 📷 I cannot look at images yet, but thanks for sharing.' : pick(['Wah, photo achi hai! 😍', 'Kya baat hai! 📷']);
  const t = (m.text || '').toLowerCase().trim(), re = r => r.test(t);
  const math = t.replace(/[x×]/g, '*').replace(/÷/g, '/');
  if (/^[\d\s+\-*/().%]+$/.test(math) && /\d/.test(math) && /[+\-*/%]/.test(math)) { try { const v = Function('"use strict";return (' + math + ')')(); if (isFinite(v)) return `${m.text.trim()} = ${+v.toFixed(6)}`; } catch { } }
  if (re(/salam|assalam/)) return 'Walaikum assalam! 😊';
  if (re(/\b(hi+|hello|hey|hlo)\b/)) return pick([`Hello ${name}! 👋`, `Hey ${name}! Kaise ho?`]);
  if (re(/kaise ho|kese ho|how are you|kya haal|kia haal/)) return pick(['Main bilkul theek hoon, aap sunao? 😊', 'Alhamdulillah mast! Aap?']);
  if (re(/your name|who are you|tum kaun|apka naam|tumhara naam|aap kaun/)) return ai ? 'I am Lumi AI, your built-in chat buddy. 🤖' : 'Main ' + BOTS[id].name + ' hoon! 😊';
  if (re(/are you (an? )?(ai|bot|real)|kya tum (ai|bot)/)) return ai ? 'I am a built-in demo assistant. I follow simple rules, I am not a full AI model.' : 'Haha, main Lumi ka built-in dost hoon. 😄';
  if (re(/thank|shukriya|shukria|thx/)) return pick(['Koi baat nahi! 😊', 'You are welcome! 🌸']);
  if (re(/\bbye\b|allah hafiz|khuda hafiz|good ?night|shab bakhair/)) return pick(['Allah hafiz! Phir milte hain 👋', 'Bye bye! Take care 💕']);
  if (re(/joke|latifa|mazaak|funny/)) return pick(JOKES);
  if (re(/\btime\b|waqt|kitne baje/)) return 'Abhi ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ho rahe hain. ⏰';
  if (re(/\bdate\b|today|aaj ki|tarikh/)) return 'Aaj ' + new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' hai. 📅';
  if (re(/\bhelp\b|what can you|kya kar sakte|features/)) return ai ? 'I can tell jokes, say the time and date, do quick maths (try 25*4), and chat. 🙂' : 'Bas baat karo mujhse! 😊';
  if (re(/sad|udaas|dukhi|tension/)) return 'Sab theek ho jayega, main hoon na. 🤗 Thoda sa muskurao!';
  if (re(/love|pyar/)) return 'Aww 🥰';
  if (re(/khana|food|biryani|pizza|hungry|bhook/)) return pick(['Biryani! 😋', 'Pizza khate hain 🍕', 'Mujhe bhi bhook lag gayi 😅']);
  return pick(POOLS[id]);
}
function botPut(id, r) {
  if (r.from !== me.uid && !mutes.includes(id)) beep();
  const o = cur === id ? msgs : botLoad(id); o[r.id] = r; store.set(botKey(id), o); lastMsg[id] = r;
  if (cur === id) { markRead(id); render() } renderList();
}
function botReply(m) {
  if (cur === 'b_group') return squadReply(m);
  const id = cur, text = botAnswer(id, m), wait = Math.min(2800, 700 + text.length * 22);
  setTimeout(() => { if (cur === id) { botTyping = id; headInfo() } }, 450);
  setTimeout(() => { botTyping = ''; if (cur === id) headInfo(); botPut(id, { id: 'r' + Date.now(), from: id, text, at: Date.now(), t: 2 }) }, 450 + wait);
}

/* ---------- Call with built-in buddies (speaks, and listens where the browser supports it) ---------- */
function speak(t, then) {
  const clean = t.replace(/[^\w\s.,?!'-]/g, '');
  if (!('speechSynthesis' in window) || !clean.trim()) return then && then();
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(clean); speaking = true; u.onend = u.onerror = () => { speaking = false; then && then() }; speechSynthesis.speak(u) }
  catch { speaking = false; then && then() }
}
function listen(id) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR || !botCallOn || recogOn || speaking) return;
  if ($('#muteBtn').textContent === '🔇') return void setTimeout(() => listen(id), 1000);
  recog = new SR(); recog.lang = 'en-US'; recog.interimResults = false; recogOn = true;
  recog.onresult = e => { const t = e.results[0][0].transcript; if (botCallOn) speak(botAnswer(id, { text: t }), () => setTimeout(() => listen(id), 300)) };
  recog.onerror = e => { recogOn = false; if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('Microphone is blocked, so the buddy can only talk.') };
  recog.onend = () => { recogOn = false; if (botCallOn && !speaking) setTimeout(() => listen(id), 500) };
  try { recog.start() } catch { recogOn = false }
}
function botCall(id) {
  if (pc || botCallOn || botCallT) return;
  botCallId = id; showCall(users[id], 'Calling…', false);
  botCallT = setTimeout(() => {
    botCallT = null; botCallOn = true; botSecs = 0; $('#call').classList.add('live'); $('#callState').textContent = '00:00';
    callTimer = setInterval(() => { botSecs++; $('#callState').textContent = String(Math.floor(botSecs / 60)).padStart(2, '0') + ':' + String(botSecs % 60).padStart(2, '0') }, 1000);
    speak(botAnswer(id, '__welcome'), () => listen(id));
  }, 1800 + Math.random() * 1200);
}
function botEnd() {
  const id = botCallId, n = botSecs, on = botCallOn;
  clearTimeout(botCallT); botCallT = null; clearInterval(callTimer); botCallOn = false; recogOn = false; speaking = false;
  try { if (recog) recog.abort(); speechSynthesis.cancel() } catch { } recog = null;
  $('#callState').textContent = on ? 'Call ended' : 'Cancelled'; setTimeout(hideCall, 900); $('#muteBtn').textContent = '🎙';
  if (on && id) botPut(id, { id: 'c' + Date.now(), from: me.uid, text: '📞 Voice call · ' + String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0'), at: Date.now(), t: 2 });
  botCallId = null;
}

/* ---------- Little UI touches ---------- */
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('.ic,.send,.primary,.mini,.tabs2 button,.google'); if (!b) return;
  const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height), s = document.createElement('span');
  s.className = 'ripple'; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
  b.appendChild(s); setTimeout(() => s.remove(), 650);
});
$('#msgs').addEventListener('scroll', () => { const b = $('#msgs'); $('#toBottom').classList.toggle('hide', b.scrollHeight - b.scrollTop - b.clientHeight < 200) });

applyOpts();
setTheme(theme);