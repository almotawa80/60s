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
  wrong_position: 'تعذّر تسجيل الإجابة، أعد المحاولة'
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
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
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
  star:'<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3z"/>'
};
const ic = n => '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + ICON[n] + '</svg>';
const LOGO = '<div class="logo" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><circle cx="24" cy="27" r="16"/><path d="M19 5h10M24 5v6"/></svg><b>60</b></div>';
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
  setTimeout(() => inp.focus(), 50);
}
ACTS['go-teacher'] = () => { location.hash = '#/t'; };
ACTS['go-student'] = () => { location.hash = '#/s'; };
ACTS['s-login'] = async () => {
  const inp = document.getElementById('code');
  const box = document.getElementById('lerr');
  if (!inp || inp.value.length < 6) { box.innerHTML = '<div class="err">اكتب الرمز كاملاً (6 خانات)</div>'; return; }
  box.innerHTML = '';
  try {
    const r = await rpc('student_login', { p_code: inp.value });
    S.token = r.token; LS.set('mc_token', r.token);
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
    '<div class="s-head"><div class="avatar" aria-hidden="true">' + esc((h.student.name || '?').trim().charAt(0)) + '</div>' +
    '<div class="who"><b>' + esc(h.student.name) + '</b><span class="sub">' + esc(h.class.name) + '</span></div>' +
    '<button class="icon-btn" data-act="s-logout" aria-label="تسجيل الخروج">' + ic('logout') + '</button></div>' +
    '<div class="quick"><button data-act="s-profile">' + ic('user') + '<span>ملفي</span></button>' +
    '<button data-act="s-badges">' + ic('star') + '<span>شاراتي</span></button>' +
    '<button data-act="s-leaders">' + ic('trophy') + '<span>المتصدرون</span></button></div>' +
    '<div class="comp">' + body + main +
    '<button class="btn ghost" data-act="s-start" data-kind="practice">تدريب بلا نقاط</button></div>';
}
ACTS['s-badges'] = () => toast('الشارات قريباً');
ACTS['s-profile'] = () => {
  const h = S.home;
  modal('<h3>ملفي</h3><div class="rows card">' +
    '<div class="r"><span>الاسم</span><b>' + esc(h.student.name) + '</b></div>' +
    '<div class="r"><span>الصف</span><b>' + esc(h.class.name) + '</b></div>' +
    '<div class="r"><span>مجموع النقاط</span><b>' + h.total_points + '</b></div>' +
    '<div class="r"><span>الترتيب في الصف</span><b>' + (h.rank || '-') + ' من ' + h.class.size + '</b></div></div>' +
    '<button class="btn soft" style="margin-top:14px" data-act="close-modal">إغلاق</button>');
};
ACTS['s-leaders'] = async () => {
  const m = modal('<h3>المتصدرون</h3><div class="spin"></div>');
  try {
    const rows = await rpc('class_leaderboard', { p_token: S.token });
    m.querySelector('.modal').innerHTML = '<h3>المتصدرون في ' + esc(S.home.class.name) + '</h3><div class="lb">' +
      rows.map(r => '<div class="r' + (r.is_me ? ' me' : '') + '"><span class="no">' + r.rank + '</span><span class="nm">' + esc(r.name) + '</span><b>' + r.points + '</b></div>').join('') +
      '</div><button class="btn soft" style="margin-top:14px" data-act="close-modal">إغلاق</button>';
  } catch(e){ m.remove(); toast(errMsg(e)); }
};

/* ---- play ---- */
function stopTimer(){ if (S.timer) { cancelAnimationFrame(S.timer.raf); S.timer = null; } }
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
function showQuestion(st){
  stopTimer();
  S.cur = st; S.locked = false;
  const q = st.question;
  let dots = '';
  for (let i = 1; i <= st.total; i++) dots += '<span class="dot' + (i < st.position ? ' done' : i === st.position ? ' cur' : '') + '"></span>';
  $app.innerHTML =
    '<div class="play"><div class="play-top"><span class="chip">' + (st.kind === 'practice' ? 'تدريب' : 'جولة رسمية') + '</span>' +
    '<b>السؤال ' + st.position + ' من ' + st.total + '</b>' +
    '<button class="icon-btn" data-act="s-quit" aria-label="خروج">' + ic('x') + '</button></div>' +
    '<div class="dots">' + dots + '</div>' +
    '<div class="timer"><svg viewBox="0 0 116 116" aria-hidden="true"><circle class="bg" cx="58" cy="58" r="48"/><circle class="fg" id="tfg" cx="58" cy="58" r="48" stroke-dasharray="301.6" stroke-dashoffset="0"/></svg>' +
    '<div class="num"><span id="tnum">' + Math.ceil(st.seconds_left) + '</span><small>ثانية</small></div></div>' +
    '<div class="qbox">' + esc(q.body) + '</div><div class="pts-pop" id="pop"></div>' +
    '<div class="opts">' + q.options.map((o, i) => '<button class="opt" data-act="s-answer" data-idx="' + i + '"><span class="letter">' + LETTERS[i] + '</span><span class="txt">' + esc(o) + '</span></button>').join('') + '</div></div>';
  runTimer(st.seconds_left);
}
function runTimer(secs){
  const total = 15, end = performance.now() + secs * 1000;
  const num = document.getElementById('tnum'), fg = document.getElementById('tfg');
  const state = { raf: 0 };
  S.timer = state;
  const tick = () => {
    if (S.timer !== state) return;
    const left = Math.max(0, (end - performance.now()) / 1000);
    num.textContent = Math.ceil(left);
    fg.style.strokeDashoffset = String(301.6 * (1 - left / total));
    fg.style.stroke = left <= 5 ? '#E5484D' : '';
    if (left <= 0) { stopTimer(); if (!S.locked) { S.locked = true; submit(null); } return; }
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
function showResult(sm){
  stopTimer();
  let rankRow = '';
  if (sm && sm.kind === 'official' && sm.rank_after) {
    const d = sm.rank_before - sm.rank_after;
    const delta = d > 0 ? '<span class="up">▲ صعدت ' + d + '</span>' : d < 0 ? '<span class="down">▼ نزلت ' + (-d) + '</span>' : '<span class="muted">بلا تغيير</span>';
    rankRow = '<div class="r"><span>ترتيبي الجديد</span><b>' + sm.rank_after + ' ' + delta + '</b></div>';
  }
  $app.innerHTML =
    '<div class="result"><div class="medal">' + ic('trophy') + '</div>' +
    '<h2 class="center" style="font-size:26px">' + (sm && sm.kind === 'practice' ? 'نتيجة التدريب' : 'نتيجة الجولة') + '</h2>' +
    '<div class="center"><div class="big">' + (sm ? sm.total_points : 0) + '</div><div class="muted">مجموع النقاط</div></div>' +
    '<div class="rows card"><div class="r"><span>الإجابات الصحيحة</span><b>' + (sm ? sm.correct_count : 0) + ' من 4</b></div>' + rankRow + '</div>' +
    (sm && sm.kind === 'official' ? '<button class="btn accent" data-act="s-leaders">' + ic('trophy') + ' عرض الترتيب</button>' : '') +
    '<button class="btn" data-act="s-reload">العودة للرئيسية</button></div>';
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
const STYLE_AR = { kids: 'الصغار (ابتدائي)', mid: 'متوسط / ثانوي', uni: 'الجامعة' };
const STYLE_SW = { kids: 'linear-gradient(135deg,#BFE6FF,#FFD66B)', mid: 'linear-gradient(135deg,#0F766E,#F5A623)', uni: 'linear-gradient(135deg,#F6F7F8,#C9D3D2)' };
const LOGO_S = '<div class="logo" style="width:40px;height:40px;border-radius:13px" aria-hidden="true"><svg style="width:32px;height:32px" viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><circle cx="24" cy="27" r="16"/><path d="M19 5h10M24 5v6"/></svg><b style="font-size:11px">60</b></div>';
const NAV = [['home', 'الرئيسية', 'home'], ['classes', 'الصفوف', 'layers'], ['questions', 'الأسئلة', 'help'], ['results', 'النتائج', 'chart'], ['settings', 'الإعدادات', 'gear']];

function shell(title, body, active, top){
  return `<div class="t-top"><div class="brand">${LOGO_S}<span class="t-title">${esc(title)}</span></div>${top || ''}</div>` +
    `<div class="t-body">${body}</div>` +
    `<nav class="t-nav" aria-label="القائمة">${NAV.map(n => `<a href="#/t/${n[0]}" class="${n[0] === active ? 'on' : ''}">${ic(n[2])}<span>${n[1]}</span></a>`).join('')}</nav>`;
}
function view(title, body, active, top){ $app.innerHTML = shell(title, body, active, top); window.scrollTo(0, 0); }
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
      const r = await sb.from('teachers').select('display_name').eq('id', T.user.id).maybeSingle();
      T.name = (r.data && r.data.display_name) || (T.user.email || '').split('@')[0];
    }
    if (page === 'classes') await tClasses();
    else if (page === 'class') await tClass(parts[1]);
    else if (page === 'questions') await tQuestions();
    else if (page === 'results') await tResults(parts[1]);
    else if (page === 'settings') await tSettings();
    else await tHome();
  } catch(e){
    view('', `<div class="err">${esc(errMsg(e))}</div><button class="btn" data-act="t-retry">إعادة المحاولة</button>`, page);
  }
}
ACTS['t-retry'] = () => teacherRoute();

/* ---- home ---- */
async function tHome(){
  const [cl, cp] = await Promise.all([
    sb.from('classes').select('*').order('created_at'),
    sb.from('competitions').select('*').eq('status', 'active').order('created_at', { ascending: false })
  ]);
  if (cl.error) throw cl.error;
  if (cp.error) throw cp.error;
  const classes = cl.data, compBy = {};
  cp.data.forEach(c => { if (!compBy[c.class_id]) compBy[c.class_id] = c; });
  const results = await Promise.all(classes.map(c => rpc('teacher_class_results', { p_class: c.id }).catch(() => [])));
  const total = results.reduce((a, r) => a + r.length, 0);
  let alerts = '', cards = '';
  classes.forEach((c, i) => {
    const comp = compBy[c.id], ph = phaseOf(comp), rs = results[i];
    const played = rs.filter(r => r.played_today).length;
    const pct = rs.length ? Math.round(played * 100 / rs.length) : 0;
    if (ph === 'points' && rs.length - played > 0) alerts += `<a class="alert" href="#/t/class/${c.id}" style="text-decoration:none;color:inherit">${ic('clock')}<div><b>${rs.length - played} لم يلعبوا اليوم</b><div class="sub">${esc(c.name)}</div></div></a>`;
    cards += `<a class="class-card" href="#/t/class/${c.id}">
      <div class="ring" style="background:conic-gradient(var(--accent) ${pct * 3.6}deg,var(--soft) 0)"><span style="background:#fff;border-radius:50%;width:42px;height:42px;display:flex;align-items:center;justify-content:center">${ph === 'points' ? pct + '%' : '—'}</span></div>
      <div class="grow"><b style="font-size:17px">${esc(c.name)}</b><div class="sub">${rs.length} من الطلبة</div><span class="chip ${ph === 'points' ? 'good' : ''}" style="margin-top:4px">${PHASE_AR[ph]}${comp ? ' · حتى ' + esc(fmtDate(comp.end_date)) : ''}</span></div>${ic('back')}</a>`;
  });
  const body = `<div class="kpis"><div class="kpi"><b>${total}</b><span>إجمالي الطلبة</span></div><div class="kpi"><b>${classes.length}</b><span>عدد الصفوف</span></div><div class="kpi"><b>${Object.keys(compBy).length}</b><span>المسابقات النشطة</span></div></div>
    ${alerts}
    <div class="row between"><h3>صفوفي</h3><a class="btn sm" href="#/t/classes" style="text-decoration:none">${ic('plus')} إضافة صف</a></div>
    ${cards || '<div class="card center col"><p>ابدأ بإضافة أول صف ثم ارفع أسماء الطلبة.</p><a class="btn" href="#/t/classes" style="text-decoration:none">إضافة صف</a></div>'}`;
  view('مرحباً، ' + (T.name || ''), body, 'home');
}

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
async function tClasses(){
  const { data, error } = await sb.from('classes').select('*, students(count)').order('created_at');
  if (error) throw error;
  const body = `<div class="row" style="flex-wrap:wrap"><button class="btn" data-act="t-add-class" style="flex:1">${ic('plus')} إضافة صف</button><button class="btn soft" data-act="t-multi-up" style="flex:1">${ic('upload')} رفع صفوف من Excel</button><button class="btn sm soft" data-act="t-multi-sample">نموذج</button><input type="file" id="mxl" accept=".xlsx,.xls,.csv" class="hide" data-change="t-multi-chosen"></div>` +
    (data.map(c => `<a class="class-card" href="#/t/class/${c.id}"><div class="grow"><b style="font-size:18px">${esc(c.name)}</b><div class="sub">${(c.students && c.students[0] ? c.students[0].count : 0)} من الطلبة · نمط ${esc(STYLE_AR[c.style])}</div></div>${ic('back')}</a>`).join('') ||
    '<div class="card center muted">لا توجد صفوف بعد.</div>');
  view('الصفوف', body, 'classes');
}
ACTS['t-add-class'] = () => {
  modal(`<h3>إضافة صف</h3><form class="col" data-form="t-save-class">
    <div class="field"><label for="c-name">اسم الصف</label><input class="input" id="c-name" name="name" required maxlength="60" placeholder="مثال: السادس / ب"></div>
    <div class="field"><label>نمط الواجهة للطلبة</label>${styleCards('mid')}<input type="hidden" name="style" value="mid"></div>
    <button class="btn" type="submit">حفظ</button></form>`);
};
ACTS['t-save-class'] = async f => {
  const { data, error } = await sb.from('classes').insert({ teacher_id: T.user.id, name: f.name.value.trim(), style: f.style.value }).select().single();
  if (error) return toast(errMsg(error));
  closeModals();
  go('#/t/class/' + data.id);
};

/* ---- multi-class upload ---- */
ACTS['t-multi-up'] = () => document.getElementById('mxl').click();
ACTS['t-multi-sample'] = () => {
  const ws = XLSX.utils.aoa_to_sheet([['الاسم', 'رقم الطالب', 'الصف'], ['سارة العتيبي', '1001', 'السادس / أ'], ['ليان الزامل', '1002', 'السادس / أ'], ['نور الحربي', '2001', 'السادس / ب']]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'الطلبة'); XLSX.writeFile(wb, 'نموذج-الصفوف.xlsx');
};
function parseMulti(rows){
  if (!rows.length) return [];
  const head = rows[0].map(x => String(x).trim().toLowerCase());
  let ni = head.findIndex(h => /اسم|name/.test(h)), ri = head.findIndex(h => /رقم|number|\bid\b|\bno\b/.test(h)), ci = head.findIndex(h => /صف|فصل|شعبة|class/.test(h)), start = 1;
  if (ni < 0 || ci < 0) { ni = 0; ri = 1; ci = 2; start = 0; }
  return rows.slice(start).map(r => ({ name: String(r[ni] == null ? '' : r[ni]).trim(), student_no: ri >= 0 ? String(r[ri] == null ? '' : r[ri]).trim() : '', cls: String(r[ci] == null ? '' : r[ci]).trim() })).filter(x => x.name && x.cls);
}
ACTS['t-multi-chosen'] = async t => {
  const file = t.files && t.files[0];
  if (!file) return;
  try {
    const list = parseMulti(await readRows(file));
    t.value = '';
    if (!list.length) return toast('لم أجد بيانات. تأكد من الأعمدة: الاسم، رقم الطالب، الصف');
    const g = {};
    list.forEach(x => (g[x.cls] = g[x.cls] || []).push({ name: x.name, student_no: x.student_no }));
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

/* ---- class page ---- */
async function tClass(id){
  if (!id) return go('#/t/classes');
  const [c, s, cp] = await Promise.all([
    sb.from('classes').select('*').eq('id', id).single(),
    sb.from('students').select('*').eq('class_id', id).order('created_at'),
    sb.from('competitions').select('*').eq('class_id', id).eq('status', 'active').order('created_at', { ascending: false }).limit(1)
  ]);
  if (c.error) throw c.error;
  if (s.error) throw s.error;
  CK.cls = c.data; CK.students = s.data; CK.comp = (cp.data && cp.data[0]) || null;
  renderClass();
}
function renderClass(){
  const c = CK.cls;
  const tabs = `<div class="tabs"><button class="${T.classTab === 'students' ? 'on' : ''}" data-act="t-ctab" data-tab="students">الطلبة (${CK.students.length})</button><button class="${T.classTab === 'comp' ? 'on' : ''}" data-act="t-ctab" data-tab="comp">إعدادات المسابقة</button></div>`;
  const top = `<a class="icon-btn" href="#/t/classes" aria-label="رجوع">${ic('back')}</a>`;
  view(c.name, tabs + (T.classTab === 'students' ? studentsTab() : compTab()), 'classes', top);
}
ACTS['t-ctab'] = t => { T.classTab = t.dataset.tab; renderClass(); };
function studentsTab(){
  const rows = CK.students.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.name)}</td><td>${esc(s.student_no)}</td><td class="code">${esc(s.code)}</td>
    <td><button class="icon-btn" style="width:36px;height:36px" data-act="t-regen" data-id="${s.id}" aria-label="رمز جديد">${ic('refresh')}</button>
    <button class="icon-btn" style="width:36px;height:36px" data-act="t-del-student" data-id="${s.id}" aria-label="حذف">${ic('trash')}</button></td></tr>`).join('');
  return `<div class="row" style="flex-wrap:wrap">
    <button class="btn sm" data-act="t-upload">${ic('upload')} رفع من Excel</button>
    <button class="btn sm soft" data-act="t-add-one">${ic('plus')} إضافة طالب/ـة</button>
    <button class="btn sm soft" data-act="t-export-codes">${ic('download')} تصدير الرموز</button>
    <button class="btn sm soft" data-act="t-print-codes">${ic('print')} طباعة الرموز</button>
    <button class="btn sm soft" data-act="t-sample-students">نموذج Excel</button>
    <input type="file" id="xl" accept=".xlsx,.xls,.csv" class="hide" data-change="t-xl-chosen"></div>
    ${CK.students.length ? `<div class="tbl-wrap"><table><thead><tr><th>#</th><th>الاسم</th><th>رقم الطالب</th><th>الرمز</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` :
    '<div class="card center muted">لا يوجد طلبة بعد. ارفع ملف Excel بعمودين: الاسم، ورقم الطالب.</div>'}`;
}
ACTS['t-upload'] = () => document.getElementById('xl').click();
ACTS['t-sample-students'] = () => {
  const ws = XLSX.utils.aoa_to_sheet([['الاسم', 'رقم الطالب'], ['سارة العتيبي', '1001'], ['ليان الزامل', '1002']]);
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
  let ni = head.findIndex(h => /اسم|name/.test(h)), ri = head.findIndex(h => /رقم|number|\bid\b|\bno\b/.test(h)), start = 0;
  if (ni >= 0) { start = 1; if (ri < 0) ri = head.length > 1 ? (ni === 0 ? 1 : 0) : -1; }
  else {
    const numeric = i => rows.every(r => /^\d+$/.test(String(r[i] == null ? '' : r[i]).trim()));
    if (rows[0].length > 1 && numeric(0)) { ri = 0; ni = 1; } else { ni = 0; ri = rows[0].length > 1 ? 1 : -1; }
  }
  return rows.slice(start).map(r => ({ name: String(r[ni] == null ? '' : r[ni]).trim(), student_no: ri >= 0 ? String(r[ri] == null ? '' : r[ri]).trim() : '' })).filter(x => x.name);
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
    await tClass(CK.cls.id);
  } catch(e){ closeModals(); toast(errMsg(e)); }
};
ACTS['t-add-one'] = () => {
  modal(`<h3>إضافة طالب/ـة</h3><form class="col" data-form="t-save-one"><div class="field"><label for="o-n">الاسم</label><input class="input" id="o-n" name="name" required></div>
    <div class="field"><label for="o-no">رقم الطالب</label><input class="input" id="o-no" name="no" dir="ltr"></div><button class="btn" type="submit">إضافة</button></form>`);
};
ACTS['t-save-one'] = async f => {
  try {
    const r = await rpc('add_students', { p_class: CK.cls.id, p_rows: [{ name: f.name.value, student_no: f.no.value }] });
    closeModals();
    toast(r.added.length ? 'تمت الإضافة' : 'الرقم موجود مسبقاً في الصف');
    await tClass(CK.cls.id);
  } catch(e){ toast(errMsg(e)); }
};
ACTS['t-regen'] = async t => {
  if (!confirm('إنشاء رمز جديد؟ سيتوقف الرمز القديم عن العمل.')) return;
  try { await rpc('regenerate_code', { p_student: t.dataset.id }); await tClass(CK.cls.id); toast('تم إنشاء رمز جديد'); } catch(e){ toast(errMsg(e)); }
};
ACTS['t-del-student'] = async t => {
  if (!confirm('حذف هذا الطالب/ـة ونتائجه نهائياً؟')) return;
  const { error } = await sb.from('students').delete().eq('id', t.dataset.id);
  if (error) return toast(errMsg(error));
  await tClass(CK.cls.id);
};
ACTS['t-export-codes'] = () => {
  const rows = [['الاسم', 'رقم الطالب', 'الرمز']].concat(CK.students.map(s => [s.name, s.student_no, s.code]));
  const ws = XLSX.utils.aoa_to_sheet(rows), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الرموز');
  XLSX.writeFile(wb, 'رموز-' + CK.cls.name.replace(/[\\/:*?"<>|]/g, '-') + '.xlsx');
};
ACTS['t-print-codes'] = () => {
  const url = location.origin + location.pathname;
  document.getElementById('print-area').innerHTML = `<h2 style="text-align:center;margin:0 0 10px">${esc(CK.cls.name)} — رموز الدخول إلى تحدّي الدقيقة</h2><p style="text-align:center;direction:ltr;margin:0 0 12px">${esc(url)}</p>` +
    `<div class="pcards">${CK.students.map(s => `<div class="pcard"><b>${esc(s.name)}</b><div class="pc">${esc(s.code)}</div><small>${esc(s.student_no)}</small></div>`).join('')}</div>`;
  window.print();
};

/* ---- competition tab ---- */
function compTab(){
  const t = todayKW();
  const v = CK.comp || { title: 'مسابقة تحدّي الدقيقة', start_date: t, points_end_date: addDays(t, 4), end_date: addDays(t, 10), group_size: 6, qualifiers: 8, round_window_hours: 24 };
  const opt = (val, lab) => `<option value="${val}" ${Number(v.round_window_hours) === val ? 'selected' : ''}>${lab}</option>`;
  return `<form class="card col" data-form="t-save-comp">
    <div class="field"><label for="k-title">عنوان المسابقة</label><input class="input" id="k-title" name="title" value="${esc(v.title)}" required></div>
    <div class="grid2"><div class="field"><label for="k-s">بداية جمع النقاط</label><input class="input" type="date" id="k-s" name="start_date" value="${v.start_date}" required></div>
    <div class="field"><label for="k-p">نهاية جمع النقاط</label><input class="input" type="date" id="k-p" name="points_end_date" value="${v.points_end_date}" required></div></div>
    <div class="field"><label for="k-e">نهاية المسابقة (بعد التصفيات)</label><input class="input" type="date" id="k-e" name="end_date" value="${v.end_date}" required></div>
    <div class="grid2"><div class="field"><label for="k-g">حجم المجموعة</label><input class="input" type="number" min="2" max="40" id="k-g" name="group_size" value="${v.group_size}"></div>
    <div class="field"><label for="k-q">عدد المتأهلين للتصفيات</label><input class="input" type="number" min="2" max="64" id="k-q" name="qualifiers" value="${v.qualifiers}"></div></div>
    <div class="field"><label for="k-w">مدة نافذة كل دور في التصفيات</label><select class="input" id="k-w" name="round_window_hours">${opt(12, '12 ساعة')}${opt(24, 'يوم (24 ساعة)')}${opt(48, 'يومان')}${opt(72, '3 أيام')}</select></div>
    <p class="sub">الجولة الرسمية: 4 أسئلة × 15 ثانية، محاولة واحدة يومياً. أما التدريب فمفتوح بلا نقاط.</p>
    <div class="row"><button type="button" class="btn soft" data-act="t-suggest">اقتراح التواريخ</button><button class="btn" type="submit">${CK.comp ? 'حفظ التعديلات' : 'إنشاء المسابقة'}</button></div></form>
    <div class="card col"><b>نمط واجهة الطلبة</b>${styleCards(CK.cls.style)}<p class="sub">يظهر النمط المختار لجميع طلبة هذا الصف.</p></div>`;
}
ACTS['t-suggest'] = () => {
  const f = document.querySelector('[data-form="t-save-comp"]');
  const start = f.start_date.value || todayKW();
  const q = Math.max(2, Number(f.qualifiers.value) || 8), rounds = Math.ceil(Math.log2(q));
  const days = Math.ceil((Number(f.round_window_hours.value) || 24) / 24);
  const pe = addDays(start, 4);
  f.start_date.value = start; f.points_end_date.value = pe; f.end_date.value = addDays(pe, rounds * days);
  toast('تم اقتراح التواريخ: 5 أيام نقاط ثم ' + rounds + ' أدوار');
};
ACTS['t-save-comp'] = async f => {
  const p = {
    title: f.title.value.trim() || 'مسابقة تحدّي الدقيقة', start_date: f.start_date.value, points_end_date: f.points_end_date.value, end_date: f.end_date.value,
    group_size: Number(f.group_size.value), qualifiers: Number(f.qualifiers.value), round_window_hours: Number(f.round_window_hours.value)
  };
  if (!(p.start_date <= p.points_end_date && p.points_end_date <= p.end_date)) return toast('تحقق من ترتيب التواريخ');
  const r = CK.comp ? await sb.from('competitions').update(p).eq('id', CK.comp.id) : await sb.from('competitions').insert(Object.assign({ class_id: CK.cls.id }, p));
  if (r.error) return toast(errMsg(r.error));
  toast('تم الحفظ');
  await tClass(CK.cls.id);
};
// style picker on class page saves immediately
const _pick = ACTS['pick-style'];
ACTS['pick-style'] = async t => {
  _pick(t);
  if (t.closest('[data-form="t-save-class"]') || !CK.cls || !t.closest('.card') || document.querySelector('[data-form="t-save-class"]')) return;
  const { error } = await sb.from('classes').update({ style: t.dataset.style }).eq('id', CK.cls.id);
  if (error) return toast(errMsg(error));
  CK.cls.style = t.dataset.style; toast('تم تغيير النمط');
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
  const f = T.qf;
  const list = QS.list.filter(q => (f.status === 'all' || q.status === f.status) && (f.level === 'all' || q.level === f.level) && (f.type === 'all' || q.qtype === f.type));
  const drafts = QS.list.filter(q => q.status === 'draft').length;
  const sel = (name, opts) => `<select data-change="t-qf" data-k="${name}" aria-label="${name}">${opts.map(o => `<option value="${o[0]}" ${f[name] === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`;
  const items = list.map(q => `<div class="q-item"><div class="row between" style="align-items:flex-start"><b>${esc(q.body)}</b></div>
    <div class="opts-s">${q.options.map((o, i) => `<span class="${i === q.correct_index ? 'c' : ''}">${LETTERS[i]}. ${esc(o)}${i === q.correct_index ? ' ✓' : ''}</span>`).join('')}</div>
    <div class="row" style="flex-wrap:wrap"><span class="chip">${TYPE_AR[q.qtype] || q.qtype}</span><span class="chip">${LEVEL_AR[q.level]}</span><span class="chip ${q.status === 'approved' ? 'good' : q.status === 'draft' ? 'warn' : 'bad'}">${STATUS_AR[q.status]}</span><span class="grow"></span>
    ${q.status !== 'approved' ? `<button class="btn sm" data-act="t-q-status" data-id="${q.id}" data-s="approved">اعتماد</button>` : ''}
    ${q.status !== 'rejected' ? `<button class="btn sm soft" data-act="t-q-status" data-id="${q.id}" data-s="rejected">رفض</button>` : ''}
    <button class="icon-btn" style="width:36px;height:36px" data-act="t-q-edit" data-id="${q.id}" aria-label="تعديل">${ic('edit')}</button>
    <button class="icon-btn" style="width:36px;height:36px" data-act="t-q-del" data-id="${q.id}" aria-label="حذف">${ic('trash')}</button></div></div>`).join('');
  const body = `<div class="card"><b>بنك الأسئلة</b><div class="sub">أسئلتي: ${QS.list.length} (${drafts} بانتظار المراجعة) · البنك العام المعتمد: ${QS.globalCount}</div></div>
    <div class="row" style="flex-wrap:wrap"><button class="btn sm" data-act="t-q-add">${ic('plus')} إضافة سؤال</button>
    <button class="btn sm soft" data-act="t-q-import">${ic('upload')} استيراد Excel</button>
    <button class="btn sm soft" data-act="t-q-template">نموذج Excel</button>
    <button class="btn sm soft" data-act="t-q-export">${ic('download')} تنزيل أسئلتي</button>
    ${drafts ? `<button class="btn sm accent" data-act="t-q-approve-all">اعتماد كل المسودات (${drafts})</button>` : ''}
    <input type="file" id="qxl" accept=".xlsx,.xls,.csv" class="hide" data-change="t-q-chosen"></div>
    <div class="filters">${sel('status', [['all', 'كل الحالات'], ['draft', 'مسودة'], ['approved', 'معتمد'], ['rejected', 'مرفوض']])}${sel('level', [['all', 'كل المستويات'], ['easy', 'سهل'], ['medium', 'متوسط'], ['hard', 'صعب']])}${sel('type', [['all', 'كل الأنواع'], ['curriculum', 'منهج'], ['general', 'عام'], ['quick', 'سرعة بديهة']])}</div>
    ${items || '<div class="card center muted">لا توجد أسئلة مطابقة. أضف سؤالاً أو استورد ملف Excel.</div>'}
    <p class="sub">الأسئلة تُستخدم في المسابقة بعد اعتمادها فقط. وتُسحب لكل طالب/ـة بعدد: 1 سهل، 2 متوسط، 1 صعب.</p>`;
  view('الأسئلة', body, 'questions');
}
ACTS['t-qf'] = t => { T.qf[t.dataset.k] = t.value; renderQuestions(); };
function qForm(q){
  q = q || { qtype: 'curriculum', level: 'medium', body: '', options: ['', '', '', ''], correct_index: 0 };
  const o = (v, cur, map) => Object.keys(map).filter(k => k !== 'memory').map(k => `<option value="${k}" ${cur === k ? 'selected' : ''}>${map[k]}</option>`).join('');
  return `<h3>${q.id ? 'تعديل سؤال' : 'إضافة سؤال'}</h3><form class="col" data-form="t-save-q"><input type="hidden" name="id" value="${q.id || ''}">
    <div class="grid2"><div class="field"><label for="q-t">النوع</label><select class="input" id="q-t" name="qtype">${o(0, q.qtype, TYPE_AR)}</select></div>
    <div class="field"><label for="q-l">المستوى</label><select class="input" id="q-l" name="level">${o(0, q.level, LEVEL_AR)}</select></div></div>
    <div class="field"><label for="q-b">نص السؤال</label><textarea class="input" id="q-b" name="body" rows="2" required maxlength="300">${esc(q.body)}</textarea></div>
    ${[0, 1, 2, 3].map(i => `<div class="field"><label for="q-o${i}">الخيار ${LETTERS[i]}</label><input class="input" id="q-o${i}" name="o${i}" value="${esc(q.options[i])}" required maxlength="100"></div>`).join('')}
    <div class="field"><label for="q-c">الإجابة الصحيحة</label><select class="input" id="q-c" name="correct">${LETTERS.map((l, i) => `<option value="${i}" ${q.correct_index === i ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <button class="btn" type="submit">حفظ</button></form>`;
}
ACTS['t-q-add'] = () => modal(qForm());
ACTS['t-q-edit'] = t => modal(qForm(QS.list.find(x => x.id === t.dataset.id)));
ACTS['t-save-q'] = async f => {
  const row = { qtype: f.qtype.value, level: f.level.value, body: f.body.value.trim(), options: [0, 1, 2, 3].map(i => f['o' + i].value.trim()), correct_index: Number(f.correct.value) };
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
  await tQuestions();
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
ACTS['t-q-import'] = () => document.getElementById('qxl').click();
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
async function tResults(classId){
  const { data: classes, error } = await sb.from('classes').select('id,name').order('created_at');
  if (error) throw error;
  if (!classes.length) return view('النتائج', '<div class="card center muted">أضف صفاً أولاً لتظهر النتائج.</div>', 'results');
  const id = classId || classes[0].id;
  const rows = await rpc('teacher_class_results', { p_class: id });
  CK.results = rows; CK.resultsName = (classes.find(c => c.id === id) || {}).name || '';
  let rank = 0, prev = null;
  const tr = rows.map((r, i) => {
    if (r.pts !== prev) { rank = i + 1; prev = r.pts; }
    const acc = r.rounds ? Math.round(r.correct * 100 / (r.rounds * 4)) + '%' : '—';
    return `<tr><td>${rank}</td><td>${esc(r.name)}</td><td>${esc(r.student_no)}</td><td><b>${r.pts}</b></td><td>${r.rounds}</td><td>${acc}</td><td>${r.played_today ? '✓' : '—'}</td></tr>`;
  }).join('');
  const body = `<div class="filters"><select data-change="t-res-class" aria-label="الصف">${classes.map(c => `<option value="${c.id}" ${c.id === id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    <button class="btn sm soft" data-act="t-res-export">${ic('download')} تنزيل Excel</button></div>
    ${rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>الترتيب</th><th>الاسم</th><th>رقم الطالب</th><th>النقاط</th><th>الجولات</th><th>الدقة</th><th>لعب اليوم</th></tr></thead><tbody>${tr}</tbody></table></div>` : '<div class="card center muted">لا يوجد طلبة في هذا الصف.</div>'}`;
  view('النتائج', body, 'results');
}
ACTS['t-res-class'] = t => go('#/t/results/' + t.value);
ACTS['t-res-export'] = () => {
  const rows = [['الاسم', 'رقم الطالب', 'النقاط', 'الجولات', 'الإجابات الصحيحة']].concat((CK.results || []).map(r => [r.name, r.student_no, r.pts, r.rounds, r.correct]));
  const ws = XLSX.utils.aoa_to_sheet(rows), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'النتائج'); XLSX.writeFile(wb, 'نتائج-' + (CK.resultsName || '').replace(/[\\/:*?"<>|]/g, '-') + '.xlsx');
};

/* ---- settings ---- */
async function tSettings(){
  view('الإعدادات', `<form class="card col" data-form="t-save-name"><div class="field"><label for="s-n">الاسم</label><input class="input" id="s-n" name="name" value="${esc(T.name)}" required></div>
    <div class="field"><label>البريد الإلكتروني</label><div dir="ltr" style="text-align:right">${esc(T.user.email || '')}</div></div><button class="btn" type="submit">حفظ الاسم</button></form>
    <div class="card col"><b>الخصوصية</b><p class="sub">نحفظ فقط اسم الطالب ورقمه ونتائجه داخل المسابقة، ولا نجمع بريداً أو صوراً للطلبة. يمكنك حذف أي طالب أو صف في أي وقت، فتُحذف بياناته نهائياً.</p></div>
    <div class="card col"><b>حول التطبيق</b><p class="sub">تحدّي الدقيقة — الإصدار التجريبي 0.1</p></div>
    <button class="btn danger" data-act="t-logout">${ic('logout')} تسجيل الخروج</button>`, 'settings');
}
ACTS['t-save-name'] = async f => {
  const name = f.name.value.trim();
  const { error } = await sb.from('teachers').update({ display_name: name }).eq('id', T.user.id);
  if (error) return toast(errMsg(error));
  T.name = name; toast('تم الحفظ');
};

/* ======================================================
   ROUTER
   ====================================================== */
function studentRoute(){
  document.body.classList.remove('wide');
  if (S.token) loadHome(); else studentLogin();
}
function route(){
  const h = location.hash || '#/s';
  if (h.indexOf('#/t') === 0) teacherRoute(); else studentRoute();
}
window.addEventListener('hashchange', route);
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
