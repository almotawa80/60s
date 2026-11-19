(() => {
'use strict';
const cfg = window.APP_CONFIG;
const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
const $app = document.getElementById('app');
const $toast = document.getElementById('toast');

/* ---------- helpers ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS = {
  get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
  set(k,v){ try { localStorage.setItem(k,v); } catch(e){} },
  del(k){ try { localStorage.removeItem(k); } catch(e){} }
};
const ERR = {
  invalid_code: 'الرمز غير صحيح، تأكد منه وحاول مرة أخرى',
  invalid_session: 'انتهت الجلسة، أدخل الرمز من جديد',
  already_played_today: 'أنهيت جولتك الرسمية اليوم، عد غداً',
  official_not_open: 'الجولة الرسمية غير متاحة الآن',
  no_competition: 'لا توجد مسابقة نشطة لصفك بعد',
  not_enough_questions: 'لا توجد أسئلة معتمدة كافية بعد، أخبر المعلم/ـة',
  forbidden: 'غير مسموح بهذا الإجراء',
  wrong_position: 'تعذّر تسجيل الإجابة، أعد المحاولة',
  invalid_join: 'رابط التسجيل غير صالح أو مغلق، اطلب رابطاً جديداً من المعلم/ـة',
  bad_name: 'اكتب الاسم الثلاثي بشكل صحيح',
  bad_no: 'اكتب رقم الطالب',
  already_registered: 'هذا الرقم مسجل مسبقاً في الصف، اطلب رمزك من المعلم/ـة',
  class_full: 'الصف ممتلئ'
};
function errMsg(e){
  const m = (e && e.message) || String(e);
  for (const k in ERR) if (m.includes(k)) return ERR[k];
  if (/Invalid login/i.test(m)) return 'البريد أو كلمة المرور غير صحيحة';
  if (/already registered/i.test(m)) return 'هذا البريد مسجّل مسبقاً، سجّل الدخول';
  if (/Password should/i.test(m)) return 'كلمة المرور قصيرة (6 أحرف على الأقل)';
  if (/Email not confirmed/i.test(m)) return 'فعّل بريدك الإلكتروني من الرسالة المرسلة إليك أولاً';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'تعذّر الاتصال، تحقق من الإنترنت';
  return 'حدث خطأ، حاول مرة أخرى';
}
async function rpc(name, args){ const { data, error } = await sb.rpc(name, args); if (error) throw error; return data; }
let toastTimer;
function toast(m){ $toast.textContent = m; $toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $toast.classList.remove('show'), 2800); }
const ICON = {
  home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  layers:'<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7"/><path d="M12 17h.01"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  gear:'<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  play:'<path d="M7 4l13 8-13 8V4z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  upload:'<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  download:'<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
  check:'<path d="M5 12l5 5 9-10"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  logout:'<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2.5.6 4 2.2 4 5"/>',
  clock:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>',
  print:'<path d="M7 9V3h10v6M6 18H4v-7h16v7h-2M7 14h10v7H7z"/>',
  back:'<path d="M9 5l7 7-7 7"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  refresh:'<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  send:'<path d="M21 3L3 10.5l7 2.5 2.5 7L21 3z"/><path d="M10 13l5-5"/>',
  more:'<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  circle:'<circle cx="12" cy="12" r="9"/>',
  checkc:'<circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/><path d="M8 12.5l2.8 2.8L16.5 9.5" stroke="#fff"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  sound:'<path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  mute:'<path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M22 9l-6 6M16 9l6 6"/>',
  star:'<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3z"/>'
};
const ic = n => '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + ICON[n] + '</svg>';
const LOGO = '<div class="logo" aria-hidden="true"><img src="icon-512.png" alt=""></div>';
const LETTERS = ['أ','ب','ج','د'];
function setTheme(t){ document.body.dataset.theme = t || 'mid'; }
function fmtDate(s){
  try { return new Date(s + 'T00:00:00').toLocaleDateString('ar-KW-u-nu-latn', { day: 'numeric', month: 'long' }); } catch(e){ return s; }
}
function todayKW(){ return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuwait' }); }
function addDays(s, n){ const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function phaseOf(c){
  if (!c) return 'none';
  const t = todayKW();
  if (t < c.start_date) return 'upcoming';
  if (t <= c.points_end_date) return 'points';
  if (t <= c.end_date) return 'knockout';
  return 'finished';
}
const PHASE_AR = { none: 'لا توجد مسابقة', upcoming: 'لم تبدأ بعد', points: 'جمع النقاط', knockout: 'التصفيات', finished: 'انتهت' };

/* ---------- modal + actions ---------- */
function modal(html){
  const el = document.createElement('div');
  el.className = 'modal-back';
  el.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
  el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  document.body.appendChild(el);
  return el;
}
const closeModals = () => document.querySelectorAll('.modal-back').forEach(m => m.remove());
const ACTS = {};
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const fn = ACTS[t.dataset.act];
  if (fn) { e.preventDefault(); fn(t, e); }
});
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]');
  if (!f) return;
  e.preventDefault();
  const fn = ACTS[f.dataset.form];
  if (fn) fn(f, e);
});
document.addEventListener('change', e => {
  const t = e.target.closest('[data-change]');
  if (!t) return;
  const fn = ACTS[t.dataset.change];
  if (fn) fn(t, e);
});
ACTS['close-modal'] = () => closeModals();

/* ======================================================
   STUDENT
   ====================================================== */
const S = { token: LS.get('mc_token'), home: null, cur: null, locked: false, timer: null };

function studentLogin(){
  stopTimer();
  setTheme('mid');
  document.body.classList.remove('wide');
  $app.innerHTML =
    '<div class="hero">' + LOGO +
    '<h1>تحدّي الدقيقة</h1><p>٤ أسئلة، ٦٠ ثانية، ومن يتصدّر؟</p></div>' +
    '<div class="pad col">' +
    '<div class="card col"><div><b style="font-size:19px">أنا طالب/ـة</b><div class="sub">اكتب الرمز الذي أعطاك إياه المعلم/ـة</div></div>' +
    '<div class="code-wrap"><div class="code-boxes">' + '<div class="code-box"></div>'.repeat(6) + '</div>' +
    '<input class="code-input" id="code" inputmode="latin" autocomplete="off" autocapitalize="characters" maxlength="6" aria-label="رمز الدخول"></div>' +
    '<button class="paste-btn" data-act="s-paste">' + ic('download') + ' لصق الرمز</button>' +
    '<div id="lerr"></div>' +
    '<button class="btn" data-act="s-login">ادخل/ي</button></div>' +
    '<div class="center"><button class="link" data-act="go-teacher">دخول المعلمين والمعلمات</button></div></div>';
  const inp = document.getElementById('code');
  const paint = v => $app.querySelectorAll('.code-box').forEach((el, i) => { el.textContent = v[i] || ''; el.classList.toggle('on', i === Math.min(v.length, 5)); });
  inp.addEventListener('input', () => {
    inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    paint(inp.value);
    if (inp.value.length === 6) ACTS['s-login']();
  });
  paint('');
  S.fill = v => { inp.value = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); paint(inp.value); if (inp.value.length === 6) ACTS['s-login'](); };
  if (S.preCode) { const c = S.preCode; S.preCode = null; setTimeout(() => S.fill(c), 50); } else setTimeout(() => inp.focus(), 50);
}
ACTS['s-paste'] = async () => {
  try { const t = await navigator.clipboard.readText(); if (!t) return toast('لا يوجد رمز منسوخ'); S.fill(t); }
  catch(e){ const v = prompt('الصق الرمز هنا:'); if (v) S.fill(v); }
};
ACTS['go-teacher'] = () => { location.hash = '#/t'; };
ACTS['go-student'] = () => { location.hash = '#/s'; };
ACTS['s-login'] = async () => {
  const inp = document.getElementById('code');
  const box = document.getElementById('lerr');
  if (!inp || inp.value.length < 6) { box.innerHTML = '<div class="err">اكتب الرمز كاملاً (6 خانات)</div>'; return; }
  box.innerHTML = '';
  try {
    const r = await rpc('student_login', { p_code: inp.value });
    S.token = r.token; LS.set('mc_token', r.token); LS.set('mc_code', inp.value);
    loadHome();
  } catch(e){ box.innerHTML = '<div class="err">' + esc(errMsg(e)) + '</div>'; }
};
ACTS['s-logout'] = () => { LS.del('mc_token'); S.token = null; S.home = null; studentLogin(); };

async function loadHome(){
  stopTimer();
  document.body.classList.remove('wide');
  $app.innerHTML = '<div class="spin"></div>';
  try { S.home = await rpc('student_home', { p_token: S.token }); }
  catch(e){
    if (String(e.message || '').includes('invalid_session')) { LS.del('mc_token'); S.token = null; return studentLogin(); }
    $app.innerHTML = '<div class="pad col"><div class="err">' + esc(errMsg(e)) + '</div><button class="btn" data-act="s-reload">إعادة المحاولة</button></div>';
    return;
  }
  setTheme(S.home.class.style);
  renderHome();
}
ACTS['s-reload'] = () => loadHome();

function renderHome(){
  const h = S.home, c = h.competition, ph = h.phase;
  let body = '';
  if (ph === 'none') {
    body = '<div class="phase"><b>لا توجد مسابقة نشطة</b></div><p class="muted">سيبدأ التحدي عندما يجهّز المعلم/ـة المسابقة. يمكنك التدريب الآن.</p>';
  } else if (ph === 'upcoming') {
    body = '<div class="phase"><b>تبدأ المسابقة قريباً</b><span class="chip warn">' + esc(fmtDate(c.start_date)) + '</span></div><p class="muted">يمكنك التدريب حتى موعد البداية.</p>';
  } else if (ph === 'points') {
    body = '<div class="phase"><b>مرحلة جمع النقاط</b><span class="chip warn">' + (c.days_left_points > 0 ? 'تنتهي بعد ' + c.days_left_points + ' يوم' : 'آخر يوم') + '</span></div>' +
      '<div class="stats"><div class="stat"><b>' + h.total_points + '</b><span>نقاطي</span></div><div class="stat"><b>' + (h.rank || '-') + '</b><span>ترتيبي في الصف</span></div></div>';
  } else if (ph === 'knockout') {
    body = '<div class="phase"><b>مرحلة التصفيات</b><span class="chip">حتى ' + esc(fmtDate(c.end_date)) + '</span></div>' +
      '<div class="stats"><div class="stat"><b>' + h.total_points + '</b><span>نقاطي</span></div><div class="stat"><b>' + (h.rank || '-') + '</b><span>ترتيبي في الصف</span></div></div>' +
      '<p class="muted">ستظهر مواجهاتك هنا عند إطلاق أدوار التصفيات.</p>';
  } else {
    body = '<div class="phase"><b>انتهت المسابقة</b></div><div class="stats"><div class="stat"><b>' + h.total_points + '</b><span>نقاطي</span></div><div class="stat"><b>' + (h.rank || '-') + '</b><span>ترتيبي النهائي</span></div></div>';
  }
  let main = '';
  if (ph === 'points') {
    if (h.in_progress_attempt) main = '<button class="btn accent" data-act="s-start" data-kind="official">' + ic('play') + ' أكمل جولتك</button>';
    else if (h.played_today) main = '<button class="btn" disabled>أنهيت جولة اليوم، عد غداً</button>';
    else main = '<button class="btn accent" data-act="s-start" data-kind="official">' + ic('play') + ' ابدأ التحدي</button>';
  }
  $app.innerHTML =
    '<div class="s-head"><div class="who"><span class="sub">أهلاً 👋</span><b>' + esc(h.student.name) + '</b><span class="sub">' + esc(h.class.name) + '</span></div>' +
    '<button class="avatar av-btn" data-act="s-menu" aria-label="القائمة">' + esc((h.student.name || '?').trim().charAt(0)) + '</button></div>' +
    '<div class="quick q2">' +
    '<button data-act="s-badges">' + ic('star') + '<span>شاراتي</span></button>' +
    '<button data-act="s-leaders">' + ic('trophy') + '<span>المتصدرون</span></button></div>' +
    '<div class="comp">' + body + main +
    '<button class="btn ghost" data-act="s-start" data-kind="practice">تدريب بلا نقاط</button></div>';
}
ACTS['s-badges'] = () => toast('الشارات قريباً');
ACTS['s-menu'] = () => {
  const m = LS.get('mc_mode') || 'auto';
  modal('<div class="sheet"><div class="sheet-list">' +
    '<button class="sheet-i" data-act="s-profile">' + ic('user') + '<span>ملفي</span></button>' +
    '<div class="sheet-i" style="flex-direction:column;align-items:stretch;gap:8px"><span style="display:flex;gap:12px;align-items:center">' + ic('moon') + 'المظهر</span>' + modeSeg() + '</div>' +
    '<button class="sheet-i" data-act="s-sound-row">' + ic(FX.on() ? 'sound' : 'mute') + '<span>الصوت: ' + (FX.on() ? 'مفعّل' : 'مكتوم') + '</span></button>' +
    '</div><div class="sheet-list"><button class="sheet-i danger" data-act="s-logout-ask">' + ic('logout') + '<span>تسجيل الخروج</span></button></div>' +
    '<button class="sheet-i sheet-cancel" data-act="close-modal">إغلاق</button></div>');
};
ACTS['s-sound-row'] = t => { const on = FX.toggle(); t.innerHTML = ic(on ? 'sound' : 'mute') + '<span>الصوت: ' + (on ? 'مفعّل' : 'مكتوم') + '</span>'; };
ACTS['s-logout-ask'] = () => { if (!confirm('تسجيل الخروج؟ ستحتاج رمزك للدخول مرة أخرى.')) return; closeModals(); ACTS['s-logout'](); };
ACTS['s-profile'] = () => { closeModals();
  const h = S.home;
  modal('<h3>ملفي</h3><div class="rows card">' +
    '<div class="r"><span>الاسم</span><b>' + esc(h.student.name) + '</b></div>' +
    '<div class="r"><span>الصف</span><b>' + esc(h.class.name) + '</b></div>' +
    (LS.get('mc_code') ? '<div class="r"><span>رمز الدخول</span><button class="code-pill" data-act="copy" data-v="' + esc(LS.get('mc_code')) + '">' + esc(LS.get('mc_code')) + ' ' + ic('layers') + '</button></div>' : '') +
    '<div class="r"><span>مجموع النقاط</span><b>' + h.total_points + '</b></div>' +
    '<div class="r"><span>الترتيب في الصف</span><b>' + (h.rank || '-') + ' من ' + h.class.size + '</b></div></div>' +
    '<button class="btn soft" style="margin-top:14px" data-act="close-modal">إغلاق</button>');
};
ACTS['s-leaders'] = async () => {
  const m = modal('<h3>المتصدرون</h3><div class="spin"></div>');
  try {
    const res = await rpc('class_leaderboard', { p_token: S.token });
    const hidden = res && res.hidden, rows = hidden ? res.rows : res;
    m.querySelector('.modal').innerHTML = '<h3>المتصدرون في ' + esc(S.home.class.name) + '</h3>' +
      (hidden ? '<div class="card center" style="margin-bottom:10px"><b>الترتيب مخفي حتى نهاية المسابقة 🤫</b><div class="sub">هذا ترتيبك أنت فقط</div></div>' : '') + '<div class="lb">' +
      rows.map(r => '<div class="r' + (r.is_me ? ' me' : '') + '"><span class="no">' + r.rank + '</span><span class="nm">' + esc(r.name) + '</span><b>' + r.points + '</b></div>').join('') +
      '</div><button class="btn soft" style="margin-top:14px" data-act="close-modal">إغلاق</button>';
  } catch(e){ m.remove(); toast(errMsg(e)); }
};

/* ---- game effects: sound, haptics, particles ---- */
const FX = (() => {
  let ac = null;
  const reduce = () => (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const on = () => LS.get('mc_sound') !== '0';
  const ctx = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){} } if (ac && ac.state === 'suspended') ac.resume(); return ac; };
  document.addEventListener('touchstart', () => ctx(), { once: true, passive: true });
  document.addEventListener('click', () => ctx(), { once: true });
  function tone(f, d, type, vol, at, slide){
    const c = ctx(); if (!c || !on()) return;
    const t = c.currentTime + (at || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || .2, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + .05);
  }
  function noise(d, vol){
    const c = ctx(); if (!c || !on()) return;
    const b = c.createBuffer(1, c.sampleRate * d, c.sampleRate), x = b.getChannelData(0);
    for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 2);
    const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = vol || .5; s.buffer = b; s.connect(f).connect(g).connect(c.destination); s.start();
  }
  const vib = p => { try { navigator.vibrate && navigator.vibrate(p); } catch(e){} };
  const layer = () => { let l = document.getElementById('fx'); if (!l) { l = document.createElement('div'); l.id = 'fx'; document.body.appendChild(l); } return l; };
  function burst(x, y, colors, n, spread){
    if (reduce()) return;
    const L = layer();
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i'); p.className = 'fx-p' + (i % 3 === 0 ? ' star' : '');
      const ang = Math.random() * Math.PI * 2, dist = (spread || 90) * (.5 + Math.random());
      p.style.cssText = `left:${x}px;top:${y}px;background:${colors[i % colors.length]};--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist - 30}px;--r:${Math.random() * 720 - 360}deg;--s:${.6 + Math.random() * .9}`;
      L.appendChild(p); setTimeout(() => p.remove(), 1000);
    }
  }
  function flash(cls, ms){ const L = layer(), f = document.createElement('div'); f.className = 'fx-flash ' + cls; L.appendChild(f); setTimeout(() => f.remove(), ms || 600); }
  function floatText(x, y, txt, cls){ const L = layer(), d = document.createElement('div'); d.className = 'fx-float ' + (cls || ''); d.textContent = txt; d.style.left = x + 'px'; d.style.top = y + 'px'; L.appendChild(d); setTimeout(() => d.remove(), 1300); }
  function confetti(ms){
    if (reduce()) return;
    const cv = document.createElement('canvas'); cv.className = 'fx-confetti'; layer().appendChild(cv);
    const W = cv.width = innerWidth * devicePixelRatio, H = cv.height = innerHeight * devicePixelRatio, g = cv.getContext('2d');
    const cols = ['#F5B72B', '#FFE48A', '#C8102E', '#FF5A66', '#3B6BF0', '#1FA971', '#9B51E0'];
    const ps = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: -Math.random() * H * .6, w: (6 + Math.random() * 8) * devicePixelRatio, h: (8 + Math.random() * 10) * devicePixelRatio, vy: (2 + Math.random() * 3) * devicePixelRatio, vx: (Math.random() - .5) * 2 * devicePixelRatio, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: cols[Math.random() * cols.length | 0] }));
    const t0 = performance.now();
    (function f(t){
      g.clearRect(0, 0, W, H);
      const fade = Math.min(1, Math.max(0, (ms - (t - t0)) / 600));
      ps.forEach(p => { p.y += p.vy; p.x += p.vx + Math.sin((t + p.r * 100) / 300) * .8; p.r += p.vr; g.save(); g.globalAlpha = fade; g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore(); });
      if (t - t0 < ms) requestAnimationFrame(f); else cv.remove();
    })(t0);
  }
  return {
    on, toggle(){ LS.set('mc_sound', on() ? '0' : '1'); return on(); },
    tick(final){ tone(final ? 1100 : 880, .06, 'square', .06); },
    heart(){ tone(70, .14, 'sine', .55); tone(60, .16, 'sine', .45, .18); vib([30, 80, 30]); },
    correct(btn, pts){
      tone(660, .12, 'triangle', .22); tone(990, .2, 'triangle', .22, .1); tone(1320, .25, 'sine', .15, .2); vib(25);
      if (!btn) return; const r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      burst(x, y, ['#F5B72B', '#FFE48A', '#4FD394', '#fff'], 26, 120);
      if (pts) floatText(x, r.top, '+' + pts, 'good');
      flash('good', 500);
    },
    wrong(btn, timeout){
      tone(180, .25, 'sawtooth', .16, 0, 90); tone(140, .3, 'square', .08, .05, 70); vib([60, 40, 60]);
      flash('bad', 650);
      const q = document.querySelector('.qbox'); if (q) { q.classList.remove('shake'); void q.offsetWidth; q.classList.add('shake'); }
      if (timeout) { const t = document.querySelector('.timer'); if (t) { const r = t.getBoundingClientRect(); floatText(r.left + r.width / 2, r.top + r.height / 2, 'انتهى الوقت!', 'bad'); } }
    },
    explode(){
      return new Promise(res => {
        const L = layer(), w = document.createElement('div'); w.className = 'fx-bomb';
        w.innerHTML = '<div class="fx-clock"><img src="icon-512.png" alt=""></div>'; L.appendChild(w);
        tone(200, 1.1, 'sawtooth', .07, 0, 900);
        let k = 0; const iv = setInterval(() => { tone(900 + k * 120, .05, 'square', .08); k++; }, 150);
        setTimeout(() => {
          clearInterval(iv); noise(1.2, .9); tone(60, .8, 'sine', .7, 0, 30); vib([120, 50, 200]);
          w.classList.add('boom'); flash('boom', 900);
          burst(innerWidth / 2, innerHeight / 2, ['#F5B72B', '#FF5A66', '#C8102E', '#FFE48A', '#555'], 70, Math.min(innerWidth, 420) * .7);
          document.body.classList.add('quake'); setTimeout(() => document.body.classList.remove('quake'), 600);
          setTimeout(() => { w.remove(); res(); }, 750);
        }, 1300);
      });
    },
    win(perfect){
      [523, 659, 784, 1047].forEach((f, i) => tone(f, .28, 'triangle', .2, i * .12));
      tone(1319, .6, 'sine', .14, .5); if (perfect) [1047, 1319, 1568].forEach((f, i) => tone(f, .35, 'triangle', .14, .9 + i * .1));
      vib([30, 40, 30, 40, 80]);
      confetti(perfect ? 4200 : 3000);
    },
    meh(){ tone(523, .2, 'triangle', .15); tone(659, .3, 'triangle', .15, .15); }
  };
})();
ACTS['s-sound'] = t => { const on = FX.toggle(); t.innerHTML = ic(on ? 'sound' : 'mute'); toast(on ? 'الصوت مفعّل' : 'الصوت مكتوم'); };

