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
  bad_code: 'رمز المشاركة غير صحيح',
  duplicate_question: 'هذا السؤال موجود في البنك، لا يمكن تكراره',
  no_questions: 'لم يتم تحديد أسئلة',
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
  class_full: 'الصف ممتلئ',
  no_mistakes: 'لا توجد أخطاء لتتدرّب عليها، أحسنت! 👏',
  no_match_today: 'لا توجد لك مواجهة اليوم في التصفيات'
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
  image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  share:'<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
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
/* in-app dialogs (replace the browser's confirm / prompt) */
function ask(msg, o){
  o = o || {};
  return new Promise(res => {
    const danger = o.danger != null ? o.danger : /حذف|إنهاء|الخروج/.test(msg);
    const el = document.createElement('div'); el.className = 'dlg-back';
    el.innerHTML = `<div class="dlg" role="alertdialog" aria-modal="true"><div class="dlg-b">${o.title ? `<b>${esc(o.title)}</b>` : ''}<p>${esc(msg).replace(/\n/g, '<br>')}</p>` +
      (o.input != null ? `<input class="dlg-in" ${o.readonly ? 'readonly' : ''} dir="${o.dir || 'auto'}" value="${esc(o.input)}" placeholder="${esc(o.placeholder || '')}">` : '') +
      `</div><div class="dlg-a">${o.alert ? '' : `<button type="button" data-r="0">${esc(o.cancel || 'إلغاء')}</button>`}<button type="button" data-r="1" class="${danger ? 'dng' : 'pri'}">${esc(o.ok || (danger ? (/حذف/.test(msg) ? 'حذف' : 'متابعة') : 'متابعة'))}</button></div></div>`;
    const inp = el.querySelector('.dlg-in'), ok = el.querySelector('[data-r="1"]');
    const need = o.require;
    if (need) { ok.disabled = true; inp.addEventListener('input', () => { ok.disabled = inp.value.trim() !== need; }); }
    const done = v => { el.classList.add('out'); setTimeout(() => el.remove(), 160); res(v); };
    el.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) done(b.dataset.r === '1' ? (inp && !o.readonly ? inp.value : true) : (inp && !o.readonly ? null : false)); else if (e.target === el && !o.alert) done(inp && !o.readonly ? null : false); });
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !ok.disabled) ok.click(); });
    document.body.appendChild(el);
    setTimeout(() => { if (inp) { inp.focus(); if (o.readonly) inp.select(); } else ok.focus(); }, 60);
  });
}
const copyBox = (v, title) => ask('اضغط مطولاً على الرابط لنسخه', { title: title || 'نسخ', input: v, readonly: true, alert: true, ok: 'تم', dir: 'ltr' });
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
  const th = ['kids', 'mid', 'uni'].includes(LS.get('mc_theme')) ? LS.get('mc_theme') : 'mid';
  setTheme(th);
  document.body.classList.remove('wide');
  $app.innerHTML = '<div class="sh sl pv-' + th + '"><div class="pv-bg" aria-hidden="true">' + (PV_BG[th] || '') + '</div>' +
    '<div class="hero">' + LOGO +
    '<h1>تحدّي الدقيقة</h1><p>٤ أسئلة، ٦٠ ثانية، ومن يتصدّر؟</p></div>' +
    '<div class="pad col">' +
    '<div class="card col"><div><b style="font-size:19px">أنا طالب/ـة</b><div class="sub">اكتب الرمز الذي أعطاك إياه المعلم/ـة</div></div>' +
    '<div class="code-wrap"><div class="code-boxes">' + '<div class="code-box"></div>'.repeat(6) + '</div>' +
    '<input class="code-input" id="code" inputmode="latin" autocomplete="off" autocapitalize="characters" maxlength="6" aria-label="رمز الدخول"></div>' +
    '<button class="paste-btn" data-act="s-paste">' + ic('download') + ' لصق الرمز</button>' +
    '<div id="lerr"></div>' +
    '<button class="btn" data-act="s-login">ادخل/ي</button></div>' +
    '<div class="center sl-t"><button class="link" data-act="go-teacher">أنت معلم/ـة؟ ادخل من هنا</button></div></div></div>';
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
  catch(e){ const v = await ask('الصق الرمز هنا', { input: '', placeholder: 'الرمز', dir: 'ltr', ok: 'دخول', danger: false }); if (v) S.fill(v); }
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
  setTheme(S.home.class.style); LS.set('mc_theme', S.home.class.style || 'mid');
  renderHome();
}
ACTS['s-reload'] = () => S.demo ? renderHome() : loadHome();

function renderHome(){
  const h = S.home, c = h.competition, ph = h.phase;
  let body = '';
  if (ph === 'none') {
    body = '<div class="phase"><b>لا توجد مسابقة نشطة</b></div><p class="muted">سيبدأ التحدي عندما يجهّز المعلم/ـة المسابقة. يمكنك التدريب الآن.</p>';
  } else if (ph === 'upcoming') {
    body = '<div class="phase"><b>تبدأ المسابقة قريباً</b><span class="chip warn">' + esc(fmtDate(c.start_date)) + '</span></div><p class="muted">يمكنك التدريب حتى موعد البداية.</p>';
  } else if (ph === 'points') {
    body = '<div class="phase"><b>مرحلة جمع النقاط</b><span class="chip warn">' + (c.days_left_points > 0 ? 'تنتهي بعد ' + c.days_left_points + ' يوم' : 'آخر يوم') + '</span></div>' +
      '<div class="stats"><div class="stat"><b>' + h.total_points + '</b><span>نقاطي</span></div><div class="stat"><b>' + (h.rank || '-') + '</b><span>ترتيبي في الصف</span></div></div>' +
      (h.gap != null && h.rank > 1 ? '<div class="gap-l">' + (h.gap > 0 ? 'ينقصك <b>' + h.gap + '</b> نقطة لتتقدم في الترتيب' : 'أنت متعادل مع من فوقك، جولة واحدة تكفي!') + '</div>' : (h.rank === 1 && h.total_points ? '<div class="gap-l">أنت في الصدارة 🏆 حافظ عليها</div>' : ''));
  } else if (ph === 'knockout') {
    body = '<div class="phase"><b>مرحلة التصفيات</b><span class="chip">حتى ' + esc(fmtDate(c.end_date)) + '</span></div>' +
      '<div class="stats"><div class="stat"><b>' + h.total_points + '</b><span>نقاطي</span></div><div class="stat"><b>' + (h.rank || '-') + '</b><span>ترتيبي في الصف</span></div></div>' +
      '<div id="ko" class="ko-wrap"></div>';
  } else {
    body = '<div class="phase"><b>انتهت المسابقة</b></div><div class="stats"><div class="stat"><b>' + h.total_points + '</b><span>نقاطي</span></div><div class="stat"><b>' + (h.rank || '-') + '</b><span>ترتيبي النهائي</span></div></div><div id="ko" class="ko-wrap"></div>';
  }
  let main = '';
  if (ph === 'points') {
    if (h.in_progress_attempt) main = '<button class="btn accent" data-act="s-start" data-kind="official">' + ic('play') + ' أكمل جولتك</button>';
    else if (h.played_today) main = '<div class="next-r"><span>جولتك القادمة بعد</span><b id="cd">' + cdText() + '</b></div>';
    else main = '<button class="btn accent" data-act="s-start" data-kind="official">' + ic('play') + ' ابدأ التحدي</button>';
  }
  const th = document.body.dataset.theme || 'mid';
  const steps = [['points', 'جمع النقاط'], ['knockout', 'التصفيات'], ['finished', 'النهاية']], si = steps.findIndex(x => x[0] === ph);
  if (si >= 0) body = '<div class="ph-strip">' + steps.map((x, i) => '<span class="' + (i < si ? 'done' : i === si ? 'cur' : '') + '">' + x[1] + '</span>').join('<i></i>') + '</div>' + body;
  $app.innerHTML = '<div class="sh pv-' + th + '"><div class="pv-bg" aria-hidden="true">' + (PV_BG[th] || '') + '</div>' +
    '<div class="s-head"><div class="who"><span class="sub">أهلاً 👋' + (h.streak ? ' <span class="streak" title="أيام متتالية">🔥 ' + h.streak + '</span>' : '') + '</span><b>' + esc(h.student.name) + '</b><span class="sub">' + esc(h.class.name) + '</span></div>' +
    '<button class="avatar av-btn" data-act="s-menu" aria-label="القائمة">' + esc((h.student.name || '?').trim().charAt(0)) + '</button></div>' +
    '<div class="quick q2">' +
    '<button data-act="s-badges">' + ic('star') + '<span>شاراتي</span></button>' +
    '<button data-act="s-leaders">' + ic('trophy') + '<span>المتصدرون</span></button></div>' +
    '<div class="comp">' + body + main +
    '<div class="s-row2"><button class="btn ghost" data-act="s-start" data-kind="practice">تدريب بلا نقاط</button>' +
    (h.wrong_count ? '<button class="btn ghost rv-btn" data-act="s-start" data-kind="review">أخطائي (' + h.wrong_count + ')</button>' : '') + '</div></div></div>';
  startCountdown();
  if ((ph === 'knockout' || ph === 'finished') && !S.demo) loadKo();
}
/* knockout bracket (one head-to-head round per day after the points phase) + honor board */
async function loadKo(){
  let b; try { b = await rpc('student_bracket', { p_token: S.token }); } catch(e){ return; }
  const el = document.getElementById('ko'); if (!el || !b) return;
  let top = '';
  if (b.my_match && S.home.phase === 'knockout') top = b.my_match.played
    ? '<div class="ko-me done">لعبت مواجهة اليوم ضد <b>' + esc(b.my_match.opponent || '—') + '</b>. تظهر النتيجة عندما ينهي منافسك جولته.</div>'
    : '<div class="ko-me">مواجهتك اليوم ضد <b>' + esc(b.my_match.opponent || '—') + '</b></div><button class="btn accent" data-act="s-start" data-kind="knockout">' + ic('play') + ' ابدأ المواجهة</button>';
  el.innerHTML = top + bracketHtml(b, b.me) + honorHtml(b);
}
function bracketHtml(b, me){
  if (!b || !b.size) return '<p class="muted center ko-none">لا توجد تصفيات: تحتاج طالبين على الأقل لديهم نقاط.</p>';
  const p = (x, w, m) => { if (!x || !x.id) return '<div class="ko-p tbd">بانتظار الفائز</div>';
    return '<div class="ko-p' + (w === x.id ? ' win' : w ? ' out' : '') + (x.id === me ? ' me' : '') + '"><span class="ko-s">' + (x.seed || '') + '</span><span class="ko-n">' + esc(x.name || '') + '</span>' + (x.done ? '<b>' + x.score + '/4</b>' : (m && m.w ? '<small>غاب</small>' : '')) + '</div>'; };
  return '<div class="ko-br">' + b.rounds.map(r => '<div class="ko-col"><div class="ko-h">' + esc(r.label) + '<small>' + esc(fmtDate(r.day)) + (r.day === b.today ? ' · اليوم' : '') + '</small></div>' +
    r.matches.map(m => '<div class="ko-m">' + p(m.a, m.w, m) + p(m.b, m.w, m) + '</div>').join('') + '</div>').join('') + '</div>' +
    '<p class="ko-rule">في كل مواجهة: الأكثر إجابات صحيحة يتأهل، وعند التعادل الأسرع، ومن لا يلعب يخسر.</p>';
}
function honorHtml(b){
  if (!b) return '';
  const pod = b.podium || [];
  if (!b.champion && !pod.length) return '';
  return '<div class="honor"><div class="honor-h">🏅 لوحة الشرف</div>' +
    (b.champion ? '<div class="honor-ch">👑<b>' + esc(b.champion.name) + '</b><span>بطل/ـة التصفيات</span></div>' : '') +
    (pod.length ? '<div class="honor-l">' + pod.map((x, i) => '<div><span>' + ['🥇', '🥈', '🥉'][i] + '</span><b>' + esc(x.name) + '</b><small>' + x.pts + ' نقطة</small></div>').join('') + '</div><small class="honor-f">الأعلى نقاطاً في مرحلة جمع النقاط</small>' : '') + '</div>';
}
const BADGES = { first: ['🎯', 'أول جولة', 'أنهيت أول جولة رسمية'], perfect: ['💯', '4 من 4', 'أجبت الأسئلة الأربعة كلها صح'], streak3: ['🔥', '3 أيام متتالية', 'لعبت 3 أيام وراء بعض'], fast: ['⚡', 'البرق', 'إجابة صحيحة في أقل من 3 ثوانٍ'], practice10: ['🏋️', 'المتدرّب', '10 جولات تدريب'] };
ACTS['s-badges'] = () => {
  const b = (S.home && S.home.badges) || [], n = b.filter(x => x.on).length;
  modal('<h3>شاراتي <span class="sub">(' + n + ' من ' + b.length + ')</span></h3><div class="bdg-grid">' + b.map(x => { const d = BADGES[x.k] || ['⭐', x.k, '']; return '<div class="bdg ' + (x.on ? 'on' : '') + '"><span class="bdg-i">' + d[0] + '</span><b>' + d[1] + '</b><small>' + d[2] + (x.k === 'practice10' && !x.on ? ' (' + (x.n || 0) + '/10)' : '') + '</small></div>'; }).join('') + '</div>' +
    (S.home && S.home.streak ? '<p class="center sub" style="margin-top:12px">🔥 سلسلتك الحالية: ' + S.home.streak + ' يوم متتالي</p>' : '') +
    '<button class="btn soft" style="margin-top:14px" data-act="close-modal">إغلاق</button>');
};
function cdText(){ const day = 864e5, k = 3 * 36e5, now = Date.now(), next = Math.floor((now + k) / day) * day + day - k, d = Math.max(0, next - now); const p = x => String(x).padStart(2, '0'); return p(Math.floor(d / 36e5)) + ':' + p(Math.floor(d % 36e5 / 6e4)) + ':' + p(Math.floor(d % 6e4 / 1e3)); }
function startCountdown(){ clearInterval(S.cdT); const el = document.getElementById('cd'); if (!el) return; S.cdT = setInterval(() => { const e = document.getElementById('cd'); if (!e) return clearInterval(S.cdT); const t = cdText(); e.textContent = t; if (t === '00:00:00') { clearInterval(S.cdT); setTimeout(() => S.demo ? null : loadHome(), 1500); } }, 1000); }
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
ACTS['s-logout-ask'] = async () => { if (!await ask('تسجيل الخروج؟ ستحتاج رمزك للدخول مرة أخرى.')) return; closeModals(); ACTS['s-logout'](); };
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
  if (S.demo) return toast('المتصدرون يظهرون في المسابقة الفعلية');
  const m = modal('<h3>المتصدرون</h3><div class="spin"></div>');
  try {
    const res = await rpc('class_leaderboard', { p_token: S.token });
    const hidden = res && res.hidden, rows = hidden ? res.rows : res;
    m.querySelector('.modal').classList.add('lbx-m');
    m.querySelector('.modal').innerHTML = leadersHtml(rows, hidden);
  } catch(e){ m.remove(); toast(errMsg(e)); }
};

function leadersHtml(rows, hidden){
  const th = document.body.dataset.theme || 'mid';
  const on = rows.filter(r => r.points > 0), zero = rows.filter(r => !(r.points > 0)), me = rows.find(r => r.is_me);
  const ini = n => esc(String(n || '?').trim().split(/\s+/)[0]);
  const top = on.slice(0, 3), rest = on.slice(3), max = Math.max(1, ...on.map(r => r.points));
  const pod = top.length && !hidden ? '<div class="lbx-pod">' + [1, 0, 2].map(i => { const r = top[i]; if (!r) return '<div class="lbx-pd empty"></div>';
      return '<div class="lbx-pd p' + (i + 1) + (r.is_me ? ' me' : '') + '"><div class="lbx-av">' + (i === 0 ? '<span class="lbx-crown">👑</span>' : '') + ini(r.name).charAt(0) + '<span class="lbx-md">' + (i + 1) + '</span></div><b>' + ini(r.name) + '</b><span class="lbx-pts">' + r.points + '</span><div class="lbx-step"></div></div>'; }).join('') + '</div>' : '';
  const list = (hidden ? on : rest).map(r => '<div class="lbx-r' + (r.is_me ? ' me' : '') + '"><span class="lbx-no">' + r.rank + '</span><span class="lbx-nm">' + esc(r.name) + (r.is_me ? ' <small>(أنت)</small>' : '') + '<i><u style="width:' + Math.round(r.points * 100 / max) + '%"></u></i></span><b>' + r.points + '</b></div>').join('');
  const meZero = me && !(me.points > 0);
  return '<div class="lbx pv-' + th + '"><div class="lbx-top"><h3>🏆 المتصدرون</h3><span>' + esc(S.home.class.name) + '</span><button class="lbx-x" data-act="close-modal" aria-label="إغلاق">' + ic('x') + '</button></div>' +
    (hidden ? '<div class="lbx-hid">الترتيب مخفي حتى نهاية المسابقة 🤫<small>هذا ترتيبك أنت فقط</small></div>' : '') +
    (on.length ? pod + (list ? '<div class="lbx-list">' + list + '</div>' : '') : '<div class="lbx-empty"><span>🚀</span><b>لا أحد في القائمة بعد</b><small>العب جولة اليوم وكن أول المتصدرين!</small></div>') +
    (zero.length && !hidden ? '<div class="lbx-zero">' + (meZero ? '<b>أنت و' + (zero.length - 1) + ' آخرون</b>' : '<b>' + zero.length + ' طالب/ـة</b>') + ' لم يحصلوا على نقاط بعد. جولة واحدة تدخلك القائمة!</div>' : '') +
    '</div>';
}

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

/* ---- theme preview (no server calls) ---- */
const DEMO_Q = [
  { body: 'ما عاصمة دولة الكويت؟', options: ['الكويت', 'دبي', 'القاهرة', 'الرياض'], c: 0 },
  { body: 'كم يساوي 7 × 8 ؟', options: ['54', '56', '63', '48'], c: 1 },
  { body: 'أي الكواكب أقرب إلى الشمس؟', options: ['الزهرة', 'المريخ', 'عطارد', 'الأرض'], c: 2 },
  { body: 'ما جمع كلمة «كتاب»؟', options: ['كتابات', 'كاتب', 'مكتبة', 'كُتُب'], c: 3 }
];
function demoStart(th){
  stopTimer(); closeModals();
  document.body.classList.remove('wide');
  setTheme(['kids', 'mid', 'uni'].includes(th) ? th : 'mid'); applyMode();
  S.demo = { pts: 0, ok: 0 };
  S.home = { class: { name: 'صف تجريبي', size: 24, style: th }, student: { name: 'طالب تجريبي' }, competition: { days_left_points: 4 }, phase: 'points', total_points: 120, rank: 3, gap: 40, streak: 2, wrong_count: 0, badges: [{ k: 'first', on: true }, { k: 'perfect', on: false }, { k: 'streak3', on: false }, { k: 'fast', on: true }, { k: 'practice10', on: false, n: 3 }] };
  renderHome();
}
function demoQ(pos){
  if (pos === 1) { S.demo.pts = 0; S.demo.ok = 0; }
  const q = DEMO_Q[pos - 1];
  showQuestion({ attempt_id: 0, kind: 'practice', position: pos, total: 4, seconds_left: 15, question: { body: q.body, options: q.options } });
}
function demoSubmit(idx){
  const st = S.cur, q = DEMO_Q[st.position - 1], ok = idx === q.c, d = S.demo;
  const left = Number((document.getElementById('tnum') || {}).textContent) || 0, pts = ok ? 50 + left * 10 : 0;
  if (ok) { S.demo.ok++; S.demo.pts += pts; }
  (S.log = S.log || []).push({ q: q.body, o: q.options, c: q.c, x: idx, ok });
  const btns = $app.querySelectorAll('.opt');
  btns.forEach((b, i) => { b.disabled = true; b.classList.add(i === q.c ? 'good' : i === idx ? 'bad' : 'dim'); });
  if (ok) FX.correct(btns[q.c], pts); else FX.wrong(idx != null ? btns[idx] : null, idx == null);
  const pop = document.getElementById('pop');
  if (pop) { pop.className = 'pts-pop ' + (ok ? 'good' : 'bad'); pop.textContent = ok ? '+' + pts + ' نقطة' : (idx == null ? 'انتهى الوقت' : 'إجابة غير صحيحة'); }
  setTimeout(() => { if (S.demo !== d || S.cur !== st || !$app.querySelector('.play')) return; if (st.position >= 4) showResult({ kind: 'practice', correct_count: S.demo.ok, total_points: S.demo.pts }); else demoQ(st.position + 1); }, 1500);
}