/* ---- play ---- */
function stopTimer(){ document.body.classList.remove('danger'); if (S.timer) { cancelAnimationFrame(S.timer.raf); S.timer = null; } }
ACTS['s-start'] = async (t) => {
  try {
    const st = await rpc('start_attempt', { p_token: S.token, p_kind: t.dataset.kind });
    if (st.finished) { toast('أنهيت هذه الجولة'); return loadHome(); }
    showQuestion(st);
  } catch(e){
    toast(errMsg(e));
    if (String(e.message || '').includes('invalid_session')) ACTS['s-logout']();
    else if (/already_played|official_not_open/.test(String(e.message || ''))) loadHome();
  }
};
/* themed backdrops for the question screen (kids / mid / uni) */
const PV_BG = {
  kids: '<i class="cl c1"></i><i class="cl c2"></i><i class="cl c3"></i>' +
    '<svg class="pv-land" viewBox="0 0 400 120" preserveAspectRatio="xMidYMax slice"><path d="M0 70 Q60 30 130 62 T260 58 T400 50 V120 H0Z" fill="#7CCB5A"/><path d="M0 92 Q90 60 190 86 T400 80 V120 H0Z" fill="#4FAE3E"/>' +
    '<g fill="#3E9A32"><circle cx="40" cy="78" r="16"/><circle cx="62" cy="84" r="12"/><circle cx="340" cy="74" r="17"/><circle cx="362" cy="82" r="12"/></g>' +
    '<g transform="translate(160 66)"><rect x="0" y="16" width="80" height="34" rx="2" fill="#FFD27A"/><path d="M-6 18 L40 -2 L86 18Z" fill="#E8544E"/><rect x="34" y="28" width="12" height="22" fill="#8A5A2B"/><rect x="10" y="24" width="12" height="10" fill="#7FC4F5"/><rect x="58" y="24" width="12" height="10" fill="#7FC4F5"/><path d="M40 -2 V-14 L52 -10 L40 -6" fill="#E8544E" stroke="#8A5A2B" stroke-width="1.5"/></g></svg>',
  mid: '<svg class="pv-ic pv-book" viewBox="0 0 64 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M32 10C24 4 12 4 4 7v34c8-3 20-3 28 3 8-6 20-6 28-3V7c-8-3-20-3-28 3zM32 10v34M10 16c5-1 11-1 16 1M10 24c5-1 11-1 16 1M38 17c5-2 11-2 16-1M38 25c5-2 11-2 16-1"/></svg>' +
    '<svg class="pv-ic pv-cup" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M14 6h20v12a10 10 0 0 1-20 0zM14 10H6c0 8 4 12 9 13M34 10h8c0 8-4 12-9 13M24 28v8M16 42h16l-2-6H18z"/></svg>' +
    '<svg class="pv-waves" viewBox="0 0 400 110" preserveAspectRatio="none"><path d="M0 40 C90 0 170 70 260 36 S380 20 400 30 V110 H0Z" fill="#F5B72B"/><path d="M0 62 C100 30 190 96 290 62 S380 50 400 58 V110 H0Z" fill="#0E6E70"/><path d="M0 86 C110 66 210 110 400 80 V110 H0Z" fill="#0A4F51"/></svg>',
  uni: '<svg class="pv-bld" viewBox="0 0 160 120" fill="none"><rect x="20" y="30" width="110" height="80" fill="#E9EEF0"/><rect x="20" y="22" width="110" height="10" fill="#D7DEE1"/><rect x="88" y="10" width="52" height="100" fill="#DCE3E6"/>' +
    '<g fill="#C9D3D7"><rect x="30" y="44" width="14" height="22"/><rect x="50" y="44" width="14" height="22"/><rect x="70" y="44" width="14" height="22"/><rect x="30" y="74" width="14" height="22"/><rect x="50" y="74" width="14" height="22"/><rect x="70" y="74" width="14" height="22"/>' +
    '<rect x="96" y="20" width="36" height="8"/><rect x="96" y="34" width="36" height="8"/><rect x="96" y="48" width="36" height="8"/><rect x="96" y="62" width="36" height="8"/><rect x="96" y="76" width="36" height="8"/></g>' +
    '<circle cx="12" cy="92" r="12" fill="#D5E2D8"/><circle cx="150" cy="96" r="10" fill="#D5E2D8"/><rect x="0" y="108" width="160" height="4" fill="#DCE3E6"/></svg>' +
    '<svg class="pv-waves" viewBox="0 0 400 90" preserveAspectRatio="none"><path d="M0 30 C70 10 120 60 200 90 H0Z" fill="#0E6E70"/><path d="M0 60 C60 50 110 70 150 90 H0Z" fill="#F5B72B" opacity=".9"/></svg>'
};
const PV_GLASS = '<svg class="pv-glass" viewBox="0 0 140 170" aria-hidden="true"><defs><linearGradient id="pvg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#FFE48A"/><stop offset=".55" stop-color="#F5B72B"/><stop offset="1" stop-color="#C98A0B"/></linearGradient></defs>' +
  '<g stroke="#F5B72B" stroke-width="6" stroke-linecap="round"><path d="M8 60 L-6 52"/><path d="M6 85 H-10"/><path d="M8 110 L-6 118"/><path d="M132 60 L146 52"/><path d="M134 85 H150"/><path d="M132 110 L146 118"/></g>' +
  '<path d="M28 22 H112 C112 58 88 70 80 85 C88 100 112 112 112 148 H28 C28 112 52 100 60 85 C52 70 28 58 28 22Z" fill="#FFE9C4" stroke="#E09A12" stroke-width="4"/>' +
  '<path d="M44 140 C50 120 64 112 70 106 C76 112 90 120 96 140Z" fill="#F5B72B" opacity=".75"/>' +
  '<rect x="14" y="6" width="112" height="18" rx="8" fill="url(#pvg)"/><rect x="14" y="146" width="112" height="18" rx="8" fill="url(#pvg)"/></svg>' +
  '<svg class="pv-star s1" viewBox="0 0 24 24"><path d="M12 2l3 6.6 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21.2l1.5-7L2 9.4l7-.8z"/></svg>' +
  '<svg class="pv-star s2" viewBox="0 0 24 24"><path d="M12 2l3 6.6 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21.2l1.5-7L2 9.4l7-.8z"/></svg>';
function showQuestion(st){
  stopTimer();
  S.cur = st; S.locked = false;
  const q = st.question, th = document.body.dataset.theme || 'mid';
  let dots = '';
  for (let i = 1; i <= st.total; i++) dots += '<span class="dot' + (i < st.position ? ' done' : i === st.position ? ' cur' : '') + '"></span>';
  const long = q.options.some(o => String(o).length > 22);
  $app.innerHTML =
    '<div class="play pv pv-' + th + '"><div class="pv-bg" aria-hidden="true">' + (PV_BG[th] || '') + '</div>' +
    '<div class="play-top"><button class="icon-btn pv-btn" data-act="s-quit" aria-label="الخروج للرئيسية">' + ic('home') + '</button>' +
    '<div class="pv-head"><b class="pv-pill">السؤال ' + st.position + ' من ' + st.total + '</b><div class="dots">' + dots + '</div>' +
    (st.kind === 'practice' ? '<span class="pv-kind">تدريب</span>' : '') + '</div>' +
    '<button class="icon-btn pv-btn pv-snd" data-act="s-sound" aria-label="الصوت">' + ic(FX.on() ? 'sound' : 'mute') + '</button></div>' +
    '<div class="pv-clock">' + (th === 'kids' ? PV_GLASS : '') +
    '<div class="timer' + (st.position === st.total ? ' last' : '') + '" id="timer"><div class="tfill" id="tfill"></div><svg viewBox="0 0 116 116" aria-hidden="true"><circle class="bg" cx="58" cy="58" r="48"/><circle class="fg" id="tfg" cx="58" cy="58" r="48" stroke-dasharray="301.6" stroke-dashoffset="0"/></svg>' +
    '<div class="num"><span id="tnum">' + Math.ceil(st.seconds_left) + '</span><small>ثانية</small></div></div></div>' +
    '<div class="pv-panel"><div class="qbox">' + esc(q.body) + '</div><div class="pts-pop" id="pop"></div>' +
    '<div class="opts' + (long ? ' long' : '') + '">' + q.options.map((o, i) => '<button class="opt" data-act="s-answer" data-idx="' + i + '"><span class="letter">' + LETTERS[i] + '</span><span class="txt">' + esc(o) + '</span></button>').join('') + '</div></div></div>';
  runTimer(st.seconds_left);
}
function runTimer(secs){
  const total = 15, end = performance.now() + secs * 1000;
  const num = document.getElementById('tnum'), fg = document.getElementById('tfg');
  const state = { raf: 0 };
  S.timer = state;
  const box = document.getElementById('timer'), fill = document.getElementById('tfill'), last = box.classList.contains('last');
  let shown = -1;
  const tick = () => {
    if (S.timer !== state) return;
    const left = Math.max(0, (end - performance.now()) / 1000), sec = Math.ceil(left);
    num.textContent = sec;
    if (sec !== shown) {
      shown = sec;
      if (sec <= 5 && sec > 0) {
        box.classList.add('hurry'); box.classList.remove('beat'); void box.offsetWidth; box.classList.add('beat');
        if (last) { FX.heart(); document.body.classList.add('danger'); } else FX.tick();
      }
    }
    if (last && left <= 5) fill.style.transform = `scale(${Math.min(1, (5 - left) / 5)})`;
    fg.style.strokeDashoffset = String(301.6 * (1 - left / total));
    fg.style.stroke = left <= 5 ? '#E5484D' : '';
    if (left <= 0) { stopTimer(); document.body.classList.remove('danger'); if (!S.locked) { S.locked = true; submit(null); } return; }
    state.raf = requestAnimationFrame(tick);
  };
  tick();
}
ACTS['s-answer'] = (t) => { if (S.locked) return; S.locked = true; stopTimer(); submit(Number(t.dataset.idx)); };
ACTS['s-quit'] = () => {
  if (!confirm('هل تريد الخروج؟ الأسئلة المتبقية ستُحتسب بلا نقاط عند انتهاء وقتها.')) return;
  stopTimer(); loadHome();
};
async function submit(idx){
  const st = S.cur;
  try {
    const res = await rpc('submit_answer', { p_token: S.token, p_attempt: st.attempt_id, p_position: st.position, p_chosen: idx });
    const r = res.result;
    const btns = $app.querySelectorAll('.opt');
    btns.forEach((b, i) => {
      b.disabled = true;
      if (i === r.correct_index) b.classList.add('good');
      else if (i === idx) b.classList.add('bad');
      else b.classList.add('dim');
    });
    if (r.correct) FX.correct(btns[r.correct_index], r.points); else FX.wrong(idx != null ? btns[idx] : null, idx == null || r.timeout);
    const pop = document.getElementById('pop');
    if (pop) {
      pop.className = 'pts-pop ' + (r.correct ? 'good' : 'bad');
      pop.textContent = r.correct ? '+' + r.points + ' نقطة' : (idx == null || r.timeout ? 'انتهى الوقت' : 'إجابة غير صحيحة');
    }
    setTimeout(() => {
      if (res.next && res.next.finished) showResult(res.summary);
      else showQuestion(res.next);
    }, 1500);
  } catch(e){
    S.locked = false;
    toast(errMsg(e));
    try {
      const nx = await rpc('resume_attempt', { p_token: S.token, p_attempt: st.attempt_id });
      if (nx.finished) loadHome(); else showQuestion(nx);
    } catch(e2){ loadHome(); }
  }
}
async function showResult(sm){
  stopTimer();
  const cc = sm ? sm.correct_count : 0, lose = cc <= 1, win = cc >= 3, perfect = cc === 4;
  if (lose) await FX.explode();
  setTimeout(() => { if (win) FX.win(perfect); else if (!lose) FX.meh(); }, 250);
  const head = perfect ? 'مثالي! 🏆' : win ? 'فوز رائع!' : lose ? 'انفجر الوقت! 💥' : 'أحسنت';
  const sub = perfect ? '4 من 4 — لا يُهزم!' : win ? 'أداء ممتاز، استمر!' : lose ? 'لا بأس، جرّب التدريب وعد أقوى' : 'قريب من القمة، حاول غداً';
  const stars = [0, 1, 2, 3].map(i => '<span class="star-s' + (i < cc ? ' on' : '') + '" style="animation-delay:' + (0.5 + i * 0.25) + 's">' + ic('star') + '</span>').join('');
  let rankRow = '';
  if (sm && sm.kind === 'official' && sm.rank_after) {
    const d = sm.rank_before - sm.rank_after;
    const delta = d > 0 ? '<span class="up">▲ صعدت ' + d + '</span>' : d < 0 ? '<span class="down">▼ نزلت ' + (-d) + '</span>' : '<span class="muted">بلا تغيير</span>';
    rankRow = '<div class="r"><span>ترتيبي الجديد</span><b>' + sm.rank_after + ' ' + delta + '</b></div>';
  }
  $app.innerHTML =
    '<div class="result ' + (win ? 'is-win' : lose ? 'is-lose' : '') + '"><div class="medal-wrap">' + (win ? '<div class="rays"></div>' : '') + '<div class="medal">' + ic(lose ? 'clock' : 'trophy') + '</div></div>' +
    '<h2 class="center res-h">' + head + '</h2><p class="center muted" style="margin-top:-8px">' + sub + (sm && sm.kind === 'practice' ? ' · تدريب' : '') + '</p>' +
    '<div class="stars-row">' + stars + '</div>' +
    '<div class="center"><div class="big" id="bigpts">0</div><div class="muted">مجموع النقاط</div></div>' +
    '<div class="rows card"><div class="r"><span>الإجابات الصحيحة</span><b>' + (sm ? sm.correct_count : 0) + ' من 4</b></div>' + rankRow + '</div>' +
    (sm && sm.kind === 'official' ? '<button class="btn accent" data-act="s-leaders">' + ic('trophy') + ' عرض الترتيب</button>' : '') +
    '<button class="btn" data-act="s-reload">العودة للرئيسية</button></div>';
  const target = sm ? sm.total_points : 0, el = document.getElementById('bigpts'), t0 = performance.now();
  (function roll(t){ const k = Math.min(1, (t - t0) / 1200), e = 1 - Math.pow(1 - k, 3); if (el) el.textContent = Math.round(target * e); if (k < 1) requestAnimationFrame(roll); })(t0);
}

/* ======================================================
   TEACHER
   ====================================================== */
const T = { user: null, name: '', classTab: 'students', authMode: 'in', qf: { status: 'all', level: 'all', type: 'all' } };
const CK = { cls: null, students: [], comp: null, pending: [] };
const QS = { list: [], globalCount: 0 };
const TYPE_AR = { curriculum: 'منهج', general: 'عام', quick: 'سرعة بديهة', memory: 'ذاكرة' };
const LEVEL_AR = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' };
const STATUS_AR = { draft: 'مسودة', approved: 'معتمد', rejected: 'مرفوض' };
const STYLE_AR = { kids: 'مرح · ابتدائي', mid: 'مرح قليلاً · متوسط', uni: 'هادئ · ثانوي وجامعة' };
const STYLE_SW = { kids: 'linear-gradient(135deg,#FFD9B0,#E3262F)', mid: 'linear-gradient(135deg,#C8102E,#F5B72B)', uni: 'linear-gradient(135deg,#FAF6F3,#7A1220)' };
const LOGO_S = '<div class="logo" style="width:42px;height:42px" aria-hidden="true"><img src="icon-192.png" alt=""></div>';
const NAV = [['home', 'الرئيسية', 'home'], ['classes', 'الصفوف', 'layers'], ['questions', 'الأسئلة', 'help'], ['results', 'النتائج', 'chart'], ['settings', 'الإعدادات', 'gear']];

function shell(title, body, active, top, back){
  return `<div class="t-top"><div class="brand">${back ? `<a class="icon-btn back-btn" href="${back}" aria-label="رجوع">${ic('back')}</a>` : LOGO_S}<span class="t-title">${esc(title)}</span></div>${top || ''}</div>` +
    `<div class="t-body">${body}</div>` +
    `<nav class="t-nav" aria-label="القائمة"><span class="lens" style="--i:${NAVI.prev}"></span>${NAV.map(n => `<a href="#/t/${n[0]}" class="${n[0] === active ? 'on' : ''}">${ic(n[2])}<span>${n[1]}</span></a>`).join('')}</nav>`;
}
const NAVI = { prev: 0 };
/* appearance: light / dark / auto */
const MQ = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
function applyMode(){
  const m = LS.get('mc_mode') || 'auto';
  const dark = m === 'dark' || (m === 'auto' && MQ && MQ.matches);
  document.body.classList.toggle('dark', dark);
  const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = dark && document.body.classList.contains('wide') ? '#000000' : '#C8102E';
}
if (MQ && MQ.addEventListener) MQ.addEventListener('change', applyMode);
const MODE_AR = { light: 'فاتح', dark: 'داكن', auto: 'تلقائي' };
function modeSeg(){ const m = LS.get('mc_mode') || 'auto'; return `<div class="tabs mode-seg">${['light', 'dark', 'auto'].map(k => `<button type="button" class="${m === k ? 'on' : ''}" data-act="set-mode" data-v="${k}">${ic(k === 'light' ? 'sun' : k === 'dark' ? 'moon' : 'gear')} ${MODE_AR[k]}</button>`).join('')}</div>`; }
ACTS['set-mode'] = t => { LS.set('mc_mode', t.dataset.v); applyMode(); t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); const v = document.getElementById('mode-val'); if (v) v.textContent = MODE_AR[t.dataset.v]; };
function view(title, body, active, top, back){
  applyMode();
  $app.innerHTML = shell(title, body, active, top, back); window.scrollTo(0, 0);
  const i = Math.max(0, NAV.findIndex(n => n[0] === active)), lens = $app.querySelector('.lens');
  if (lens) requestAnimationFrame(() => requestAnimationFrame(() => { lens.style.setProperty('--i', i); NAVI.prev = i; }));
}
/* liquid-glass lens: drag across the tab bar */
(function(){
  let drag = null;
  const idxAt = (nav, x) => { const r = nav.getBoundingClientRect(), w = r.width / NAV.length; return Math.max(0, Math.min(NAV.length - 1, Math.floor((r.right - x) / w))); };
  document.addEventListener('touchstart', e => {
    const nav = e.target.closest('.t-nav'); if (!nav) return;
    drag = { nav, lens: nav.querySelector('.lens'), x0: e.touches[0].clientX, moved: false };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!drag) return;
    const x = e.touches[0].clientX; if (Math.abs(x - drag.x0) > 6) drag.moved = true;
    if (!drag.moved) return;
    e.preventDefault();
    const r = drag.nav.getBoundingClientRect(), w = r.width / NAV.length, pos = Math.max(0, Math.min(NAV.length - 1, (r.right - x) / w - .5));
    drag.lens.classList.add('drag'); drag.lens.style.setProperty('--i', pos);
    const k = idxAt(drag.nav, x); drag.nav.querySelectorAll('a').forEach((el, j) => el.classList.toggle('hover', j === k));
  }, { passive: false });
  document.addEventListener('touchend', e => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.moved) return;
    const k = idxAt(d.nav, e.changedTouches[0].clientX);
    d.lens.classList.remove('drag'); d.lens.style.setProperty('--i', k);
    d.nav.querySelectorAll('a').forEach(el => el.classList.remove('hover'));
    const h = '#/t/' + NAV[k][0]; if (location.hash !== h) location.hash = h;
  });
})();
function go(h){ if (location.hash === h) route(); else location.hash = h; }

/* ---- auth ---- */
function teacherAuth(){
  const up = T.authMode === 'up';
  $app.innerHTML = `
  <div class="hero">${LOGO}<h1>تحدّي الدقيقة</h1><p>منصة مسابقات تعليمية للمدارس والجامعات</p></div>
  <div class="pad col"><form class="card col" data-form="t-auth" autocomplete="on">
    <div class="tabs"><button type="button" class="${up ? '' : 'on'}" data-act="t-mode" data-mode="in">تسجيل الدخول</button><button type="button" class="${up ? 'on' : ''}" data-act="t-mode" data-mode="up">إنشاء حساب</button></div>
    ${up ? '<div class="field"><label for="a-name">الاسم</label><input class="input" id="a-name" name="name" required></div>' : ''}
    <div class="field"><label for="a-email">البريد الإلكتروني</label><input class="input" id="a-email" name="email" type="email" required dir="ltr" placeholder="example@school.edu.kw"></div>
    <div class="field"><label for="a-pw">كلمة المرور</label><input class="input" id="a-pw" name="password" type="password" required minlength="6" dir="ltr"></div>
    <div id="aerr"></div>
    <button class="btn" type="submit">${up ? 'إنشاء الحساب' : 'دخول'}</button>
    ${cfg.GOOGLE_LOGIN ? '<button type="button" class="btn ghost" data-act="t-oauth" data-p="google">المتابعة باستخدام Google</button>' : ''}
    ${cfg.APPLE_LOGIN ? '<button type="button" class="btn ghost" data-act="t-oauth" data-p="apple">المتابعة باستخدام Apple</button>' : ''}
  </form>
  <div class="center"><button class="link" data-act="go-student">دخول الطلبة</button></div></div>`;
}
ACTS['t-mode'] = t => { T.authMode = t.dataset.mode; teacherAuth(); };
ACTS['t-oauth'] = async t => {
  const { error } = await sb.auth.signInWithOAuth({ provider: t.dataset.p, options: { redirectTo: location.origin + location.pathname + '#/t/home' } });
  if (error) toast(errMsg(error));
};
ACTS['t-auth'] = async f => {
  const box = document.getElementById('aerr');
  box.innerHTML = '';
  const email = f.email.value.trim(), password = f.password.value;
  try {
    if (T.authMode === 'up') {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name: (f.name.value || '').trim() }, emailRedirectTo: location.origin + location.pathname + '#/t/home' } });
      if (error) throw error;
      if (!data.session) { box.innerHTML = '<div class="ok">تم إرسال رسالة تفعيل إلى بريدك الإلكتروني. افتحها ثم سجّل الدخول.</div>'; return; }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
    go('#/t/home');
  } catch(e){ box.innerHTML = `<div class="err">${esc(errMsg(e))}</div>`; }
};
ACTS['t-logout'] = async () => { await sb.auth.signOut(); T.user = null; teacherAuth(); };

/* ---- router ---- */
async function teacherRoute(){
  stopTimer();
  document.body.classList.add('wide');
  setTheme('mid');
  const { data } = await sb.auth.getSession();
  if (!data.session) return teacherAuth();
  T.user = data.session.user;
  const parts = location.hash.replace(/^#\/t\/?/, '').split('/');
  const page = parts[0] || 'home';
  view('', '<div class="spin"></div>', page);
  try {
    if (!T.name) {
      const r = await sb.from('teachers').select('display_name,avatar_url,settings').eq('id', T.user.id).maybeSingle();
      T.name = (r.data && r.data.display_name) || (T.user.email || '').split('@')[0];
      T.avatar = (r.data && r.data.avatar_url) || '';
      T.settings = (r.data && r.data.settings) || {};
    }
    if (page === 'classes') await tClasses();
    else if (page === 'class') await tClass(parts[1]);
    else if (page === 'questions') await tQuestions();
    else if (page === 'results') await tResults(parts[1]);
    else if (page === 'settings') await tSettings();
    else if (page === 'qset') await tQSet();
    else if (page === 'rset') tRSet();
    else await tHome();
  } catch(e){
    view('', `<div class="err">${esc(errMsg(e))}</div><button class="btn" data-act="t-retry">إعادة المحاولة</button>`, page);
  }
}
ACTS['t-retry'] = () => teacherRoute();

/* ---- home (dashboard) ---- */
async function tHome(){
  const [cl, cp] = await Promise.all([
    sb.from('classes').select('*').order('created_at'),
    sb.from('competitions').select('*').eq('status', 'active').order('created_at', { ascending: false })
  ]);
  if (cl.error) throw cl.error;
  if (cp.error) throw cp.error;
  const classes = cl.data, compBy = {};
  cp.data.forEach(c => { if (!compBy[c.class_id]) compBy[c.class_id] = c; });
  if (!classes.length) { if (!W.step) W.step = 1; return renderWizard(); }
  const results = await Promise.all(classes.map(c => rpc('teacher_class_results', { p_class: c.id }).catch(() => [])));
  const stats = classes.map((c, i) => {
    const rs = results[i], n = rs.length, comp = compBy[c.id], ph = phaseOf(comp);
    const played = rs.filter(r => r.played_today).length;
    const pts = rs.reduce((a, r) => a + (r.pts || 0), 0);
    const rounds = rs.reduce((a, r) => a + (r.rounds || 0), 0);
    const correct = rs.reduce((a, r) => a + (r.correct || 0), 0);
    return { c, rs, n, comp, ph, played, pts, avg: n ? Math.round(pts / n) : 0, acc: rounds ? Math.round(correct * 100 / (rounds * 4)) : null, rounds, correct, partPct: n ? Math.round(played * 100 / n) : 0, never: rs.filter(r => !r.rounds).length };
  });
  const total = stats.reduce((a, s) => a + s.n, 0);
  const playedToday = stats.reduce((a, s) => a + s.played, 0);
  const allRounds = stats.reduce((a, s) => a + s.rounds, 0), allCorrect = stats.reduce((a, s) => a + s.correct, 0);
  const acc = allRounds ? Math.round(allCorrect * 100 / (allRounds * 4)) : null;
  const activeComps = stats.filter(s => s.ph === 'points' || s.ph === 'knockout').length;

  const kpi = (v, l, ic2) => `<div class="kpi"><div class="kpi-ic">${ic(ic2)}</div><b>${v}</b><span>${l}</span></div>`;
  let html = `<div class="kpis kpis4">${kpi(total, 'الطلبة', 'user')}${kpi(total ? Math.round(playedToday * 100 / total) + '%' : '—', 'لعبوا اليوم', 'clock')}${kpi(acc == null ? '—' : acc + '%', 'دقة الإجابات', 'check')}${kpi(activeComps, 'مسابقات جارية', 'trophy')}</div>`;

  // alerts
  const alerts = stats.filter(s => s.ph === 'points' && s.n - s.played > 0);
  if (alerts.length) html += `<div class="card col"><div class="row between"><b>${ic('clock')} لم يلعبوا جولة اليوم</b><span class="chip warn">${alerts.reduce((a, s) => a + s.n - s.played, 0)}</span></div>` +
    alerts.map(s => `<a class="row between dash-link" href="#/t/results/${s.c.id}"><span>${esc(s.c.name)}</span><span class="sub">${s.n - s.played} من ${s.n}</span></a>`).join('') + `</div>`;

  // class ranking
  const ranked = stats.slice().sort((x, y) => y.avg - x.avg);
  const maxAvg = Math.max(1, ...ranked.map(s => s.avg));
  html += `<div class="card col"><div class="row between"><b>${ic('chart')} ترتيب الصفوف</b><span class="sub">متوسط النقاط لكل طالب</span></div>` +
    ranked.map((s, i) => `<a class="rank-row" href="#/t/results/${s.c.id}"><span class="rk rk${i + 1}">${i + 1}</span><div class="grow"><div class="row between"><b>${esc(s.c.name)}</b><b class="pts">${s.avg}</b></div>
      <div class="bar"><i style="width:${Math.round(s.avg * 100 / maxAvg)}%"></i></div>
      <div class="sub">${PHASE_AR[s.ph]} · دقة ${s.acc == null ? '—' : s.acc + '%'} · ${s.n} طالب/ـة</div></div></a>`).join('') + `</div>`;

  // participation today
  const live = stats.filter(s => s.ph === 'points');
  if (live.length) html += `<div class="card col"><b>${ic('clock')} المشاركة اليوم</b>` +
    live.map(s => `<div><div class="row between"><span>${esc(s.c.name)}</span><span class="sub">${s.played}/${s.n}</span></div><div class="bar gold"><i style="width:${s.partPct}%"></i></div></div>`).join('') + `</div>`;

  // top students across classes
  const all = [];
  stats.forEach(s => s.rs.forEach(r => all.push(Object.assign({ cls: s.c.name }, r))));
  const top = all.filter(r => r.pts > 0).sort((a, b) => b.pts - a.pts).slice(0, 5);
  html += `<div class="card col"><b>${ic('trophy')} المتصدرون في كل الصفوف</b>` +
    (top.length ? `<div class="lb">${top.map((r, i) => `<div class="r"><span class="no">${i + 1}</span><span class="nm">${esc(r.name)} <span class="sub">· ${esc(r.cls)}</span></span><b>${r.pts}</b></div>`).join('')}</div>` : '<p class="sub">لا توجد نتائج بعد. تظهر هنا بعد أول جولة رسمية.</p>') + `</div>`;

  // needs attention
  const never = stats.filter(s => s.comp && s.ph !== 'upcoming' && s.never > 0);
  if (never.length) html += `<div class="card col"><b>${ic('user')} لم يشاركوا أبداً</b>` +
    never.map(s => `<a class="row between dash-link" href="#/t/results/${s.c.id}"><span>${esc(s.c.name)}</span><span class="chip bad">${s.never}</span></a>`).join('') + `</div>`;

  // competitions timeline
  const comps = stats.filter(s => s.comp);
  html += `<div class="card col"><div class="row between"><b>${ic('layers')} المسابقات</b><a class="sub" href="#/t/classes">إدارة</a></div>` +
    (comps.length ? comps.map(s => {
      const t = todayKW(), c = s.comp;
      const dl = Math.round((new Date(c.end_date) - new Date(t)) / 864e5);
      return `<a class="row between dash-link" href="#/t/class/${s.c.id}"><div><b>${esc(s.c.name)}</b><div class="sub">${esc(fmtDate(c.start_date))} ← ${esc(fmtDate(c.end_date))}</div></div><span class="chip ${s.ph === 'points' ? 'good' : s.ph === 'knockout' ? 'warn' : ''}">${PHASE_AR[s.ph]}${dl >= 0 && s.ph !== 'finished' ? ' · ' + dl + ' يوم' : ''}</span></a>`;
    }).join('') : '<p class="sub">لا توجد مسابقات. أنشئ مسابقة من صفحة الصف.</p>') + `</div>`;

  view('مرحباً، ' + (T.name || ''), html, 'home');
}

/* ---- quick-start wizard ---- */
const STAGES = [['primary', 'ابتدائي', 'الصفوف 1–5', 'kids', 'star'], ['middle', 'متوسط', 'الصفوف 6–9', 'mid', 'layers'], ['secondary', 'ثانوي', 'الصفوف 10–12', 'mid', 'chart'], ['university', 'جامعة', 'طلبة الجامعة', 'uni', 'trophy']];
const QTYPES = [['curriculum', 'المنهج', 'أسئلة من مادتك', 'layers'], ['general', 'معلومات عامة', 'ثقافة ومعرفة', 'help'], ['quick', 'سرعة بديهة', 'حساب وألغاز', 'clock'], ['memory', 'الذاكرة', 'تذكّر وترتيب', 'star']];
const SUBJECTS = ['عام', 'اللغة العربية', 'الرياضيات', 'العلوم', 'التربية الإسلامية', 'اللغة الإنجليزية', 'الاجتماعيات', 'الحاسوب', 'أخرى'];
const METHODS = [['manual', 'إضافة يدوية', 'اكتب اسم الصف وأسماء الطلبة', 'edit'], ['file', 'رفع ملف Excel', 'عدة صفوف دفعة واحدة', 'upload'], ['self', 'تسجيل ذاتي', 'رابط يسجل به الطلبة بأنفسهم', 'user']];
const W = { step: 0, stage: null, qtypes: ['curriculum', 'general', 'quick'], subject: 'عام', method: null, cname: '', names: '', self: '', multi: null, compNow: true, start: '' };
const WSTEPS = ['المرحلة', 'الأسئلة', 'الإضافة', 'الطلبة', 'المسابقة'];
function wSave(){
  const g = id => document.getElementById(id);
  if (g('w-cname')) W.cname = g('w-cname').value.trim();
  if (g('w-names')) W.names = g('w-names').value;
  if (g('w-self')) W.self = g('w-self').value;
  if (g('w-sub')) W.subject = g('w-sub').value;
  if (g('w-start')) W.start = g('w-start').value;
}
function renderWizard(){
  const s = W.step;
  const prog = `<div class="w-prog">${WSTEPS.map((n, i) => `<div class="w-st ${i + 1 < s ? 'done' : i + 1 === s ? 'cur' : ''}"><span>${i + 1 < s ? '✓' : i + 1}</span><small>${n}</small></div>`).join('')}</div>`;
  let body = '', ok = true;
  if (s === 1) {
    body = `<h2 class="w-h">ما المرحلة الدراسية؟</h2><p class="sub">نختار لك شكل الواجهة المناسب للطلبة.</p><div class="picks picks2">${STAGES.map(x => `<button class="pick ${W.stage === x[0] ? 'on' : ''}" data-act="w-stage" data-v="${x[0]}"><span class="pick-ic">${ic(x[4])}</span><b>${x[1]}</b><small>${x[2]}</small></button>`).join('')}</div>`;
    ok = !!W.stage;
  } else if (s === 2) {
    body = `<h2 class="w-h">أنواع الأسئلة</h2><p class="sub">اختر نوعاً أو أكثر. كل جولة: 1 سهل، 2 متوسط، 1 صعب.</p><div class="picks picks2">${QTYPES.map(x => `<button class="pick ${W.qtypes.includes(x[0]) ? 'on' : ''}" data-act="w-qtype" data-v="${x[0]}"><span class="pick-ic">${ic(x[3])}</span><b>${x[1]}</b><small>${x[2]}</small></button>`).join('')}</div>` +
      (W.qtypes.includes('curriculum') ? `<div class="field"><label for="w-sub">المادة / المنهج</label><select class="input" id="w-sub">${SUBJECTS.map(x => `<option ${W.subject === x ? 'selected' : ''}>${x}</option>`).join('')}</select><p class="sub">المناهج المعتمدة يرفعها المشرف، ويمكنك إضافة أسئلتك من صفحة الأسئلة.</p></div>` : '');
    ok = W.qtypes.length > 0;
  } else if (s === 3) {
    body = `<h2 class="w-h">كيف تضيف الصفوف والطلبة؟</h2><div class="picks">${METHODS.map(x => `<button class="pick wide ${W.method === x[0] ? 'on' : ''}" data-act="w-method" data-v="${x[0]}"><span class="pick-ic">${ic(x[3])}</span><div><b>${x[1]}</b><small>${x[2]}</small></div></button>`).join('')}</div>`;
    ok = !!W.method;
  } else if (s === 4) {
    if (W.method === 'manual') {
      body = `<h2 class="w-h">بيانات الصف</h2><div class="field"><label for="w-cname">اسم الصف</label><input class="input" id="w-cname" value="${esc(W.cname)}" placeholder="مثال: السادس / أ"></div>
        <div class="field"><label for="w-names">أسماء الطلبة (اسم في كل سطر، ويمكن إضافة الرقم بعد فاصلة)</label><textarea class="input" id="w-names" rows="8" placeholder="سارة العتيبي، 1001&#10;ليان الزامل، 1002">${esc(W.names)}</textarea></div>
        <p class="sub">يمكنك ترك الأسماء فارغة وإضافتها لاحقاً.</p>`;
    } else if (W.method === 'file') {
      const g = W.multi;
      body = `<h2 class="w-h">رفع ملف الصفوف</h2><p class="sub">ملف واحد بثلاثة أعمدة: الاسم، رقم الطالب، الصف.</p>
        <div class="row"><button class="btn soft" data-act="t-multi-sample">${ic('download')} نموذج</button><button class="btn" data-act="w-file">${ic('upload')} اختيار الملف</button></div><input type="file" id="wxl" accept=".xlsx,.xls,.csv" class="hide" data-change="w-file-chosen">` +
        (g ? `<div class="card"><b>${Object.keys(g).length} صف · ${Object.values(g).reduce((a, x) => a + x.length, 0)} طالب/ـة</b>${Object.keys(g).map(k => `<div class="row between dash-link"><span>${esc(k)}</span><span class="sub">${g[k].length}</span></div>`).join('')}</div>` : '');
      ok = !!g;
    } else {
      body = `<h2 class="w-h">التسجيل الذاتي</h2><p class="sub">اكتب أسماء الصفوف (صف في كل سطر). سنعطيك رابطاً لكل صف ترسله للطلبة، فيسجل كل طالب اسمه ورقمه ويحصل على رمزه.</p>
        <div class="field"><textarea class="input" id="w-self" rows="5" placeholder="السادس / أ&#10;السادس / ب">${esc(W.self)}</textarea></div>`;
    }
  } else if (s === 5) {
    if (!W.start) W.start = todayKW();
    const pe = addDays(W.start, 4), end = addDays(pe, 3);
    body = `<h2 class="w-h">المسابقة</h2><div class="picks">
      <button class="pick wide ${W.compNow ? 'on' : ''}" data-act="w-comp" data-v="1"><span class="pick-ic">${ic('trophy')}</span><div><b>أنشئ المسابقة الآن</b><small>بإعدادات مقترحة يمكنك تعديلها لاحقاً</small></div></button>
      <button class="pick wide ${!W.compNow ? 'on' : ''}" data-act="w-comp" data-v="0"><span class="pick-ic">${ic('clock')}</span><div><b>لاحقاً</b><small>أنشئها من صفحة الصف متى شئت</small></div></button></div>` +
      (W.compNow ? `<div class="card col"><div class="field"><label for="w-start">بداية جمع النقاط</label><input class="input" type="date" id="w-start" value="${W.start}" data-change="w-start"></div>
        <div class="row between"><span class="sub">جمع النقاط</span><b>${esc(fmtDate(W.start))} ← ${esc(fmtDate(pe))}</b></div>
        <div class="row between"><span class="sub">التصفيات حتى</span><b>${esc(fmtDate(end))}</b></div>
        <p class="sub">جولة رسمية يومياً: 4 أسئلة × 15 ثانية. يتأهل 8 للتصفيات.</p></div>` : '');
  }
  const nav = `<div class="row w-nav">${s > 1 ? `<button class="btn soft" data-act="w-prev">رجوع</button>` : ''}<button class="btn" data-act="${s === 5 ? 'w-finish' : 'w-next'}" ${ok ? '' : 'disabled'}>${s === 5 ? 'إنشاء' : 'التالي'}</button></div>`;
  view('إعداد سريع', `<div class="card w-card">${prog}<div class="col">${body}</div></div>${nav}`, 'home');
}
ACTS['w-stage'] = t => { W.stage = t.dataset.v; renderWizard(); };
ACTS['w-qtype'] = t => { wSave(); const k = t.dataset.v; W.qtypes = W.qtypes.includes(k) ? W.qtypes.filter(x => x !== k) : W.qtypes.concat(k); renderWizard(); };
ACTS['w-method'] = t => { W.method = t.dataset.v; renderWizard(); };
ACTS['w-comp'] = t => { wSave(); W.compNow = t.dataset.v === '1'; renderWizard(); };
ACTS['w-start'] = () => { wSave(); renderWizard(); };
ACTS['w-prev'] = () => { wSave(); W.step--; renderWizard(); };
ACTS['w-next'] = () => {
  wSave();
  if (W.step === 4 && W.method === 'manual' && !W.cname) return toast('اكتب اسم الصف');
  if (W.step === 4 && W.method === 'self' && !W.self.trim()) return toast('اكتب اسم صف واحد على الأقل');
  W.step++; renderWizard();
};
ACTS['w-file'] = () => document.getElementById('wxl').click();
ACTS['w-file-chosen'] = async t => {
  const file = t.files && t.files[0]; if (!file) return;
  try {
    const list = parseMulti(await readRows(file)); t.value = '';
    if (!list.length) return toast('لم أجد بيانات. تأكد من الأعمدة: الاسم، رقم الطالب، الصف');
    const g = {}; list.forEach(x => (g[x.cls] = g[x.cls] || []).push({ name: x.name, student_no: x.student_no, phone: x.phone }));
    W.multi = g; renderWizard();
  } catch(e){ toast('تعذّرت قراءة الملف'); }
};
ACTS['w-finish'] = async t => {
  wSave();
  t.disabled = true; t.textContent = 'جارٍ الإنشاء...';
  const st = STAGES.find(x => x[0] === W.stage);
  const base = { teacher_id: T.user.id, stage: W.stage, style: st ? st[3] : 'mid', qtypes: W.qtypes, subject: W.qtypes.includes('curriculum') ? W.subject : null };
  const plan = [];
  if (W.method === 'manual') plan.push({ name: W.cname, rows: W.names.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const p = l.split(/[،,\t]/); return { name: p[0].trim(), student_no: (p[1] || '').trim() }; }) });
  else if (W.method === 'file') Object.keys(W.multi).forEach(k => plan.push({ name: k, rows: W.multi[k] }));
  else W.self.split('\n').map(x => x.trim()).filter(Boolean).forEach(k => plan.push({ name: k, rows: [], self: true }));
  const made = []; let added = 0; const gid = crypto.randomUUID();
  try {
    for (const p of plan) {
      const r = await sb.from('classes').insert(Object.assign({ name: p.name }, base)).select().single();
      if (r.error) throw r.error;
      const c = r.data;
      for (let i = 0; i < p.rows.length; i += 150) { const x = await rpc('add_students', { p_class: c.id, p_rows: p.rows.slice(i, i + 150) }); added += x.added.length; }
      if (p.self) c.join_code = await rpc('set_self_join', { p_class: c.id, p_on: true });
      if (W.compNow) {
        const pe = addDays(W.start, 4);
        const k = await sb.from('competitions').insert({ class_id: c.id, group_id: gid, qtypes: W.qtypes, difficulty: (T.settings || {}).difficulty || 'normal', title: 'مسابقة تحدّي الدقيقة', start_date: W.start, points_end_date: pe, end_date: addDays(pe, 3), group_size: 6, qualifiers: 8, round_window_hours: 24 });
        if (k.error) throw k.error;
      }
      made.push(c);
    }
  } catch(e){ toast(errMsg(e)); t.disabled = false; t.textContent = 'إنشاء'; return; }
  const links = made.filter(c => c.join_code);
  view('تم الإعداد 🎉', `<div class="card col center"><div class="medal" style="width:96px;height:96px">${ic('check')}</div><b style="font-size:20px">جاهز!</b><p class="sub">أُنشئ ${made.length} صف${added ? ' وأُضيف ' + added + ' طالب/ـة' : ''}${W.compNow ? '، والمسابقة تبدأ ' + esc(fmtDate(W.start)) : ''}.</p></div>` +
    (links.length ? `<div class="card col"><b>روابط التسجيل الذاتي</b>${links.map(c => `<div class="col" style="gap:6px"><b>${esc(c.name)}</b><div class="join-box" dir="ltr">${esc(joinLink(c.join_code))}</div><button class="btn sm" data-act="copy" data-v="${esc(joinLink(c.join_code))}">نسخ الرابط</button></div>`).join('')}</div>` : '') +
    `<div class="card col"><b>الخطوات التالية</b><div class="sub">1. وزّع الرموز أو الروابط على الطلبة من صفحة الصف.<br>2. راجع الأسئلة واعتمدها من صفحة الأسئلة.<br>3. تابع المشاركة من الرئيسية.</div></div>
     <div class="row"><a class="btn" href="#/t/classes" style="text-decoration:none">الصفوف</a><button class="btn soft" data-act="w-done">لوحة التحكم</button></div>`, 'home');
  Object.assign(W, { step: 0, stage: null, method: null, cname: '', names: '', self: '', multi: null, start: '' });
};
ACTS['w-done'] = () => go('#/t/home');