/* ---- play ---- */
function stopTimer(){ document.body.classList.remove('danger'); if (S.timer) { cancelAnimationFrame(S.timer.raf); S.timer = null; } }
ACTS['s-start'] = async (t) => {
  S.log = [];
  if (S.demo) return demoQ(1);
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
    '<div class="pv-panel"><div class="qbox' + (q.image ? ' has-img' : '') + '">' + (q.image ? '<img class="q-img" src="' + esc(q.image) + '" alt="">' : '') + '<span>' + esc(q.body) + '</span></div><div class="pts-pop" id="pop"></div>' +
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
ACTS['s-quit'] = async () => {
  if (S.demo) { stopTimer(); return renderHome(); }
  if (!await ask('هل تريد الخروج؟ الأسئلة المتبقية ستُحتسب بلا نقاط عند انتهاء وقتها.')) return;
  stopTimer(); loadHome();
};
async function submit(idx){
  if (S.demo) return demoSubmit(idx);
  const st = S.cur;
  try {
    const res = await rpc('submit_answer', { p_token: S.token, p_attempt: st.attempt_id, p_position: st.position, p_chosen: idx });
    const r = res.result;
    (S.log = S.log || []).push({ q: st.question.body, o: st.question.options, c: r.correct_index, x: idx, ok: !!r.correct });
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
function reviewHtml(){
  const L = S.log || []; if (!L.length) return '';
  return '<div class="rv"><b class="rv-h">مراجعة إجاباتك</b>' + L.map((x, i) => '<div class="rv-i ' + (x.ok ? 'ok' : 'no') + '"><span class="rv-n">' + (x.ok ? '✓' : '✗') + '</span><div><div class="rv-q">' + esc(x.q) + '</div>' +
    (x.ok ? '<div class="rv-a good">' + esc(x.o[x.c]) + '</div>' : '<div class="rv-a good">الصحيحة: ' + esc(x.o[x.c]) + '</div><div class="rv-a bad">' + (x.x == null ? 'انتهى الوقت' : 'إجابتك: ' + esc(x.o[x.x])) + '</div>') + '</div></div>').join('') + '</div>';
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
  const th = document.body.dataset.theme || 'mid';
  $app.innerHTML = '<div class="sh pv-' + th + '"><div class="pv-bg" aria-hidden="true">' + (PV_BG[th] || '') + '</div>' +
    '<div class="result ' + (win ? 'is-win' : lose ? 'is-lose' : '') + '"><div class="medal-wrap">' + (win ? '<div class="rays"></div>' : '') + '<div class="medal">' + ic(lose ? 'clock' : 'trophy') + '</div></div>' +
    '<h2 class="center res-h">' + head + '</h2><p class="center muted" style="margin-top:-8px">' + sub + (sm && sm.kind === 'practice' ? ' · تدريب' : sm && sm.kind === 'knockout' ? ' · مواجهة التصفيات' : '') + '</p>' +
    (sm && sm.kind === 'knockout' ? '<p class="center sub">تُحسم المواجهة بعدد الإجابات الصحيحة ثم السرعة، وتظهر النتيجة في الرئيسية عندما ينهي منافسك.</p>' : '') +
    '<div class="stars-row">' + stars + '</div>' +
    '<div class="center"><div class="big" id="bigpts">0</div><div class="muted">مجموع النقاط</div></div>' +
    reviewHtml() +
    '<div class="rows card"><div class="r"><span>الإجابات الصحيحة</span><b>' + (sm ? sm.correct_count : 0) + ' من 4</b></div>' + rankRow + '</div>' +
    (sm && sm.kind === 'official' ? '<button class="btn accent" data-act="s-leaders">' + ic('trophy') + ' عرض الترتيب</button>' : '') +
    ((S.log || []).some(x => !x.ok) && !S.demo ? '<button class="btn ghost" data-act="s-start" data-kind="review">تدرّب على أخطائك</button>' : '') +
    '<button class="btn" data-act="s-reload">العودة للرئيسية</button></div></div>';
  const target = sm ? sm.total_points : 0, el = document.getElementById('bigpts'), t0 = performance.now();
  (function roll(t){ const k = Math.min(1, (t - t0) / 1200), e = 1 - Math.pow(1 - k, 3); if (el) el.textContent = Math.round(target * e); if (k < 1) requestAnimationFrame(roll); })(t0);
}

/* ======================================================
   TEACHER
   ====================================================== */
const T = { user: null, name: '', classTab: 'students', authMode: 'in', qf: { status: 'all', level: 'all', type: 'all', subj: '', cu: '' } };
const CK = { cls: null, students: [], comp: null, pending: [] };
const QS = { list: [], glob: [], globalCount: 0, stats: {}, q: '', sel: new Set(), selOn: false, dup: new Set(), norm: {} };
const TYPE_AR = { curriculum: 'منهج', general: 'عام', quick: 'سرعة بديهة', memory: 'ذاكرة' };
const LEVEL_AR = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' };
const STATUS_AR = { draft: 'مسودة', approved: 'معتمد', rejected: 'مرفوض' };
const STYLE_AR = { kids: 'مرح · ابتدائي', mid: 'مرح قليلاً · متوسط', uni: 'هادئ · ثانوي وجامعة' };
const STYLE_SW = { kids: 'linear-gradient(135deg,#FFD9B0,#E3262F)', mid: 'linear-gradient(135deg,#C8102E,#F5B72B)', uni: 'linear-gradient(135deg,#FAF6F3,#7A1220)' };
const LOGO_S = '<div class="logo" style="width:42px;height:42px" aria-hidden="true"><img src="icon-192.png" alt=""></div>';
const NAV = [['home', 'الرئيسية', 'home'], ['classes', 'الصفوف', 'layers'], ['questions', 'الأسئلة', 'help'], ['comps', 'المسابقات', 'trophy'], ['settings', 'الإعدادات', 'gear']];

function shell(title, body, active, top, back){
  return `<div class="t-top"><div class="brand">${back ? `<a class="icon-btn back-btn" href="${back}" aria-label="رجوع">${ic('back')}</a>` : LOGO_S}<span class="t-title">${esc(title)}</span></div><div class="t-acts">${top || ''}<button class="t-av" data-act="t-menu" aria-label="حسابي">${avatarHtml('t-av-img')}</button></div></div>` +
    `<div class="t-body">${body}</div>` +
    `<nav class="t-nav" aria-label="القائمة"><span class="lens" style="--i:${NAVI.prev}"></span>${NAV.map(n => `<a href="#/t/${n[0]}" class="${n[0] === active ? 'on' : ''}">${ic(n[2])}<span>${n[1]}</span></a>`).join('')}</nav>`;
}
const NAVI = { prev: 0 };
const PCACHE = {}; // last rendered teacher page per hash, shown instantly while fresh data loads
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
  if (location.hash.indexOf('#/t') === 0 && body.indexOf('<div class="spin"></div>') !== 0) PCACHE[location.hash] = { title, body, top, back };
  const i0 = NAV.findIndex(n => n[0] === active), i = Math.max(0, i0);
  const nav = $app.querySelector(':scope > .t-nav'), oldTop = $app.querySelector(':scope > .t-top'), oldBody = $app.querySelector(':scope > .t-body');
  if (nav && oldTop && oldBody) {
    // keep the tab bar on screen; swap only the header and the page
    const tmp = document.createElement('div'); tmp.innerHTML = shell(title, body, active, top, back);
    oldTop.replaceWith(tmp.querySelector('.t-top')); oldBody.replaceWith(tmp.querySelector('.t-body'));
    nav.querySelectorAll('a').forEach((a, j) => a.classList.toggle('on', j === i0));
    const lens = nav.querySelector('.lens'); if (lens) { lens.style.opacity = i0 < 0 ? '0' : ''; lens.style.setProperty('--i', i); }
    NAVI.prev = i; window.scrollTo(0, 0); return;
  }
  $app.innerHTML = shell(title, body, active, top, back); window.scrollTo(0, 0);
  const lens = $app.querySelector('.lens');
  if (lens && i0 < 0) lens.style.opacity = '0';
  if (lens) requestAnimationFrame(() => requestAnimationFrame(() => { lens.style.setProperty('--i', i); NAVI.prev = i; }));
}
/* liquid-glass lens: drag across the tab bar */
(function(){
  let drag = null;
  const idxAt = (nav, x) => { const r = nav.getBoundingClientRect(), w = r.width / NAV.length; return Math.max(0, Math.min(NAV.length - 1, Math.floor((r.right - x) / w))); };
  const reset = () => { if (drag && drag.lens) drag.lens.classList.remove('drag'); if (drag) drag.nav.querySelectorAll('a').forEach(el => el.classList.remove('hover')); drag = null; };
  document.addEventListener('touchcancel', reset, { passive: true });
  document.addEventListener('touchstart', e => {
    reset();
    const nav = e.target.closest && e.target.closest('.t-nav'); if (!nav || e.touches.length > 1) return;
    drag = { nav, lens: nav.querySelector('.lens'), x0: e.touches[0].clientX, moved: false };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!drag || !drag.nav.isConnected || !drag.lens) { drag = null; return; }
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
    if (!d.moved || !d.lens) return;
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
    ${up ? '' : '<button type="button" class="link forgot" data-act="t-forgot">نسيت كلمة المرور؟</button>'}
    <div id="aerr"></div>
    <button class="btn" type="submit">${up ? 'إنشاء الحساب' : 'دخول'}</button>
    ${cfg.GOOGLE_LOGIN ? '<button type="button" class="btn ghost" data-act="t-oauth" data-p="google">المتابعة باستخدام Google</button>' : ''}
    ${cfg.APPLE_LOGIN ? '<button type="button" class="btn ghost" data-act="t-oauth" data-p="apple">المتابعة باستخدام Apple</button>' : ''}
  </form>
  <div class="center"><button class="link" data-act="go-student">دخول الطلبة</button></div></div>`;
}
ACTS['t-forgot'] = async () => {
  const cur = (document.getElementById('a-email') || {}).value || '';
  const email = await ask('سنرسل رابطاً لتعيين كلمة مرور جديدة إلى بريدك.', { title: 'استعادة كلمة المرور', input: cur, placeholder: 'example@school.edu.kw', dir: 'ltr', ok: 'إرسال الرابط', danger: false });
  if (!email) return;
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + location.pathname });
  if (error) return toast(errMsg(error));
  ask('افتح الرسالة التي وصلتك واضغط الرابط، وستظهر لك خانة كلمة المرور الجديدة.', { title: 'تم الإرسال ✉️', alert: true, ok: 'حسناً', danger: false });
};
/* returning from an e-mail link (sign-up confirm / password recovery) */
async function authReturn(){
  const h = location.hash, rec = /type=recovery/.test(h);
  const err = (h.match(/error_description=([^&]+)/) || [])[1];
  await sb.auth.getSession();
  history.replaceState(null, '', location.pathname + '#/t/home');
  if (err) toast(decodeURIComponent(err.replace(/\+/g, ' ')));
  await teacherRoute();
  if (rec) newPassword();
}
function newPassword(){
  modal(`<h3>كلمة مرور جديدة</h3><form class="col" data-form="st-pass-save"><div class="field"><label for="np">كلمة المرور الجديدة</label><input class="input" id="np" name="p1" type="password" minlength="6" required dir="ltr" autocomplete="new-password"></div><p class="sub">6 أحرف على الأقل.</p><button class="btn" type="submit">حفظ</button></form>`);
  setTimeout(() => { const i = document.getElementById('np'); if (i) i.focus(); }, 80);
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
  const cached = PCACHE[location.hash];
  if (cached) view(cached.title, cached.body, page, cached.top, cached.back); else view('', '<div class="spin"></div>', page);
  try {
    if (!T.name) {
      const r = await sb.from('teachers').select('display_name,avatar_url,settings').eq('id', T.user.id).maybeSingle();
      T.name = (r.data && r.data.display_name) || (T.user.email || '').split('@')[0];
      T.avatar = (r.data && r.data.avatar_url) || '';
      T.settings = (r.data && r.data.settings) || {};
    }
    if (page === 'classes' || page === 'comps') { CL.tab = page; await tClasses(); }
    else if (page === 'class') await tClass(parts[1]);
    else if (page === 'questions') await tQuestions();
    else if (page === 'qshare') { T.qf.status = 'approved'; await tQuestions(); qSharePreview(parts[1]); }
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
    sb.from('classes').select('*').eq('archived', false).order('created_at'),
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
  T.homeStats = stats;
  if (alerts.length) html += `<div class="card col today-card"><div class="row between"><b>${ic('clock')} اليوم: لم يلعبوا بعد</b><span class="chip warn">${alerts.reduce((a, s) => a + s.n - s.played, 0)}</span></div>` +
    alerts.map(s => `<div class="row between today-row"><a class="grow dash-link" href="#/t/results/${s.c.id}"><b>${esc(s.c.name)}</b><div class="sub">${s.n - s.played} من ${s.n}: ${s.rs.filter(r => !r.played_today).slice(0, 4).map(r => esc(r.name.split(' ')[0])).join('، ')}${s.n - s.played > 4 ? '…' : ''}</div></a><button class="btn sm wa-btn" data-act="t-remind" data-c="${s.c.id}">${ic('send')} تذكير</button></div>`).join('') + `</div>`;

  // competitions timeline
  const comps = stats.filter(s => s.comp);
  html += `<div class="card col"><div class="row between"><b>${ic('layers')} المسابقات</b><a class="sub" href="#/t/comps">إدارة</a></div>` +
    (comps.length ? comps.map(s => {
      const t = todayKW(), c = s.comp;
      const dl = Math.round((new Date(c.end_date) - new Date(t)) / 864e5);
      return `<a class="row between dash-link" href="#/t/results/${s.c.id}"><div><b>${esc(s.c.name)}</b><div class="sub">${esc(fmtDate(c.start_date))} ← ${esc(fmtDate(c.end_date))}</div></div><span class="chip ${s.ph === 'points' ? 'good' : s.ph === 'knockout' ? 'warn' : ''}">${PHASE_AR[s.ph]}${dl >= 0 && s.ph !== 'finished' ? ' · ' + dl + ' يوم' : ''}</span></a>`;
    }).join('') : '<p class="sub">لا توجد مسابقات. أنشئ مسابقة من باب المسابقات.</p>') + `</div>`;
  // needs attention
  const never = stats.filter(s => s.comp && s.ph !== 'upcoming' && s.never > 0);
  if (never.length) html += `<div class="card col"><b>${ic('user')} يحتاجون متابعة: لم يشاركوا أبداً</b>` +
    never.map(s => `<a class="row between dash-link" href="#/t/results/${s.c.id}"><span>${esc(s.c.name)}</span><span class="chip bad">${s.never}</span></a>`).join('') + `</div>`;


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
    const g = {}; list.forEach(x => (g[x.cls] = g[x.cls] || []).push({ name: x.name, student_no: x.student_no, phone: x.phone, gender: x.gender }));
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
const CL = { classes: [], archived: [], byId: {}, students: {}, comps: {}, stat: {}, q: {}, sort: {}, sent: new Set(), open: new Set(), tab: 'classes' };
async function tClasses(){
  const [c, s, k] = await Promise.all([
    sb.from('classes').select('*').order('created_at'),
    sb.from('students').select('*').order('created_at'),
    sb.from('competitions').select('*').eq('status', 'active').order('created_at')
  ]);
  if (c.error) throw c.error; if (s.error) throw s.error; if (k.error) throw k.error;
  CL.classes = c.data.filter(x => !x.archived); CL.archived = c.data.filter(x => x.archived); CL.byId = {}; CL.students = {}; CL.comps = {}; CL.allComps = k.data;
  c.data.forEach(x => { CL.byId[x.id] = x; CL.students[x.id] = []; });
  s.data.forEach(x => { if (CL.students[x.class_id]) CL.students[x.class_id].push(x); });
  k.data.forEach(x => { CL.comps[x.class_id] = x; });
  CL.stat = {};
  if (k.data.length) {
    const a = await sb.from('attempts').select('student_id,play_date,total_points').eq('kind', 'official').eq('status', 'finished').in('competition_id', k.data.map(x => x.id));
    const td = todayKW();
    (a.data || []).forEach(r => { const o = CL.stat[r.student_id] || (CL.stat[r.student_id] = { pts: 0, rounds: 0, today: false }); o.pts += r.total_points || 0; o.rounds++; if (r.play_date === td) o.today = true; });
  }
  await loadCurricula().catch(() => {});
  renderClasses();
}
function renderClasses(){
  const cl = CL.tab !== 'comps';
  const more = cl ? `<button class="icon-btn" data-act="c-more" aria-label="المزيد">${ic('more')}</button>` : '';
  view(cl ? 'الصفوف' : 'المسابقات', (cl ? classesList() : compsPanel()) + selBar(), cl ? 'classes' : 'comps', more);
  cfUpdate(); cfLessons();
  if (CL.addFocus) { const i = document.querySelector(`.cls[data-cid="${CL.addFocus}"] .cl-add1 input`); CL.addFocus = null; if (i) i.focus(); }
}
ACTS['c-tab'] = t => { T.compEdit = null; go('#/t/' + t.dataset.t); };
function classesList(){
  const top = CL.sel ? '' : `<button class="btn cl-add" data-act="aw-start">${ic('plus')} إضافة طلبة</button><div class="cl-newc"><button class="link" data-act="t-add-class">＋ صف جديد</button></div><input type="file" id="awimg" accept="image/*" class="hide" data-change="aw-img"><input type="file" id="awxl" accept=".xlsx,.xls,.csv" class="hide" data-change="aw-xl"><input type="file" id="mxl" accept=".xlsx,.xls,.csv" class="hide" data-change="t-multi-chosen"><input type="file" id="xl" accept=".xlsx,.xls,.csv" class="hide" data-change="t-xl-chosen">`;
  const arch = CL.archived && CL.archived.length && !CL.sel ? `<details class="cl-arch"><summary>${ic('layers')} الصفوف المؤرشفة (${CL.archived.length})</summary>${CL.archived.map(c => `<div class="cl-arch-r"><span class="grow">${esc(c.name)}<small>${(CL.students[c.id] || []).length} طالب</small></span><button class="btn sm soft" data-act="c-unarchive" data-id="${c.id}">استرجاع</button></div>`).join('')}</details>` : '';
  if (!CL.classes.length) return top + `<div class="cl-empty">${ic('users')}<b>لا يوجد طلبة بعد</b><small>اضغط «إضافة طلبة» فوق، وصوّر كشف الأسماء أو الصقه، وخلال دقيقة يصير الصف جاهز.</small></div>` + arch;
  return top + CL.classes.map(classSection).join('') + arch;
}
const CST = id => CL.stat[id] || { pts: 0, rounds: 0, today: false };
function classSection(c){
  const st0 = CL.students[c.id] || [], open = CL.open.has(c.id), comp = CL.comps[c.id];
  const ph = comp ? phaseOf(comp) : null;
  const played = st0.filter(x => CST(x.id).today).length;
  const never = comp && ph !== 'upcoming' ? st0.filter(x => !CST(x.id).rounds) : [];
  let body = '';
  if (open) {
    const link = joinLink(c.join_code), sort = CL.sort[c.id] || 'no', q = CL.q[c.id] || '';
    let st = st0.map((x, i) => Object.assign({ _i: i + 1 }, x));
    if (sort === 'name') st.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    if (sort === 'pts') st.sort((a, b) => CST(b.id).pts - CST(a.id).pts);
    if (sort === 'idle') st.sort((a, b) => CST(a.id).today - CST(b.id).today || CST(a.id).rounds - CST(b.id).rounds);
    const selS = CL.sel && CL.sel.type === 'students' && CL.sel.cid === c.id;
    const fl = CL.flash && CL.flash.cid === c.id ? CL.flash : null;
    body = `<div class="cls-body">` +
      (fl ? `<div class="cl-flash"><button class="cl-flash-x" data-act="cl-flash-x" aria-label="إغلاق">${ic('x')}</button>${fl.added ? `<b>الخطوة التالية: أرسل لهم طريقة الدخول</b><small>تمت إضافة ${fl.n} طالباً إلى «${esc(c.name)}»، ولكل واحد رمز دخول خاص.</small><div class="row"><button class="btn sm wa-btn" data-act="c-send">${ic('send')} واتساب</button><button class="btn sm soft" data-act="t-print-codes">${ic('print')} طباعة البطاقات</button></div>${comp ? '' : `<button class="link" data-act="cp-new-for">أو أنشئ مسابقة لهذا الصف</button>`}` : `<b>✅ تم إنشاء الصف${fl.n ? ` ومعه ${fl.n} طالباً` : ''}</b><small>${fl.n ? 'الخطوة التالية: أرسل الرموز للطلبة، ثم أنشئ مسابقة.' : fl.link ? 'شارك رابط التسجيل أدناه مع الطلبة.' : 'أضف الطلبة، ثم أنشئ مسابقة.'}</small><div class="row">${fl.n ? `<button class="btn sm" data-act="c-send">${ic('send')} إرسال الرموز</button>` : ''}${comp ? '' : `<button class="btn sm soft" data-act="cp-new-for">${ic('trophy')} إنشاء مسابقة</button>`}</div>`}</div>` : '') +
      (CL.sel ? '' : `<div class="cl-acts">${st0.length ? `<button class="btn sm soft" data-act="c-send">${ic('send')} إرسال الرموز</button>` : '<span class="grow"></span>'}<button class="icon-btn" data-act="c-cmore" aria-label="المزيد">${ic('more')}</button></div>`) +
      (c.self_join ? `<div class="join-row"><span class="sub">التسجيل الذاتي مفعّل</span><button class="btn sm soft" data-act="c-joinshow">عرض</button><button class="btn sm" data-act="copy" data-v="${esc(link)}">نسخ الرابط</button></div>` : '') +
      (never.length && !CL.sel ? `<div class="cl-alert">${ic('user')}<span class="grow"><b>${never.length}</b> لم يدخلوا أبداً</span><button class="btn sm soft" data-act="c-send" data-only="never">أرسل لهم الرمز</button></div>` : '') +
      (st0.length > 10 ? `<div class="cl-search">${ic('search')}<input class="cl-q" data-cid="${c.id}" placeholder="بحث بالاسم أو الرقم" value="${esc(q)}"></div>` : '') +
      (st0.length > 1 ? `<div class="lv-chips cl-sort">${[['no', 'الترتيب'], ['name', 'الاسم']].concat(comp ? [['pts', 'النقاط'], ['idle', 'لم يلعب اليوم']] : []).map(x => `<button class="${sort === x[0] ? 'on' : ''}" data-act="c-sort" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>` : '') +
      (st.length ? `<div class="sw-list">${st.map(x => { const k = CST(x.id), hide = q && !(x.name + ' ' + (x.student_no || '')).includes(q); return `<div class="sw-row${hide ? ' hide' : ''}" data-n="${esc(x.name + ' ' + (x.student_no || ''))}"><div class="sw-act">
          <div class="sw-r"><button class="del" data-act="t-del-student" data-id="${x.id}"><i>${ic('trash')}</i><span>حذف</span></button></div>
          <div class="sw-l"><button class="rg" data-act="t-regen" data-id="${x.id}"><i>${ic('refresh')}</i><span>رمز جديد</span></button><button class="wa" data-act="s-wa" data-id="${x.id}"><i>${ic('send')}</i><span>واتساب</span></button></div></div>
        <div class="sw-main" data-act="s-card" data-id="${x.id}">${selS ? `<span class="selmark">${ic(CL.sel.ids.has(x.id) ? 'checkc' : 'circle')}</span>` : `<span class="sw-n">${sort === 'pts' && comp ? '' : x._i}</span>`}<div class="grow"><b>${esc(x.name)}${k.today ? '<i class="cl-dot" title="لعب اليوم"></i>' : ''}</b><div class="sub">${esc(x.student_no) || '—'}${comp ? ` · ${k.pts} نقطة` : ''}${x.gender === 'f' ? ' · طالبة' : x.gender === 'm' ? ' · طالب' : ''}</div></div>
        ${selS ? '' : `<button class="cl-wa" data-act="s-wa" data-id="${x.id}" aria-label="إرسال الرمز واتساب">${ic('send')}</button>`}</div></div>`; }).join('')}</div>`
        : `<div class="cl-empty sm"><b>لا يوجد طلبة في ${esc(c.name)}</b><small>صوّر كشف الأسماء أو الصقه، أو اكتب الأسماء واحداً واحداً تحت.</small><button class="btn" data-act="aw-start" data-cid="${c.id}">${ic('plus')} إضافة طلبة</button></div>`) +
      (CL.sel ? '' : `<form class="cl-add1" data-form="c-add1"><span class="pl">＋</span><input name="n" placeholder="طالب" autocomplete="off" enterkeyhint="done"><button class="btn sm" type="submit">إضافة</button></form>`) + '</div>';
  }
  const selC = CL.sel && CL.sel.type === 'classes';
  const days = comp && ph === 'points' ? cfDays(todayKW(), comp.points_end_date) : null;
  const tag = comp ? `<span class="cl-tag on">${PHASE_AR[ph]}</span>${days != null ? `<span class="cl-days">${days > 0 ? 'باقي ' + days + ' يوم' : 'آخر يوم'}</span>` : ''}` : `<span class="cl-tag">بدون مسابقة</span>`;
  const pct = st0.length ? Math.round(played * 100 / st0.length) : 0;
  const ring = ph === 'points' && st0.length && !selC ? `<span class="cl-ring" style="--p:${pct}" title="لعبوا اليوم"><b>${played}/${st0.length}</b><small>اليوم</small></span>` : '';
  return `<div class="cls ${open ? 'open' : ''} ${selC && CL.sel.ids.has(c.id) ? 'picked' : ''}" data-cid="${c.id}"><button class="cls-head" data-act="c-toggle">${selC ? `<span class="selmark">${ic(CL.sel.ids.has(c.id) ? 'checkc' : 'circle')}</span>` : ''}
    <span class="cl-ic" style="--h:${clsHue(c.name)}">${esc(clsBadge(c.name))}</span>
    <div class="grow cl-txt"><b>${esc(c.name)}</b><div class="cl-meta"><span>${st0.length} طالب${c.gender === 'f' ? ' · بنات' : c.gender === 'm' ? ' · بنين' : ''}</span>${tag}</div></div>${ring}${selC ? '' : `<span class="chev">${ic('back')}</span>`}</button>${body}</div>`;
}
ACTS['c-sort'] = t => { const c = ctx(t); CL.sort[c.id] = t.dataset.v; renderClasses(); };
ACTS['cl-flash-x'] = () => { CL.flash = null; renderClasses(); };
ACTS['cp-new-for'] = async t => { const c = ctx(t); CL.flash = null; CL.tab = 'comps'; await ACTS['cp-new'](); CC.sel = new Set([c.id]); if (location.hash !== '#/t/comps') location.hash = '#/t/comps'; else renderClasses(); };
document.addEventListener('input', e => {
  const q = e.target.closest && e.target.closest('.cl-q');
  if (q) { const v = q.value.trim(); CL.q[q.dataset.cid] = v; q.closest('.cls').querySelectorAll('.sw-row').forEach(r => r.classList.toggle('hide', !!v && !r.dataset.n.includes(v))); return; }
  const ta = e.target.closest && e.target.closest('.paste-ta');
  if (ta) pasteInfo(ta);
});
/* paste a list: one student per line, optional number after a comma or tab */
function parsePaste(txt){
  return String(txt || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => { const p = l.split(/\s*[،,\t]\s*/); const no = (p[1] || '').replace(/[^\d٠-٩]/g, '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)); return { name: p[0].replace(/^\d+[\.\-\)]\s*/, '').trim(), student_no: no }; }).filter(x => x.name.length > 1);
}
function pasteInfo(ta){
  const box = ta.parentElement.querySelector('.paste-info'); if (!box) return;
  const rows = parsePaste(ta.value), have = new Set(((CK.cls && ta.closest('[data-form="t-save-paste"]')) ? CK.students : []).map(x => x.name.trim()));
  const seen = new Set(), dup = [];
  rows.forEach(r => { if (seen.has(r.name) || have.has(r.name)) dup.push(r.name); seen.add(r.name); });
  box.innerHTML = rows.length ? `<b>${rows.length - dup.length}</b> اسم جاهز للإضافة${dup.length ? ` · <span class="bad">${dup.length} مكرر سيتم تخطيه: ${dup.slice(0, 3).map(esc).join('، ')}${dup.length > 3 ? '…' : ''}</span>` : ''}` : '';
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
  { act: 'm-run', attrs: `data-a="c-send" data-cid="${c.id}"`, icon: 'send', label: 'إرسال الرموز واتساب' },
  { act: 'm-run', attrs: `data-a="t-print-codes" data-cid="${c.id}"`, icon: 'print', label: 'طباعة بطاقات الرموز' },
  { act: 'm-run', attrs: `data-a="t-export-codes" data-cid="${c.id}"`, icon: 'download', label: 'تصدير الرموز Excel' },
  { act: 'm-run', attrs: `data-a="s-select" data-cid="${c.id}"`, icon: 'check', label: 'تحديد طلبة (نقل، تصدير، حذف)' },
  null,
  { act: 'm-run', attrs: `data-a="c-menu" data-cid="${c.id}"`, icon: 'gear', label: 'إعدادات الصف والتسجيل الذاتي' },
  c.self_join ? { act: 'm-run', attrs: `data-a="c-joinshow" data-cid="${c.id}"`, icon: 'eye', label: 'عرض رابط التسجيل بملء الشاشة' } : undefined,
  { act: 'm-run', attrs: `data-a="c-promote" data-cid="${c.id}"`, icon: 'refresh', label: 'ترقية للصف التالي' },
  { act: 'm-run', attrs: `data-a="c-archive" data-cid="${c.id}"`, icon: 'layers', label: 'أرشفة الصف' },
  null,
  { act: 'm-run', attrs: `data-a="c-del" data-cid="${c.id}"`, icon: 'trash', label: 'حذف الصف نهائياً', danger: true }
].filter(x => x !== undefined)); };
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
    <div class="sel-acts">${!isC ? `<button class="btn sm soft" data-act="sel-move" ${n && CL.classes.length > 1 ? '' : 'disabled'}>${ic('layers')} نقل</button><button class="btn sm soft" data-act="sel-export" ${n ? '' : 'disabled'}>${ic('download')} تصدير</button>` : ''}<button class="btn sm danger" data-act="sel-del" ${n ? '' : 'disabled'}>${ic('trash')} حذف</button></div></div>`;
}
ACTS['sel-del'] = async () => {
  const ids = [...CL.sel.ids], isC = CL.sel.type === 'classes';
  if (!await ask(isC ? `حذف ${ids.length} صف مع طلبتها ونتائجها نهائياً؟` : `حذف ${ids.length} طالب/ـة ونتائجهم نهائياً؟`)) return;
  const { error } = await sb.from(isC ? 'classes' : 'students').delete().in('id', ids);
  if (error) return toast(errMsg(error));
  CL.sel = null; toast('تم الحذف'); await tClasses();
};
ACTS['sel-move'] = () => {
  const others = CL.classes.filter(c => c.id !== CL.sel.cid);
  modal(`<h3>نقل ${CL.sel.ids.size} طالب/ـة</h3><form class="col" data-form="sel-move-save"><div class="field"><label for="mv-c">إلى الصف</label><select class="input" id="mv-c" name="cls">${others.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div><p class="sub">تبقى رموزهم ونتائجهم كما هي.</p><button class="btn" type="submit">نقل</button></form>`);
};
ACTS['sel-move-save'] = async f => {
  const ids = [...CL.sel.ids], to = f.cls.value;
  const { error } = await sb.from('students').update({ class_id: to }).in('id', ids);
  if (error) return toast(/duplicate|unique/i.test(error.message) ? 'بعض الأرقام موجودة في الصف الآخر' : errMsg(error));
  closeModals(); CL.sel = null; CL.open.add(to); toast('تم النقل'); await tClasses();
};
ACTS['sel-export'] = async () => { await XL();
  const st = (CL.students[CL.sel.cid] || []).filter(s => CL.sel.ids.has(s.id));
  const ws = XLSX.utils.aoa_to_sheet([['الاسم', 'رقم الطالب', 'الرمز']].concat(st.map(s => [s.name, s.student_no, s.code]))), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الرموز'); XLSX.writeFile(wb, 'رموز-محددة.xlsx');
};
ACTS['c-export-all'] = async () => { await XL();
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
    const g = s.gender, who = g === 'f' ? 'ابنتكم' : g === 'm' ? 'ابنكم' : 'ابنكم/ابنتكم';
    ST_PARENT = { phone: s.phone, msg: `السلام عليكم ولي أمر ${s.name}\nهذا ملخص مشاركة ${who} في «تحدّي الدقيقة»${comp ? ' (' + comp.title + ')' : ''} بصف ${c.name}:\n• النقاط: ${r.pts}\n• الترتيب: ${r.pts ? (idx + 1) + ' من ' + sorted.length : '—'}\n• الجولات: ${r.rounds}\n• دقة الإجابات: ${acc}\nشكراً لمتابعتكم وتشجيعكم 🌟\n${T.name ? 'المعلم/ـة: ' + T.name : ''}` };
    const acts = document.querySelector('.st-acts');
    if (acts && !acts.querySelector('[data-act="s-parent"]')) acts.insertAdjacentHTML('afterbegin', `<button class="btn soft" data-act="s-parent">${ic('send')} إرسال ملخص لولي الأمر</button>`);
  } catch(e){}
};
ACTS['s-edit'] = t => {
  const c = ctx(t), s = (CL.students[c.id] || []).find(x => x.id === t.dataset.id); if (!s) return;
  closeModals();
  modal(`<h3>تعديل بيانات الطالب/ـة</h3><form class="col" data-form="s-edit-save" data-id="${s.id}" data-cid="${c.id}">
    <div class="field"><label for="se-n">الاسم</label><input class="input" id="se-n" name="name" value="${esc(s.name)}" required maxlength="60"></div>
    <div class="field"><label for="se-no">رقم الطالب</label><input class="input" id="se-no" name="no" value="${esc(s.student_no || '')}" dir="ltr" inputmode="numeric" maxlength="20"></div>
    <div class="field"><label for="se-ph">رقم الهاتف</label><input class="input" id="se-ph" name="ph" type="tel" value="${esc(s.phone || '')}" dir="ltr" placeholder="مثال: 99999999" maxlength="20"></div>
    <div class="field"><label>الجنس</label><div class="tabs seg-g">${[['m', 'طالب'], ['f', 'طالبة'], ['', 'غير محدد']].map(x => `<label class="${(s.gender || '') === x[0] ? 'on' : ''}"><input type="radio" name="g" value="${x[0]}" ${(s.gender || '') === x[0] ? 'checked' : ''}>${x[1]}</label>`).join('')}</div></div>
    <div class="field"><label for="se-c">الصف</label><select class="input" id="se-c" name="cls">${CL.classes.map(x => `<option value="${x.id}" ${x.id === c.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
    <p class="sub">يبقى رمز الدخول كما هو، والنقل لصف آخر يحتفظ بالرمز.</p>
    <div class="row"><button type="button" class="btn soft" data-act="close-modal">إلغاء</button><button class="btn" type="submit">حفظ</button></div></form>`);
};
ACTS['s-edit-save'] = async f => {
  const row = { name: f.name.value.trim(), student_no: f.no.value.trim(), class_id: f.cls.value, phone: f.ph.value.replace(/[^0-9+]/g, '').slice(0, 20) || null, gender: (f.querySelector('[name=g]:checked') || {}).value || null };
  if (row.name.length < 2) return toast('اكتب الاسم');
  const dup = (CL.students[row.class_id] || []).some(x => x.id !== f.dataset.id && row.student_no && x.student_no === row.student_no);
  if (dup) return toast('رقم الطالب موجود في هذا الصف');
  const { error } = await sb.from('students').update(row).eq('id', f.dataset.id);
  if (error) return toast(/duplicate|unique/i.test(error.message) ? 'رقم الطالب موجود في هذا الصف' : errMsg(error));
  if (row.class_id !== f.dataset.cid) CL.open.add(row.class_id);
  closeModals(); toast('تم الحفظ'); await tClasses();
};
let ST_PARENT = null;
ACTS['s-parent'] = () => {
  if (!ST_PARENT) return;
  let ph = (ST_PARENT.phone || '').replace(/[^0-9]/g, '');
  if (ph.length === 8) ph = '965' + ph; else if (ph.startsWith('00')) ph = ph.slice(2);
  window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(ST_PARENT.msg), '_blank');
};
ACTS['s-wa'] = t => {
  const s = Object.values(CL.students).flat().find(x => x.id === t.dataset.id); if (!s) return;
  const url = location.origin + location.pathname;
  const msg = `مرحباً ${s.name}\nرمز دخولك إلى «تحدّي الدقيقة»: ${s.code}\nللدخول مباشرة اضغط الرابط:\n${url}#/c/${s.code}`;
  let ph = (s.phone || '').replace(/[^0-9]/g, '');
  if (ph.length === 8) ph = '965' + ph; else if (ph.startsWith('00')) ph = ph.slice(2);
  window.open('https://wa.me/' + (ph || '') + '?text=' + encodeURIComponent(msg), '_blank');
  CL.sent.add(s.id); if (t.classList.contains('send-row')) { t.classList.add('sent'); t.querySelector('.send-ic').innerHTML = ic('check'); }
};
ACTS['c-send'] = t => { const c = ctx(t), only = t.dataset.only;
  const st = only === 'never' ? CK.students.filter(x => !CST(x.id).rounds) : CK.students;
  modal(`<div class="col" data-cid="${c.id}"><h3>إرسال الرموز · ${esc(c.name)}</h3><p class="sub">اضغط على كل اسم يفتح واتساب برسالة فيها رمزه ورابط الدخول، ويتعلّم ✓ بعد الإرسال.</p>
    <div class="send-list">${st.map(x => `<button class="send-row ${CL.sent.has(x.id) ? 'sent' : ''}" data-act="s-wa" data-id="${x.id}"><span class="grow"><b>${esc(x.name)}</b><small>${x.phone ? esc(x.phone) : 'بدون رقم: تختار المحادثة بنفسك'}</small></span><span class="send-ic">${ic(CL.sent.has(x.id) ? 'check' : 'send')}</span></button>`).join('')}</div>
    <div class="row"><button class="btn soft" data-act="t-print-codes">${ic('print')} طباعة</button><button class="btn soft" data-act="t-export-codes">${ic('download')} Excel</button></div></div>`);
};
ACTS['c-menu'] = t => {
  const c = ctx(t);
  modal(`<div class="col" data-cid="${c.id}"><h3>إعدادات ${esc(c.name)}</h3><form class="col" data-form="c-rename" data-cid="${c.id}"><div class="field"><label for="cr-n">اسم الصف</label><input class="input" id="cr-n" name="name" value="${esc(c.name)}" required></div><button class="btn sm" type="submit">حفظ الاسم</button></form>
    <div class="field"><label>الطلبة</label><div class="cg">${genderSeg('cg', c.gender || '', [['m', 'بنين'], ['f', 'بنات'], ['mix', 'مختلط']])}</div><p class="sub">يُستخدم في صياغة التقارير للطلبة اللي ما حُدد جنسهم.</p></div>
    <div class="row between card"><div><b>التسجيل الذاتي</b><div class="sub">رابط يسجل به الطلبة بأنفسهم</div></div><button class="btn sm ${c.self_join ? 'soft' : ''}" data-act="t-self" data-on="${c.self_join ? 0 : 1}">${c.self_join ? 'إيقاف' : 'تفعيل'}</button></div>
    ${c.self_join ? `<div class="join-box" dir="ltr">${esc(joinLink(c.join_code))}</div><div class="row"><button class="btn sm" data-act="copy" data-v="${esc(joinLink(c.join_code))}">نسخ الرابط</button><button class="btn sm soft" data-act="c-joinshow">عرض بملء الشاشة</button></div>` : ''}
    <div class="row" style="margin-top:6px"><button class="btn soft" data-act="c-archive">${ic('layers')} أرشفة</button><button class="btn danger" data-act="c-del">${ic('trash')} حذف الصف</button></div></div>`);
};
document.addEventListener('change', e => { const r = e.target.closest && e.target.closest('.cg input'); if (!r) return; const c = ctx(r);
  sb.from('classes').update({ gender: r.value || null }).eq('id', c.id).then(({ error }) => { if (error) return toast(errMsg(error)); c.gender = r.value; r.closest('.seg-g').querySelectorAll('label').forEach(l => l.classList.toggle('on', l.contains(r))); toast('تم الحفظ'); renderClasses(); }); });
ACTS['c-archive'] = async t => { const c = ctx(t);
  if (!await ask(`أرشفة «${c.name}»؟ يختفي من القوائم وتبقى نتائجه، وتقدر تسترجعه من أسفل صفحة الصفوف.`, { ok: 'أرشفة' })) return;
  const { error } = await sb.from('classes').update({ archived: true }).eq('id', c.id); if (error) return toast(errMsg(error));
  closeModals(); CL.open.delete(c.id); toast('تمت الأرشفة'); await tClasses(); };
ACTS['c-unarchive'] = async t => { const { error } = await sb.from('classes').update({ archived: false }).eq('id', t.dataset.id); if (error) return toast(errMsg(error)); toast('تم الاسترجاع'); await tClasses(); };
function nextGradeName(n){
  const o = ORD.find(x => n.includes(x[0])); if (!o || o[1] >= 12) return null;
  return n.replace(o[0], GRADES[o[1]]);
}
ACTS['c-promote'] = async t => { const c = ctx(t), nn = nextGradeName(c.name);
  if (!nn) return toast('ما قدرت أحدد الصف التالي، عدّل الاسم من إعدادات الصف');
  if (!await ask(`ترقية «${c.name}» إلى «${nn}»؟ يبقى الطلبة ورموزهم كما هي.`, { ok: 'ترقية' })) return;
  const { error } = await sb.from('classes').update({ name: nn }).eq('id', c.id); if (error) return toast(errMsg(error));
  toast('تمت الترقية'); await tClasses(); };
ACTS['c-joinshow'] = async t => { const c = ctx(t); if (!c || !c.self_join) return; const link = joinLink(c.join_code);
  let qr = ''; try { await loadJs(QRJS, 'qrcode'); qr = qrSvg(link); } catch(e){}
  const w = document.createElement('div'); w.className = 'joinshow'; w.innerHTML = `<button class="joinshow-x" aria-label="إغلاق">${ic('x')}</button><b>${esc(c.name)}</b><span>امسح الرمز بكاميرا الجوال للتسجيل</span>${qr ? `<div class="joinshow-qr">${qr}</div>` : ''}<code dir="ltr">${esc(link)}</code>`;
  w.querySelector('.joinshow-x').onclick = () => w.remove(); closeModals(); document.body.appendChild(w); };
ACTS['c-del-all'] = async () => {
  const n = CL.classes.length, st = Object.values(CL.students).reduce((x, s) => x + s.length, 0);
  const v = await ask(`سيتم حذف ${n} صف و${st} طالب/ـة وكل النتائج والمسابقات نهائياً.\nللتأكيد اكتب كلمة: حذف`, { title: 'حذف جميع الصفوف', input: '', placeholder: 'حذف', require: 'حذف', ok: 'حذف الكل' });
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
  if (!await ask(`حذف «${c.name}» وكل طلبته ونتائجهم نهائياً؟`)) return;
  const { error } = await sb.from('classes').delete().eq('id', c.id);
  if (error) return toast(errMsg(error)); closeModals(); CL.open.delete(c.id); await tClasses();
};
const GRADES = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر'];
const genderSeg = (name, cur, opts) => `<div class="tabs seg-g">${opts.map(x => `<label class="${(cur || '') === x[0] ? 'on' : ''}"><input type="radio" name="${name}" value="${x[0]}" ${(cur || '') === x[0] ? 'checked' : ''}>${x[1]}</label>`).join('')}</div>`;
/* new class: stage → grade → section → gender, name builds itself */
const NC_ST = [['primary', 'ابتدائي', [1, 2, 3, 4, 5]], ['middle', 'متوسط', [6, 7, 8, 9]], ['secondary', 'ثانوي', [10, 11, 12]], ['university', 'جامعة', [1, 2, 3, 4]]];
const UNI_Y = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة'];
const NC = {};
function ncName(){ if (NC.custom) return NC.custom; if (!NC.grade) return ''; const g = NC.stage === 'university' ? 'السنة ' + UNI_Y[NC.grade - 1] : GRADES[NC.grade - 1]; return g + (NC.sec ? ' / ' + NC.sec : ''); }
function ncHtml(){
  const st = NC_ST.find(x => x[0] === NC.stage), last = (T.settings || {}).lastStage;
  const chip = (act, v, label, on, big) => `<button type="button" class="nc2-c${big ? ' big' : ''}${on ? ' on' : ''}" data-act="${act}" data-v="${v}">${label}</button>`;
  const name = ncName();
  return `<div class="nc2"><h3>صف جديد</h3>
    <div class="nc2-s"><div class="nc2-l">المرحلة ${last && last === NC.stage ? '<small>✓ آخر مرحلة اخترتها</small>' : ''}</div><div class="nc2-g4">${NC_ST.map(x => chip('nc2-st', x[0], x[1], x[0] === NC.stage, 1)).join('')}</div></div>
    ${st ? `<div class="nc2-s"><div class="nc2-l">${NC.stage === 'university' ? 'السنة' : 'الصف'}</div><div class="nc2-gr" style="--n:${st[2].length > 5 ? 5 : st[2].length}">${st[2].map((g, k) => chip('nc2-gr', g, NC.stage === 'university' ? UNI_Y[k] : GRADES[g - 1], g === NC.grade)).join('')}</div></div>` : ''}
    <div class="nc2-s"><div class="nc2-l">الشعبة</div><div class="nc2-gr" style="--n:5">${['أ', 'ب', 'ج', 'د', 'هـ'].map(x => chip('nc2-sec', x, x, x === NC.sec)).join('')}</div></div>
    <div class="nc2-s"><div class="nc2-l">الطلبة</div><div class="nc2-g3">${[['m', 'بنين'], ['f', 'بنات'], ['mix', 'مختلط']].map(x => chip('nc2-gd', x[0], x[1], x[0] === NC.g, 1)).join('')}</div></div>
    <div class="nc2-name">${NC.editing ? `<input class="input" id="nc2-in" value="${esc(name)}" maxlength="60" placeholder="مثال: السادس / 1">` : `<div class="grow"><small>اسم الصف</small><b>${name ? esc(name) : '<span class="muted">اختر الصف</span>'}</b></div><button type="button" class="nc2-pen" data-act="nc2-edit" aria-label="تعديل الاسم">${ic('edit')}</button>`}</div>
    <button class="btn" data-act="nc2-save" ${name || NC.editing ? '' : 'disabled'}>إنشاء الصف</button></div>`;
}
function ncRender(){ const m = document.querySelector('.nc2'); if (m) { m.outerHTML = ncHtml(); if (NC.editing) { const i = document.getElementById('nc2-in'); if (i) { i.focus(); i.select(); } } } }
ACTS['t-add-class'] = () => { closeModals(); Object.assign(NC, { stage: (T.settings || {}).lastStage || 'primary', grade: null, sec: '', g: '', custom: '', editing: false }); modal(ncHtml()); };
ACTS['nc2-st'] = t => { if (NC.stage !== t.dataset.v) NC.grade = null; NC.stage = t.dataset.v; NC.custom = ''; ncRender(); };
ACTS['nc2-gr'] = t => { NC.grade = Number(t.dataset.v); NC.custom = ''; ncRender(); };
ACTS['nc2-sec'] = t => { NC.sec = NC.sec === t.dataset.v ? '' : t.dataset.v; NC.custom = ''; ncRender(); };
ACTS['nc2-gd'] = t => { NC.g = NC.g === t.dataset.v ? '' : t.dataset.v; ncRender(); };
ACTS['nc2-edit'] = () => { NC.editing = true; ncRender(); };
ACTS['nc2-save'] = async t => {
  const inp = document.getElementById('nc2-in'); if (inp) NC.custom = inp.value.replace(/\s+/g, ' ').trim();
  const name = ncName(); if (name.length < 2) return toast('اختر الصف أو اكتب اسمه');
  if (CL.classes.some(c => c.name.trim() === name)) return toast('يوجد صف بنفس الاسم');
  t.disabled = true; t.textContent = 'جارٍ الإنشاء…';
  const style = NC.stage === 'primary' ? 'kids' : NC.stage === 'university' ? 'uni' : 'mid';
  const { data, error } = await sb.from('classes').insert({ teacher_id: T.user.id, name, stage: NC.stage, style, gender: NC.g || null }).select().single();
  if (error) { t.disabled = false; t.textContent = 'إنشاء الصف'; return toast(errMsg(error)); }
  if ((T.settings || {}).lastStage !== NC.stage) saveSettings({ lastStage: NC.stage });
  closeModals(); CL.open.add(data.id); CL.tab = 'classes';
  if (location.hash !== '#/t/classes') location.hash = '#/t/classes'; else await tClasses();
  setTimeout(() => ACTS['aw-start']({ dataset: { cid: data.id, made: data.name } }), location.hash === '#/t/classes' ? 50 : 700);
};
ACTS['nc-name'] = t => { const f = t.closest('form'); const sec = (f.querySelector('.nc-secs .on') || {}).dataset; f.name.value = f.g.value ? f.g.value + (sec && sec.v ? ' / ' + sec.v : '') : f.name.value; };
ACTS['nc-sec'] = t => { const on = t.classList.contains('on'); t.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('on')); if (!on) t.classList.add('on'); const f = t.closest('form'); if (f.g.value) ACTS['nc-name'](f.g); else if (!on) f.name.value = (f.name.value.split('/')[0].trim() ? f.name.value.split('/')[0].trim() + ' / ' : '') + t.dataset.v; };
ACTS['nc-m'] = t => { const f = t.closest('form'); f.m.value = t.dataset.v; t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); f.querySelectorAll('.nc-p').forEach(p => p.classList.toggle('hide', p.dataset.m !== t.dataset.v)); };
ACTS['t-save-class'] = async f => {
  const name = f.name.value.trim(); if (name.length < 2) return toast('اكتب اسم الصف');
  if (CL.classes.some(c => c.name.trim() === name)) return toast('يوجد صف بنفس الاسم');
  const g = (f.querySelector('[name=gender]:checked') || {}).value || null, m = f.m.value;
  let rows = [];
  if (m === 'paste') rows = parsePaste(f.names.value);
  if (m === 'file') { const file = f.file.files[0]; if (!file) return toast('اختر ملف الأسماء'); try { rows = parseStudents(await readRows(file)); } catch(e){ return toast('تعذّرت قراءة الملف'); } }
  if (g === 'm' || g === 'f') rows.forEach(r => { if (!r.gender) r.gender = g; });
  const btn = f.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'جارٍ الإنشاء…';
  const { data, error } = await sb.from('classes').insert({ teacher_id: T.user.id, name, style: 'mid', gender: g }).select().single();
  if (error) { btn.disabled = false; btn.textContent = 'إنشاء الصف'; return toast(errMsg(error)); }
  let added = 0;
  try { for (let i = 0; i < rows.length; i += 150) { const r = await rpc('add_students', { p_class: data.id, p_rows: rows.slice(i, i + 150) }); added += r.added.length; } } catch(e){ toast(errMsg(e)); }
  if (m === 'link') { try { await rpc('set_self_join', { p_class: data.id, p_on: true }); } catch(e){} }
  closeModals(); CL.open.add(data.id); CL.flash = { cid: data.id, n: added, link: m === 'link' }; CL.tab = 'classes';
  if (location.hash !== '#/t/classes') location.hash = '#/t/classes'; else await tClasses();
};

/* ---- multi-class upload ---- */
ACTS['t-multi-up'] = () => document.getElementById('mxl').click();
ACTS['t-multi-sample'] = async () => { await XL();
  const ws = XLSX.utils.aoa_to_sheet([['الاسم', 'رقم الطالب', 'الصف', 'الهاتف', 'الجنس'], ['سارة العتيبي', '1001', 'السادس / أ', '99999999', 'طالبة'], ['ليان الزامل', '1002', 'السادس / أ', '', 'طالبة'], ['نور الحربي', '2001', 'السادس / ب', '', 'طالب']]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'الطلبة'); XLSX.writeFile(wb, 'نموذج-الصفوف.xlsx');
};
function parseMulti(rows){
  if (!rows.length) return [];
  const head = rows[0].map(x => String(x).trim().toLowerCase());
  const isPh = h => /هاتف|جوال|موبايل|phone|mobile|واتس/.test(h), gi = head.findIndex(h => /جنس|gender|النوع/.test(h)), gv = r => gi >= 0 ? String(r[gi] == null ? '' : r[gi]).trim() : '';
  let ni = head.findIndex(h => /اسم|name/.test(h)), ri = head.findIndex(h => !isPh(h) && /رقم|number|\bid\b|\bno\b/.test(h)), ci = head.findIndex(h => /صف|فصل|شعبة|class/.test(h)), pi = head.findIndex(isPh), start = 1;
  if (ni < 0 || ci < 0) { ni = 0; ri = 1; ci = 2; pi = rows[0].length > 3 ? 3 : -1; start = 0; }
  return rows.slice(start).map(r => ({ name: String(r[ni] == null ? '' : r[ni]).trim(), student_no: ri >= 0 ? String(r[ri] == null ? '' : r[ri]).trim() : '', cls: String(r[ci] == null ? '' : r[ci]).trim(), phone: pi >= 0 ? String(r[pi] == null ? '' : r[pi]).trim() : '', gender: gv(r) })).filter(x => x.name && x.cls);
}
ACTS['t-multi-chosen'] = async t => {
  const file = t.files && t.files[0];
  if (!file) return;
  try {
    const list = parseMulti(await readRows(file));
    t.value = '';
    if (!list.length) return toast('لم أجد بيانات. تأكد من الأعمدة: الاسم، رقم الطالب، الصف');
    const g = {};
    list.forEach(x => (g[x.cls] = g[x.cls] || []).push({ name: x.name, student_no: x.student_no, phone: x.phone, gender: x.gender }));
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
  catch(e){ copyBox(t.dataset.v); }
};
ACTS['t-self'] = async t => {
  ctx(t);
  try {
    const code = await rpc('set_self_join', { p_class: CK.cls.id, p_on: t.dataset.on === '1' });
    closeModals(); await tClasses(); if (t.dataset.on === '1') toast('تم التفعيل، الرابط في صفحة الصف');
  } catch(e){ toast(errMsg(e)); }
};
ACTS['t-sample-students'] = async () => { await XL();
  const ws = XLSX.utils.aoa_to_sheet([['الاسم', 'رقم الطالب', 'الهاتف', 'الجنس'], ['سارة العتيبي', '1001', '99999999', 'طالبة'], ['ليان الزامل', '1002', '', 'طالبة']]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'الطلبة'); XLSX.writeFile(wb, 'نموذج-الطلبة.xlsx');
};
async function readRows(file){ await XL();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }).filter(r => r.some(c => String(c).trim() !== ''));
}
function parseStudents(rows){
  if (!rows.length) return [];
  const head = rows[0].map(x => String(x).trim().toLowerCase());
  const isPh = h => /هاتف|جوال|موبايل|phone|mobile|واتس/.test(h), gi = head.findIndex(h => /جنس|gender|النوع/.test(h)), gv = r => gi >= 0 ? String(r[gi] == null ? '' : r[gi]).trim() : '';
  let ni = head.findIndex(h => /اسم|name/.test(h)), ri = head.findIndex(h => !isPh(h) && /رقم|number|\bid\b|\bno\b/.test(h)), pi = head.findIndex(isPh), start = 0;
  if (ni >= 0) { start = 1; if (ri < 0) ri = head.length > 1 ? (ni === 0 ? 1 : 0) : -1; }
  else {
    const numeric = i => rows.every(r => /^\d+$/.test(String(r[i] == null ? '' : r[i]).trim()));
    if (rows[0].length > 1 && numeric(0)) { ri = 0; ni = 1; } else { ni = 0; ri = rows[0].length > 1 ? 1 : -1; }
  }
  return rows.slice(start).map(r => ({ name: String(r[ni] == null ? '' : r[ni]).trim(), student_no: ri >= 0 ? String(r[ri] == null ? '' : r[ri]).trim() : '', phone: pi >= 0 ? String(r[pi] == null ? '' : r[pi]).trim() : '', gender: gv(r) })).filter(x => x.name);
}
ACTS['t-xl-chosen'] = async t => {
  const file = t.files && t.files[0];
  if (!file) return;
  try {
    CK.pending = parseStudents(await readRows(file));
    t.value = '';
    if (!CK.pending.length) return toast('لم أجد أسماء في الملف');
    const haveN = new Set(CK.students.map(x => x.name.trim())), haveNo = new Set(CK.students.map(x => String(x.student_no || '')).filter(Boolean)), seenN = new Set(), seenNo = new Set();
    let dups = 0, noNo = 0;
    const flags = CK.pending.map(r => { let f = ''; if (haveN.has(r.name) || seenN.has(r.name) || (r.student_no && (haveNo.has(r.student_no) || seenNo.has(r.student_no)))) { f = 'dup'; dups++; } else if (!r.student_no) { f = 'nono'; noNo++; } seenN.add(r.name); if (r.student_no) seenNo.add(r.student_no); return f; });
    modal(`<h3>معاينة الملف</h3><div class="pv-sum"><span class="ok">${CK.pending.length - dups} جديد</span>${dups ? `<span class="dup">${dups} مكرر سيتم تخطيه</span>` : ''}${noNo ? `<span class="nono">${noNo} بدون رقم</span>` : ''}</div>
      <div class="tbl-wrap pv-tbl"><table><thead><tr><th>#</th><th>الاسم</th><th>رقم الطالب</th></tr></thead><tbody>${CK.pending.map((r, i) => `<tr class="${flags[i]}"><td>${i + 1}</td><td>${esc(r.name)}${flags[i] === 'dup' ? ' <small>مكرر</small>' : ''}</td><td>${esc(r.student_no) || '—'}</td></tr>`).join('')}</tbody></table></div>
      <div class="row" style="margin-top:14px"><button class="btn" data-act="t-confirm-upload" ${CK.pending.length - dups ? '' : 'disabled'}>إضافة ${CK.pending.length - dups} طالب</button><button class="btn soft" data-act="close-modal" style="width:auto">إلغاء</button></div>`);
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
    CL.open.add(CK.cls.id); await tClasses();
  } catch(e){ closeModals(); toast(errMsg(e)); }
};
ACTS['t-add-one'] = t => ACTS['t-add-students'](t);
ACTS['t-add-students'] = t => { const c = ctx(t); const m = t.dataset.m || 'paste';
  modal(`<div class="col as" data-cid="${c.id}"><h3>إضافة طلبة · ${esc(c.name)}</h3><div class="tabs as-tabs">${[['paste', 'لصق قائمة'], ['one', 'طالب واحد'], ['file', 'ملف Excel']].map(x => `<button type="button" class="${x[0] === m ? 'on' : ''}" data-act="as-tab" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>
    <form class="col as-p ${m === 'paste' ? '' : 'hide'}" data-m="paste" data-form="t-save-paste"><textarea class="input paste-ta" name="names" rows="8" placeholder="اسم الطالب في كل سطر&#10;ويمكن إضافة الرقم بعد فاصلة:&#10;سارة العتيبي، 1001"></textarea><div class="paste-info"></div><button class="btn" type="submit">إضافة</button></form>
    <form class="col as-p ${m === 'one' ? '' : 'hide'}" data-m="one" data-form="t-save-one"><div class="field"><label for="o-n">الاسم</label><input class="input" id="o-n" name="name"></div>
      <div class="row"><div class="field grow"><label for="o-no">رقم الطالب</label><input class="input" id="o-no" name="no" dir="ltr" inputmode="numeric"></div><div class="field grow"><label for="o-ph">الهاتف (اختياري)</label><input class="input" id="o-ph" name="ph" type="tel" dir="ltr" placeholder="99999999"></div></div>
      <div class="field"><label>الجنس</label>${genderSeg('g', c.gender === 'm' || c.gender === 'f' ? c.gender : '', [['m', 'طالب'], ['f', 'طالبة'], ['', 'غير محدد']])}</div><button class="btn" type="submit">إضافة</button></form>
    <div class="col as-p ${m === 'file' ? '' : 'hide'}" data-m="file"><p class="sub">العمود الأول الاسم، والثاني رقم الطالب، ويمكن إضافة الهاتف والجنس. تشوف معاينة قبل الحفظ.</p><button class="btn" data-act="t-upload">${ic('upload')} اختيار الملف</button><button class="btn soft" data-act="t-sample-students">${ic('download')} تنزيل نموذج</button></div></div>`);
};
ACTS['as-tab'] = t => { const w = t.closest('.as'); t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); w.querySelectorAll('.as-p').forEach(p => p.classList.toggle('hide', p.dataset.m !== t.dataset.v)); };
async function addRows(rows){
  const g = CK.cls.gender; if (g === 'm' || g === 'f') rows.forEach(r => { if (!r.gender) r.gender = g; });
  let added = 0, skipped = 0;
  for (let i = 0; i < rows.length; i += 150) { const r = await rpc('add_students', { p_class: CK.cls.id, p_rows: rows.slice(i, i + 150) }); added += r.added.length; skipped += r.skipped; }
  return { added, skipped };
}
ACTS['t-save-paste'] = async f => {
  const have = new Set(CK.students.map(x => x.name.trim())), rows = parsePaste(f.names.value).filter(r => !have.has(r.name));
  if (!rows.length) return toast('الصق أسماء جديدة أولاً');
  const btn = f.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'جارٍ الإضافة…';
  try { const r = await addRows(rows); closeModals(); toast(`أُضيف ${r.added}` + (r.skipped ? ` وتم تخطي ${r.skipped} مكرر` : '')); CL.open.add(CK.cls.id); await tClasses(); }
  catch(e){ btn.disabled = false; btn.textContent = 'إضافة'; toast(errMsg(e)); }
};
ACTS['t-save-one'] = async f => {
  if (f.name.value.trim().length < 2) return toast('اكتب الاسم');
  try {
    const r = await rpc('add_students', { p_class: CK.cls.id, p_rows: [{ name: f.name.value, student_no: f.no.value, phone: f.ph.value, gender: (f.querySelector('[name=g]:checked') || {}).value || '' }] });
    if (!r.added.length) return toast('الرقم موجود مسبقاً في الصف');
    toast('تمت الإضافة، أضف التالي'); f.reset(); f.name.focus(); CL.open.add(CK.cls.id); tClasses();
  } catch(e){ toast(errMsg(e)); }
};
ACTS['t-regen'] = async t => { ctx(t); closeModals();
  if (!await ask('إنشاء رمز جديد؟ سيتوقف الرمز القديم عن العمل.')) return;
  try { await rpc('regenerate_code', { p_student: t.dataset.id }); await tClasses(); toast('تم إنشاء رمز جديد'); } catch(e){ toast(errMsg(e)); }
};
function snack(msg, onUndo, onCommit){
  const old = document.getElementById('snack'); if (old && old._commit) old._commit();
  const el = document.createElement('div'); el.id = 'snack'; el.className = 'snack'; el.innerHTML = `<span>${esc(msg)}</span><button type="button">تراجع</button>`;
  let done = false; const commit = () => { if (done) return; done = true; el.remove(); onCommit(); };
  el._commit = commit;
  el.querySelector('button').onclick = () => { if (done) return; done = true; el.remove(); onUndo(); };
  document.body.appendChild(el); setTimeout(commit, 5000);
}
window.addEventListener('pagehide', () => { const s2 = document.getElementById('snack'); if (s2 && s2._commit) s2._commit(); });
ACTS['t-del-student'] = t => { const c = ctx(t); closeModals();
  const arr = CL.students[c.id] || [], i = arr.findIndex(x => x.id === t.dataset.id); if (i < 0) return;
  const [st] = arr.splice(i, 1); renderClasses();
  snack(`تم حذف ${st.name}`, () => { arr.splice(i, 0, st); renderClasses(); }, async () => { const { error } = await sb.from('students').delete().eq('id', st.id); if (error) { toast(errMsg(error)); await tClasses(); } });
};
ACTS['t-export-codes'] = async t => { ctx(t); await XL();
  const rows = [['الاسم', 'رقم الطالب', 'الهاتف', 'الرمز']].concat(CK.students.map(s => [s.name, s.student_no, s.phone || '', s.code]));
  const ws = XLSX.utils.aoa_to_sheet(rows), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الرموز');
  XLSX.writeFile(wb, 'رموز-' + CK.cls.name.replace(/[\\/:*?"<>|]/g, '-') + '.xlsx');
};
const QRJS = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
const XLSXJS = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
const XL = () => loadJs(XLSXJS, 'XLSX').catch(() => { throw new Error('تعذر تحميل أداة Excel، تأكد من الاتصال'); });
function loadJs(src, g){ return new Promise((ok, no) => { if (window[g]) return ok(); const sc = document.createElement('script'); sc.src = src; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); }); }
function qrSvg(text){ try { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); } catch(e){ return ''; } }
ACTS['t-print-codes'] = async t => { ctx(t);
  const url = location.origin + location.pathname;
  let qr = false; try { await loadJs(QRJS, 'qrcode'); qr = !!window.qrcode; } catch(e){}
  document.getElementById('print-area').innerHTML = `<h2 style="text-align:center;margin:0 0 10px">${esc(CK.cls.name)} — رموز الدخول إلى تحدّي الدقيقة</h2><p style="text-align:center;direction:ltr;margin:0 0 12px">${esc(url)}</p>` +
    `<div class="pcards">${CK.students.map(s => `<div class="pcard${qr ? ' qr' : ''}">${qr ? `<div class="pq">${qrSvg(url + '#/c/' + s.code)}</div>` : ''}<div><b>${esc(s.name)}</b><div class="pc">${esc(s.code)}</div><small>${esc(s.student_no)}</small></div></div>`).join('')}</div>` + (qr ? '<p style="text-align:center;font-size:12px;margin-top:10px">امسح الرمز بكاميرا الجوال للدخول مباشرة، أو اكتب الرمز في الموقع.</p>' : '');
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
      <a class="btn cp-res" href="#/t/results/${g[0].class_id}">${ic('chart')} النتائج والترتيب${ph === 'knockout' || ph === 'finished' ? ' والتصفيات' : ''}</a>
      <div class="row"><button class="btn sm soft" data-act="cp-edit" data-g="${c.group_id}">${ic('edit')} الإعدادات</button><button class="btn sm soft" data-act="cp-end" data-g="${c.group_id}">إنهاء المسابقة</button></div></div>`; }).join('')
      : '<div class="card center muted">لا توجد مسابقات نشطة.</div>') +
    (groups.length && free.length ? `<p class="sub">صفوف بلا مسابقة: ${free.map(c => esc(c.name)).join('، ')}</p>` : '') +
'';
}
ACTS['t-remind'] = t => {
  const s = (T.homeStats || []).find(x => x.c.id === t.dataset.c); if (!s) return;
  const left = s.rs.filter(r => !r.played_today).map(r => r.name);
  const msg = `تذكير من تحدّي الدقيقة ⏱️\nجولة اليوم ما زالت مفتوحة لصف ${s.c.name} حتى منتصف الليل.\nلم يلعب بعد (${left.length}): ${left.join('، ')}\nادخلوا من هنا: ${location.origin + location.pathname}`;
  open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
};
ACTS['cp-new'] = async () => {
  if (!CL.classes.length) return toast('أضف صفاً أولاً');
  await loadCurricula().catch(() => {});
  T.compEdit = 'new'; CC.sel = new Set(CL.classes.filter(c => !CL.comps[c.id]).map(c => c.id));
  const st = T.settings || {}; CC.qtypes = (st.qtypes || ['curriculum', 'general', 'quick']).slice(); CC.diff = st.difficulty || 'normal'; CC.cu = ''; CC.lessons = []; CC.style = (CL.classes.find(c => CC.sel.has(c.id)) || CL.classes[0]).style || 'mid';
  renderClasses();
};
ACTS['cp-edit'] = async t => {
  await loadCurricula().catch(() => {});
  T.compEdit = t.dataset.g;
  const g = CL.allComps.filter(c => c.group_id === T.compEdit);
  CC.sel = new Set(g.map(c => c.class_id));
  const first = CL.byId[g[0].class_id] || {}; CC.qtypes = (g[0].qtypes || first.qtypes || ['curriculum', 'general', 'quick']).slice(); CC.diff = g[0].difficulty || 'normal'; CC.cu = g[0].curriculum_id || ''; CC.lessons = (g[0].lessons || []).slice(); CC.style = first.style || 'mid';
  renderClasses();
};
ACTS['cp-cancel'] = () => { T.compEdit = null; renderClasses(); };
ACTS['cp-end'] = async t => {
  if (!await ask('إنهاء هذه المسابقة لكل صفوفها؟ تبقى النتائج محفوظة.')) return;
  const { error } = await sb.from('competitions').update({ status: 'finished' }).eq('group_id', t.dataset.g);
  if (error) return toast(errMsg(error)); await tClasses();
};
const CF_STYLES = [['kids', 'مرح', 'ابتدائي'], ['mid', 'مرح قليلاً', 'متوسط'], ['uni', 'هادئ', 'ثانوي وجامعة']];
function compForm(){
  const isNew = T.compEdit === 'new', t = todayKW();
  const g = isNew ? null : CL.allComps.find(c => c.group_id === T.compEdit);
  const v = g || { title: 'مسابقة تحدّي الدقيقة', start_date: t, points_end_date: addDays(t, 4), end_date: addDays(t, 7), group_size: 6, qualifiers: 8, round_window_hours: 24 };
  const opt = (val, lab) => `<option value="${val}" ${Number(v.round_window_hours) === val ? 'selected' : ''}>${lab}</option>`;
  const step = (name, label, val, min, max, hint) => `<div class="set-row cf-row"><span class="grow">${label}${hint ? `<small class="cf-hint">${hint}</small>` : ''}</span><div class="cf-step"><button type="button" data-act="cf-step" data-n="${name}" data-d="-1" aria-label="إنقاص">−</button><input name="${name}" type="number" inputmode="numeric" min="${min}" max="${max}" value="${val}"><button type="button" data-act="cf-step" data-n="${name}" data-d="1" aria-label="زيادة">+</button></div></div>`;
  const date = (name, label, val) => `<label class="set-row cf-row"><span class="grow">${label}</span><input class="cf-date" type="date" name="${name}" value="${val}" required></label>`;
  return `<form class="col cf" data-form="cp-save">
    <div class="cf-hero"><span class="cf-hero-ic">${ic('trophy')}</span><div class="grow"><b>${isNew ? 'مسابقة جديدة' : 'إعدادات المسابقة'}</b><div class="sub" id="cf-sum"></div></div></div>
    <div class="set-h">العنوان</div>
    <div class="set-grp"><label class="set-row cf-row"><input class="cf-in" name="title" value="${esc(v.title)}" required maxlength="80" placeholder="عنوان المسابقة"></label></div>
    <div class="set-h cf-h"><span>الصفوف المشاركة <em id="cf-cnt"></em></span><button type="button" class="link" data-act="cp-all">تحديد الكل</button></div>
    <div class="set-grp">${CL.classes.map(c => { const other = CL.comps[c.id] && CL.comps[c.id].group_id !== T.compEdit; return `<button type="button" class="set-row cf-cls ${CC.sel.has(c.id) ? 'on' : ''}" data-act="cp-cls" data-id="${c.id}"><span class="cl-ic" style="--h:${clsHue(c.name)};width:34px;height:34px;border-radius:9px;font-size:13px">${esc(clsBadge(c.name))}</span><span class="grow"><b>${esc(c.name)}</b><small class="cf-hint">${(CL.students[c.id] || []).length} طالب/ـة${other ? ' · في مسابقة أخرى' : ''}</small></span><span class="cf-chk">${ic('check')}</span></button>`; }).join('')}</div>
    <div class="set-f">لكل صف ترتيبه وتصفياته الخاصة، والإعدادات واحدة للجميع.</div>
    <div class="set-h">نمط واجهة الطلبة</div>
    <div class="cf-themes">${CF_STYLES.map(x => `<button type="button" class="cf-th ${CC.style === x[0] ? 'on' : ''}" data-act="cp-style" data-v="${x[0]}"><span class="cf-ph cf-ph-${x[0]}"><i class="t"></i><i class="q"></i><i class="o"></i><i class="o"></i><i class="o"></i></span><b>${x[1]}</b><small>${x[2]}</small></button>`).join('')}</div>
    <button type="button" class="btn sm soft cf-prev" data-act="cf-preview">${ic('play')} معاينة النمط كما يراه الطالب</button>
    <div class="set-f">يُطبَّق على كل الصفوف المشاركة.</div>
    <div class="set-h">المواعيد</div>
    <div class="set-grp">${date('start_date', 'بداية جمع النقاط', v.start_date)}${date('points_end_date', 'نهاية جمع النقاط', v.points_end_date)}${date('end_date', 'نهاية المسابقة', v.end_date)}
      <div class="cf-tl" id="cf-tl"></div><div class="cf-pool" id="cf-pool"></div>
      <button type="button" class="set-row cf-link" data-act="t-suggest"><span class="set-ic" style="background:#5856D6">${ic('star')}</span><span class="grow">اقتراح التواريخ تلقائياً</span></button></div>
    <div class="set-h">التصفيات</div>
    <div class="set-grp">${step('group_size', 'حجم المجموعة', v.group_size, 2, 40, 'عدد الطلبة في كل مجموعة')}${step('qualifiers', 'المتأهلون من كل صف', v.qualifiers, 2, 64, 'يدخلون مرحلة خروج المغلوب')}
      <label class="set-row cf-row"><span class="grow">مدة كل دور</span><select class="cf-sel" name="round_window_hours">${opt(12, '12 ساعة')}${opt(24, 'يوم')}${opt(48, 'يومان')}${opt(72, '3 أيام')}</select></label></div>
    <div class="set-h">الأسئلة</div>
    <div class="cf-qt">${QTYPES.map(q => `<button type="button" class="cf-chip ${CC.qtypes.includes(q[0]) ? 'on' : ''}" data-act="cp-qt" data-v="${q[0]}">${ic(q[3])}<span>${q[1]}</span></button>`).join('')}</div>
    <div class="set-grp"><label class="set-row cf-row"><span class="grow">المنهج</span><select class="cf-sel" name="cu" data-change="cp-cu">${cuOptions(CC.cu, 'كل المعتمد')}</select></label>
      <div class="cf-les" id="cf-les"></div>
      <div class="set-row cf-row cf-col"><span>مستوى الصعوبة</span><div class="tabs">${DIFF.map(d => `<button type="button" class="${CC.diff === d[0] ? 'on' : ''}" data-act="cp-diff" data-v="${d[0]}">${d[1]}</button>`).join('')}</div><small class="cf-hint" id="cp-diff-d">${(DIFF.find(d => d[0] === CC.diff) || DIFF[1])[2]}</small></div>
      <button type="button" class="set-row cf-link" data-act="go-qset"><span class="set-ic" style="background:#C8102E">${ic('layers')}</span><span class="grow">إدارة المناهج</span><span class="set-chev">${ic('back')}</span></button></div>
    <div class="set-f">كل جولة: 4 أسئلة × 15 ثانية. جولة رسمية يومياً، والتدريب مفتوح.</div>
    <div class="row w-nav cf-bar"><button type="button" class="btn soft" data-act="cp-cancel">إلغاء</button><button class="btn" type="submit">${isNew ? 'إنشاء المسابقة' : 'حفظ'}</button></div></form>`;
}
/* live summary + timeline for the competition form */
function cfDays(a, b){ return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5); }
function cfUpdate(){
  const f = document.querySelector('[data-form="cp-save"]'); if (!f) return;
  const n = CC.sel.size, st = [...CC.sel].reduce((x, id) => x + (CL.students[id] || []).length, 0);
  const s = f.start_date.value, p = f.points_end_date.value, e = f.end_date.value;
  const pd = s && p ? cfDays(s, p) + 1 : 0, kd = p && e ? cfDays(p, e) : 0;
  const cnt = document.getElementById('cf-cnt'); if (cnt) cnt.textContent = `(${n} من ${CL.classes.length})`;
  const sum = document.getElementById('cf-sum'); if (sum) sum.textContent = `${n} صف · ${st} طالب/ـة · ${pd > 0 ? pd + ' يوم نقاط' : ''}${kd > 0 ? ' ثم ' + kd + ' يوم تصفيات' : ''}`;
  const tl = document.getElementById('cf-tl'); if (!tl) return;
  if (pd <= 0 || kd < 0) { tl.innerHTML = '<span class="cf-bad">تحقق من ترتيب التواريخ</span>'; return; }
  const tot = pd + Math.max(kd, 0);
  tl.innerHTML = `<div class="cf-bar2"><i class="pts" style="flex:${pd}"><span>نقاط · ${pd} يوم</span></i>${kd > 0 ? `<i class="ko" style="flex:${kd}"><span>تصفيات · ${kd}</span></i>` : ''}</div><div class="cf-dates"><span>${esc(fmtDate(s))}</span><span>${esc(fmtDate(e))}</span></div>`;
  tl.title = tot + ' يوم';
  cfPool(pd);
}
const POOL = {};
async function cfPool(pd){
  const el = document.getElementById('cf-pool'); if (!el) return;
  const les = CC.cu && CC.lessons && CC.lessons.length ? CC.lessons : null;
  const key = (CC.qtypes || []).join(',') + '|' + (CC.cu || '') + '|' + (les || []).join('§');
  if (POOL[key] == null) { el.textContent = ''; try { POOL[key] = await rpc('question_pool', { p_types: CC.qtypes || [], p_cu: CC.cu || null, p_lessons: les }); } catch(e){ return; } }
  const n = POOL[key], days = Math.floor(n / 4), ok = days >= pd;
  const x = document.getElementById('cf-pool'); if (!x) return;
  x.className = 'cf-pool ' + (ok ? 'ok' : 'low');
  x.innerHTML = `${ic(ok ? 'check' : 'help')} <span>بنك الأسئلة: ${n} سؤالاً معتمداً، تكفي لـ ${days} يوماً دون تكرار${ok ? '' : `. تحتاج ${pd * 4 - n} سؤالاً إضافياً لتغطية ${pd} يوم`}</span>`;
}
ACTS['cf-preview'] = () => themePreview(CC.style || 'mid');
function themePreview(th){
  const old = document.getElementById('pvw'); if (old) old.remove();
  const w = document.createElement('div'); w.id = 'pvw'; w.className = 'pvw';
  const seg = () => CF_STYLES.map(x => `<button type="button" class="${x[0] === th ? 'on' : ''}" data-v="${x[0]}">${x[1]}</button>`).join('');
  w.innerHTML = `<div class="pvw-top"><div class="tabs">${seg()}</div><button type="button" class="pvw-x" aria-label="إغلاق">${ic('x')}</button></div>
    <div class="pvw-phone"><iframe title="معاينة" src="${location.pathname}#/p/${th}"></iframe></div>
    <div class="pvw-f">معاينة تجريبية، لا تُحتسب نقاط ولا يراها الطلبة</div>`;
  w.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('pvw-x')) { w.remove(); return; }
    if (b.dataset.v) { th = b.dataset.v; w.querySelector('.tabs').innerHTML = seg(); w.querySelector('iframe').src = location.pathname + '#/p/' + th; }
  });
  document.body.appendChild(w);
}
ACTS['cf-step'] = t => { const i = t.parentElement.querySelector('input'); const v = Math.min(Number(i.max), Math.max(Number(i.min), (Number(i.value) || 0) + Number(t.dataset.d))); i.value = v; };
document.addEventListener('input', e => { if (e.target.closest && e.target.closest('[data-form="cp-save"]')) cfUpdate(); });
/* lessons of the chosen curriculum: all by default, teacher can narrow (e.g. final-exam review) */
const CFL = {};
async function cfLessons(){
  const el = document.getElementById('cf-les'); if (!el) return;
  const cu = CC.cu; if (!cu) { el.innerHTML = ''; return; }
  if (!CFL[cu]) { const r = await sb.from('questions').select('lesson').eq('curriculum_id', cu).eq('status', 'approved').not('lesson', 'is', null).limit(5000);
    const cnt = {}, order = []; (r.data || []).forEach(q => { if (!cnt[q.lesson]) order.push(q.lesson); cnt[q.lesson] = (cnt[q.lesson] || 0) + 1; }); CFL[cu] = order.map(l => [l, cnt[l]]); }
  const x = document.getElementById('cf-les'); if (!x || CC.cu !== cu) return;
  const ls = CFL[cu]; CC.lessons = (CC.lessons || []).filter(l => ls.some(y => y[0] === l));
  if (!ls.length) { x.innerHTML = ''; return; }
  const all = !CC.lessons.length;
  x.innerHTML = `<div class="cf-les-h"><span>الدروس</span><small>${all ? 'كل الدروس' : CC.lessons.length + ' من ' + ls.length}</small></div><div class="cf-les-l">
    <button type="button" class="cf-chip sm ${all ? 'on' : ''}" data-act="cp-les" data-l="">${ic('check')}<span>كل الدروس</span></button>
    ${ls.map(([l, n]) => `<button type="button" class="cf-chip sm ${!all && CC.lessons.includes(l) ? 'on' : ''}" data-act="cp-les" data-l="${esc(l)}">${ic('check')}<span>${esc(l)}</span><em>${n}</em></button>`).join('')}</div>`;
}
ACTS['cp-cu'] = t => { CC.cu = t.value; CC.lessons = []; cfLessons(); cfUpdate(); };
ACTS['cp-les'] = t => { const l = t.dataset.l;
  if (!l) CC.lessons = []; else if (CC.lessons.includes(l)) CC.lessons = CC.lessons.filter(x => x !== l); else CC.lessons.push(l);
  if (CFL[CC.cu] && CC.lessons.length === CFL[CC.cu].length) CC.lessons = [];
  cfLessons(); cfUpdate(); };