/* ---- classes ---- */
function styleCards(sel){
  return `<div class="style-cards">${['kids', 'mid', 'uni'].map(k => `<button type="button" class="style-card ${k === sel ? 'on' : ''}" data-act="pick-style" data-style="${k}"><div class="sw" style="background:${STYLE_SW[k]}"></div>${STYLE_AR[k]}</button>`).join('')}</div>`;
}
ACTS['pick-style'] = t => {
  t.parentElement.querySelectorAll('.style-card').forEach(b => b.classList.remove('on'));
  t.classList.add('on');
  const hid = t.closest('form') && t.closest('form').querySelector('[name=style]');
  if (hid) hid.value = t.dataset.style;
};
const CL = { classes: [], byId: {}, students: {}, comps: {}, open: new Set(), tab: 'classes' };
async function tClasses(){
  const [c, s, k] = await Promise.all([
    sb.from('classes').select('*').order('created_at'),
    sb.from('students').select('*').order('created_at'),
    sb.from('competitions').select('*').eq('status', 'active').order('created_at')
  ]);
  if (c.error) throw c.error; if (s.error) throw s.error; if (k.error) throw k.error;
  CL.classes = c.data; CL.byId = {}; CL.students = {}; CL.comps = {}; CL.allComps = k.data;
  c.data.forEach(x => { CL.byId[x.id] = x; CL.students[x.id] = []; });
  s.data.forEach(x => { if (CL.students[x.class_id]) CL.students[x.class_id].push(x); });
  k.data.forEach(x => { CL.comps[x.class_id] = x; });
  await loadCurricula().catch(() => {});
  renderClasses();
}
function renderClasses(){
  const tabs = `<div class="tabs"><button class="${CL.tab === 'classes' ? 'on' : ''}" data-act="c-tab" data-t="classes">الصفوف (${CL.classes.length})</button><button class="${CL.tab === 'comps' ? 'on' : ''}" data-act="c-tab" data-t="comps">المسابقات</button></div>`;
  const more = CL.tab === 'classes' ? `<button class="icon-btn" data-act="c-more" aria-label="المزيد">${ic('more')}</button>` : '';
  view('الصفوف', tabs + (CL.tab === 'classes' ? classesList() : compsPanel()) + selBar(), 'classes', more);
}
ACTS['c-tab'] = t => { CL.tab = t.dataset.t; T.compEdit = null; renderClasses(); };
function classesList(){
  const top = CL.sel ? '' : `<button class="btn cl-add" data-act="t-add-class">${ic('plus')} صف جديد</button><input type="file" id="mxl" accept=".xlsx,.xls,.csv" class="hide" data-change="t-multi-chosen"><input type="file" id="xl" accept=".xlsx,.xls,.csv" class="hide" data-change="t-xl-chosen">`;
  if (!CL.classes.length) return top + '<div class="card center muted">لا توجد صفوف بعد.</div>';
  return top + CL.classes.map(classSection).join('') + (CL.sel || !CL.open.size ? '' : '<p class="sub center cl-hint">اسحب اسم الطالب لليسار للحذف، ولليمين للواتساب والرمز الجديد</p>');
}
function classSection(c){
  const st = CL.students[c.id] || [], open = CL.open.has(c.id), comp = CL.comps[c.id];
  let body = '';
  if (open) {
    const link = joinLink(c.join_code);
    body = `<div class="cls-body">${CL.sel ? '' : `<div class="row"><button class="btn sm soft" data-act="t-upload">${ic('upload')} رفع أسماء</button><button class="btn sm soft" data-act="t-add-one">${ic('plus')} إضافة</button><span class="grow"></span><button class="icon-btn" data-act="c-cmore" aria-label="المزيد">${ic('more')}</button></div>`}` +
      (c.self_join ? `<div class="join-row"><span class="sub">التسجيل الذاتي مفعّل</span><button class="btn sm" data-act="copy" data-v="${esc(link)}">نسخ رابط التسجيل</button></div>` : '') +
      (st.length ? `<div class="sw-list">${st.map((s, i) => `<div class="sw-row"><div class="sw-act">
          <div class="sw-r"><button class="del" data-act="t-del-student" data-id="${s.id}"><i>${ic('trash')}</i><span>حذف</span></button></div>
          <div class="sw-l"><button class="rg" data-act="t-regen" data-id="${s.id}"><i>${ic('refresh')}</i><span>رمز جديد</span></button><button class="wa" data-act="s-wa" data-id="${s.id}"><i>${ic('send')}</i><span>واتساب</span></button></div></div>
        <div class="sw-main" data-act="s-card" data-id="${s.id}">${CL.sel && CL.sel.type === 'students' && CL.sel.cid === c.id ? `<span class="selmark">${ic(CL.sel.ids.has(s.id) ? 'checkc' : 'circle')}</span>` : `<span class="sw-n">${i + 1}</span>`}<div class="grow"><b>${esc(s.name)}</b><div class="sub">${esc(s.student_no) || '—'}</div></div>
        <button class="code-pill eye" data-act="c-eye" data-code="${esc(s.code)}" aria-label="إظهار الرمز"><span>••••••</span>${ic('eye')}</button></div></div>`).join('')}</div>`
        : '<p class="sub center" style="padding:12px">لا يوجد طلبة. ارفع ملفاً أو أضف يدوياً.</p>') + '</div>';
  }
  const selC = CL.sel && CL.sel.type === 'classes';
  const ph = comp ? phaseOf(comp) : null;
  const tag = comp ? `<span class="cl-tag on">${PHASE_AR[ph]}</span>` : `<span class="cl-tag">بدون مسابقة</span>`;
  return `<div class="cls ${open ? 'open' : ''} ${selC && CL.sel.ids.has(c.id) ? 'picked' : ''}" data-cid="${c.id}"><button class="cls-head" data-act="c-toggle">${selC ? `<span class="selmark">${ic(CL.sel.ids.has(c.id) ? 'checkc' : 'circle')}</span>` : ''}
    <span class="cl-ic" style="--h:${clsHue(c.name)}">${esc(clsBadge(c.name))}</span>
    <div class="grow cl-txt"><b>${esc(c.name)}</b><div class="cl-meta"><span>${st.length} طالب</span>${tag}</div></div>${selC ? '' : `<span class="chev">${ic('back')}</span>`}</button>${body}</div>`;
}
const ORD = [['الحادي عشر', 11], ['الثاني عشر', 12], ['الأول', 1], ['الثاني', 2], ['الثالث', 3], ['الرابع', 4], ['الخامس', 5], ['السادس', 6], ['السابع', 7], ['الثامن', 8], ['التاسع', 9], ['العاشر', 10]];
function clsBadge(n){
  n = (n || '').trim(); const o = ORD.find(x => n.includes(x[0])); const m = n.match(/\d+/);
  const g = o ? o[1] : m ? m[0] : n.charAt(0); const sec = (n.split('/')[1] || '').trim().charAt(0);
  return g + (sec || '');
}
function clsHue(n){ const o = ORD.find(x => (n || '').includes(x[0])); if (o) return [0, 350, 25, 40, 150, 200, 215, 265, 290, 320, 10, 180, 230][o[1]]; let h = 0; for (const ch of n || '') h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }
function ctx(t){ const el = t.closest('[data-cid]'); if (el) { CK.cls = CL.byId[el.dataset.cid]; CK.students = CL.students[el.dataset.cid] || []; } return CK.cls; }
function sheet(title, items){
  modal(`<div class="sheet">${title ? `<div class="sheet-t">${esc(title)}</div>` : ''}<div class="sheet-list">${items.map(x => x ? `<button class="sheet-i ${x.danger ? 'danger' : ''}" data-act="${x.act}" ${x.attrs || ''}>${ic(x.icon)}<span>${x.label}</span></button>` : '<div class="sheet-sep"></div>').join('')}</div>
    <button class="sheet-i sheet-cancel" data-act="close-modal">إلغاء</button></div>`);
}
ACTS['c-more'] = () => sheet('الصفوف', [
  { act: 'm-run', attrs: 'data-a="t-multi-up"', icon: 'upload', label: 'رفع صفوف من Excel' },
  { act: 'm-run', attrs: 'data-a="t-multi-sample"', icon: 'download', label: 'تنزيل نموذج الصفوف' },
  { act: 'm-run', attrs: 'data-a="t-sample-students"', icon: 'download', label: 'تنزيل نموذج الطلبة' },
  null,
  { act: 'm-run', attrs: 'data-a="c-all"', icon: 'layers', label: CL.open.size ? 'طي كل الصفوف' : 'فتح كل الصفوف' },
  { act: 'm-run', attrs: 'data-a="c-select"', icon: 'check', label: 'تحديد صفوف' },
  { act: 'm-run', attrs: 'data-a="c-export-all"', icon: 'download', label: 'تصدير رموز كل الصفوف' },
  null,
  { act: 'm-run', attrs: 'data-a="c-del-all"', icon: 'trash', label: 'حذف جميع الصفوف', danger: true }
]);
ACTS['c-cmore'] = t => { const c = ctx(t); sheet(c.name, [
  { act: 'm-run', attrs: `data-a="t-export-codes" data-cid="${c.id}"`, icon: 'download', label: 'تصدير الرموز Excel' },
  { act: 'm-run', attrs: `data-a="t-print-codes" data-cid="${c.id}"`, icon: 'print', label: 'طباعة بطاقات الرموز' },
  { act: 'm-run', attrs: `data-a="t-sample-students" data-cid="${c.id}"`, icon: 'download', label: 'تنزيل نموذج الطلبة' },
  { act: 'm-run', attrs: `data-a="s-select" data-cid="${c.id}"`, icon: 'check', label: 'تحديد طلبة' },
  null,
  { act: 'm-run', attrs: `data-a="c-menu" data-cid="${c.id}"`, icon: 'gear', label: 'إعدادات الصف والتسجيل الذاتي' },
  { act: 'm-run', attrs: `data-a="c-del" data-cid="${c.id}"`, icon: 'trash', label: 'حذف الصف', danger: true }
]); };
ACTS['m-run'] = t => { closeModals(); const a2 = t.dataset.a; const fake = document.querySelector(`[data-cid="${t.dataset.cid}"]`) || t; setTimeout(() => ACTS[a2](fake.querySelector ? (fake.querySelector('.cls-head') || fake) : fake), 30); };
ACTS['c-select'] = () => { CL.sel = { type: 'classes', ids: new Set() }; renderClasses(); };
ACTS['s-select'] = t => { const c = ctx(t); CL.open.add(c.id); CL.sel = { type: 'students', cid: c.id, ids: new Set() }; renderClasses(); };
ACTS['sel-cancel'] = () => { CL.sel = null; renderClasses(); };
ACTS['sel-all'] = () => {
  const all = CL.sel.type === 'classes' ? CL.classes.map(c => c.id) : (CL.students[CL.sel.cid] || []).map(s => s.id);
  CL.sel.ids = CL.sel.ids.size === all.length ? new Set() : new Set(all); renderClasses();
};
function selBar(){
  if (!CL.sel || CL.tab !== 'classes') return '';
  const n = CL.sel.ids.size, isC = CL.sel.type === 'classes';
  return `<div class="sel-bar"><button class="link" data-act="sel-cancel">إلغاء</button><b>${n ? `تم تحديد ${n}` : isC ? 'حدد الصفوف' : 'حدد الطلبة'}</b><button class="link" data-act="sel-all">الكل</button>
    <div class="sel-acts">${!isC ? `<button class="btn sm soft" data-act="sel-export" ${n ? '' : 'disabled'}>${ic('download')} تصدير</button>` : ''}<button class="btn sm danger" data-act="sel-del" ${n ? '' : 'disabled'}>${ic('trash')} حذف</button></div></div>`;
}
ACTS['sel-del'] = async () => {
  const ids = [...CL.sel.ids], isC = CL.sel.type === 'classes';
  if (!confirm(isC ? `حذف ${ids.length} صف مع طلبتها ونتائجها نهائياً؟` : `حذف ${ids.length} طالب/ـة ونتائجهم نهائياً؟`)) return;
  const { error } = await sb.from(isC ? 'classes' : 'students').delete().in('id', ids);
  if (error) return toast(errMsg(error));
  CL.sel = null; toast('تم الحذف'); await tClasses();
};
ACTS['sel-export'] = () => {
  const st = (CL.students[CL.sel.cid] || []).filter(s => CL.sel.ids.has(s.id));
  const ws = XLSX.utils.aoa_to_sheet([['الاسم', 'رقم الطالب', 'الرمز']].concat(st.map(s => [s.name, s.student_no, s.code]))), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الرموز'); XLSX.writeFile(wb, 'رموز-محددة.xlsx');
};
ACTS['c-export-all'] = () => {
  const wb = XLSX.utils.book_new();
  CL.classes.forEach((c, i) => { const ws = XLSX.utils.aoa_to_sheet([['الاسم', 'رقم الطالب', 'الرمز']].concat((CL.students[c.id] || []).map(s => [s.name, s.student_no, s.code]))); XLSX.utils.book_append_sheet(wb, ws, ((i + 1) + '-' + c.name).replace(/[\\\/?*\[\]:]/g, '-').slice(0, 30)); });
  XLSX.writeFile(wb, 'رموز-كل-الصفوف.xlsx');
};
ACTS['c-toggle'] = t => { const id = t.closest('[data-cid]').dataset.cid; if (CL.sel && CL.sel.type === 'classes') { CL.sel.ids.has(id) ? CL.sel.ids.delete(id) : CL.sel.ids.add(id); return renderClasses(); } CL.open.has(id) ? CL.open.delete(id) : CL.open.add(id); renderClasses(); };
ACTS['c-all'] = () => { if (CL.open.size) CL.open.clear(); else CL.classes.forEach(c => CL.open.add(c.id)); renderClasses(); };
ACTS['c-eye'] = t => {
  const sp = t.querySelector('span'), on = t.classList.toggle('shown');
  sp.textContent = on ? t.dataset.code : '••••••';
};
ACTS['s-card'] = async t => {
  if (CL.sel && CL.sel.type === 'students') { const id = t.dataset.id; CL.sel.ids.has(id) ? CL.sel.ids.delete(id) : CL.sel.ids.add(id); return renderClasses(); }
  if (t.classList.contains('open')) { t.classList.remove('open'); t.style.transform = ''; t.dataset.off = 0; return; }
  const c = ctx(t), s = (CL.students[c.id] || []).find(x => x.id === t.dataset.id); if (!s) return;
  const comp = CL.comps[c.id];
  const ini = s.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join(' ');
  modal(`<div class="st-card" data-cid="${c.id}"><div class="st-top"><div class="avatar big-av">${esc(ini)}</div><div><b>${esc(s.name)}</b><div class="sub">${esc(c.name)} · رقم ${esc(s.student_no) || '—'}</div>${s.phone ? `<a class="sub" href="tel:${esc(s.phone)}" dir="ltr" style="color:var(--primary);text-decoration:none">${ic('send')} ${esc(s.phone)}</a>` : ''}</div></div>
    <button class="code-pill eye big-pill" data-act="c-eye" data-code="${esc(s.code)}"><span>••••••</span>${ic('eye')}</button>
    <div class="stats" id="st-stats"><div class="stat"><b>…</b><span>النقاط</span></div><div class="stat"><b>…</b><span>الترتيب</span></div><div class="stat"><b>…</b><span>الجولات</span></div><div class="stat"><b>…</b><span>الدقة</span></div></div>
    <div class="sub center" id="st-today">${comp ? esc(comp.title) + ' · ' + PHASE_AR[phaseOf(comp)] : 'لا توجد مسابقة نشطة'}</div>
    <div class="st-acts"><button class="btn soft" data-act="s-edit" data-id="${s.id}">${ic('edit')} تعديل البيانات</button>
    <button class="btn" data-act="s-wa" data-id="${s.id}" style="background:linear-gradient(180deg,#4FD394,#1FA971);box-shadow:0 5px 0 #0E6A45">${ic('send')} إرسال الرمز واتساب</button>
    <div class="row"><button class="btn soft" data-act="copy" data-v="${esc(s.code)}">نسخ الرمز</button><button class="btn soft" data-act="t-regen" data-id="${s.id}">${ic('refresh')} رمز جديد</button></div>
    <button class="btn soft" data-act="t-del-student" data-id="${s.id}" style="color:#B3122A">${ic('trash')} حذف</button></div></div>`);
  try {
    const rs = await rpc('teacher_class_results', { p_class: c.id });
    const sorted = rs.slice().sort((x, y) => y.pts - x.pts);
    const idx = sorted.findIndex(r => (r.id && r.id === s.id) || (r.name === s.name && String(r.student_no) === String(s.student_no)));
    const r = sorted[idx]; const box = document.getElementById('st-stats'); if (!box || !r) return;
    const acc = r.rounds ? Math.round(r.correct * 100 / (r.rounds * 4)) + '%' : '—';
    box.innerHTML = `<div class="stat"><b>${r.pts}</b><span>النقاط</span></div><div class="stat"><b>${r.pts ? idx + 1 : '—'}</b><span>الترتيب من ${sorted.length}</span></div><div class="stat"><b>${r.rounds}</b><span>الجولات</span></div><div class="stat"><b>${acc}</b><span>الدقة</span></div>`;
    if (comp) document.getElementById('st-today').innerHTML += r.played_today ? ' · <b style="color:#168A5B">لعب اليوم ✓</b>' : ' · <b style="color:#8a5a00">لم يلعب اليوم</b>';
  } catch(e){}
};
ACTS['s-edit'] = t => {
  const c = ctx(t), s = (CL.students[c.id] || []).find(x => x.id === t.dataset.id); if (!s) return;
  closeModals();
  modal(`<h3>تعديل بيانات الطالب/ـة</h3><form class="col" data-form="s-edit-save" data-id="${s.id}" data-cid="${c.id}">
    <div class="field"><label for="se-n">الاسم</label><input class="input" id="se-n" name="name" value="${esc(s.name)}" required maxlength="60"></div>
    <div class="field"><label for="se-no">رقم الطالب</label><input class="input" id="se-no" name="no" value="${esc(s.student_no || '')}" dir="ltr" inputmode="numeric" maxlength="20"></div>
    <div class="field"><label for="se-ph">رقم الهاتف</label><input class="input" id="se-ph" name="ph" type="tel" value="${esc(s.phone || '')}" dir="ltr" placeholder="مثال: 99999999" maxlength="20"></div>
    <div class="field"><label for="se-c">الصف</label><select class="input" id="se-c" name="cls">${CL.classes.map(x => `<option value="${x.id}" ${x.id === c.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
    <p class="sub">يبقى رمز الدخول كما هو، والنقل لصف آخر يحتفظ بالرمز.</p>
    <div class="row"><button type="button" class="btn soft" data-act="close-modal">إلغاء</button><button class="btn" type="submit">حفظ</button></div></form>`);
};
ACTS['s-edit-save'] = async f => {
  const row = { name: f.name.value.trim(), student_no: f.no.value.trim(), class_id: f.cls.value, phone: f.ph.value.replace(/[^0-9+]/g, '').slice(0, 20) || null };
  if (row.name.length < 2) return toast('اكتب الاسم');
  const dup = (CL.students[row.class_id] || []).some(x => x.id !== f.dataset.id && row.student_no && x.student_no === row.student_no);
  if (dup) return toast('رقم الطالب موجود في هذا الصف');
  const { error } = await sb.from('students').update(row).eq('id', f.dataset.id);
  if (error) return toast(/duplicate|unique/i.test(error.message) ? 'رقم الطالب موجود في هذا الصف' : errMsg(error));
  if (row.class_id !== f.dataset.cid) CL.open.add(row.class_id);
  closeModals(); toast('تم الحفظ'); await tClasses();
};
ACTS['s-wa'] = t => {
  const s = Object.values(CL.students).flat().find(x => x.id === t.dataset.id); if (!s) return;
  const url = location.origin + location.pathname;
  const msg = `مرحباً ${s.name}\nرمز دخولك إلى «تحدّي الدقيقة»: ${s.code}\nللدخول مباشرة اضغط الرابط:\n${url}#/c/${s.code}`;
  let ph = (s.phone || '').replace(/[^0-9]/g, '');
  if (ph.length === 8) ph = '965' + ph; else if (ph.startsWith('00')) ph = ph.slice(2);
  window.open('https://wa.me/' + (ph || '') + '?text=' + encodeURIComponent(msg), '_blank');
};
ACTS['c-menu'] = t => {
  const c = ctx(t);
  modal(`<h3>إعدادات ${esc(c.name)}</h3><form class="col" data-form="c-rename" data-cid="${c.id}"><div class="field"><label for="cr-n">اسم الصف</label><input class="input" id="cr-n" name="name" value="${esc(c.name)}" required></div><button class="btn sm" type="submit">حفظ الاسم</button></form>
    <div class="col" style="margin-top:14px" data-cid="${c.id}"><b>نمط واجهة الطلبة</b><div class="style-cards">${['kids', 'mid', 'uni'].map(k => `<button type="button" class="style-card ${k === c.style ? 'on' : ''}" data-act="c-style" data-style="${k}"><div class="sw" style="background:${STYLE_SW[k]}"></div>${STYLE_AR[k]}</button>`).join('')}</div>
    <div class="row between card" style="margin-top:8px"><div><b>التسجيل الذاتي</b><div class="sub">رابط يسجل به الطلبة بأنفسهم</div></div><button class="btn sm ${c.self_join ? 'soft' : ''}" data-act="t-self" data-on="${c.self_join ? 0 : 1}">${c.self_join ? 'إيقاف' : 'تفعيل'}</button></div>
    ${c.self_join ? `<div class="join-box" dir="ltr">${esc(joinLink(c.join_code))}</div><button class="btn sm" data-act="copy" data-v="${esc(joinLink(c.join_code))}">نسخ الرابط</button>` : ''}
    <button class="btn danger" data-act="c-del" style="margin-top:10px">${ic('trash')} حذف الصف</button></div>`);
};
ACTS['c-del-all'] = async () => {
  const n = CL.classes.length, st = Object.values(CL.students).reduce((x, s) => x + s.length, 0);
  const v = prompt(`سيتم حذف ${n} صف و${st} طالب/ـة وكل النتائج والمسابقات نهائياً.\nللتأكيد اكتب كلمة: حذف`);
  if ((v || '').trim() !== 'حذف') return v === null ? null : toast('لم يتم الحذف');
  const { error } = await sb.from('classes').delete().in('id', CL.classes.map(c => c.id));
  if (error) return toast(errMsg(error));
  CL.open.clear(); toast('تم حذف جميع الصفوف'); await tClasses();
};
ACTS['c-rename'] = async f => {
  const { error } = await sb.from('classes').update({ name: f.name.value.trim() }).eq('id', f.dataset.cid);
  if (error) return toast(errMsg(error)); closeModals(); toast('تم الحفظ'); await tClasses();
};
ACTS['c-style'] = async t => {
  const c = ctx(t);
  const { error } = await sb.from('classes').update({ style: t.dataset.style }).eq('id', c.id);
  if (error) return toast(errMsg(error));
  c.style = t.dataset.style; t.parentElement.querySelectorAll('.style-card').forEach(b => b.classList.toggle('on', b === t)); toast('تم تغيير النمط');
};
ACTS['c-del'] = async t => {
  const c = ctx(t);
  if (!confirm(`حذف «${c.name}» وكل طلبته ونتائجهم نهائياً؟`)) return;
  const { error } = await sb.from('classes').delete().eq('id', c.id);
  if (error) return toast(errMsg(error)); closeModals(); CL.open.delete(c.id); await tClasses();
};
ACTS['t-add-class'] = () => {
  modal(`<h3>إضافة صف</h3><form class="col" data-form="t-save-class">
    <div class="field"><label for="c-name">اسم الصف</label><input class="input" id="c-name" name="name" required maxlength="60" placeholder="مثال: السادس / ب"></div>
    <div class="field"><label>نمط الواجهة للطلبة</label>${styleCards('mid')}<input type="hidden" name="style" value="mid"></div>
    <button class="btn" type="submit">حفظ</button></form>`);
};
ACTS['t-save-class'] = async f => {
  const { data, error } = await sb.from('classes').insert({ teacher_id: T.user.id, name: f.name.value.trim(), style: f.style.value }).select().single();
  if (error) return toast(errMsg(error));
  closeModals(); CL.open.add(data.id); CL.tab = 'classes'; await tClasses();
};

/* ---- multi-class upload ---- */
ACTS['t-multi-up'] = () => document.getElementById('mxl').click();
ACTS['t-multi-sample'] = () => {
  const ws = XLSX.utils.aoa_to_sheet([['الاسم', 'رقم الطالب', 'الصف', 'الهاتف'], ['سارة العتيبي', '1001', 'السادس / أ', '99999999'], ['ليان الزامل', '1002', 'السادس / أ', ''], ['نور الحربي', '2001', 'السادس / ب', '']]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'الطلبة'); XLSX.writeFile(wb, 'نموذج-الصفوف.xlsx');
};
function parseMulti(rows){
  if (!rows.length) return [];
  const head = rows[0].map(x => String(x).trim().toLowerCase());
  const isPh = h => /هاتف|جوال|موبايل|phone|mobile|واتس/.test(h);
  let ni = head.findIndex(h => /اسم|name/.test(h)), ri = head.findIndex(h => !isPh(h) && /رقم|number|\bid\b|\bno\b/.test(h)), ci = head.findIndex(h => /صف|فصل|شعبة|class/.test(h)), pi = head.findIndex(isPh), start = 1;
  if (ni < 0 || ci < 0) { ni = 0; ri = 1; ci = 2; pi = rows[0].length > 3 ? 3 : -1; start = 0; }
  return rows.slice(start).map(r => ({ name: String(r[ni] == null ? '' : r[ni]).trim(), student_no: ri >= 0 ? String(r[ri] == null ? '' : r[ri]).trim() : '', cls: String(r[ci] == null ? '' : r[ci]).trim(), phone: pi >= 0 ? String(r[pi] == null ? '' : r[pi]).trim() : '' })).filter(x => x.name && x.cls);
}
ACTS['t-multi-chosen'] = async t => {
  const file = t.files && t.files[0];
  if (!file) return;
  try {
    const list = parseMulti(await readRows(file));
    t.value = '';
    if (!list.length) return toast('لم أجد بيانات. تأكد من الأعمدة: الاسم، رقم الطالب، الصف');
    const g = {};
    list.forEach(x => (g[x.cls] = g[x.cls] || []).push({ name: x.name, student_no: x.student_no, phone: x.phone }));
    CK.multi = g;
    modal(`<h3>معاينة الصفوف</h3><p class="muted" style="margin-bottom:10px">وُجد <b>${Object.keys(g).length}</b> صف و<b>${list.length}</b> طالب/ـة. الصفوف الجديدة ستُنشأ، والموجودة بنفس الاسم تُضاف إليها الأسماء.</p>
      <div class="tbl-wrap"><table><thead><tr><th>الصف</th><th>عدد الطلبة</th></tr></thead><tbody>${Object.keys(g).map(k => `<tr><td>${esc(k)}</td><td>${g[k].length}</td></tr>`).join('')}</tbody></table></div>
      <div class="row" style="margin-top:14px"><button class="btn" data-act="t-multi-confirm">تأكيد الإضافة</button><button class="btn soft" data-act="close-modal" style="width:auto">إلغاء</button></div>`);
  } catch(e){ toast('تعذّرت قراءة الملف'); }
};
ACTS['t-multi-confirm'] = async t => {
  t.disabled = true; t.textContent = 'جارٍ الإضافة...';
  try {
    const ex = await sb.from('classes').select('id,name');
    if (ex.error) throw ex.error;
    const byName = {}; ex.data.forEach(c => byName[c.name.trim()] = c.id);
    let added = 0, skipped = 0, made = 0;
    for (const name of Object.keys(CK.multi)) {
      let id = byName[name];
      if (!id) {
        const r = await sb.from('classes').insert({ teacher_id: T.user.id, name, style: 'mid' }).select().single();
        if (r.error) throw r.error;
        id = r.data.id; made++;
      }
      const rows = CK.multi[name];
      for (let i = 0; i < rows.length; i += 150) {
        const r = await rpc('add_students', { p_class: id, p_rows: rows.slice(i, i + 150) });
        added += r.added.length; skipped += r.skipped;
      }
    }
    closeModals();
    toast(`أُنشئ ${made} صف وأُضيف ${added} طالب/ـة` + (skipped ? ` (تخطي ${skipped})` : ''));
    await tClasses();
  } catch(e){ closeModals(); toast(errMsg(e)); }
};

/* ---- class helpers ---- */
async function tClass(id){ if (id) CL.open.add(id); CL.tab = 'classes'; location.replace('#/t/classes'); }
ACTS['t-upload'] = t => { ctx(t); document.getElementById('xl').click(); };
function joinLink(code){ return code ? location.origin + location.pathname + '#/j/' + code : ''; }
ACTS['copy'] = async t => {
  try { await navigator.clipboard.writeText(t.dataset.v); toast('تم النسخ'); }
  catch(e){ prompt('انسخ الرابط:', t.dataset.v); }
};
ACTS['t-self'] = async t => {
  ctx(t);
  try {
    const code = await rpc('set_self_join', { p_class: CK.cls.id, p_on: t.dataset.on === '1' });
    closeModals(); await tClasses(); if (t.dataset.on === '1') toast('تم التفعيل، الرابط في صفحة الصف');
  } catch(e){ toast(errMsg(e)); }
};
ACTS['t-sample-students'] = () => {
  const ws = XLSX.utils.aoa_to_sheet([['الاسم', 'رقم الطالب', 'الهاتف'], ['سارة العتيبي', '1001', '99999999'], ['ليان الزامل', '1002', '']]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'الطلبة'); XLSX.writeFile(wb, 'نموذج-الطلبة.xlsx');
};
async function readRows(file){
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }).filter(r => r.some(c => String(c).trim() !== ''));
}
function parseStudents(rows){
  if (!rows.length) return [];
  const head = rows[0].map(x => String(x).trim().toLowerCase());
  const isPh = h => /هاتف|جوال|موبايل|phone|mobile|واتس/.test(h);
  let ni = head.findIndex(h => /اسم|name/.test(h)), ri = head.findIndex(h => !isPh(h) && /رقم|number|\bid\b|\bno\b/.test(h)), pi = head.findIndex(isPh), start = 0;
  if (ni >= 0) { start = 1; if (ri < 0) ri = head.length > 1 ? (ni === 0 ? 1 : 0) : -1; }
  else {
    const numeric = i => rows.every(r => /^\d+$/.test(String(r[i] == null ? '' : r[i]).trim()));
    if (rows[0].length > 1 && numeric(0)) { ri = 0; ni = 1; } else { ni = 0; ri = rows[0].length > 1 ? 1 : -1; }
  }
  return rows.slice(start).map(r => ({ name: String(r[ni] == null ? '' : r[ni]).trim(), student_no: ri >= 0 ? String(r[ri] == null ? '' : r[ri]).trim() : '', phone: pi >= 0 ? String(r[pi] == null ? '' : r[pi]).trim() : '' })).filter(x => x.name);
}
ACTS['t-xl-chosen'] = async t => {
  const file = t.files && t.files[0];
  if (!file) return;
  try {
    CK.pending = parseStudents(await readRows(file));
    t.value = '';
    if (!CK.pending.length) return toast('لم أجد أسماء في الملف');
    modal(`<h3>معاينة الملف</h3><p class="muted" style="margin-bottom:10px">تمت قراءة <b>${CK.pending.length}</b> سجلاً. تأكد من الأسماء والأرقام ثم أكّد الإضافة.</p>
      <div class="tbl-wrap"><table><thead><tr><th>#</th><th>الاسم</th><th>رقم الطالب</th></tr></thead><tbody>${CK.pending.slice(0, 8).map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.name)}</td><td>${esc(r.student_no)}</td></tr>`).join('')}</tbody></table></div>
      ${CK.pending.length > 8 ? `<p class="sub" style="margin-top:6px">… و${CK.pending.length - 8} آخرون</p>` : ''}
      <div class="row" style="margin-top:14px"><button class="btn" data-act="t-confirm-upload">تأكيد الإضافة</button><button class="btn soft" data-act="close-modal" style="width:auto">إلغاء</button></div>`);
  } catch(e){ toast('تعذّرت قراءة الملف'); }
};
ACTS['t-confirm-upload'] = async t => {
  t.disabled = true; t.textContent = 'جارٍ الإضافة...';
  let added = 0, skipped = 0;
  try {
    for (let i = 0; i < CK.pending.length; i += 150) {
      const r = await rpc('add_students', { p_class: CK.cls.id, p_rows: CK.pending.slice(i, i + 150) });
      added += r.added.length; skipped += r.skipped;
    }
    closeModals();
    toast(`أُضيف ${added}` + (skipped ? ` وتم تخطي ${skipped} مكرر/فارغ` : ''));
    await tClasses();
  } catch(e){ closeModals(); toast(errMsg(e)); }
};
ACTS['t-add-one'] = t => { ctx(t);
  modal(`<h3>إضافة طالب/ـة</h3><form class="col" data-form="t-save-one"><div class="field"><label for="o-n">الاسم</label><input class="input" id="o-n" name="name" required></div>
    <div class="field"><label for="o-no">رقم الطالب</label><input class="input" id="o-no" name="no" dir="ltr"></div>
    <div class="field"><label for="o-ph">رقم الهاتف (اختياري)</label><input class="input" id="o-ph" name="ph" type="tel" dir="ltr" placeholder="مثال: 99999999"></div><button class="btn" type="submit">إضافة</button></form>`);
};
ACTS['t-save-one'] = async f => {
  try {
    const r = await rpc('add_students', { p_class: CK.cls.id, p_rows: [{ name: f.name.value, student_no: f.no.value, phone: f.ph.value }] });
    closeModals();
    toast(r.added.length ? 'تمت الإضافة' : 'الرقم موجود مسبقاً في الصف');
    await tClasses();
  } catch(e){ toast(errMsg(e)); }
};
ACTS['t-regen'] = async t => { ctx(t); closeModals();
  if (!confirm('إنشاء رمز جديد؟ سيتوقف الرمز القديم عن العمل.')) return;
  try { await rpc('regenerate_code', { p_student: t.dataset.id }); await tClasses(); toast('تم إنشاء رمز جديد'); } catch(e){ toast(errMsg(e)); }
};
ACTS['t-del-student'] = async t => { ctx(t); closeModals();
  if (!confirm('حذف هذا الطالب/ـة ونتائجه نهائياً؟')) return;
  const { error } = await sb.from('students').delete().eq('id', t.dataset.id);
  if (error) return toast(errMsg(error));
  await tClasses();
};
ACTS['t-export-codes'] = t => { ctx(t);
  const rows = [['الاسم', 'رقم الطالب', 'الهاتف', 'الرمز']].concat(CK.students.map(s => [s.name, s.student_no, s.phone || '', s.code]));
  const ws = XLSX.utils.aoa_to_sheet(rows), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الرموز');
  XLSX.writeFile(wb, 'رموز-' + CK.cls.name.replace(/[\\/:*?"<>|]/g, '-') + '.xlsx');
};
ACTS['t-print-codes'] = t => { ctx(t);
  const url = location.origin + location.pathname;
  document.getElementById('print-area').innerHTML = `<h2 style="text-align:center;margin:0 0 10px">${esc(CK.cls.name)} — رموز الدخول إلى تحدّي الدقيقة</h2><p style="text-align:center;direction:ltr;margin:0 0 12px">${esc(url)}</p>` +
    `<div class="pcards">${CK.students.map(s => `<div class="pcard"><b>${esc(s.name)}</b><div class="pc">${esc(s.code)}</div><small>${esc(s.student_no)}</small></div>`).join('')}</div>`;
  window.print();
};

/* ---- competitions (one place, many classes) ---- */
const CC = { sel: new Set(), qtypes: [], subject: 'عام' };
function compGroups(){
  const g = {};
  (CL.allComps || []).forEach(c => { (g[c.group_id] = g[c.group_id] || []).push(c); });
  return Object.values(g);
}
function compsPanel(){
  if (T.compEdit) return compForm();
  const groups = compGroups();
  const free = CL.classes.filter(c => !CL.comps[c.id]);
  return `<button class="btn" data-act="cp-new">${ic('plus')} مسابقة جديدة</button>` +
    (groups.length ? groups.map(g => { const c = g[0], ph = phaseOf(c); return `<div class="card col"><div class="row between"><b style="font-size:18px">${esc(c.title)}</b><span class="chip ${ph === 'points' ? 'good' : ph === 'knockout' ? 'warn' : ''}">${PHASE_AR[ph]}</span></div>
      <div class="sub">النقاط: ${esc(fmtDate(c.start_date))} ← ${esc(fmtDate(c.points_end_date))} · النهاية: ${esc(fmtDate(c.end_date))}</div>
      <div class="sub">الصعوبة: ${(DIFF.find(d => d[0] === (c.difficulty || 'normal')) || DIFF[1])[1]}${c.curriculum_id && CU.list.length ? ' · ' + esc(cuName(CU.list.find(x => x.id === c.curriculum_id))) : ''}</div>
      <div class="row" style="flex-wrap:wrap;gap:6px">${g.map(x => `<span class="chip">${esc((CL.byId[x.class_id] || {}).name || '')}</span>`).join('')}</div>
      <div class="row"><button class="btn sm" data-act="cp-edit" data-g="${c.group_id}">${ic('edit')} الإعدادات</button><button class="btn sm soft" data-act="cp-end" data-g="${c.group_id}">إنهاء المسابقة</button></div></div>`; }).join('')
      : '<div class="card center muted">لا توجد مسابقات نشطة.</div>') +
    (groups.length && free.length ? `<p class="sub">صفوف بلا مسابقة: ${free.map(c => esc(c.name)).join('، ')}</p>` : '');
}
ACTS['cp-new'] = async () => {
  if (!CL.classes.length) return toast('أضف صفاً أولاً');
  await loadCurricula().catch(() => {});
  T.compEdit = 'new'; CC.sel = new Set(CL.classes.filter(c => !CL.comps[c.id]).map(c => c.id));
  const st = T.settings || {}; CC.qtypes = (st.qtypes || ['curriculum', 'general', 'quick']).slice(); CC.diff = st.difficulty || 'normal'; CC.cu = ''; CC.style = (CL.classes.find(c => CC.sel.has(c.id)) || CL.classes[0]).style || 'mid';
  renderClasses();
};
ACTS['cp-edit'] = async t => {
  await loadCurricula().catch(() => {});
  T.compEdit = t.dataset.g;
  const g = CL.allComps.filter(c => c.group_id === T.compEdit);
  CC.sel = new Set(g.map(c => c.class_id));
  const first = CL.byId[g[0].class_id] || {}; CC.qtypes = (g[0].qtypes || first.qtypes || ['curriculum', 'general', 'quick']).slice(); CC.diff = g[0].difficulty || 'normal'; CC.cu = g[0].curriculum_id || ''; CC.style = first.style || 'mid';
  renderClasses();
};
ACTS['cp-cancel'] = () => { T.compEdit = null; renderClasses(); };
ACTS['cp-end'] = async t => {
  if (!confirm('إنهاء هذه المسابقة لكل صفوفها؟ تبقى النتائج محفوظة.')) return;
  const { error } = await sb.from('competitions').update({ status: 'finished' }).eq('group_id', t.dataset.g);
  if (error) return toast(errMsg(error)); await tClasses();
};
function compForm(){
  const isNew = T.compEdit === 'new', t = todayKW();
  const g = isNew ? null : CL.allComps.find(c => c.group_id === T.compEdit);
  const v = g || { title: 'مسابقة تحدّي الدقيقة', start_date: t, points_end_date: addDays(t, 4), end_date: addDays(t, 7), group_size: 6, qualifiers: 8, round_window_hours: 24 };
  const opt = (val, lab) => `<option value="${val}" ${Number(v.round_window_hours) === val ? 'selected' : ''}>${lab}</option>`;
  return `<form class="col" data-form="cp-save">
    <div class="card col"><b>${isNew ? 'مسابقة جديدة' : 'إعدادات المسابقة'}</b>
      <div class="field"><label for="k-title">عنوان المسابقة</label><input class="input" id="k-title" name="title" value="${esc(v.title)}" required></div></div>
    <div class="card col"><div class="row between"><b>الصفوف المشاركة</b><button type="button" class="link" data-act="cp-all">تحديد الكل</button></div>
      <div class="picks picks2">${CL.classes.map(c => { const other = CL.comps[c.id] && CL.comps[c.id].group_id !== T.compEdit; return `<button type="button" class="pick ${CC.sel.has(c.id) ? 'on' : ''}" data-act="cp-cls" data-id="${c.id}"><b>${esc(c.name)}</b><small>${(CL.students[c.id] || []).length} طالب/ـة${other ? ' · في مسابقة أخرى' : ''}</small></button>`; }).join('')}</div>
      <p class="sub">كل صف له ترتيبه وتصفياته الخاصة، والإعدادات واحدة للجميع.</p></div>
    <div class="card col"><b>ثيم واجهة الطلبة</b><div class="picks">${[['kids', 'مرح', 'للابتدائي: ألوان زاهية وحركة أكثر', 'star'], ['mid', 'مرح قليلاً', 'للمتوسط: لمسات مرحة متوازنة', 'layers'], ['uni', 'هادئ', 'للثانوي والجامعة: بسيط ومركّز', 'check']].map(x => `<button type="button" class="pick wide ${CC.style === x[0] ? 'on' : ''}" data-act="cp-style" data-v="${x[0]}"><span class="pick-ic">${ic(x[3])}</span><div><b>${x[1]}</b><small>${x[2]}</small></div></button>`).join('')}</div>
      <p class="sub">يُطبَّق على كل الصفوف المشاركة.</p></div>
    <div class="card col"><b>المواعيد</b>
      <div class="grid2"><div class="field"><label for="k-s">بداية جمع النقاط</label><input class="input" type="date" id="k-s" name="start_date" value="${v.start_date}" required></div>
      <div class="field"><label for="k-p">نهاية جمع النقاط</label><input class="input" type="date" id="k-p" name="points_end_date" value="${v.points_end_date}" required></div></div>
      <div class="field"><label for="k-e">نهاية المسابقة (بعد التصفيات)</label><input class="input" type="date" id="k-e" name="end_date" value="${v.end_date}" required></div>
      <button type="button" class="btn sm soft" data-act="t-suggest">اقتراح التواريخ تلقائياً</button></div>
    <div class="card col"><b>التصفيات</b>
      <div class="grid2"><div class="field"><label for="k-g">حجم المجموعة</label><input class="input" type="number" min="2" max="40" id="k-g" name="group_size" value="${v.group_size}"></div>
      <div class="field"><label for="k-q">المتأهلون من كل صف</label><input class="input" type="number" min="2" max="64" id="k-q" name="qualifiers" value="${v.qualifiers}"></div></div>
      <div class="field"><label for="k-w">مدة كل دور</label><select class="input" id="k-w" name="round_window_hours">${opt(12, '12 ساعة')}${opt(24, 'يوم')}${opt(48, 'يومان')}${opt(72, '3 أيام')}</select></div></div>
    <div class="card col"><b>الأسئلة</b><div class="picks picks2">${QTYPES.map(q => `<button type="button" class="pick ${CC.qtypes.includes(q[0]) ? 'on' : ''}" data-act="cp-qt" data-v="${q[0]}"><span class="pick-ic">${ic(q[3])}</span><b>${q[1]}</b></button>`).join('')}</div>
      <div class="field"><label for="k-cu">المنهج</label><select class="input" id="k-cu" name="cu">${cuOptions(CC.cu, 'كل أسئلة المنهج المعتمدة')}</select>
      <button type="button" class="link" data-act="go-qset" style="align-self:flex-start">إدارة المناهج</button></div>
      <div class="field"><label>مستوى الصعوبة</label><div class="tabs">${DIFF.map(d => `<button type="button" class="${CC.diff === d[0] ? 'on' : ''}" data-act="cp-diff" data-v="${d[0]}">${d[1]}</button>`).join('')}</div>
      <p class="sub" id="cp-diff-d">${(DIFF.find(d => d[0] === CC.diff) || DIFF[1])[2]}</p></div>
      <p class="sub">كل جولة: 4 أسئلة × 15 ثانية. جولة رسمية يومياً، والتدريب مفتوح.</p></div>
    <div class="row w-nav"><button type="button" class="btn soft" data-act="cp-cancel">إلغاء</button><button class="btn" type="submit">${isNew ? 'إنشاء المسابقة' : 'حفظ'}</button></div></form>`;
}
function cpKeep(){ const f = document.querySelector('[data-form="cp-save"]'); if (f && f.cu) CC.cu = f.cu.value; }
ACTS['cp-style'] = t => { CC.style = t.dataset.v; t.parentElement.querySelectorAll('.pick').forEach(b => b.classList.toggle('on', b === t)); };
ACTS['cp-diff'] = t => { CC.diff = t.dataset.v; t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); const d = document.getElementById('cp-diff-d'); if (d) d.textContent = DIFF.find(x => x[0] === CC.diff)[2]; };
ACTS['cp-cls'] = t => { const id = t.dataset.id; CC.sel.has(id) ? CC.sel.delete(id) : CC.sel.add(id); t.classList.toggle('on'); };
ACTS['cp-all'] = () => { CL.classes.forEach(c => CC.sel.add(c.id)); document.querySelectorAll('[data-act="cp-cls"]').forEach(b => b.classList.add('on')); };
ACTS['cp-qt'] = t => { const k = t.dataset.v; if (CC.qtypes.includes(k)) { if (CC.qtypes.length === 1) return toast('اختر نوعاً واحداً على الأقل'); CC.qtypes = CC.qtypes.filter(x => x !== k); } else CC.qtypes.push(k); t.classList.toggle('on'); };
ACTS['t-suggest'] = () => {
  const f = document.querySelector('[data-form="cp-save"]');
  const start = f.start_date.value || todayKW();
  const q = Math.max(2, Number(f.qualifiers.value) || 8), rounds = Math.ceil(Math.log2(q));
  const days = Math.ceil((Number(f.round_window_hours.value) || 24) / 24);
  const pe = addDays(start, 4);
  f.start_date.value = start; f.points_end_date.value = pe; f.end_date.value = addDays(pe, rounds * days);
  toast('5 أيام لجمع النقاط ثم ' + rounds + ' أدوار تصفيات');
};
ACTS['cp-save'] = async f => {
  cpKeep();
  const ids = [...CC.sel];
  if (!ids.length) return toast('اختر صفاً واحداً على الأقل');
  const p = { title: f.title.value.trim() || 'مسابقة تحدّي الدقيقة', start_date: f.start_date.value, points_end_date: f.points_end_date.value, end_date: f.end_date.value,
    group_size: Number(f.group_size.value), qualifiers: Number(f.qualifiers.value), round_window_hours: Number(f.round_window_hours.value),
    curriculum_id: CC.cu || null, difficulty: CC.diff || 'normal', qtypes: CC.qtypes };
  if (!(p.start_date <= p.points_end_date && p.points_end_date <= p.end_date)) return toast('تحقق من ترتيب التواريخ');
  const isNew = T.compEdit === 'new', gid = isNew ? crypto.randomUUID() : T.compEdit;
  const inGroup = isNew ? [] : CL.allComps.filter(c => c.group_id === gid);
  const moving = ids.filter(id => CL.comps[id] && CL.comps[id].group_id !== gid);
  if (moving.length && !confirm(`${moving.length} صف مشترك في مسابقة أخرى، سيتم إنهاؤها لهذه الصفوف. متابعة؟`)) return;
  try {
    const chk = r => { if (r.error) throw r.error; };
    if (moving.length) chk(await sb.from('competitions').update({ status: 'finished' }).in('id', moving.map(id => CL.comps[id].id)));
    const keep = inGroup.filter(c => ids.includes(c.class_id)), drop = inGroup.filter(c => !ids.includes(c.class_id));
    if (keep.length) chk(await sb.from('competitions').update(p).in('id', keep.map(c => c.id)));
    if (drop.length) chk(await sb.from('competitions').update({ status: 'finished' }).in('id', drop.map(c => c.id)));
    const add = ids.filter(id => !keep.some(c => c.class_id === id));
    if (add.length) chk(await sb.from('competitions').insert(add.map(id => Object.assign({ class_id: id, group_id: gid }, p))));
    chk(await sb.from('classes').update({ qtypes: CC.qtypes, style: CC.style || 'mid' }).in('id', ids));
    T.compEdit = null; toast('تم الحفظ'); await tClasses();
  } catch(e){ toast(errMsg(e)); }
};

/* ---- questions ---- */
async function tQuestions(){
  const [own, glob] = await Promise.all([
    sb.from('questions').select('*').eq('owner_id', T.user.id).order('created_at', { ascending: false }),
    sb.from('questions').select('id', { count: 'exact', head: true }).is('owner_id', null)
  ]);
  if (own.error) throw own.error;
  QS.list = own.data; QS.globalCount = glob.count || 0;
  renderQuestions();
}
function renderQuestions(){
  const f = T.qf; if (f.status === 'all') f.status = QS.list.some(q => q.status === 'draft') ? 'draft' : 'approved';
  const cnt = k => QS.list.filter(q => q.status === k).length;
  const list = QS.list.filter(q => q.status === f.status && (f.level === 'all' || q.level === f.level));
  const lv = [['all', 'الكل'], ['easy', 'سهل'], ['medium', 'متوسط'], ['hard', 'صعب']];
  const items = list.map(q => `<div class="q-item" data-act="t-q-edit" data-id="${q.id}"><b class="q-body">${esc(q.body)}</b>
    <div class="opts-s">${q.options.map((o, i) => `<span class="${i === q.correct_index ? 'c' : ''}">${LETTERS[i]}. ${esc(o)}</span>`).join('')}</div>
    <div class="row"><span class="chip lv-${q.level}">${LEVEL_AR[q.level]}</span><span class="chip">${TYPE_AR[q.qtype] || q.qtype}</span><span class="grow"></span>
    ${q.status === 'draft' ? `<button class="q-ok" data-act="t-q-status" data-id="${q.id}" data-s="approved" aria-label="اعتماد">${ic('check')}</button><button class="q-no" data-act="t-q-status" data-id="${q.id}" data-s="rejected" aria-label="رفض">${ic('x')}</button>` : ''}
    ${q.status === 'rejected' ? `<button class="btn sm soft" data-act="t-q-status" data-id="${q.id}" data-s="approved">استعادة</button>` : ''}</div></div>`).join('');
  const top = `<button class="icon-btn" data-act="t-q-more" aria-label="المزيد">${ic('more')}</button>`;
  const body = `<div class="tabs"><button class="${f.status === 'draft' ? 'on' : ''}" data-act="t-qs" data-v="draft">للمراجعة ${cnt('draft') ? `<span class="badge">${cnt('draft')}</span>` : ''}</button><button class="${f.status === 'approved' ? 'on' : ''}" data-act="t-qs" data-v="approved">معتمدة (${cnt('approved')})</button><button class="${f.status === 'rejected' ? 'on' : ''}" data-act="t-qs" data-v="rejected">مرفوضة</button></div>
    <div class="lv-chips">${lv.map(x => `<button class="${f.level === x[0] ? 'on' : ''}" data-act="t-ql" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>
    ${f.status === 'draft' && list.length ? `<button class="btn accent" data-act="t-q-approve-all">${ic('check')} اعتماد الكل (${cnt('draft')})</button>` : ''}
    ${items || `<div class="card center muted">${f.status === 'draft' ? 'لا توجد أسئلة بانتظار المراجعة.' : 'لا توجد أسئلة هنا.'}</div>`}
    <p class="sub center">اضغط على السؤال لتعديله. البنك العام المعتمد: ${QS.globalCount} سؤالاً.</p>
    <button class="fab" data-act="t-q-add" aria-label="إضافة سؤال">${ic('plus')}</button>
    <input type="file" id="qxl" accept=".xlsx,.xls,.csv" class="hide" data-change="t-q-chosen">`;
  view('الأسئلة', body, 'questions', top);
}
ACTS['t-qs'] = t => { T.qf.status = t.dataset.v; renderQuestions(); };
ACTS['t-ql'] = t => { T.qf.level = t.dataset.v; renderQuestions(); };
ACTS['t-q-more'] = () => sheet('الأسئلة', [
  { act: 'm-run', attrs: 'data-a="t-q-add"', icon: 'plus', label: 'إضافة سؤال' },
  { act: 'm-run', attrs: 'data-a="t-q-import"', icon: 'upload', label: 'استيراد أسئلة من Excel' },
  { act: 'm-run', attrs: 'data-a="t-q-template"', icon: 'download', label: 'تنزيل النموذج' },
  { act: 'm-run', attrs: 'data-a="t-q-export"', icon: 'download', label: 'تنزيل أسئلتي' },
  null,
  { act: 'm-run', attrs: 'data-a="t-q-del-rejected"', icon: 'trash', label: 'حذف كل الأسئلة المرفوضة', danger: true }
]);
ACTS['t-q-del-rejected'] = async () => {
  const n = QS.list.filter(q => q.status === 'rejected').length;
  if (!n) return toast('لا توجد أسئلة مرفوضة');
  if (!confirm(`حذف ${n} سؤالاً مرفوضاً نهائياً؟`)) return;
  const { error } = await sb.from('questions').delete().eq('owner_id', T.user.id).eq('status', 'rejected');
  if (error) return toast(errMsg(error)); await tQuestions();
};
ACTS['t-qf'] = t => { T.qf[t.dataset.k] = t.value; renderQuestions(); };
function qForm(q){
  q = q || { qtype: 'curriculum', level: 'medium', body: '', options: ['', '', '', ''], correct_index: 0 };
  const o = (v, cur, map) => Object.keys(map).filter(k => k !== 'memory').map(k => `<option value="${k}" ${cur === k ? 'selected' : ''}>${map[k]}</option>`).join('');
  return `<h3>${q.id ? 'تعديل سؤال' : 'إضافة سؤال'}</h3><form class="col" data-form="t-save-q"><input type="hidden" name="id" value="${q.id || ''}">
    <div class="grid2"><div class="field"><label for="q-t">النوع</label><select class="input" id="q-t" name="qtype">${o(0, q.qtype, TYPE_AR)}</select></div>
    <div class="field"><label for="q-l">المستوى</label><select class="input" id="q-l" name="level">${o(0, q.level, LEVEL_AR)}</select></div></div>
    <div class="field"><label for="q-cu">المنهج (لأسئلة المنهج)</label><select class="input" id="q-cu" name="cu">${cuOptions(q.curriculum_id || QS.lastCu || '')}</select></div>
    <div class="field"><label for="q-b">نص السؤال</label><textarea class="input" id="q-b" name="body" rows="2" required maxlength="300">${esc(q.body)}</textarea></div>
    ${[0, 1, 2, 3].map(i => `<div class="field"><label for="q-o${i}">الخيار ${LETTERS[i]}</label><input class="input" id="q-o${i}" name="o${i}" value="${esc(q.options[i])}" required maxlength="100"></div>`).join('')}
    <div class="field"><label for="q-c">الإجابة الصحيحة</label><select class="input" id="q-c" name="correct">${LETTERS.map((l, i) => `<option value="${i}" ${q.correct_index === i ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <button class="btn" type="submit">حفظ</button>
    ${q.id ? `<button type="button" class="btn danger" data-act="t-q-del" data-id="${q.id}">${ic('trash')} حذف السؤال</button>` : ''}</form>`;
}
ACTS['t-q-add'] = async () => { await loadCurricula().catch(() => {}); modal(qForm()); };
ACTS['t-q-edit'] = async t => { await loadCurricula().catch(() => {}); modal(qForm(QS.list.find(x => x.id === t.dataset.id))); };
ACTS['t-save-q'] = async f => {
  const row = { qtype: f.qtype.value, level: f.level.value, body: f.body.value.trim(), options: [0, 1, 2, 3].map(i => f['o' + i].value.trim()), correct_index: Number(f.correct.value), curriculum_id: f.cu.value || null };
  QS.lastCu = f.cu.value;
  if (new Set(row.options).size < 4) return toast('الخيارات يجب أن تكون مختلفة');
  const r = f.id.value ? await sb.from('questions').update(row).eq('id', f.id.value) : await sb.from('questions').insert(Object.assign({ owner_id: T.user.id, status: 'draft', source: 'teacher' }, row));
  if (r.error) return toast(errMsg(r.error));
  closeModals(); toast('تم الحفظ'); await tQuestions();
};
ACTS['t-q-status'] = async t => {
  const { error } = await sb.from('questions').update({ status: t.dataset.s }).eq('id', t.dataset.id);
  if (error) return toast(errMsg(error));
  await tQuestions();
};
ACTS['t-q-del'] = async t => {
  if (!confirm('حذف هذا السؤال نهائياً؟')) return;
  const { error } = await sb.from('questions').delete().eq('id', t.dataset.id);
  if (error) return toast(errMsg(error));
  closeModals(); await tQuestions();
};
ACTS['t-q-approve-all'] = async () => {
  if (!confirm('اعتماد كل المسودات؟ تأكد أنك راجعتها.')) return;
  const { error } = await sb.from('questions').update({ status: 'approved' }).eq('owner_id', T.user.id).eq('status', 'draft');
  if (error) return toast(errMsg(error));
  toast('تم اعتماد المسودات'); await tQuestions();
};
const QHEAD = ['السؤال', 'أ', 'ب', 'ج', 'د', 'الإجابة الصحيحة', 'المستوى', 'النوع'];
ACTS['t-q-template'] = () => {
  const ws = XLSX.utils.aoa_to_sheet([QHEAD, ['ما عاصمة دولة الكويت؟', 'مدينة الكويت', 'الجهراء', 'الفحيحيل', 'الأحمدي', 'أ', 'سهل', 'عام'], ['كم يساوي 12 × 12؟', '124', '144', '154', '164', 'ب', 'متوسط', 'سرعة بديهة']]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'الأسئلة'); XLSX.writeFile(wb, 'نموذج-الأسئلة.xlsx');
};
ACTS['t-q-export'] = () => {
  const rows = [QHEAD.concat(['الحالة'])].concat(QS.list.map(q => [q.body].concat(q.options, [LETTERS[q.correct_index], LEVEL_AR[q.level], TYPE_AR[q.qtype], STATUS_AR[q.status]])));
  const ws = XLSX.utils.aoa_to_sheet(rows), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الأسئلة'); XLSX.writeFile(wb, 'أسئلتي.xlsx');
};
ACTS['t-q-import'] = () => { closeModals(); document.getElementById('qxl').click(); };
function parseQuestions(rows){
  const out = []; let bad = 0;
  const first = String((rows[0] || [])[0] || '');
  const body = /سؤال|question/i.test(first) ? rows.slice(1) : rows;
  const lv = { 'سهل': 'easy', 'متوسط': 'medium', 'صعب': 'hard' };
  const ty = { 'منهج': 'curriculum', 'عام': 'general', 'بديهة': 'quick', 'سرعة بديهة': 'quick', 'ذاكرة': 'general' };
  body.forEach(r => {
    const text = String(r[0] || '').trim();
    const opts = [1, 2, 3, 4].map(i => String(r[i] == null ? '' : r[i]).trim());
    const ans = String(r[5] == null ? '' : r[5]).trim();
    let ci = -1;
    const map = { 'أ': 0, 'ا': 0, 'a': 0, '1': 0, 'ب': 1, 'b': 1, '2': 1, 'ج': 2, 'c': 2, '3': 2, 'د': 3, 'd': 3, '4': 3 };
    if (ans.toLowerCase() in map) ci = map[ans.toLowerCase()]; else ci = opts.indexOf(ans);
    if (!text || opts.some(o => !o) || new Set(opts).size < 4 || ci < 0) { bad++; return; }
    out.push({ owner_id: T.user.id, qtype: ty[String(r[7] || '').trim()] || 'curriculum', level: lv[String(r[6] || '').trim()] || 'medium', body: text, options: opts, correct_index: ci, status: 'draft', source: 'teacher' });
  });
  return { out, bad };
}
ACTS['t-q-chosen'] = async t => {
  const file = t.files && t.files[0];
  if (!file) return;
  try {
    const { out, bad } = parseQuestions(await readRows(file));
    t.value = '';
    if (!out.length) return toast('لم أجد أسئلة صالحة في الملف');
    for (let i = 0; i < out.length; i += 100) {
      const { error } = await sb.from('questions').insert(out.slice(i, i + 100));
      if (error) throw error;
    }
    toast(`تم استيراد ${out.length} سؤالاً كمسودات للمراجعة` + (bad ? ` (تخطي ${bad} غير صالح)` : ''));
    await tQuestions();
  } catch(e){ toast(errMsg(e)); }
};

/* ---- results ---- */
const RS = { sort: 'pts', q: '', rows: [], name: '' };
async function tResults(classId){
  const { data: classes, error } = await sb.from('classes').select('id,name').order('created_at');
  if (error) throw error;
  if (!classes.length) return view('النتائج', '<div class="card center muted">أضف صفاً أولاً لتظهر النتائج.</div>', 'results');
  const id = classId || 'all';
  const pick = id === 'all' ? classes : classes.filter(c => c.id === id);
  const res = await Promise.all(pick.map(c => rpc('teacher_class_results', { p_class: c.id }).then(r => r.map(x => Object.assign({ cls: c.name }, x))).catch(() => [])));
  RS.rows = res.flat(); RS.all = id === 'all'; RS.id = id; RS.classes = classes;
  RS.name = id === 'all' ? 'كل الصفوف' : (classes.find(c => c.id === id) || {}).name || '';
  renderResults();
}
function renderResults(){
  const rows = RS.rows, n = rows.length;
  const acc = r => r.rounds ? Math.round(r.correct * 100 / (r.rounds * 4)) : -1;
  const byPts = rows.slice().sort((x, y) => y.pts - x.pts);
  const rank = new Map(); let rk = 0, prev = null;
  byPts.forEach((r, i) => { if (r.pts !== prev) { rk = i + 1; prev = r.pts; } rank.set(r, rk); });
  if (!RS.all) { rows.forEach(r => { if (r.r) rank.set(r, r.r); }); byPts.sort((x, y) => (x.r || 0) - (y.r || 0)); }
  const sorters = { pts: (x, y) => y.pts - x.pts, acc: (x, y) => acc(y) - acc(x), rounds: (x, y) => y.rounds - x.rounds, idle: (x, y) => (x.played_today - y.played_today) || (x.rounds - y.rounds) };
  let list = rows.slice().sort(sorters[RS.sort]);
  if (RS.q) list = list.filter(r => (r.name + ' ' + r.student_no).includes(RS.q));
  const played = rows.filter(r => r.played_today).length;
  const tr = rows.reduce((a, r) => a + r.rounds, 0), tc = rows.reduce((a, r) => a + r.correct, 0);
  const avg = n ? Math.round(rows.reduce((a, r) => a + r.pts, 0) / n) : 0;
  const top3 = byPts.filter(r => r.pts > 0).slice(0, 3);
  const pod = top3.length >= 2 ? `<div class="podium">${[1, 0, 2].map(i => top3[i] ? `<div class="pd pd${i + 1}"><div class="pd-medal">${i + 1}</div><b>${esc(top3[i].name.split(' ')[0])}</b><span>${top3[i].pts}</span><div class="pd-step"></div></div>` : '<div class="pd"></div>').join('')}</div>` : '';
  const chips = `<div class="lv-chips"><button class="${RS.id === 'all' ? 'on' : ''}" data-act="r-cls" data-id="all">كل الصفوف</button>${RS.classes.map(c => `<button class="${RS.id === c.id ? 'on' : ''}" data-act="r-cls" data-id="${c.id}">${esc(c.name)}</button>`).join('')}</div>`;
  const sorts = [['pts', 'النقاط'], ['acc', 'الدقة'], ['rounds', 'الجولات'], ['idle', 'لم يلعبوا']];
  const max = Math.max(1, ...rows.map(r => r.pts));
  const any = rows.some(r => r.rounds > 0);
  if (!any && RS.sort === 'pts') list.sort((x, y) => x.name.localeCompare(y.name, 'ar'));
  const items = list.map(r => { const a2 = acc(r), rr = rank.get(r);
    return `<button class="rl-row" data-act="r-open" data-k="${esc(r.cls + '|' + r.name + '|' + r.student_no)}">
      <span class="rl-rk ${r.pts && rr <= 3 ? 'm' + rr : ''}">${r.pts ? rr : ''}</span>
      <span class="grow rl-txt"><b>${esc(r.name)}</b><small>${RS.all ? esc(r.cls) + ' · ' : ''}${r.rounds ? r.rounds + ' جولة · دقة ' + a2 + '%' : 'لم يلعب بعد'}</small>
      ${r.pts ? `<span class="rl-bar"><i style="width:${Math.round(r.pts * 100 / max)}%"></i></span>` : ''}</span>
      ${r.played_today ? `<span class="rl-dot" title="لعب اليوم"></span>` : ''}
      <span class="rl-pts ${r.pts ? '' : 'z'}">${r.pts}</span></button>`; }).join('');
  const sum = `<div class="rs-sum"><div><b>${n}</b><span>طالب/ـة</span></div><div><b>${n ? Math.round(played * 100 / n) : 0}%</b><span>لعبوا اليوم</span></div><div><b>${avg}</b><span>متوسط النقاط</span></div><div><b>${tr ? Math.round(tc * 100 / (tr * 4)) + '%' : '—'}</b><span>الدقة</span></div></div>`;
  const body = chips + sum + pod +
    (!any ? `<div class="rs-empty">${ic('clock')}<div><b>لم تبدأ الجولات بعد</b><small>تظهر النقاط والترتيب هنا بعد أول جولة رسمية.</small></div></div>` : '') +
    `<div class="rs-search">${ic('search')}<input id="r-q" placeholder="بحث بالاسم أو الرقم" value="${esc(RS.q)}"></div>
     <div class="tabs rs-seg">${sorts.map(x => `<button class="${RS.sort === x[0] ? 'on' : ''}" data-act="r-sort" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>
     <div class="rl-grp" id="r-list">${items || '<div class="set-row center muted">لا يوجد طلبة.</div>'}</div>
     <div class="set-f center">${list.length} من ${n} · النقطة الخضراء: لعب اليوم</div>`;
  view('النتائج', body, 'results', `<button class="icon-btn" data-act="t-res-export" aria-label="تنزيل Excel">${ic('download')}</button>`);
}
ACTS['r-cls'] = t => go('#/t/results/' + t.dataset.id);
ACTS['r-sort'] = t => { RS.sort = t.dataset.v; renderResults(); };
document.addEventListener('input', e => {
  if (e.target.id !== 'r-q') return;
  RS.q = e.target.value.trim(); const pos = e.target.selectionStart;
  renderResults(); const i = document.getElementById('r-q'); if (i) { i.focus(); i.setSelectionRange(pos, pos); }
});
ACTS['r-open'] = t => {
  const r = RS.rows.find(x => (x.cls + '|' + x.name + '|' + x.student_no) === t.dataset.k); if (!r) return;
  const sorted = RS.rows.filter(x => x.cls === r.cls).sort((x, y) => y.pts - x.pts);
  const acc = r.rounds ? Math.round(r.correct * 100 / (r.rounds * 4)) + '%' : '—';
  const ini = r.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join(' ');
  modal(`<div class="st-card"><div class="st-top"><div class="avatar big-av">${esc(ini)}</div><div><b>${esc(r.name)}</b><div class="sub">${esc(r.cls)} · رقم ${esc(r.student_no) || '—'}</div></div></div>
    <div class="stats"><div class="stat"><b>${r.pts}</b><span>النقاط</span></div><div class="stat"><b>${r.pts ? sorted.indexOf(r) + 1 : '—'}</b><span>في صفه من ${sorted.length}</span></div><div class="stat"><b>${r.rounds}</b><span>الجولات</span></div><div class="stat"><b>${acc}</b><span>الدقة</span></div></div>
    <div class="sub center">${r.correct} إجابة صحيحة من ${r.rounds * 4} · ${r.played_today ? '<b style="color:#168A5B">لعب اليوم ✓</b>' : '<b style="color:#8a5a00">لم يلعب اليوم</b>'}</div>
    <button class="btn" style="margin-top:14px" data-act="r-report" data-id="${r.id}" data-name="${esc(r.name)}" data-cls="${esc(r.cls)}">تقرير المستوى المفصّل</button></div>`);
};
const LV_AR = { easy: 'السهلة', medium: 'المتوسطة', hard: 'الصعبة' };
function buildReport(name, d){
  const pc = (c, t) => t ? Math.round(c * 100 / t) : 0;
  const acc = pc(d.correct, d.total);
  const grade = acc >= 85 ? ['متفوّق', '#168A5B'] : acc >= 70 ? ['جيد جداً', '#2F80ED'] : acc >= 55 ? ['جيد', '#8a5a00'] : ['يحتاج دعماً', '#C22E33'];
  const lv = d.by_level.map(x => ({ n: LV_AR[x.k] || x.k, k: x.k, t: x.t, c: x.c, p: pc(x.c, x.t) }));
  const sb = d.by_subject.map(x => ({ n: x.k, t: x.t, c: x.c, p: pc(x.c, x.t) }));
  const ok = a => a.filter(x => x.t >= 3).sort((x, y) => y.p - x.p);
  const strong = [], weak = [], tips = [];
  const so = ok(sb), lo = ok(lv);
  so.filter(x => x.p >= 70).slice(0, 2).forEach(x => strong.push('مادة ' + x.n + ' (' + x.p + '%)'));
  lo.filter(x => x.p >= 75).slice(0, 2).forEach(x => strong.push('الأسئلة ' + x.n + ' (' + x.p + '%)'));
  so.slice().reverse().filter(x => x.p < 60).slice(0, 2).forEach(x => { weak.push('مادة ' + x.n + ' (' + x.p + '%)'); tips.push('راجعي/راجع دروس ' + x.n + ' ثم أعيدي/أعد الحل في التدريب المفتوح.'); });
  lo.slice().reverse().filter(x => x.p < 50).slice(0, 2).forEach(x => { weak.push('الأسئلة ' + x.n + ' (' + x.p + '%)'); tips.push(x.k === 'hard' ? 'ركّزي/ركّز على فهم الأفكار الأعمق قبل السرعة، وجرّبي/جرّب الأسئلة الصعبة تدريباً.' : 'أخطاء في الأسئلة ' + x.n + ' تعني ثغرة في الأساسيات؛ يلزم مراجعة المفاهيم الأولية.'); });
  const sp = d.avg_secs;
  let speed = '—';
  if (sp != null) { speed = sp < 6 ? 'سريع' : sp <= 11 ? 'متوازن' : 'بطيء';
    if (sp < 6 && acc < 60) { weak.push('التسرّع: إجابات سريعة (' + sp + ' ث) بدقة منخفضة'); tips.push('خذي/خذ ثانية إضافية لقراءة الخيارات كلها قبل الاختيار.'); }
    else if (sp < 6) strong.push('سرعة عالية (' + sp + ' ث للسؤال)');
    if (sp > 11) { weak.push('بطء في الإجابة (' + sp + ' ث)'); tips.push('زيادة التدريب المفتوح لرفع سرعة الاسترجاع.'); } }
  if (d.timeouts && pc(d.timeouts, d.total) >= 10) { weak.push('انتهى الوقت دون إجابة ' + d.timeouts + ' مرة'); tips.push('إذا لم تعرفي/تعرف الإجابة فاختاري/اختر الأقرب بدل ترك الوقت ينتهي.'); }
  const days = d.by_day; let trend = '';
  if (days.length >= 4) { const h = Math.floor(days.length / 2), a = days.slice(0, h), b = days.slice(h), f = z => pc(z.reduce((m, x) => m + x.c, 0), z.reduce((m, x) => m + x.t, 0)), da = f(b) - f(a);
    trend = da >= 8 ? 'في تحسّن ملحوظ (+' + da + '%)' : da <= -8 ? 'تراجع في الفترة الأخيرة (' + da + '%)' : 'مستوى مستقر';
    if (da >= 8) strong.push('تطوّر مستمر في المستوى'); if (da <= -8) { weak.push('تراجع في الأداء مؤخراً'); tips.push('تواصلي/تواصل مع الطالب/ـة لمعرفة سبب التراجع وتشجيعه/ا.'); } }
  if (days.length && days.length < 3) tips.push('المشاركة اليومية المنتظمة تعطي صورة أدق عن المستوى.');
  if (!tips.length) tips.push(acc >= 85 ? 'مستوى ممتاز: أتيحي/أتح له/ا أسئلة أصعب أو دوراً قيادياً في الفريق.' : 'استمرّي/استمر على التدريب اليومي للحفاظ على المستوى.');
  const bar = (n, p, t) => '<div class="rp-bar"><span>' + esc(n) + '</span><i><b style="width:' + p + '%"></b></i><em>' + p + '% · ' + t + '</em></div>';
  const list = (arr, empty) => arr.length ? '<ul class="rp-ul">' + arr.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '<div class="sub">' + empty + '</div>';
  const text = 'تقرير المستوى: ' + name + '\nالتقدير: ' + grade[0] + ' · الدقة ' + acc + '%\nنقاط القوة: ' + (strong.join('، ') || '—') + '\nنقاط الضعف: ' + (weak.join('، ') || '—') + '\nالتوصيات: ' + tips.join(' | ');
  return { text, html: `<div class="rp"><div class="rp-head"><b>${esc(name)}</b><span style="background:${grade[1]}">${grade[0]}</span></div>
    <div class="stats"><div class="stat"><b>${acc}%</b><span>الدقة</span></div><div class="stat"><b>${d.total}</b><span>أسئلة</span></div><div class="stat"><b>${sp != null ? sp + ' ث' : '—'}</b><span>${speed}</span></div></div>
    ${trend ? '<div class="sub center">' + trend + '</div>' : ''}
    <h4>حسب الصعوبة</h4>${lv.map(x => bar(x.n, x.p, x.c + '/' + x.t)).join('')}
    ${sb.length > 1 || (sb[0] && sb[0].n !== 'عام') ? '<h4>حسب المادة</h4>' + sb.map(x => bar(x.n, x.p, x.c + '/' + x.t)).join('') : ''}
    <h4>نقاط القوة</h4>${list(strong, 'لم تتضح بعد (تحتاج 3 أسئلة على الأقل في كل محور).')}
    <h4>نقاط الضعف</h4>${list(weak, 'لا توجد نقاط ضعف واضحة.')}
    <h4>توصيات</h4>${list(tips, '')}
    ${d.wrong.length ? '<h4>آخر الأسئلة الخاطئة</h4>' + d.wrong.map(w => '<div class="rp-w"><b>' + esc(w.q) + '</b><div>✅ ' + esc(w.right) + '</div><div>❌ ' + (w.chosen ? esc(w.chosen) : 'لم يجب') + '</div></div>').join('') : ''}
    <button class="btn" data-act="r-report-copy">نسخ ملخص التقرير</button></div>` };
}
ACTS['r-report'] = async t => {
  const { id, name } = t.dataset; toast('جاري إعداد التقرير…');
  try {
    const d = await rpc('teacher_student_report', { p_student: id });
    if (!d || !d.total) { toast('لا توجد جولات رسمية منتهية لهذا الطالب بعد'); return; }
    const r = buildReport(name, d); RS.lastText = r.text; closeModals(); modal(r.html);
  } catch (e) { toast('تعذّر تحميل التقرير'); }
};
ACTS['r-report-copy'] = () => { navigator.clipboard && navigator.clipboard.writeText(RS.lastText || ''); toast('تم النسخ'); };
ACTS['t-res-export'] = () => {
  const rows = [['الصف', 'الاسم', 'رقم الطالب', 'النقاط', 'الجولات', 'الإجابات الصحيحة', 'الدقة %', 'لعب اليوم']].concat(RS.rows.slice().sort((x, y) => y.pts - x.pts).map(r => [r.cls, r.name, r.student_no, r.pts, r.rounds, r.correct, r.rounds ? Math.round(r.correct * 100 / (r.rounds * 4)) : '', r.played_today ? 'نعم' : 'لا']));
  const ws = XLSX.utils.aoa_to_sheet(rows), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'النتائج'); XLSX.writeFile(wb, 'نتائج-' + RS.name.replace(/[\\/:*?"<>|]/g, '-') + '.xlsx');
};

/* ---- settings ---- */
async function tSettings(){
  const url = location.origin + location.pathname;
  const ini = (T.name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join(' ');
  const row = (act, icon, color, label, val, extra) => `<button class="set-row" data-act="${act}" ${extra || ''}><span class="set-ic" style="background:${color}">${ic(icon)}</span><span class="grow">${label}</span>${val ? `<span class="set-val">${val}</span>` : ''}<span class="set-chev">${ic('back')}</span></button>`;
  const grp = (title, rows, foot) => `${title ? `<div class="set-h">${title}</div>` : ''}<div class="set-grp">${rows.join('')}</div>${foot ? `<div class="set-f">${foot}</div>` : ''}`;
  view('الإعدادات',
    `<button class="set-profile" data-act="st-profile">${avatarHtml('big-av')}<div class="grow"><b>${esc(T.name)}</b><div class="sub" dir="ltr" style="text-align:right">${esc(T.user.email || '')}</div></div><span class="set-chev">${ic('back')}</span></button>` +
    grp('المسابقة', [row('go-qset', 'help', '#C8102E', 'إعدادات الأسئلة', 'المناهج والصعوبة'), row('go-rset', 'chart', '#FF9500', 'إعدادات النتائج', 'النقاط والترتيب')]) +
    grp('المظهر', [row('st-mode', 'moon', '#5856D6', 'الوضع', `<span id="mode-val">${MODE_AR[LS.get('mc_mode') || 'auto']}</span>`)]) +
    grp('الطلبة', [
      row('st-share-students', 'send', '#1FA971', 'رابط دخول الطلبة', 'مشاركة'),
      row('copy', 'layers', '#F26B1D', 'نسخ الرابط', '', `data-v="${esc(url)}"`)
    ], 'يدخل الطلبة من هذا الرابط بالرمز المكون من 6 خانات.') +
    grp('التطبيق', [
      row('st-install', 'download', '#2F80ED', 'تثبيت التطبيق على الشاشة الرئيسية'),
      row('st-invite', 'star', '#F5B72B', 'دعوة زميل/ـة لاستخدام التطبيق')
    ]) +
    grp('البيانات', [
      row('st-export', 'download', '#14A89B', 'تصدير كل بياناتي Excel'),
      row('st-privacy', 'check', '#9B51E0', 'الخصوصية')
    ]) +
    grp('', [`<button class="set-row danger-row" data-act="st-logout-ask"><span class="grow center">تسجيل الخروج</span></button>`]) +
    `<div class="set-f center">تحدّي الدقيقة · الإصدار 0.2</div>`, 'settings');
}
function avatarHtml(cls){
  const ini = (T.name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join(' ');
  return T.avatar ? `<img class="avatar av-img ${cls || ''}" src="${T.avatar}" alt="">` : `<div class="avatar ${cls || ''}">${esc(ini)}</div>`;
}
function profileSheet(){
  modal(`<div class="prof">
    <button class="prof-av" data-act="av-menu" aria-label="تغيير الصورة">${avatarHtml('prof-big')}<span class="prof-cam">${ic('edit')}</span></button>
    <button class="link" data-act="av-menu">${T.avatar ? 'تعديل الصورة' : 'إضافة صورة'}</button>
    <form class="col" data-form="t-save-name" style="width:100%"><div class="set-grp">
      <label class="set-row"><span class="grow" style="flex:0 0 auto;color:var(--muted)">الاسم</span><input class="prof-in" name="name" value="${esc(T.name)}" required maxlength="60"></label>
      <div class="set-row"><span style="color:var(--muted)">البريد</span><span class="grow" dir="ltr" style="text-align:left;color:var(--muted)">${esc(T.user.email || '')}</span></div></div>
      <button class="btn" type="submit">حفظ الاسم</button></form>
    <div style="width:100%"><div class="set-h" style="margin:0 0 6px">المظهر</div>${modeSeg()}</div>
    <div class="set-grp" style="width:100%"><button class="set-row" data-act="st-pass"><span class="set-ic" style="background:#8E8E93">${ic('gear')}</span><span class="grow">تغيير كلمة المرور</span><span class="set-chev">${ic('back')}</span></button></div>
    <input type="file" id="av-file" accept="image/*" class="hide" data-change="av-chosen"></div>`);
}
ACTS['st-profile'] = () => profileSheet();
ACTS['go-qset'] = () => go('#/t/qset');
ACTS['go-rset'] = () => go('#/t/rset');
/* ---- results settings ---- */
const RSET = {
  scoring: { t: 'حساب النقاط', o: [['speed', 'الصحة والسرعة', 'الصحيح 500 نقطة + حتى 500 حسب السرعة'], ['correct', 'الصحة فقط', 'كل إجابة صحيحة 1000 نقطة'], ['penalty', 'مع خصم للخطأ', 'مثل الأول، والخاطئة تخصم 250 نقطة (لا تقل الجولة عن صفر)']] },
  tiebreak: { t: 'عند تساوي النقاط', o: [['accuracy', 'الأعلى دقة', 'نسبة الإجابات الصحيحة'], ['speed', 'الأسرع', 'متوسط زمن الإجابات الصحيحة'], ['rounds', 'الأكثر مشاركة', 'عدد الجولات الرسمية']] },
  lb: { t: 'لوحة المتصدرين للطلبة', o: [['all', 'كاملة', 'يرى الطالب ترتيب كل الصف'], ['top10', 'أفضل 10', 'مع ترتيبه هو إن لم يكن منهم'], ['hidden', 'مخفية حتى النهاية', 'يرى ترتيبه فقط حتى تنتهي المسابقة']] },
  names: { t: 'أسماء الطلبة في اللوحة', o: [['full', 'الاسم كاملاً', ''], ['first', 'الاسم الأول فقط', 'لخصوصية أكبر']] }
};
function tRSet(){
  const st = T.settings || {};
  const def = { scoring: 'speed', tiebreak: 'accuracy', lb: 'all', names: 'full' };
  view('إعدادات النتائج', Object.keys(RSET).map(k => { const cur = st[k] || def[k];
    return `<div class="set-h">${RSET[k].t}</div><div class="set-grp">${RSET[k].o.map(o => `<button class="set-row radio" data-act="rs-pick" data-k="${k}" data-v="${o[0]}"><span class="grow rl-txt"><b>${o[1]}</b>${o[2] ? `<small>${o[2]}</small>` : ''}</span><span class="tick ${cur === o[0] ? 'on' : ''}">${ic('check')}</span></button>`).join('')}</div>`; }).join('') +
    `<div class="set-f">تُطبَّق على كل مسابقاتك. تغيير طريقة الحساب يؤثر على الجولات القادمة فقط، أما الترتيب والعرض فيتحدثان فوراً.</div>`, 'settings', '', '#/t/settings');
}
ACTS['rs-pick'] = async t => {
  await saveSettings({ [t.dataset.k]: t.dataset.v });
  t.parentElement.querySelectorAll('.tick').forEach(x => x.classList.toggle('on', x.parentElement === t));
};
/* ---- question settings: curricula library + defaults ---- */
const STAGE_AR = { primary: 'ابتدائي', middle: 'متوسط', secondary: 'ثانوي', university: 'جامعة' };
const STAGE_GRADES = { primary: [1, 2, 3, 4, 5], middle: [6, 7, 8, 9], secondary: [10, 11, 12], university: [1, 2, 3, 4] };
const DIFF = [['beginner', 'مبتدئ', '2 سهل · 2 متوسط'], ['normal', 'متوسط', '1 سهل · 2 متوسط · 1 صعب'], ['advanced', 'متقدم', '2 متوسط · 2 صعب']];
const CU = { list: [], loaded: false, form: null };
async function loadCurricula(force){
  if (CU.loaded && !force) return CU.list;
  const { data, error } = await sb.from('curricula').select('*').order('stage').order('grade').order('subject');
  if (error) throw error; CU.list = data; CU.loaded = true; return data;
}
function cuName(c){ if (!c) return ''; const g = c.grade ? (c.stage === 'university' ? ' · السنة ' + c.grade : ' · الصف ' + c.grade) : ''; return `${c.subject} · ${STAGE_AR[c.stage]}${g}${c.title ? ' · ' + c.title : ''}`; }
function cuOptions(sel, emptyLabel){ return `<option value="">${emptyLabel || 'بدون منهج محدد'}</option>` + CU.list.map(c => `<option value="${c.id}" ${sel === c.id ? 'selected' : ''}>${esc(cuName(c))}${c.owner_id ? '' : ' (عام)'}</option>`).join(''); }
async function tQSet(){
  await loadCurricula(true);
  const st = T.settings || {}, diff = st.difficulty || 'normal', qt = st.qtypes || ['curriculum', 'general', 'quick'];
  const counts = {}; (await sb.from('questions').select('curriculum_id').not('curriculum_id', 'is', null)).data?.forEach(q => counts[q.curriculum_id] = (counts[q.curriculum_id] || 0) + 1);
  const mine = CU.list.filter(c => c.owner_id), glob = CU.list.filter(c => !c.owner_id);
  const cuRow = c => `<button class="set-row" data-act="cu-open" data-id="${c.id}"><span class="set-ic" style="background:${SUBJ_COLOR(c.subject)}">${esc(c.subject.slice(0, 1))}</span><span class="grow rl-txt"><b>${esc(c.subject)}${c.title ? ' · ' + esc(c.title) : ''}</b><small>${STAGE_AR[c.stage]}${c.grade ? ' · ' + (c.stage === 'university' ? 'السنة ' : 'الصف ') + c.grade : ''} · ${counts[c.id] || 0} سؤال</small></span><span class="set-chev">${ic('back')}</span></button>`;
  view('إعدادات الأسئلة',
    `<div class="set-h">مناهجي</div><div class="set-grp">${mine.map(cuRow).join('')}<button class="set-row" data-act="cu-add"><span class="set-ic" style="background:#34C759">${ic('plus')}</span><span class="grow" style="color:var(--primary)">إضافة منهج</span></button></div>
     <div class="set-f">المنهج = مادة + مرحلة + صف. اربط أسئلة المنهج به ثم اختره عند إنشاء المسابقة.</div>` +
    (glob.length ? `<div class="set-h">المناهج العامة</div><div class="set-grp">${glob.map(cuRow).join('')}</div>` : '') +
    `<div class="set-h">مستوى الصعوبة الافتراضي</div><div class="picks">${DIFF.map(d => `<button class="pick wide ${diff === d[0] ? 'on' : ''}" data-act="qs-diff" data-v="${d[0]}"><span class="pick-ic">${ic(d[0] === 'beginner' ? 'star' : d[0] === 'normal' ? 'chart' : 'trophy')}</span><div><b>${d[1]}</b><small>${d[2]}</small></div></button>`).join('')}</div>
     <div class="set-h">أنواع الأسئلة الافتراضية</div><div class="picks picks2">${QTYPES.map(q => `<button class="pick ${qt.includes(q[0]) ? 'on' : ''}" data-act="qs-type" data-v="${q[0]}"><span class="pick-ic">${ic(q[3])}</span><b>${q[1]}</b></button>`).join('')}</div>
     <div class="set-grp"><div class="set-row"><span class="set-ic" style="background:#FF9500">${ic('clock')}</span><span class="grow">وقت السؤال</span><span class="set-val">15 ثانية</span></div><div class="set-row"><span class="set-ic" style="background:#5856D6">${ic('help')}</span><span class="grow">أسئلة الجولة</span><span class="set-val">4 أسئلة</span></div></div>
     <div class="set-f">تُطبَّق هذه القيم تلقائياً على المسابقات الجديدة، ويمكن تغييرها لكل مسابقة.</div>`, 'settings', '', '#/t/settings');
}
function SUBJ_COLOR(s){ const m = { 'اللغة العربية': '#C8102E', 'الرياضيات': '#2F80ED', 'العلوم': '#14A89B', 'التربية الإسلامية': '#1FA971', 'اللغة الإنجليزية': '#9B51E0', 'الاجتماعيات': '#F2994A', 'الحاسوب': '#5856D6' }; return m[s] || '#8E8E93'; }
async function saveSettings(patch){
  T.settings = Object.assign({}, T.settings || {}, patch);
  const { error } = await sb.from('teachers').update({ settings: T.settings }).eq('id', T.user.id);
  if (error) toast(errMsg(error));
}
ACTS['qs-diff'] = async t => { await saveSettings({ difficulty: t.dataset.v }); t.parentElement.querySelectorAll('.pick').forEach(b => b.classList.toggle('on', b === t)); };
ACTS['qs-type'] = async t => {
  let v = ((T.settings || {}).qtypes || ['curriculum', 'general', 'quick']).slice(); const k = t.dataset.v;
  if (v.includes(k)) { if (v.length === 1) return toast('اختر نوعاً واحداً على الأقل'); v = v.filter(x => x !== k); } else v.push(k);
  await saveSettings({ qtypes: v }); t.classList.toggle('on');
};
function cuForm(c){
  c = c || { subject: '', stage: 'primary', grade: null, title: '' }; CU.form = { stage: c.stage, grade: c.grade, subject: c.subject };
  const subjOpts = SUBJECTS.filter(s => s !== 'عام' && s !== 'أخرى');
  const custom = c.subject && !subjOpts.includes(c.subject);
  modal(`<h3>${c.id ? 'تعديل منهج' : 'منهج جديد'}</h3><form class="col" data-form="cu-save" data-id="${c.id || ''}">
    <div class="field"><label>المادة</label><div class="lv-chips wrap">${subjOpts.map(s => `<button type="button" class="${c.subject === s ? 'on' : ''}" data-act="cu-subj" data-v="${s}">${s}</button>`).join('')}<button type="button" class="${custom ? 'on' : ''}" data-act="cu-subj" data-v="">أخرى…</button></div>
      <input class="input ${custom ? '' : 'hide'}" id="cu-custom" name="custom" placeholder="اسم المادة" value="${custom ? esc(c.subject) : ''}" maxlength="60"></div>
    <div class="field"><label>المرحلة</label><div class="tabs" id="cu-stage">${Object.keys(STAGE_AR).map(k => `<button type="button" class="${c.stage === k ? 'on' : ''}" data-act="cu-stage" data-v="${k}">${STAGE_AR[k]}</button>`).join('')}</div></div>
    <div class="field"><label>${c.stage === 'university' ? 'السنة' : 'الصف'}</label><div class="lv-chips wrap" id="cu-grade">${cuGrades(c.stage, c.grade)}</div></div>
    <div class="field"><label for="cu-t">الوحدة أو العنوان (اختياري)</label><input class="input" id="cu-t" name="title" value="${esc(c.title || '')}" maxlength="80" placeholder="مثال: الوحدة الثالثة - الكسور"></div>
    <button class="btn" type="submit">حفظ</button>
    ${c.id ? `<button type="button" class="btn danger" data-act="cu-del" data-id="${c.id}">${ic('trash')} حذف المنهج</button>` : ''}</form>`);
}
function cuGrades(stage, sel){ return `<button type="button" class="${!sel ? 'on' : ''}" data-act="cu-grade" data-v="">الكل</button>` + STAGE_GRADES[stage].map(g => `<button type="button" class="${sel === g ? 'on' : ''}" data-act="cu-grade" data-v="${g}">${g}</button>`).join(''); }
ACTS['cu-add'] = () => cuForm();
ACTS['cu-open'] = t => { const c = CU.list.find(x => x.id === t.dataset.id); if (!c) return; if (!c.owner_id) return toast('هذا منهج عام، يمكنك استخدامه في المسابقات'); cuForm(c); };
ACTS['cu-subj'] = t => { CU.form.subject = t.dataset.v; t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); document.getElementById('cu-custom').classList.toggle('hide', t.dataset.v !== ''); if (!t.dataset.v) document.getElementById('cu-custom').focus(); };
ACTS['cu-stage'] = t => { CU.form.stage = t.dataset.v; CU.form.grade = null; t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); document.getElementById('cu-grade').innerHTML = cuGrades(t.dataset.v, null); };
ACTS['cu-grade'] = t => { CU.form.grade = t.dataset.v ? Number(t.dataset.v) : null; t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); };
ACTS['cu-save'] = async f => {
  const subject = (CU.form.subject || f.custom.value || '').trim();
  if (!subject) return toast('اختر المادة');
  const row = { subject, stage: CU.form.stage, grade: CU.form.grade, title: f.title.value.trim() || null };
  const r = f.dataset.id ? await sb.from('curricula').update(row).eq('id', f.dataset.id) : await sb.from('curricula').insert(Object.assign({ owner_id: T.user.id }, row));
  if (r.error) return toast(errMsg(r.error));
  closeModals(); toast('تم الحفظ'); await tQSet();
};
ACTS['cu-del'] = async t => {
  if (!confirm('حذف المنهج؟ تبقى أسئلته موجودة لكن بدون منهج.')) return;
  const { error } = await sb.from('curricula').delete().eq('id', t.dataset.id);
  if (error) return toast(errMsg(error)); closeModals(); await tQSet();
};
ACTS['st-mode'] = () => modal(`<h3>المظهر</h3>${modeSeg()}<p class="sub" style="margin-top:10px">«تلقائي» يتبع إعداد جهازك.</p>`);
ACTS['av-menu'] = () => {
  if (!T.avatar) return document.getElementById('av-file').click();
  sheet('صورة الملف', [
    { act: 'av-pick', icon: 'upload', label: 'اختيار صورة جديدة' },
    { act: 'av-recrop', icon: 'edit', label: 'قص الصورة الحالية' },
    null,
    { act: 'av-del', icon: 'trash', label: 'حذف الصورة', danger: true }
  ]);
};
ACTS['av-pick'] = () => { closeModals(); profileSheet(); setTimeout(() => document.getElementById('av-file').click(), 50); };
ACTS['av-recrop'] = () => { closeModals(); cropper(T.avatar); };
ACTS['av-del'] = async () => {
  if (!confirm('حذف صورة الملف؟')) return;
  const { error } = await sb.from('teachers').update({ avatar_url: null }).eq('id', T.user.id);
  if (error) return toast(errMsg(error));
  T.avatar = ''; closeModals(); tSettings(); toast('تم حذف الصورة');
};
ACTS['av-chosen'] = t => {
  const f = t.files && t.files[0]; if (!f) return;
  const r = new FileReader(); r.onload = () => { closeModals(); cropper(r.result); }; r.readAsDataURL(f);
};
/* circular cropper: drag to move, pinch or slider to zoom */
function cropper(src){
  const V = 280;
  modal(`<h3 class="center">قص الصورة</h3><div class="crop-wrap"><div class="crop" id="crop"><img id="crop-img" src="${src}" alt="" draggable="false"></div></div>
    <input type="range" id="crop-z" min="1" max="4" step="0.01" value="1" class="crop-z" aria-label="تكبير">
    <div class="row"><button class="btn soft" data-act="close-modal">إلغاء</button><button class="btn" data-act="crop-save">حفظ</button></div>`);
  const img = document.getElementById('crop-img'), box = document.getElementById('crop'), zr = document.getElementById('crop-z');
  const C = { s: 1, base: 1, x: 0, y: 0 };
  const apply = () => {
    const w = img.naturalWidth * C.base * C.s, h = img.naturalHeight * C.base * C.s;
    C.x = Math.min(0, Math.max(V - w, C.x)); C.y = Math.min(0, Math.max(V - h, C.y));
    img.style.width = w + 'px'; img.style.height = h + 'px'; img.style.transform = `translate(${C.x}px,${C.y}px)`;
  };
  const zoomTo = (s, cx, cy) => {
    const old = C.s; s = Math.max(1, Math.min(4, s));
    C.x = cx - (cx - C.x) * s / old; C.y = cy - (cy - C.y) * s / old; C.s = s; zr.value = s; apply();
  };
  img.onload = () => {
    C.base = V / Math.min(img.naturalWidth, img.naturalHeight);
    C.x = (V - img.naturalWidth * C.base) / 2; C.y = (V - img.naturalHeight * C.base) / 2; apply();
  };
  if (img.complete) img.onload();
  let p = null;
  box.addEventListener('touchstart', e => {
    e.stopPropagation();
    const t = e.touches;
    p = t.length === 2 ? { d: Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY), s: C.s } : { x: t[0].clientX, y: t[0].clientY, ox: C.x, oy: C.y };
  }, { passive: true });
  box.addEventListener('touchmove', e => {
    e.preventDefault(); e.stopPropagation(); if (!p) return;
    const t = e.touches, r = box.getBoundingClientRect();
    if (t.length === 2 && p.d) { const d = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); zoomTo(p.s * d / p.d, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top); }
    else if (t.length === 1 && p.x !== undefined) { C.x = p.ox + t[0].clientX - p.x; C.y = p.oy + t[0].clientY - p.y; apply(); }
  }, { passive: false });
  box.addEventListener('touchend', e => { e.stopPropagation(); p = null; });
  let md = null;
  box.addEventListener('mousedown', e => { md = { x: e.clientX, y: e.clientY, ox: C.x, oy: C.y }; });
  window.addEventListener('mousemove', e => { if (!md) return; C.x = md.ox + e.clientX - md.x; C.y = md.oy + e.clientY - md.y; apply(); });
  window.addEventListener('mouseup', () => { md = null; });
  zr.addEventListener('input', () => zoomTo(Number(zr.value), V / 2, V / 2));
  CROP.get = () => {
    const out = document.createElement('canvas'); out.width = out.height = 320;
    const k = 320 / V, g = out.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 320, 320);
    g.drawImage(img, C.x * k, C.y * k, img.naturalWidth * C.base * C.s * k, img.naturalHeight * C.base * C.s * k);
    return out.toDataURL('image/jpeg', .85);
  };
}
const CROP = { get: null };
ACTS['crop-save'] = async t => {
  if (!CROP.get) return; t.disabled = true;
  const url = CROP.get();
  const { error } = await sb.from('teachers').update({ avatar_url: url }).eq('id', T.user.id);
  if (error) { t.disabled = false; return toast(errMsg(error)); }
  T.avatar = url; closeModals(); tSettings(); toast('تم حفظ الصورة');
};
ACTS['st-name'] = () => modal(`<h3>الاسم</h3><form class="col" data-form="t-save-name"><div class="field"><input class="input" name="name" value="${esc(T.name)}" required maxlength="60"></div><p class="sub">يظهر هذا الاسم للطلبة في صفحة التسجيل الذاتي.</p><button class="btn" type="submit">حفظ</button></form>`);
ACTS['st-pass'] = () => modal(`<h3>تغيير كلمة المرور</h3><form class="col" data-form="st-pass-save"><div class="field"><label for="np">كلمة المرور الجديدة</label><input class="input" id="np" name="p1" type="password" minlength="6" required dir="ltr"></div>
  <div class="field"><label for="np2">تأكيد كلمة المرور</label><input class="input" id="np2" name="p2" type="password" minlength="6" required dir="ltr"></div><button class="btn" type="submit">حفظ</button></form>`);
ACTS['st-pass-save'] = async f => {
  if (f.p1.value !== f.p2.value) return toast('كلمتا المرور غير متطابقتين');
  const { error } = await sb.auth.updateUser({ password: f.p1.value });
  if (error) return toast(errMsg(error)); closeModals(); toast('تم تغيير كلمة المرور');
};
async function shareOrCopy(title, text, url){
  if (navigator.share) { try { await navigator.share({ title, text, url }); return; } catch(e){ if (e && e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(text + '\n' + url); toast('تم نسخ الرابط'); } catch(e){ prompt('انسخ الرابط:', url); }
}
ACTS['st-share-students'] = () => shareOrCopy('تحدّي الدقيقة', 'ادخل إلى «تحدّي الدقيقة» برمزك:', location.origin + location.pathname);
ACTS['st-invite'] = () => shareOrCopy('تحدّي الدقيقة', 'جرّب «تحدّي الدقيقة»: مسابقات صفية ممتعة لطلابك، 4 أسئلة في 60 ثانية. سجّل مجاناً:', location.origin + location.pathname + '#/t');
ACTS['st-install'] = () => modal(`<h3>تثبيت التطبيق</h3><div class="col"><div class="set-grp">
  <div class="set-row"><span class="set-ic" style="background:#2F80ED">1</span><span class="grow">افتح الرابط في Safari</span></div>
  <div class="set-row"><span class="set-ic" style="background:#2F80ED">2</span><span class="grow">اضغط زر المشاركة ⬆︎</span></div>
  <div class="set-row"><span class="set-ic" style="background:#2F80ED">3</span><span class="grow">اختر «إضافة إلى الشاشة الرئيسية»</span></div></div>
  <p class="sub">في أندرويد: من قائمة Chrome ⋮ اختر «تثبيت التطبيق». يتحدّث التطبيق تلقائياً بعد التثبيت.</p></div>`);
ACTS['st-privacy'] = () => modal(`<h3>الخصوصية</h3><div class="col"><p>نحفظ فقط اسم الطالب ورقمه ونتائجه داخل المسابقة ورقم الهاتف إن أضفته لإرسال الرمز عبر واتساب. لا نجمع بريداً أو صوراً للطلبة.</p><p>يمكنك حذف أي طالب أو صف في أي وقت، فتُحذف بياناته ونتائجه نهائياً.</p><p class="sub">بيانات كل معلم/ـة لا يراها غيره.</p></div>`);
ACTS['st-export'] = async () => {
  toast('جارٍ تجهيز الملف...');
  try {
    const [c, s] = await Promise.all([sb.from('classes').select('*').order('created_at'), sb.from('students').select('*').order('created_at')]);
    if (c.error) throw c.error; if (s.error) throw s.error;
    const res = await Promise.all(c.data.map(x => rpc('teacher_class_results', { p_class: x.id }).catch(() => [])));
    const byId = {}; c.data.forEach(x => byId[x.id] = x.name);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['الصف', 'الاسم', 'رقم الطالب', 'الرمز']].concat(s.data.map(x => [byId[x.class_id], x.name, x.student_no, x.code]))), 'الطلبة');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['الصف', 'الاسم', 'رقم الطالب', 'النقاط', 'الجولات', 'الصحيحة']].concat(res.flatMap((r, i) => r.map(x => [c.data[i].name, x.name, x.student_no, x.pts, x.rounds, x.correct]))), 'النتائج'));
    XLSX.writeFile(wb, 'بيانات-تحدي-الدقيقة.xlsx');
  } catch(e){ toast(errMsg(e)); }
};
ACTS['st-logout-ask'] = () => { if (confirm('تسجيل الخروج من الحساب؟')) ACTS['t-logout'](); };
ACTS['t-save-name'] = async f => {
  const name = f.name.value.trim();
  const { error } = await sb.from('teachers').update({ display_name: name }).eq('id', T.user.id);
  if (error) return toast(errMsg(error));
  T.name = name; closeModals(); toast('تم الحفظ'); if (location.hash.indexOf('settings') > 0) tSettings();
};

/* ======================================================
   ROUTER
   ====================================================== */
async function studentJoin(code){
  document.body.classList.remove('wide');
  $app.innerHTML = '<div class="spin"></div>';
  try {
    const info = await rpc('class_join_info', { p_join: code });
    setTheme(info.style || 'mid');
    $app.innerHTML = `<div class="hero">${LOGO}<h1>تحدّي الدقيقة</h1><p>التسجيل في صف <b>${esc(info.class)}</b>${info.teacher ? ' · ' + esc(info.teacher) : ''}</p></div>
      <div class="pad"><form class="card col" data-form="j-submit" data-code="${esc(code)}">
      <div class="field"><label for="j-n">الاسم الثلاثي</label><input class="input" id="j-n" name="name" required minlength="3" maxlength="60"></div>
      <div class="field"><label for="j-no">رقم الطالب</label><input class="input" id="j-no" name="no" required inputmode="numeric" dir="ltr"></div>
      <div id="jerr"></div><button class="btn" type="submit">تسجيل</button></form></div>`;
  } catch(e){
    $app.innerHTML = `<div class="hero">${LOGO}<h1>تحدّي الدقيقة</h1></div><div class="pad"><div class="err">${esc(errMsg(e))}</div><button class="btn" data-act="go-student" style="margin-top:14px">دخول بالرمز</button></div>`;
  }
}
ACTS['j-submit'] = async f => {
  const box = document.getElementById('jerr'); box.innerHTML = '';
  const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
  try {
    const r = await rpc('student_self_register', { p_join: f.dataset.code, p_name: f.name.value, p_no: f.no.value });
    const l = await rpc('student_login', { p_code: r.code });
    S.token = l.token; LS.set('mc_token', l.token); LS.set('mc_code', r.code);
    $app.innerHTML = `<div class="hero">${LOGO}<h1>تم التسجيل!</h1><p>هذا رمزك للدخول، احفظه أو صوّره</p></div>
      <div class="pad col"><div class="card center"><div class="big-code" dir="ltr">${esc(r.code)}</div><button class="btn sm soft" data-act="copy" data-v="${esc(r.code)}">نسخ الرمز</button></div>
      <button class="btn" data-act="j-go">ابدأ</button></div>`;
  } catch(e){ box.innerHTML = '<div class="err">' + esc(errMsg(e)) + '</div>'; btn.disabled = false; }
};
ACTS['j-go'] = () => { location.hash = '#/s'; };