function cpKeep(){ const f = document.querySelector('[data-form="cp-save"]'); if (f && f.cu) CC.cu = f.cu.value; }
ACTS['cp-style'] = t => { CC.style = t.dataset.v; t.parentElement.querySelectorAll('.cf-th').forEach(b => b.classList.toggle('on', b === t)); };
ACTS['cp-diff'] = t => { CC.diff = t.dataset.v; t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); const d = document.getElementById('cp-diff-d'); if (d) d.textContent = DIFF.find(x => x[0] === CC.diff)[2]; };
ACTS['cp-cls'] = t => { const id = t.dataset.id; CC.sel.has(id) ? CC.sel.delete(id) : CC.sel.add(id); t.classList.toggle('on'); cfUpdate(); };
ACTS['cp-all'] = () => { CL.classes.forEach(c => CC.sel.add(c.id)); document.querySelectorAll('[data-act="cp-cls"]').forEach(b => b.classList.add('on')); cfUpdate(); };
ACTS['cp-qt'] = t => { const k = t.dataset.v; if (CC.qtypes.includes(k)) { if (CC.qtypes.length === 1) return toast('اختر نوعاً واحداً على الأقل'); CC.qtypes = CC.qtypes.filter(x => x !== k); } else CC.qtypes.push(k); t.classList.toggle('on'); };
ACTS['t-suggest'] = () => {
  const f = document.querySelector('[data-form="cp-save"]');
  const start = f.start_date.value || todayKW();
  const q = Math.max(2, Number(f.qualifiers.value) || 8), rounds = Math.ceil(Math.log2(q));
  const days = Math.ceil((Number(f.round_window_hours.value) || 24) / 24);
  const pe = addDays(start, 4);
  f.start_date.value = start; f.points_end_date.value = pe; f.end_date.value = addDays(pe, rounds * days);
  cfUpdate(); toast('5 أيام لجمع النقاط ثم ' + rounds + ' أدوار تصفيات');
};
ACTS['cp-save'] = async f => {
  cpKeep();
  const ids = [...CC.sel];
  if (!ids.length) return toast('اختر صفاً واحداً على الأقل');
  const p = { title: f.title.value.trim() || 'مسابقة تحدّي الدقيقة', start_date: f.start_date.value, points_end_date: f.points_end_date.value, end_date: f.end_date.value,
    group_size: Number(f.group_size.value), qualifiers: Number(f.qualifiers.value), round_window_hours: Number(f.round_window_hours.value),
    curriculum_id: CC.cu || null, difficulty: CC.diff || 'normal', qtypes: CC.qtypes, lessons: CC.cu && CC.lessons && CC.lessons.length ? CC.lessons : null };
  if (!(p.start_date <= p.points_end_date && p.points_end_date <= p.end_date)) return toast('تحقق من ترتيب التواريخ');
  const isNew = T.compEdit === 'new', gid = isNew ? crypto.randomUUID() : T.compEdit;
  const inGroup = isNew ? [] : CL.allComps.filter(c => c.group_id === gid);
  const moving = ids.filter(id => CL.comps[id] && CL.comps[id].group_id !== gid);
  if (moving.length && !await ask(`${moving.length} صف مشترك في مسابقة أخرى، سيتم إنهاؤها لهذه الصفوف. متابعة؟`)) return;
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
const QPD = 4; // questions a student plays per day
const qNorm = s => String(s || '').replace(/[ً-ْـ]/g, '').replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase();
async function tQuestions(){
  const [own, glob, st] = await Promise.all([
    sb.from('questions').select('*').eq('owner_id', T.user.id).order('created_at', { ascending: false }),
    sb.from('questions').select('id,body,options,correct_index,level,qtype,curriculum_id,lesson,image').is('owner_id', null).eq('status', 'approved').limit(2000),
    rpc('question_stats', {}).catch(() => [])
  ]);
  if (own.error) throw own.error;
  await loadCurricula(true).catch(() => {});
  QS.list = own.data; QS.glob = glob.data || []; QS.globalCount = QS.glob.length;
  QS.stats = {}; (st || []).forEach(r => { QS.stats[r.question_id] = r; });
  qDupIndex();
  if (!QS.sel) QS.sel = new Set();
  renderQuestions();
}
function qDupIndex(){
  const m = {}; QS.list.filter(q => q.source !== 'copy').concat(QS.glob).forEach(q => { const k = qNorm(q.body); if (k) (m[k] = m[k] || []).push(q.id); });
  QS.dup = new Set(); Object.values(m).forEach(ids => { if (ids.length > 1) ids.forEach(id => QS.dup.add(id)); });
  QS.norm = m;
}
const daysAr = n => n === 1 ? 'يوماً واحداً' : n === 2 ? 'يومين' : n >= 3 && n <= 10 ? `${n} أيام` : `${n} يوماً`;
function qBank(){
  const pool = QS.list.filter(q => q.status === 'approved').concat(QS.glob);
  const lv = { easy: 0, medium: 0, hard: 0 }; pool.forEach(q => { if (lv[q.level] != null) lv[q.level]++; });
  const n = pool.length, days = Math.floor(n / QPD), mine = QS.list.filter(q => q.status === 'approved').length;
  const pc = k => n ? Math.round(lv[k] * 100 / n) : 0;
  const low = days < 14, weak = n && ['easy', 'medium', 'hard'].find(k => lv[k] < n * 0.15);
  return `<div class="qb ${low ? 'low' : 'ok'}"><div class="qb-h"><b>${n}</b><span>سؤالاً معتمداً متاحاً لطلبتك</span><span class="grow"></span><em>تكفي ${daysAr(days)}</em></div>
    <div class="qb-bar">${['easy', 'medium', 'hard'].map(k => `<i class="lv-${k}" style="width:${pc(k)}%"></i>`).join('')}</div>
    <div class="qb-lg">${['easy', 'medium', 'hard'].map(k => `<span><i class="lv-${k}"></i>${LEVEL_AR[k]} ${lv[k]}</span>`).join('')}</div>
    <p class="qb-n">منها ${mine} من أسئلتك و${QS.glob.length} من البنك العام.${low ? ` أضف ${14 * QPD - n} سؤالاً لتكفي أسبوعين.` : ''}${weak ? ` أسئلة مستوى «${LEVEL_AR[weak]}» قليلة.` : ''}</p></div>`;
}
function qStat(q){
  const s = QS.stats[q.id]; if (!s || !s.answered) return '';
  const p = Math.round(s.correct * 100 / s.answered);
  const tag = s.answered >= 5 && p < 35 ? '<b class="qs-hard">صعب على الطلبة</b>' : s.answered >= 5 && p > 90 ? '<b class="qs-easy">سهل جداً</b>' : '';
  return `<div class="q-stat">${ic('chart')}<span>جاوب عليه ${s.answered} ${s.answered > 10 ? 'طالباً' : s.answered > 2 ? 'طلاب' : 'طالب'} · ${p}٪ أصابوا</span>${tag}</div>`;
}
function qItem(q, ro){
  const sel = QS.selOn && !ro, on = QS.sel.has(q.id), open = !sel && (QS.open === q.id || q.status === 'draft');
  const acts = ro ? '' : q.status === 'draft'
    ? `<button class="qi2-b ok" data-act="t-q-status" data-id="${q.id}" data-s="approved">${ic('check')} اعتماد</button><button class="qi2-b" data-act="t-q-edit" data-id="${q.id}">${ic('edit')} تعديل</button><button class="qi2-b del" data-act="t-q-del2" data-id="${q.id}">${ic('trash')} حذف</button>`
    : `<button class="qi2-b" data-act="t-q-edit" data-id="${q.id}">${ic('edit')} تعديل</button><button class="qi2-b" data-act="t-q-share1" data-id="${q.id}">${ic('share')} مشاركة</button><button class="qi2-b del" data-act="t-q-del2" data-id="${q.id}">${ic('trash')} حذف</button>`;
  return `<div class="qi2${open ? ' open' : ''}${on ? ' sel' : ''}" data-act="${sel ? 't-q-pick' : 't-q-open'}" data-id="${q.id}">
    ${sel ? `<span class="tick sq${on ? ' on' : ''}" aria-hidden="true">${ic('check')}</span>` : `<i class="lvd lv-${q.level}" title="${LEVEL_AR[q.level] || ''}"></i>`}
    <div class="qi2-m"><b class="q-body">${q.image && !open ? '🖼️ ' : ''}${esc(q.body)}</b>
      ${open ? `${q.image ? `<img class="qi2-img" src="${esc(q.image)}" alt="" loading="lazy">` : ''}<div class="qi2-opts">${q.options.map((o, i) => `<span class="${i === q.correct_index ? 'c' : ''}">${i === q.correct_index ? ic('check') : ''}${esc(o)}</span>`).join('')}</div>
        <div class="qi2-meta">${LEVEL_AR[q.level] || ''} · ${TYPE_AR[q.qtype] || q.qtype}${QS.dup.has(q.id) ? ' · <b class="qi-dup">مكرر</b>' : ''}</div>${qStat(q)}${acts ? `<div class="qi2-acts">${acts}</div>` : ''}`
      : `<span class="qi2-a">${ic('check')}${esc(q.options[q.correct_index] || '')}</span>`}</div></div>`;
}
ACTS['t-q-open'] = t => { const id = t.dataset.id; QS.open = QS.open === id ? null : id; const l = document.getElementById('qlist'); if (l) l.innerHTML = qListHtml(); };
ACTS['t-q-share1'] = t => qShareIds([t.dataset.id]);
ACTS['t-q-del2'] = t => {
  const id = t.dataset.id, i = QS.list.findIndex(x => x.id === id); if (i < 0) return;
  const [q] = QS.list.splice(i, 1); QS.open = null; qDupIndex(); renderQuestions();
  snack('تم حذف السؤال', () => { QS.list.splice(i, 0, q); qDupIndex(); renderQuestions(); },
    async () => { const { error } = await sb.from('questions').delete().eq('id', id); if (error) { toast(errMsg(error)); await tQuestions(); } });
};
/* one plain sentence about the bank; details on tap */
function qOk(){
  const n = QS.list.filter(q => q.status === 'approved').length + QS.glob.length, days = Math.floor(n / QPD), low = days < 14;
  return `<button class="qok${low ? ' low' : ''}" data-act="t-q-bankinfo"><span class="qok-d"></span><span class="grow"><b>عند طلبتك ${n} سؤالاً</b><small>${low ? `أضف ${14 * QPD - n} سؤالاً لتكفي أسبوعين` : `تكفيهم ${daysAr(days)}`}</small></span><i class="qok-c">‹</i></button>`;
}
ACTS['t-q-bankinfo'] = () => modal(`<h3>الأسئلة المتاحة لطلبتك</h3>${qBank()}<p class="sub">كل طالب يلعب ${QPD} أسئلة في اليوم تقريباً، فكل ${QPD} أسئلة تكفي يوماً.</p><button class="btn soft" data-act="close-modal">تمام</button>`);
/* ready-made (public) questions: subject → stage/grade → lesson → questions */
const QG = [['general', '🌍', 'معلومات عامة'], ['quick', '⚡', 'سرعة بديهة'], ['curriculum', '📚', 'أسئلة منهج']];
const NO_LESSON = '__none';
const qGlobCu = q => q.qtype === 'curriculum' && q.curriculum_id && CU.list.find(c => c.id === q.curriculum_id);
const qGlobSubj = q => { const c = qGlobCu(q); return c ? c.subject : 'مناهج أخرى'; };
function qGroups(){
  if (!QS.glob.length) return '<div class="card center muted">لا توجد أسئلة جاهزة حالياً.</div>';
  const cnt = {}; QS.glob.filter(q => q.qtype === 'curriculum').forEach(q => { const s = qGlobSubj(q); cnt[s] = (cnt[s] || 0) + 1; });
  const subs = [...new Set(SUBJ_MAIN.concat(Object.keys(cnt)))].filter(s => cnt[s]);
  const kinds = QG.filter(g => g[0] !== 'curriculum').map(g => [g, QS.glob.filter(q => q.qtype === g[0]).length]).filter(x => x[1]);
  const stages = s => [...new Set(QS.glob.filter(q => qGlobSubj(q) === s).map(q => { const c = qGlobCu(q); return c ? STAGE_AR[c.stage] : ''; }).filter(Boolean))].join('، ');
  return `<p class="sub q-ro">أسئلة جاهزة تدخل في مسابقاتك تلقائياً، فما تحتاج تضيفها.</p>
    ${subs.length ? `<div class="qr-h">أسئلة المناهج</div><div class="qf-grid">${subs.map(s => `<button class="qf-tile" data-act="q-gsubj" data-s="${esc(s)}" style="--c:${SUBJ_COLOR(s)}"><span class="qf-ic">${esc(subjMark(s))}</span><b>${esc(s)}</b><small>${stages(s) || '&nbsp;'}</small><em>${cnt[s]}</em></button>`).join('')}</div>` : ''}
    ${kinds.length ? `<div class="qr-h">أسئلة عامة</div><div class="qf-grid">${kinds.map(([g, n]) => `<button class="qf-tile" data-act="q-grp" data-g="${g[0]}" style="--c:${g[0] === 'quick' ? '#FF9500' : '#34C759'}"><span class="qf-ic">${g[1]}</span><b>${g[2]}</b><small>بدون منهج</small><em>${n}</em></button>`).join('')}</div>` : ''}`;
}
function qGlobGrades(subj){
  const qs = QS.glob.filter(q => q.qtype === 'curriculum' && qGlobSubj(q) === subj), cnt = {};
  qs.forEach(q => { const k = q.curriculum_id || '-'; cnt[k] = (cnt[k] || 0) + 1; });
  const cus = CU.list.filter(c => c.subject === subj && cnt[c.id]);
  const stg = STAGE_ORDER.filter(k => cus.some(c => c.stage === k) || (k !== 'university' && CU.list.some(c => c.subject === subj && c.stage === k && !c.owner_id)));
  if (!stg.length) return '<div class="card center muted">لا توجد أسئلة جاهزة في هذه المادة بعد.</div>';
  return `<div class="qs-stages">${stg.map(k => { const have = cus.filter(c => c.stage === k).sort((a, b) => (a.grade || 0) - (b.grade || 0));
      const soon = k === 'university' ? [] : STAGE_GRADES[k].filter(g => !have.some(c => c.grade === g));
      return `<div class="qs-stage"><div class="qs-sh">${STAGE_AR[k]}</div><div class="qs-gr">${have.map(c => `<button class="qs-g on" data-act="q-gcu" data-id="${c.id}"><b>${gradeAr(c)}</b><em>${cnt[c.id]}</em></button>`).join('')}
        ${soon.map(g => `<span class="qs-g soon">${GRADES[g - 1]}<small>قريباً</small></span>`).join('')}</div></div>`; }).join('')}</div>`;
}
function qGlobLessons(cu){
  const qs = QS.glob.filter(q => q.curriculum_id === cu), cnt = {}, order = [];
  qs.forEach(q => { const k = q.lesson || NO_LESSON; if (!cnt[k]) order.push(k); cnt[k] = (cnt[k] || 0) + 1; });
  if (!qs.length) return '<div class="card center muted">لا توجد أسئلة في هذا الصف بعد.</div>';
  const ls = order.filter(k => k !== NO_LESSON).concat(cnt[NO_LESSON] ? [NO_LESSON] : []);
  return `<div class="qr-h">الدروس (${ls.length})</div>${ls.map((k, i) => `<button class="qgrp" data-act="q-gles" data-l="${esc(k)}"><span class="qgrp-e qr-n">${k === NO_LESSON ? '•' : i + 1}</span><span class="grow"><b>${k === NO_LESSON ? 'بدون درس محدد' : esc(k)}</b><small>${cnt[k]} سؤالاً</small></span><i>‹</i></button>`).join('')}
    <button class="q-flat" data-act="q-gles" data-l="">عرض كل أسئلة الصف (${qs.length})</button>`;
}
ACTS['q-grp'] = t => { T.qf.g = t.dataset.g; T.qf.gs = ''; T.qf.gcu = ''; T.qf.gl = null; QS.open = null; renderQuestions(); scrollTo(0, 0); };
ACTS['q-gsubj'] = t => { T.qf.g = 'curriculum'; T.qf.gs = t.dataset.s; T.qf.gcu = ''; T.qf.gl = null; QS.open = null; renderQuestions(); scrollTo(0, 0); };
ACTS['q-gcu'] = t => { T.qf.gcu = t.dataset.id; T.qf.gl = null; QS.open = null; renderQuestions(); scrollTo(0, 0); };
ACTS['q-gles'] = t => { T.qf.gl = t.dataset.l; QS.open = null; renderQuestions(); scrollTo(0, 0); };
/* curriculum tree: subject → stage/grade → questions */
const SUBJ_MAIN = ['اللغة العربية', 'التربية الإسلامية', 'الرياضيات', 'العلوم', 'اللغة الإنجليزية', 'الاجتماعيات'];
const STAGE_ORDER = ['primary', 'middle', 'secondary', 'university'];
function qStatusSrc(){ const f = T.qf; return f.status === 'global' ? QS.glob.filter(q => QS.searchOn || ((!f.g || q.qtype === f.g) && (!f.gcu || q.curriculum_id === f.gcu) && (!f.gl || (q.lesson || NO_LESSON) === f.gl))) : QS.list.filter(q => q.status === f.status); }
function qCuIds(subj){ return new Set(CU.list.filter(c => c.subject === subj).map(c => c.id)); }
function qInScope(q){
  const f = T.qf;
  if (f.cu) return q.curriculum_id === f.cu;
  if (f.subj === 'none') return !q.curriculum_id || !CU.list.some(c => c.id === q.curriculum_id);
  if (f.subj && f.subj !== '__list') return qCuIds(f.subj).has(q.curriculum_id);
  return true;
}
function qFiltered(){
  const f = T.qf, s = qNorm(QS.q);
  return qStatusSrc().filter(q => (QS.searchOn || f.status !== 'approved' || qInScope(q)) && (f.level === 'all' || q.level === f.level) && (f.type === 'all' || q.qtype === f.type) && (!s || qNorm(q.body + ' ' + q.options.join(' ')).includes(s)));
}
function gradeAr(c){ if (!c.grade) return 'كل ' + (c.stage === 'university' ? 'السنوات' : 'الصفوف'); return c.stage === 'university' ? 'السنة ' + c.grade : 'الصف ' + (GRADES[c.grade - 1] || c.grade); }
function qCrumb(){
  const f = T.qf; if (QS.searchOn) return '';
  if (f.status === 'global') {
    if (!f.g) return '';
    const parts = [`<button data-act="q-grp" data-g="">أسئلة جاهزة</button>`];
    if (f.g !== 'curriculum' || !f.gs) { const g = QG.find(x => x[0] === f.g); parts.push(`<b>${g[1]} ${g[2]}</b>`); }
    else { const c = f.gcu && CU.list.find(x => x.id === f.gcu);
      parts.push(c ? `<button data-act="q-gsubj" data-s="${esc(f.gs)}">${esc(f.gs)}</button>` : `<b>${esc(f.gs)}</b>`);
      if (c) parts.push(f.gl != null ? `<button data-act="q-gcu" data-id="${c.id}">${STAGE_AR[c.stage]} · ${gradeAr(c)}</button>` : `<b>${STAGE_AR[c.stage]} · ${gradeAr(c)}</b>`);
      if (c && f.gl) parts.push(`<b>${f.gl === NO_LESSON ? 'بدون درس' : esc(f.gl)}</b>`); }
    return `<nav class="q-crumb">${parts.join('<i>‹</i>')}</nav>`; }
  if (f.status === 'draft') return `<nav class="q-crumb"><button data-act="t-qs" data-v="approved">أسئلتي</button><i>‹</i><b>تنتظر مراجعتك</b></nav>`;
  if (!f.subj) return '';
  const c = f.cu && CU.list.find(x => x.id === f.cu);
  const parts = [`<button data-act="q-nav" data-s="">كل المواد</button>`];
  if (f.subj === '__list') parts.push('<b>كل الأسئلة</b>');
  else if (f.subj === 'none') parts.push('<b>بدون منهج</b>');
  else { parts.push(c ? `<button data-act="q-nav" data-s="${esc(f.subj)}">${esc(f.subj)}</button>` : `<b>${esc(f.subj)}</b>`);
    if (c) parts.push(`<b>${STAGE_AR[c.stage]} · ${gradeAr(c)}${c.title ? ' · ' + esc(c.title) : ''}</b>`); }
  return `<nav class="q-crumb">${parts.join('<i>‹</i>')}</nav>`;
}
const SUBJ_MARK = { 'اللغة العربية': 'ع', 'التربية الإسلامية': 'إ', 'الرياضيات': '÷', 'العلوم': '⚗', 'اللغة الإنجليزية': 'En', 'الاجتماعيات': 'ج', 'الحاسوب': '</>' };
const subjMark = s => SUBJ_MARK[s] || s.replace(/^(اللغة|التربية)\s+/, '').replace(/^ال/, '').slice(0, 1);
function qFolders(){
  const src = qStatusSrc(), cnt = {}; let none = 0;
  src.forEach(q => { const c = q.curriculum_id && CU.list.find(x => x.id === q.curriculum_id); if (c) cnt[c.subject] = (cnt[c.subject] || 0) + 1; else none++; });
  const subs = [...new Set(SUBJ_MAIN.concat(CU.list.map(c => c.subject)))];
  const stages = s => { const st = [...new Set(CU.list.filter(c => c.subject === s).map(c => STAGE_AR[c.stage]))]; return st.length ? st.join('، ') : 'أضف مرحلة'; };
  return `<div class="qf-grid">${subs.map(s => `<button class="qf-tile${cnt[s] ? '' : ' empty'}" data-act="q-nav" data-s="${esc(s)}" style="--c:${SUBJ_COLOR(s)}"><span class="qf-ic">${esc(subjMark(s))}</span><b>${esc(s)}</b><small>${stages(s)}</small><em>${cnt[s] || 0}</em></button>`).join('')}
    <button class="qf-tile${none ? '' : ' empty'}" data-act="q-nav" data-s="none" style="--c:#8E8E93"><span class="qf-ic">${ic('help')}</span><b>عام وسرعة بديهة</b><small>أسئلة بدون منهج</small><em>${none}</em></button>
    <button class="qf-tile add" data-act="q-subj-add"><span class="qf-ic">${ic('plus')}</span><b>مادة أخرى</b><small>أضف مادة جديدة</small></button></div>
    <button class="q-flat" data-act="q-nav" data-s="__list">عرض كل الأسئلة كقائمة</button>`;
}
function qSubjectView(subj){
  const src = qStatusSrc(), cnt = {}; src.forEach(q => { if (q.curriculum_id) cnt[q.curriculum_id] = (cnt[q.curriculum_id] || 0) + 1; });
  const mine = CU.list.filter(c => c.subject === subj);
  const stg = STAGE_ORDER.filter(k => k !== 'university' || mine.some(c => c.stage === k));
  return `<div class="qs-stages">${stg.map(k => { const have = mine.filter(c => c.stage === k).sort((a, b) => (a.grade || 0) - (b.grade || 0));
      const free = STAGE_GRADES[k].filter(g => !have.some(c => c.grade === g));
      return `<div class="qs-stage"><div class="qs-sh">${STAGE_AR[k]}</div><div class="qs-gr">${have.map(c => `<button class="qs-g on" data-act="q-nav-cu" data-id="${c.id}"><b>${gradeAr(c)}${c.title ? ' · ' + esc(c.title) : ''}</b><em>${cnt[c.id] || 0}</em></button>`).join('')}
        ${free.map(g => `<button class="qs-g add" data-act="q-cu-new" data-st="${k}" data-g="${g}">${ic('plus')}${k === 'university' ? 'السنة ' + g : GRADES[g - 1]}</button>`).join('')}</div></div>`; }).join('')}</div>`;
}
function qListHtml(){
  const f = T.qf, ro = f.status === 'global';
  if (ro && !QS.searchOn && !f.g) return qGroups();
  if (ro && !QS.searchOn && f.g === 'curriculum' && f.gs && !f.gcu) return qGlobGrades(f.gs);
  if (ro && !QS.searchOn && f.gcu && f.gl == null) return qGlobLessons(f.gcu);
  if (!QS.list.length && !ro && !f.cu && !QS.searchOn) return `<p class="sub center q-start">ما عندك أسئلة بعد. اضغط «إضافة أسئلة» فوق، أو اختر مادة:</p>${qFolders()}`;
  if (f.status === 'approved' && !QS.searchOn && !f.subj) return qFolders();
  const list = qFiltered();
  const head = f.status === 'approved' && !QS.searchOn && f.subj && !['none', '__list'].includes(f.subj) && !f.cu ? qSubjectView(f.subj) : '';
  const addHere = f.cu ? `<button class="q-addhere" data-act="t-q-add-menu">${ic('plus')} إضافة أسئلة لهذا المنهج</button>` : '';
  if (!list.length) return head + `<div class="card center muted">${QS.searchOn ? 'لا نتائج للبحث.' : f.cu ? 'لا توجد أسئلة في هذا المنهج بعد.' : f.status === 'draft' ? 'لا توجد أسئلة بانتظار المراجعة.' : 'لا توجد أسئلة هنا.'}</div>` + addHere;
  return head + (head ? `<div class="qs-lh">كل أسئلة ${esc(f.subj)} (${list.length})</div>` : '') + list.map(q => qItem(q, ro)).join('') + addHere;
}
ACTS['q-nav'] = t => { T.qf.subj = t.dataset.s; T.qf.cu = ''; QS.selOn = false; QS.sel.clear(); renderQuestions(); scrollTo(0, 0); };
ACTS['q-nav-cu'] = t => { T.qf.cu = t.dataset.id; renderQuestions(); scrollTo(0, 0); };
ACTS['q-cu-new'] = async t => {
  const row = { owner_id: T.user.id, subject: T.qf.subj, stage: t.dataset.st, grade: Number(t.dataset.g), title: null };
  const { data, error } = await sb.from('curricula').insert(row).select().single();
  if (error) return toast(errMsg(error));
  CU.list.push(data); T.qf.cu = data.id; toast(`تمت إضافة ${STAGE_AR[data.stage]} · ${gradeAr(data)}`); renderQuestions();
};
ACTS['q-subj-add'] = async () => {
  const v = await ask('اكتب اسم المادة', { title: 'مادة جديدة', input: '', placeholder: 'مثال: المكتبة', ok: 'متابعة' });
  if (v && v.trim()) { SUBJ_MAIN.push(v.trim().slice(0, 60)); T.qf.subj = v.trim().slice(0, 60); T.qf.cu = ''; renderQuestions(); }
};
function qSelBar(){
  if (!QS.selOn) return '';
  const n = QS.sel.size;
  return `<div class="q-selbar"><button class="btn sm ghost" data-act="t-q-selall">الكل</button><b>${n} محدد</b><span class="grow"></span>
    <button class="btn sm" data-act="t-q-bulk" data-s="approved" ${n ? '' : 'disabled'}>${ic('check')} اعتماد</button>
    <button class="btn sm soft" data-act="t-q-bulk-more" ${n ? '' : 'disabled'}>${ic('more')}</button>
    <button class="icon-btn" data-act="t-q-selx" aria-label="إلغاء التحديد">${ic('x')}</button></div>`;
}
function renderQuestions(){
  const f = T.qf; if (!f.type) f.type = 'all';
  if (!['approved', 'draft', 'global'].includes(f.status)) f.status = 'approved';
  const nd = QS.list.filter(q => q.status === 'draft').length;
  if (f.status === 'draft' && !nd) f.status = 'approved';
  const ro = f.status === 'global', mine = !ro;
  const pills = (k, xs) => `<div class="q-pills">${xs.map(x => `<button class="${f[k] === x[0] ? 'on' : ''}" data-act="t-qf-p" data-k="${k}" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>`;
  const search = QS.searchOn ? `<div class="q-sp"><label class="q-search">${ic('search')}<input class="q-q" type="search" placeholder="اكتب كلمة من السؤال…" value="${esc(QS.q || '')}"></label>
      <span class="q-pl">الصعوبة</span>${pills('level', [['all', 'الكل'], ['easy', '🟢 سهل'], ['medium', '🟡 متوسط'], ['hard', '🔴 صعب']])}
      <span class="q-pl">النوع</span>${pills('type', [['all', 'الكل'], ['curriculum', 'منهج'], ['general', 'عام'], ['quick', 'سرعة بديهة']])}</div>` : '';
  const top = `<button class="icon-btn${QS.searchOn ? ' on' : ''}" data-act="t-q-search" aria-label="بحث">${ic(QS.searchOn ? 'x' : 'search')}</button>`;
  const body = `${search}
    <div class="seg2 q-tabs2"><button class="${mine ? 'on' : ''}" data-act="t-qs" data-v="approved">أسئلتي</button><button class="${ro ? 'on' : ''}" data-act="t-qs" data-v="global">أسئلة جاهزة</button></div>
    ${QS.searchOn ? '' : qOk()}
    ${mine && !QS.selOn && !QS.searchOn ? `<button class="btn q-addbig" data-act="t-q-add-menu">${ic('plus')} إضافة أسئلة</button>` : ''}
    ${mine && nd && f.status !== 'draft' && !QS.searchOn ? `<button class="q-ban" data-act="t-qs" data-v="draft"><span>⏳ ${nd === 1 ? 'سؤال واحد ينتظر' : nd === 2 ? 'سؤالان ينتظران' : nd + ' أسئلة تنتظر'} مراجعتك</span><u>راجعها</u></button>` : ''}
    ${f.status === 'draft' && nd > 1 && !QS.selOn ? `<button class="btn accent" data-act="t-q-approve-all">${ic('check')} اعتماد الكل (${nd})</button>` : ''}
    ${qSelBar()}
    ${qCrumb()}<div id="qlist" class="qi-list">${qListHtml()}</div>
    <input type="file" id="qxl" accept=".xlsx,.xls,.csv" class="hide" data-change="t-q-chosen"><input type="file" id="qocr" accept="image/*" class="hide" data-change="t-q-ocr-chosen">`;
  view('الأسئلة', body, 'questions', top);
}
ACTS['t-q-search'] = () => { QS.searchOn = !QS.searchOn; if (!QS.searchOn) { QS.q = ''; T.qf.level = 'all'; T.qf.type = 'all'; } renderQuestions(); if (QS.searchOn) setTimeout(() => { const i = document.querySelector('.q-q'); if (i) i.focus(); }, 60); };
ACTS['t-qf-p'] = t => { T.qf[t.dataset.k] = t.dataset.v; renderQuestions(); };
document.addEventListener('input', e => {
  const q = e.target.closest && e.target.closest('.q-q');
  if (q) { QS.q = q.value; const l = document.getElementById('qlist'); if (l) l.innerHTML = qListHtml(); return; }
  const pt = e.target.closest && e.target.closest('.qp-ta');
  if (pt) qPasteInfo();
  const qb = e.target.closest && e.target.closest('#q-b');
  if (qb) { const k = qNorm(qb.value), w = document.getElementById('q-dupw'), id = qb.form.id.value;
    const hit = k.length > 6 && (QS.norm[k] || []).some(x => x !== id);
    if (w) w.classList.toggle('hide', !hit); }
});
ACTS['t-qs'] = t => { T.qf.status = t.dataset.v; T.qf.g = ''; T.qf.gs = ''; T.qf.gcu = ''; T.qf.gl = null; QS.open = null; if (t.dataset.v === 'global') { T.qf.subj = ''; T.qf.cu = ''; } QS.selOn = false; QS.sel.clear(); renderQuestions(); scrollTo(0, 0); };
ACTS['t-qf'] = t => { T.qf[t.dataset.k] = t.value; renderQuestions(); };
ACTS['t-q-add-menu'] = () => {
  const here = T.qf.cu && CU.list.find(c => c.id === T.qf.cu);
  modal(`<div class="aw-sheet"><h3>كيف تبي تضيف الأسئلة؟</h3>${here ? `<div class="aw-from">${esc(here.subject)} · ${gradeAr(here)}</div>` : ''}
    <button class="aw-opt main" data-act="m-run" data-a="t-q-add"><span class="aw-oi">✍️</span><span class="grow"><b>كتابة سؤال</b><small>سؤال وأربع إجابات</small></span></button>
    <button class="aw-opt" data-act="m-run" data-a="t-q-ocr"><span class="aw-oi">📷</span><span class="grow"><b>تصوير ورقة أسئلة</b><small>من كتاب أو اختبار</small></span></button>
    <button class="aw-opt" data-act="m-run" data-a="t-q-paste"><span class="aw-oi">📋</span><span class="grow"><b>لصق مجموعة أسئلة</b><small>سؤال في كل سطر</small></span></button>
    <button class="aw-opt" data-act="m-run" data-a="t-q-import"><span class="aw-oi">📄</span><span class="grow"><b>ملف Excel</b><small>لعدد كبير من الأسئلة</small></span></button>
    <button class="aw-opt" data-act="m-run" data-a="t-q-code"><span class="aw-oi">🔑</span><span class="grow"><b>رمز من زميل</b><small>أسئلة شاركها معلم آخر</small></span></button>
    ${QS.list.length ? `<div class="q-more-l"><button class="link" data-act="m-run" data-a="t-q-selon">تحديد عدة أسئلة</button><button class="link" data-act="m-run" data-a="t-q-share-all">مشاركة أسئلتي</button><button class="link" data-act="m-run" data-a="t-q-export">تنزيل أسئلتي</button><button class="link" data-act="m-run" data-a="t-q-template">نموذج Excel</button></div>` : ''}</div>`);
};
ACTS['t-q-del-rejected'] = async () => {
  const n = QS.list.filter(q => q.status === 'rejected').length;
  if (!n) return toast('لا توجد أسئلة مرفوضة');
  if (!await ask(`حذف ${n} سؤالاً مرفوضاً نهائياً؟`)) return;
  const { error } = await sb.from('questions').delete().eq('owner_id', T.user.id).eq('status', 'rejected');
  if (error) return toast(errMsg(error)); await tQuestions();
};

/* question form: tap the right answer, segment pickers, save & next */
function qForm(q){
  const isNew = !q || !q.id, ocr = QS.ocrQ && QS.ocrQ.total && isNew && q;
  q = q || { qtype: QS.lastType || 'curriculum', level: QS.lastLevel || 'medium', body: '', options: ['', '', '', ''], correct_index: 0, curriculum_id: QS.lastCu || '' };
  const seg = (name, cur, map) => `<input type="hidden" name="${name}" value="${cur}"><div class="qf-seg" data-name="${name}">${Object.keys(map).filter(k => k !== 'memory').map(k => `<button type="button" class="${cur === k ? 'on' : ''}" data-act="qf-seg" data-v="${k}">${map[k]}</button>`).join('')}</div>`;
  return `<h3>${ocr ? `سؤال ${QS.ocrQ.total - QS.ocrQ.list.length} من ${QS.ocrQ.total} من الصورة` : isNew ? 'إضافة سؤال' : 'تعديل سؤال'}</h3>${ocr ? '<p class="sub">راجع النص واضغط الدائرة بجانب الإجابة الصحيحة.</p>' : ''}<form class="col qf" data-form="t-save-q"><input type="hidden" name="id" value="${q.id || ''}"><input type="hidden" name="next" value="">
    <div class="field"><label for="q-b">نص السؤال</label><textarea class="input" id="q-b" name="body" rows="2" required maxlength="300" placeholder="اكتب السؤال هنا">${esc(q.body)}</textarea>
      <small id="q-dupw" class="q-dupw hide">هذا السؤال موجود في البنك، ولن يُحفظ مكرراً.</small></div>
    <div class="field"><input type="hidden" name="image" value="${esc(q.image || '')}"><div class="q-imgf" id="q-imgf">${qImgField(q.image)}</div><input type="file" id="qf-file" accept="image/*" class="hide" data-change="qf-img-chosen"></div>
    <div class="field"><label>الخيارات <small class="muted">اضغط الدائرة بجانب الإجابة الصحيحة</small></label><input type="hidden" name="correct" value="${q.correct_index}">
    ${[0, 1, 2, 3].map(i => `<div class="qo${q.correct_index === i ? ' on' : ''}"><button type="button" class="qo-c" data-act="qf-c" data-i="${i}" aria-label="الإجابة الصحيحة ${LETTERS[i]}">${ic('check')}</button><input class="input" name="o${i}" value="${esc(q.options[i])}" required maxlength="100" placeholder="${i === q.correct_index ? 'الإجابة الصحيحة' : 'خيار ' + LETTERS[i]}"></div>`).join('')}</div>
    <div class="field"><label>المستوى</label>${seg('level', q.level, LEVEL_AR)}</div>
    <div class="field"><label>النوع</label>${seg('qtype', q.qtype, TYPE_AR)}</div>
    <div class="field ${q.qtype === 'curriculum' ? '' : 'hide'}" id="q-cuf"><label for="q-cu">المنهج</label><select class="input" id="q-cu" name="cu" data-change="qf-cu">${cuOptions(q.curriculum_id || '')}</select>
      <label for="q-ls" class="q-lsl">الدرس <small class="muted">اختر من القائمة أو اكتب درساً جديداً</small></label><input class="input" id="q-ls" name="lesson" list="q-lsd" maxlength="80" autocomplete="off" value="${esc(q.lesson || (isNew ? QS.lastLesson || '' : ''))}" placeholder="مثال: الزكاة"><datalist id="q-lsd">${qLessonOpts(q.curriculum_id || '')}</datalist></div>
    ${ocr ? `<div class="grid2"><button class="btn" type="button" data-act="t-save-q-next">حفظ والتالي</button><button class="btn soft" type="button" data-act="t-q-ocr-skip">تخطي</button></div>` : isNew ? `<div class="grid2"><button class="btn" type="submit">حفظ</button><button class="btn soft" type="button" data-act="t-save-q-next">حفظ والتالي</button></div>` : `<button class="btn" type="submit">حفظ التعديل</button>`}
    ${q.id ? `<button type="button" class="btn danger" data-act="t-q-del" data-id="${q.id}">${ic('trash')} حذف السؤال</button>` : ''}</form>`;
}
ACTS['qf-seg'] = t => { const s = t.parentElement, f = t.closest('form'); f[s.dataset.name].value = t.dataset.v; s.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t));
  if (s.dataset.name === 'qtype') f.querySelector('#q-cuf').classList.toggle('hide', t.dataset.v !== 'curriculum'); };
function qLessons(cu){ if (!cu) return []; return [...new Set(QS.list.concat(QS.glob).filter(q => q.curriculum_id === cu && q.lesson).map(q => q.lesson))]; }
function qLessonOpts(cu){ return qLessons(cu).map(l => `<option value="${esc(l)}"></option>`).join(''); }
ACTS['qf-cu'] = t => { const d = document.getElementById('q-lsd'); if (d) d.innerHTML = qLessonOpts(t.value); };
ACTS['qf-c'] = t => { const f = t.closest('form'), i = Number(t.dataset.i); f.correct.value = i;
  f.querySelectorAll('.qo').forEach((r, j) => { r.classList.toggle('on', j === i); r.querySelector('input').placeholder = j === i ? 'الإجابة الصحيحة' : 'خيار ' + LETTERS[j]; }); };
function qImgField(url){ return url ? `<img src="${esc(url)}" alt=""><div class="q-imgb"><button type="button" class="btn sm soft" data-act="qf-img">تغيير الصورة</button><button type="button" class="btn sm ghost" data-act="qf-img-x">إزالة</button></div>`
  : `<button type="button" class="q-imgadd" data-act="qf-img">${ic('image')}<span>إضافة صورة للسؤال <small>(اختياري)</small></span></button>`; }
ACTS['qf-img'] = () => document.getElementById('qf-file').click();
ACTS['qf-img-x'] = t => { const f = t.closest('form'); f.image.value = ''; document.getElementById('q-imgf').innerHTML = qImgField(''); };
/* shrink a photo to a light JPEG before upload */
async function shrinkImg(file, max){
  const bmp = await createImageBitmap(file); const k = Math.min(1, (max || 1000) / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.82));
}
ACTS['qf-img-chosen'] = async t => {
  const file = t.files && t.files[0]; if (!file) return; t.value = '';
  const box = document.getElementById('q-imgf'), f = t.closest('form'); box.innerHTML = '<div class="spin sm"></div>';
  try {
    const blob = await shrinkImg(file, 1000), path = `${T.user.id}/${crypto.randomUUID()}.jpg`;
    const up = await sb.storage.from('qimg').upload(path, blob, { contentType: 'image/jpeg' }); if (up.error) throw up.error;
    const url = sb.storage.from('qimg').getPublicUrl(path).data.publicUrl;
    f.image.value = url; box.innerHTML = qImgField(url);
  } catch(e){ box.innerHTML = qImgField(f.image.value); toast('تعذر رفع الصورة: ' + errMsg(e)); }
};
ACTS['t-save-q-next'] = t => { const f = t.closest('form'); f.next.value = '1'; f.requestSubmit(); };
ACTS['t-q-add'] = async () => { QS.ocrQ = null; if (T.qf.cu) { QS.lastCu = T.qf.cu; QS.lastType = 'curriculum'; } await loadCurricula().catch(() => {}); closeModals(); modal(qForm()); setTimeout(() => { const b = document.getElementById('q-b'); if (b) b.focus(); }, 60); };
ACTS['t-q-edit'] = async t => { await loadCurricula().catch(() => {}); modal(qForm(QS.list.find(x => x.id === t.dataset.id))); };
ACTS['t-save-q'] = async f => {
  const next = f.next.value === '1'; f.next.value = '';
  const row = { qtype: f.qtype.value, level: f.level.value, body: f.body.value.trim(), options: [0, 1, 2, 3].map(i => f['o' + i].value.trim()), correct_index: Number(f.correct.value), curriculum_id: f.qtype.value === 'curriculum' ? (f.cu.value || null) : null, image: f.image.value || null };
  row.lesson = row.curriculum_id ? (f.lesson.value.replace(/\s+/g, ' ').trim().slice(0, 80) || null) : null;
  if (row.correct_index < 0) return toast('اضغط الدائرة بجانب الإجابة الصحيحة');
  QS.lastCu = f.cu.value; QS.lastType = row.qtype; QS.lastLevel = row.level; QS.lastLesson = row.lesson || '';
  if (new Set(row.options).size < 4) return toast('الخيارات يجب أن تكون مختلفة');
  const k = qNorm(row.body);
  if ((QS.norm[k] || []).some(x => x !== f.id.value)) return toast('هذا السؤال موجود في البنك، لا يمكن تكراره');
  const r = f.id.value ? await sb.from('questions').update(row).eq('id', f.id.value).select().single() : await sb.from('questions').insert(Object.assign({ owner_id: T.user.id, status: 'approved', source: 'teacher' }, row)).select().single();
  if (r.error) return toast(errMsg(r.error));
  if (f.id.value) { const i = QS.list.findIndex(x => x.id === f.id.value); if (i >= 0) QS.list[i] = r.data; } else QS.list.unshift(r.data);
  qDupIndex();
  if (QS.ocrQ && QS.ocrQ.total && !f.id.value) { QS.ocrQ.saved++; return qOcrNext(); }
  if (next) {
    f.image.value = ''; document.getElementById('q-imgf').innerHTML = qImgField('');
    f.body.value = ''; [0, 1, 2, 3].forEach(i => { f['o' + i].value = ''; }); ACTS['qf-c'](f.querySelector('[data-i="0"]'));
    const w = document.getElementById('q-dupw'); if (w) w.classList.add('hide');
    f.body.focus(); toast(`تم الحفظ. أسئلتك المعتمدة: ${QS.list.filter(q => q.status === 'approved').length}`);
    const d = document.getElementById('q-lsd'); if (d) d.innerHTML = qLessonOpts(f.cu.value);
    renderQuestionsKeepModal(); return;
  }
  closeModals(); toast(f.id.value ? 'تم حفظ التعديل' : 'تمت إضافة السؤال ودخل البنك'); if (!f.id.value && T.qf.status !== 'approved') T.qf.status = 'approved'; renderQuestions();
};
function renderQuestionsKeepModal(){ const m = [...document.querySelectorAll('.modal-back')]; m.forEach(x => x.remove()); renderQuestions(); m.forEach(x => document.body.appendChild(x)); }

/* approve / reject with undo */
function qSetStatus(ids, s, msg){
  const prev = {}; ids.forEach(id => { const q = QS.list.find(x => x.id === id); if (q) { prev[id] = q.status; q.status = s; } });
  QS.sel.clear(); renderQuestions();
  snack(msg, () => { ids.forEach(id => { const q = QS.list.find(x => x.id === id); if (q && prev[id]) q.status = prev[id]; }); renderQuestions(); },
    async () => { const { error } = await sb.from('questions').update({ status: s }).in('id', ids); if (error) { toast(errMsg(error)); await tQuestions(); } });
}
ACTS['t-q-status'] = t => { const s = t.dataset.s; qSetStatus([t.dataset.id], s, s === 'approved' ? 'تم اعتماد السؤال' : 'تم رفض السؤال'); };
ACTS['t-q-approve-all'] = () => { const ids = QS.list.filter(q => q.status === 'draft').map(q => q.id); qSetStatus(ids, 'approved', `تم اعتماد ${ids.length} سؤالاً`); };
ACTS['t-q-del'] = async t => {
  if (!await ask('حذف هذا السؤال نهائياً؟')) return;
  const { error } = await sb.from('questions').delete().eq('id', t.dataset.id);
  if (error) return toast(errMsg(error));
  closeModals(); await tQuestions();
};

/* bulk selection */
ACTS['t-q-selon'] = () => { QS.selOn = !QS.selOn; QS.sel.clear(); renderQuestions(); };
ACTS['t-q-selx'] = () => { QS.selOn = false; QS.sel.clear(); renderQuestions(); };
ACTS['t-q-pick'] = t => { const id = t.dataset.id; QS.sel.has(id) ? QS.sel.delete(id) : QS.sel.add(id); renderQuestions(); };
ACTS['t-q-selall'] = () => { const ids = qFiltered().map(q => q.id); const all = ids.every(id => QS.sel.has(id)); ids.forEach(id => all ? QS.sel.delete(id) : QS.sel.add(id)); renderQuestions(); };
ACTS['t-q-bulk'] = t => { const ids = [...QS.sel], s = t.dataset.s; closeModals(); qSetStatus(ids, s, `${s === 'approved' ? 'تم اعتماد' : s === 'rejected' ? 'تم رفض' : 'تم نقل'} ${ids.length} سؤالاً`); };
ACTS['t-q-bulk-more'] = () => sheet(`${QS.sel.size} سؤالاً محدداً`, [
  { act: 't-q-bulk', attrs: 'data-s="approved"', icon: 'check', label: 'اعتماد' },
  { act: 't-q-bulk', attrs: 'data-s="draft"', icon: 'eye', label: 'إرجاعها للمراجعة' },
  { act: 't-q-bulk', attrs: 'data-s="rejected"', icon: 'x', label: 'رفض' },
  { act: 't-q-bulk-lv', attrs: 'data-v="easy"', icon: 'layers', label: 'جعلها سهلة' },
  { act: 't-q-bulk-lv', attrs: 'data-v="medium"', icon: 'layers', label: 'جعلها متوسطة' },
  { act: 't-q-bulk-lv', attrs: 'data-v="hard"', icon: 'layers', label: 'جعلها صعبة' },
  { act: 't-q-share', icon: 'share', label: 'مشاركة مع معلم' },
  null,
  { act: 't-q-bulk-del', icon: 'trash', label: 'حذف المحدد', danger: true }
]);
ACTS['t-q-bulk-lv'] = async t => { const ids = [...QS.sel]; closeModals();
  const { error } = await sb.from('questions').update({ level: t.dataset.v }).in('id', ids); if (error) return toast(errMsg(error));
  ids.forEach(id => { const q = QS.list.find(x => x.id === id); if (q) q.level = t.dataset.v; }); QS.sel.clear(); toast('تم تغيير المستوى'); renderQuestions(); };
ACTS['t-q-bulk-del'] = async () => { const ids = [...QS.sel]; closeModals();
  if (!await ask(`حذف ${ids.length} سؤالاً نهائياً؟`)) return;
  const { error } = await sb.from('questions').delete().in('id', ids); if (error) return toast(errMsg(error));
  QS.sel.clear(); QS.selOn = false; await tQuestions(); };

/* public bank */
ACTS['t-q-view'] = () => toast('هذا سؤال من البنك العام. انسخه إلى أسئلتك لتعدّله.');
ACTS['t-q-copy'] = async t => {
  const g = QS.glob.find(x => x.id === t.dataset.id); if (!g) return;
  const { data, error } = await sb.from('questions').insert({ owner_id: T.user.id, status: 'approved', source: 'copy', qtype: g.qtype, level: g.level, body: g.body, options: g.options, correct_index: g.correct_index }).select().single();
  if (error) return toast(errMsg(error));
  QS.list.unshift(data); qDupIndex(); toast('تم النسخ إلى أسئلتك، يمكنك تعديله الآن'); renderQuestions();
};

/* Excel template / export */
const QHEAD = ['السؤال', 'أ', 'ب', 'ج', 'د', 'الإجابة الصحيحة', 'المستوى', 'النوع'];
ACTS['t-q-template'] = async () => { await XL();
  const ws = XLSX.utils.aoa_to_sheet([QHEAD, ['ما عاصمة دولة الكويت؟', 'مدينة الكويت', 'الجهراء', 'الفحيحيل', 'الأحمدي', 'أ', 'سهل', 'عام'], ['كم يساوي 12 × 12؟', '124', '144', '154', '164', 'ب', 'متوسط', 'سرعة بديهة']]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'الأسئلة'); XLSX.writeFile(wb, 'نموذج-الأسئلة.xlsx');
};
ACTS['t-q-export'] = async () => { await XL();
  const rows = [QHEAD.concat(['الحالة'])].concat(QS.list.map(q => [q.body].concat(q.options, [LETTERS[q.correct_index], LEVEL_AR[q.level], TYPE_AR[q.qtype], STATUS_AR[q.status]])));
  const ws = XLSX.utils.aoa_to_sheet(rows), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الأسئلة'); XLSX.writeFile(wb, 'أسئلتي.xlsx');
};
ACTS['t-q-import'] = () => { closeModals(); document.getElementById('qxl').click(); };

/* parse rows (Excel) into checked candidates with a reason for each problem */
const Q_LV = { 'سهل': 'easy', 'متوسط': 'medium', 'صعب': 'hard', easy: 'easy', medium: 'medium', hard: 'hard' };
const Q_TY = { 'منهج': 'curriculum', 'عام': 'general', 'بديهة': 'quick', 'سرعة بديهة': 'quick', 'ذاكرة': 'general' };
function qCheck(c, seen){
  if (!c.body) return 'نص السؤال فارغ';
  if (c.options.some(o => !o)) return 'أحد الخيارات فارغ';
  if (new Set(c.options).size < 4) return 'خيارات مكررة';
  if (c.correct_index < 0) return 'الإجابة الصحيحة غير واضحة';
  const k = qNorm(c.body);
  if (seen.has(k)) return 'مكرر داخل الملف';
  seen.add(k);
  if ((QS.norm[k] || []).length) return 'موجود مسبقاً في البنك';
  return '';
}
function parseQuestions(rows){
  const first = String((rows[0] || [])[0] || '');
  const head = /سؤال|question/i.test(first), body = head ? rows.slice(1) : rows, seen = new Set();
  const map = { 'أ': 0, 'ا': 0, 'a': 0, '1': 0, 'ب': 1, 'b': 1, '2': 1, 'ج': 2, 'c': 2, '3': 2, 'د': 3, 'd': 3, '4': 3 };
  return body.map((r, i) => {
    if (!r || r.every(x => String(x == null ? '' : x).trim() === '')) return null;
    const opts = [1, 2, 3, 4].map(j => String(r[j] == null ? '' : r[j]).trim());
    const ans = String(r[5] == null ? '' : r[5]).trim();
    const ci = ans.toLowerCase() in map ? map[ans.toLowerCase()] : opts.indexOf(ans);
    const c = { line: i + (head ? 2 : 1), body: String(r[0] || '').trim(), options: opts, correct_index: ci, level: Q_LV[String(r[6] || '').trim()] || 'medium', qtype: Q_TY[String(r[7] || '').trim()] || 'curriculum' };
    c.err = qCheck(c, seen); return c;
  }).filter(Boolean);
}
/* paste: one question per line → السؤال | الصحيح | خطأ | خطأ | خطأ */
function parsePasteQ(txt, level, qtype){
  const seen = new Set();
  return String(txt || '').split(/\r?\n/).map((l, i) => ({ l: l.trim(), i })).filter(x => x.l).map(x => {
    const p = x.l.split(/\s*[|\t]\s*/).map(s => s.trim());
    const right = p[1] || '', wrong = p.slice(2, 5);
    const ci = Math.floor(Math.random() * 4), opts = wrong.slice(); opts.splice(ci, 0, right);
    while (opts.length < 4) opts.push('');
    const c = { line: x.i + 1, body: p[0].replace(/^\d+[\.\-\)]\s*/, ''), options: opts.slice(0, 4), correct_index: right ? ci : -1, level, qtype };
    c.err = p.length < 5 ? 'يحتاج السؤال والإجابة الصحيحة و3 خيارات خاطئة' : qCheck(c, seen); return c;
  });
}
ACTS['t-q-paste'] = () => { closeModals();
  modal(`<h3>لصق أسئلة كنص</h3><p class="sub">كل سؤال في سطر: السؤال | الإجابة الصحيحة | خطأ | خطأ | خطأ</p>
    <textarea class="input qp-ta" rows="7" dir="auto" placeholder="ما عاصمة الكويت؟ | مدينة الكويت | الجهراء | الأحمدي | الفروانية"></textarea>
    <div class="grid2"><select class="input" id="qp-lv">${Object.keys(LEVEL_AR).map(k => `<option value="${k}" ${k === 'medium' ? 'selected' : ''}>${LEVEL_AR[k]}</option>`).join('')}</select>
    <select class="input" id="qp-ty">${['curriculum', 'general', 'quick'].map(k => `<option value="${k}">${TYPE_AR[k]}</option>`).join('')}</select></div>
    <p class="sub" id="qp-info">ترتيب الخيارات يُخلط تلقائياً.</p>
    <button class="btn" data-act="t-q-paste-go">معاينة</button>`);
  setTimeout(() => { const t = document.querySelector('.qp-ta'); if (t) t.focus(); }, 60);
};
function qPasteInfo(){ const ta = document.querySelector('.qp-ta'), el = document.getElementById('qp-info'); if (!ta || !el) return;
  const c = parsePasteQ(ta.value, 'medium', 'general'), ok = c.filter(x => !x.err).length;
  el.textContent = c.length ? `${ok} سؤالاً صالحاً${c.length - ok ? `، و${c.length - ok} سطراً فيه مشكلة` : ''}` : 'ترتيب الخيارات يُخلط تلقائياً.'; }
ACTS['t-q-paste-go'] = () => {
  const c = parsePasteQ(document.querySelector('.qp-ta').value, document.getElementById('qp-lv').value, document.getElementById('qp-ty').value);
  if (!c.length) return toast('الصق الأسئلة أولاً');
  closeModals(); qPreview(c, 'لصق');
};
ACTS['t-q-chosen'] = async t => {
  const file = t.files && t.files[0];
  if (!file) return;
  try { const c = parseQuestions(await readRows(file)); t.value = '';
    if (!c.length) return toast('الملف فارغ');
    qPreview(c, file.name);
  } catch(e){ toast(errMsg(e)); }
};
/* preview before inserting: valid / duplicates / errors with reasons */
function qPreview(c, src){
  QS.pv = c;
  const ok = c.filter(x => !x.err), bad = c.filter(x => x.err), dup = ok.filter(x => x.dup);
  modal(`<h3>معاينة الأسئلة</h3><p class="sub">${esc(src)}</p>
    <div class="pv-sum"><span class="ok">${ok.length} صالح</span>${dup.length ? `<span class="warn">${dup.length} موجود مسبقاً</span>` : ''}${bad.length ? `<span class="bad">${bad.length} فيه مشكلة</span>` : ''}</div>
    ${bad.length ? `<div class="qpv-bad"><b>لن تُضاف هذه الأسطر:</b>${bad.slice(0, 30).map(x => `<div><em>سطر ${x.line}</em> ${esc(x.err)}${x.body ? `: <span>${esc(x.body.slice(0, 40))}</span>` : ''}</div>`).join('')}${bad.length > 30 ? `<div class="muted">و${bad.length - 30} أخرى</div>` : ''}</div>` : ''}
    <div class="qpv-list">${ok.slice(0, 40).map(x => `<div class="qpv${x.dup ? ' dup' : ''}"><b>${esc(x.body)}</b><small>${esc(x.options[x.correct_index])} · ${LEVEL_AR[x.level]}${x.dup ? ' · موجود مسبقاً' : ''}</small></div>`).join('')}${ok.length > 40 ? `<p class="muted center">و${ok.length - 40} سؤالاً آخر</p>` : ''}</div>
    <label class="chk"><input type="checkbox" id="qpv-rev"> أريد مراجعتها قبل اعتمادها</label>
    <button class="btn" data-act="t-q-pv-save" ${ok.length ? '' : 'disabled'}>إضافة الأسئلة</button>`);
}
ACTS['t-q-pv-save'] = async t => {
  const skip = document.getElementById('qpv-skip'), rev = document.getElementById('qpv-rev');
  const rows = QS.pv.filter(x => !x.err && !x.dup).map(x => ({ owner_id: T.user.id, qtype: x.qtype, level: x.level, body: x.body, options: x.options, correct_index: x.correct_index, status: rev && rev.checked ? 'draft' : 'approved', source: 'teacher', curriculum_id: x.qtype === 'curriculum' ? (T.qf.cu || null) : null }));
  if (!rows.length) return toast('لا توجد أسئلة جديدة لإضافتها');
  t.disabled = true;
  try {
    for (let i = 0; i < rows.length; i += 100) { const { error } = await sb.from('questions').insert(rows.slice(i, i + 100)); if (error) throw error; }
    closeModals(); T.qf.status = rows[0].status;
    toast(`تمت إضافة ${rows.length} سؤالاً` + (rows[0].status === 'draft' ? ' للمراجعة' : ''));
    await tQuestions();
  } catch(e){ t.disabled = false; toast(errMsg(e)); }
};

/* share questions between teachers by a short code */
async function qShareIds(ids){
  if (!ids.length) return toast('لا توجد أسئلة للمشاركة');
  closeModals();
  try {
    const code = await rpc('share_questions', { p_ids: ids, p_title: T.name ? 'أسئلة ' + T.name : null });
    const url = location.origin + location.pathname + '#/t/qshare/' + code;
    const msg = `أشاركك ${ids.length} سؤالاً في تحدّي الدقيقة. افتح الرابط لإضافتها إلى أسئلتك:\n${url}\nأو أدخل الرمز: ${code}`;
    modal(`<h3>مشاركة ${ids.length} سؤالاً</h3><p class="sub">أرسل الرمز أو الرابط لزميلك، وتُضاف الأسئلة عنده جاهزة.</p>
      <div class="qs-code">${code}</div>
      <a class="btn wa-btn" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${ic('send')} إرسال عبر واتساب</a>
      <button class="btn soft" data-act="t-q-share-copy" data-u="${esc(url)}">نسخ الرابط</button>`);
  } catch(e){ toast(errMsg(e)); }
}
ACTS['t-q-share'] = () => qShareIds([...QS.sel]);
ACTS['t-q-share-all'] = () => qShareIds(QS.list.filter(q => q.status === 'approved').map(q => q.id));
ACTS['t-q-share-copy'] = t => copyBox(t.dataset.u, 'رابط المشاركة');
ACTS['t-q-code'] = async () => { closeModals();
  const v = await ask('أدخل رمز المشاركة الذي وصلك من زميلك', { title: 'إضافة أسئلة برمز', input: '', placeholder: 'مثال: K7M2QX', ok: 'عرض الأسئلة', dir: 'ltr' });
  if (v) qSharePreview(v.trim().toUpperCase());
};
async function qSharePreview(code){
  if (!code) return;
  try {
    const p = await rpc('shared_preview', { p_code: code });
    if (!p) return toast(ERR.bad_code);
    const qs = p.questions || [];
    modal(`<h3>أسئلة من ${esc(p.from || 'زميل')}</h3><p class="sub">${qs.length} سؤالاً. تُضاف إلى أسئلتك معتمدة، ويمكنك تعديلها.</p>
      <div class="qpv-list">${qs.slice(0, 60).map(x => `<div class="qpv"><b>${x.image ? '🖼️ ' : ''}${esc(x.body)}</b><small>${LEVEL_AR[x.level] || ''} · ${TYPE_AR[x.qtype] || ''}</small></div>`).join('')}</div>
      <button class="btn" data-act="t-q-share-import" data-c="${esc(code)}" ${qs.length ? '' : 'disabled'}>إضافة إلى أسئلتي</button>`);
  } catch(e){ toast(errMsg(e)); }
}
ACTS['t-q-share-import'] = async t => {
  t.disabled = true;
  try { const n = await rpc('import_shared', { p_code: t.dataset.c }); closeModals();
    toast(n ? `تمت إضافة ${n} سؤالاً` : 'هذه الأسئلة موجودة عندك مسبقاً');
    if (location.hash.includes('qshare')) history.replaceState(null, '', '#/t/questions');
    T.qf.status = 'approved'; await tQuestions();
  } catch(e){ t.disabled = false; toast(errMsg(e)); }
};

/* read questions from a photo of a worksheet (OCR in the browser) */
const OCRJS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
ACTS['t-q-ocr'] = () => { closeModals(); document.getElementById('qocr').click(); };
ACTS['t-q-ocr-chosen'] = async t => {
  const file = t.files && t.files[0]; if (!file) return; t.value = '';
  const m = modal(`<h3>قراءة الأسئلة من الصورة</h3><p class="sub" id="ocr-st">جارٍ تجهيز القارئ… أول مرة تأخذ دقيقة تقريباً.</p><div class="ocr-bar"><i id="ocr-p"></i></div>`);
  const st = p => { const a = document.getElementById('ocr-p'), b = document.getElementById('ocr-st'); if (a) a.style.width = Math.round(p * 100) + '%'; if (b && p > 0) b.textContent = 'جارٍ قراءة النص… ' + Math.round(p * 100) + '%'; };
  try {
    await loadJs(OCRJS, 'Tesseract');
    const w = await Tesseract.createWorker('ara+eng', 1, { logger: x => { if (x.status === 'recognizing text') st(x.progress); } });
    const img = await shrinkImg(file, 2200);
    const { data } = await w.recognize(img); await w.terminate();
    m.remove();
    const qs = ocrToQs(data.text || '');
    if (!qs.length) { ACTS['t-q-paste'](); const ta = document.querySelector('.qp-ta'); if (ta) ta.value = (data.text || '').trim(); return toast('لم أتعرف على أسئلة واضحة. عدّل النص هنا.'); }
    QS.ocrQ = { list: qs, total: qs.length, saved: 0 };
    await loadCurricula().catch(() => {});
    qOcrNext();
  } catch(e){ m.remove(); toast('تعذرت قراءة الصورة: ' + errMsg(e)); }
};
function qOcrNext(){
  closeModals();
  const o = QS.ocrQ; if (!o) return;
  const q = o.list.shift();
  if (!q) { const n = o.saved; QS.ocrQ = null; toast(`تمت إضافة ${n} سؤالاً من الصورة`); T.qf.status = 'approved'; renderQuestions(); return; }
  modal(qForm({ qtype: QS.lastType || 'curriculum', level: QS.lastLevel || 'medium', body: q.body, options: q.options, correct_index: -1, curriculum_id: QS.lastCu || '' }));
}
ACTS['t-q-ocr-skip'] = () => qOcrNext();
/* turn OCR text into {body, options[4]}: options marked أ) ب) ج) د) or a) b) c) d), on their own lines or inline */
function ocrToQs(text){
  const OPT = /(?:^|\s)[\(\[]?([أاإبجدabcdABCD])\s*[\)\]\-\.:ـ]\s+/g;
  const out = []; let cur = null;
  const lines = String(text).split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l.length > 1);
  lines.forEach(l => {
    const marks = [...l.matchAll(OPT)];
    if (marks.length && marks[0].index <= 1 && cur) {
      marks.forEach((mk, i) => { const end = i + 1 < marks.length ? marks[i + 1].index : l.length; const v = l.slice(mk.index + mk[0].length, end).trim(); if (v) cur.options.push(v); });
      return;
    }
    if (marks.length >= 2 && marks[0].index > 1) { // question and options on one line
      cur = { body: l.slice(0, marks[0].index), options: [] }; out.push(cur);
      marks.forEach((mk, i) => { const end = i + 1 < marks.length ? marks[i + 1].index : l.length; const v = l.slice(mk.index + mk[0].length, end).trim(); if (v) cur.options.push(v); });
      return;
    }
    if (!cur || cur.options.length || /^[\(\[]?[\d٠-٩]+\s*[\)\]\-\.:ـ]/.test(l)) { cur = { body: l, options: [] }; out.push(cur); }
    else cur.body += ' ' + l;
  });
  return out.map(q => ({ body: q.body.replace(/^[\(\[]?[\d٠-٩]+\s*[\)\]\-\.:ـ]\s*/, '').trim().slice(0, 300), options: q.options.slice(0, 4).concat(['', '', '', '']).slice(0, 4).map(x => x.slice(0, 100)) }))
    .filter(q => q.body.length > 3 && q.options.filter(Boolean).length >= 2);
}

/* ---- add students: one button → photo / paste / file / self-join → review → which class ---- */
const AW = { rows: [], cid: null, src: '' };
const awNorm = s => String(s || '').replace(/[ً-ْـ]/g, '').replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();
function awWhere(name){ const k = awNorm(name); for (const c of CL.classes) if ((CL.students[c.id] || []).some(s => awNorm(s.name) === k)) return { c, s: CL.students[c.id].find(s => awNorm(s.name) === k) }; return null; }
function awFlag(r){
  const w = awWhere(r.name); r.where = w; r.move = false;
  r.warn = /[0-9٠-٩a-zA-Z]/.test(r.name) || r.name.split(' ').length < 2 || r.name.split(' ').length > 6;
  r.on = !w;
}
ACTS['aw-start'] = t => {
  AW.cid = t && t.dataset && t.dataset.cid || null; const made = t && t.dataset && t.dataset.made;
  modal(`<div class="aw-sheet">${made ? `<div class="aw-made">✓ تم إنشاء «${esc(made)}»</div>` : ''}<h3>كيف تبي تضيف الطلبة؟</h3>
    <button class="aw-opt main" data-act="aw-photo"><span class="aw-oi">📷</span><span class="grow"><b>تصوير كشف الأسماء</b><small>الأسرع لصف كامل</small></span></button>
    <button class="aw-opt" data-act="aw-paste"><span class="aw-oi">✍️</span><span class="grow"><b>كتابة أو لصق الأسماء</b><small>اسم في كل سطر</small></span></button>
    <button class="aw-opt" data-act="aw-file"><span class="aw-oi">📄</span><span class="grow"><b>ملف Excel</b><small>إذا عندك الكشف من نظام المدرسة</small></span></button>
    <button class="aw-opt" data-act="aw-self"><span class="aw-oi">🔗</span><span class="grow"><b>الطلبة يسجّلون بأنفسهم</b><small>رابط أو QR ترسله للصف</small></span></button>${made ? '<button class="link aw-later" data-act="close-modal">لاحقاً</button>' : ''}</div>`);
};
ACTS['aw-photo'] = () => { closeModals(); document.getElementById('awimg').click(); };
ACTS['aw-file'] = () => { closeModals(); document.getElementById('awxl').click(); };
ACTS['aw-paste'] = () => { closeModals();
  modal(`<h3>كتابة أو لصق الأسماء</h3><p class="sub">اسم الطالب في كل سطر. تقدر تنسخ عمود الأسماء من Excel أو الواتساب وتلصقه هنا.</p>
    <textarea class="input paste-ta aw-ta" rows="9" dir="auto" placeholder="سارة خالد العتيبي&#10;ليان عبدالله الزامل&#10;نور محمد الحربي"></textarea><div class="paste-info"></div>
    <button class="btn" data-act="aw-paste-go">متابعة</button>`);
  setTimeout(() => { const ta = document.querySelector('.aw-ta'); if (ta) ta.focus(); }, 60);
};
ACTS['aw-paste-go'] = () => { const rows = parsePaste(document.querySelector('.aw-ta').value); if (!rows.length) return toast('اكتب الأسماء أولاً'); closeModals(); awReview(rows, 'paste'); };
ACTS['aw-xl'] = async t => { const file = t.files && t.files[0]; if (!file) return; t.value = '';
  try { const rows = parseStudents(await readRows(file)); if (!rows.length) return toast('لم أجد أسماء في الملف'); awReview(rows, 'file'); } catch(e){ toast('تعذّرت قراءة الملف'); } };
ACTS['aw-img'] = async t => {
  const file = t.files && t.files[0]; if (!file) return; t.value = '';
  const m = modal(`<div class="aw-read"><div class="aw-paper"><i style="width:70%"></i><i></i><i style="width:85%"></i><i style="width:60%"></i><i style="width:90%"></i></div>
    <div class="aw-ring" id="aw-ring" style="--p:3"><i id="aw-pct">0%</i></div><b>جارٍ قراءة الأسماء…</b><small>أول مرة تاخذ دقيقة تقريباً، والصورة ما تطلع من جوالك.</small></div>`);
  const st = p => { const r = document.getElementById('aw-ring'), x = document.getElementById('aw-pct'); if (r) r.style.setProperty('--p', Math.max(3, Math.round(p * 100))); if (x) x.textContent = Math.round(p * 100) + '%'; };
  try {
    await loadJs(OCRJS, 'Tesseract');
    const w = await Tesseract.createWorker('ara+eng', 1, { logger: x => { if (x.status === 'recognizing text') st(x.progress); } });
    const { data } = await w.recognize(await ocrPrep(file)); await w.terminate();
    m.remove();
    const { rows, cls } = namesFromOcr(data.text || '');
    if (!rows.length) { ACTS['aw-paste'](); const ta = document.querySelector('.aw-ta'); if (ta) { ta.value = (data.text || '').trim(); pasteInfo(ta); } return toast('ما قدرت أميّز الأسماء، عدّلها هنا'); }
    if (cls && !AW.cid) AW.detect = cls;
    awReview(rows, 'photo');
  } catch(e){ m.remove(); toast('تعذّرت قراءة الصورة: ' + errMsg(e)); }
};
/* grayscale + stretch contrast, and flip dark screenshots to dark-on-light, so OCR reads cleaner */
async function ocrPrep(file){
  const bmp = await createImageBitmap(file); const k = Math.min(1, 2200 / Math.max(bmp.width, bmp.height)), sc = Math.max(k, Math.min(2, 1400 / Math.max(bmp.width, bmp.height)));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
  const g = c.getContext('2d'); g.drawImage(bmp, 0, 0, c.width, c.height);
  const im = g.getImageData(0, 0, c.width, c.height), d = im.data; let sum = 0;
  for (let i = 0; i < d.length; i += 4) { const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; d[i] = y; sum += y; }
  const inv = sum / (d.length / 4) < 110;
  for (let i = 0; i < d.length; i += 4) { let y = d[i]; if (inv) y = 255 - y; y = Math.max(0, Math.min(255, (y - 128) * 1.6 + 128)); d[i] = d[i + 1] = d[i + 2] = y; }
  g.putImageData(im, 0, 0);
  return new Promise(ok => c.toBlob(ok, 'image/png'));
}
/* names list from OCR text: drop headers, numbering, and trailing ids */
const AW_HEAD = /كشف|اسماء|أسماء|الاسم|المدرسة|مدرسة|العام الدراسي|الفصل الدراسي|المعلم|الماده|المادة|التوقيع|ملاحظات|المجموع|وزارة|الإدارة|اداره|منطقة|الرقم المدني|م\s*$/;
const AW_GR = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر'];
function namesFromOcr(text){
  const lines = String(text).split(/\r?\n/).map(l => l.replace(/[|_—–\[\]{}()«»"'*•·]/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
  let cls = null;
  for (const l of lines.slice(0, 8)) {
    const n = awNorm(l);
    const hit = CL.classes.find(c => { const k = awNorm(c.name).replace(/\s*\/\s*/g, ' '); return k.length > 2 && n.replace(/\s*[\/\-]\s*/g, ' ').includes(k); });
    if (hit) { cls = hit.id; break; }
  }
  const rows = [];
  lines.forEach(l => {
    if (AW_HEAD.test(l) || (AW_GR.some(g => l.includes(g)) && /صف|الصف|شعبة|فصل/.test(l))) return;
    let no = '';
    const tail = l.match(/[\d٠-٩]{3,}\s*$/); if (tail) { no = tail[0].trim().replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)); l = l.slice(0, tail.index); }
    l = l.replace(/^[\d٠-٩]{1,3}\s*[\.\-\)]?\s*/, '').replace(/[\d٠-٩]+/g, ' ').replace(/[^؀-ۿa-zA-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
    let words = l.replace(/[a-zA-Z]+/g, ' ').split(' ').filter(w => w.length > 1);
    while (words.length > 2 && words[0].length <= 2 && !/^(ال|ابو|بو)$/.test(words[0])) words.shift();
    while (words.length > 2 && words[words.length - 1].length <= 2) words.pop();
    if (!words.length || (words.length === 1 && words[0].length < 3) || words.length > 6 || !/[؀-ۿ]/.test(l)) return;
    rows.push({ name: words.join(' '), student_no: no });
  });
  const seen = new Set();
  return { rows: rows.filter(r => { const k = awNorm(r.name); if (seen.has(k)) return false; seen.add(k); return true; }), cls };
}
function awReview(rows, src){
  AW.rows = rows.map(r => Object.assign({}, r)); AW.src = src; AW.rows.forEach(awFlag);
  awRenderReview();
}
function awRenderReview(){
  closeModals();
  const R = AW.rows, nNew = R.filter(r => r.on && !r.where).length, nOld = R.filter(r => r.where && !r.move).length, nWarn = R.filter(r => r.warn && r.on).length, nMove = R.filter(r => r.move).length;
  modal(`<div class="aw-rev"><div class="aw-rh"><button class="link" data-act="close-modal">إلغاء</button><h3>راجع الأسماء</h3><span></span></div>
    <span class="aw-from">📋 ${AW.src === 'photo' ? 'وجدنا' : 'عندك'} ${R.length} اسماً</span>
    <div class="aw-sum"><span class="n">${nNew} جديد</span>${nOld ? `<span class="o">${nOld} موجودون</span>` : ''}${nMove ? `<span class="w">${nMove} نقل</span>` : ''}${nWarn ? `<span class="w">${nWarn} يحتاج مراجعة</span>` : ''}</div>
    <div class="aw-list">${R.map((r, i) => r.where
      ? `<div class="aw-nm ${r.move ? 'move' : 'old'}"><span class="grow">${esc(r.name)}</span>${r.move ? `<em>نقل من ${esc(r.where.c.name)}</em><button class="aw-x" data-act="aw-move" data-i="${i}" aria-label="إلغاء النقل">✕</button>` : `<em>في ${esc(r.where.c.name)}</em><button class="aw-mv" data-act="aw-move" data-i="${i}">نقل؟</button>`}</div>`
      : `<div class="aw-nm${r.warn ? ' warn' : ''}${r.on ? '' : ' off'}"><input class="aw-in" data-i="${i}" value="${esc(r.name)}" aria-label="اسم الطالب">${r.warn && r.on ? '<em>تأكد من الاسم</em>' : ''}<button class="aw-x" data-act="aw-del" data-i="${i}" aria-label="${r.on ? 'حذف' : 'إرجاع'}">${r.on ? '✕' : '↺'}</button></div>`).join('')}
      <form class="aw-addline" data-form="aw-add1"><span class="pl">＋</span><input name="n" placeholder="إضافة اسم نسيته" autocomplete="off"></form></div>
    <button class="btn aw-go" data-act="aw-next" ${nNew + nMove ? '' : 'disabled'}>متابعة (${nNew + nMove} طالباً)</button></div>`).classList.add('aw-full');
}
document.addEventListener('change', e => { const i = e.target.closest && e.target.closest('.aw-in'); if (!i) return; const r = AW.rows[+i.dataset.i]; r.name = i.value.replace(/\s+/g, ' ').trim(); awFlag(r); if (r.name.length < 2) r.on = false; awRenderReview(); });
ACTS['aw-del'] = t => { const r = AW.rows[+t.dataset.i]; r.on = !r.on; awRenderReview(); };
ACTS['aw-move'] = t => { const r = AW.rows[+t.dataset.i]; r.move = !r.move; awRenderReview(); };
ACTS['aw-add1'] = f => { const v = f.n.value.replace(/\s+/g, ' ').trim(); if (v.length < 2) return; const r = { name: v, student_no: '' }; awFlag(r); AW.rows.push(r); awRenderReview(); setTimeout(() => { const x = document.querySelector('.aw-addline input'); if (x) x.focus(); }, 30); };
ACTS['aw-next'] = () => { if (AW.cid) return awSave(AW.cid); awPick(); };
function awPick(self){
  closeModals();
  const pre = AW.pick || AW.detect || (CL.classes.length === 1 ? CL.classes[0].id : null); AW.pick = pre;
  const n = AW.rows.filter(r => (r.on && !r.where) || r.move).length;
  const target = CL.classes.find(c => c.id === pre);
  modal(`<div class="aw-pick"><div class="aw-rh"><button class="link" data-act="${self ? 'close-modal' : 'aw-back'}">${self ? 'إلغاء' : 'رجوع'}</button><h3>لأي صف؟</h3><span></span></div>
    ${AW.detect && !self ? `<p class="aw-hint">✓ قرأنا «${esc((CL.classes.find(c => c.id === AW.detect) || {}).name || '')}» من أعلى الكشف</p>` : ''}
    <div class="aw-grid">${CL.classes.map(c => `<button class="aw-pk${c.id === pre ? ' on' : ''}" data-act="aw-pk" data-id="${c.id}" data-self="${self ? 1 : ''}">${esc(c.name)}</button>`).join('')}<button class="aw-pk new" data-act="aw-newcls" data-self="${self ? 1 : ''}">＋ صف جديد</button></div>
    ${self ? '' : `<div class="aw-conf">${target ? `سيتم إضافة <b>${n}</b> طالباً إلى <b>${esc(target.name)}</b>` : 'اختر الصف'}</div>`}
    <button class="btn" data-act="${self ? 'aw-self-go' : 'aw-save'}" ${target ? '' : 'disabled'}>${self ? 'عرض الرابط' : 'إضافة'}</button></div>`).classList.add('aw-full');
}
ACTS['aw-back'] = () => awRenderReview();
ACTS['aw-pk'] = t => { AW.pick = t.dataset.id; awPick(!!t.dataset.self); };
ACTS['aw-newcls'] = async t => {
  const v = await ask('اكتب اسم الصف', { title: 'صف جديد', input: '', placeholder: 'مثال: السادس / أ', ok: 'إنشاء' });
  const name = (v || '').trim(); if (name.length < 2) return;
  if (CL.classes.some(c => c.name.trim() === name)) return toast('يوجد صف بنفس الاسم');
  const { data, error } = await sb.from('classes').insert({ teacher_id: T.user.id, name, style: 'mid' }).select().single();
  if (error) return toast(errMsg(error));
  CL.classes.push(data); CL.byId[data.id] = data; CL.students[data.id] = []; AW.pick = data.id; awPick(!!t.dataset.self);
};
ACTS['aw-save'] = t => awSave(AW.pick, t);
async function awSave(cid, btn){
  const c = CL.classes.find(x => x.id === cid); if (!c) return;
  const g = c.gender === 'm' || c.gender === 'f' ? c.gender : '';
  const rows = AW.rows.filter(r => r.on && !r.where && r.name.length > 1).map(r => ({ name: r.name, student_no: r.student_no || '', gender: r.gender || g }));
  const mv = AW.rows.filter(r => r.move && r.where && r.where.c.id !== cid).map(r => r.where.s.id);
  if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الإضافة…'; }
  try {
    let codes = [];
    for (let i = 0; i < rows.length; i += 150) { const r = await rpc('add_students', { p_class: cid, p_rows: rows.slice(i, i + 150) }); codes = codes.concat(r.added.map(x => x.code)); }
    if (mv.length) { const { error } = await sb.from('students').update({ class_id: cid }).in('id', mv); if (error) throw error; }
    closeModals(); AW.pick = null; AW.detect = null; AW.cid = null;
    CL.open.add(cid); CL.flash = { cid, n: codes.length + mv.length, added: true }; CL.tab = 'classes';
    if (location.hash !== '#/t/classes') location.hash = '#/t/classes'; else await tClasses();
    if (codes.length) snack(`تمت إضافة ${codes.length} طالباً`, async () => {
      const { error } = await sb.from('students').delete().eq('class_id', cid).in('code', codes);
      if (error) toast(errMsg(error)); CL.flash = null; await tClasses(); toast('تم التراجع');
    }, () => {});
  } catch(e){ if (btn) { btn.disabled = false; btn.textContent = 'إضافة'; } toast(errMsg(e)); }
}
ACTS['aw-self'] = () => { AW.pick = AW.cid || (CL.classes.length === 1 ? CL.classes[0].id : null); AW.detect = null; awPick(true); };
ACTS['aw-self-go'] = async () => {
  const c = CL.classes.find(x => x.id === AW.pick); if (!c) return;
  try { if (!c.self_join) { const code = await rpc('set_self_join', { p_class: c.id, p_on: true }); c.self_join = true; if (typeof code === 'string') c.join_code = code; await tClasses(); }
    const cc = CL.classes.find(x => x.id === c.id) || c; CK.cls = cc; ACTS['c-joinshow']({ closest: () => null, dataset: {}, _c: cc });
  } catch(e){ toast(errMsg(e)); }
};
/* one quick name inside a class */
ACTS['c-add1'] = async f => {
  const c = ctx(f), v = f.n.value.replace(/\s+/g, ' ').trim(); if (v.length < 2) return toast('اكتب اسم الطالب');
  if ((CL.students[c.id] || []).some(s => awNorm(s.name) === awNorm(v))) return toast('هذا الاسم موجود في الصف');
  const g = c.gender === 'm' || c.gender === 'f' ? c.gender : '';
  try { await rpc('add_students', { p_class: c.id, p_rows: [{ name: v, student_no: '', gender: g }] }); CL.addFocus = c.id; await tClasses(); toast(`تمت إضافة ${v}`); }
  catch(e){ toast(errMsg(e)); }
};
document.addEventListener('paste', e => {
  const i = e.target.closest && e.target.closest('.cl-add1 input'); if (!i) return;
  const txt = (e.clipboardData || window.clipboardData).getData('text'); const rows = parsePaste(txt);
  if (rows.length < 2) return;
  e.preventDefault(); AW.cid = i.closest('[data-cid]').dataset.cid; awReview(rows, 'paste');
});

/* ---- results ---- */
const RS = { sort: 'pts', q: '', rows: [], name: '' };
async function tResults(classId){
  if (!classId) return location.replace('#/t/comps');
  const [cq, kq] = await Promise.all([sb.from('classes').select('id,name').order('created_at'), sb.from('competitions').select('id,group_id,class_id,title').eq('status', 'active')]);
  if (cq.error) throw cq.error;
  const comp = (kq.data || []).find(k => k.class_id === classId);
  const inGroup = comp ? new Set(kq.data.filter(k => k.group_id === comp.group_id).map(k => k.class_id)) : new Set([classId]);
  const classes = cq.data.filter(c => inGroup.has(c.id));
  if (!classes.length) return location.replace('#/t/comps');
  const id = classId, pick = classes.filter(c => c.id === id);
  RS.title = comp ? comp.title : 'النتائج';
  const res = await Promise.all(pick.map(c => rpc('teacher_class_results', { p_class: c.id }).then(r => r.map(x => Object.assign({ cls: c.name }, x))).catch(() => [])));
  RS.rows = res.flat(); RS.all = false; RS.id = id; RS.classes = classes;
  RS.name = (classes.find(c => c.id === id) || {}).name || '';
  RS.ko = null;
  { try { const b = await rpc('teacher_bracket', { p_class: id }); if (b && b.size && b.rounds.length && b.today >= b.rounds[0].day) RS.ko = b; } catch(e){} }
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
  const chips = RS.classes.length > 1 ? `<div class="lv-chips">${RS.classes.map(c => `<button class="${RS.id === c.id ? 'on' : ''}" data-act="r-cls" data-id="${c.id}">${esc(c.name)}</button>`).join('')}</div>` : `<div class="rs-cls">${esc(RS.name)}</div>`;
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
  const ko = RS.ko ? `<div class="card col ko-card"><b>${ic('trophy')} التصفيات</b>${bracketHtml(RS.ko)}${honorHtml(RS.ko)}</div>` : '';
  const body = chips + sum + pod + ko +
    (!any ? `<div class="rs-empty">${ic('clock')}<div><b>لم تبدأ الجولات بعد</b><small>تظهر النقاط والترتيب هنا بعد أول جولة رسمية.</small></div></div>` : '') +
    `<div class="rs-search">${ic('search')}<input id="r-q" placeholder="بحث بالاسم أو الرقم" value="${esc(RS.q)}"></div>
     <div class="tabs rs-seg">${sorts.map(x => `<button class="${RS.sort === x[0] ? 'on' : ''}" data-act="r-sort" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>
     <div class="rl-grp" id="r-list">${items || '<div class="set-row center muted">لا يوجد طلبة.</div>'}</div>
     <div class="set-f center">${list.length} من ${n} · النقطة الخضراء: لعب اليوم</div>`;
  view(RS.title || 'النتائج', body, 'comps', `<button class="icon-btn" data-act="t-res-export" aria-label="تنزيل Excel">${ic('download')}</button>`, '#/t/comps');
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
/* pick the gendered form: 'راجعي/راجع' (f/m), 'الطالب/ـة', 'له/ا' */
function gx(t, g){
  if (g !== 'm' && g !== 'f') return t;
  return t.replace(/([\u0600-\u06FF]+)\/(ـ?[\u0600-\u06FF]+)/g, (m, a, b) => {
    if (b[0] === 'ـ') return g === 'm' ? a : a + b.slice(1);
    if (b === 'ا') return g === 'm' ? a : a.replace(/ه$/, '') + 'ها';
    return g === 'f' ? a : b;
  });
}
function buildReport(name, d, g){
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
    if (da >= 8) strong.push('تطوّر مستمر في المستوى'); if (da <= -8) { weak.push('تراجع في الأداء مؤخراً'); tips.push('يُنصح بالتواصل مع الطالب/ـة لمعرفة سبب التراجع وتشجيعه/ا.'); } }
  if (days.length && days.length < 3) tips.push('المشاركة اليومية المنتظمة تعطي صورة أدق عن المستوى.');
  if (!tips.length) tips.push(acc >= 85 ? 'مستوى ممتاز: يُقترح إتاحة أسئلة أصعب له/ا أو دور قيادي في الفريق.' : 'استمرّي/استمر على التدريب اليومي للحفاظ على المستوى.');
  tips.forEach((x, i) => { tips[i] = gx(x, g); });
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
    <div class="row rp-acts"><button class="btn" data-act="r-report-pdf">${ic('download')} تنزيل PDF</button><button class="btn soft" data-act="r-report-copy">نسخ الملخص</button></div></div>` };
}
ACTS['r-report'] = async t => {
  const { id, name } = t.dataset; toast('جاري إعداد التقرير…');
  try {
    const [d, gq] = await Promise.all([rpc('teacher_student_report', { p_student: id }), sb.from('students').select('gender,classes(gender)').eq('id', id).maybeSingle()]);
    if (!d || !d.total) { toast('لا توجد جولات رسمية منتهية لهذا الطالب بعد'); return; }
    const gd = gq.data || {}, r = buildReport(name, d, gd.gender || (gd.classes && gd.classes.gender)); RS.lastText = r.text; RS.lastName = name; RS.lastCls = t.dataset.cls || ''; closeModals(); modal(r.html);
  } catch (e) { toast('تعذّر تحميل التقرير'); }
};
/* student report → PDF (rendered by the browser so Arabic shapes correctly) */
const H2P = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
function loadScript(src){ return new Promise((ok, no) => { if (window.html2pdf) return ok(); const sc = document.createElement('script'); sc.src = src; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); }); }
/* canvas draws RTL runs badly: give each word / punctuation mark its own box (mirrored brackets) */
function rpSplitWords(root){
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
  while (w.nextNode()) if (/\S/.test(w.currentNode.nodeValue)) nodes.push(w.currentNode);
  nodes.forEach(n => { const f = document.createDocumentFragment();
    n.nodeValue.split(/(\s+|[.:،,؛()%·\/؟?!\-])/).forEach(p => { if (!p) return; if (/^\s+$/.test(p)) f.appendChild(document.createTextNode(p)); else { const s = document.createElement('x-w'); s.textContent = /^[()]+$/.test(p) ? p.replace(/[()]/g, c => c === '(' ? ')' : '(') : p; f.appendChild(s); } });
    n.parentNode.replaceChild(f, n); });
}
ACTS['r-report-pdf'] = async t => {
  const src = t.closest('.rp'); if (!src) return;
  t.disabled = true; const lbl = t.innerHTML; t.textContent = 'جاري التجهيز…';
  const wrap = document.createElement('div'); wrap.className = 'rp-pdf-host';
  const page = document.createElement('div'); page.className = 'rp-pdf'; page.dir = 'rtl';
  const body = src.cloneNode(true); body.querySelectorAll('.rp-acts,button').forEach(b => b.remove());
  page.innerHTML = `<div class="rp-pdf-top"><img src="icon-192.png" alt=""><div><b>تحدّي الدقيقة</b><span>تقرير المستوى المفصّل</span></div><div class="rp-pdf-meta">${RS.lastCls ? esc(RS.lastCls) + '<br>' : ''}${esc(RS.name || '')}<br>${new Date().toLocaleDateString('ar-KW-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}</div></div>`;
  page.appendChild(body);
  page.insertAdjacentHTML('beforeend', `<div class="rp-pdf-foot">المعلم/ـة: ${esc(T.name || '')} · أُعدّ هذا التقرير آلياً من نتائج الجولات الرسمية</div>`);
  wrap.appendChild(page); document.body.appendChild(wrap); rpSplitWords(page);
  const file = 'تقرير-' + String(RS.lastName || 'طالب').replace(/[\\/:*?"<>|]/g, '-') + '.pdf';
  try {
    await loadScript(H2P);
    await html2pdf().set({ margin: [8, 8, 10, 8], filename: file, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['css', 'avoid-all'] } }).from(page).save();
    toast('تم تنزيل التقرير');
  } catch (e) {
    const pa = document.getElementById('print-area'); pa.innerHTML = ''; pa.appendChild(page.cloneNode(true)); window.print();
  } finally { wrap.remove(); t.disabled = false; t.innerHTML = lbl; }
};
ACTS['r-report-copy'] = () => { navigator.clipboard && navigator.clipboard.writeText(RS.lastText || ''); toast('تم النسخ'); };
ACTS['t-res-export'] = async () => { await XL();
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
/* profile icon menu (every teacher screen) */
ACTS['t-menu'] = () => {
  const it = (act, icon, color, label, attrs) => `<button class="sheet-i" data-act="${act}" ${attrs || ''}><span class="set-ic" style="background:${color}">${ic(icon)}</span><span class="grow">${label}</span></button>`;
  modal(`<div class="sheet t-menu">
    <button class="sheet-list tm-head" data-act="tm-go" data-a="st-profile">${avatarHtml('big-av')}<div class="grow"><b>${esc(T.name)}</b><div class="sub" dir="ltr" style="text-align:right">${esc((T.user && T.user.email) || '')}</div></div><span class="set-chev">${ic('back')}</span></button>
    <div class="sheet-list">${it('tm-go', 'user', '#8E8E93', 'حسابي', 'data-a="st-profile"')}
      <div class="sheet-i tm-mode"><span class="set-ic" style="background:#5856D6">${ic('moon')}</span><span class="grow">الوضع</span></div><div class="tm-seg">${modeSeg()}</div></div>
    <div class="sheet-list">${it('tm-go', 'gear', '#8E8E93', 'كل الإعدادات', 'data-a="tm-settings"')}</div>
    <div class="sheet-list"><button class="sheet-i danger" data-act="tm-go" data-a="st-logout-ask">${ic('logout')}<span>تسجيل الخروج</span></button></div>
    <button class="sheet-i sheet-cancel" data-act="close-modal">إغلاق</button></div>`);
};
ACTS['tm-go'] = t => { const a = t.dataset.a; closeModals(); setTimeout(() => ACTS[a](t), 30); };
ACTS['tm-settings'] = () => go('#/t/settings');
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
function cuOptions(sel, emptyLabel){
  const subs = [...new Set(CU.list.map(c => c.subject))];
  return `<option value="">${emptyLabel || 'بدون منهج محدد'}</option>` + subs.map(s => `<optgroup label="${esc(s)}">${CU.list.filter(c => c.subject === s).map(c => `<option value="${c.id}" ${sel === c.id ? 'selected' : ''}>${STAGE_AR[c.stage]} · ${gradeAr(c)}${c.title ? ' · ' + esc(c.title) : ''}${c.owner_id ? '' : ' (عام)'}</option>`).join('')}</optgroup>`).join(''); }
async function tQSet(){
  await loadCurricula(true);
  const st = T.settings || {}, diff = st.difficulty || 'normal', qt = st.qtypes || ['curriculum', 'general', 'quick'];
  const counts = {}; (await sb.from('questions').select('curriculum_id').not('curriculum_id', 'is', null)).data?.forEach(q => counts[q.curriculum_id] = (counts[q.curriculum_id] || 0) + 1);
  const mine = CU.list.filter(c => c.owner_id), glob = CU.list.filter(c => !c.owner_id);
  const cuRow = c => `<button class="set-row" data-act="cu-open" data-id="${c.id}"><span class="set-ic" style="background:${SUBJ_COLOR(c.subject)}">${esc(c.subject.slice(0, 1))}</span><span class="grow rl-txt"><b>${esc(c.subject)}${c.title ? ' · ' + esc(c.title) : ''}</b><small>${STAGE_AR[c.stage]}${c.grade ? ' · ' + (c.stage === 'university' ? 'السنة ' : 'الصف ') + c.grade : ''} · ${counts[c.id] || 0} سؤال</small></span><span class="set-chev">${ic('back')}</span></button>`;
  const LVC = { 'سهل': 'e', 'متوسط': 'm', 'صعب': 'h' };
  const dots = d => d[2].split(' · ').map(x => { const [n, l] = x.split(' '); return Array(+n).fill(`<i class="qd ${LVC[l]}">${l}</i>`).join(''); }).join('');
  view('إعدادات الأسئلة',
    `<div class="qs-intro">${ic('help')}<span>هذه الإعدادات تُطبَّق تلقائياً على كل <b>مسابقة جديدة</b>، وتقدر تغيّرها لكل مسابقة لحالها. كل جولة فيها <b>4 أسئلة</b>، ولكل سؤال <b>15 ثانية</b>.</span></div>
     <div class="set-h">١. صعوبة الجولة</div>
     <div class="set-grp">${DIFF.map(d => `<button class="set-row radio qs-row" data-act="qs-diff" data-v="${d[0]}"><span class="grow rl-txt"><b>${d[1]}</b><span class="qd-row">${dots(d)}</span></span><span class="tick ${diff === d[0] ? 'on' : ''}">${ic('check')}</span></button>`).join('')}</div>
     <div class="set-f">يحدد كيف تتوزع الأسئلة الأربعة بين السهل والمتوسط والصعب.</div>
     <div class="set-h">٢. أنواع الأسئلة</div>
     <div class="set-grp">${QTYPES.map(q => `<button class="set-row radio" data-act="qs-type" data-v="${q[0]}"><span class="set-ic" style="background:${{ curriculum: '#2F80ED', general: '#14A89B', quick: '#FF9500', memory: '#AF52DE' }[q[0]]}">${ic(q[3])}</span><span class="grow rl-txt"><b>${q[1]}</b><small>${q[2]}</small></span><span class="tick sq ${qt.includes(q[0]) ? 'on' : ''}">${ic('check')}</span></button>`).join('')}</div>
     <div class="set-f">اختر نوعاً أو أكثر، وتُسحب الأسئلة منها عشوائياً.</div>
     <div class="set-h">٣. المناهج${qt.includes('curriculum') ? '' : ' <small>(تُستخدم مع نوع «المنهج»)</small>'}</div>
     <div class="set-grp">${mine.map(cuRow).join('')}<button class="set-row" data-act="cu-add"><span class="set-ic" style="background:#34C759">${ic('plus')}</span><span class="grow" style="color:var(--primary)">إضافة منهج</span></button></div>
     <div class="set-f">المنهج هو المادة والصف، مثل «الرياضيات · الصف الخامس». أضف أسئلته من صفحة الأسئلة، ثم اختره عند إنشاء المسابقة.</div>` +
    (glob.length ? `<div class="set-h">مناهج جاهزة</div><div class="set-grp">${glob.map(cuRow).join('')}</div>` : ''), 'settings', '', '#/t/settings');
}
function SUBJ_COLOR(s){ const m = { 'اللغة العربية': '#C8102E', 'الرياضيات': '#2F80ED', 'العلوم': '#14A89B', 'التربية الإسلامية': '#1FA971', 'اللغة الإنجليزية': '#9B51E0', 'الاجتماعيات': '#F2994A', 'الحاسوب': '#5856D6' }; return m[s] || '#8E8E93'; }
async function saveSettings(patch){
  T.settings = Object.assign({}, T.settings || {}, patch);
  const { error } = await sb.from('teachers').update({ settings: T.settings }).eq('id', T.user.id);
  if (error) toast(errMsg(error));
}
ACTS['qs-diff'] = async t => { await saveSettings({ difficulty: t.dataset.v }); t.parentElement.querySelectorAll('.tick').forEach(x => x.classList.toggle('on', x.parentElement === t)); };
ACTS['qs-type'] = async t => {
  let v = ((T.settings || {}).qtypes || ['curriculum', 'general', 'quick']).slice(); const k = t.dataset.v;
  if (v.includes(k)) { if (v.length === 1) return toast('اختر نوعاً واحداً على الأقل'); v = v.filter(x => x !== k); } else v.push(k);
  await saveSettings({ qtypes: v }); const k2 = t.querySelector('.tick'); if (k2) k2.classList.toggle('on'); else t.classList.toggle('on');
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
  if (!await ask('حذف المنهج؟ تبقى أسئلته موجودة لكن بدون منهج.')) return;
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
  if (!await ask('حذف صورة الملف؟')) return;
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
  if (f.p2 && f.p1.value !== f.p2.value) return toast('كلمتا المرور غير متطابقتين');
  const { error } = await sb.auth.updateUser({ password: f.p1.value });
  if (error) return toast(errMsg(error)); closeModals(); toast('تم تغيير كلمة المرور');
};
async function shareOrCopy(title, text, url){
  if (navigator.share) { try { await navigator.share({ title, text, url }); return; } catch(e){ if (e && e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(text + '\n' + url); toast('تم نسخ الرابط'); } catch(e){ copyBox(url); }
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
ACTS['st-logout-ask'] = async () => { if (await ask('تسجيل الخروج من الحساب؟')) ACTS['t-logout'](); };
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
  if (/access_token=|error_description=|type=recovery/.test(h)) return authReturn();
  if (h.indexOf('#/t') === 0) teacherRoute();
  else if (h.indexOf('#/j/') === 0) studentJoin(decodeURIComponent(h.slice(4)));
  else if (h.indexOf('#/p/') === 0) demoStart(h.slice(4));
  else if (h.indexOf('#/c/') === 0) { S.preCode = decodeURIComponent(h.slice(4)); LS.del('mc_token'); S.token = null; history.replaceState(null, '', '#/s'); studentLogin(); }
  else studentRoute();
}
window.addEventListener('hashchange', () => { saveUI(); route(); });
/* remember where the user was, restore on reopen */
function saveUI(){
  try {
    if (location.hash.indexOf('#/p/') === 0) return;
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
['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => document.addEventListener(ev, e => { if (document.querySelector('.play')) e.preventDefault(); }, { passive: false }));
/* connection banner */
function netBanner(){ let b = document.getElementById('net'); if (navigator.onLine) { if (b) b.remove(); return; } if (!b) { b = document.createElement('div'); b.id = 'net'; b.setAttribute('role', 'status'); b.textContent = 'لا يوجد اتصال بالإنترنت، تحقق من الشبكة قبل أن تبدأ الجولة'; document.body.appendChild(b); } }
window.addEventListener('online', () => { netBanner(); toast('عاد الاتصال ✓'); });
window.addEventListener('offline', netBanner);
netBanner();
document.addEventListener('touchmove', e => { if (e.touches.length > 1 && document.querySelector('.play')) e.preventDefault(); }, { passive: false });
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
sb.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY') setTimeout(() => { if (!document.getElementById('np')) newPassword(); }, 400); if (ev === 'SIGNED_OUT' && location.hash.indexOf('#/t') === 0) teacherAuth(); });
route();
setTimeout(() => { if (document.body.classList.contains('wide')) XL().catch(() => {}); }, 3000);
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