function studentRoute(){
  document.body.classList.remove('wide');
  if (S.token) loadHome(); else studentLogin();
}
function route(){
  setTimeout(applyMode, 0);
  const h = location.hash || '#/s';
  if (h.indexOf('#/t') === 0) teacherRoute();
  else if (h.indexOf('#/j/') === 0) studentJoin(decodeURIComponent(h.slice(4)));
  else if (h.indexOf('#/c/') === 0) { S.preCode = decodeURIComponent(h.slice(4)); LS.del('mc_token'); S.token = null; history.replaceState(null, '', '#/s'); studentLogin(); }
  else studentRoute();
}
window.addEventListener('hashchange', () => { saveUI(); route(); });
/* remember where the user was, restore on reopen */
function saveUI(){
  try {
    if (location.hash.indexOf('#/j/') !== 0) LS.set('mc_last', location.hash || '#/s');
    LS.set('mc_ui', JSON.stringify({ open: [...CL.open], tab: CL.tab, sort: RS.sort, qf: T.qf, ctab: T.classTab, y: scrollY, h: location.hash }));
  } catch(e){}
}
function loadUI(){
  try {
    const u = JSON.parse(LS.get('mc_ui') || '{}');
    if (u.open) u.open.forEach(id => CL.open.add(id));
    if (u.tab) CL.tab = u.tab; if (u.sort) RS.sort = u.sort; if (u.qf) Object.assign(T.qf, u.qf);
    return u;
  } catch(e){ return {}; }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) saveUI(); });
window.addEventListener('pagehide', saveUI);
let _sc = false;
window.addEventListener('scroll', () => { const s = scrollY > 24; if (s !== _sc) { _sc = s; document.body.classList.toggle('scrolled', s); } }, { passive: true });
const _ui = loadUI();
if (!location.hash || location.hash === '#' || location.hash === '#/s') {
  const last = LS.get('mc_last');
  if (last && last !== '#/s' && last.indexOf('#/j/') !== 0) history.replaceState(null, '', last);
}
if (_ui.y && _ui.h === location.hash) {
  const y = _ui.y, t0 = Date.now();
  const tryScroll = () => { if (document.body.scrollHeight > y + innerHeight / 2 || Date.now() - t0 > 3000) scrollTo(0, y); else setTimeout(tryScroll, 120); };
  setTimeout(tryScroll, 300);
}
/* app feel: block pinch / double-tap zoom */
['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => document.addEventListener(ev, e => e.preventDefault(), { passive: false }));
document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
let lastTap = 0;
document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastTap < 300 && !e.target.closest('input,textarea,select')) e.preventDefault(); lastTap = n; }, { passive: false });
/* swipe from the right edge to go back; swipe rows to reveal delete */
function goBack(){
  if (document.querySelector('.modal-back')) return closeModals();
  const b = document.querySelector('.back-btn'); if (b) return b.click();
  if (document.querySelector('[data-act="w-prev"]')) return ACTS['w-prev']();
  if (document.querySelector('[data-act="s-quit"]')) return;
  if (location.hash.indexOf('#/t/') === 0 && !/^#\/t\/(home)?$/.test(location.hash)) return history.back();
}
let G = null;
document.addEventListener('touchstart', e => {
  if (e.touches.length !== 1) { G = null; return; }
  if (e.target.closest('.t-nav, .crop')) { G = null; return; }
  const t = e.touches[0], row = e.target.closest('.sw-main');
  const rw = row ? row.parentElement : null;
  G = { x: t.clientX, y: t.clientY, row, edge: !row && t.clientX > innerWidth - 28, dx: 0, lock: null,
    base: row ? (Number(row.dataset.off) || 0) : 0,
    wr: rw ? rw.querySelector('.sw-r').offsetWidth + 22 : 0, wl: rw ? rw.querySelector('.sw-l').offsetWidth + 22 : 0 };
  if (!row) document.querySelectorAll('.sw-main.open').forEach(r => { if (!e.target.closest('.sw-act')) { r.classList.remove('open'); r.style.transform = ''; r.dataset.off = 0; } });
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!G) return;
  const t = e.touches[0], dx = t.clientX - G.x, dy = t.clientY - G.y;
  if (G.lock === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) G.lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
  if (G.lock !== 'x') return;
  G.dx = dx;
  if (G.row) {
    e.preventDefault();
    const v = Math.max(-G.wr - 20, Math.min(G.wl + 20, G.base + dx));
    G.row.style.transition = 'none'; G.row.style.transform = `translateX(${v}px)`;
  } else if (G.edge) {
    e.preventDefault();
    document.body.style.transform = `translateX(${Math.min(0, dx) * 0.35}px)`;
  }
}, { passive: false });
document.addEventListener('touchend', () => {
  if (!G) return;
  if (G.row) {
    const r = G.row; r.style.transition = '';
    const v = G.base + G.dx, off = v < -45 ? -G.wr : v > 45 ? G.wl : 0;
    document.querySelectorAll('.sw-main.open').forEach(x => { if (x !== r) { x.classList.remove('open'); x.style.transform = ''; x.dataset.off = 0; } });
    r.classList.toggle('open', off !== 0); r.dataset.off = off; r.style.transform = off ? `translateX(${off}px)` : '';
  } else if (G.edge) {
    document.body.style.transition = 'transform .2s'; document.body.style.transform = '';
    setTimeout(() => { document.body.style.transition = ''; }, 220);
    if (G.dx < -70) goBack();
  }
  G = null;
});
sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT' && location.hash.indexOf('#/t') === 0) teacherAuth(); });
route();
if ('serviceWorker' in navigator) {
  let reloaded = false, had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!had) { had = true; return; }
    if (reloaded) return;
    if (document.getElementById('app').querySelector('.play, .qbox, .timer')) return;
    reloaded = true; location.reload();
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
    const chk = () => reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (!document.hidden) chk(); });
    setInterval(chk, 30 * 60 * 1000);
  }).catch(() => {});
}
})();
