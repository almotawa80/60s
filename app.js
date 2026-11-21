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
  no_questions: 'ما في أسئلة كافية بهالمادة الحين، جرّب مادة ثانية',
  bad_nick: 'اللقب مو متاح، ارمِ النرد مرة ثانية', bad_avatar: 'اختر شكل من الموجود',
  round_not_found: 'الجولة انتهت، ابدأ جولة جديدة',
  name_taken: 'هذا الاسم مسجّل من جهاز ثاني. إذا هو اسمك قول لمعلمك.',
  bad_name: 'اكتب اسمك الأول واسم العائلة بالعربي',
  comp_paused: 'المسابقة متوقفة مؤقتاً من المعلم، ترجع قريباً.',
  bad_code: 'رمز المشاركة غير صحيح',
  duplicate_question: 'هذا السؤال موجود في البنك، لا يمكن تكراره',
  no_questions: 'لم يتم تحديد أسئلة',
  invalid_code: 'الرمز غير صحيح، تأكد منه وحاول مرة أخرى',
  invalid_session: 'انتهت الجلسة، أدخل الرمز من جديد',
  already_played_today: 'أنهيت جولتك الرسمية اليوم، عد غداً',
  official_not_open: 'الجولة الرسمية غير متاحة الآن',
  no_competition: 'لا توجد مسابقة نشطة لصفك بعد',
  not_enough_questions: 'لا توجد أسئلة متاحة كافية بعد، أخبر المعلم/ـة',
  forbidden: 'غير مسموح بهذا الإجراء',
  wrong_position: 'تعذّر تسجيل الإجابة، أعد المحاولة',
  invalid_join: 'رابط التسجيل غير صالح أو مغلق، اطلب رابطاً جديداً من المعلم/ـة',
  bad_name: 'اكتب الاسم الثلاثي بشكل صحيح',
  bad_no: 'اكتب رقم الطالب',
  already_registered: 'هذا الرقم مسجل مسبقاً في الصف، اطلب رمزك من المعلم/ـة',
  class_full: 'الصف ممتلئ',
  no_mistakes: 'لا توجد أخطاء لتتدرّب عليها، أحسنت! 👏',
  no_match_today: 'لا توجد لك مواجهة اليوم في التصفيات',
  adm_view: 'وضع المشاهدة 👁 اضغط «🛠 تفعيل الدعم» فوق عشان تعدّل',
  not_admin: 'هذي الصفحة للمشرف بس'
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
  flag:'<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
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
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  archive:'<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10h14V9M10 13h4"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  grip:'<path d="M5 8h14M5 12h14M5 16h14"/>',
  share:'<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
  star:'<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3z"/>'
};
const ic = n => '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + ICON[n] + '</svg>';
const LOGO = '<div class="logo" aria-hidden="true"><img src="icon-512.png?i=10" alt=""></div>';
const LETTERS = ['أ','ب','ج','د'];
const SHAPES = ['▲','◆','●','■'];
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
const MODAL_OPENER = [];
function modal(html){
  const el = document.createElement('div');
  el.className = 'modal-back';
  el.innerHTML = '<div class="modal" role="dialog" aria-modal="true" tabindex="-1">' + html + '</div>';
  el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  el._opener = document.activeElement;
  document.body.appendChild(el);
  if (!el.querySelector('[data-act="close-modal"],.aw-rh')) { const x = document.createElement('button'); x.type = 'button'; x.className = 'modal-x'; x.dataset.act = 'close-modal'; x.setAttribute('aria-label', 'إغلاق'); x.innerHTML = ic('x'); el.querySelector('.modal').prepend(x); }
  const mo = el.querySelector('.modal'), h = mo.querySelector('h3,.sheet-t'); if (h) { h.id = h.id || 'mh' + Date.now(); mo.setAttribute('aria-labelledby', h.id); }
  setTimeout(() => { if (document.contains(el) && !el.contains(document.activeElement)) mo.focus({ preventScroll: true }); }, 30);
  /* give focus back to whatever opened the modal once it is gone */
  new MutationObserver((_, ob) => { if (!document.contains(el)) { ob.disconnect(); const o = el._opener; if (o && document.contains(o) && !document.querySelector('.modal-back')) try { o.focus({ preventScroll: true }); } catch(e){} } }).observe(document.body, { childList: true });
  return el;
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (document.querySelector('.dlg-back')) return; const m = [...document.querySelectorAll('.modal-back')].pop(); if (m) { e.preventDefault(); m.remove(); } return; }
  /* non-button elements that act like buttons (cards, rows) work with Enter / Space */
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-act][role="button"]:not(button):not(a)')) { e.preventDefault(); e.target.click(); }
  /* keep Tab inside the open dialog */
  if (e.key === 'Tab') { const m = [...document.querySelectorAll('.dlg-back,.modal-back')].pop(); if (!m) return;
    const f = [...m.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x => x.offsetParent !== null); if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === a || !m.contains(document.activeElement))) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && (document.activeElement === z || !m.contains(document.activeElement))) { e.preventDefault(); a.focus(); } }
});
const closeModals = () => document.querySelectorAll('.modal-back').forEach(m => m.remove());
/* in-app dialogs (replace the browser's confirm / prompt) */
function ask(msg, o){
  o = o || {};
  return new Promise(res => {
    const danger = o.danger != null ? o.danger : /حذف|إنهاء|الخروج/.test(msg);
    const el = document.createElement('div'); el.className = 'dlg-back';
    el.innerHTML = `<div class="dlg" role="alertdialog" aria-modal="true"><div class="dlg-b">${o.title ? `<b>${esc(o.title)}</b>` : ''}<p>${esc(msg).replace(/\n/g, '<br>')}</p>` +
      (o.input != null ? `<input class="dlg-in" ${o.readonly ? 'readonly' : ''} ${o.email ? 'type="email" name="email" autocomplete="email" inputmode="email" autocapitalize="off" autocorrect="off" spellcheck="false"' : ''} dir="${o.dir || 'auto'}" value="${esc(o.input)}" placeholder="${esc(o.placeholder || '')}">` : '') +
      `</div><div class="dlg-a">${o.alert ? '' : `<button type="button" data-r="0">${esc(o.cancel || 'إلغاء')}</button>`}<button type="button" data-r="1" class="${danger ? 'dng' : 'pri'}">${esc(o.ok || (danger ? (/حذف/.test(msg) ? 'حذف' : 'متابعة') : 'متابعة'))}</button></div></div>`;
    const inp = el.querySelector('.dlg-in'), ok = el.querySelector('[data-r="1"]');
    const need = o.require;
    if (need) { ok.disabled = true; inp.addEventListener('input', () => { ok.disabled = inp.value.trim() !== need; }); }
    let done = v => { el.classList.add('out'); setTimeout(() => el.remove(), 160); res(v); };
    el.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) done(b.dataset.r === '1' ? (inp && !o.readonly ? inp.value : true) : (inp && !o.readonly ? null : false)); else if (e.target === el && !o.alert) done(inp && !o.readonly ? null : false); });
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !ok.disabled) ok.click(); });
    document.body.appendChild(el);
    const opener = document.activeElement;
    el.addEventListener('keydown', e => { if (e.key === 'Escape' && !o.alert) { e.stopPropagation(); done(inp && !o.readonly ? null : false); } });
    const done0 = done; done = v => { done0(v); if (opener && opener.focus && document.contains(opener)) try { opener.focus(); } catch(_){} };
    setTimeout(() => { if (inp) { inp.focus(); if (o.readonly) inp.select(); } else (o.safe ? el.querySelector('[data-r="0"]') || ok : ok).focus(); }, 60);
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
const S = { token: LS.get('mc_token') || (() => { try { return sessionStorage.getItem('mc_token'); } catch(e){ return null; } })(), home: null, cur: null, locked: false, timer: null };

function studentLogin(){
  stopTimer();
  const th = ['kids', 'mid', 'uni'].includes(LS.get('mc_theme')) ? LS.get('mc_theme') : 'mid';
  setTheme(th);
  document.body.classList.remove('wide');
  $app.innerHTML = '<div class="sh sl sl-red pv-' + th + '">' +
    '<div class="hero">' + LOGO +
    '<h1>اهزم الدقيقة</h1></div>' +
    '<div class="pad col">' + profPicker() +
    '<div class="col sl1"><b class="sl1-q">' + (profs().length ? 'لاعب جديد؟' : 'عندك رمز؟') + '</b>' +
    '<div class="code-wrap"><div class="code-boxes">' + '<div class="code-box"></div>'.repeat(6) + '</div>' +
    '<input class="code-input" id="code" inputmode="latin" autocomplete="off" autocapitalize="characters" maxlength="20" aria-label="رمز الدخول"></div>' +
    '<div id="lerr"></div>' +
    '<button class="btn sl1-go" data-act="s-login">دخول</button><p class="sl1-h">الرمز عند معلمك، أو في رسالة الواتساب</p></div>' +
    '<div class="center sl-t"><button class="sl1-t" data-act="go-teacher">🍎 أنا معلم؟ <b>ادخل من هنا</b></button></div></div></div>';
  const inp = document.getElementById('code');
  const paint = v => $app.querySelectorAll('.code-box').forEach((el, i) => { el.textContent = v[i] || ''; el.classList.toggle('on', i === Math.min(v.length, 5)); });
  inp.addEventListener('input', () => {
    inp.value = normCode(inp.value).slice(0, 6);
    paint(inp.value);
    if (inp.value.length === 6) ACTS['s-login']();
  });
  paint('');
  inp.addEventListener('paste', e => { const t = (e.clipboardData || window.clipboardData || { getData: () => '' }).getData('text'); if (!t) return; e.preventDefault(); S.fill(t); });
  S.fill = v => { const m = String(v || '').match(/#\/[jc]\/([A-Za-z0-9]+)/); inp.value = normCode(m ? m[1] : v).slice(0, 6); paint(inp.value); if (inp.value.length === 6) ACTS['s-login'](); };
  if (S.preCode) { const c = S.preCode; S.preCode = null; setTimeout(() => S.fill(c), 50); } else if (!profs().length) setTimeout(() => inp.focus(), 50);
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
  if (S.logging === inp.value) return;
  box.innerHTML = '';
  const code = normCode(inp.value), btn = $app.querySelector('[data-act="s-login"]'), lbl = btn && btn.textContent;
  S.logging = code; if (btn) { btn.setAttribute('aria-busy', 'true'); btn.textContent = 'جارٍ التحقق…'; }
  try {
    let info = null; try { info = await rpc('class_join_info', { p_join: code }); } catch(_){}
    if (!document.getElementById('code')) return;
    if (info) { location.hash = '#/j/' + code; return; }
    const r = await rpc('student_login', { p_code: code });
    if (!document.getElementById('code')) return; // left the login screen meanwhile
    profAdd({ token: r.token, name: r.student && r.student.name, cls: r.class && r.class.name, code });
    loadHome();
  } catch(e){ const b2 = document.getElementById('lerr'); if (b2) b2.innerHTML = '<div class="err" role="alert">' + esc(errMsg(e)) + '</div>'; }
  finally { S.logging = null; if (btn && document.contains(btn)) { btn.removeAttribute('aria-busy'); btn.textContent = lbl; } }
};
/* several students on one device: «مين يلعب؟» */
function profs(){ try { return JSON.parse(LS.get('mc_profiles') || '[]').filter(p => p && p.token); } catch(e){ return []; } }
function profSave(a){ LS.set('mc_profiles', JSON.stringify(a.slice(0, 8))); }
function profAdd(p){ const a = profs().filter(x => x.token !== p.token && !(p.code && x.code === p.code)); a.unshift(p); profSave(a); S.token = p.token; LS.set('mc_token', p.token); if (p.code) LS.set('mc_code', p.code); }
function devId(){ let d = LS.get('mc_dev'); if (!d) { d = Math.random().toString(36).slice(2) + Date.now().toString(36); LS.set('mc_dev', d); } return d; }
function profPicker(){
  const a = profs(); if (!a.length) return '';
  return '<div class="card col who-pick"><b style="font-size:20px">مين يلعب؟</b>' + a.map((p, i) =>
    '<button class="who-b" data-act="s-pick" data-i="' + i + '"><span class="av">' + esc(String(p.name || '؟').trim().charAt(0)) + '</span><span class="grow"><b>' + esc(p.name || 'طالب') + '</b><small>' + esc(p.cls || '') + '</small></span><span aria-hidden="true">‹</span></button>').join('') + '</div>';
}
ACTS['s-pick'] = t => { const p = profs()[+t.dataset.i]; if (!p) return; S.token = p.token; LS.set('mc_token', p.token); if (p.code) LS.set('mc_code', p.code); loadHome(); };
ACTS['s-switch'] = () => { closeModals(); LS.del('mc_token'); S.token = null; S.home = null; studentLogin(); };
ACTS['s-logout'] = () => { profSave(profs().filter(p => p.token !== S.token)); LS.del('mc_token'); try { sessionStorage.removeItem('mc_token'); } catch(e){} S.token = null; S.home = null; studentLogin(); };

/* v184 stage «tone» from the class name (Kuwait: 1–5 primary, 6–9 intermediate, 10–12 secondary): font size + celebration length */
function qPer(cls){ const c = ((typeof CL !== 'undefined' && CL.classes) || []).find(x => x.name === cls); return (c ? c.stage === 'primary' : stageOf(cls) === 'p') ? 3 : 4; }
/* stages the teacher teaches (account → المرحلة), as class.stage keys */
function myStages(){ const K = ['primary', 'middle', 'secondary', 'university'], A = ['ابتدائي', 'متوسط', 'ثانوي', 'جامعة']; return String(SG('prof_stage') || '').split('|').map(v => K[A.indexOf(v)]).filter(Boolean); }
function stOpts(all){ const m = myStages(); return m.length && !NC.allSt ? all.filter(x => m.includes(x[0])) : all; }
/* a class in a stage the teacher hasn't listed → add it to his profile, so next time only his stages show */
function learnStage(st){ const A = { primary: 'ابتدائي', middle: 'متوسط', secondary: 'ثانوي', university: 'جامعة' }; if (!A[st] || myStages().includes(st)) return; const cur = String(SG('prof_stage') || '').split('|').filter(Boolean); cur.push(A[st]); saveSettings({ prof_stage: cur.join('|') }); }
function defStage(name){ const m = myStages(), g = { p: 'primary', m: 'middle', s: 'secondary' }[stageOf(name)]; if (m.length === 1) return m[0]; return !m.length || m.includes(g) ? g : m[0]; }
function stageOf(name){
  const t = String(name || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  let g = Number((t.match(/\d+/) || [])[0]) || 0;
  if (!g) { const W = ['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر','الحادي عشر','الثاني عشر']; for (let i = W.length - 1; i >= 0; i--) if (t.indexOf(W[i]) >= 0) { g = i + 1; break; } }
  return !g ? 'm' : g <= 5 ? 'p' : g <= 9 ? 'm' : 's';
}
async function loadHome(){
  stopTimer(); S.gen = (S.gen || 0) + 1; clearTimeout(S.nextT); S.cur = null;
  document.body.classList.remove('wide');
  $app.innerHTML = '<div class="spin"></div>';
  try { S.home = await rpc('student_home', { p_token: S.token }); }
  catch(e){
    if (String(e.message || '').includes('invalid_session')) { profSave(profs().filter(p => p.token !== S.token)); LS.del('mc_token'); S.token = null; return studentLogin(); }
    $app.innerHTML = '<div class="pad col"><div class="err">' + esc(errMsg(e)) + '</div><button class="btn" data-act="s-reload">إعادة المحاولة</button></div>';
    return;
  }
  setTheme(S.home.class.style); LS.set('mc_theme', S.home.class.style || 'mid');
  document.body.dataset.stage = stageOf(S.home.class.name);
  { const a = profs(), i = a.findIndex(p => p.token === S.token), me = { token: S.token, name: S.home.student.name, cls: S.home.class.name, code: (i >= 0 && a[i].code) || LS.get('mc_code') };
    if (i >= 0) a[i] = me; else a.unshift(me); profSave(a); }
  renderHome(); bgCheck();
  { const ip = S.home.in_progress_attempt, k = ip && JSON.stringify(ip); if (k && S.autoRes !== k && !S.noAuto) { S.autoRes = k; const b = $app.querySelector('[data-act="s-start"][data-kind="official"]'); if (b) { S.resuming = true; ACTS['s-start'](b); } }
    else if (!k && !S.demo && !S.noAuto) { const pt = Number(LS.get('mc_prac') || 0); if (pt && Date.now() - pt < 10 * 60 * 1000 && S.autoRes !== 'p' + pt) { S.autoRes = 'p' + pt; const b = document.createElement('button'); b.dataset.kind = 'practice'; S.resuming = true; ACTS['s-start'](b); } } }
  rpc('student_prefs', { p_token: S.token }).then(p => {
    S.prefs = p || {};
    if (p && p.remember === false && LS.get('mc_token')) { try { sessionStorage.setItem('mc_token', S.token); } catch(e){} LS.del('mc_token'); }
    bellBadge();
  }).catch(() => {});
}
function bellBadge(){ const b = document.querySelector('.s-bell .bdg'), n = (S.prefs && S.prefs.unread) || 0; if (b) { b.textContent = n > 9 ? '9+' : n; b.style.display = n ? '' : 'none'; } }
ACTS['s-msgs'] = async () => {
  if (S.demo) return toast('رسائل المعلم تظهر في المسابقة الفعلية');
  const m = modal('<h3>' + ic('bell') + ' رسائل المعلم/ـة</h3><div class="spin"></div>');
  try {
    const l = await rpc('student_messages', { p_token: S.token });
    if (S.prefs) S.prefs.unread = 0; bellBadge();
    const EM = { encourage: '💪', praise: '🌟', advice: '💡' };
    m.querySelector('.modal').innerHTML = '<h3>' + ic('bell') + ' رسائل المعلم/ـة</h3>' + (l.length ? '<div class="s-msgs">' + l.map(x => '<div class="s-msg' + (x.new ? ' new' : '') + '"><span class="em">' + (EM[x.kind] || '✉️') + '</span><div class="grow">' + esc(x.body) + '<small>' + esc(fmtDate(String(x.at).slice(0, 10))) + '</small></div></div>').join('') + '</div>' : '<p class="muted center">لا توجد رسائل بعد.</p>') +
      '<button class="btn soft" style="margin-top:14px" data-act="close-modal">إغلاق</button>';
  } catch(e){ m.remove(); toast(errMsg(e)); }
};
ACTS['s-reload'] = () => S.demo ? renderHome() : loadHome();

function renderHome(){
  S.tab = 'home';
  const h = S.home, c = h.competition, ph = h.phase;
  const statsHtml = lbl => '<div class="stats"><div class="stat"><b>' + h.total_points + '</b><span>نقاطي</span></div><div class="stat"><b>' + (h.rank || '-') + '</b><span>' + lbl + '</span></div></div>';
  /* the main action (start / continue / face-off) comes first, details after */
  let head = '', main = '', rest = '';
  if (ph === 'none') {
    head = '<div class="phase"><b>لا توجد مسابقة نشطة</b></div>';
    rest = '<p class="muted">سيبدأ التحدي عندما يجهّز المعلم/ـة المسابقة. يمكنك التدريب الآن.</p>';
  } else if (ph === 'upcoming') {
    head = '<div class="phase"><b>تبدأ المسابقة ' + esc(fmtDate(c.start_date)) + '</b></div>';
    rest = '<p class="muted">جهّز نفسك: درّب نفسك الآن بلا نقاط حتى موعد البداية.</p>';
  } else if (ph === 'points' && !h.in_progress_attempt) {
    return renderHomeP();
  } else if (ph === 'points') {
    head = '<div class="phase"><b>مرحلة جمع النقاط</b><span class="chip warn">' + (c.days_left_points > 0 ? 'تنتهي بعد ' + c.days_left_points + ' يوم' : 'آخر يوم') + '</span></div>';
    if (h.in_progress_attempt) main = '<button class="btn accent" data-act="s-start" data-kind="official">' + ic('play') + ' أكمل جولتك</button>';
    else if (h.played_today) main = '<div class="next-r"><span>لعبت جولة اليوم ✓ جولتك القادمة بعد</span><b id="cd">' + cdText() + '</b></div>';
    else main = '<button class="btn accent" data-act="s-start" data-kind="official">' + ic('play') + ' ابدأ التحدي</button>';
    rest = statsHtml('ترتيبي في الصف') +
      (h.gap != null && h.rank > 1 ? '<div class="gap-l">' + (h.gap > 0 ? 'ينقصك <b>' + h.gap + '</b> نقطة لتتقدم في الترتيب' : 'أنت متعادل مع من فوقك، جولة واحدة تكفي!') + '</div>' : (h.rank === 1 && h.total_points ? '<div class="gap-l">أنت في الصدارة 🏆 حافظ عليها</div>' : ''));
  } else if (ph === 'knockout') {
    head = '<div class="phase"><b>مرحلة التصفيات</b><span class="chip">حتى ' + esc(fmtDate(c.end_date)) + '</span></div>';
    main = '<div id="ko" class="ko-wrap"></div>'; // today's face-off is shown first inside, then the bracket
    rest = statsHtml('ترتيبي في الصف');
  } else {
    head = '<div class="phase"><b>انتهت المسابقة</b></div>';
    rest = statsHtml('ترتيبي النهائي') + '<div id="ko" class="ko-wrap"></div>';
  }
  const th = document.body.dataset.theme || 'mid';
  const steps = [['points', 'جمع النقاط'], ['knockout', 'التصفيات'], ['finished', 'النهاية']], si = steps.findIndex(x => x[0] === ph);
  const strip = si >= 0 ? '<div class="ph-strip">' + steps.map((x, i) => '<span class="' + (i < si ? 'done' : i === si ? 'cur' : '') + '">' + x[1] + '</span>').join('<i></i>') + '</div>' : '';
  sPut('<div class="sh pvx">' +
    '<div class="s-head"><div class="who"><span class="sub">أهلاً 👋' + (h.streak ? ' <span class="streak" title="أيام متتالية">🔥 ' + h.streak + '</span>' : '') + '</span><b>' + esc(h.student.name) + '</b><span class="sub">' + esc(h.class.name) + '</span></div>' +
    '<div class="s-hacts"><button class="avatar av-btn s-bell" data-act="s-msgs" aria-label="رسائل المعلم">' + ic('bell') + '<span class="bdg" style="display:none"></span></button>' +
    '</div></div>' +
    '<div class="comp">' + strip + head + main + rest +
    '<div class="s-row2"><button class="btn ghost" data-act="s-start" data-kind="practice">تدريب بلا نقاط</button>' +
    '</div></div>' +
    '</div>' + sNav('home'));
  startCountdown();
  if ((ph === 'knockout' || ph === 'finished') && !S.demo) loadKo();
}
/* redesigned student home (points phase): one huge play button */
function renderHomeP(){
  const h = S.home, th = document.body.dataset.theme || 'mid', size = h.class.size || 0;
  const days = h.streak || 0, up = S.upMsg, sh = h.shield || {}; S.upMsg = null;
  const pills = '<div class="sp-pills"><span class="sp-pill">مركزك ' + (h.rank || '-') + ' من ' + size + '</span>' + (days ? '<span class="sp-pill"><span class="flame">🔥</span> ' + days + (days === 1 ? ' يوم' : days === 2 ? ' يومين' : ' أيام') + '</span>' : '') + (sh.shields ? '<span class="sp-pill" title="الدرع يحمي سلسلتك يوم غياب">🛡' + (sh.shields > 1 ? ' ×' + sh.shields : '') + '</span>' : '') + '<button class="sp-pill sp-lvl" id="lvl" data-act="s-lvl" hidden></button></div>';
  if (sh.saved && !S.demo) { const k = 'mc_saved_' + (h.student.id || ''); if (LS.get(k) !== sh.saved) { LS.set(k, sh.saved); setTimeout(() => toast('🛡 درعك حمى سلسلتك!'), 600); } }
  let mid;
  if (h.played_today) mid = '<div class="sp-done"><div class="sp-emo" id="bx-emo">🎉</div><b id="bx-h">أحسنت! حياك باجر، كمّل التحدي 💪</b>' + (up ? '<div class="s-up">' + up + '</div>' : '') +
    '<div id="bx-act"></div><div class="sp-cd"><small>الجولة القادمة بعد</small><b id="cd">' + cdText() + '</b></div><div id="goal"></div>' + pushBtn() + '</div>';
  else {
    /* v183: one line above «العب», rotating daily between what applies (rival / leader, prize, streak) */
    const ln = [];
    if (h.rank > 1 && h.gap != null) ln.push('<div class="sp-rival" id="rival">' + (h.gap > 0 ? 'باقي لك <b>' + h.gap + '</b> نقطة وتتعدى اللي فوقك 👀' : 'أنت متعادل مع اللي فوقك، جولة وحدة تكفي! 👀') + '</div>');
    else if (h.rank === 1 && h.total_points) ln.push('<div class="sp-rival">أنت الأول 🏆 حافظ عليها</div>');
    const pz = pzLine((h.competition || {}).prizes, 'sp-prize'); if (pz) ln.push(pz);
    if (days) ln.push('<div class="sp-rival">لا تطفي الشعلة 🔥 ' + days + (days === 1 ? ' يوم' : days === 2 ? ' يومين' : ' أيام') + '</div>');
    const di = Math.floor(Date.now() / 864e5);
    mid = (ln.length ? ln[di % ln.length] : '') + '<button class="sp-play" data-act="s-start" data-kind="official"><span>▶ العب<small>جولة اليوم · دقيقة</small></span></button>';
  }
  $app.innerHTML = '<div class="sh sp pvx">' +
    '<div class="s-head"><div class="who"><span class="sub">أهلاً 👋</span><b>' + esc(h.student.name) + '</b><span class="sub">' + esc(h.class.name) + '</span></div>' +
    '<div class="s-hacts"><button class="avatar av-btn s-bell" data-act="s-msgs" aria-label="رسائل المعلم">' + ic('bell') + '<span class="bdg" style="display:none"></span></button>' +
    '</div></div>' +
    pills + '<div class="sp-mid">' + mid + '</div>' +
    '<div class="sp-low"><button class="sp-prac" data-act="s-start" data-kind="practice"><span>🎯</span>تدرّب بدون نقاط</button>' +
    '</div></div>' + sNav('home');
  startCountdown();
  if (!S.demo) loadDaily();
  if (h.played_today && !S.demo && pushBtn() && !LS.get('mc_push_ask')) { LS.set('mc_push_ask', '1'); setTimeout(() => modal('<div class="s-avs center"><div class="lvl-up">🔔</div><h3>تبي نذكّرك؟</h3><p class="sub">نرسل لك تذكير وحد باليوم إذا ما لعبت، ورسائل معلمك توصلك على طول. وما فيه شي بالليل.</p><button class="btn" data-act="s-push">فعّل الإشعارات</button><button class="btn soft" data-act="close-modal">مو الحين</button></div>').classList.add('mid'), 1500); }
  if (!h.played_today && h.rank > 1 && h.gap > 0 && !S.demo) rpc('class_leaderboard', { p_token: S.token }).then(lb => {
    const rows = Array.isArray(lb) ? lb : (lb && lb.rows) || [], me = rows.find(r => r.is_me), above = me && rows.filter(r => r.rank < me.rank).sort((a, b) => b.rank - a.rank)[0];
    const el = document.getElementById('rival'); if (el && above && above.name) el.innerHTML = 'باقي لك <b>' + h.gap + '</b> نقطة وتتعدى ' + esc(String(above.name).split(' ')[0]) + ' 👀';
  }).catch(() => {});
}
/* v176 permanent level ⚡ (sql/student_level.sql): level n starts at 50·n(n−1)/2 XP */
const LVL_NAMES = [[1, 'مبتدئ'], [5, 'متحمّس'], [10, 'شاطر'], [15, 'بطل'], [20, 'أسطورة']];
function lvlOf(xp){ let n = 1; while (25 * n * (n + 1) <= xp) n++; const lo = 25 * n * (n - 1), hi = 25 * n * (n + 1); return { n, lo, hi, name: LVL_NAMES.filter(x => n >= x[0]).pop()[1] }; }
/* frame colour by level: bronze 1–4, silver 5–9, gold 10+ */
function lvlFrame(){ const xp = S.daily && S.daily.xp; if (xp == null) return ''; const n = lvlOf(xp).n; return n >= 10 ? 'fr-g' : n >= 5 ? 'fr-s' : 'fr-b'; }
function lvlShow(xp){
  if (xp == null) return; const L = lvlOf(xp), el = document.getElementById('lvl');
  if (el) { el.hidden = false; el.textContent = '⚡ مستوى ' + L.n; }
  const k = 'mc_lvl_' + (S.home && S.home.student.id || ''), was = Number(LS.get(k) || 0);
  if (was && L.n > was) setTimeout(() => { FX.win(false); modal('<div class="s-avs center"><div class="lvl-up">⚡' + L.n + '</div><h3>وصلت مستوى ' + L.n + '!</h3><p class="sub">صرت «' + L.name + '». كمّل وتوصل أبعد 🚀</p>' + shBtn('level', { n: L.n, d: 'صار «' + L.name + '»' }) + '<button class="btn soft" data-act="close-modal">يلا!</button></div>'); }, 700);
  LS.set(k, String(L.n));
}
ACTS['s-lvl'] = () => { const xp = (S.daily || {}).xp || 0, L = lvlOf(xp), pc = Math.round((xp - L.lo) / (L.hi - L.lo) * 100);
  modal('<div class="s-avs center"><div class="lvl-up">⚡' + L.n + '</div><h3>مستوى ' + L.n + ' · ' + L.name + '</h3><div class="goal-bar lvl-bar"><i style="width:' + pc + '%"></i></div><p class="sub">باقي ' + (L.hi - xp) + ' نقطة خبرة للمستوى ' + (L.n + 1) + '</p><p class="sub">كل إجابة صح = ١٠ · كل جولة = ٥، والتدريب يحسب بعد</p><button class="btn" data-act="close-modal">تمام</button></div>'); };
/* v175 daily reminder at 4 PM (web push, sql/push.sql + edge function «push») */
/* v318 App Store wrapper (mobile/, UA Beat60sApp): no web push / add-to-home prompts inside the native app */
const isApp = () => /Beat60sApp/.test(navigator.userAgent);
/* v319 native push inside the iPhone app: APNs token saved as push_subs.endpoint 'apns:<token>' (edge function «push» sends it via Apple) */
const NP = () => (isApp() && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications) || null;
async function npSub(){
  const P = NP(); let st = (await P.checkPermissions()).receive;
  if (/^prompt/.test(st)) st = (await P.requestPermissions()).receive;
  if (st !== 'granted') return false;
  const tok = await new Promise((res, rej) => { let h1, h2; const done = f => v => { try { h1 && h1.remove(); h2 && h2.remove(); } catch(e){} f(v); };
    Promise.resolve(P.addListener('registration', done(t => res(t.value)))).then(h => h1 = h);
    Promise.resolve(P.addListener('registrationError', done(e => rej(new Error(e && e.error || 'reg'))))).then(h => h2 = h);
    P.register().catch(rej); setTimeout(() => rej(new Error('timeout')), 15000); });
  await rpc('student_push_sub', { p_token: S.token, p_sub: { endpoint: 'apns:' + tok, keys: { p256dh: '-', auth: '-' } } });
  return true;
}
const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function pushBtn(){
  if (S.demo) return '';
  if (isApp()) return NP() && LS.get('mc_push') !== '1' ? '<button class="sp-bell" data-act="s-push">🔔 فعّل الإشعارات: تذكير الجولة ورسائل معلمك</button>' : '';
  if (!('serviceWorker' in navigator)) return '';
  if (LS.get('mc_push') === '1' && window.Notification && Notification.permission === 'granted') return '';
  if (!('PushManager' in window) && !isIOS()) return '';
  return '<button class="sp-bell" data-act="s-push">🔔 فعّل الإشعارات: تذكير الجولة ورسائل معلمك</button>';
}
const b64u = s => { const p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };
const pushDone = () => { LS.set('mc_push', '1'); document.querySelectorAll('[data-act="s-push-tab"]').forEach(b => { b.disabled = false; const i = b.querySelector('i'); if (i) i.textContent = '🔔'; }); closeModals(); document.querySelectorAll('.sp-bell').forEach(b => b.remove()); toast('تمام! يوصلك التذكير ورسائل معلمك 🔔'); };
ACTS['s-push'] = async t => {
  if (NP()) { t.disabled = true;
    try { if (await npSub()) return pushDone(); t.disabled = false; toast('الإشعارات مقفلة: افتحها من إعدادات الآيفون › اهزم الدقيقة'); }
    catch(e){ t.disabled = false; toast('ما قدرنا نفعّل التذكير، جرّب بعدين'); }
    return; }
  if (isApp()) return toast('حدّث التطبيق عشان تفعّل الإشعارات');
  if (isIOS() && !isStandalone()) return modal('<div class="s-avs"><h3>🔔 عشان يوصلك التذكير</h3><p class="sub">على الآيفون لازم تضيف التطبيق للشاشة الرئيسية أول:</p><ol class="push-steps"><li>اضغط زر المشاركة <b>⬆︎</b> تحت</li><li>اختر <b>«إضافة إلى الشاشة الرئيسية»</b></li><li>افتح التطبيق من الأيقونة، واضغط «ذكّرني» مرة ثانية</li></ol><button class="btn" data-act="close-modal">تمام</button></div>');
  if (!('PushManager' in window) || !window.Notification) return toast('جهازك ما يدعم التذكير');
  t.disabled = true;
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { t.disabled = false; return toast('ما وافقت على الإشعارات، تقدر تغيرها من الإعدادات'); }
    const key = await rpc('push_public_key'); if (!key) throw new Error('no_key');
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(key) });
    await rpc('student_push_sub', { p_token: S.token, p_sub: sub.toJSON() });
    pushDone();
  } catch(e){ t.disabled = false; toast('ما قدرنا نفعّل التذكير، جرّب بعدين'); }
};
/* v171 «صندوق بكرة» + «هدف الصف» (needs sql/box_goal.sql; silently absent before it) */
async function loadDaily(){
  let d; try { d = await rpc('student_daily', { p_token: S.token }); } catch(e){ return; }
  S.daily = d; if (d) lvlShow(d.xp);
  if (!d || !document.getElementById('bx-h')) return;
  const bx = d.box || {}, emo = document.getElementById('bx-emo'), hd = document.getElementById('bx-h'), act = document.getElementById('bx-act');
  const cst = (S.home && S.home.class && S.home.class.stage) || '', big = document.body.dataset.stage === 's' || /second|uni|ثانو|جامع/.test(cst);
  if (big) { /* v326: secondary/university → level progress instead of the sticker box */
    if (S.home && S.home.played_today && d.xp != null) { const L = lvlOf(d.xp), left = L.hi - d.xp, pc = Math.round((d.xp - L.lo) / (L.hi - L.lo) * 100);
      emo.innerHTML = '<span class="bx">⚡</span>';
      act.innerHTML = '<div class="lv-next"><div class="goal-t"><b>باقي ' + left + ' نقطة وتوصل المستوى ' + (L.n + 1) + '</b><span>م' + L.n + '</span></div><div class="goal-bar"><i style="width:' + pc + '%;background:#F5B72B"></i></div></div>'; }
  }
  else if (bx.ready) { emo.innerHTML = '<span class="bx bx-ready">🎁</span>'; hd.textContent = 'صندوقك جاهز!'; act.innerHTML = '<button class="sp-open" data-act="s-box">افتح الصندوق</button>'; }
  else if (bx.locked) { emo.innerHTML = '<span class="bx bx-lock">🎁</span>'; hd.textContent = 'أحسنت! صندوقك ينفتح بكرة'; act.innerHTML = ''; }
  else if (bx.left && S.home && S.home.played_today) act.innerHTML = '<p class="bx-note">🎁 صندوق هدية بعد ' + (bx.left === 1 ? 'يوم لعب واحد' : bx.left === 2 ? 'يومين لعب' : bx.left + ' أيام لعب') + '</p>';
  const g = d.goal, el = document.getElementById('goal');
  const sr = d.star, me = sr && sr.id === S.home.student.id;
  if (g && g.size > 1 && el) {
    const pc = Math.min(100, Math.round(g.played / g.size * 100)), done = g.played >= g.need;
    el.innerHTML = '<div class="goal"><div class="goal-t"><b>' + (done ? '⭐ الصف أخذ نجمة اليوم' : '🎯 باقي ' + (g.need - g.played === 1 ? 'طالب واحد' : g.need - g.played === 2 ? 'طالبين' : (g.need - g.played) + ' طلاب') + ' ويأخذ الصف نجمة') + '</b><span>' + g.played + '/' + g.size + '</span></div>' +
      '<div class="goal-bar"><i style="width:' + pc + '%"></i>' + (done ? '' : '<em style="right:' + Math.round(g.need / g.size * 100) + '%"></em>') + '</div></div>' +
      (sr ? '<div class="wk-star' + (me ? ' me" role="button" data-act="s-share" data-k="star' : '') + '"><span>' + (sr.av ? esc(sr.av) : '⭐') + '</span><div><small>⭐ نجم الأسبوع</small><b>' + (me ? 'أنت! تحسّنت ' + sr.up + ' نقطة' : esc(String(sr.name).split(' ')[0])) + '</b></div></div>' : '');
    if (done && !LS.get('mc_goal_' + (S.home.student.id || '') + '_' + new Date().toDateString())) { LS.set('mc_goal_' + (S.home.student.id || '') + '_' + new Date().toDateString(), '1'); setTimeout(() => FX.win(false), 400); }
  }
}
ACTS['s-box'] = async t => {
  if (S.boxing) return; S.boxing = true; t.disabled = true;
  const b = document.querySelector('.bx'); if (b) b.className = 'bx bx-shake';
  let r; try { [r] = await Promise.all([rpc('student_open_box', { p_token: S.token }), new Promise(z => setTimeout(z, 1300))]); } catch(e){ S.boxing = false; t.disabled = false; return toast(errMsg(e)); }
  S.boxing = false;
  if (!r || !r.ok) return loadDaily();
  FX.win(false);
  const emo = document.getElementById('bx-emo'), hd = document.getElementById('bx-h'), act = document.getElementById('bx-act');
  if (r.prize) { emo.innerHTML = '<span class="bx bx-pop">' + r.prize + '</span>'; hd.textContent = 'ملصق جديد!'; act.innerHTML = '<p class="bx-note">مجموعتك ' + r.count + ' من ' + r.total + ' · تقدر تخليه شخصيتك من «أنا»</p>'; if (S.daily) S.daily.stickers = (S.daily.stickers || []).concat(r.prize); }
  else if (r.xp) { emo.innerHTML = '<span class="bx bx-pop">⚡</span>'; hd.textContent = '+' + r.xp + ' نقطة لمستواك!'; act.innerHTML = '<p class="bx-note">كمّلت الملصقات كلها 🌟 الصندوق صار يعطيك نقاط مستوى</p>'; if (r.xp_total != null) lvlShow(r.xp_total); }
  else { emo.innerHTML = '<span class="bx bx-pop">🌟</span>'; hd.textContent = 'كمّلت المجموعة كلها!'; act.innerHTML = ''; }
};
/* knockout bracket (one head-to-head round per day after the points phase) + honor board */
async function loadKo(){
  const el0 = document.getElementById('ko'); if (el0) el0.innerHTML = '<div class="ko-load" role="status"><div class="spin sm"></div><span>جارٍ تحميل التصفيات…</span></div>';
  let b; try { b = await rpc('student_bracket', { p_token: S.token }); }
  catch(e){ const e2 = document.getElementById('ko'); if (e2) e2.innerHTML = '<div class="ko-load" role="alert"><span>تعذّر تحميل التصفيات. تأكد من الاتصال.</span><button class="btn soft" data-act="s-ko-retry">إعادة المحاولة</button></div>'; return; }
  const el = document.getElementById('ko'); if (!el || !b) return;
  let top = '';
  if (b.my_match && S.home.phase === 'knockout') top = b.my_match.played
    ? '<div class="ko-me done">لعبت مواجهة اليوم ضد <b>' + esc(b.my_match.opponent || '—') + '</b>. تظهر النتيجة عندما ينهي منافسك جولته.</div>'
    : '<div class="ko-me">مواجهتك اليوم ضد <b>' + esc(b.my_match.opponent || '—') + '</b></div><button class="btn accent" data-act="s-start" data-kind="knockout">' + ic('play') + ' ابدأ المواجهة</button>';
  el.innerHTML = top + bracketHtml(b, b.me) + honorHtml(b);
}
ACTS['s-ko-retry'] = () => loadKo();
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
/* v154 badges with levels: student_home.badges = [{k, n}] (old format {k, on, n} still read) */
const BG2 = [
  { k: 'fast', i: '⚡', n: 'البرق', d: 'إجابة صحيحة في أقل من 3 ثوانٍ', t: [1, 10, 50], u: 'إجابة' },
  { k: 'first', i: '🎯', n: 'أول جولة', d: 'أنهيت أول جولة رسمية', t: [1], u: 'جولة' },
  { k: 'practice', i: '🏋️', n: 'المتدرّب', d: 'جولات تدريب', t: [10, 25, 50], u: 'جولة' },
  { k: 'streak', i: '🔥', n: 'متتالي', d: 'أيام لعب وراء بعض', t: [3, 7, 30], u: 'يوم' },
  { k: 'perfect', i: '💯', n: 'كلها صح', d: 'جولة كل أسئلتها صح', t: [1, 5, 20], u: 'جولة' },
  { k: 'correct', i: '📚', n: 'المجتهد', d: 'إجابات صحيحة', t: [25, 100, 500], u: 'إجابة' }];
const BG_LV = [['br', 'برونزي'], ['sv', 'فضي'], ['gd', 'ذهبي']];
function bgVals(){ const h = S.home || {}, v = {}; ((h.badges) || []).forEach(x => {
    const old = { practice10: 'practice', streak3: 'streak' }[x.k] || x.k;
    v[old] = x.n != null ? Number(x.n) : x.on ? (old === 'streak' ? 3 : 1) : 0; });
  if (h.streak && (v.streak || 0) < h.streak) v.streak = h.streak;
  return BG2.map(b => Object.assign({ v: v[b.k] || 0 }, b)); }
const bgLv = b => b.t.filter(x => b.v >= x).length;
function bgCard(b){ const l = bgLv(b), max = l === b.t.length, nx = b.t[l], on = l > 0;
  return '<button class="bg2 ' + (on ? 'on' : 'off') + '" data-act="bg2-det" data-k="' + b.k + '">' + (on ? '<span class="bg2-ok">✓</span>' : '') +
    '<span class="bg2-md">' + b.i + (on && b.t.length > 1 ? '<span class="bg2-lv ' + BG_LV[l - 1][0] + '">' + BG_LV[l - 1][1] + '</span>' : '') + '</span><b>' + b.n + '</b><small>' + b.d + '</small>' +
    (b.t.length > 1 ? '<span class="bg2-tier">' + b.t.map((_, j) => '<i class="' + (j < l ? BG_LV[j][0] : '') + '"></i>').join('') + '</span>' : '') +
    (max ? '<span class="bg2-cnt">✓ اكتملت</span>' : '<span class="bg2-bar"><i style="width:' + Math.round(Math.min(b.v, nx) * 100 / nx) + '%"></i></span><span class="bg2-cnt">' + Math.min(b.v, nx) + ' من ' + nx + '</span>') + '</button>'; }
function badgesHtml(){ const bs = bgVals(), n = bs.filter(b => bgLv(b) > 0).length;
  const frac = b => { const l = bgLv(b); return l === b.t.length ? -1 : b.v / b.t[l]; };
  const near = bs.filter(b => frac(b) >= 0).sort((a, b) => frac(b) - frac(a))[0];
  const sorted = bs.slice().sort((a, b) => (bgLv(b) > 0) - (bgLv(a) > 0) || frac(b) - frac(a));
  let nh = '';
  if (near && near.v > 0) { const nx = near.t[bgLv(near)], left = nx - near.v;
    nh = '<div class="bg2-next"><span class="bg2-md">' + near.i + '</span><div class="grow"><b>قربت! ' + near.n + '</b><small>باقي ' + left + ' ' + near.u + '</small><div class="bg2-nb"><i style="width:' + Math.round(near.v * 100 / nx) + '%"></i></div></div></div>'; }
  return '<div class="bg2-h"><b>شاراتي</b><span>(' + n + ' من ' + bs.length + ')</span></div>' + nh + '<div class="bg2-grid">' + sorted.map(bgCard).join('') + '</div>' +
    (S.home && S.home.streak ? '<p class="bg2-st">🔥 سلسلتك الحالية: ' + S.home.streak + ' يوم متتالي</p>' : ''); }
ACTS['bg2-det'] = t => { const b = bgVals().find(x => x.k === t.dataset.k); if (!b) return; const l = bgLv(b);
  modal('<div class="bg2-ds"><div class="bg2-md big">' + b.i + '</div><h3>' + b.n + '</h3><p>' + b.d + '</p><div class="bg2-steps">' +
    b.t.map((x, j) => '<div class="' + (j < l ? 'done' : '') + '"><i class="' + (b.t.length > 1 ? BG_LV[j][0] : 'rd') + '"></i>' + (b.t.length > 1 ? BG_LV[j][1] + ' · ' : '') + x + ' ' + b.u + '<small>' + (j < l ? '✓ كسبتها' : Math.min(b.v, x) + ' من ' + x) + '</small></div>').join('') +
    '</div><button class="btn" data-act="close-modal">تم</button></div>'); };
/* new-badge popup: compares levels with the last ones this device saw; first visit only stores them */
function bgCheck(){ const h = S.home; if (!h || S.demo || !h.student || !h.student.id || !(h.badges || []).some(x => x.k === 'correct')) return;
  const key = 'mc_bg_' + h.student.id, bs = bgVals(), cur = {}; bs.forEach(b => cur[b.k] = bgLv(b));
  let old = null; try { old = JSON.parse(LS.get(key) || 'null'); } catch(e){}
  LS.set(key, JSON.stringify(cur));
  if (!old) return;
  const won = bs.filter(b => cur[b.k] > (old[b.k] || 0)).map(b => [b, cur[b.k]]);
  if (won.length) bgWin(won); }
function bgWin(won){
  document.querySelectorAll('.bg2-win').forEach(x => x.remove());
  const w = document.createElement('div'); w.className = 'bg2-win'; let left = won.slice();
  w.innerHTML = '<div class="bg2-wb"><div class="bg2-stk"></div><div class="bg2-hint">اسحب يمين أو يسار ↔</div><div class="bg2-dots"></div><button class="bg2-sh" data-w="share">📤 شارك الشارة</button><div class="bg2-two"><button class="g" data-w="see">شوف شاراتي</button><button class="r" data-w="ok">تم</button></div></div>';
  document.body.appendChild(w);
  const stk = w.querySelector('.bg2-stk');
  stk.innerHTML = left.map(([b, l]) => '<div class="bg2-c"><small>كسبت شارة جديدة!</small><div class="bg2-glow">' + b.i + (b.t.length > 1 ? '<span class="bg2-lv ' + BG_LV[l - 1][0] + '">' + BG_LV[l - 1][1] + '</span>' : '') + '</div><h3>' + b.n + '</h3><p>' + b.d + '</p></div>').reverse().join('');
  const conf = () => { const cs = ['#C8102E', '#F5B72B', '#1F9D55', '#1E6FD9', '#fff']; for (let i = 0; i < 36; i++) { const d = document.createElement('i'); d.className = 'bg2-cf'; d.style.left = Math.random() * 100 + '%'; d.style.background = cs[i % 5]; d.style.animationDuration = (1.6 + Math.random() * 1.4) + 's'; d.style.animationDelay = Math.random() * .4 + 's'; w.appendChild(d); setTimeout(() => d.remove(), 3500); } };
  const draw = () => { const cs = [...stk.children];
    cs.forEach((c, i) => { const d = cs.length - 1 - i; c.style.transition = 'transform .55s cubic-bezier(.2,.9,.3,1.15),opacity .4s'; c.style.transform = 'translateY(' + (-d * 34) + 'px) scale(' + (1 - d * .08) + ')'; c.style.zIndex = 10 - d; c.style.opacity = d > 2 ? 0 : 1; });
    w.querySelector('.bg2-dots').innerHTML = won.length > 1 ? won.map((_, i) => '<i class="' + (i === won.length - left.length ? 'on' : '') + '"></i>').join('') : '';
    w.querySelector('.bg2-hint').style.visibility = left.length > 1 ? 'visible' : 'hidden';
    const el = cs[cs.length - 1]; if (!el || left.length < 2) return;
    let x0 = null, dx = 0; el.style.touchAction = 'pan-y';
    el.onpointerdown = e => { x0 = e.clientX; dx = 0; el.setPointerCapture(e.pointerId); el.style.transition = 'none'; };
    el.onpointermove = e => { if (x0 == null) return; dx = e.clientX - x0; el.style.transform = 'translateX(' + dx + 'px) rotate(' + dx / 18 + 'deg)'; };
    el.onpointerup = el.onpointercancel = () => { if (x0 == null) return; x0 = null; el.style.transition = 'transform .3s,opacity .3s';
      if (Math.abs(dx) > 80) { el.style.transform = 'translateX(' + (dx > 0 ? 500 : -500) + 'px) rotate(' + dx / 6 + 'deg)'; el.style.opacity = 0; setTimeout(() => { el.remove(); left.shift(); draw(); setTimeout(conf, 250); }, 220); }
      else el.style.transform = ''; }; };
  draw(); conf();
  w.addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (!b) return; if (b.dataset.w === 'share') { const cur = left[0]; if (cur) shareCard('badge', { n: cur[0].n, d: cur[0].d, i: cur[0].i }); return; } w.remove(); if (b.dataset.w === 'see') ACTS['s-tab']({ dataset: { t: 'bd' } }); });
}
ACTS['bg2-try'] = () => { const bs = bgVals(); bgWin([[bs[0], 1], [bs[2], 1], [bs[1], 1]]); };
/* student bottom bar (v106): home · ranking · badges · me. Not shown during a round (the round replaces the page). */
const S_TABS = ['home', 'lb', 'ar', 'bd', 'me'];
function lensMove(nav, i){ const l = nav && nav.querySelector('.lens'); if (!l) return; const cur = nav.dataset.cur != null ? nav.dataset.cur : String(l.style.getPropertyValue('--i')).trim(); nav.dataset.cur = String(i);
  if (cur !== String(i)) { l.classList.add('move'); nav.classList.remove('bump'); void nav.offsetWidth; nav.classList.add('bump'); clearTimeout(l._mv); l._mv = setTimeout(() => { l.classList.remove('move'); nav.classList.remove('bump'); }, 230); } l.style.setProperty('--i', i); }
const S_LN = (() => { const f = d => '<svg class="nav-ln" viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>'; return {
  home: f('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  lb: f('<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/><path d="M12 14v4M8.5 20h7"/>'),
  bd: f('<path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z"/>'),
  me: f('<circle cx="12" cy="8" r="4"/><path d="M4 20.5c1-4 4.2-6 8-6s7 2 8 6"/>') }; })();
/* v306: keep the student tab bar node on screen between pages (no icon flicker), like the teacher bar */
function sPut(html){ const old = $app.querySelector(':scope > .s-nav'); $app.innerHTML = html; const nw = $app.querySelector(':scope > .s-nav');
  if (!old || !nw) return; const ob = old.querySelectorAll('button'), nb = nw.querySelectorAll('button'); if (ob.length !== nb.length) return; let k = 0;
  nb.forEach((b, j) => { const on = b.classList.contains('on'); if (on) k = j; ob[j].classList.toggle('on', on); ob[j].classList.remove('hover'); if (on) ob[j].setAttribute('aria-current', 'page'); else ob[j].removeAttribute('aria-current'); });
  nw.replaceWith(old); lensMove(old, k); }
function sNav(cur){ const i = Math.max(0, S_TABS.indexOf(cur)), p = S.navPrev == null ? i : S.navPrev; S.navPrev = i;
  setTimeout(() => requestAnimationFrame(() => lensMove(document.querySelector('.s-nav'), i)), 20);
  return '<nav class="s-nav"><span class="lens" style="--i:' + p + ';--n:5"></span>' + [['home', S_LN.home, 'صفّي'], ['lb', S_LN.lb, 'الترتيب'], ['ar', '', 'الحلبة'], ['bd', S_LN.bd, 'شاراتي'], ['me', S_LN.me, 'أنا']].map(x => '<button class="' + (cur === x[0] ? 'on' : '') + (x[0] === 'ar' ? ' s-ar' : '') + '" data-act="s-tab" data-t="' + x[0] + '"' + (x[0] === 'ar' ? ' aria-label="الحلبة"' : '') + (cur === x[0] ? ' aria-current="page"' : '') + '>' + (x[0] === 'ar' ? '<span class="i sq">' + NAV_SQ + '</span>' : x[1] + '<span>' + x[2] + '</span>') + '</button>').join('') + '</nav>'; }
function sPage(t, body){ const th = document.body.dataset.theme || 'mid'; S.tab = t; closeModals(); stopTimer(); clearInterval(S.cdT);
  sPut('<div class="sh s-tabpg pvx">' + body + '</div>' + sNav(t)); scrollTo(0, 0); }
/* ===== v275 الحلبة (public arena), phase 1: 60 levels on a stopwatch dial, duel vs a recorded round, tug of war =====
   Server: sql/arena.sql (arena_home / arena_start / arena_served / arena_answer). */
const AR = { h: null, r: null, gen: 0, busy: false, tm: null, ot: 0, lock: false };
const AR_COL = { r: ['#FF453A', '#B3261E'], b: ['#0A84FF', '#0A5FCC'], y: ['#FFD60A', '#8F6B00'], g: ['#30D158', '#1B8A3A'] };
const AR_SUBJ = {
  'التربية الإسلامية': { n: 'إسلامية', c: 'g', b: ['moon', 'star', 'dome'] },
  'الاجتماعيات': { n: 'اجتماعيات', c: 'b', b: ['globe', 'pin', 'flag'] },
  'عامة': { n: 'عامة', c: 'y', b: ['?', 'bulb', '!'] },
  'اللغة العربية': { n: 'عربي', c: 'r', b: ['أ', 'ب', 'ت'] },
  'اللغة الإنجليزية': { n: 'إنجليزي', c: 'b', b: ['A', 'B', 'C'] },
  'الرياضيات': { n: 'رياضيات', c: 'y', b: ['+', '×', '='] },
  'العلوم': { n: 'علوم', c: 'g', b: ['?', 'bulb', '!'] }
};
function arSubj(s, i){ return AR_SUBJ[s] || { n: s, c: 'rbyg'[(i || 0) % 4], b: ['?', 'bulb', '!'] }; }
function arGlyph(g, ink){
  if (g === 'moon') return '<path d="M33 12a20 20 0 1 0 16 31A16.5 16.5 0 1 1 33 12z" fill="' + ink + '"/>';
  if (g === 'star') return '<path d="M30 9l5.2 6.3 8.1-.9-.9 8.1 6.3 5.2-6.3 5.2.9 8.1-8.1-.9L30 46.400l-5.2-6.3-8.1.9.9-8.1-6.3-5.2 6.3-5.2-.9-8.1 8.1.9z" fill="' + ink + '"/>';
  if (g === 'dome') return '<path d="M30 9v6" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/><path d="M14 38c0-12 7-19 16-23 9 4 16 11 16 23z" fill="' + ink + '"/><rect x="11" y="38" width="38" height="9" rx="3" fill="' + ink + '"/>';
  if (g === 'globe') return '<circle cx="30" cy="30" r="18" fill="none" stroke="' + ink + '" stroke-width="4"/><path d="M12 30h36M30 12c-9 9-9 27 0 36M30 12c9 9 9 27 0 36" fill="none" stroke="' + ink + '" stroke-width="3"/>';
  if (g === 'pin') return '<path d="M30 10c-9 0-15 6.500-15 14.500C15 35 30 50 30 50s15-15 15-25.500C45 16.500 39 10 30 10z" fill="' + ink + '"/><circle cx="30" cy="24.500" r="6" fill="#fff"/>';
  if (g === 'flag') return '<path d="M17 10v40" stroke="' + ink + '" stroke-width="4" stroke-linecap="round"/><path d="M19 12h26l-7 9 7 9H19z" fill="' + ink + '"/>';
  if (g === 'bulb') return '<path d="M30 9a15 15 0 0 0-9 27c1.500 1.200 2 2.500 2 4h14c0-1.500.5-2.800 2-4A15 15 0 0 0 30 9z" fill="' + ink + '"/><rect x="24" y="43" width="12" height="7" rx="3" fill="' + ink + '"/>';
  const lat = /[A-Za-z+×=?!]/.test(g);
  return '<text x="30" y="' + (lat ? 43 : 42) + '" text-anchor="middle" font-family="' + (lat ? 'Arial Black,Arial,sans-serif' : 'Cairo,sans-serif') + '" font-weight="900" font-size="' + (lat ? 36 : 36) + '" fill="' + ink + '">' + g + '</text>';
}
function arArt(d){ const ink = AR_COL[d.c][1], pos = [[20, 34, -11], [86, 50, 7], [28, 112, -5]];
  return '<svg class="ar-art" viewBox="0 0 252 258" aria-hidden="true">' + d.b.map((g, i) => '<g transform="translate(' + pos[i][0] + ' ' + pos[i][1] + ') rotate(' + pos[i][2] + ' 30 30)"><g class="ar-blk"><rect x="0" y="6" width="60" height="60" rx="15" fill="rgba(0,0,0,.28)"/><rect width="60" height="60" rx="15" fill="#fff"/>' + arGlyph(g, ink) + '</g></g>').join('') + '</svg>'; }
const AR_SK={a:['#f6d3b3','#e3b08a'],b:['#e9bb93','#cf9a6f'],c:['#c98f63','#a9744b']};
const AR_AV={
 b1:{k:'ghutra',bg:'#C8102E',sk:'b',m:'smile',cl:'#fff'},
 b2:{k:'shmagh',bg:'#3A3A3C',sk:'c',m:'grin',cl:'#fff'},
 b3:{k:'cap',bg:'#0A84FF',sk:'a',m:'smirk',c:'#FFD60A',cl:'#fff'},
 b4:{k:'hair',bg:'#30D158',sk:'b',m:'grin',c:'#2a1d16',cl:'#0A84FF',gl:1},
 g1:{k:'hijab',bg:'#0A84FF',sk:'a',m:'smile',c:'#ff8fb3',c2:'#e56d96'},
 g2:{k:'hijab',bg:'#FFD60A',sk:'c',m:'grin',c:'#23b5a6',c2:'#178f83',gl:1},
 g3:{k:'hijab',bg:'#C8102E',sk:'b',m:'smile',c:'#f3f1fa',c2:'#cfcbe0'},
 g4:{k:'bow',bg:'#30D158',sk:'a',m:'grin',c:'#3a2418',cl:'#fff'}
};
let AR_UID=0;
function arFace(id){
  const a=AR_AV[id], u='arc'+(++AR_UID), [sk,sk2]=AR_SK[a.sk], cov=a.k==='ghutra'||a.k==='shmagh'||a.k==='hijab';
  const rays=Array.from({length:8},(_,i)=>`<path d="M50 50L${(50+90*Math.cos(i*Math.PI/4-.16)).toFixed(1)} ${(50+90*Math.sin(i*Math.PI/4-.16)).toFixed(1)}L${(50+90*Math.cos(i*Math.PI/4+.16)).toFixed(1)} ${(50+90*Math.sin(i*Math.PI/4+.16)).toFixed(1)}z" fill="#fff" opacity=".09"/>`).join('');
  const mouth={smile:'<path d="M42 62q8 7 16 0" stroke="#3a2015" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
    grin:'<path d="M41 60h18a9 9 0 0 1-18 0z" fill="#3a2015"/><path d="M43 60h14v3.200H43z" fill="#fff"/>',
    smirk:'<path d="M43 63q9 4 15-3" stroke="#3a2015" stroke-width="2.6" fill="none" stroke-linecap="round"/>'}[a.m];
  const rx=cov?17.500:21;
  const face=`<ellipse cx="50" cy="51" rx="${rx}" ry="21" fill="${sk}"/>
    <ellipse cx="38.500" cy="58" rx="4.200" ry="3" fill="#ff7b7b" opacity=".35"/><ellipse cx="61.500" cy="58" rx="4.200" ry="3" fill="#ff7b7b" opacity=".35"/>
    <ellipse cx="42" cy="49" rx="4.200" ry="5" fill="#fff"/><ellipse cx="58" cy="49" rx="4.200" ry="5" fill="#fff"/>
    <circle cx="42.800" cy="49.800" r="2.900" fill="#2b1810"/><circle cx="58.800" cy="49.800" r="2.900" fill="#2b1810"/>
    <circle cx="43.800" cy="48.600" r="1" fill="#fff"/><circle cx="59.800" cy="48.600" r="1" fill="#fff"/>
    <path d="M37.500 42.500q4.500-3 9-.800M53.500 41.700q4.500-2.200 9 .800" stroke="#3a2015" stroke-width="2.200" fill="none" stroke-linecap="round"/>
    ${a.m==='smirk'?'':''}${mouth}
    ${a.gl?'<g fill="none" stroke="#1b1b1f" stroke-width="2.200"><circle cx="42" cy="49.500" r="6.800"/><circle cx="58" cy="49.500" r="6.800"/><path d="M48.800 49h2.400"/></g>':''}`;
  const neck=`<rect x="44" y="66" width="12" height="12" rx="4" fill="${sk2}"/>`;
  const body=c=>`<path d="M16 104c0-18 14-28 34-28s34 10 34 28z" fill="${c}"/><path d="M42 77q8 8 16 0" stroke="rgba(0,0,0,.18)" stroke-width="2.500" fill="none" stroke-linecap="round"/>`;
  const ears=`<circle cx="29.500" cy="52" r="4.500" fill="${sk2}"/><circle cx="70.500" cy="52" r="4.500" fill="${sk2}"/>`;
  let g='';
  if(a.k==='ghutra'||a.k==='shmagh'){
    const f=a.k==='shmagh'?`url(#p${u})`:'#fff', sh=a.k==='shmagh'?'rgba(120,10,25,.35)':'#d9dbe3';
    g=`${a.k==='shmagh'?`<defs><pattern id="p${u}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#fff"/><rect width="3.500" height="3.500" fill="#d2283f"/><rect x="3.500" y="3.500" width="3.500" height="3.500" fill="#d2283f"/></pattern></defs>`:''}
      <path d="M23 50C21 16 79 16 77 50L86 100H14z" fill="${f}"/>
      <path d="M26 60L20 98M74 60l6 38" stroke="${sh}" stroke-width="2.500" stroke-linecap="round"/>
      ${body('#fff')}${neck}${face}
      <path d="M30.500 44C31 26 69 26 69.500 44 58 37.500 42 37.500 30.500 44z" fill="${f}"/>
      <path d="M27 36.500q23-13 46 0" stroke="#15151a" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M29.500 30q20.500-11.500 41 0" stroke="#15151a" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  }
  if(a.k==='cap') g=`${body(a.cl)}${neck}${ears}<path d="M29 48C27 34 36 28 50 28s23 6 21 20z" fill="#2a1d16"/>${face}
      <path d="M28 44C28 22 72 22 72 44 58 39 42 39 28 44z" fill="${a.c}"/><path d="M28 44c14-5 30-5 44 0" stroke="rgba(0,0,0,.2)" stroke-width="2" fill="none"/>
      <path d="M20 45.500c2-5 16-6.500 34-3.500l-1 5.500c-12-1.500-24-1-33 2.500z" fill="${a.c}"/><path d="M20 45.500c9-3.500 21-4 33-2.500" stroke="rgba(0,0,0,.25)" stroke-width="2" fill="none"/>
      <circle cx="50" cy="26" r="2.600" fill="#fff"/>`;
  if(a.k==='hair') g=`${body(a.cl)}${neck}${ears}${face}
      <path d="M28 47C24 30 34 23 41 26c1-5 8-7 12-3 6-4 14 0 14 5 6 1 9 10 5 19-3-7-8-11-13-10-4 1-7-2-9-4-3 5-9 4-12 5-5 2-8 5-10 9z" fill="${a.c}"/>`;
  if(a.k==='hijab') g=`<path d="M21 52C19 16 81 16 79 52c0 18 6 32 10 48H11c4-16 10-30 10-48z" fill="${a.c}"/>
      <path d="M30 70c6 8 14 11 20 11s14-3 20-11" stroke="${a.c2}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M26 82q24 12 48 0" stroke="${a.c2}" stroke-width="2.500" fill="none" stroke-linecap="round" opacity=".7"/>
      ${face}
      <path d="M32 44C33 28 67 28 68 44 58 36.500 42 36.500 32 44z" fill="${a.c2}"/>
      <path d="M31 46C31 24 69 24 69 46" stroke="${a.c}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  if(a.k==='bow') g=`<path d="M25 52C22 22 78 22 75 52l5 36H20z" fill="${a.c}"/>${body(a.cl)}${neck}${ears}${face}
      <path d="M28 49C26 30 40 24 50 26c12-3 24 5 22 23-5-9-13-13-22-13s-17 4-22 13z" fill="${a.c}"/>
      <path d="M64 26l-10-6v12zM64 26l10-6v12z" fill="#F5B72B"/><circle cx="64" cy="26" r="3.400" fill="#ffd96b"/>`;
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="${u}"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#${u})"><rect width="100" height="100" fill="${a.bg}"/>${rays}${g}</g></svg>`;
}
const AR_EM={
 laugh:'<circle cx="20" cy="20" r="18" fill="#F5B72B"/><path d="M10 16q4-5 7 0M23 16q4-5 7 0" stroke="#3b2500" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M10 22h20a10 10 0 0 1-20 0z" fill="#3b2500"/><path d="M14 28q6-4 12 0a10 10 0 0 1-12 0z" fill="#ff6b81"/>',
 cry:'<circle cx="20" cy="20" r="18" fill="#F5B72B"/><path d="M10 15l6 2M30 15l-6 2" stroke="#3b2500" stroke-width="2.5" stroke-linecap="round"/><path d="M14 30q6-6 12 0" stroke="#3b2500" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M12 19c-3 5-3 9 0 9s3-4 0-9zM28 19c-3 5-3 9 0 9s3-4 0-9z" fill="#4db8ff"/>',
 strong:'<path d="M8 28c0-9 4-14 9-14l2-8h7l-1 9c6 1 9 5 9 11 0 6-5 9-13 9S8 33 8 28z" fill="#f1c9a5"/><path d="M17 15c2 4 5 5 9 4" stroke="#b98a62" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
 fire:'<path d="M20 3c2 7 10 10 10 20a10 10 0 0 1-20 0c0-5 3-7 4-11 2 2 3 3 4 5 1-5 0-9 2-14z" fill="#ff5a1f"/><path d="M20 20c2 3 5 4 5 8a5 5 0 0 1-10 0c0-3 3-4 5-8z" fill="#F5B72B"/>',
 clap:'<path d="M9 22l8-12 4 3-4 7 9-9 4 4-7 8 6-4 3 4-12 12c-5 4-12 0-13-6z" fill="#f1c9a5"/><path d="M27 5l1 4M33 8l-3 3M35 14l-4 1" stroke="#F5B72B" stroke-width="2.5" stroke-linecap="round"/>',
 wow:'<circle cx="20" cy="20" r="18" fill="#F5B72B"/><circle cx="13" cy="16" r="3" fill="#3b2500"/><circle cx="27" cy="16" r="3" fill="#3b2500"/><ellipse cx="20" cy="28" rx="4.5" ry="6" fill="#3b2500"/>'
};
const AR_EMN = { laugh: 'ضحك', cry: 'بكاء', strong: 'قوة', fire: 'نار', clap: 'تصفيق', wow: 'واو' };
const AR_W = { b: ['صقر','فهد','نجم','بطل','ذيب','فارس','برق','نسر','أسد','سهم'], g: ['نجمة','فراشة','قمر','بطلة','لؤلؤة','وردة','شمس','غزالة','ريم','نسمة'], x: ['الحلبة','الدقيقة','الذكاء','السرعة','العلم','المعرفة'] };
function arEm(k){ return '<svg viewBox="0 0 40 40" aria-hidden="true">' + AR_EM[k] + '</svg>'; }
function arAv(av, name, cls, dr){ if (/^[bg][1-4]$/.test(dr || '')) return '<span class="ar-av dr' + (cls ? ' ' + cls : '') + '">' + arFace(dr) + '</span>';
  return '<span class="ar-av' + (cls ? ' ' + cls : '') + '">' + esc(av || String(name || '؟').trim().charAt(0)) + '</span>'; }
/* «لقبك وشكلك»: the nickname is rolled from fixed word lists (never typed), the look is one of eight drawn characters */
function arRoll(g, not){ const pk = a => a[Math.floor(Math.random() * a.length)]; let n; do { n = pk(AR_W[g]) + ' ' + pk(AR_W.x); } while (n === not); return n; }
function arPfHtml(){ const f = AR.pf;
  return '<h3>لقبك وشكلك</h3><div class="ar-pfg">' + [['b', 'ولد'], ['g', 'بنت']].map(x => '<button class="' + (f.g === x[0] ? 'on' : '') + '" data-act="ar-pf-g" data-g="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
    '<div class="ar-pfa">' + [1, 2, 3, 4].map(i => '<button class="' + (f.av === f.g + i ? 'on' : '') + '" data-act="ar-pf-av" data-v="' + f.g + i + '" aria-label="شكل ' + i + '">' + arFace(f.g + i) + '</button>').join('') + '</div>' +
    '<div class="ar-pfn"><b>' + esc(f.nick) + '</b><button data-act="ar-pf-roll" aria-label="لقب ثاني"><svg viewBox="0 0 40 40" aria-hidden="true"><rect x="5" y="5" width="30" height="30" rx="8" fill="#F5F5F7"/><circle cx="13.5" cy="13.5" r="3" fill="#C8102E"/><circle cx="26.5" cy="13.5" r="3" fill="#1C1C1E"/><circle cx="20" cy="20" r="3" fill="#1C1C1E"/><circle cx="13.5" cy="26.5" r="3" fill="#1C1C1E"/><circle cx="26.5" cy="26.5" r="3" fill="#C8102E"/></svg>غيّر</button></div>' +
    '<button class="btn" data-act="ar-pf-save">حفظ</button><p class="ar-pfh">اسمك الحقيقي ما يطلع في الحلبة، بس لقبك.</p>'; }
function arPfDraw(){ const el = document.getElementById('ar-pf'); if (el) el.innerHTML = arPfHtml(); }
function arProfile(){ const h = AR.h || {}, st = (S.home && S.home.student) || {};
  const g = h.av ? h.av.charAt(0) : (st.gender === 'f' ? 'g' : 'b'), w = String(h.nick || '').split(' ');
  AR.pf = { g, av: h.av || g + '1', nick: h.av && AR_W[g].indexOf(w[0]) >= 0 && AR_W.x.indexOf(w[1]) >= 0 && w.length === 2 ? h.nick : arRoll(g) };
  closeModals(); modal('<div class="ar-pf" id="ar-pf">' + arPfHtml() + '</div>'); }
ACTS['ar-pf'] = () => { if (AR.h && !S.demo) arProfile(); };
ACTS['ar-pf-g'] = t => { const f = AR.pf, g = t.dataset.g; if (!f || f.g === g) return; f.g = g; f.av = g + f.av.charAt(1); f.nick = arRoll(g); arPfDraw(); };
ACTS['ar-pf-av'] = t => { if (!AR.pf) return; AR.pf.av = t.dataset.v; arPfDraw(); };
ACTS['ar-pf-roll'] = () => { const f = AR.pf; if (!f) return; f.nick = arRoll(f.g, f.nick); arPfDraw(); FX.tick && FX.tick(); };
ACTS['ar-pf-save'] = async t => { const f = AR.pf; if (!f || t.disabled) return; t.disabled = true;
  try { await rpc('arena_profile', { p_token: S.token, p_nick: f.nick, p_av: f.av }); if (AR.h) { AR.h.nick = f.nick; AR.h.av = f.av; AR.h.setup = false; } closeModals(); if (S.tab === 'ar') arDraw(); }
  catch(e){ t.disabled = false; toast(errMsg(e)); } };
/* reactions: no chat, six drawn faces, three per round; the opponent's recorded ones replay at the moment they were sent */
function arMuted(){ return LS.get('mc_ar_mute') === '1'; }
function arBubble(id, k){ const el = document.getElementById(id); if (!el || !AR_EM[k]) return; const b = document.createElement('span'); b.className = 'ar-bub'; b.innerHTML = arEm(k); el.appendChild(b); setTimeout(() => b.remove(), 1800); }
function arEmoHtml(){ const r = AR.r, m = arMuted();
  return '<div class="ar-emo' + (m ? ' off' : '') + '" id="ar-emo">' + (m ? '<button class="mute" data-act="ar-mute">التفاعلات مقفلة · شغّلها</button>'
    : Object.keys(AR_EM).map(k => '<button data-act="ar-emo" data-k="' + k + '"' + (r.emoN > 0 ? '' : ' disabled') + ' aria-label="' + AR_EMN[k] + '">' + arEm(k) + '</button>').join('') +
      '<button class="mute" data-act="ar-mute" aria-label="اقفل التفاعلات"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 10h22a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H19l-7 6v-6H9a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z" fill="none" stroke="#98989F" stroke-width="3" stroke-linejoin="round"/><path d="M7 34L33 6" stroke="#98989F" stroke-width="3.5" stroke-linecap="round"/></svg></button>') + '</div>'; }
ACTS['ar-mute'] = () => { LS.set('mc_ar_mute', arMuted() ? '0' : '1'); const el = document.getElementById('ar-emo'); if (el && AR.r) el.outerHTML = arEmoHtml(); };
ACTS['ar-emo'] = t => { const r = AR.r; if (!r || !(r.emoN > 0)) return; r.emoN--; arBubble('ar-mav', t.dataset.k);
  if (r.emoN <= 0) document.querySelectorAll('#ar-emo button[data-k]').forEach(b => { b.disabled = true; });
  rpc('arena_emote', { p_token: S.token, p_round: r.round, p_k: t.dataset.k, p_t: AR.lock ? 0.5 : Math.round((performance.now() - (AR.q0 || 0)) / 100) / 10 }).catch(() => {}); };
/* the dial: 60 ticks = 60 levels, the red hand is where you are; gates mark where 4 and 6 questions open */
function arDial(l){
  const C = 118, lvl = l.n; let t = '';
  for (let i = 1; i <= 60; i++) { const a = i * 6 * Math.PI / 180, big = i % 5 === 0, r1 = big ? 97 : 101, r2 = 112;
    const col = i < lvl ? (i <= 10 ? '#D08B4A' : i <= 30 ? '#C9CED6' : '#F5B72B') : i === lvl ? '#fff' : '#2A2A2E';
    t += '<line' + (i === lvl ? ' class="ar-cur"' : '') + ' x1="' + (C + r1 * Math.sin(a)).toFixed(1) + '" y1="' + (C - r1 * Math.cos(a)).toFixed(1) + '" x2="' + (C + r2 * Math.sin(a)).toFixed(1) + '" y2="' + (C - r2 * Math.cos(a)).toFixed(1) + '" stroke="' + col + '" stroke-width="' + (i === lvl ? 5 : big ? 4 : 3) + '" stroke-linecap="round"/>'; }
  const gate = (i, txt) => { const a = i * 6 * Math.PI / 180, x = (C + 84 * Math.sin(a)).toFixed(1), y = C - 84 * Math.cos(a), open = lvl >= i;
    return '<circle cx="' + x + '" cy="' + y.toFixed(1) + '" r="10" fill="' + (open ? '#F5B72B' : '#1C1608') + '" stroke="#F5B72B" stroke-width="1.5"/><text x="' + x + '" y="' + (y + 4.5).toFixed(1) + '" text-anchor="middle" font-family="Cairo,sans-serif" font-weight="900" font-size="13" fill="' + (open ? '#3B2500' : '#F5B72B') + '">' + txt + '</text>'; };
  const R = 62, L = 2 * Math.PI * R, p = Math.min(1, l.into / l.need);
  return '<svg class="ar-dial-svg" viewBox="0 0 236 236" aria-hidden="true"><circle cx="118" cy="118" r="116" fill="#0C0C0D" stroke="#1D1D20" stroke-width="2"/>' + t + gate(11, '4') + gate(31, '6') +
    '<circle cx="118" cy="118" r="62" fill="none" stroke="#232326" stroke-width="6"/><circle cx="118" cy="118" r="62" fill="none" stroke="#F5B72B" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + (L * p).toFixed(1) + ' ' + L.toFixed(1) + '" transform="rotate(-90 118 118)"/>' +
    '<g class="ar-hand" style="transform:rotate(' + (lvl * 6) + 'deg)"><line x1="118" y1="52" x2="118" y2="24" stroke="#C8102E" stroke-width="5" stroke-linecap="round"/><circle cx="118" cy="24" r="4.5" fill="#C8102E"/></g></svg>';
}
async function arHome(){
  S.tab = 'ar'; const g = ++AR.gen; clearTimeout(AR.ot); AR.tm = null;
  if (S.demo) return sPage('ar', '<div class="s-pgc"><p class="muted center">الحلبة تظهر في الحساب الفعلي.</p></div>');
  if (AR.h) arDraw(); else sPage('ar', '<div class="s-pgc"><div class="spin"></div></div>');
  try { AR.h = await rpc('arena_home', { p_token: S.token }); }
  catch(e){ if (AR.gen === g && S.tab === 'ar') sPage('ar', '<div class="s-pgc col"><div class="err">' + esc(errMsg(e)) + '</div><button class="btn" data-act="s-tab" data-t="ar">إعادة المحاولة</button></div>'); return; }
  if (AR.gen === g && S.tab === 'ar') { arDraw(); if (AR.h.setup && !AR.asked) { AR.asked = true; arProfile(); } arNow(g); }
}
/* the green dot counts who is here right now (searching or inside a round); refreshed every 8s without redrawing the page */
function arNow(g){ setTimeout(async () => { if (AR.gen !== g || S.tab !== 'ar' || !document.getElementById('ar-deck')) return;
  try { const h = await rpc('arena_home', { p_token: S.token }); if (AR.gen !== g || S.tab !== 'ar') return; AR.h = h;
    const top = document.getElementById('ar-now'); if (top) { top.hidden = !h.now; top.querySelector('b').textContent = h.now || 0; }
    document.querySelectorAll('.ar-pill[data-s]').forEach(el => { const x = (h.subjects || []).find(y => y.s === el.dataset.s), n = x && x.now || 0; el.hidden = !n; el.querySelector('b').textContent = n; });
  } catch(e){}
  arNow(g); }, 8000); }
function arDraw(){
  const h = AR.h, l = h.lvl, t = h.tier, subs = h.subjects || [];
  const stg = ['مبتدئ', 'محترف', 'أسطورة'], si = l.n < 11 ? 0 : l.n < 31 ? 1 : 2;
  const gate = l.n < 11 ? 'بوابة 4 أسئلة عند مستوى 11' : l.n < 31 ? 'بوابة 6 أسئلة عند مستوى 31' : l.n < 60 ? 'القمة عند مستوى 60' : '⭐ ' + (l.stars || 0);
  sPage('ar', '<div class="ar">' +
    '<div class="ar-top"><div><b class="ar-nm">' + esc(h.nick || '') + '</b></div>' + '<span class="ar-on" id="ar-now"' + (h.now ? '' : ' hidden') + '><i></i><b>' + (h.now || 0) + '</b> موجودين الحين</span>' + '</div>' +
    '<div class="ar-me"><div class="ar-me1"><button class="ar-avb" data-act="ar-pf" aria-label="غيّر لقبك وشكلك">' + arAv(h.avatar, h.nick, '', h.av) + '</button><div><h2>مستوى ' + l.n + '</h2><small>' + stg[si] + ' · ' + t.nq + ' أسئلة بالدقيقة</small></div></div>' +
      '<div class="ar-mbar"><i style="width:' + Math.max(3, Math.min(100, Math.round(l.into / Math.max(1, l.need) * 100))) + '%"></i></div>' +
      '<div class="ar-mrow"><span><b>' + l.into + '</b> / ' + l.need + ' نقطة</span><span>' + (l.n < 60 ? 'باقي <b>' + Math.max(0, l.need - l.into) + '</b> نقطة لمستوى ' + (l.n + 1) : '⭐ ' + (l.stars || 0)) + '</span></div></div>' +
    '<div class="ar-stg">' + [['🥉', 'مستوى 1 إلى 10', '3 أسئلة'], ['🥈', 'من مستوى 11', '4 أسئلة'], ['🥇', 'من مستوى 31', '6 أسئلة']].map((x, k) => '<div class="' + (k === si ? 'on' : k < si ? 'done' : '') + '"><span class="e">' + (k > si ? '🔒' : x[0]) + '</span><b>' + stg[k] + '</b><small>' + x[1] + '</small><small' + (k === si ? ' class="here">أنت هنا' : '>' + (k < si ? 'خلّصتها ✓' : x[2])) + '</small></div>').join('') + '</div>' +
    (subs.length ? '<div class="ar-deck" id="ar-deck">' + subs.map((x, i) => { const d = arSubj(x.s, i);
        return '<button class="ar-card" style="--c:' + AR_COL[d.c][0] + '" data-act="ar-play" data-s="' + esc(x.s) + '">' + arArt(d) + '<span class="ar-pill" data-s="' + esc(x.s) + '"' + (x.now ? '' : ' hidden') + '><i></i><b>' + (x.now || 0) + '</b> يلعبون الحين</span><span class="ar-cn">' + esc(d.n) + '</span><span class="ar-cta">العب ' + ic('play') + '</span></button>'; }).join('') + '</div>' +
      (subs.length > 1 ? '<div class="ar-dots" id="ar-dots">' + subs.map((_, i) => '<i' + (i ? '' : ' class="on"') + '></i>').join('') + '</div>' : '')
      : '<p class="muted center">الأسئلة تنضاف قريب.</p>') + '</div>');
  const dk = document.getElementById('ar-deck');
  if (dk) dk.addEventListener('scroll', () => { const w = dk.firstElementChild.offsetWidth + 12, i = Math.round(Math.abs(dk.scrollLeft) / w); document.querySelectorAll('#ar-dots i').forEach((d, k) => d.classList.toggle('on', k === i)); }, { passive: true });
}
ACTS['ar-play'] = async t => {
  if (AR.busy || S.demo) return; AR.busy = true; const g = ++AR.gen, s = t.dataset.s; stopTimer(); closeModals();
  const h = AR.h || {};
  $app.innerHTML = '<div class="sh pvx ar-find"><div class="ar-radar"><i></i><i></i><span class="sweep"></span>' + arAv(h.avatar, h.nick, '', h.av) + '</div><h2>ندوّر لك خصم…</h2><p id="ar-fp">' + esc(arSubj(s).n) + ' · قريب من مستواك</p><b class="ar-fs" id="ar-fs">0</b><button class="btn ar-fx ar-fnow" data-act="ar-now">ابدأ الحين</button><button class="btn ghost ar-fx" data-act="ar-cancel">إلغاء</button></div>';
  AR.now = false;
  try {
    /* the search takes 10 to 25 seconds, like a real queue; the round is only created once it ends, so cancelling costs nothing */
    let live = null, seeking = false, noSeek = false, lastSeek = -9999; const wait = 20000 + Math.random() * 10000, t0 = performance.now(), msgs = [esc(arSubj(s).n) + ' · قريب من مستواك', 'نطابق المستوى…', 'ندوّر بين اللاعبين…', 'قربنا…'];
    await new Promise(z => { const iv = setInterval(() => { const el = performance.now() - t0, n = document.getElementById('ar-fs'), fp = document.getElementById('ar-fp');
      if (AR.gen !== g || !n) { if (seeking) return; clearInterval(iv); return z(); }
      n.textContent = Math.floor(el / 1000); fp.innerHTML = msgs[Math.min(msgs.length - 1, Math.floor(el / wait * msgs.length))];
      /* ask the server every 1.5s: is someone else searching this subject right now? */
      if (!seeking && !live && !noSeek && el - lastSeek >= 1500 && el < wait && !AR.now) { seeking = true; lastSeek = el;
        rpc('arena_seek', { p_token: S.token, p_subject: s }).then(x => { if (x && x.round) live = x; }, () => { noSeek = true; }).then(() => { seeking = false; }); }
      if ((el >= wait || AR.now || live) && !seeking) { clearInterval(iv); z(); } }, 250); });
    if (AR.gen !== g) { if (live) rpc('arena_leave', { p_token: S.token, p_round: live.round }).catch(() => {}); return; }
    const got = [live || await rpc('arena_start', { p_token: S.token, p_subject: s })];
    if (AR.gen !== g) return;
    { const hh = document.querySelector('.ar-find h2'), fp = document.getElementById('ar-fp'), fx = document.querySelector('.ar-fx'); if (hh) { hh.textContent = 'لقينا لك خصم! ⚔️'; if (fp) fp.textContent = (got[0].opp.name || '') + ' · مستوى ' + got[0].opp.lvl; document.querySelectorAll('.ar-fx').forEach(x => x.remove()); FX.tick && FX.tick(true); haptic(); await new Promise(z => setTimeout(z, 1100)); if (AR.gen !== g) return; } }
    AR.r = Object.assign(got[0], { pos: 0, me: [], op: [], emoN: 3, q: got[0].question });
    arPoll(AR.r);
    await arVs(g); if (AR.gen !== g) return;
    arQ();
  } catch(e){ if (AR.gen === g) { toast(errMsg(e)); arHome(); } }
  finally { AR.busy = false; }
};
function arVs(g){
  const r = AR.r, h = AR.h || {}, o = r.opp;
  $app.innerHTML = '<div class="ar-vs"><div class="half a">' + arAv(h.avatar, h.nick, '', h.av) + '<b>' + esc(h.nick || 'أنت') + '</b><small>مستوى ' + r.lvl + '</small></div>' +
    '<div class="half b"><small>مستوى ' + o.lvl + '</small><b>' + esc(o.name || '') + '</b>' + arAv(o.avatar, o.name, '', o.av) + '</div>' +
    '<div class="mid"><svg viewBox="0 0 112 112" aria-hidden="true"><circle cx="56" cy="56" r="50" fill="none" stroke="#2A2A2E" stroke-width="8"/><circle id="ar-cdr" cx="56" cy="56" r="50" fill="none" stroke="#F5B72B" stroke-width="8" stroke-linecap="round" stroke-dasharray="314.2 314.2" transform="rotate(-90 56 56)"/></svg><div class="num" id="ar-num" role="status"><span class="vs">VS</span></div></div>' +
    '<p class="cap">' + (r.live ? '<span class="ar-live"><i></i>مباشر</span> · ' : '') + esc(arSubj(r.subject).n) + ' · ' + r.nq + ' أسئلة · ' + r.secs + ' ثانية للسؤال</p></div>';
  return new Promise(res => { let c = 3; const col = { 3: '#FF453A', 2: '#FFD60A', 1: '#30D158' };
    const step = () => { if (AR.gen !== g) return res(); const n = document.getElementById('ar-num'), ring = document.getElementById('ar-cdr'); if (c === 0 || !n) return res();
      n.innerHTML = '<span style="color:' + col[c] + '">' + c + '</span>'; ring.style.stroke = col[c]; ring.style.strokeDashoffset = String(314.2 * (4 - c) / 3); FX.tick && FX.tick(c === 1); c--; setTimeout(step, 800); };
    setTimeout(step, 1500); });
}
function arScore(){ const r = AR.r, m = r.me.filter(Boolean).length, o = r.op.filter(Boolean).length; return { m, o, pct: 50 + (m - o) * (40 / r.nq) }; }
function arTug(){ const s = arScore(), a = document.getElementById('ar-mine'), k = document.getElementById('ar-knot'); if (!a) return; a.style.width = s.pct + '%'; k.style.right = s.pct + '%';
  document.getElementById('ar-m').textContent = s.m; document.getElementById('ar-o').textContent = s.o; }
function arTugHtml(){ const r = AR.r, h = AR.h || {}, s = arScore();
  return '<div class="ar-tug"><span class="ar-avw" id="ar-mav">' + arAv(h.avatar, h.nick, '', h.av) + '</span>' + '<div class="ar-ropew"><div class="ar-rope"><div class="mine" id="ar-mine" style="width:' + s.pct + '%"></div></div><span class="knot" id="ar-knot" style="right:' + s.pct + '%"></span></div><span class="ar-avw" id="ar-oav">' + arAv(r.opp.avatar, r.opp.name, '', r.opp.av) + '</span></div>' +
    '<div class="ar-sc"><span>أنت <b id="ar-m">' + s.m + '</b></span><span><b id="ar-o">' + s.o + '</b> ' + esc(r.opp.name || '') + '</span></div>'; }
function arQ(){
  const r = AR.r, q = r.q, g = AR.gen; AR.lock = false; clearTimeout(AR.ot);
  const long = q.options.some(o => String(o).length > 22);
  $app.innerHTML = '<div class="play pv pvx ar-round"><button class="icon-btn pv-btn ar-x" data-act="ar-quit" aria-label="الخروج من الجولة">' + ic('x') + '</button>' + arTugHtml() +
    '<div class="pvx-tm" id="timer"><div class="pvx-bar"><i id="tfg"></i></div><span>السؤال ' + (r.pos + 1) + ' من ' + r.nq + ' · <b id="tnum">' + r.secs + '</b> ثانية</span></div>' +
    '<div class="pv-panel"><div class="qbox"><span>' + esc(q.body) + '</span></div><div class="pts-pop" id="pop"></div>' +
    '<div class="opts kc' + (long ? ' long' : '') + '">' + q.options.map((o, i) => '<button class="opt oc' + i + '" data-act="ar-ans" data-idx="' + i + '"><span class="txt">' + esc(o) + '</span></button>').join('') + '</div></div>' + arEmoHtml() + '</div>';
  AR.q0 = performance.now();
  (r.opp.emo || []).forEach(e => { if (e.pos === r.pos) setTimeout(() => { if (AR.gen !== g || AR.r !== r || r.pos !== e.pos || arMuted()) return; arBubble('ar-oav', e.k); }, Math.max(700, (e.t || 1) * 1000)); });
  rpc('arena_served', { p_token: S.token, p_round: r.round, p_pos: r.pos }).catch(() => {});
  const st = AR.tm = {}, end = performance.now() + r.secs * 1000, num = document.getElementById('tnum'), fg = document.getElementById('tfg'), box = document.getElementById('timer'); let shown = -1;
  const tick = () => { if (AR.tm !== st || AR.gen !== g) return; const left = Math.max(0, (end - performance.now()) / 1000), sec = Math.ceil(left);
    if (sec !== shown) { shown = sec; num.textContent = sec; if (sec <= 5 && sec > 0) { box.classList.add('hurry'); FX.tick && FX.tick(); } }
    fg.style.width = Math.min(100, left / r.secs * 100) + '%'; fg.classList.toggle('hurry', left <= 5);
    if (left <= 0) { AR.tm = null; if (!AR.lock) { AR.lock = true; arSubmit(null); } return; }
    requestAnimationFrame(tick); };
  tick();
  /* the recorded opponent answers at the moment they really answered */
  const oa = (r.opp.ans || [])[r.pos]; if (oa) AR.ot = setTimeout(() => { if (AR.gen !== g || r.op[r.pos] !== undefined) return; r.op[r.pos] = !!oa.ok; arTug(); }, Math.max(800, oa.t * 1000));
}
ACTS['ar-ans'] = t => { if (AR.lock) return; AR.lock = true; AR.tm = null; arSubmit(Number(t.dataset.idx)); };
ACTS['ar-now'] = t => { AR.now = true; t.disabled = true; };
ACTS['ar-cancel'] = () => { AR.gen++; AR.busy = false; rpc('arena_leave', { p_token: S.token, p_round: null }).catch(() => {}); arHome(); };
ACTS['ar-quit'] = async () => { if (!await ask('الجولة ما تنحسب لك.', { title: 'الخروج من الجولة؟', ok: 'خروج', cancel: 'أكمل الجولة', danger: true, safe: true })) return; AR.gen++; AR.tm = null; clearTimeout(AR.ot); if (AR.r) { AR.r.dead = true; rpc('arena_leave', { p_token: S.token, p_round: AR.r.round }).catch(() => {}); } arHome(); };
async function arSubmit(idx){
  const r = AR.r, g = AR.gen, pos = r.pos; AR.tm = null;
  const btns = $app.querySelectorAll('.opt'); btns.forEach(b => { b.disabled = true; });
  try {
    const res = await rpc('arena_answer', { p_token: S.token, p_round: r.round, p_pos: pos, p_chosen: idx });
    if (AR.gen !== g) return;
    const ci = res.correct_index;
    btns.forEach((b, i) => { if (i === ci) { b.classList.add('good'); optMark(b, '✓', 'الإجابة الصحيحة'); } else if (i === idx) { b.classList.add('bad'); optMark(b, '✗', 'إجابتك، غير صحيحة'); } else b.classList.add('dim'); });
    r.me[pos] = !!res.correct; clearTimeout(AR.ot);
    if (!r.live && r.op[pos] === undefined) { const oa = (r.opp.ans || [])[pos]; r.op[pos] = !!(oa && oa.ok); }
    arTug();
    if (res.correct) FX.correct(btns[ci], 10 + (res.speed || 0), 1); else FX.wrong(idx != null ? btns[idx] : null, idx == null);
    const pop = document.getElementById('pop'); if (pop) { pop.className = 'pts-pop ' + (res.correct ? 'good' : 'bad'); pop.textContent = res.correct ? '+' + (10 + (res.speed || 0)) + ' نقطة' : (idx == null ? 'انتهى الوقت، الصحيحة بالأخضر' : 'الصحيحة بالأخضر 👆'); }
    setTimeout(() => { if (AR.gen !== g) return; if (res.summary) return arResult(res.summary); if (res.wait) return arWait(); r.pos = pos + 1; r.q = res.question; arQ(); }, res.correct ? 1200 : 2500);
  } catch(e){ if (AR.gen !== g) return; toast(errMsg(e)); arHome(); }
}
/* live rounds: the opponent's answers and reactions arrive by polling; the result waits until both have finished */
function arPoll(r){ if (!r.live) return;
  const tick = async () => { if (AR.r !== r || r.dead || r.done) return;
    try { const p = await rpc('arena_peek', { p_token: S.token, p_round: r.round }); if (AR.r !== r || r.dead || r.done) return;
      if (p) { r.op = (p.ans || []).map(Boolean); const em = p.emo || []; em.slice(r.oemo || 0).forEach(e => { if (!arMuted()) arBubble('ar-oav', e.k); }); r.oemo = em.length; arTug();
        if (p.summary && r.waiting) return arResult(p.summary); } } catch(e){}
    setTimeout(tick, r.waiting ? 900 : 1200); };
  setTimeout(tick, 1200); }
function arWait(){ const r = AR.r; r.waiting = true;
  $app.innerHTML = '<div class="sh pvx ar-res ar-wait">' + arTugHtml() + '<div class="spin"></div><h1>ننتظر خصمك يخلص…</h1><p>النتيجة تطلع أول ما يجاوب آخر سؤال</p></div>'; }
function arResult(sm){
  const r = AR.r, g = ++AR.gen, b = sm.before, a = sm.after, SEG = 14, f0 = Math.round(b.into / b.need * SEG), f1 = sm.up ? SEG : Math.round(a.into / a.need * SEG);
  r.done = true;
  const head = { win: 'فزت بالشدّة!', draw: 'تعادل!', lose: 'قربت، الجاية لك' }[sm.result];
  $app.innerHTML = '<div class="sh pvx ar-res">' + arTugHtml() + '<h1>' + head + '</h1>' +
    '<div class="ar-gain"><span id="ar-gn">+0</span> <small>نقطة</small></div>' +
    '<div class="ar-rows"><div><span>إجابات صح (' + sm.me + ' من ' + r.nq + ')</span><b>+' + sm.correct_pts + '</b></div><div><span>سرعة</span><b>+' + sm.speed_pts + '</b></div><div><span>' + { win: 'فوز', draw: 'تعادل', lose: 'مشاركة' }[sm.result] + '</span><b>+' + sm.bonus + '</b></div></div>' +
    '<div class="ar-lvb"><div class="segs">' + Array.from({ length: SEG }, (_, i) => '<i class="' + (i < f0 ? 'f' : i < f1 ? 'f new' : '') + '" style="animation-delay:' + (.9 + (i - f0) * .12).toFixed(2) + 's"></i>').join('') + '</div>' +
    '<div class="l"><span>مستوى <b>' + b.n + '</b></span><span>' + (sm.up ? 'اكتمل!' : 'باقي ' + (a.need - a.into) + ' لمستوى ' + (a.n + 1)) + '</span></div></div>' +
    (sm.up ? '<div class="ar-up">' + (sm.tier_up ? 'انفتحت بوابة ' + (a.n >= 31 ? 6 : 4) + ' أسئلة! ' : '') + 'صعدت لمستوى ' + a.n + '، عقربك تقدّم ثانية</div>' : '') +
    '<button class="btn" data-act="ar-play" data-s="' + esc(r.subject) + '">جولة ثانية</button><button class="btn ghost" data-act="s-tab" data-t="ar">رجوع للحلبة</button></div>';
  let n = 0; const step = Math.max(1, Math.round(sm.pts / 22)), iv = setInterval(() => { n = Math.min(sm.pts, n + step); const el = document.getElementById('ar-gn'); if (!el || AR.gen !== g) return clearInterval(iv); el.textContent = '+' + n; if (n >= sm.pts) clearInterval(iv); }, 40);
  if (AR.h) { AR.h.lvl = a; AR.h.pts = (AR.h.pts || 0) + sm.pts; }
  if (sm.result === 'win' || sm.up) FX.win && FX.win(sm.me === r.nq); else FX.meh && FX.meh();
}
ACTS['s-tab'] = async t => { const k = t.dataset.t; if (!S.home) return;
  if (k === 'ar') return arHome();
  if (k === 'home') return renderHome();
  if (k === 'bd') return sPage('bd', '<div class="s-pgc">' + badgesHtml() + '</div>');
  if (k === 'me') { const h = S.home, n = (h.student.name || '?').trim();
    return sPage('me', '<div class="s-pgc"><h3>👤 أنا</h3><div class="s-me"><button class="s-me-av ' + lvlFrame() + (h.student.avatar ? ' em' : '') + '" data-act="s-av" aria-label="اختر شخصيتك">' + esc(h.student.avatar || n.charAt(0)) + '<span class="s-av-ed">✏️</span></button><b>' + esc(n) + '</b><small>' + esc(h.class.name) + '</small></div>' +
      (hasTeacher() ? '<button class="btn s-me-t" data-act="s-to-teacher">👨‍🏫 رجوع لحساب المعلم</button>' : '') +
      '<div class="s-me-o">' + [['s-rep-me', '📊', 'تقريري'], ['s-profile', '🪪', 'ملفي'], ['s-switch', '🔄', 'غيّر اللاعب'], ['s-sound-tab', FX.on() ? '🔊' : '🔇', 'الصوت'], ['s-push-tab', pushOn() ? '🔔' : '🔕', 'الإشعارات'], ['s-logout-ask', '🚪', 'خروج']].map(o => '<button data-act="' + o[0] + '"><i>' + o[1] + '</i>' + o[2] + '</button>').join('') + '</div>' +
      '</div>'); }
  if (k === 'lb') { if (S.demo) return toast('الترتيب يظهر في المسابقة الفعلية');
    sPage('lb', '<div class="s-pgc"><div class="spin"></div></div>');
    try { const res = await rpc('class_leaderboard', { p_token: S.token }); if (S.tab !== 'lb') return;
      const hidden = res && res.hidden, hp = !!(res && res.hide_pts), rows = res && res.rows ? res.rows : res;
      const c = document.querySelector('.s-tabpg .s-pgc'); if (c) { c.innerHTML = leadersHtml(rows, hidden, hp); const me = c.querySelector('.lbx-r.me'); if (me) setTimeout(() => me.scrollIntoView({ block: 'center', behavior: 'smooth' }), 150); }
    } catch(e){ toast(errMsg(e)); } }
};
function pushOn(){ if (isApp()) return LS.get('mc_push') === '1'; return LS.get('mc_push') === '1' && !!window.Notification && Notification.permission === 'granted'; }
ACTS['s-push-tab'] = async t => {
  if (!pushOn()) return ACTS['s-push'](t);
  if (!await ask('ما يوصلك تذكير الجولة ولا رسائل معلمك على الجوال. الرسائل تظل تحت الجرس 🔔.', { title: 'توقف الإشعارات؟', ok: 'إيقاف' })) return;
  try { if (NP()) await NP().unregister(); else { const r = await navigator.serviceWorker.ready, sub = await r.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); } } catch(e){}
  LS.set('mc_push', '0'); const i = t.querySelector('i'); if (i) i.textContent = '🔕'; toast('وقفت الإشعارات');
};
ACTS['s-sound-tab'] = t => { const on = FX.toggle(); t.querySelector('i').textContent = on ? '🔊' : '🔇'; toast(on ? 'الصوت مفعّل' : 'الصوت مكتوم'); };
ACTS['s-badges'] = () => modal('<div class="bg2-mod">' + badgesHtml() + '<button class="btn soft" style="margin-top:14px" data-act="close-modal">إغلاق</button></div>');
ACTS['s-rename'] = async () => {
  const v = await ask('اكتب اسمك الثلاثي', { input: S.home.student.name, ok: 'حفظ', danger: false }); if (v == null) return;
  try { const r = await rpc('student_rename', { p_token: S.token, p_name: v }); S.home.student.name = r.name; closeModals(); renderHome(); bellBadge(); toast('تم تعديل اسمك'); } catch(e){ toast(errMsg(e)); }
};
function cdText(){ const day = 864e5, k = 3 * 36e5, now = Date.now(), next = Math.floor((now + k) / day) * day + day - k, d = Math.max(0, next - now); const p = x => String(x).padStart(2, '0'); return p(Math.floor(d / 36e5)) + ':' + p(Math.floor(d % 36e5 / 6e4)) + ':' + p(Math.floor(d % 6e4 / 1e3)); }
function startCountdown(){ clearInterval(S.cdT); const el = document.getElementById('cd'); if (!el) return; S.cdT = setInterval(() => { const e = document.getElementById('cd'); if (!e) return clearInterval(S.cdT); const t = cdText(); e.textContent = t; if (t === '00:00:00') { clearInterval(S.cdT); setTimeout(() => S.demo ? null : loadHome(), 1500); } }, 1000); }
/* a teacher signed in on this device (supabase auth token in storage) */
function hasTeacher(){ try { return Object.keys(localStorage).some(k => /^sb-.*-auth-token$/.test(k) && localStorage.getItem(k)); } catch(e){ return false; } }
ACTS['s-to-teacher'] = () => { closeModals(); location.hash = '#/t/home'; };
ACTS['s-menu'] = () => {
  const m = LS.get('mc_mode') || 'auto';
  modal('<div class="sheet"><div class="sheet-list">' +
    '<button class="sheet-i" data-act="s-profile">' + ic('user') + '<span>ملفي</span></button>' +
    '<button class="sheet-i" data-act="s-sound-row">' + ic(FX.on() ? 'sound' : 'mute') + '<span>الصوت: ' + (FX.on() ? 'مفعّل' : 'مكتوم') + '</span></button>' +
    '<button class="sheet-i" data-act="s-switch">' + ic('users') + '<span>غيّر اللاعب</span></button>' +
    (hasTeacher() ? '<button class="sheet-i" data-act="s-to-teacher">' + ic('back') + '<span>رجوع لحساب المعلم</span></button>' : '') +
    '</div><div class="sheet-list"><button class="sheet-i danger" data-act="s-logout-ask">' + ic('logout') + '<span>تسجيل الخروج</span></button></div>' +
    '<button class="sheet-i sheet-cancel" data-act="close-modal">إغلاق</button></div>');
};
ACTS['s-sound-row'] = t => { const on = FX.toggle(); t.innerHTML = ic(on ? 'sound' : 'mute') + '<span>الصوت: ' + (on ? 'مفعّل' : 'مكتوم') + '</span>'; };
ACTS['s-logout-ask'] = async () => { if (!await ask('تسجيل الخروج؟ ستحتاج رمزك للدخول مرة أخرى.')) return; closeModals(); ACTS['s-logout'](); };
const S_AVS = ['🦁','🐯','🐼','🦊','🐨','🐸','🦉','🦅','🐬','🐢','🦄','🐉','🚀','⚽','🏆','⭐'];
ACTS['s-av'] = async () => { if (!S.home) return; S.avPick = S.home.student.avatar || '';
  if (!S.daily && !S.demo) { try { S.daily = await rpc('student_daily', { p_token: S.token }); } catch(e){} }
  const dl = S.daily || {}, own = dl.stickers || [], pool = dl.pool || [];
  modal('<div class="s-avs"><h3>اختر شخصيتك</h3><div class="s-avg">' + S_AVS.map(a => '<button class="' + (a === S.avPick ? 'on' : '') + '" data-act="s-avp" data-v="' + a + '">' + a + '</button>').join('') + '</div>' +
    (pool.length ? '<h4 class="s-avh">🎁 ملصقات الصندوق ' + own.length + ' من ' + pool.length + '</h4><div class="s-avg">' + pool.map(a => own.indexOf(a) >= 0 ? '<button class="' + (a === S.avPick ? 'on' : '') + '" data-act="s-avp" data-v="' + a + '">' + a + '</button>' : '<button class="lk" disabled aria-label="مقفول">🔒</button>').join('') + '</div>' : '') +
    '<button class="btn" data-act="s-avs">حفظ</button>' + (S.home.student.avatar ? '<button class="btn soft" data-act="s-avs" data-v="">بدون شخصية</button>' : '') + '</div>'); };
ACTS['s-avp'] = t => { S.avPick = t.dataset.v; t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); };
ACTS['s-avs'] = async t => { const v = t.dataset.v != null ? t.dataset.v : S.avPick; if (S.demo) { S.home.student.avatar = v; closeModals(); return ACTS['s-tab']({ dataset: { t: 'me' } }); }
  try { await rpc('student_set_avatar', { p_token: S.token, p_av: v || '' }); S.home.student.avatar = v || null; closeModals(); toast(v ? 'انحفظت ' + v : 'انشالت الشخصية'); ACTS['s-tab']({ dataset: { t: 'me' } }); } catch (e) { toast(errMsg(e)); } };
ACTS['s-profile'] = () => { closeModals();
  const h = S.home;
  const code = LS.get('mc_code');
  modal('<div class="s-prof"><h3>ملفي</h3><div class="sp-rows">' +
    '<div class="r"><span>الاسم</span><b>' + esc(h.student.name) + '</b></div>' +
    '<div class="r"><span>الصف</span><b>' + esc(h.class.name) + '</b></div>' +
    (S.prefs && S.prefs.teacher && S.prefs.teacher.name ? '<div class="r"><span>المعلم</span><b>' + esc([S.prefs.teacher.title, S.prefs.teacher.name].filter(Boolean).join(' ')) + '</b></div>' : '') +
    (S.prefs && S.prefs.teacher && S.prefs.teacher.subject ? '<div class="r"><span>المادة</span><b>' + esc(String(S.prefs.teacher.subject).split('|').join('، ')) + '</b></div>' : '') +
    (S.prefs && S.prefs.teacher && S.prefs.teacher.school ? '<div class="r"><span>المدرسة</span><b>' + esc(S.prefs.teacher.school) + '</b></div>' : '') +
    (code ? '<div class="r"><span>رمز الدخول</span><button class="code-pill" data-act="copy" data-v="' + esc(code) + '">' + esc(code) + ' ' + ic('layers') + '</button></div>' : '') +
    '<div class="r"><span>نقاطي</span><b>' + (h.total_points || 0) + '</b></div>' +
    (h.rank && h.total_points ? '<div class="r"><span>ترتيبي</span><b>' + h.rank + ' من ' + h.class.size + '</b></div>' : '') + '</div>' +
    (S.prefs && S.prefs.rename ? '<button class="btn soft" data-act="s-rename">' + ic('edit') + ' تعديل اسمي</button>' : '') +
    '<button class="btn" data-act="close-modal">تم</button></div>');
};
ACTS['s-leaders'] = async () => {
  if (S.demo) return toast('المتصدرون يظهرون في المسابقة الفعلية');
  const m = modal('<h3>المتصدرون</h3><div class="spin"></div>');
  try {
    const res = await rpc('class_leaderboard', { p_token: S.token });
    const hidden = res && res.hidden, hp = !!(res && res.hide_pts), rows = res && res.rows ? res.rows : res;
    m.querySelector('.modal').classList.add('lbx-m');
    m.querySelector('.modal').innerHTML = leadersHtml(rows, hidden, hp);
  } catch(e){ m.remove(); toast(errMsg(e)); }
};

function leadersHtml(rows, hidden, hp){
  const P = r => hp && !r.is_me ? '' : r.points;
  const th = document.body.dataset.theme || 'mid';
  const on = rows.filter(r => r.points > 0), zero = rows.filter(r => !(r.points > 0)), me = rows.find(r => r.is_me);
  const ini = n => esc(String(n || '?').trim().split(/\s+/)[0]);
  const top = on.slice(0, 3), rest = on.slice(3), max = Math.max(1, ...on.map(r => r.points));
  const pod = top.length && !hidden ? '<div class="lbx-pod">' + [1, 0, 2].map(i => { const r = top[i]; if (!r) return '<div class="lbx-pd empty"></div>';
      return '<div class="lbx-pd p' + (i + 1) + (r.is_me ? ' me' : '') + '"><div class="lbx-av">' + (i === 0 ? '<span class="lbx-crown">👑</span>' : '') + (r.av ? '<span class="lbx-em">' + esc(r.av) + '</span>' : ini(r.name).charAt(0)) + '<span class="lbx-md">' + (i + 1) + '</span></div><b>' + ini(r.name) + '</b><span class="lbx-pts">' + P(r) + '</span><div class="lbx-step"></div></div>'; }).join('') + '</div>' : '';
  const list = (hidden ? on : rest).map(r => '<div class="lbx-r' + (r.is_me ? ' me' : '') + '"><span class="lbx-no">' + r.rank + '</span>' + (r.av ? '<span class="lbx-ea">' + esc(r.av) + '</span>' : '') + '<span class="lbx-nm">' + esc(r.name) + (r.is_me ? ' <small>(أنت)</small>' : '') + (hp ? '' : '<i><u style="width:' + Math.round(r.points * 100 / max) + '%"></u></i>') + '</span><b>' + P(r) + '</b></div>').join('');
  const meZero = me && !(me.points > 0);
  return '<div class="lbx pvx"><div class="lbx-top"><h3>🏆 المتصدرون</h3><span>' + esc(S.home.class.name) + '</span><button class="lbx-x" data-act="close-modal" aria-label="إغلاق">' + ic('x') + '</button></div>' +
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
  function flash(cls, ms){ if (reduce()) return; const L = layer(), f = document.createElement('div'); f.className = 'fx-flash ' + cls; L.appendChild(f); setTimeout(() => f.remove(), ms || 600); }
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
    reduce, on, toggle(){ LS.set('mc_sound', on() ? '0' : '1'); return on(); },
    tick(final){ tone(final ? 1100 : 880, .06, 'square', .06); },
    heart(){ tone(70, .14, 'sine', .55); tone(60, .16, 'sine', .45, .18); vib([30, 80, 30]); },
    correct(btn, pts, combo){
      const k = Math.pow(1.122, Math.max(0, Math.min(3, (combo || 1) - 1)));
      tone(660 * k, .12, 'triangle', .22); tone(990 * k, .2, 'triangle', .22, .1); tone(1320 * k, .25, 'sine', .15, .2); vib(25);
      if (!btn) return; const r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      burst(x, y, ['#F5B72B', '#FFE48A', '#4FD394', '#fff'], 26, 120);
      if (pts) floatText(x, r.top, '+' + pts, 'good');
      flash('good', 500);
    },
    wrong(btn, timeout){
      tone(392, .18, 'sine', .14); tone(330, .3, 'sine', .12, .14); vib(40);
      if (timeout) { const t = document.querySelector('.timer'); if (t) { const r = t.getBoundingClientRect(); floatText(r.left + r.width / 2, r.top + r.height / 2, 'انتهى الوقت!', 'bad'); } }
    },
    explode(){
      if (reduce()) { tone(200, .3, 'sine', .08); return Promise.resolve(); }
      return new Promise(res => {
        const L = layer(), w = document.createElement('div'); w.className = 'fx-bomb';
        w.innerHTML = '<div class="fx-clock"><img src="icon-512.png?i=10" alt=""></div>'; L.appendChild(w);
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
      const st = document.body.dataset.stage, k = st === 'p' ? 1 : st === 's' ? .4 : .7;
      confetti(Math.round((perfect ? 4200 : 3000) * k));
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
function pvClose(show){
  let x = document.getElementById('pv-x');
  if (!show) { if (x) x.remove(); document.documentElement.classList.remove('pvmode'); return; }
  document.documentElement.classList.add('pvmode');
  if (x) return;
  x = document.createElement('button'); x.id = 'pv-x'; x.type = 'button'; x.setAttribute('aria-label', 'إغلاق المعاينة'); x.innerHTML = '<span>معاينة · لا تُحتسب نقاط</span><b>✕</b>';
  x.addEventListener('click', () => { stopTimer(); const b = LS.get('mc_pvback') || '#/t/home'; LS.del('mc_pvback'); location.hash = b.indexOf('#/p/') === 0 ? '#/t/home' : b; });
  document.body.appendChild(x);
}
function demoStart(th){
  stopTimer(); closeModals();
  document.body.classList.remove('wide');
  setTheme(['kids', 'mid', 'uni'].includes(th) ? th : 'mid'); applyMode();
  S.demo = { pts: 0, ok: 0 };
  try { const dq = JSON.parse(LS.get('mc_demoq') || 'null'); S.demoQ = Array.isArray(dq) && dq.length >= 4 ? dq : null; } catch(e){ S.demoQ = null; }
  S.home = { class: { name: 'صف تجريبي', size: 24, style: th }, student: { name: 'طالب تجريبي' }, competition: { days_left_points: 4 }, phase: 'points', total_points: 120, rank: 3, gap: 40, streak: 2, wrong_count: 0, badges: [{ k: 'fast', n: 4 }, { k: 'first', n: 1 }, { k: 'practice', n: 9 }, { k: 'streak', n: 2 }, { k: 'perfect', n: 0 }, { k: 'correct', n: 18 }] };
  renderHome();
}
function demoQ(pos){
  if (pos === 1) { S.demo.pts = 0; S.demo.ok = 0; }
  const q = (S.demoQ || DEMO_Q)[pos - 1], ord = q.payload && q.payload.kind === 'order';
  S.demoPerm = ord ? q.options.map((_, k) => k).sort(() => Math.random() - .5) : null;
  showQuestion({ attempt_id: 0, kind: 'practice', position: pos, total: 4, seconds_left: 15, question: { body: q.body, options: ord ? S.demoPerm.map(k => q.options[k]) : q.options, payload: q.payload || null } });
}
function demoSubmit(idx, seq){
  const st = S.cur, q = (S.demoQ || DEMO_Q)[st.position - 1], ok = seq ? seq.every((x, k) => S.demoPerm[x] === k) : idx === q.c, d = S.demo;
  const left = Number((document.getElementById('tnum') || {}).textContent) || 0, pts = ok ? 50 + left * 10 : 0;
  if (ok) { S.demo.ok++; S.demo.pts += pts; }
  (S.log = S.log || []).push({ q: q.body, o: q.options, c: q.c, x: idx, ok });
  const btns = $app.querySelectorAll('.opt');
  if (seq) ordMark(btns, seq, q.options.map((_, k) => S.demoPerm.indexOf(k)), ok); else
  btns.forEach((b, i) => { b.disabled = true; b.classList.add(i === q.c ? 'good' : i === idx ? 'bad' : 'dim'); if (i === q.c) optMark(b, '✓', 'الإجابة الصحيحة'); else if (i === idx) optMark(b, '✗', 'إجابتك، غير صحيحة'); });
  if (seq) { if (ok) FX.correct(btns[seq[seq.length - 1]], pts); else FX.wrong(null, false); }
  else if (ok) FX.correct(btns[q.c], pts); else FX.wrong(idx != null ? btns[idx] : null, idx == null);
  const pop = document.getElementById('pop');
  if (pop) { pop.className = 'pts-pop ' + (ok ? 'good' : 'bad'); pop.textContent = ok ? '+' + pts + ' نقطة' : (idx == null ? 'انتهى الوقت' : 'إجابة غير صحيحة'); }
  setTimeout(() => { if (S.demo !== d || S.cur !== st || !$app.querySelector('.play')) return; if (st.position >= 4) showResult({ kind: 'practice', correct_count: S.demo.ok, total_points: S.demo.pts }); else demoQ(st.position + 1); }, 1500);
}

/* ---- play ---- */
function stopTimer(){ document.body.classList.remove('danger'); if (S.timer) { cancelAnimationFrame(S.timer.raf); S.timer = null; } }
ACTS['s-start'] = async (t) => {
  if (S.starting) return;
  S.log = [];
  if (S.demo) return demoQ(1);
  const lbl = t.innerHTML, gen = S.gen = (S.gen || 0) + 1;
  S.starting = true; t.setAttribute('aria-busy', 'true'); t.textContent = 'جارٍ التحضير…';
  const resumed = S.resuming; S.resuming = false;
  try {
    if (resumed) { await countIn(gen, 'نكمل جولتك…'); if (S.gen !== gen) return; }
    const st = await rpc('start_attempt', { p_token: S.token, p_kind: t.dataset.kind });
    if (S.gen !== gen) return;
    if (st.finished) { LS.del('mc_prac'); toast('أنهيت هذه الجولة'); return loadHome(); }
    if (t.dataset.kind !== 'official' && t.dataset.kind !== 'knockout') LS.set('mc_prac', String(Date.now()));
    if (!resumed && st.position === 1 && st.seconds_left >= 14) await countIn(gen);
    if (S.gen !== gen) return;
    showQuestion(st);
  } catch(e){
    if (S.gen !== gen) return;
    if (document.contains(t)) { t.removeAttribute('aria-busy'); t.innerHTML = lbl; }
    toast(errMsg(e));
    if (String(e.message || '').includes('invalid_session')) ACTS['s-logout']();
    else if (/already_played|official_not_open/.test(String(e.message || ''))) loadHome();
  } finally { S.starting = false; }
};
/* 3-2-1 before the round */
function countIn(gen, txt){
  const th = document.body.dataset.theme || 'mid';
  $app.innerHTML = '<div class="sh pvx cin"><div class="cin-n" id="cin" data-n="3" role="status">3</div><p class="cin-t">' + (txt || 'استعد!') + '</p></div>';
  return new Promise(res => { let n = 3; FX.tick && FX.tick();
    const step = () => { if (S.gen !== gen) return res(); n--; const el = document.getElementById('cin'); if (n <= 0 || !el) return res();
      el.textContent = n; el.dataset.n = n; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; FX.tick && FX.tick(); setTimeout(step, 800); };
    setTimeout(step, 800); });
}
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
  S.gen = (S.gen || 0) + 1; clearTimeout(S.nextT);
  S.cur = st; S.locked = false; S.ord = [];
  const q = st.question, th = document.body.dataset.theme || 'mid', isOrd = !!(q.payload && q.payload.kind === 'order');
  let dots = '';
  const L0 = S.log || [], lg = st.position > 1 ? L0.slice(-(st.position - 1)) : [], lo = st.position - 1 - lg.length;
  for (let i = 1; i <= st.total; i++) { const e = i < st.position && i - 1 - lo >= 0 ? lg[i - 1 - lo] : null; dots += '<span class="dot' + (i < st.position ? ' done' + (e ? (e.ok ? ' ok' : ' no') : '') : i === st.position ? ' cur' : '') + '"></span>'; }
  const long = q.options.some(o => String(o).length > 22);
  $app.innerHTML =
    '<div class="play pv pvx">' +
    '<div class="play-top"><button class="icon-btn pv-btn" data-act="s-quit" aria-label="الخروج للرئيسية">' + ic('home') + '</button>' +
    '<div class="pv-head"><b class="pv-pill">السؤال ' + st.position + ' من ' + st.total + '</b><div class="dots">' + dots + '</div>' +
    (st.kind === 'practice' ? '<span class="pv-kind">تدريب</span>' : '') + (S.home && S.home.student && S.home.student.avatar && !S.demo ? '<span class="pv-av ' + lvlFrame() + '" id="pvav">' + esc(S.home.student.avatar) + '</span>' : '') + '<span class="pv-pts" id="pvpts">⭐ ' + lg.reduce((a, x) => a + (x.p || 0), 0) + '</span></div>' +
    '<button class="icon-btn pv-btn pv-snd" data-act="s-sound" aria-label="الصوت">' + ic(FX.on() ? 'sound' : 'mute') + '</button></div>' +
    '<div class="pvx-tm' + (st.position === st.total ? ' last' : '') + '" id="timer"><i id="tfill" hidden></i><div class="pvx-bar"><i id="tfg"></i></div><span><b id="tnum">' + Math.ceil(st.seconds_left) + '</b> ثانية</span></div>' +
    '<div class="pv-panel"><div class="qbox' + (q.image ? ' has-img' : '') + '">' + (q.image ? '<img class="q-img" src="' + esc(q.image) + '" alt="' + esc(q.image_alt || 'صورة مرفقة بالسؤال') + '">' : '') + '<span>' + esc(q.body) + '</span></div><div class="pts-pop" id="pop"></div>' +
    (isOrd ? '<div class="ord-hint">اضغطها بالترتيب ١ ← ' + ['', '', '', '٣', '٤'][q.options.length] + '</div>' : '') +
    '<div class="opts kc' + (long ? ' long' : '') + (q.options.length === 2 ? ' tf' : '') + (isOrd ? ' ord' : '') + '">' + q.options.map((o, i) => '<button class="opt oc' + i + '" data-act="' + (isOrd ? 's-ord' : 's-answer') + '" data-idx="' + i + '">' + (isOrd || q.options.length === 2 ? '<span class="letter shp" aria-hidden="true">' + (isOrd ? '' : ['✓', '✗'][i]) + '</span>' : '') + '<span class="txt">' + esc(o) + '</span></button>').join('') + '</div></div></div>';
  runTimer(st.seconds_left, st.secs);
}
function runTimer(secs, tot){
  const total = tot || 15, end = performance.now() + secs * 1000;
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
    if (fg.tagName === 'circle') { fg.style.strokeDashoffset = String(301.6 * (1 - left / total)); fg.style.stroke = left <= 5 ? '#E5484D' : ''; }
    else { fg.style.width = Math.min(100, left / total * 100) + '%'; fg.classList.toggle('hurry', left <= 5); }
    if (left <= 0) { stopTimer(); document.body.classList.remove('danger'); if (!S.locked) { S.locked = true; submit(null); } return; }
    state.raf = requestAnimationFrame(tick);
  };
  tick();
}
ACTS['s-ord'] = t => {
  if (S.locked) return; const i = Number(t.dataset.idx), n = S.cur.question.options.length, at = S.ord.indexOf(i);
  if (at >= 0) { S.ord.splice(at); } else S.ord.push(i);
  $app.querySelectorAll('.opts.ord .opt').forEach(b => { const k = S.ord.indexOf(Number(b.dataset.idx)); b.classList.toggle('picked', k >= 0); b.querySelector('.shp').textContent = k >= 0 ? '١٢٣٤'[k] : ''; });
  haptic();
  if (S.ord.length === n) { S.locked = true; stopTimer(); let code = Math.pow(10, n); S.ord.forEach((d, k) => { code += d * Math.pow(10, n - 1 - k); }); submit(code, S.ord.slice()); }
};
ACTS['s-answer'] = (t) => { if (S.locked) return; S.locked = true; stopTimer(); submit(Number(t.dataset.idx)); };
ACTS['s-quit'] = async () => {
  if (S.demo) { stopTimer(); return renderHome(); }
  if (!await ask('الأسئلة المتبقية ستُحتسب بلا نقاط عند انتهاء وقتها.', { title: 'الخروج من الجولة؟', ok: 'خروج', cancel: 'أكمل الجولة', danger: true, safe: true })) return;
  stopTimer(); S.noAuto = true; LS.del('mc_prac'); loadHome();
};
/* correct answers in a row at the end of this round's log (visual only, points unchanged) */
function comboN(pos){ const L = (S.log || []).slice(-(pos || 4)); let n = 0; for (let i = L.length - 1; i >= 0 && L[i].ok; i--) n++; return n; }
function comboTxt(n){ return n >= 4 ? ' · كاملة! 🏆' : n === 3 ? ' · ما ينوقف! 🔥🔥' : n === 2 ? ' · مولّع! 🔥' : ''; }
async function submit(idx, seq){
  if (S.demo) return demoSubmit(idx, seq);
  const st = S.cur, gen = S.gen;
  if (!st) return;
  const pop0 = document.getElementById('pop'); if (pop0) { pop0.className = 'pts-pop wait'; pop0.textContent = 'جارٍ تسجيل الإجابة…'; }
  $app.querySelectorAll('.opt').forEach(b => { b.disabled = true; });
  try {
    const res = await rpc('submit_answer', { p_token: S.token, p_attempt: st.attempt_id, p_position: st.position, p_chosen: idx });
    if (S.gen !== gen || S.cur !== st) return; // left the question meanwhile
    const r = res.result, ci = r.correct_index != null ? r.correct_index : (r.correct ? idx : null);
    (S.log = S.log || []).push({ q: st.question.body, o: st.question.options, c: ci, x: seq ? null : idx, ok: !!r.correct, p: r.correct ? (r.points || 0) : 0 });
    { const pe = document.getElementById('pvpts'); if (pe && r.correct) { const L = (S.log || []).slice(-st.position); pe.textContent = '⭐ ' + L.reduce((a, x) => a + (x.p || 0), 0); pe.classList.remove('bump'); void pe.offsetWidth; pe.classList.add('bump'); } }
    const btns = $app.querySelectorAll('.opt');
    if (st.question.payload && st.question.payload.kind === 'order') ordMark(btns, seq || [], r.order, r.correct);
    else btns.forEach((b, i) => {
      b.disabled = true;
      if (i === ci) { b.classList.add('good'); optMark(b, '✓', 'الإجابة الصحيحة'); }
      else if (i === idx) { b.classList.add('bad'); optMark(b, '✗', 'إجابتك، غير صحيحة'); }
      else b.classList.add('dim');
    });
    const combo = comboN(st.position);
    if (seq) { if (r.correct) FX.correct(btns[seq[seq.length - 1]], r.points, combo); else FX.wrong(null, r.timeout); }
    else if (r.correct) FX.correct(btns[ci], r.points, combo); else FX.wrong(idx != null ? btns[idx] : null, idx == null || r.timeout);
    { const av = document.getElementById('pvav'); if (av) { av.classList.remove('hop', 'nope'); void av.offsetWidth; av.classList.add(r.correct ? 'hop' : 'nope'); } }
    const dl = $app.querySelectorAll('.dots .dot')[st.position - 1]; if (dl) dl.classList.add('done', r.correct ? 'ok' : 'no');
    const pop = document.getElementById('pop');
    if (pop) {
      pop.className = 'pts-pop ' + (r.correct ? 'good' + (combo >= 2 ? ' combo' : '') : 'bad');
      pop.textContent = r.correct ? '+' + r.points + ' نقطة' + comboTxt(combo) : (idx == null || r.timeout ? 'انتهى الوقت، الصحيحة بالأخضر' : 'الصحيحة بالأخضر 👆');
    }
    clearTimeout(S.nextT);
    S.nextT = setTimeout(() => {
      if (S.gen !== gen || S.cur !== st) return;
      if (res.next && res.next.finished) showResult(res.summary);
      else showQuestion(res.next);
    }, r.correct ? 1200 : 2500);
  } catch(e){
    if (S.gen !== gen || S.cur !== st) return;
    S.locked = false;
    toast('تعذّر تسجيل الإجابة. نتحقق من جولتك…');
    try {
      const nx = await rpc('resume_attempt', { p_token: S.token, p_attempt: st.attempt_id });
      if (S.gen !== gen) return;
      if (nx.finished) loadHome(); else showQuestion(nx);
    } catch(e2){ if (S.gen === gen) loadHome(); }
  }
}
function ordMark(btns, seq, order, ok){
  btns.forEach(b => { const i = Number(b.dataset.idx), mine = seq.indexOf(i), right = order ? order.indexOf(i) : (ok ? mine : -1);
    b.disabled = true; if (right >= 0) b.querySelector('.shp').textContent = '١٢٣٤'[right];
    b.classList.add(ok || (right >= 0 && mine === right) ? 'good' : right >= 0 ? 'bad' : 'dim'); });
}
function optMark(b, sym, sr){ if (b.querySelector('.opt-mk')) return; const m = document.createElement('span'); m.className = 'opt-mk'; m.textContent = sym; m.setAttribute('aria-hidden', 'true'); b.appendChild(m); b.setAttribute('aria-label', (b.querySelector('.txt') || b).textContent + '، ' + sr); }
function reviewHtml(){
  const L = (S.log || []).slice(-4); if (!L.length) return '';
  const bad = L.filter(x => !x.ok), good = L.filter(x => x.ok), ans = x => Array.isArray(x.o) && x.c != null ? esc(x.o[x.c]) : '';
  return (bad.length ? '<div class="rv2-h">راجع أخطاءك <span>' + bad.length + '</span></div>' +
    bad.map(x => '<div class="rv2-w"><p>' + esc(x.q) + '</p>' +
      '<div class="rv2-l no"><i>✕</i>' + (x.x == null ? '<b class="nt">خلص الوقت</b>' : '<b>' + esc(x.o[x.x]) + '</b>') + '<small>إجابتك</small></div>' +
      (ans(x) ? '<div class="rv2-l ok"><i>✓</i><b>' + ans(x) + '</b><small>الصحيحة</small></div>' : '') + '</div>').join('') +
    '<button class="rv2-dr" data-act="s-start" data-kind="review">🔁 تدرّب على أخطائك</button>'
    : '<div class="rv2-all">ما غلطت في ولا سؤال 👏<small>كمّل كذا وتتصدر الترتيب</small></div>') +
    (good.length && bad.length ? '<details class="rv2-ok"><summary><i>✓</i>جاوبت ' + good.length + ' صح<em>‹</em></summary>' + good.map(x => '<div class="rv2-g">' + esc(x.q) + '<small>' + ans(x) + '</small></div>').join('') + '</details>' : '');
}
async function showResult(sm){
  LS.del('mc_prac');
  stopTimer(); S.gen = (S.gen || 0) + 1; S.cur = null;
  if (sm && Array.isArray(sm.review) && S.log) { const L = S.log.slice(-sm.review.length); sm.review.forEach((v, i) => { if (L[i] && L[i].c == null) L[i].c = v.c; }); }
  const cc = sm ? sm.correct_count : 0, qn = (sm && sm.total) || 4, lose = cc <= 1, win = cc >= qn - 1, perfect = cc === qn;
  setTimeout(() => { if (win) FX.win(perfect); else FX.meh(); }, 250);
  const head = perfect ? 'مثالي! 🏆' : lose ? 'كل بطل يبدأ كذا 💪' : 'خلصت! 🎉';
  const sub = perfect ? (qn === 3 ? '٣ من ٣' : '٤ من ٤') + '، لا يُهزم!' : win ? 'أداء ممتاز، استمر!' : lose ? 'تدرّب على أخطائك وارجع أقوى' : 'قريب من القمة، حاول بكرة';
  const stars = Array.from({ length: qn }, (_, i) => i).map(i => '<span class="star-s' + (i < cc ? ' on' : '') + '" style="animation-delay:' + (0.5 + i * 0.25) + 's">' + ic('star') + '</span>').join('');
  let rankRow = '';
  if (sm && sm.kind === 'official' && sm.rank_after) {
    const d = sm.rank_before - sm.rank_after;
    const delta = d > 0 ? '<span class="up">▲ صعدت ' + d + '</span>' : d < 0 ? '<span class="down">▼ نزلت ' + (-d) + '</span>' : '<span class="muted">بلا تغيير</span>';
    rankRow = '<div class="r"><span>ترتيبي الجديد</span><b>' + sm.rank_after + ' ' + delta + '</b></div>';
    if (d > 0) S.upMsg = '⬆ صعدت ' + (d === 1 ? 'مركز' : d === 2 ? 'مركزين' : d + ' مراكز') + '!';
  }
 const L4 = (S.log || []).slice(-qn), answered = L4.length ? L4.filter(x => x.x != null).length : (sm ? sm.correct_count : 0);
  const toAr = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const th = document.body.dataset.theme || 'mid';
  $app.innerHTML = '<div class="sh pvx">' +
    '<div class="result ' + (win ? 'is-win' : lose ? 'is-lose' : '') + '"><div class="medal-wrap">' + (win ? '<div class="rays"></div>' : '') + '<div class="medal">' + ic(lose ? 'star' : 'trophy') + '</div></div>' +
    '<h2 class="center res-h">' + head + '</h2><p class="center muted" style="margin-top:-8px">' + sub + (sm && sm.kind === 'practice' ? ' · تدريب' : sm && sm.kind === 'knockout' ? ' · مواجهة التصفيات' : '') + '</p>' +
    (sm && sm.kind === 'knockout' ? '<p class="center sub">تُحسم المواجهة بعدد الإجابات الصحيحة ثم السرعة، وتظهر النتيجة في الرئيسية عندما ينهي منافسك.</p>' : '') +
    '<div class="stars-row">' + stars + '</div>' +
    '<div class="center rs-st2"><div class="big" id="bigpts">0</div><div class="muted">نقاط هذه الجولة</div></div>' +
    (rankRow ? '<div class="rows card rs-st3">' + rankRow + '</div>' : '') +
    (S.upMsg ? '<div class="s-up">' + S.upMsg + '</div>' : '') +
    (sm && sm.kind !== 'practice' && sm.total_points > 0 ? shBtn('pts', { n: toAr(sm.total_points), p: perfect }, '📤 تحدّى أصحابك') : '') +
    reviewHtml() +
    '<button class="btn rv2-done" data-act="s-reload">تم</button></div></div>';
  const target = sm ? sm.total_points : 0, el = document.getElementById('bigpts'), t0 = performance.now();
  if (FX.reduce()) { if (el) el.textContent = target; } else setTimeout(() => { const t1 = performance.now(); (function roll(t){ const k = Math.min(1, Math.max(0, (t - t1) / 1000)), e = 1 - Math.pow(1 - k, 3); if (el) el.textContent = Math.round(target * e); if (k < 1) requestAnimationFrame(roll); })(t1); }, 1500);
}

/* ======================================================
   SHARE CARD (v270, Khalid «الطلاب يسوقون»): first name + avatar + achievement → PNG → share sheet; link opens #/w/NAME
   ====================================================== */
const SHK = {
  badge: (a) => [a.i || '⚡', 'شارة جديدة: ' + a.n, a.d || ''],
  level: (a) => ['🎖', 'المستوى ' + a.n, a.d || ''],
  star: () => ['🌟', 'نجم الأسبوع في الصف', 'أعلى تحسّن هالأسبوع'],
  pts: (a) => [a.p ? '💯' : '🔥', 'حصلت على ' + a.n + ' نقطة', 'تقدر تفوز علي؟ 💪']
};
function shMe(){ const st = (S.home && S.home.student) || {}; return { n: String(st.name || '').trim().split(/\s+/)[0] || 'بطل', av: st.avatar || '🙂' }; }
function shLink(){ return location.origin + location.pathname + '#/w'; }
function shDraw(kind, a){
  const [icn, t1, t2] = SHK[kind](a || {}), me = shMe(), W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), F = getComputedStyle(document.body).fontFamily || 'system-ui', f = (w, s) => w + ' ' + s + 'px ' + F;
  const g = x.createRadialGradient(W / 2, 0, 40, W / 2, 0, 1100); g.addColorStop(0, '#4a0914'); g.addColorStop(.6, '#000'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl';
  x.fillStyle = '#1C1C1E'; x.beginPath(); x.arc(W / 2, 260, 150, 0, 7); x.fill(); x.lineWidth = 12; x.strokeStyle = '#F5C542'; x.stroke();
  x.font = f(400, 170); x.fillText(me.av, W / 2, 272);
  x.fillStyle = '#fff'; x.font = f(800, 84); x.fillText(me.n, W / 2, 500);
  x.font = f(400, 230); x.fillText(icn, W / 2, 750);
  x.fillStyle = '#F5C542'; x.font = f(800, 66); x.fillText(t1, W / 2, 960, W - 120);
  if (t2) { x.fillStyle = '#C7C7CC'; x.font = f(500, 44); x.fillText(t2, W / 2, 1040, W - 120); }
  x.fillStyle = '#2C2C2E'; x.fillRect(80, 1170, W - 160, 3);
  x.textAlign = 'right'; x.fillStyle = '#fff'; x.font = f(800, 52); x.fillText('تحدّي', W - 90, 1250); const w1 = x.measureText('تحدّي ').width;
  x.fillStyle = '#C8102E'; x.fillText('الدقيقة', W - 90 - w1, 1250);
  x.textAlign = 'left'; x.fillStyle = '#C7C7CC'; x.font = f(500, 38); x.fillText(kind === 'pts' ? '👈 شارك الحين' : '👈 جرّبها مع صفك', 90, 1250);
  return { c, t1, me };
}
async function shareCard(kind, a){
  const { c, t1, me } = shDraw(kind, a), url = shLink(), text = kind === 'pts' ? 'حصلت على ' + a.n + ' نقطة في «اهزم الدقيقة» 🔥 تقدر تفوز علي؟\nشارك الحين 👇' : t1 + ' في «اهزم الدقيقة» 🏆';
  const blob = await new Promise(r => c.toBlob(r, 'image/png')), file = blob && new File([blob], 'tahaddi.png', { type: 'image/png' });
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], text: text + '\n' + url }); return; } catch(e){ if (e && e.name === 'AbortError') return; } }
  const src = c.toDataURL('image/png');
  modal('<div class="sh-mo center"><h3>📤 شارك إنجازك</h3><img class="sh-img" src="' + src + '" alt=""><p class="sub">اضغط على الصورة مطوّلاً واحفظها، أو أرسل الرابط</p><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(text + '\n' + url) + '">💬 واتساب</a></div>');
}
ACTS['s-share'] = t => shareCard(t.dataset.k, { n: t.dataset.n, d: t.dataset.d, p: t.dataset.p === '1' });
function shBtn(kind, a, label){ a = a || {}; return '<button class="btn sh-btn" data-act="s-share" data-k="' + kind + '"' + (a.n != null ? ' data-n="' + esc(String(a.n)) + '"' : '') + (a.d ? ' data-d="' + esc(a.d) + '"' : '') + (a.p ? ' data-p="1"' : '') + '>' + (label || '📤 شارك إنجازك') + '</button>'; }
/* landing page for people who open the shared link */
function shLanding(n){
  document.body.classList.remove('wide');
  $app.innerHTML = '<div class="sh pvx"><div class="shl">' +
    '<div class="shl-m">🏆</div><h2>' + (n ? esc(n) + ' يلعب «اهزم الدقيقة»' : 'صفك كله يتحدى كل يوم') + '</h2>' +
    '<p>جولة وحدة باليوم، دقيقة وحدة، أسئلة من المنهج. والصف كله يتنافس على الترتيب.</p>' +
    '<div class="shl-st"><div><b>١</b>المعلم يسوي تحدي من الأسئلة الجاهزة</div><div><b>٢</b>يرسل رمز الصف للطلاب</div><div><b>٣</b>كل يوم دقيقة لعب ونقاط وشارات</div></div>' +
    '<a class="btn" href="#/t">👨‍🏫 أنت معلم؟ سوّ تحدي لصفك مجاناً</a><a class="shl-s" href="#/s">عندك رمز من معلمك؟ ادخل من هنا</a></div></div>';
}

/* ======================================================
   TEACHER
   ====================================================== */
const T = { user: null, name: '', classTab: 'students', authMode: 'in', qf: { status: 'all', level: 'all', type: 'all', subj: '', cu: '' } };
const CK = { cls: null, students: [], comp: null, pending: [] };
const QS = { list: [], glob: [], globalCount: 0, stats: {}, q: '', sel: new Set(), selOn: false, dup: new Set(), norm: {} };
const TYPE_AR = { curriculum: 'منهج', general: 'عام', quick: 'سرعة بديهة', memory: 'ذاكرة' };
const LEVEL_AR = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' };
const STATUS_AR = { draft: 'مسودة', approved: 'متاح', rejected: 'مرفوض' };
const STYLE_AR = { kids: 'مرح · ابتدائي', mid: 'مرح قليلاً · متوسط', uni: 'هادئ · ثانوي وجامعة' };
const STYLE_SW = { kids: 'linear-gradient(135deg,#FFD9B0,#E3262F)', mid: 'linear-gradient(135deg,#C8102E,#F5B72B)', uni: 'linear-gradient(135deg,#FAF6F3,#7A1220)' };
const LOGO_S = '<div class="logo" style="width:42px;height:42px" aria-hidden="true"><img src="icon-192.png?i=10" alt=""></div>';
const NAV = [['home', 'الرئيسية', 'home'], ['classes', 'الصفوف', 'layers'], ['new', 'تحدي', 'plus'], ['questions', 'الأسئلة', 'help'], ['settings', 'الإعدادات', 'gear']];
const NAV_EMO = { home:'🏠', classes:'👥', questions:'❓', settings:'⚙️' };
/* v211 (Khalid): line icons + «تحدي» = answer-squares logo (bigger, no label) + red count badges */
const NAV_LN = {"home": '<svg class="nav-ln" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>', "classes": '<svg class="nav-ln" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.7 3 2.4 3.5 5.2"/></svg>', "questions": '<svg class="nav-ln" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>', "settings": '<svg class="nav-ln" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'};
/* v303 (Khalid): centre tab icon = golden stopwatch from the app icon (was the 4 answer squares) */
const NAV_SQ = '<img class="nav-sq" src="nav-watch.png?i=1" alt="" draggable="false" decoding="sync">';
try { const _nw = new Image(); _nw.src = 'nav-watch.png?i=1'; window._nw = _nw; if (_nw.decode) _nw.decode().catch(() => {}); } catch (e) {}
const NB = (() => { try { return JSON.parse(LS.get('mc_nb') || '{}') || {}; } catch (e) { return {}; } })();
const nbHtml = k => (k === 'classes') ? `<em class="nb" data-nb="${k}"${NB[k] ? '' : ' hidden'}>${NB[k] > 99 ? '99+' : (NB[k] || '')}</em>` : '';
function nbSet(k, n){ NB[k] = n || 0; LS.set('mc_nb', JSON.stringify(NB)); document.querySelectorAll('.nb[data-nb="' + k + '"]').forEach(e => { e.hidden = !NB[k]; e.textContent = NB[k] > 99 ? '99+' : (NB[k] || ''); }); }
let NB_T = 0;
function nbPending(){ if (Date.now() - NB_T < 60000 || !T.user) return; NB_T = Date.now(); ntLoad();
  sb.from('students').select('id,classes!inner(archived,teacher_id)', { count: 'exact', head: true }).eq('approved', false).eq('classes.archived', false).eq('classes.teacher_id', T.user.id).then(r => { if (!r.error) nbSet('classes', r.count || 0); }); }
/* ===== v274 teacher bell: computed notices (rpc teacher_notices), seen keys in LS ===== */
const NT = { n: 0, items: [] };
const ntSeen = () => { try { return JSON.parse(LS.get('mc_nt_seen') || '[]'); } catch(e){ return []; } };
function ntItems(d){ const it = [], fn = x => fmtStu(x || '');
  (d.pending || []).forEach(x => it.push({ k: 'p:' + x.cid + ':' + x.n, e: '🙋', t: x.n === 1 ? 'طالب جديد ينتظر موافقتك' : x.n + ' طلاب ينتظرون موافقتك', s: 'صف ' + x.cls, h: '#/t/class/' + x.cid, b: 'افتح' }));
  (d.ended || []).forEach(x => it.push({ k: 'e:' + x.g, e: '🏆', t: 'خلص «' + x.title + '»', s: x.win ? 'الفايز: ' + fn(x.win) : 'ما لعب أحد', h: '#/t/results/' + x.cid + '/' + x.comp }));
  (d.idle || []).forEach(x => it.push({ k: 'i:' + x.g + ':' + d.today, e: '😴', t: (x.n === 1 ? 'طالب ما لعب' : x.n + ' ما لعبوا') + ' من ٣ أيام', s: (x.names || []).map(fn).map(n => n.split(' ')[0]).join('، ') + (x.n > 3 ? ' وغيرهم' : ''), h: '#/t/ch/' + x.g, b: 'ذكّرهم' }));
  (d.yd || []).forEach(x => it.push({ k: 'y:' + x.g + ':' + d.yday, e: '📊', t: 'ملخص ' + (cfDays(d.yday, d.today) === 1 ? 'أمس' : 'آخر يوم دراسي') + ': لعب ' + x.p + ' من ' + x.n, s: x.title, h: '#/t/ch/' + x.g }));
  return it; }
async function ntLoad(){ try { const d = await rpc('teacher_notices'), del = ntDel(); NT.items = ntItems(d || {}).filter(x => del.indexOf(x.k) < 0); } catch(e){ return; }
  const seen = ntSeen(); NT.n = NT.items.filter(x => seen.indexOf(x.k) < 0).length;
  document.querySelectorAll('.t-bell-n').forEach(el => { el.hidden = !NT.n; el.textContent = NT.n > 9 ? '9+' : NT.n; }); }
const ntDel = () => { try { return JSON.parse(LS.get('mc_nt_del') || '[]'); } catch(e){ return []; } };
function ntHide(keys){ try { LS.set('mc_nt_del', JSON.stringify(ntDel().concat(keys).slice(-200))); } catch(e){} NT.items = NT.items.filter(x => keys.indexOf(x.k) < 0); }
function ntSheet(){ const seen = ntSeen(), it = NT.items.slice().sort((a, b) => (seen.indexOf(a.k) >= 0) - (seen.indexOf(b.k) >= 0));
  const h = `<div class="aw-sheet nt-sheet"><div class="nt-hd"><h3>الإشعارات</h3>${it.length > 1 ? '<button class="nt-all" data-act="nt-clear">مسح الكل</button>' : ''}</div>${it.length ? it.map(x => `<div class="nt-r"><button class="nt-i${seen.indexOf(x.k) < 0 ? ' new' : ''}" data-act="nt-go" data-h="${esc(x.h)}"><i>${x.e}</i><span class="grow"><b>${esc(x.t)}</b><small>${esc(x.s || '')}</small></span>${x.b ? `<em>${x.b}</em>` : ''}</button><button class="nt-x" data-act="nt-del" data-k="${esc(x.k)}" aria-label="حذف الإشعار">✕</button></div>`).join('') : '<div class="nt-empty">ما فيه شي جديد 👌</div>'}</div>`;
  const cur = document.querySelector('.nt-sheet'); if (cur) cur.outerHTML = h; else modal(h);
  try { LS.set('mc_nt_seen', JSON.stringify(seen.concat(NT.items.map(x => x.k).filter(k => seen.indexOf(k) < 0)).slice(-80))); } catch(e){}
  NT.n = 0; document.querySelectorAll('.t-bell-n').forEach(el => { el.hidden = true; }); }
ACTS['t-bell'] = async () => { ntSheet(); await ntLoad(); if (document.querySelector('.nt-sheet')) ntSheet(); };
ACTS['nt-del'] = t => { ntHide([t.dataset.k]); ntSheet(); };
ACTS['nt-clear'] = () => { ntHide(NT.items.map(x => x.k)); ntSheet(); };
ACTS['nt-go'] = t => { closeModals(); go(t.dataset.h); };
const navIc = n => n[0] === 'new' ? NAV_SQ : NAV_LN[n[0]] ? NAV_LN[n[0]] + nbHtml(n[0]) : ic(n[2]);

function shell(title, body, active, top, back){
  return `<div class="t-top"><div class="brand">${back ? (back.indexOf('act:') === 0 ? `<button class="icon-btn back-btn" data-act="${back.slice(4)}" aria-label="رجوع">${ic('back')}</button>` : `<a class="icon-btn back-btn" href="${back}" aria-label="رجوع">${ic('back')}</a>`) : LOGO_S}<span class="t-title${String(title).length > 19 ? ' t-xl' : String(title).length > 13 ? ' t-lg' : ''}">${esc(title)}</span></div><div class="t-acts">${top || ''}<button class="t-bell" data-act="t-bell" aria-label="الإشعارات">${ic('bell')}<em class="t-bell-n"${NT.n ? '' : ' hidden'}>${NT.n > 9 ? '9+' : NT.n}</em></button><button class="t-av" data-act="t-menu" aria-label="حسابي">${avatarHtml('t-av-img')}</button></div></div>` +
    `<div class="t-body">${body}</div>` +
    `<nav class="t-nav" aria-label="القائمة"><span class="lens" style="--i:${NAVI.prev}"></span>${NAV.map(n => `<a href="#/t/${n[0]}" class="${n[0] === active ? 'on' : ''}${n[0] === 'new' ? ' t-sq' : ''}"${n[0] === 'new' ? ' aria-label="تحدي جديد"' : ''}>${navIc(n)}${n[0] === 'new' ? '' : `<span>${n[1]}</span>`}</a>`).join('')}</nav>` + (setTimeout(nbPending, 0) && '');
}
const NAVI = { prev: 0 };
const PCACHE = {}; // last rendered teacher page per hash, shown instantly while fresh data loads
/* appearance: light / dark / auto */
const MQ = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
function applyMode(){
  const dark = true; /* v269: one dark look for everyone */
  document.body.classList.toggle('dark', dark);
  applyLook();
  const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = dark && document.body.classList.contains('wide') ? '#161112' : '#C8102E';
}
if (MQ && MQ.addEventListener) MQ.addEventListener('change', applyMode);
const MODE_AR = { light: 'فاتح', dark: 'داكن', auto: 'تلقائي' };
function modeSeg(){ const m = LS.get('mc_mode') || 'auto'; return `<div class="tabs mode-seg">${['light', 'dark', 'auto'].map(k => `<button type="button" class="${m === k ? 'on' : ''}" data-act="set-mode" data-v="${k}">${ic(k === 'light' ? 'sun' : k === 'dark' ? 'moon' : 'gear')} ${MODE_AR[k]}</button>`).join('')}</div>`; }
ACTS['set-mode'] = t => { LS.set('mc_mode', t.dataset.v); applyMode(); t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); const v = document.getElementById('mode-val'); if (v) v.textContent = MODE_AR[t.dataset.v]; };
/* iOS-style push navigation: sub pages slide in, back slides out, swipe back from anywhere */
const NS = { stack: [], cur: null, keepY: null, swipe: false };
function snapLayer(html, y, cls){
  const r = $app.getBoundingClientRect();
  const L = document.createElement('div'); L.className = 'pg-layer ' + (cls || '');
  L.innerHTML = `<div class="pg-in" style="left:${r.left}px;width:${r.width}px"><div class="pg-sc" style="transform:translateY(${-y}px)">${html}</div></div>`;
  document.body.appendChild(L);
  const tt = L.querySelector('.pg-sc > .t-top'); if (tt && y > 0) { const c = tt.cloneNode(true); c.classList.add('pg-tt'); L.firstChild.prepend(c); }
  return L;
}
const pageEls = () => [...$app.querySelectorAll(':scope > .t-top, :scope > .t-body')];
function view(title, body, active, top, back){
  const h = location.hash, prev = NS.cur, first = h !== prev;
  if (first && body.indexOf('<div class="spin"></div>') === 0) {
    if ((!NS.pend || NS.pend.h !== h) && $app.querySelector(':scope > .t-body')) NS.pend = { h, html: pageEls().map(e => e.outerHTML).join(''), y: scrollY };
    return viewRaw(title, body, active, top, back);
  }
  const pend = NS.pend && NS.pend.h === h ? NS.pend : null; NS.pend = null;
  let mode = null, oldHtml = pend ? pend.html : '', oldY = pend ? pend.y : scrollY;
  if (first && prev != null && (pend || $app.querySelector(':scope > .t-body')) && h.indexOf('#/t') === 0) {
    const tp = NS.stack[NS.stack.length - 1];
    if (tp && tp.h === h) mode = 'pop';
    else if (back) mode = 'push';
    else NS.stack = [];
    if (mode && !pend) oldHtml = pageEls().map(e => e.outerHTML).join('');
    if (mode === 'push') NS.stack.push({ h: prev, html: oldHtml, y: oldY });
  }
  const keep = !first ? (NS.keepY != null ? NS.keepY : scrollY) : null; NS.keepY = null;
  if (!first && NS.anim) {
    const cur = pageEls().map(e => getComputedStyle(e).transform);
    viewRaw(title, body, active, top, back); window.scrollTo(0, keep);
    pageEls().forEach((e, i) => { e.style.transition = 'none'; e.style.transform = cur[i] && cur[i] !== 'none' ? cur[i] : ''; });
    requestAnimationFrame(() => requestAnimationFrame(() => pageEls().forEach(e => { e.style.transition = 'transform .25s cubic-bezier(.2,.8,.2,1)'; e.style.transform = ''; })));
    return;
  }
  viewRaw(title, body, active, top, back);
  NS.cur = h;
  if (keep != null) window.scrollTo(0, keep);
  if (mode === 'pop') { const e = NS.stack.pop(); window.scrollTo(0, e.y); }
  if (NS.swipe) { NS.swipe = false; document.querySelectorAll('.pg-layer').forEach(x => x.remove()); $app.classList.remove('pg-anim'); return; }
  if (!mode || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = pageEls(), W = $app.offsetWidth;
  if (mode === 'push') {
    const L = snapLayer(oldHtml, oldY, 'under');
    els.forEach(e => { e.style.transition = 'none'; e.style.transform = `translateX(${-W}px)`; });
    $app.classList.add('pg-anim');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      els.forEach(e => { e.style.transition = 'transform .34s cubic-bezier(.2,.8,.2,1)'; e.style.transform = ''; });
      L.firstChild.style.transition = 'transform .34s cubic-bezier(.2,.8,.2,1)'; L.firstChild.style.transform = `translateX(${W * .3}px)`; L.classList.add('dim');
    }));
    NS.anim = true; setTimeout(() => { L.remove(); pageEls().forEach(e => { e.style.transition = ''; e.style.transform = ''; }); $app.classList.remove('pg-anim'); NS.anim = false; }, 380);
  } else {
    const L = snapLayer(oldHtml, oldY, 'over');
    els.forEach(e => { e.style.transition = 'none'; e.style.transform = `translateX(${W * .3}px)`; });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      els.forEach(e => { e.style.transition = 'transform .3s cubic-bezier(.2,.8,.2,1)'; e.style.transform = ''; });
      L.firstChild.style.transition = 'transform .3s cubic-bezier(.2,.8,.2,1)'; L.firstChild.style.transform = `translateX(${-W}px)`;
    }));
    NS.anim = true; setTimeout(() => { L.remove(); pageEls().forEach(e => { e.style.transition = ''; e.style.transform = ''; }); NS.anim = false; }, 340);
  }
}
function viewRaw(title, body, active, top, back){
  applyMode();
  // a slow page that finishes loading after the user already moved to another tab must not take over the screen
  if (location.hash.indexOf('#/t') === 0) {
    const hp = (location.hash.match(/^#\/t\/([a-z]+)/) || [])[1] || 'home';
    const want = { class: 'classes', results: 'home', comps: 'home', qshare: 'questions' }[hp] || hp;
    const isTab = k => NAV.some(n => n[0] === k);
    if (isTab(want) && isTab(active) && active !== want) return;
    if (body.indexOf('<div class="spin"></div>') !== 0) PCACHE[location.hash] = { title, body, top, back };
  }
  const i0 = NAV.findIndex(n => n[0] === active), i = Math.max(0, i0);
  const nav = $app.querySelector(':scope > .t-nav'), oldTop = $app.querySelector(':scope > .t-top'), oldBody = $app.querySelector(':scope > .t-body');
  if (nav && oldTop && oldBody) {
    // keep the tab bar on screen; swap only the header and the page
    const tmp = document.createElement('div'); tmp.innerHTML = shell(title, body, active, top, back);
    oldTop.replaceWith(tmp.querySelector('.t-top')); oldBody.replaceWith(tmp.querySelector('.t-body'));
    nav.querySelectorAll('a').forEach((a, j) => a.classList.toggle('on', j === i0));
    const lens = nav.querySelector('.lens'); if (lens) { lens.style.opacity = i0 < 0 ? '0' : ''; lensMove(nav, i); }
    NAVI.prev = i; window.scrollTo(0, 0); return;
  }
  $app.innerHTML = shell(title, body, active, top, back); window.scrollTo(0, 0);
  const lens = $app.querySelector('.lens');
  if (lens && i0 < 0) lens.style.opacity = '0';
  if (lens) requestAnimationFrame(() => requestAnimationFrame(() => { lensMove($app.querySelector('.t-nav'), i); NAVI.prev = i; }));
}
/* liquid-glass lens: drag across the tab bar (teacher .t-nav and student .s-nav) */
(function(){
  let drag = null;
  const items = nav => [...nav.querySelectorAll(':scope > a, :scope > button')];
  const idxAt = (nav, x) => { const n = items(nav).length, r = nav.getBoundingClientRect(), w = r.width / n; return Math.max(0, Math.min(n - 1, Math.floor((r.right - x) / w))); };
  const reset = () => { if (drag && drag.lens) drag.lens.classList.remove('drag'); if (drag) items(drag.nav).forEach(el => el.classList.remove('hover')); drag = null; };
  document.addEventListener('touchcancel', reset, { passive: true });
  document.addEventListener('touchstart', e => {
    reset();
    const nav = e.target.closest && e.target.closest('.t-nav,.s-nav'); if (!nav || e.touches.length > 1) return;
    drag = { nav, lens: nav.querySelector('.lens'), x0: e.touches[0].clientX, moved: false };
    if (drag.lens) { const k = idxAt(nav, e.touches[0].clientX); drag.lens.classList.add('drag'); drag.lens.style.setProperty('--i', k); items(nav).forEach((el, j) => el.classList.toggle('hover', j === k)); }
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!drag || !drag.nav.isConnected || !drag.lens) { drag = null; return; }
    const x = e.touches[0].clientX; if (Math.abs(x - drag.x0) > 6) drag.moved = true;
    if (!drag.moved) return;
    e.preventDefault();
    const n = items(drag.nav).length, r = drag.nav.getBoundingClientRect(), w = r.width / n, pos = Math.max(0, Math.min(n - 1, (r.right - x) / w - .5));
    drag.lens.classList.add('drag', 'live'); drag.lens.style.setProperty('--i', pos);
    const k = idxAt(drag.nav, x); items(drag.nav).forEach((el, j) => el.classList.toggle('hover', j === k));
  }, { passive: false });
  document.addEventListener('touchend', e => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.lens) setTimeout(() => d.lens.classList.remove('drag', 'live'), d.moved ? 0 : 70);
    items(d.nav).forEach(el => el.classList.remove('hover'));
    if (!d.moved && d.lens) { /* v257: tap → mark the tab at once, don't wait for the page to load */
      const k = idxAt(d.nav, e.changedTouches[0].clientX); d.nav.dataset.cur = String(k); if (d.nav.classList.contains('t-nav')) NAVI.prev = k; else S.navPrev = k;
      items(d.nav).forEach((el, j) => el.classList.toggle('on', j === k)); return; }
    if (!d.moved || !d.lens) return;
    const k = idxAt(d.nav, e.changedTouches[0].clientX); d.lens.style.setProperty('--i', k); d.nav.dataset.cur = String(k); if (d.nav.classList.contains('t-nav')) NAVI.prev = k; else S.navPrev = k;
    const el = items(d.nav)[k];
    if (d.nav.classList.contains('t-nav')) { const h = '#/t/' + NAV[k][0]; if (location.hash !== h) location.hash = h; }
    else if (el && !el.classList.contains('on')) el.click();
  });
})();
function go(h){ if (location.hash === h) route(); else location.hash = h; }

/* ---- auth ---- */
function teacherAuth(){
  const up = T.authMode === 'up';
  $app.innerHTML = `
  <div class="ta"><div class="hero">${LOGO}<h1>اهزم الدقيقة</h1><p>منصة مسابقات تعليمية للمدارس والجامعات</p></div>
  <div class="pad col"><form class="card col" data-form="t-auth" autocomplete="on" method="post" action="#">
    <div class="tabs"><button type="button" class="${up ? '' : 'on'}" data-act="t-mode" data-mode="in">تسجيل الدخول</button><button type="button" class="${up ? 'on' : ''}" data-act="t-mode" data-mode="up">إنشاء حساب</button></div>
    ${up ? '<div class="field"><label for="a-name">الاسم</label><input class="input" id="a-name" name="name" required></div>' : ''}
    <div class="field"><label for="a-email">البريد الإلكتروني</label><input class="input" id="a-email" name="email" type="email" required dir="ltr" value="${esc(T.authEmail || '')}" placeholder="example@school.edu.kw" autocomplete="username" autocapitalize="off" spellcheck="false"></div>
    <div class="field"><label for="a-pw">كلمة المرور</label><input class="input" id="a-pw" name="password" type="password" required minlength="6" dir="ltr" aria-describedby="a-pw-h" autocomplete="${up ? 'new-password' : 'current-password'}"><small class="sub" id="a-pw-h">${up ? '6 أحرف على الأقل' : ''}</small></div>
    ${up ? '' : '<button type="button" class="link forgot" data-act="t-forgot">نسيت كلمة المرور؟</button>'}
    <div id="aerr"></div>
    <button class="btn" type="submit">${up ? 'إنشاء حساب المعلم' : 'دخول المعلم'}</button>
    ${cfg.GOOGLE_LOGIN ? '<button type="button" class="btn ghost" data-act="t-oauth" data-p="google">المتابعة باستخدام Google</button>' : ''}
    ${cfg.APPLE_LOGIN ? '<button type="button" class="btn ghost" data-act="t-oauth" data-p="apple">المتابعة باستخدام Apple</button>' : ''}
  </form>
  <div class="center"><button class="link" data-act="go-student">أنت طالب/ـة؟ دخول الطلبة</button></div></div></div>`;
}
ACTS['t-forgot'] = async () => {
  const cur = (document.getElementById('a-email') || {}).value || '';
  const email = await ask('سنرسل رابطاً لتعيين كلمة مرور جديدة إلى بريدك.', { title: 'استعادة كلمة المرور', input: cur, placeholder: 'example@school.edu.kw', dir: 'ltr', email: true, ok: 'إرسال الرابط', danger: false });
  if (!email) return;
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + location.pathname });
  if (error) return toast('تعذّر إرسال الرابط: ' + errMsg(error));
  ask(`أرسلنا رابط الاستعادة إلى ${email.trim()}.\n\nالخطوة التالية: افتح الرسالة واضغط الرابط، وستظهر لك خانة كلمة المرور الجديدة. إذا لم تصل خلال دقائق فافحص مجلد الرسائل غير المرغوبة.`, { title: 'تم الإرسال ✉️', alert: true, ok: 'حسناً', danger: false });
};
/* returning from an e-mail link (sign-up confirm / password recovery) */
async function authReturn(){
  const h = location.hash, rec = /type=recovery/.test(h);
  const err = (h.match(/error_description=([^&]+)/) || [])[1];
  /* links made before v278 had «#/t/home#access_token=…», which supabase-js can't read: set the session by hand */
  const at = (h.match(/access_token=([^&#]+)/) || [])[1], rt = (h.match(/refresh_token=([^&#]+)/) || [])[1];
  const ss = await sb.auth.getSession();
  if (at && rt && !(ss.data && ss.data.session)) { try { await sb.auth.setSession({ access_token: decodeURIComponent(at), refresh_token: decodeURIComponent(rt) }); } catch(e){} }
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
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name: (f.name.value || '').trim() }, emailRedirectTo: location.origin + location.pathname } });
      if (error) throw error;
      if (data.user && data.user.identities && !data.user.identities.length) { T.authMode = 'in'; T.authEmail = email; teacherAuth(); const b2 = document.getElementById('aerr'); if (b2) b2.innerHTML = '<div class="err">هذا البريد عنده حساب. سجّل الدخول بكلمة المرور.</div>'; return; }
      if (!data.session) { T.authEmail = email; return tCheckMail(email); }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
    go('#/t/home');
  } catch(e){ box.innerHTML = `<div class="err">${esc(errMsg(e))}</div>`; }
};
/* after sign-up: one clear screen instead of a small line under the form */
function tCheckMail(email){
  const card = document.querySelector('form[data-form="t-auth"]'); if (!card) return;
  const gm = /@(gmail|googlemail)\.com$/i.test(email), ol = /@(outlook|hotmail|live|moe\.edu\.kw)/i.test(email);
  card.outerHTML = `<div class="card col cm-mail"><div class="cm-ic">📩</div><h2>تحقق من بريدك</h2>
    <p>أرسلنا رابط التفعيل إلى</p><b dir="ltr" class="cm-em">${esc(email)}</b>
    <p class="sub">افتح الرسالة واضغط الرابط، وبيدخلك على طول. ما وصلت؟ شوف مجلد الرسائل غير المرغوبة.</p>
    ${gm ? '<a class="btn" href="https://mail.google.com/mail/u/0/#inbox" target="_blank" rel="noopener">افتح Gmail</a>' : ol ? '<a class="btn" href="https://outlook.office.com/mail/" target="_blank" rel="noopener">افتح البريد</a>' : ''}
    <button class="btn ${gm || ol ? 'soft' : ''}" data-act="t-resend" id="t-resend">أعد إرسال الرسالة</button>
    <button class="btn ghost" data-act="t-mode" data-mode="in">فعّلت الحساب؟ سجّل الدخول</button></div>`;
  tResendCd(document.getElementById('t-resend'));
  scrollTo(0, 0);
}
ACTS['t-resend'] = async t => { const email = T.authEmail; if (!email || t.disabled) return; t.disabled = true;
  const { error } = await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: location.origin + location.pathname } });
  if (error) { t.disabled = false; return toast(/rate|seconds|security/i.test(error.message || '') ? 'انتظر شوي وحاول مرة ثانية' : errMsg(error)); }
  toast('أرسلناها مرة ثانية ✓'); tResendCd(t); };
function tResendCd(t){ if (!t) return; let n = 60; t.disabled = true; t.textContent = 'أعد الإرسال بعد ' + n + ' ث';
  const iv = setInterval(() => { n--; if (!document.body.contains(t)) return clearInterval(iv); if (n <= 0) { clearInterval(iv); t.disabled = false; t.textContent = 'أعد إرسال الرسالة'; } else t.textContent = 'أعد الإرسال بعد ' + n + ' ث'; }, 1000); }
ACTS['t-logout'] = async () => { await sb.auth.signOut(); T.user = null; teacherAuth(); };

/* ---- admin: dashboard + support access (view only until «تفعيل الدعم») ---- */
const ADM = { st: null, tab: 'act', d: null };
const ADM_READ = /^(admin_|question_pool|question_stats|shared_preview|teacher_bracket|teacher_class_results|teacher_comp_bracket|teacher_comp_results|teacher_student_report)/;
const admView = () => !!(ADM.st && ADM.st.act && !ADM.st.act.can_write && location.hash.indexOf('#/t') === 0);
const admFake = new Proxy(function(){}, { get(t, k){ if (k === 'then') return r => r({ data: null, error: { message: 'adm_view' } }); return () => admFake; } });
(function(){
  const from = sb.from.bind(sb), call = sb.rpc.bind(sb);
  sb.from = n => { const q = from(n); if (admView()) ['insert', 'update', 'upsert', 'delete'].forEach(k => { q[k] = () => admFake; }); return q; };
  sb.rpc = (n, a, o) => ((admView() && !ADM_READ.test(n)) || (ADM.st && ADM.st.act && n === 'delete_my_account')) ? admFake : call(n, a, o);
})();
async function admLoad(){ if (ADM.st) return ADM.st; try { ADM.st = await rpc('admin_state') || { is: false }; } catch(e){ ADM.st = { is: false }; } return ADM.st; }
function admApply(u){
  const a = ADM.st && ADM.st.act;
  T.user = a ? { id: a.teacher_id, email: a.email || '', app_metadata: {}, real: u } : u;
  let b = document.getElementById('adm-bar');
  document.documentElement.classList.toggle('admmode', !!a);
  if (!a) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('div'); b.id = 'adm-bar'; document.body.appendChild(b); }
  b.className = a.can_write ? 'on' : '';
  const nm = esc(a.name || (a.email || '').split('@')[0]);
  b.innerHTML = `<span class="grow">${a.can_write ? '🛠 الدعم مفعّل · ' : '👁 '}${nm}</span>` +
    (a.can_write ? `<button data-act="adm-w" data-w="0">إيقاف الدعم</button>` : `<button data-act="adm-w" data-w="1">🛠 تفعيل الدعم</button>`) +
    `<button data-act="adm-exit">↩ اللوحة</button>`;
}
ACTS['adm-w'] = async t => {
  const on = t.dataset.w === '1', a = ADM.st.act;
  if (on && !await ask('أي تعديل ينحفظ في حسابه وباسمك.', { title: 'تفعيل الدعم؟', ok: 'تفعيل', danger: false })) return;
  try { ADM.st = await rpc('admin_act', { p_teacher: a.teacher_id, p_write: on }); admApply(T.user.real); toast(on ? 'الدعم مفعّل 🛠' : 'رجعت للمشاهدة 👁'); } catch(e){ toast(errMsg(e)); }
};
ACTS['adm-exit'] = async () => { try { await rpc('admin_act', { p_teacher: null }); } catch(e){} location.hash = '#/t/admin'; location.reload(); };
ACTS['adm-enter'] = async t => { try { await rpc('admin_act', { p_teacher: t.dataset.id, p_write: false }); location.hash = '#/t/home'; location.reload(); } catch(e){ toast(errMsg(e)); } };
ACTS['adm-tab'] = t => { ADM.tab = t.dataset.t; admRender(); };
const admAgo = d => { if (!d) return '—'; const x = Math.floor((Date.now() - new Date(d)) / 864e5); return x <= 0 ? 'اليوم' : x === 1 ? 'أمس' : x < 30 ? `قبل ${x} يوم` : new Date(d).toLocaleDateString('ar-KW', { day: 'numeric', month: 'long' }); };
const nf = n => Number(n || 0).toLocaleString('en-US');
async function tAdmin(){
  if (!ADM.st.is) return tHome();
  view('لوحة المشرف', '<div class="spin"></div>', 'settings', '', '#/t/settings');
  try { ADM.d = await rpc('admin_overview'); } catch(e){ return view('لوحة المشرف', `<p class="sub center">${esc(errMsg(e))}</p>`, 'settings', '', '#/t/settings'); }
  admRender();
}
function admRender(){
  const d = ADM.d, today = new Date().toDateString();
  const L = (d.list || []).slice().sort(ADM.tab === 'new' ? (a, b) => new Date(b.created_at) - new Date(a.created_at) : (a, b) => b.rounds - a.rounds || new Date(b.last_sign_in_at || 0) - new Date(a.last_sign_in_at || 0));
  const k = (n, l, e) => `<div class="ad-k"><b>${nf(n)}</b><span>${l}</span>${e ? `<em>${e}</em>` : ''}</div>`;
  view('لوحة المشرف',
    `<div id="ad-met"></div><div class="ad-k4">${k(d.teachers, 'معلم', d.teachers_week ? `+${d.teachers_week} هالأسبوع` : '')}${k(d.students, 'طالب', d.students_week ? `+${d.students_week} هالأسبوع` : '')}${k(d.live, 'تحدي شغّال')}${k(d.rounds_week, 'جولة هالأسبوع', `اليوم ${nf(d.rounds_today)}`)}</div>
    <button class="btn soft ad-ob" data-act="ob-demo">🎮 جرّب جولة البداية (تجربة)</button>
    <div class="ad-segs"><button data-act="adm-tab" data-t="act" class="${ADM.tab === 'act' ? 'on' : ''}">الأنشط</button><button data-act="adm-tab" data-t="new" class="${ADM.tab === 'new' ? 'on' : ''}">الجدد</button></div>
    <div class="ad-rows">${L.map(t => `<button class="ad-tr" data-act="adm-one" data-id="${t.id}"><span class="ad-av">${esc((t.name || '?')[0])}</span><span class="grow"><b>${esc(t.name || '')}${t.last_sign_in_at && new Date(t.last_sign_in_at).toDateString() === today ? '<i class="ad-dot"></i>' : ''}</b><small>${t.classes} صفوف · ${t.students} طالب · آخر دخول ${admAgo(t.last_sign_in_at)}</small></span><span class="ad-n"><b>${nf(t.rounds)}</b><small>جولة</small></span></button>`).join('') || '<p class="sub center">ما في معلمين</p>'}</div>
    <p class="sub center">النقطة الخضراء: دخل اليوم · الجولات آخر 7 أيام</p>`, 'settings', '', '#/t/settings');
  admMetrics();
}
/* v173 retention / habit metrics (sql/metrics.sql) */
async function admMetrics(){
  let m; try { m = ADM.m || (ADM.m = await rpc('admin_metrics')); } catch(e){ return; }
  const el = document.getElementById('ad-met'); if (!el || !m) return;
  const pc = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
  const days = m.days || [], act = m.active || 0, td = days.length ? days[days.length - 1].n : 0, mx = Math.max(1, act, ...days.map(x => x.n));
  const r = m.ret || {}, rt = n => { const x = r['d' + n] || {}; return `<div class="ad-k"><b>${pc(x.back || 0, x.base || 0)}</b><span>رجعوا يوم ${n}</span><em>من ${nf(x.base || 0)} طالب</em></div>`; };
  const wd = ['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
  el.innerHTML = `<h3 class="ad-h">📈 القياس</h3><div class="ad-k4"><div class="ad-k"><b>${pc(td, act)}</b><span>لعبوا اليوم</span><em>${nf(td)} من ${nf(act)}</em></div>${rt(1)}${rt(7)}${rt(30)}</div>
    <div class="ad-bars">${days.map(x => { const d = new Date(x.d + 'T12:00:00'); return `<div title="${x.d}: ${x.n}"><i style="height:${Math.round(x.n / mx * 100)}%"></i><small>${wd[d.getDay()][0]}</small></div>`; }).join('')}</div>
    <p class="sub center">آخر 14 يوم · عدد الطلاب اللي لعبوا الجولة الرسمية</p>
    <div class="ad-k4"><div class="ad-k"><b>${m.streak && m.streak.avg != null ? m.streak.avg : 0}</b><span>متوسط السلسلة 🔥</span><em>أطول ${m.streak && m.streak.max || 0}</em></div><div class="ad-k"><b>${nf(m.boxes || 0)}</b><span>صندوق انفتح</span><em>آخر 7 أيام</em></div></div>`;
}
ACTS['adm-one'] = t => {
  const x = (ADM.d.list || []).find(r => r.id === t.dataset.id); if (!x) return;
  const row = (l, v) => `<div class="set-row"><span class="grow">${l}</span><span class="set-val">${v}</span></div>`;
  modal(`<div class="ad-sh"><h3>${esc(x.name || '')}</h3><p class="sub" dir="ltr" style="text-align:right">${esc(x.email || '')}</p>
    <div class="ad-st3"><div><b>${nf(x.classes)}</b><span>صفوف</span></div><div><b>${nf(x.students)}</b><span>طالب</span></div><div><b>${nf(x.rounds)}</b><span>جولة</span></div></div>
    <div class="set-grp">${row('التحديات الشغّالة', nf(x.live))}${row('أسئلة كتبها بنفسه', nf(x.own_q))}${row('سجّل', admAgo(x.created_at))}${row('آخر دخول', admAgo(x.last_sign_in_at))}</div>
    <button class="btn" data-act="adm-enter" data-id="${x.id}">👁 ادخل على حسابه</button>
    ${x.email ? `<a class="btn ghost" href="mailto:${esc(x.email)}">✉️ راسله</a>` : ''}
    ${x.id !== T.user.id ? `<button class="link ad-del" data-act="adm-del" data-id="${x.id}">🗑 حذف الحساب</button>` : ''}</div>`);
};
ACTS['adm-del'] = async t => {
  const x = (ADM.d.list || []).find(r => r.id === t.dataset.id); if (!x) return;
  if (!await ask(`تنحذف صفوفه (${nf(x.classes)}) وطلابه (${nf(x.students)}) وكل شي له، وما ترجع.`, { title: `حذف حساب ${x.name || x.email || ''}؟`, ok: 'حذف' })) return;
  try { await rpc('admin_delete_teacher', { p_teacher: x.id }); closeModals(); toast('انحذف الحساب'); ADM.d.list = ADM.d.list.filter(r => r.id !== x.id); admRender(); }
  catch(e){ toast(/function|not find/i.test(String(e.message)) ? 'شغّل ملف admin_delete.sql أول' : errMsg(e)); }
};

/* ---- router ---- */
async function teacherRoute(){
  stopTimer();
  document.body.classList.add('wide');
  setTheme('mid');
  const { data } = await sb.auth.getSession();
  if (!data.session) return teacherAuth();
  await admLoad(); admApply(data.session.user);
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
      if (OB.want) { OB.want = 0; setTimeout(() => obStart(true), 400); } else if (T.settings.ob !== 'done' && !(SG('prof_subject') && SG('prof_stage')) && !(ADM.st && ADM.st.act)) setTimeout(obStart, 400);
    }
    if (page === 'classes' || page === 'comps') { CL.tab = page; CL.cur = null; await tClasses(); }
    else if (page === 'new') await tNew();
    else if (page === 'join') tJoin();
    else if (page === 'class') await tClass(parts[1]);
    else if (page === 'questions') await tQuestions();
    else if (page === 'qshare') { T.qf.status = 'approved'; await tQuestions(); qSharePreview(parts[1]); }
    else if (page === 'results') await tResults(parts[1], parts[2]);
    else if (page === 'ch') { CL.tab = 'comps'; CL.cur = null; await tClasses(); }
    else if (page === 'settings') await tSettings();
    else if (page === 'admin') await tAdmin();
    else if (page === 'sg') parts[1] === 'st' ? tSSet() : tSetGroup(parts[1]);
    else if (page === 'qset' || page === 'rset' || page === 'rules') tRules();
    else if (page === 'account') await tAccount();
    else if (page === 'opt') tOpt(parts[1]);
    else if (page === 'tb') tTB();
    else if (page === 'sset') tSSet();
    else if (page === 'hidden') await tHidden();
    else if (page === 'rep') await tStuRep(parts[1]);
    else if (page === 'entry') await tEntry();
    else if (page === 'appear') tAppear();
    else if (page === 'msgtpl') tMsgTpl();
    else if (page === 'export') await tExport();
    else if (page === 'archive') await tArchive();
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
  if (!classes.length) cp.data = [];
  // one card per running challenge: big «played today X of Y»; nothing else (Khalid: no clutter)
  const groups = {}, order = [];
  cp.data.forEach(c => { if (!classes.some(k => k.id === c.class_id)) return; const g = c.group_id || c.id; if (!groups[g]) { groups[g] = []; order.push(g); } groups[g].push(c); });
  const res = await Promise.all(order.map(g => Promise.all(groups[g].map(c => rpc('teacher_class_results', { p_class: c.class_id }).catch(() => null)))));
  { let left = 0; order.forEach((g, k) => { const c = groups[g][0], ph = phaseOf(c); if (c.paused_at || (ph !== 'points' && ph !== 'knockout')) return; left += res[k].filter(Boolean).flat().filter(r => !r.played_today).length; }); nbSet('home', left); }
  const cards = order.map((g, k) => {
    const cs = groups[g], c = cs[0], rs = res[k].filter(Boolean).flat(), n = rs.length, played = rs.filter(r => r.played_today).length;
    const names = cs.map(x => (classes.find(y => y.id === x.class_id) || {}).name).filter(Boolean).join('، ');
    const ph = phaseOf(c), pct = n ? Math.round(played * 100 / n) : 0;
    const dl = Math.round((new Date(c.end_date) - new Date(todayKW())) / 864e5);
    const mid = c.paused_at ? `<div class="hc-big">⏸</div><div class="hc-sub">متوقف مؤقتاً</div>`
      : ph === 'upcoming' ? `<div class="hc-big hc-day">${esc(fmtDate(c.start_date))}</div><div class="hc-sub">يبدأ</div>`
      : `<div class="hc-ring" style="--p:${pct}"><div><b>${played}</b><small>من ${n}</small></div></div><div class="hc-sub">لعبوا اليوم</div>`;
    return `<a class="hc" href="#/t/ch/${c.group_id || c.id}"><b class="hc-t">${esc(c.title || 'تحدي')}</b><small class="hc-c">${esc(names)}${ph === 'points' || ph === 'knockout' ? ` · باقي ${daysAr(Math.max(0, dl))}` : ''}</small>${mid}</a>`;
  });
  const hv = LS.get('mc_hv') || 'big', hvb = (k, i, l) => `<button class="${hv === k ? 'on' : ''}" data-act="h-view" data-v="${k}" aria-label="${l}">${i}</button>`;
  const html = cards.length ? `<div class="hv">${hvb('big', '<i class="hv-i1"></i>', 'مربعات كبيرة')}${hvb('two', '<i class="hv-i2"></i>', 'مربعين')}${hvb('list', '<i class="hv-i3"></i>', 'صفوف')}</div><div class="hcs hv-${hv}">${cards.join('')}</div>` : `<div class="h-empty"><div class="h-em">🚀</div><b>ما عندك تحدي الحين</b><small>3 خطوات وتخلص</small></div><a class="btn h-go" href="#/t/new">ابدأ تحدي 🚀</a>`;
  const obCard = cards.length && T.settings && T.settings.ob === 'skip' && !T.settings.obCard ? `<div class="ob-card"><button class="grow" data-act="ob-open"><b>👋 كمّل ملفك</b><small>المرحلة، المواد، المدرسة</small></button><button class="ob-cx" data-act="ob-cardx" aria-label="إغلاق">✕</button></div>` : '';
  view('الرئيسية', obCard + html + `<a class="h-more" href="#/t/comps">التحديات السابقة ‹</a>`, 'home');
}
ACTS['h-view'] = t => { LS.set('mc_hv', t.dataset.v); document.querySelectorAll('.hv button').forEach(b => b.classList.toggle('on', b === t)); const h = document.querySelector('.hcs'); if (h) h.className = 'hcs hv-' + t.dataset.v; haptic(); };
/* ---- first-time profile: 3 quick skippable screens (stage, subjects, school + district) ---- */
const OB_STAGES = ['ابتدائي', 'متوسط', 'ثانوي', 'جامعة'];
const OB_DIST = ['العاصمة', 'حولي', 'الفروانية', 'الجهراء', 'الأحمدي', 'مبارك الكبير'];
const OB = {};
/* v194: onboarding is a challenge round (no skip): stage → subjects → grade → section → profile summary (tap to edit, «المزيد» = school/district) → class code */
async function obStart(demo){
  if (document.getElementById('ob')) return;
  demo = demo === true;
  Object.assign(OB, { demo, st: new Set(demo ? [] : String(SG('prof_stage') || '').split('|').filter(Boolean)), sj: new Set(demo ? [] : mySubjects()), gr: null, grs: [], secs: new Set(), sec: null, made: null, school: SG('school') || '', d: SG('district') || '', more: false, edit: false, redo: false, pts: 0, hasCls: false, code: '', cname: '' });
  if (!demo) try { const r = await sb.from('classes').select('id').limit(1); OB.hasCls = !!(r.data && r.data.length); } catch(e){}
  obStep(1);
}
const obQn = () => OB.hasCls ? 2 : 3;
function obGrades(){ return [...OB.st].map(v => OB_STAGES.indexOf(v)).filter(i => i >= 0).sort().flatMap(i => NC_ST[i][2].map((g, k) => ({ st: NC_ST[i][0], g, l: NC_ST[i][0] === 'university' ? 'السنة ' + UNI_Y[k] : GRADES[g - 1] }))); }
function obStep(n){
  OB.n = n; let el = document.getElementById('ob'); if (!el) { el = document.createElement('div'); el.id = 'ob'; document.body.appendChild(el); }
  const Q = obQn(), tile = (on, v, e, act) => `<button class="ob-t${on ? ' on' : ''}" data-act="${act || 'ob-pick'}" data-v="${esc(v)}">${e ? `<span class="e">${e}</span>` : ''}<b>${esc(v)}</b></button>`;
  const head = n <= Q ? `<div class="obr-top"><span class="obr-pill">السؤال ${n} من ${Q}</span><span class="obr-pts">⭐ ${OB.pts}</span></div><div class="obr-dots">${Array.from({ length: Q }, (_, i) => `<i class="${i + 1 < n ? 'ok' : i + 1 === n ? 'cur' : ''}"></i>`).join('')}</div><div class="obr-bar"><i style="width:${100 - (n - 1) * 100 / Q}%"></i></div>` : '';
  const q = (t, sub) => `<div class="obr-q">${t}${sub ? `<small>${sub}</small>` : ''}</div>`;
  let b = '';
  if (n === 1) b = q('أي مراحل تدرّس؟', '<b class="obr-multi">☑️ اختر كل اللي تدرّسها</b>') + `<div class="ob-g obr-chk">${OB_STAGES.map((v, i) => tile(OB.st.has(v), v, ['🎒', '📘', '🎓', '🏛️'][i])).join('')}</div><button class="btn obr-go" data-act="ob-next" ${OB.st.size ? '' : 'disabled'}>${OB.st.size ? `التالي (${OB.st.size} مختارة)` : 'اختر مرحلة أو أكثر'}</button>`;
  if (n === 2) b = q('أي مواد تدرّس؟', '<b class="obr-multi">☑️ اختر كل اللي تدرّسها</b>') + (() => { const all = obSubjList(), cut = all.length > 9 && !OB.more, extra = [...OB.sj].filter(v => all.indexOf(v) < 0), sh = cut ? all.filter((v, i) => i < 8 || OB.sj.has(v)) : all;
      return `<div class="ob-g obr-chk ${sh.length + extra.length > 11 ? 'g4' : 'g3'} obr-sm">${sh.concat(extra).map(v => tile(OB.sj.has(v), v, SUBJ_EMOJI[v] || '📘')).join('')}${cut ? `<button class="ob-t" data-act="ob-more"><span class="e">➕</span><b>مواد أخرى</b></button>` : `<button class="ob-t" data-act="ob-other"><span class="e">✍️</span><b>اكتب مادة</b></button>`}</div>`; })() + `<button class="btn obr-go" data-act="ob-next" ${OB.sj.size ? '' : 'disabled'}>${OB.sj.size ? `التالي (${OB.sj.size} مختارة)` : 'اختر مادة أو أكثر'}</button>`;
  if (n === 3) { const gs = obGrades(), on = g => OB.grs.some(x => x.st === g.st && x.g === g.g); b = q('أي صفوف تدرّس؟', '<b class="obr-multi">☑️ اختر كل اللي تدرّسها</b>') + `<div class="ob-g obr-chk${gs.length > 4 ? ' g3' : ''}">${gs.map((g, k) => `<button class="ob-t${on(g) ? ' on' : ''}" data-act="ob-gr" data-k="${k}"><b>${esc(g.l)}</b></button>`).join('')}</div><button class="btn obr-go" data-act="ob-next" ${OB.grs.length ? '' : 'disabled'}>${OB.grs.length ? `التالي (${OB.grs.length} مختارة)` : 'اختر صف أو أكثر'}</button>`; }
  if (n === 4) b = q('أي شعب؟', '<b class="obr-multi">☑️ اختر كل الشعب</b>') + `<div class="ob-g obr-chk g3">${secList().slice(0, 9).map(x => `<button class="ob-t obr-sec${OB.secs.has(x) ? ' on' : ''}" data-act="ob-sec" data-v="${esc(x)}"><b>${esc(x)}</b></button>`).join('')}</div>${OB.secs.size ? `<button class="btn obr-go" data-act="ob-next">التالي (${OB.secs.size} مختارة)</button>` : `<button class="btn soft obr-go" data-act="ob-next">بدون شعبة</button>`}`;
  if (n === 5) {
    const row = (k, l, v) => `<button class="obr-row" data-act="ob-row" data-q="${k}"><span>${l}</span><b>${esc(v || '—')}</b><i>تعديل</i></button>`;
    const cn = obClasses().map(x => x.name).join('، ');
    b = `<div class="obr-hero"><div class="obr-stars">⭐${'⭐'.repeat(Q - 1)}</div><h2>مثالي! هذا ملفك 🏆</h2><p>اضغط على أي سطر تبي تعدله</p></div>
      <div class="obr-sum">${row(1, 'المرحلة', [...OB.st].join('، '))}${row(2, 'المادة', [...OB.sj].join('، '))}</div>
      ${OB.hasCls ? '' : `<div class="obr-cls"><span>صفوفك</span><div>${OB.grs.map((g, k) => `<button class="obr-cl" data-act="ob-grx" data-k="${k}">${esc(cnameOf(g.st, g.g, ''))} <i>✕</i></button>`).join('')}<button class="obr-cl add" data-act="ob-row" data-q="3">＋ أضف</button></div></div>`}
      <div class="obr-more"><label for="ob-school">المدرسة</label><input class="input ob-in" id="ob-school" maxlength="80" placeholder="اسم المدرسة (اختياري)" value="${esc(OB.school)}"><label>المنطقة التعليمية</label><div class="ob-g g3">${OB_DIST.map(v => tile(OB.d === v, v, '', 'ob-dist')).join('')}</div></div>
      <button class="btn obr-go" data-act="ob-finish">${OB.hasCls ? 'تمام 👍' : 'تمام، ادعُ طلابك 📲'}</button>`;
  }
  if (n === 6 && OB.made && OB.made.length > 1) {
    b = `<div class="obr-hero"><div class="obr-big">📲</div><h2>رموز صفوفك</h2><p>أرسل لكل صف رمزه في الواتساب. أول ما يدخلون يطلعون عندك.</p></div>
      <div class="obr-codes">${OB.made.map(c => { const m = `انضم لتحدي «${c.name}» في «اهزم الدقيقة» 🎯\nرمز الصف: ${fmtCode(c.code)}\nأو اضغط الرابط:\n${joinLink(c.code)}`; return `<div class="obr-cr"><b>${esc(c.name)}</b><span dir="ltr">${esc(fmtCode(c.code))}</span><button class="btn sm" data-act="c-share-wa" data-v="${esc(m)}">شارك</button></div>`; }).join('')}</div>
      <button class="btn soft obr-go" data-act="ob-close">خذني للرئيسية</button>`;
  } else if (n === 6) {
    const msg = `انضم لتحدي «${OB.cname}» في «اهزم الدقيقة» 🎯\nرمز الصف: ${fmtCode(OB.code)}\nأو اضغط الرابط:\n${joinLink(OB.code)}`;
    b = `<div class="obr-hero"><div class="obr-big">📲</div><h2>رمز صفك</h2><div class="obr-code" dir="ltr">${esc(fmtCode(OB.code))}</div><p>أرسله لطلابك في الواتساب. أول ما يدخلون يطلعون عندك.</p></div>
      <button class="btn obr-go" data-act="c-share-wa" data-v="${esc(msg)}">شارك الرمز</button><button class="btn soft" data-act="ob-close">خذني للرئيسية</button>`;
  }
  if (n <= Q) b = b.replace(/<button class="btn( soft)? obr-go" data-act="ob-next"[^>]*>.*?<\/button>/, m => `<div class="obr-nav">${n > 1 ? '<button class="btn soft obr-bk" data-act="ob-back" aria-label="رجوع">→</button>' : ''}${m}</div>`);
  el.innerHTML = `${OB.demo ? '<button class="obr-demo" data-act="ob-close">تجربة · لا يُحفظ شي ✕</button>' : ''}<div class="ob-b obr">${head}${b}</div><div class="obr-pop" id="obr-pop"></div>`;
}
function obClasses(){ const secs = OB.secs.size ? [...OB.secs] : [''], seen = new Set(), out = [];
  OB.grs.forEach(g => secs.forEach(sc => { const name = cnameOf(g.st, g.g, sc); if (!seen.has(name)) { seen.add(name); out.push({ name, st: g.st }); } })); return out; }
function obAns(){
  if (OB.redo) { if (OB.n === 1 && !OB.hasCls) { OB.grs = []; return obStep(3); } OB.redo = false; return obStep(5); }
  if (OB.edit) { OB.edit = false; return obStep(5); }
  OB.pts += 10; haptic();
  const p = document.getElementById('obr-pop'); if (p) { p.textContent = '+10' + (OB.n >= obQn() ? ' · كاملة! 🏆' : OB.n === 3 ? ' · ما ينوقف 🔥🔥' : OB.n === 2 ? ' · مولّع 🔥' : ''); p.classList.remove('go'); void p.offsetWidth; p.classList.add('go'); }
  try { FX.tick && FX.tick(); } catch(e){}
  setTimeout(() => obStep(OB.n >= obQn() ? 5 : OB.n + 1), 650);
}
ACTS['ob-pick'] = t => { const v = t.dataset.v, set = OB.n === 1 ? OB.st : OB.sj; set.has(v) ? set.delete(v) : set.add(v); haptic(); obStep(OB.n); };
ACTS['ob-next'] = () => obAns();
ACTS['ob-more'] = () => { OB.more = true; obStep(2); };
ACTS['ob-other'] = async () => { const v = await ask('اكتب اسم المادة', { title: 'مادة ثانية', input: '', placeholder: 'مثلاً: القرآن الكريم', ok: 'أضف', danger: false });
  const x = (v || '').trim().slice(0, 40); if (!x) return; OB.sj.add(x); obStep(2); };
ACTS['ob-back'] = () => { if (OB.n > 1) { OB.edit = false; OB.redo = false; obStep(OB.n - 1); } };
ACTS['ob-gr'] = t => { const g = obGrades()[+t.dataset.k]; if (!g) return; const i = OB.grs.findIndex(x => x.st === g.st && x.g === g.g); i >= 0 ? OB.grs.splice(i, 1) : OB.grs.push(g); haptic(); obStep(3); };
ACTS['ob-sec'] = t => { const v = t.dataset.v || ''; if (!v) return obAns(); OB.secs.has(v) ? OB.secs.delete(v) : OB.secs.add(v); haptic(); obStep(4); };
ACTS['ob-row'] = t => { const k = +t.dataset.q; OB.edit = k !== 1; OB.redo = k === 1; obStep(k); };
ACTS['ob-grx'] = t => { if (OB.grs.length <= 1) return toast('لازم صف واحد على الأقل'); OB.grs.splice(+t.dataset.k, 1); haptic(); obStep(5); };
ACTS['ob-more'] = () => { OB.more = true; obStep(5); };
ACTS['ob-dist'] = t => { const sc = document.getElementById('ob-school'); if (sc) OB.school = sc.value; OB.d = OB.d === t.dataset.v ? '' : t.dataset.v; obStep(5); };
document.addEventListener('input', e => { if (e.target.id === 'ob-school') OB.school = e.target.value; });
ACTS['ob-finish'] = async t => {
  if (!OB.st.size || !OB.sj.size || (!OB.hasCls && !OB.grs.length)) return toast('كمّل الإجابات أول');
  if (OB.demo) { OB.made = obClasses().map((c, i) => ({ name: c.name, code: 'DEMO1' + i })); OB.code = OB.made[0].code; OB.cname = OB.made[0].name; return obStep(6); }
  t.disabled = true; t.textContent = 'لحظة…';
  const p = { ob: 'done', prof_stage: [...OB.st].join('|'), prof_subject: [...OB.sj].join('|') };
  if (OB.school.trim()) p.school = OB.school.trim().slice(0, 80);
  if (OB.d) p.district = OB.d;
  try {
    await saveSettings(p);
    if (OB.hasCls) { document.getElementById('ob').remove(); toast('أهلاً فيك 👋'); return rerender(); }
    OB.made = [];
    for (const c of obClasses()) {
      const style = c.st === 'primary' ? 'kids' : c.st === 'university' ? 'uni' : 'mid';
      const { data, error } = await sb.from('classes').insert({ teacher_id: T.user.id, name: c.name, stage: c.st, style }).select().single();
      if (error) throw error;
      const code = await rpc('set_self_join', { p_class: data.id, p_on: true });
      OB.made.push({ name: c.name, code: typeof code === 'string' ? code : (data.join_code || '') });
    }
    OB.code = OB.made[0].code; OB.cname = OB.made[0].name; OB.hasCls = true;
    Object.keys(PCACHE).forEach(h => delete PCACHE[h]);
    obStep(6);
  } catch(e){ t.disabled = false; t.textContent = 'تمام، ادعُ طلابك 📲'; toast(errMsg(e)); }
};
ACTS['ob-close'] = () => { const el = document.getElementById('ob'); if (el) el.remove(); location.hash = '#/t/home'; rerender(); };
ACTS['ob-open'] = () => obStart();
ACTS['ob-demo'] = () => obStart(true);
ACTS['ob-cardx'] = async () => { await saveSettings({ obCard: 1 }); rerender(); };
/* ---- «تحدي جديد»: who → subject → how long → ready (one question per screen) ---- */
const NW = { step: 1, cls: [], multi: false, cu: null, subj: '', days: 7, made: null, poll: null, startOff: 0, koQ: 8 };
/* v153 prizes: optional text for 1st/2nd/3rd (competitions.prizes text[]); the app only shows it, the teacher hands it over */
const PZ_MD = ['🥇', '🥈', '🥉'], PZ_AR = ['الأول', 'الثاني', 'الثالث'];
const pzVal = a => a && a.some(Boolean) ? { prizes: a.map(x => x || '') } : {};
function pzRow(a, w){ const on = a && a.some(Boolean);
  return `<button type="button" class="ce1-row pz-row" data-act="pz-open" data-w="${w}"><span class="ce1-e">🎁</span><span class="grow"><b>${on ? 'الجائزة' : 'جائزة؟'}</b><small>${on ? esc(a.map((x, i) => x ? PZ_MD[i] + ' ' + x : '').filter(Boolean).join(' · ')) : 'اختياري، مثل قسيمة أو درع'}</small></span><span class="ce1-ch">←</span></button>`; }
function pzLine(a, cls){ if (!a || !a.some(Boolean)) return '';
  return `<div class="${cls}">${a.map((x, i) => x ? `<span>${PZ_MD[i]} جائزة ${PZ_AR[i]}: <b>${esc(x)}</b></span>` : '').join('')}</div>`; }
ACTS['pz-open'] = t => { const w = t.dataset.w, a = (w === 'nw' ? NW.prizes : CC.prizes) || [];
  modal(`<form class="aw-sheet pz-sh" data-form="pz-save" data-w="${w}"><h3>🎁 الجائزة</h3><p class="pz-n">اكتب الجائزة، وتطلع للطلاب فوق زر «العب». أنت تسلّمها بنفسك.</p>
    ${PZ_MD.map((m, i) => `<label class="pz-f"><span>${m}</span><input class="input" name="p${i}" maxlength="60" value="${esc(a[i] || '')}" placeholder="جائزة ${PZ_AR[i]}${i ? ' (اختياري)' : ''}"></label>`).join('')}
    <button class="btn" type="submit">حفظ</button>${a.some(Boolean) ? '<button type="button" class="link pz-del" data-act="pz-del" data-w="' + w + '">بدون جائزة</button>' : ''}</form>`); };
function pzSet(w, v){ if (w === 'nw') NW.prizes = v; else CC.prizes = v; closeModals();
  const el = document.querySelector(`.pz-row[data-w="${w}"]`); if (el) el.outerHTML = pzRow(v, w); }
ACTS['pz-save'] = f => { const v = [0, 1, 2].map(i => f['p' + i].value.replace(/\s+/g, ' ').trim()); pzSet(f.dataset.w, v.some(Boolean) ? v : null); };
ACTS['pz-del'] = t => pzSet(t.dataset.w, null);
const SUBJ_EMOJI = { 'الرياضيات': '📐', 'التربية الإسلامية': '🕌', 'اللغة العربية': '📖', 'العلوم': '🔬', 'اللغة الإنجليزية': '🔤', 'الاجتماعيات': '🗺️', 'الحاسوب': '💻', 'القرآن الكريم': '📗', 'الكيمياء': '⚗️', 'الفيزياء': '🧲', 'الأحياء': '🧬', 'الجيولوجيا': '🪨', 'المعلوماتية': '💻', 'الفرنسية': '🇫🇷', 'التاريخ': '🏛️', 'الجغرافيا': '🌍', 'علم النفس': '🧠', 'الفلسفة': '💭', 'الدستور': '⚖️' };
/* Kuwait subjects per stage (/mnt/project-files/curricula/kuwait-curricula.md) */
const OB_SUBJ = { 'ابتدائي': ['التربية الإسلامية', 'اللغة العربية', 'الرياضيات', 'العلوم', 'اللغة الإنجليزية', 'الاجتماعيات', 'الحاسوب'],
  'متوسط': ['التربية الإسلامية', 'اللغة العربية', 'الرياضيات', 'العلوم', 'اللغة الإنجليزية', 'الاجتماعيات', 'الحاسوب'],
  'ثانوي': ['التربية الإسلامية', 'القرآن الكريم', 'اللغة العربية', 'اللغة الإنجليزية', 'الرياضيات', 'الكيمياء', 'الفيزياء', 'الأحياء', 'الجيولوجيا', 'المعلوماتية', 'الفرنسية', 'التاريخ', 'الجغرافيا', 'علم النفس', 'الفلسفة', 'الدستور'],
  'جامعة': ['التربية الإسلامية', 'اللغة العربية', 'اللغة الإنجليزية', 'الرياضيات', 'العلوم', 'الحاسوب'] };
const obSubjList = () => { const out = []; (OB.st.size ? [...OB.st] : ['متوسط']).forEach(st => (OB_SUBJ[st] || []).forEach(x => { if (out.indexOf(x) < 0) out.push(x); })); [...OB.sj].forEach(x => { if (out.indexOf(x) < 0) out.push(x); }); return out; };
function nwGrade(c){ const n = (c && c.name) || ''; for (let i = GRADES.length - 1; i >= 0; i--) if (n.indexOf(GRADES[i]) >= 0) return i + 1; const m = n.match(/\d+/); return m ? Number(m[0]) : null; }
async function qCounts(){
  const or = 'owner_id.is.null,owner_id.eq.' + T.user.id;
  const [rg, r] = await Promise.all([sb.from('questions').select('qtype').or(or).eq('status', 'approved').in('qtype', ['general', 'quick', 'memory']).limit(10000),
    sb.from('questions').select('curriculum_id').or(or).eq('status', 'approved').not('curriculum_id', 'is', null).limit(10000)]);
  NW.gen = {}; (rg.data || []).forEach(q => { NW.gen[q.qtype] = (NW.gen[q.qtype] || 0) + 1; });
  NW.glob = {}; (r.data || []).forEach(q => { NW.glob[q.curriculum_id] = (NW.glob[q.curriculum_id] || 0) + 1; });
}
/* subjects a class can use: ready subjects for its stage/grade + the teacher's own; extra = ids to keep shown (already chosen) */
function subjList(c, extra){
  const g = nwGrade(c), glob = NW.glob || {};
  const mine = CU.list.filter(x => x.owner_id && x.owner_id === T.user.id && glob[x.id]);
  let cus = CU.list.filter(x => !x.owner_id && x.stage === (c.stage || 'primary') && glob[x.id]);
  if (g) { const exact = cus.filter(x => x.grade === g); if (exact.length) cus = exact; }
  /* v239 (Khalid): only the teacher's own subjects (profile), others behind «مادة ثانية؟» */
  let hid = 0; { const my = mySubjects(); if (my.length && !NW.allSubj) { const f = cus.filter(x => my.includes(x.subject) || (extra || []).includes(x.id)); hid = new Set(cus.map(x => x.subject)).size - new Set(f.map(x => x.subject)).size; if (f.length) cus = f; else hid = 0; } }
  const bySub = {}; cus.forEach(x => { (bySub[x.subject] = bySub[x.subject] || []).push(x); });
  const list = []; Object.keys(bySub).forEach(sb2 => { const xs = bySub[sb2]; (xs.length === 1 || g ? [xs[0]] : xs).forEach(x => list.push([x, xs.length === 1 || g ? (x.grade ? gradeAr(x) + ' · ' : '') + glob[x.id] + ' سؤال' : gradeAr(x)])); });
  mine.forEach(x => list.push([x, glob[x.id] + ' سؤال']));
  list.hid = hid;
  (extra || []).forEach(id => { if (!list.some(y => y[0].id === id)) { const x = CU.list.find(y => y.id === id); if (x) list.push([x, (glob[id] || 0) + ' سؤال']); } });
  return list;
}
function subjTiles(c, sel, act, extra, afterMine){
  const tile = (k, e, n, sm, off) => `<button type="button" class="nw-tile nw-mt${sel.includes(k) ? ' on' : ''}${off ? ' off' : ''}" data-act="${act}" data-k="${esc(k)}"${off ? ' disabled' : ''}><span class="nw-ck">${sel.includes(k) ? '✓' : ''}</span><span class="nw-e">${e}</span><b>${esc(n)}</b><small>${esc(sm)}</small></button>`;
  const gen = NW.gen || {};
  const sl = subjList(c, extra), mt = sl.map(([x, sm]) => tile(x.id, SUBJ_EMOJI[x.subject] || '📚', String(x.subject).replace(/^(اللغة|التربية) /, ''), sm)).join('');
  const gt = NW_GEN.map(o => tile(o[0], o[1], o[2], gen[o[0]] ? gen[o[0]] + ' سؤال' : 'قريباً', !gen[o[0]] && !sel.includes(o[0]))).join('');
  return (mt ? `<div class="nw-lbl">موادي</div><div class="nw-tiles">${mt}</div>${afterMine || ''}${sl.hid ? `<button type="button" class="link nw-link nw-more-subj" data-act="nw-allsubj">مادة ثانية؟</button>` : ''}` : '') + `<div class="nw-lbl">أسئلة عامة</div><div class="nw-tiles">${gt}</div>`;
}
async function tNew(fresh){
  if (fresh !== false && !NW.keep) Object.assign(NW, { step: 1, cls: [], multi: false, cu: null, subj: '', days: 7, made: null, lessons: null, les: {}, allSubj: false, diff: null, startOff: 0, koQ: 8, prizes: null, sel: null, cus: null, gtypes: null }); NW.keep = false;
  const [cl, cp] = await Promise.all([sb.from('classes').select('*').eq('archived', false).order('created_at'), sb.from('competitions').select('id,class_id').eq('status', 'active')]);
  if (cl.error) throw cl.error;
  NW.classes = cl.data; NW.busy = new Set((cp.data || []).map(c => c.class_id));
  await loadCurricula().catch(() => {});
  await qCounts();
  const free = NW.classes.filter(c => !NW.busy.has(c.id));
  if (NW.step === 1 && NW.classes.length === 1 && free.length === 1) { NW.cls = [free[0].id]; NW.step = 2; NW.skip1 = true; } else NW.skip1 = false;
  nwRender();
}
function nwRender(){
  clearInterval(NW.poll);
  const st = NW.step, dots = st < 4 ? `<div class="nw-dots">${[1, 2, 3].map(i => `<i class="${i <= st ? 'on' : ''}"></i>`).join('')}</div>` : '';
  let b = '';
  if (st === 1) {
    if (!NW.classes.length) b = `<h2 class="nw-q">اسم صفك؟</h2><form class="nw-col" data-form="nw-cls"><input class="nw-in" name="n" maxlength="40" placeholder="مثال: رابع أ" autocomplete="off" required>
      ${(() => { const o = stOpts(STAGES); return o.length > 1 ? `<div class="nw-stg">${o.map((x, i) => `<label><input type="radio" name="st" value="${x[0]}" ${i ? '' : 'checked'}><span>${x[1]}</span></label>`).join('')}</div>` : `<input type="hidden" name="st" value="${o[0][0]}">`; })()}<button class="btn nw-go" type="submit">التالي</button></form>`;
    else b = `<h2 class="nw-q">لمين التحدي؟</h2><div class="nw-tiles">${NW.classes.map(c => { const busy = NW.busy.has(c.id), on = NW.cls.includes(c.id); return `<button class="nw-tile${on ? ' on' : ''}${busy ? ' busy' : ''}" data-act="nw-cls-pick" data-id="${c.id}"><span class="nw-e">👥</span><b>${esc(c.name)}</b><small>${busy ? 'عنده تحدي الحين' : STAGE_AR[c.stage] || ''}</small></button>`; }).join('')}</div>
      ${NW.multi ? `<button class="btn nw-go" data-act="nw-next" ${NW.cls.length ? '' : 'disabled'}>التالي (${NW.cls.length})</button>` : NW.classes.length > 1 ? `<button class="link nw-link" data-act="nw-multi">أكثر من صف؟</button>` : ''}`;
  }
  if (st === 2) {
    /* v161: pick one or more: the teacher's subjects + general categories (Khalid) */
    const c = NW.classes.find(x => x.id === NW.cls[0]) || {}, sel = NW.sel || (NW.sel = []);
    const names = sel.map(nwName).filter(Boolean);
    b = `<h2 class="nw-q">عن أي مادة؟</h2><p class="nw-note">اختر وحدة أو أكثر</p>
      ${subjTiles(c, sel, 'nw-subj', undefined, nwLesRow(sel))}
      <p class="nw-note">${names.length > 1 ? 'الأسئلة تجي خليط من: ' + esc(names.join('، ')) : ''}</p><div class="nw-sp"></div>
      <button class="btn nw-go" data-act="nw-subj-next" ${sel.length ? '' : 'disabled'}>التالي${sel.length ? ' (' + sel.length + ')' : ''}</button>`;
  }
  if (st === 3) {
    const end = addDays(todayKW(), NW.days - 1);
    b = `<h2 class="nw-q">كم يوم؟</h2><div class="nw-days">${[[7, 'أسبوع'], [14, 'أسبوعين'], [30, 'شهر']].map(d => `<button class="${NW.days === d[0] ? 'on' : ''}" data-act="nw-days" data-d="${d[0]}">${d[1]}</button>`).join('')}</div>
      <p class="nw-note">${esc(nwSpanTxt())}</p>
      <div class="nw-grp">
        <button type="button" class="ce1-row" data-act="nw-opt" data-k="start"><span class="ce1-e">📅</span><span class="grow"><b>يبدأ</b></span><em class="nw-v">${esc(nwStartTxt())}</em><span class="ce1-ch">←</span></button>
        <button type="button" class="ce1-row" data-act="nw-opt" data-k="diff"><span class="ce1-e">🎚️</span><span class="grow"><b>الصعوبة</b></span><em class="nw-v">${esc(nwDiffTxt())}</em><span class="ce1-ch">←</span></button>
        <button type="button" class="ce1-row" data-act="nw-ko"><span class="ce1-e">⚔️</span><span class="grow"><b>مواجهة في النهاية</b><small>${NW.koQ ? 'يتأهل ' + NW.koQ + ' · آخر ' + Math.ceil(Math.log2(NW.koQ)) + ' أيام' : 'الأوائل يتنافسون وجهاً لوجه'}</small></span><span class="ios-sw ${NW.koQ ? 'on' : ''}"><i></i></span></button>
        ${pzRow(NW.prizes, 'nw')}
      </div><div class="nw-sp"></div><button class="btn nw-go" data-act="nw-start">ابدأ التحدي 🚀</button>`;
  }
  if (st === 4) {
    const m = NW.made || [];
    b = `<h2 class="nw-q">جاهز! 🎉</h2>${m.map(x => `<div class="nw-ready"><small>${m.length > 1 ? esc(x.c.name) + ' · ' : ''}الطلاب يدخلون بهذا الرمز</small><div class="nw-code" dir="ltr">${esc(fmtCode(x.code))}</div><div class="nw-qr" data-link="${esc(joinLink(x.code))}"></div></div>`).join('')}
      <button class="btn nw-go nw-wa" data-act="nw-wa">أرسل للطلاب في واتساب</button><button class="link nw-link" data-act="nw-show">اعرض على الشاشة ‹</button>
      <div class="nw-live" id="nw-live"></div><a class="link nw-link" href="#/t/home">تم ‹</a>`;
  }
  const canBack = st > 1 && st < 4 && !(st === 2 && NW.skip1);
  view('تحدي جديد', `<div class="nw">${dots}${b}</div>`, 'new', '', canBack ? 'act:nw-back' : '');
  if (st === 4) { nwQr(); nwLive(); NW.poll = setInterval(() => { if (location.hash.indexOf('#/t/new') !== 0 || NW.step !== 4) return clearInterval(NW.poll); nwLive(); }, 5000); }
}
const fmtCode = c => String(c || '').replace(/^(...)(...)$/, '$1 $2');
async function nwQr(){ try { await loadJs(QRJS, 'qrcode'); document.querySelectorAll('.nw-qr').forEach(el => { el.innerHTML = qrSvg(el.dataset.link); }); } catch(e){} }
async function nwLive(){
  const el = document.getElementById('nw-live'); if (!el || !NW.made) return;
  const r = await sb.from('students').select('name,created_at,class_id').in('class_id', NW.made.map(x => x.c.id)).gte('created_at', NW.t0).order('created_at', { ascending: false }).limit(60);
  const xs = r.data || [];
  el.innerHTML = `<div class="nw-lh"><b>دخلوا الحين</b><em>${xs.length}</em></div>${xs.length ? xs.map(x => `<div class="nw-lr">${esc(x.name)}<span>جديد</span></div>`).join('') : '<div class="nw-lr nw-wait">ننتظر أول طالب… تتحدث القائمة لحالها</div>'}`;
}
ACTS['nw-back'] = () => { if (NW.step > 1 && !(NW.step === 2 && NW.skip1)) { NW.step--; nwRender(); } else go('#/t/home'); };
ACTS['nw-cls-pick'] = t => { const id = t.dataset.id;
  if (NW.busy.has(id) && !NW.multi) toast('هذا الصف عنده تحدي، الجديد بيحل مكانه');
  if (NW.multi) { NW.cls = NW.cls.includes(id) ? NW.cls.filter(x => x !== id) : NW.cls.concat(id); return nwRender(); }
  NW.cls = [id]; NW.step = 2; nwRender(); };
ACTS['nw-multi'] = () => { NW.multi = true; NW.cls = []; nwRender(); };
ACTS['nw-next'] = () => { if (NW.cls.length) { NW.step = 2; nwRender(); } };
const NW_GEN = [['general', '🌍', 'ثقافة عامة'], ['quick', '⚡', 'سرعة بديهة'], ['memory', '🧠', 'ذاكرة']];
function nwName(k){ const o = NW_GEN.find(x => x[0] === k); if (o) return o[2]; const cu = CU.list.find(x => x.id === k); return cu ? String(cu.subject).replace(/^(اللغة|التربية) /, '') : ''; }
ACTS['nw-subj'] = t => { const k = t.dataset.k, sel = NW.sel || (NW.sel = []); NW.sel = sel.includes(k) ? sel.filter(x => x !== k) : sel.concat(k); nwRender(); };
ACTS['nw-subj-next'] = () => { const sel = NW.sel || []; if (!sel.length) return;
  const cus = sel.filter(k => !NW_GEN.some(o => o[0] === k));
  NW.cus = cus; NW.cu = cus[0] || null; NW.gtypes = sel.filter(k => NW_GEN.some(o => o[0] === k));
  NW.subj = sel.length === 1 ? nwName(sel[0]) : sel.length === 2 ? sel.map(nwName).join(' و') : 'منوعة'; NW.step = 3; nwRender(); };
/* v233 (Khalid): pick lessons (one subject) + start / difficulty / knockout rows on the last step */
function nwLesCus(sel){ return (sel || []).filter(k => !NW_GEN.some(o => o[0] === k)); }
/* chosen lessons per subject: null = all */
function nwLesGet(cu){ const ls = (CFL[cu] || []).map(x => x[0]); NW.les = NW.les || {};
  if (cu in NW.les) return NW.les[cu];
  if (NW.lessons && NW.lessons.length) { const f = ls.filter(l => NW.lessons.includes(l)); return f.length && f.length < ls.length ? f : null; }
  return null; }
function nwLesRow(sel){ const cus = nwLesCus(sel); if (!cus.length) return '';
  const miss = cus.filter(cu => !CFL[cu]); if (miss.length) { Promise.all(miss.map(nwLesLoad)).then(() => { if (NW.step === 2 && location.hash.indexOf('#/t/new') === 0) nwRender(); }); return ''; }
  const rows = cus.filter(cu => CFL[cu].length).map(cu => { const n = (nwLesGet(cu) || []).length, tot = CFL[cu].length;
    return `<button type="button" class="ce1-row" data-act="nw-les" data-cu="${cu}"><span class="ce1-e">📚</span><span class="grow"><b>${cus.length > 1 ? 'دروس ' + esc(nwName(cu)) : 'الدروس'}</b></span><em class="nw-v">${n ? n + ' من ' + tot : 'كلها (' + tot + ')'}</em><span class="ce1-ch">←</span></button>`; }).join('');
  return rows ? `<div class="nw-grp">${rows}</div>` : ''; }
async function nwLesLoad(cu){ if (CFL[cu]) return;
  const r = await sb.from('questions').select('lesson').eq('curriculum_id', cu).eq('status', 'approved').not('lesson', 'is', null).order('created_at').limit(5000);
  const cnt = {}, order = []; (r.data || []).forEach(q => { if (!cnt[q.lesson]) order.push(q.lesson); cnt[q.lesson] = (cnt[q.lesson] || 0) + 1; }); CFL[cu] = order.map(l => [l, cnt[l]]); }
const nwLesOn = cu => new Set(nwLesGet(cu) || (CFL[cu] || []).map(x => x[0]));
function nwLesSheet(cu){ const ls = CFL[cu] || [], on = nwLesOn(cu), all = on.size === ls.length;
  return `<div class="aw-sheet nw-ls"><div class="nw-ls-h"><h3>أي دروس شرحت${(NW.sel || []).filter(k => !NW_GEN.some(o => o[0] === k)).length > 1 ? ' في ' + esc(nwName(cu)) : ''}؟</h3><button type="button" class="nw-ls-all" data-act="nw-les-all" data-cu="${cu}">${all ? 'إلغاء الكل' : 'الكل'}</button></div>
    <p class="sub">ضغطة طويلة على درس = من الأول لين هذا الدرس</p>
    <div class="nw-ls-list">${ls.map(([l], i) => `<button type="button" class="nw-ls-r${on.has(l) ? ' on' : ''}" data-act="nw-les-t" data-cu="${cu}" data-i="${i}"><span class="nw-ls-c">${ic('check')}</span><span class="grow">${esc(l)}</span><small>${i + 1}</small></button>`).join('')}</div>
    <button class="btn" data-act="nw-les-done" ${on.size ? '' : 'disabled'}>تم</button></div>`; }
function nwLesSet(cu, set){ const ls = CFL[cu] || []; NW.les = NW.les || {}; NW.les[cu] = set.size === ls.length ? null : ls.map(x => x[0]).filter(l => set.has(l));
  const m = document.querySelector('.nw-ls'); if (m) { /* v244: update in place so the sheet doesn't jump to the top */
    const on = nwLesOn(cu); m.querySelectorAll('.nw-ls-r').forEach(r => { const x = ls[Number(r.dataset.i)]; r.classList.toggle('on', !!x && on.has(x[0])); });
    const a = m.querySelector('.nw-ls-all'); if (a) a.textContent = on.size === ls.length ? 'إلغاء الكل' : 'الكل';
    const d = m.querySelector('[data-act="nw-les-done"]'); if (d) d.disabled = !on.size; }
  const v = document.querySelector('[data-act="nw-les"][data-cu="' + cu + '"] .nw-v'), n = NW.les[cu] ? NW.les[cu].length : 0; if (v) v.textContent = n ? n + ' من ' + ls.length : 'كلها (' + ls.length + ')'; }
/* lessons saved on the challenge: null if every chosen subject is «all», else the union (all lessons for untouched subjects) */
function nwLesSave(cus){ const parts = cus.map(cu => nwLesGet(cu)); if (!parts.some(Boolean)) return null;
  return [...new Set(cus.flatMap((cu, i) => parts[i] || (CFL[cu] || []).map(x => x[0])))]; }
ACTS['nw-les'] = t => modal(nwLesSheet(t.dataset.cu));
ACTS['nw-les-all'] = t => { const cu = t.dataset.cu, ls = CFL[cu] || [], on = nwLesOn(cu); nwLesSet(cu, on.size === ls.length ? new Set() : new Set(ls.map(x => x[0]))); };
ACTS['nw-les-t'] = t => { if (NW.lpLong) { NW.lpLong = false; return; } const cu = t.dataset.cu, l = (CFL[cu] || [])[Number(t.dataset.i)]; if (!l) return; const on = nwLesOn(cu); on.has(l[0]) ? on.delete(l[0]) : on.add(l[0]); nwLesSet(cu, on); };
ACTS['nw-les-done'] = () => { closeModals(); nwRender(); };
(function(){ let tm = null;
  document.addEventListener('pointerdown', e => { const r = e.target.closest && e.target.closest('.nw-ls-r'); if (!r) return; NW.lpLong = false; clearTimeout(tm);
    tm = setTimeout(() => { NW.lpLong = true; const cu = r.dataset.cu, k = Number(r.dataset.i); nwLesSet(cu, new Set((CFL[cu] || []).slice(0, k + 1).map(x => x[0]))); haptic(); }, 450); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => document.addEventListener(ev, () => clearTimeout(tm)));
  document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.nw-ls-r')) e.preventDefault(); });
})();
function nwStart(){ const d = todayKW(); if (NW.startOff === 7) { const w = new Date(d + 'T12:00:00').getDay(); return addDays(d, (7 - w) % 7 || 7); } return addDays(d, NW.startOff || 0); }
const nwStartTxt = () => NW.startOff === 7 ? 'الأحد الجاي' : NW.startOff === 1 ? 'بكرة' : 'اليوم';
const nwDiffTxt = () => { const k = NW.diff || (T.settings || {}).difficulty || 'normal', d = DIFF.find(x => x[0] === k); return d ? (k === 'adaptive' ? 'حسب الطالب' : d[1]) : 'متوسط'; };
function nwSpanTxt(){ const st = nwStart(), sp = cfSpan(st, NW.days, NW.koQ, 24);
  return 'من ' + fmtDay(st) + ' إلى ' + fmtDay(sp.end_date) + (NW.koQ ? ' · آخر ' + Math.ceil(Math.log2(NW.koQ)) + ' أيام مواجهات' : ''); }
ACTS['nw-opt'] = t => { const k = t.dataset.k;
  if (k === 'start') return modal(`<div class="aw-sheet"><h3>يبدأ</h3>${[[0, 'اليوم'], [1, 'بكرة'], [7, 'الأحد الجاي', 'بداية الأسبوع الدراسي']].map(o => cf3Opt('nw-set', 'start:' + o[0], (NW.startOff || 0) === o[0], o[1], o[2])).join('')}</div>`);
  if (k === 'diff') { const cur = NW.diff || (T.settings || {}).difficulty || 'normal';
    return modal(`<div class="aw-sheet"><h3>الصعوبة</h3>${DIFF.slice().sort((a, b) => (b[0] === 'adaptive') - (a[0] === 'adaptive')).map(d => cf3Opt('nw-set', 'diff:' + d[0], cur === d[0], d[0] === 'adaptive' ? 'حسب الطالب' : d[1], d[2])).join('')}</div>`); }
  if (k === 'ko') return modal(`<div class="aw-sheet"><h3>كم يتأهل للمواجهة؟</h3><p class="sub">من كل صف، حسب ترتيب النقاط.</p>${[[4, 'دوران · يومان'], [8, '3 أدوار · 3 أيام'], [16, '4 أدوار · 4 أيام']].map(o => cf3Opt('nw-set', 'ko:' + o[0], NW.koQ === o[0], o[0] + ' طلاب', o[1])).join('')}</div>`);
};
ACTS['nw-set'] = t => { const [k, v] = t.dataset.v.split(':');
  if (k === 'start') NW.startOff = Number(v); else if (k === 'diff') NW.diff = v; else if (k === 'ko') NW.koQ = Number(v);
  closeModals(); nwRender(); };
ACTS['nw-ko'] = () => { if (NW.koQ) { NW.koQ = 0; nwRender(); } else ACTS['nw-opt']({ dataset: { k: 'ko' } }); };
ACTS['nw-allsubj'] = () => { NW.allSubj = true; const el = document.getElementById('ce-subj'); if (el) { el.innerHTML = ceTiles(); return; } nwRender(); };
ACTS['nw-days'] = t => { NW.days = Number(t.dataset.d); nwRender(); };
ACTS['nw-cls'] = async f => {
  const name = f.n.value.replace(/\s+/g, ' ').trim(), stg = (f.querySelector('[name=st]:checked') || f.querySelector('[name=st]') || {}).value || defStage(f.n.value);
  if (name.length < 2) return toast('اكتب اسم الصف');
  const style = stg === 'primary' ? 'kids' : stg === 'university' ? 'uni' : 'mid';
  const { data, error } = await sb.from('classes').insert({ teacher_id: T.user.id, name, stage: stg, style }).select().single();
  if (error) return toast(errMsg(error));
  learnStage(stg); NW.classes = [data]; NW.cls = [data.id]; NW.step = 2; NW.skip1 = false; nwRender();
};
ACTS['nw-start'] = async t => {
  if (NW.saving) return; NW.saving = true; t.setAttribute('aria-busy', 'true'); t.textContent = 'لحظة…';
  try {
    const today = nwStart(), sp = cfSpan(today, NW.days, NW.koQ, 24), gid = crypto.randomUUID();
    const cs = NW.classes.filter(c => NW.cls.includes(c.id));
    const title = cs.length === 1 ? `تحدي ${cs[0].name} · ${NW.subj}` : `تحدي ${NW.subj}`;
    if (!SG('prof_subject') && NW.cu && SUBJECTS.includes(NW.subj)) saveSettings({ prof_subject: NW.subj }).catch(() => {});
    // questions: the chosen subject's ready questions go into «أسئلتي» so the challenge can use them
    {
      let qq = sb.from('questions').select('id').is('owner_id', null).eq('status', 'approved').limit(5000);
      const cus = NW.cus || (NW.cu ? [NW.cu] : []), gts = NW.gtypes || (NW.cu ? [] : ['general', 'quick']);
      const ors = (cus.length ? ['curriculum_id.in.(' + cus.join(',') + ')'] : []).concat(gts.length ? ['qtype.in.(' + gts.join(',') + ')'] : []);
      qq = qq.or(ors.join(',') || 'qtype.in.(general,quick)');
      const [all, mine] = await Promise.all([qq, sb.from('question_picks').select('question_id').limit(20000)]);
      const have = new Set((mine.data || []).map(x => x.question_id)), todo = (all.data || []).map(x => x.id).filter(id => !have.has(id));
      for (let i = 0; i < todo.length; i += 500) { const r = await sb.from('question_picks').insert(todo.slice(i, i + 500).map(id => ({ question_id: id }))); if (r.error) throw r.error; }
      if (QS.pick) todo.forEach(id => QS.pick.add(id));
    }
    const busy = cs.filter(c => NW.busy.has(c.id)).map(c => c.id);
    if (busy.length) { const r = await sb.from('competitions').update({ status: 'finished' }).in('class_id', busy).eq('status', 'active'); if (r.error) throw r.error; }
    const cus2 = NW.cus || (NW.cu ? [NW.cu] : []), gts2 = NW.gtypes || (NW.cu ? ['general', 'quick'] : ['general', 'quick']);
    const qtypes = (cus2.length ? ['curriculum'] : []).concat(gts2.length ? gts2 : cus2.length ? [] : ['general', 'quick']);
    const multi = cus2.length > 1 ? { curricula: cus2 } : {};
    const r = await sb.from('competitions').insert(cs.map(c => Object.assign({ class_id: c.id, group_id: gid, title, start_date: today, points_end_date: sp.points_end_date, end_date: sp.end_date,
      group_size: 6, qualifiers: NW.koQ || 8, round_window_hours: 24, curriculum_id: NW.cu, difficulty: NW.diff || (T.settings || {}).difficulty || 'normal', qtypes, lessons: nwLesSave(cus2) }, multi, pzVal(NW.prizes))));
    if (r.error) throw r.error;
    NW.made = [];
    for (const c of cs) { let code = c.join_code; if (!c.self_join || !code) code = await rpc('set_self_join', { p_class: c.id, p_on: true }); NW.made.push({ c, code }); }
    NW.t0 = new Date(Date.now() - 60000).toISOString(); NW.step = 4; Object.keys(PCACHE).forEach(h => { if (h === '#/t/home' || h === '#/t/comps') delete PCACHE[h]; });
    nwRender();
  } catch(e){ toast(errMsg(e)); t.removeAttribute('aria-busy'); t.textContent = 'ابدأ التحدي 🚀'; }
  NW.saving = false;
};
ACTS['nw-wa'] = () => { const m = NW.made || []; const txt = `يلا نلعب «اهزم الدقيقة» ⏱️\n${m.map(x => `${m.length > 1 ? x.c.name + ': ' : ''}الرمز ${fmtCode(x.code)}\n${joinLink(x.code)}`).join('\n')}`; open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank'); };
ACTS['nw-show'] = async () => { const x = (NW.made || [])[0]; if (!x) return; let qr = ''; try { await loadJs(QRJS, 'qrcode'); qr = qrSvg(joinLink(x.code)); } catch(e){}
  const w = document.createElement('div'); w.className = 'joinshow'; w.innerHTML = `<button class="joinshow-x" aria-label="إغلاق">${ic('x')}</button><b>${esc(x.c.name)}</b><span>ادخل التطبيق واكتب الرمز</span><div class="nw-code nw-code-xl" dir="ltr">${esc(fmtCode(x.code))}</div>${qr ? `<div class="joinshow-qr">${qr}</div>` : ''}`;
  w.querySelector('.joinshow-x').onclick = () => w.remove(); document.body.appendChild(w); };
function tJoin(){
  view('انضم', `<form class="tj" data-form="t-join"><div class="tj-em">🎯</div><h2>عندك رمز؟</h2><input class="tj-in" name="code" maxlength="8" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC123" dir="ltr" aria-label="رمز الصف"><button class="btn tj-go" type="submit">ادخل</button><p class="sub">ادخل كطالب برمز الصف، مثلاً عشان تجرّب التحدي بعين طلابك.</p></form>`, 'join');
}
ACTS['t-join'] = f => { const v = normCode(f.code.value); if (v.length < 4) return toast('اكتب الرمز كامل'); location.hash = '#/j/' + encodeURIComponent(v); };
ACTS['h-retry'] = t => { t.setAttribute('aria-busy', 'true'); t.textContent = 'جارٍ التحميل…'; tHome().catch(e => { toast('ما زال التحميل متعذّراً. تأكد من الاتصال'); t.removeAttribute('aria-busy'); t.textContent = 'إعادة المحاولة'; }); };
ACTS['h-res-idle'] = t => { RS.sort = 'idle'; RS.q = ''; location.hash = '#/t/results/' + t.dataset.c; };

/* ---- quick-start wizard ---- */
const STAGES = [['primary', 'ابتدائي', 'الصفوف 1–5', 'kids', 'star'], ['middle', 'متوسط', 'الصفوف 6–9', 'mid', 'layers'], ['secondary', 'ثانوي', 'الصفوف 10–12', 'mid', 'chart'], ['university', 'جامعة', 'طلبة الجامعة', 'uni', 'trophy']];
const QTYPES = [['curriculum', 'المنهج', 'أسئلة من مادتك', 'layers'], ['general', 'معلومات عامة', 'ثقافة ومعرفة', 'help'], ['quick', 'سرعة بديهة', 'حساب وألغاز', 'clock'], ['memory', 'الذاكرة', 'تذكّر وترتيب', 'star']];
const SUBJECTS = ['عام', 'اللغة العربية', 'الرياضيات', 'العلوم', 'التربية الإسلامية', 'اللغة الإنجليزية', 'الاجتماعيات', 'الحاسوب', 'أخرى'];
const METHODS = [['manual', 'إضافة يدوية', 'اكتب اسم الصف وأسماء الطلبة', 'edit'], ['file', 'رفع ملف Excel', 'عدة صفوف دفعة واحدة', 'upload'], ['self', 'يسجّل الطلبة عبر الرابط', 'رابط يسجل به الطلبة بأنفسهم', 'user']];
const W = { step: 0, stage: null, qtypes: ['curriculum', 'general', 'quick'], subject: 'عام', method: null, cname: '', names: '', self: '', multi: null, compNow: true, start: '' };
const WSTEPS = ['الصف والطلبة', 'المراجعة'];
function wSave(){
  const g = id => document.getElementById(id);
  if (g('w-cname')) W.cname = g('w-cname').value.trim();
  if (g('w-names')) W.names = g('w-names').value;
  if (g('w-self')) W.self = g('w-self').value;
  if (g('w-sub')) W.subject = g('w-sub').value;
  if (g('w-start')) W.start = g('w-start').value;
}
function renderWizard(){
  /* two steps: (1) stage + class + how students join, (2) editable summary: class, competition date, question source */
  if (W.step > 2) W.step = 2;
  const s = W.step;
  const prog = `<div class="w-prog">${WSTEPS.map((n, i) => `<div class="w-st ${i + 1 < s ? 'done' : i + 1 === s ? 'cur' : ''}"><span>${i + 1 < s ? '✓' : i + 1}</span><small>${n}</small></div>`).join('')}</div>`;
  let body = '', ok = true;
  if (s === 1) {
    let how = '';
    if (W.method === 'manual') {
      how = `<div class="field"><label for="w-cname">اسم الصف</label><input class="input" id="w-cname" value="${esc(W.cname)}" placeholder="مثال: السادس / أ"></div>
        <div class="field"><label for="w-names">أسماء الطلبة <small class="muted">اسم في كل سطر، ويمكن إضافة الرقم بعد فاصلة. يمكنك تركها فارغة الآن.</small></label><textarea class="input" id="w-names" rows="6" placeholder="سارة العتيبي، 1001&#10;ليان الزامل، 1002">${esc(W.names)}</textarea></div>`;
    } else if (W.method === 'file') {
      const g = W.multi;
      how = `<p class="sub">ملف واحد بثلاثة أعمدة: الاسم، رقم الطالب، الصف.</p>
        <div class="row"><button class="btn" data-act="w-file">${ic('upload')} ${g ? 'اختيار ملف آخر' : 'اختيار الملف'}</button><button class="btn soft" data-act="t-multi-sample">${ic('download')} نموذج</button></div><input type="file" id="wxl" accept=".xlsx,.xls,.csv" class="hide" data-change="w-file-chosen">` +
        (g ? `<div class="card"><b>سيُضاف ${Object.values(g).reduce((a, x) => a + x.length, 0)} طالب/ـة في ${Object.keys(g).length} صف</b>${Object.keys(g).map(k => `<div class="row between dash-link"><span>${esc(k)}</span><span class="sub">${g[k].length}</span></div>`).join('')}</div>` : '');
    } else if (W.method === 'self') {
      how = `<div class="field"><label for="w-self">أسماء الصفوف <small class="muted">صف في كل سطر. نعطيك رابطاً لكل صف يسجّل منه الطلبة أسماءهم ويحصلون على رموزهم.</small></label><textarea class="input" id="w-self" rows="4" placeholder="السادس / أ&#10;السادس / ب">${esc(W.self)}</textarea></div>`;
    }
    body = `<h2 class="w-h">الصف والطلبة</h2>
      <div class="field"><label>المرحلة الدراسية</label><div class="picks picks2">${STAGES.map(x => `<button class="pick ${W.stage === x[0] ? 'on' : ''}" data-act="w-stage" data-v="${x[0]}"><span class="pick-ic">${ic(x[4])}</span><b>${x[1]}</b><small>${x[2]}</small></button>`).join('')}</div></div>
      <div class="field"><label>طريقة إضافة الطلبة</label><div class="picks">${METHODS.map(x => `<button class="pick wide ${W.method === x[0] ? 'on' : ''}" data-act="w-method" data-v="${x[0]}"><span class="pick-ic">${ic(x[3])}</span><div><b>${x[1]}</b><small>${x[2]}</small></div></button>`).join('')}</div></div>
      ${how}`;
    ok = !!W.stage && !!W.method && (W.method !== 'file' || !!W.multi);
  } else {
    if (!W.start) W.start = todayKW();
    const pe = addDays(W.start, 4), end = addDays(pe, 3), stg = STAGES.find(x => x[0] === W.stage);
    const clsTxt = W.method === 'manual' ? `${esc(W.cname)}${W.names.trim() ? ' · ' + W.names.split('\n').filter(x => x.trim()).length + ' طالب/ـة' : ' · بدون طلبة الآن'}` :
      W.method === 'file' ? `${Object.keys(W.multi || {}).length} صف · ${Object.values(W.multi || {}).reduce((a, x) => a + x.length, 0)} طالب/ـة من الملف` :
      `${W.self.split('\n').filter(x => x.trim()).length} صف · يسجّل الطلبة عبر الرابط`;
    body = `<h2 class="w-h">راجع قبل الإنشاء</h2>
      <div class="set-grp">
        <button class="set-row" data-act="w-prev"><span class="grow rl-txt"><b>الصف</b><small>${stg ? stg[1] + ' · ' : ''}${clsTxt}</small></span><span class="link">تعديل</span></button>
      </div>
      <div class="field"><label>المسابقة</label><div class="tabs"><button type="button" class="${W.compNow ? 'on' : ''}" data-act="w-comp" data-v="1">أنشئها الآن</button><button type="button" class="${!W.compNow ? 'on' : ''}" data-act="w-comp" data-v="0">لاحقاً</button></div></div>
      ${W.compNow ? `<div class="card col"><div class="field"><label for="w-start">موعد بداية المسابقة</label><input class="input" type="date" id="w-start" value="${W.start}" data-change="w-start"></div>
        <div class="row between"><span class="sub">جمع النقاط</span><b>${esc(fmtDate(W.start))} ← ${esc(fmtDate(pe))}</b></div>
        <div class="row between"><span class="sub">التصفيات حتى</span><b>${esc(fmtDate(end))}</b></div>
        <p class="sub">جولة رسمية يومياً: 4 أسئلة × 15 ثانية. يتأهل 8 للتصفيات. تقدر تعدّلها لاحقاً من المسابقات.</p></div>` : ''}
      <div class="field"><label>مصدر الأسئلة</label><div class="lv-chips w-chips">${QTYPES.map(x => `<button type="button" class="${W.qtypes.includes(x[0]) ? 'on' : ''}" data-act="w-qtype" data-v="${x[0]}" aria-pressed="${W.qtypes.includes(x[0])}">${x[1]}</button>`).join('')}</div></div>
      ${W.qtypes.includes('curriculum') ? `<div class="field"><label for="w-sub">المادة</label><select class="input" id="w-sub">${SUBJECTS.map(x => `<option ${W.subject === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>` : ''}`;
    ok = W.qtypes.length > 0;
  }
  const nav = `<div class="row w-nav">${s > 1 ? `<button class="btn soft" data-act="w-prev">رجوع</button>` : ''}<button class="btn" data-act="${s === 2 ? 'w-finish' : 'w-next'}" ${ok ? '' : 'disabled'}>${s === 2 ? (W.compNow && W.start > todayKW() ? 'إنشاء وجدولة المسابقة' : 'إنشاء') : 'التالي'}</button></div>`;
  view('إعداد سريع', `<div class="card w-card">${prog}<div class="col">${body}</div></div>${nav}`, 'home');
}
ACTS['w-stage'] = t => { wSave(); W.stage = t.dataset.v; renderWizard(); };
ACTS['w-qtype'] = t => { wSave(); const k = t.dataset.v; W.qtypes = W.qtypes.includes(k) ? W.qtypes.filter(x => x !== k) : W.qtypes.concat(k); renderWizard(); };
ACTS['w-method'] = t => { wSave(); W.method = t.dataset.v; renderWizard(); };
ACTS['w-comp'] = t => { wSave(); W.compNow = t.dataset.v === '1'; renderWizard(); };
ACTS['w-start'] = () => { wSave(); renderWizard(); };
ACTS['w-prev'] = () => { wSave(); W.step = 1; renderWizard(); };
ACTS['w-next'] = () => {
  wSave();
  if (W.method === 'manual' && !W.cname) return toast('اكتب اسم الصف');
  if (W.method === 'self' && !W.self.trim()) return toast('اكتب اسم صف واحد على الأقل');
  W.step = 2; renderWizard();
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
  /* resumable: a retry after a partial failure continues from what was already saved (no duplicate classes / students / competitions) */
  const P = W.prog = W.prog || { gid: crypto.randomUUID(), by: {} };
  const made = []; let added = 0; const gid = P.gid;
  try {
    for (const p of plan) {
      const g = P.by[p.name] = P.by[p.name] || { c: null, batches: 0, added: 0, self: false, comp: false };
      if (!g.c) { const r = await sb.from('classes').insert(Object.assign({ name: p.name }, base)).select().single(); if (r.error) throw r.error; g.c = r.data; }
      const c = g.c;
      for (let i = g.batches * 150; i < p.rows.length; i += 150) { const x = await rpc('add_students', { p_class: c.id, p_rows: p.rows.slice(i, i + 150) }); g.added += x.added.length; g.batches++; }
      added += g.added;
      if (p.self && !g.self) { c.join_code = await rpc('set_self_join', { p_class: c.id, p_on: true }); g.self = true; }
      if (W.compNow && !g.comp) {
        const pe = addDays(W.start, 4);
        const k = await sb.from('competitions').insert({ class_id: c.id, group_id: gid, qtypes: W.qtypes, difficulty: (T.settings || {}).difficulty || 'normal', title: 'مسابقة اهزم الدقيقة', start_date: W.start, points_end_date: pe, end_date: addDays(pe, 3), group_size: 6, qualifiers: 8, round_window_hours: 24 });
        if (k.error) throw k.error;
        g.comp = true;
      }
      made.push(c);
    }
  } catch(e){
    const vals = Object.values(P.by), nc = vals.filter(g => g.c).length, ns = vals.reduce((a, g) => a + g.added, 0);
    await ask((nc || ns ? `حُفظ حتى الآن: ${nc} صف${ns ? ' و' + ns + ' طالب/ـة' : ''}. ` : 'لم يُحفظ شيء بعد. ') + 'اضغط «إكمال الإنشاء» لإكمال الباقي دون تكرار ما حُفظ.\n\nالسبب: ' + errMsg(e), { title: 'لم يكتمل الإعداد', alert: true, ok: 'حسناً', danger: false });
    t.disabled = false; t.textContent = 'إكمال الإنشاء'; return;
  }
  W.prog = null;
  const links = made.filter(c => c.join_code);
  view('تم الإعداد 🎉', `<div class="card col center"><div class="medal" style="width:96px;height:96px">${ic('check')}</div><b style="font-size:20px">جاهز!</b><p class="sub">أُنشئ ${made.length} صف${added ? ' وأُضيف ' + added + ' طالب/ـة' : ''}${W.compNow ? '، والمسابقة تبدأ ' + esc(fmtDate(W.start)) : ''}.</p></div>` +
    (links.length ? `<div class="card col"><b>روابط التسجيل</b>${links.map(c => `<div class="col" style="gap:6px"><b>${esc(c.name)}</b><div class="join-box" dir="ltr">${esc(joinLink(c.join_code))}</div><button class="btn sm" data-act="copy" data-v="${esc(joinLink(c.join_code))}">نسخ الرابط</button></div>`).join('')}</div>` : '') +
    `<a class="btn" href="#/t/classes" style="text-decoration:none">${ic('send')} مشاركة طريقة الدخول</a>
     ${W.compNow ? `<a class="btn soft" href="#/t/comps" style="text-decoration:none">عرض المسابقة</a>` : ''}
     ${(QS.list || []).some(q => q.status === 'draft') ? `<a class="btn ghost" href="#/t/questions" style="text-decoration:none">مراجعة الأسئلة المنتظرة</a>` : ''}
     <button class="btn ghost" data-act="w-done">الرئيسية</button>`, 'home');
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
    sb.from('competitions').select('*').eq('status', 'active').order('created_at'),
    sb.from('competitions').select('id,group_id,class_id,title,start_date,end_date').eq('status', 'finished').order('end_date', { ascending: false }).limit(120)
  ]).then(r => { CL.past = (r[3] && r[3].data) || []; return r; });
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
  if (T.compPreset && CL.tab === 'comps') { const p = T.compPreset; T.compPreset = null; if (CL.classes.length) { T.compEdit = 'new'; await ACTS['cp-new'](); CC.cu = p.cu || ''; CC.lessons = p.lessons || []; renderClasses(); return; } }
  renderClasses();
}
function renderClasses(){
  if (location.hash.indexOf('#/t/ch/') === 0 && !T.compEdit) return renderChallenge(decodeURIComponent(location.hash.slice(7)));
  const cl = CL.tab !== 'comps';
  const more = cl ? `<button class="icon-btn" data-act="c-more" aria-label="المزيد">${ic('more')}</button>` : '';
  const onNew = location.hash.indexOf('#/t/new') === 0;
  const cur = cl && CL.cur && !CL.sel && CL.byId[CL.cur];
  if (cl && CL.cur && !cur && !CL.sel) { CL.cur = null; return location.replace('#/t/classes'); }
  if (cur) { view(cur.name, classPage(cur), 'classes', `<button class="icon-btn" data-act="c-pmore" aria-label="المزيد">${ic('more')}</button>`, '#/t/classes'); if (CL.addFocus) { const i = document.querySelector('.cp1 .cl-add1 input'); CL.addFocus = null; if (i) i.focus(); } return; }
  if (!cl && !onNew && T.compEdit && T.compEdit !== 'new') { view('تعديل التحدي', compForm(), 'home', `<button class="icon-btn" data-act="cp-cancel" aria-label="إغلاق">${ic('x')}</button>`); cfAuto(); cfUpdate(); cfLessons(); ceSum(); return; }
  view(cl ? 'الصفوف' : onNew && T.compEdit ? 'تحدي جديد' : T.compEdit ? 'التحديات' : 'التحديات السابقة', (cl ? classesList() : compsPanel()) + selBar(), cl ? 'classes' : onNew ? 'new' : 'home', more, cl || onNew ? undefined : '#/t/home');
  cfAuto(); cfUpdate(); cfLessons();
  if (CL.addFocus) { const i = document.querySelector(`.cls[data-cid="${CL.addFocus}"] .cl-add1 input`); CL.addFocus = null; if (i) i.focus(); }
}
/* challenge page (v109): big «played today», remind the rest, ranking; everything else under ⋯ */
function renderChallenge(gid){
  const ks = (CL.allComps || []).filter(k => (k.group_id || k.id) === gid); if (!ks.length) return location.replace('#/t/home');
  if (CL.chg !== gid) CL.chSel = null;
  const c = ks[0], ph = phaseOf(c), multi = ks.length > 1;
  const st = ks.flatMap(k => (CL.students[k.class_id] || []).filter(x => x.approved !== false).map(x => Object.assign({ _c: (CL.byId[k.class_id] || {}).name }, x)));
  const n = st.length, played = st.filter(x => CST(x.id).today).length, left = n - played;
  const days = ph === 'points' ? cfDays(todayKW(), c.points_end_date) : ph === 'knockout' ? cfDays(todayKW(), c.end_date) : null;
  const meta = c.paused_at ? '⏸ متوقف مؤقتاً' : (PHASE_AR[ph] || '') + (days != null ? ' · ' + (days > 0 ? 'باقي ' + daysAr(days) : 'آخر يوم') : '');
  const rows = st.slice().sort((a, b) => CST(b.id).pts - CST(a.id).pts || a.name.localeCompare(b.name, 'ar'));
  const names = ks.map(k => (CL.byId[k.class_id] || {}).name).filter(Boolean).join('، ');
  CL.chg = gid;
  const body = `<div class="ch1"><div class="ch-sub">${esc(names)}</div>
    <div class="ch-hero"><small>لعبوا اليوم</small><div class="ch-big"><b>${played}</b> <span>من ${n}</span></div><div class="ch-bar"><i style="width:${n ? played * 100 / n : 0}%"></i></div>
    ${left && !c.paused_at && ph === 'points' ? `<button class="btn ch-rem" data-act="ch-remind">🔔 ذكّر الباقين (${left})</button>` : ''}</div>
    <div class="ch-acts">${[['cp-try', '🎮', 'جرّب'], ['ch-code', '🔗', 'الرمز'], ['ch-edit', '✏️', 'تعديل'], ['ch-det', '📊', 'التفاصيل']].map(o => `<button class="ch-a" data-act="ch-run" data-a="${o[0]}" data-g="${esc(gid)}"><span>${o[1]}</span>${o[2]}</button>`).join('')}</div>
    <div class="ch-2">${c.paused_at ? `<button class="ch-b" data-act="cp-resume" data-g="${esc(gid)}">▶️ استئناف</button>` : `<button class="ch-b" data-act="cp-pause" data-g="${esc(gid)}">⏸ إيقاف مؤقت</button>`}<button class="ch-b end" data-act="cp-end" data-g="${esc(gid)}">🏁 إنهاء</button></div>
    <p class="ch-meta">${esc(meta)}</p><div id="ch-warn"></div><div id="ch-star"></div>
    ${rows.length ? `<div class="ch-lh">${CL.chSel ? `<button class="link" data-act="ch-all">${CL.chSel.size === rows.length ? 'إلغاء الكل' : 'اختر الكل'}</button><button class="link" data-act="ch-sel-x">إلغاء</button>` : `<span></span><button class="link" data-act="ch-sel">✉️ رسالة</button>`}</div>
    <div class="cp-list${CL.chSel ? ' picking' : ''}">${rows.map((x, i) => { const k = CST(x.id); return `<button class="cp-row${k.today ? '' : ' dim'}${CL.chSel && CL.chSel.has(x.id) ? ' on' : ''}" data-act="${CL.chSel ? 'ch-pick' : 'ch-stu'}" data-id="${x.id}">${CL.chSel ? '<i class="ch-ck">✓</i>' : ''}<span class="cp-rk">${k.pts && i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><span class="grow"><b>${x.avatar ? esc(x.avatar) + ' ' : ''}${esc(fmtStu(x.name))}${k.today ? ' <i class="cp-ok">✓</i>' : ''}</b>${multi ? `<small class="ch-cls">${esc(x._c || '')}</small>` : ''}</span><span class="cp-pts">${k.pts}</span></button>`; }).join('')}</div>`
      : `<div class="cl-empty sm"><b>ما فيه طلاب بعد</b><small>شارك رمز الصف من ⋯</small></div>`}</div>`;
  view(String(c.title || 'التحدي').split('·').pop().trim(), body + (CL.chSel ? `<div class="ch-sendbar"><button class="btn" data-act="ch-send" ${CL.chSel.size ? '' : 'disabled'}>✉️ أرسل إلى ${CL.chSel.size}</button></div>` : ''), 'home', '', '#/t/home');
  chWarn(c); chStar(ks);
}
/* v174 «نجم الأسبوع» (Thu–Sat): most improved student vs last week (sql/week_star.sql) */
async function chStar(ks){
  let r = []; try { r = await Promise.all(ks.map(k => rpc('teacher_week_star', { p_class: k.class_id }).catch(() => null))); } catch(e){ return; }
  const el = document.getElementById('ch-star'); if (!el) return;
  el.innerHTML = r.filter(Boolean).map(x => `<button class="ch-star" data-act="ch-stu" data-id="${esc(x.id)}"><span class="ch-star-i">${x.av ? esc(x.av) : '⭐'}</span><span class="grow"><small>⭐ نجم الأسبوع</small><b>${esc(fmtStu(x.name))}</b><small>تحسّن ${x.up} نقطة بالجولة عن الأسبوع اللي قبل · شجّعه 👏</small></span></button>`).join('');
}
/* v123: warn when the challenge has fewer than 4 questions in «أسئلتي», with a one-tap fix */
async function chWarn(c){
  let n = 0; try { n = await rpc('question_pool', { p_types: c.qtypes || ['curriculum', 'general', 'quick'], p_cu: c.curriculum_id || null, p_lessons: c.lessons && c.lessons.length ? c.lessons : null }); } catch(e){ return; }
  const el = document.getElementById('ch-warn'); if (!el) return; if (n >= 4) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="ch-warn"><b>⚠️ ما فيه أسئلة كافية</b><small>الطلاب ما يقدرون يلعبون حتى تضيف أسئلة</small><button class="btn" data-act="ch-fill">أضف الأسئلة الجاهزة</button></div>`;
}
ACTS['ch-fill'] = async t => { const c = chComps()[0]; if (!c) return;
  CC.qtypes = (c.qtypes || ['curriculum', 'general', 'quick']).slice(); CC.cu = c.curriculum_id || ''; CC.lessons = (c.lessons || []).slice(); CC.lastPd = 0;
  await ACTS['cf-addready'](t); await chWarn(c); };
const chComps = () => (CL.allComps || []).filter(k => (k.group_id || k.id) === CL.chg);
const chStudents = () => chComps().flatMap(k => CL.students[k.class_id] || []);
ACTS['ch-remind'] = () => { const ks = chComps(), c = ks[0]; if (!c) return;
  const cls = ks.map(k => CL.byId[k.class_id]).filter(Boolean), url = location.origin + location.pathname;
  const txt = `يا أبطال ⏱️ لا تنسون جولة اليوم في «${c.title || 'اهزم الدقيقة'}»، دقيقة وحدة بس!\n` + cls.map(x => x.join_code ? `${ks.length > 1 ? x.name + ': ' : ''}${joinLink(x.join_code)}` : url).join('\n');
  const left = chStudents().filter(x => x.approved !== false && !CST(x.id).today);
  CL.remTxt = txt; CL.remIds = left.map(x => x.id);
  modal(`<div class="s-avs center"><h3>🔔 ذكّر ${left.length} ${left.length === 1 ? 'طالب' : 'طلاب'}</h3><p class="sub">توصلهم رسالة داخل التطبيق، وإشعار للي مفعّل الإشعارات.</p>
    <button class="btn" data-act="ch-rem-in">أرسل التذكير</button><button class="btn soft" data-act="ch-rem-wa">أو شارك بقروب الواتساب</button></div>`); };
ACTS['ch-rem-wa'] = () => { closeModals(); window.open('https://wa.me/?text=' + encodeURIComponent(CL.remTxt || ''), '_blank'); };
ACTS['ch-rem-in'] = async t => { const ids = CL.remIds || []; if (!ids.length || t.disabled) return; t.disabled = true;
  const rows = ids.map(id => { const s = chStudents().find(x => x.id === id) || { name: '' }; return { student_id: id, kind: 'encourage', body: `هلا ${String(s.name).split(' ')[0]} 👋 باقي لك جولة اليوم، دقيقة وحدة بس! ⏱️` }; });
  const { error } = await sb.from('messages').insert(rows); t.disabled = false;
  if (error) return toast(errMsg(error)); closeModals(); toast('انرسل التذكير لـ ' + ids.length + ' 🔔'); };
/* v181 pick some or all students on the challenge page, then the usual message composer (encourage / praise / advice) */
const chRe = () => { NS.keepY = scrollY; renderChallenge(CL.chg); };
ACTS['ch-sel'] = () => { CL.chSel = new Set(); chRe(); };
ACTS['ch-sel-x'] = () => { CL.chSel = null; chRe(); };
ACTS['ch-pick'] = t => { const id = t.dataset.id; CL.chSel.has(id) ? CL.chSel.delete(id) : CL.chSel.add(id); haptic(); chRe(); };
ACTS['ch-all'] = () => { const all = chStudents().filter(x => x.approved !== false).map(x => x.id); CL.chSel = CL.chSel.size === all.length ? new Set() : new Set(all); chRe(); };
ACTS['ch-send'] = () => { const ks = chComps(), list = [];
  ks.forEach(k => { const c = CL.byId[k.class_id]; if (!c) return; (CL.students[k.class_id] || []).forEach(s => { if (CL.chSel.has(s.id)) list.push(clStu(c, s)); }); });
  if (!list.length) return; CL.chSel = null; chRe(); msgSend(list); };
ACTS['ch-in'] = async t => { if (t.disabled) return; t.disabled = true;
  const { error } = await sb.from('messages').insert([{ student_id: t.dataset.id, kind: t.dataset.k, body: t.dataset.v }]); t.disabled = false;
  if (error) return toast(errMsg(error)); closeModals(); toast('انرسلت ✓'); };
ACTS['ch-stu'] = t => { const s = chStudents().find(x => x.id === t.dataset.id); if (!s) return; const k = CST(s.id), url = location.origin + location.pathname;
  const inMsg = k.today ? `أحسنت يا ${s.name.split(' ')[0]} 🌟 لعبت جولة اليوم، استمر!` : `هلا ${s.name.split(' ')[0]} 👋 باقي لك جولة اليوم، دقيقة وحدة بس! ⏱️`;
  const msg = k.today ? `أحسنت يا ${s.name.split(' ')[0]} 🌟 لعبت جولة اليوم، استمر!` : `هلا ${s.name.split(' ')[0]} 👋 باقي لك جولة اليوم في «اهزم الدقيقة»، دقيقة وحدة بس!\nادخل من هنا:\n${url}#/c/${s.code}`;
  modal(`<div class="st1"><div class="st1-h"><b>${esc(s.name)}</b><button class="icon-btn st1-x" data-act="close-modal" aria-label="إغلاق">${ic('x')}</button></div>
    <div class="st1-stats"><div><b>${k.pts}</b><small>نقطة</small></div><div><b>${k.rounds}</b><small>جولات</small></div></div>
    <div class="st1-today ${k.today ? 'on' : ''}">${k.today ? 'لعب اليوم ✓' : 'ما لعب اليوم'}</div>
    <button class="btn cp-share" data-act="ch-in" data-id="${esc(s.id)}" data-k="${k.today ? 'praise' : 'encourage'}" data-v="${esc(inMsg)}">${k.today ? 'شجّعه 🌟' : 'ذكّره يلعب 🔔'}</button>
    <button class="btn soft" data-act="ch-wa" data-ph="${esc(s.phone || '')}" data-v="${esc(msg)}">أو واتساب</button>
    <button class="btn soft" data-act="s-rep" data-id="${esc(s.id)}">📊 تقريره</button></div>`); };
ACTS['ch-wa'] = t => { let ph = (t.dataset.ph || '').replace(/[^0-9]/g, ''); if (ph.length === 8) ph = '965' + ph; else if (ph.startsWith('00')) ph = ph.slice(2); closeModals(); window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(t.dataset.v), '_blank'); };
ACTS['ch-more'] = () => { const ks = chComps(), c = ks[0]; if (!c) return; const g = c.group_id || c.id;
  const O = [c.paused_at ? ['cp-resume', '▶️', 'استئناف', `data-g="${g}"`] : ['cp-pause', '⏸', 'إيقاف مؤقت', `data-g="${g}"`], ['cp-end', '🏁', 'إنهاء', `data-g="${g}"`]];
  modal(`<div class="st1"><div class="st1-h"><b>${esc(c.title || 'التحدي')}</b><button class="icon-btn st1-x" data-act="close-modal" aria-label="إغلاق">${ic('x')}</button></div><div class="st1-opts">${O.map(o => `<button class="st1-o" data-act="ch-run" data-a="${o[0]}" ${o[3]}><span class="e">${o[1]}</span><b>${o[2]}</b></button>`).join('')}</div></div>`); };
ACTS['ch-run'] = t => { closeModals(); const a = t.dataset.a; setTimeout(() => ACTS[a](t), 30); };
ACTS['ch-code'] = () => { const k = chComps()[0], cc = k && CL.byId[k.class_id]; if (!cc) return; if (!cc.self_join) return go('#/t/class/' + cc.id); CK.cls = cc; ACTS['c-joinshow']({ closest: () => null, dataset: {} }); };
ACTS['ch-det'] = () => { const k = chComps()[0]; if (k) go('#/t/results/' + k.class_id); };
ACTS['ch-edit'] = t => { closeModals(); ACTS['cp-edit']({ dataset: { g: t.dataset.g } }); };
ACTS['c-tab'] = t => { T.compEdit = null; go('#/t/' + t.dataset.t); };
function classesList(){
  const top = CL.sel ? '' : `<button class="btn cl-add" data-act="aw-start">${ic('plus')} إضافة طلبة</button><div class="cl-newc"><button class="link" data-act="t-add-class">＋ صف جديد</button></div><input type="file" id="awimg" accept="image/*" class="hide" data-change="aw-img"><input type="file" id="awxl" accept=".xlsx,.xls,.csv" class="hide" data-change="aw-xl"><input type="file" id="mxl" accept=".xlsx,.xls,.csv" class="hide" data-change="t-multi-chosen"><input type="file" id="xl" accept=".xlsx,.xls,.csv" class="hide" data-change="t-xl-chosen">`;
  const arch = CL.archived && CL.archived.length && !CL.sel ? `<a class="cl-arch cl-arch-l" href="#/t/archive">${ic('layers')} الصفوف المؤرشفة (${CL.archived.length})<span class="grow"></span>${ic('back')}</a>` : '';
  if (!CL.sel) return `<button class="btn cp-newc" data-act="t-add-class">＋ صف جديد</button>` + (CL.classes.length ? `<div class="cp-tiles">${CL.classes.map(c => { const st0 = CL.students[c.id] || [], comp = CL.comps[c.id], p = st0.filter(x => CST(x.id).today).length;
      return `<button class="cp-tile" data-act="c-open" data-id="${c.id}"><b>${esc(c.name)}</b><small>${st0.length} طالب</small>${comp ? `<small class="cp-pl">لعب اليوم ${p}</small>` : ''}</button>`; }).join('')}</div>` : `<div class="cl-empty sm"><b>ما عندك صفوف بعد</b><small>اضغط «صف جديد» واكتب اسمه، وبعدها شارك الرمز مع الطلاب.</small></div>`) + arch + `<input type="file" id="awimg" accept="image/*" class="hide" data-change="aw-img"><input type="file" id="awxl" accept=".xlsx,.xls,.csv" class="hide" data-change="aw-xl"><input type="file" id="mxl" accept=".xlsx,.xls,.csv" class="hide" data-change="t-multi-chosen"><input type="file" id="xl" accept=".xlsx,.xls,.csv" class="hide" data-change="t-xl-chosen">`;
  if (CL.sel.type === 'classes') return `<div class="cp-tiles cp-selm">${CL.classes.map(c => { const on = CL.sel.ids.has(c.id), st0 = CL.students[c.id] || [];
    return `<button class="cp-tile${on ? ' picked' : ''}" data-act="c-pick" data-id="${c.id}" aria-pressed="${on}"><span class="cp-ck">${on ? '✓' : ''}</span><b>${esc(c.name)}</b><small>${st0.length} طالب</small></button>`; }).join('')}</div><div style="height:120px"></div>`;
  if (!CL.classes.length) return top + `<div class="cl-empty">${ic('users')}<b>لا يوجد طلبة بعد</b><small>اضغط «إضافة طلبة» فوق، وصوّر كشف الأسماء أو الصقه، وخلال دقيقة يصير الصف جاهز.</small></div>` + arch;
  return top + CL.classes.map(classSection).join('') + arch;
}
const CST = id => CL.stat[id] || { pts: 0, rounds: 0, today: false };
/* simple class page (v98): big code + one share button, new students, ranked list, add row; rest under ⋯ */
function classPage(c){
  const st0 = CL.students[c.id] || [], comp = CL.comps[c.id];
  const nw = st0.filter(x => x.approved === false), ok = st0.filter(x => x.approved !== false);
  const st = ok.slice().sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  const box = c.self_join ? `<div class="cp-code"><small>الطلاب يدخلون بهذا الرمز</small><b dir="ltr">${esc(fmtCode(c.join_code || ''))}</b><button class="btn cp-share" data-act="c-share">شارك الرمز</button></div>`
    : st0.length ? `<div class="cp-code"><small>كل طالب له رمز دخول خاص</small><button class="btn cp-share" data-act="c-send">شارك رموز الطلاب</button></div>` : '';
  return `<div class="cp1" data-cid="${c.id}">${box}<div class="cp-list">` +
    nw.map(x => `<div class="cp-row"><span class="grow"><b>${esc(x.name)}</b> <span class="cn-tag">جديد</span></span><button class="cn-ok" data-act="s-approve" data-id="${x.id}" aria-label="موافقة">✓</button><button class="cn-no" data-act="s-reject" data-id="${x.id}" aria-label="حذف">✕</button></div>`).join('') +
    st.map((x, i) => `<button class="cp-row" data-act="s-card" data-id="${x.id}"><span class="cp-rk">${i + 1}</span><span class="grow"><b>${esc(fmtStu(x.name))}</b></span><span class="chev">${ic('back')}</span></button>`).join('') +
    `<form class="cl-add1 cp-add" data-form="c-add1"><span class="pl">＋</span><input name="n" placeholder="اكتب اسم طالب" autocomplete="off" enterkeyhint="send"><button class="btn sm" type="submit">إضافة</button></form>` +
    `<button class="cp-many" data-act="aw-start" data-cid="${c.id}">📷 أضف أسماء كثيرة من صورة أو Excel</button></div></div>`;
}
ACTS['c-open'] = t => go('#/t/class/' + t.dataset.id);
ACTS['c-pmore'] = () => { const el = document.querySelector('.cp1[data-cid]'); if (el) ACTS['c-cmore'](el); };
ACTS['c-share'] = t => { const c = ctx(t); if (!c) return; const link = joinLink(c.join_code);
  const msg = `انضم لتحدي «${c.name}» في «اهزم الدقيقة» 🎯\nرمز الصف: ${fmtCode(c.join_code || '')}\nأو اضغط الرابط:\n${link}`;
  sheet('شارك الرمز', [
    { act: 'c-share-wa', attrs: `data-v="${esc(msg)}"`, icon: 'send', label: 'واتساب' },
    { act: 'm-run', attrs: `data-a="c-joinshow" data-cid="${c.id}"`, icon: 'eye', label: 'اعرض على الشاشة' },
    { act: 'copy', attrs: `data-v="${esc(link)}"`, icon: 'layers', label: 'نسخ الرابط' }]); };
ACTS['c-share-wa'] = t => { closeModals(); window.open('https://wa.me/?text=' + encodeURIComponent(t.dataset.v), '_blank'); };
function classSection(c){
  const st0 = CL.students[c.id] || [], open = CL.open.has(c.id), comp = CL.comps[c.id];
  const ph = comp ? phaseOf(comp) : null;
  const played = st0.filter(x => CST(x.id).today).length;
  const never = comp && ph !== 'upcoming' ? st0.filter(x => !CST(x.id).rounds) : [];
  let body = '';
  if (open) {
    const link = joinLink(c.join_code), q = CL.q[c.id] || ''; let sort = CL.sort[c.id] || SG('stu_sort') || 'no'; if (sort === 'pts' && !comp) sort = 'no';
    let st = st0.map((x, i) => Object.assign({ _i: i + 1 }, x));
    if (sort === 'name') st.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    if (sort === 'pts') st.sort((a, b) => CST(b.id).pts - CST(a.id).pts);
    if (sort === 'idle') st.sort((a, b) => CST(a.id).today - CST(b.id).today || CST(a.id).rounds - CST(b.id).rounds);
    const selS = CL.sel && CL.sel.type === 'students' && CL.sel.cid === c.id;
    const fl = CL.flash && CL.flash.cid === c.id ? CL.flash : null;
    body = `<div class="cls-body">` +
      (fl ? `<div class="cl-flash"><button class="cl-flash-x" data-act="cl-flash-x" aria-label="إغلاق">${ic('x')}</button>${fl.added ? `<b>الخطوة التالية: أرسل لهم طريقة الدخول</b><small>تمت إضافة ${fl.n} طالباً إلى «${esc(c.name)}»، ولكل واحد رمز دخول خاص.</small><div class="row"><button class="btn sm wa-btn" data-act="c-send">${ic('send')} واتساب</button><button class="btn sm soft" data-act="t-print-codes">${ic('print')} طباعة البطاقات</button></div>${comp ? '' : `<button class="link" data-act="cp-new-for">أو أنشئ مسابقة لهذا الصف</button>`}` : `<b>✅ تم إنشاء الصف${fl.n ? ` ومعه ${fl.n} طالباً` : ''}</b><small>${fl.n ? 'الخطوة التالية: أرسل الرموز للطلبة، ثم أنشئ مسابقة.' : fl.link ? 'شارك رابط التسجيل أدناه مع الطلبة.' : 'أضف الطلبة، ثم أنشئ مسابقة.'}</small><div class="row">${fl.n ? `<button class="btn sm" data-act="c-send">${ic('send')} مشاركة رموز الدخول</button>` : ''}${comp ? '' : `<button class="btn sm soft" data-act="cp-new-for">${ic('trophy')} إنشاء مسابقة</button>`}</div>`}</div>` : '') +
      (CL.sel ? '' : `<div class="cl-acts">${st0.length ? `<button class="btn sm soft" data-act="c-send">${ic('send')} مشاركة رموز الدخول</button>` : '<span class="grow"></span>'}<button class="icon-btn" data-act="c-cmore" aria-label="المزيد">${ic('more')}</button></div>`) +
      (c.self_join ? `<div class="join-row"><span class="sub">رمز الصف <b class="jr-code" dir="ltr">${esc(fmtCode(c.join_code || ''))}</b></span><button class="btn sm soft" data-act="c-joinshow">عرض</button><button class="btn sm" data-act="copy" data-v="${esc(link)}">نسخ الرابط</button></div>` : '') +
      (never.length && !CL.sel ? `<div class="cl-alert">${ic('user')}<span class="grow"><b>${never.length}</b> لم يدخلوا أبداً</span><button class="btn sm soft" data-act="c-send" data-only="never">أرسل لهم الرمز</button></div>` : '') +
      (st0.length > 10 ? `<div class="cl-search">${ic('search')}<input class="cl-q" data-cid="${c.id}" placeholder="بحث بالاسم أو الرقم" value="${esc(q)}"></div>` : '') +
      (st0.length > 1 ? `<div class="lv-chips cl-sort">${[['no', 'الترتيب'], ['name', 'الاسم']].concat(comp ? [['pts', 'النقاط'], ['idle', 'لم يلعب اليوم']] : []).map(x => `<button class="${sort === x[0] ? 'on' : ''}" data-act="c-sort" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>` : '') +
      (!CL.sel ? (() => { const nw = st0.filter(x => x.approved === false); if (!nw.length) return '';
        const shared = x => x.device && st0.some(y => y.id !== x.id && y.device === x.device);
        return `<div class="cl-new"><b>طلاب جدد 🆕 <small>سجّلوا بالرمز. وافق أو احذف</small></b>${nw.map(x => `<div class="cl-new-r"><span class="grow"><b>${esc(x.name)}</b>${shared(x) ? '<small>📱 نفس جهاز طالب ثاني</small>' : ''}</span><button class="cn-ok" data-act="s-approve" data-id="${x.id}" aria-label="موافقة">✓</button><button class="cn-no" data-act="s-reject" data-id="${x.id}" aria-label="حذف">✕</button></div>`).join('')}</div>`; })() : '') +
      (st.length ? `<div class="sw-list">${st.map(x => { const k = CST(x.id), hide = q && !(x.name + ' ' + (x.student_no || '')).includes(q); return `<div class="sw-row${hide ? ' hide' : ''}" data-n="${esc(x.name + ' ' + (x.student_no || ''))}"><div class="sw-act">
          <div class="sw-r"><button class="del" data-act="t-del-student" data-id="${x.id}"><i>${ic('trash')}</i><span>حذف</span></button></div>
          <div class="sw-l"><button class="rg" data-act="t-regen" data-id="${x.id}"><i>${ic('refresh')}</i><span>رمز جديد</span></button><button class="wa" data-act="s-wa" data-id="${x.id}"><i>${ic('send')}</i><span>واتساب</span></button></div></div>
        <div class="sw-main" data-act="s-card" data-id="${x.id}" role="button" tabindex="0"${selS ? ` aria-pressed="${CL.sel.ids.has(x.id) ? 'true' : 'false'}"` : ''}>${selS ? `<span class="selmark">${ic(CL.sel.ids.has(x.id) ? 'checkc' : 'circle')}</span>` : `<span class="sw-n">${sort === 'pts' && comp ? '' : x._i}</span>`}<div class="grow"><b>${esc(fmtStu(x.name))}${x.approved === false ? ' <span class="cn-tag">جديد</span>' : ''}${k.today ? '<i class="cl-dot" title="لعب اليوم"></i>' : ''}</b><div class="sub">${esc(x.student_no) || '—'}${comp ? ` · ${k.pts} نقطة` : ''}${x.gender === 'f' ? ' · طالبة' : x.gender === 'm' ? ' · طالب' : ''}</div></div>
        ${selS ? '' : `<button class="cl-wa" data-act="s-wa" data-id="${x.id}" aria-label="إرسال الرمز واتساب">${ic('send')}</button>`}</div></div>`; }).join('')}</div>`
        : `<div class="cl-empty sm"><b>لا يوجد طلبة في ${esc(c.name)}</b><small>صوّر كشف الأسماء أو الصقه، أو اكتب الأسماء واحداً واحداً تحت.</small><button class="btn" data-act="aw-start" data-cid="${c.id}">${ic('plus')} إضافة طلبة</button></div>`) +
      (CL.sel ? '' : `<form class="cl-add1" data-form="c-add1"><span class="pl">＋</span><input name="n" placeholder="طالب" autocomplete="off" enterkeyhint="send"><button class="btn sm" type="submit">إضافة</button></form>`) + '</div>';
  }
  const selC = CL.sel && CL.sel.type === 'classes';
  const days = comp && ph === 'points' ? cfDays(todayKW(), comp.points_end_date) : null;
  const tag = comp ? `<span class="cl-tag on">${PHASE_AR[ph]}</span>${days != null ? `<span class="cl-days">${days > 0 ? 'باقي ' + days + ' يوم' : 'آخر يوم'}</span>` : ''}` : `<span class="cl-tag">بدون مسابقة</span>`;
  const pct = st0.length ? Math.round(played * 100 / st0.length) : 0;
  const ring = ph === 'points' && st0.length && !selC ? `<span class="cl-ring" style="--p:${pct}" title="لعبوا اليوم"><b>${played}/${st0.length}</b><small>اليوم</small></span>` : '';
  return `<div class="cls ${open ? 'open' : ''} ${selC && CL.sel.ids.has(c.id) ? 'picked' : ''}" data-cid="${c.id}"><button class="cls-head" data-act="c-toggle" aria-expanded="${open ? 'true' : 'false'}">${selC ? `<span class="selmark">${ic(CL.sel.ids.has(c.id) ? 'checkc' : 'circle')}</span>` : ''}
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
/* v246 (Khalid screenshots): classes ⋯ = squares like the class ⋯ */
const sqO = (a, e, l, x) => `<button class="st1-o${x ? ' ' + x : ''}" data-act="${a.indexOf(':') === 0 ? a.slice(1) : 'm-run'}" data-a="${a}"><span>${e}</span>${l}</button>`;
ACTS['c-more'] = () => modal(`<div class="aw-sheet"><h3>الصفوف</h3><div class="st1-opts">${sqO(':c-xl', '📤', 'إضافة من Excel')}${sqO('c-select', '☑️', 'تحديد صفوف')}${sqO('c-del-all', '🗑️', 'حذف الصفوف', 'dng')}</div></div>`);
ACTS['c-xl'] = () => { closeModals(); setTimeout(() => modal(`<div class="aw-sheet xl2"><h3>إضافة صفوف من Excel</h3>
  <div class="xl2-s"><b>١</b><span class="grow">نزّل النموذج<small>فيه أعمدة: الاسم، الصف…</small></span><button class="btn sm soft" data-act="t-multi-sample">نزّله</button></div>
  <div class="xl2-s"><b>٢</b><span class="grow">اكتب فيه أسماء طلابك وصفوفهم</span></div>
  <div class="xl2-s"><b>٣</b><span class="grow">ارفعه هنا</span><button class="btn sm" data-act="m-run" data-a="t-multi-up">ارفع الملف</button></div></div>`), 30); };
/* v120: class ⋯ = six squares, like the student card */
ACTS['c-cmore'] = t => { const c = ctx(t); const sq = (a, e, l, x) => `<button class="st1-o${x ? ' ' + x : ''}" data-act="m-run" data-a="${a}" data-cid="${c.id}"><span>${e}</span>${l}</button>`;
  modal(`<div class="aw-sheet"><h3>${esc(c.name)}</h3><div class="st1-opts">${sq('t-print-codes', '🖨️', 'طباعة البطاقات')}${sq('c-menu', '⚙️', 'إعدادات الصف')}${sq('c-promote', '🎓', nextGradeName(c.name) ? 'ترقية إلى ' + esc(nextGradeName(c.name)) : 'ترقية للصف التالي')}${sq('t-export-codes', '🔑', 'تنزيل رموز الطلبة')}${sq('c-archive', '📦', 'أرشفة الصف')}${sq('c-del', '🗑️', 'حذف الصف', 'dng')}</div></div>`); };
ACTS['m-run'] = t => { closeModals(); const a2 = t.dataset.a; const fake = document.querySelector(`[data-cid="${t.dataset.cid}"]`) || t; setTimeout(() => ACTS[a2](fake.querySelector ? (fake.querySelector('.cls-head') || fake) : fake), 30); };
ACTS['c-pick'] = t => { const id = t.dataset.id; CL.sel.ids.has(id) ? CL.sel.ids.delete(id) : CL.sel.ids.add(id); haptic(); const y = scrollY; renderClasses(); scrollTo(0, y); };
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
    <div class="sel-acts">${!isC ? `<button class="btn sm soft" data-act="sel-move" ${n && CL.classes.length > 1 ? '' : 'disabled'}>${ic('layers')} نقل</button><button class="btn sm soft" data-act="sel-export" ${n ? '' : 'disabled'}>${ic('download')} تصدير</button><button class="btn sm soft" data-act="sel-msg" ${n ? '' : 'disabled'}>${ic('mail')} رسالة</button>` : ''}<button class="btn sm danger" data-act="sel-del" ${n ? '' : 'disabled'}>${ic('trash')} حذف</button></div></div>`;
}
const clStu = (c, s) => { const l = (CL.students[c.id] || []).slice().sort((a, b) => CST(b.id).pts - CST(a.id).pts); const p = CST(s.id).pts; return { id: s.id, name: s.name, pts: p, rank: p ? l.findIndex(x => x.id === s.id) + 1 : '—', cls: c.name }; };
ACTS['s-msg'] = t => { const c = ctx(t), s = (CL.students[c.id] || []).find(x => x.id === t.dataset.id); if (s) msgSend([clStu(c, s)]); };
ACTS['sel-msg'] = () => { const c = CL.byId[CL.sel.cid] || CL.classes.find(x => x.id === CL.sel.cid); if (!c) return; msgSend((CL.students[c.id] || []).filter(s => CL.sel.ids.has(s.id)).map(s => clStu(c, s))); };
ACTS['sel-del'] = async () => {
  const ids = [...CL.sel.ids], isC = CL.sel.type === 'classes';
  if (!await ask(isC ? `حذف ${ids.length} صف مع طلبتها ونتائجها نهائياً؟` : `حذف ${ids.length} طالب/ـة؟ نتائجهم تبقى محفوظة وتقدر ترجعهم من الإعدادات.`)) return;
  if (isC) { const { error } = await sb.from('classes').delete().in('id', ids); if (error) return toast(errMsg(error)); }
  else if (!await hideStu(ids)) return;
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
ACTS['s-approve'] = async t => {
  const id = t.dataset.id, { error } = await sb.from('students').update({ approved: true }).eq('id', id); if (error) return toast(errMsg(error));
  for (const k in CL.students) (CL.students[k] || []).forEach(x => { if (x.id === id) x.approved = true; }); nbSet('classes', Math.max(0, (NB.classes || 0) - 1)); NB_T = 0;
  renderClasses(); toast('تمت الموافقة ✓');
};
ACTS['s-reject'] = async t => {
  const id = t.dataset.id; let nm = ''; for (const k in CL.students) (CL.students[k] || []).forEach(x => { if (x.id === id) nm = x.name; });
  if (!await ask('حذف «' + nm + '»؟ تنحذف نقاطه بعد.', { ok: 'حذف' })) return;
  const { error } = await sb.from('students').delete().eq('id', id); if (error) return toast(errMsg(error));
  for (const k in CL.students) CL.students[k] = (CL.students[k] || []).filter(x => x.id !== id);
  renderClasses(); toast('تم الحذف');
};
ACTS['s-card'] = async t => {
  if (CL.sel && CL.sel.type === 'students') { const id = t.dataset.id; CL.sel.ids.has(id) ? CL.sel.ids.delete(id) : CL.sel.ids.add(id); return renderClasses(); }
  if (t.classList.contains('open')) { t.classList.remove('open'); t.style.transform = ''; t.dataset.off = 0; return; }
  const c = ctx(t), s = (CL.students[c.id] || []).find(x => x.id === t.dataset.id); if (!s) return;
  const comp = CL.comps[c.id];
  modal(st1Html(c, s));
};
/* student sheet: same order as the class page list; ‹ › or swipe moves between names without closing */
function st1Order(c){ const comp = CL.comps[c.id], st0 = CL.students[c.id] || [];
  return st0.filter(x => x.approved === false).concat(st0.filter(x => x.approved !== false).sort((a, b) => a.name.localeCompare(b.name, 'ar'))); }
function st1Html(c, s){
  const ord = st1Order(c), i = ord.findIndex(x => x.id === s.id), pv = ord[i - 1], nx = ord[i + 1], A = `data-id="${s.id}" data-cid="${c.id}"`;
  return `<div class="st1" data-cid="${c.id}" data-id="${s.id}"><div class="st1-h"><b>${esc(s.name)}</b><button class="icon-btn st1-x" data-act="close-modal" aria-label="إغلاق">${ic('x')}</button></div>
    <button class="btn cp-share" data-act="s-wa" data-id="${s.id}">أرسل له رمز الدخول</button>
    <div class="st1-opts">${[['s-edit', '✏️', 'تعديل الاسم'], ['s-msg', '✉️', 'رسالة'], ['t-regen', '🔄', 'رمز جديد'], ['t-del-student', '🗑️', 'حذف'], ['s-rep', '📊', 'تقريره']].map(o => `<button class="st1-o" data-act="${o[0]}" ${A}><span class="e">${o[1]}</span><b>${o[2]}</b></button>`).join('')}</div>
    <div class="st1-nav"><button class="icon-btn" data-act="s-go" data-id="${pv ? pv.id : ''}" ${pv ? '' : 'disabled'} aria-label="السابق">→</button><small>${i + 1} من ${ord.length}</small><button class="icon-btn" data-act="s-go" data-id="${nx ? nx.id : ''}" ${nx ? '' : 'disabled'} aria-label="التالي">←</button></div></div>`;
}
ACTS['s-go'] = t => { const c = ctx(t), id = t.dataset.id, s = id && (CL.students[c.id] || []).find(x => x.id === id); const el = document.querySelector('.st1'); if (!s || !el) return; el.outerHTML = st1Html(c, s); };
(() => { let x0 = null, y0 = 0;
  document.addEventListener('touchstart', e => { const el = e.target.closest && e.target.closest('.st1'); x0 = el ? e.touches[0].clientX : null; y0 = el ? e.touches[0].clientY : 0; }, { passive: true });
  document.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
    const b = document.querySelectorAll('.st1-nav [data-act="s-go"]')[dx > 0 ? 1 : 0]; if (b && !b.disabled) ACTS['s-go'](b); }, { passive: true });
})();
ACTS['s-more'] = t => { const c = ctx(t), id = t.dataset.id, s = (CL.students[c.id] || []).find(x => x.id === id); if (!s) return; closeModals();
  const A = `data-id="${id}" data-cid="${c.id}"`;
  setTimeout(() => modal(`<div class="st1" data-cid="${c.id}"><div class="st1-h"><b>${esc(s.name)}</b><button class="icon-btn st1-x" data-act="close-modal" aria-label="إغلاق">${ic('x')}</button></div><div class="st1-opts">${[['s-edit', '✏️', 'تعديل الاسم'], ['s-msg', '✉️', 'رسالة'], ['t-regen', '🔄', 'رمز جديد'], ['t-del-student', '🗑️', 'حذف']].map(o => `<button class="st1-o" data-act="${o[0]}" ${A}><span class="e">${o[1]}</span><b>${o[2]}</b></button>`).join('')}</div></div>`), 30); };
ACTS['s-edit'] = t => {
  const c = ctx(t), s = (CL.students[c.id] || []).find(x => x.id === t.dataset.id); if (!s) return;
  closeModals();
  const g0 = s.gender || '', many = CL.classes.length > 1;
  modal(`<form class="se1" data-form="s-edit-save" data-id="${s.id}" data-cid="${c.id}">
    <div class="st1-h"><b>تعديل الطالب</b><button type="button" class="icon-btn st1-x" data-act="close-modal" aria-label="إغلاق">${ic('x')}</button></div>
    <input class="se1-n" name="name" value="${esc(s.name)}" required maxlength="60" aria-label="الاسم" autocomplete="off">
    <div class="se1-g">${[['m', '👦 طالب'], ['f', '👧 طالبة']].map(x => `<label class="${g0 === x[0] ? 'on' : ''}"><input type="radio" name="g" value="${x[0]}" ${g0 === x[0] ? 'checked' : ''}>${x[1]}</label>`).join('')}</div>
    <div class="se1-l">📞 هاتف الطالب أو ولي الأمر</div><input class="input se1-ph" name="ph" type="tel" value="${esc(s.phone || '')}" dir="ltr" placeholder="99999999" maxlength="20" aria-label="هاتف الطالب أو ولي الأمر">
    <details class="se1-more" ontoggle="if(this.open)setTimeout(()=>this.scrollIntoView({block:'end',behavior:'smooth'}),50)"><summary>المزيد</summary><div class="se1-l">رقم الطالب</div><input class="input" name="no" value="${esc(s.student_no || '')}" dir="ltr" inputmode="numeric" maxlength="20" placeholder="اختياري" aria-label="رقم الطالب">
      ${many ? `<div class="se1-l">نقله لصف ثاني</div><div class="se1-c">${CL.classes.map(x => `<label class="${x.id === c.id ? 'on' : ''}"><input type="radio" name="cls" value="${x.id}" ${x.id === c.id ? 'checked' : ''}>${esc(x.name)}</label>`).join('')}</div>` : ''}</details>
    ${many ? '' : `<input type="hidden" name="cls" value="${c.id}">`}
    <button class="btn se1-save" type="submit">حفظ</button></form>`);
};
ACTS['s-edit-save'] = async f => {
  const row = { name: f.name.value.trim(), student_no: f.no.value.trim(), class_id: f.cls.value, phone: normPhone(f.ph.value) || null, gender: (f.querySelector('[name=g]:checked') || {}).value || null };
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
  const msg = `مرحباً ${s.name}\nرمز دخولك إلى «اهزم الدقيقة»: ${s.code}\nللدخول مباشرة اضغط الرابط:\n${url}#/c/${s.code}`;
  let ph = (s.phone || '').replace(/[^0-9]/g, '');
  if (ph.length === 8) ph = '965' + ph; else if (ph.startsWith('00')) ph = ph.slice(2);
  window.open('https://wa.me/' + (ph || '') + '?text=' + encodeURIComponent(msg), '_blank');
  CL.sent.add(s.id); if (t.classList.contains('send-row')) { t.classList.add('sent'); t.querySelector('.send-ic').innerHTML = ic('check'); const sm = t.querySelector('small'); if (sm) sm.textContent = 'فُتح واتساب ✓'; }
};
ACTS['c-send'] = t => { const c = ctx(t), only = t.dataset.only;
  const st = only === 'never' ? CK.students.filter(x => !CST(x.id).rounds) : CK.students;
  modal(`<div class="col" data-cid="${c.id}"><h3>مشاركة رموز الدخول · ${esc(c.name)}</h3><p class="sub">اضغط على كل اسم ليفتح واتساب برسالة فيها رمزه ورابط الدخول. تظهر «فُتح واتساب» بعد فتحه، وتأكد أنت من الإرسال داخل واتساب.</p>
    <div class="send-list">${st.map(x => `<button class="send-row ${CL.sent.has(x.id) ? 'sent' : ''}" data-act="s-wa" data-id="${x.id}"><span class="grow"><b>${esc(x.name)}</b><small>${CL.sent.has(x.id) ? 'فُتح واتساب ✓' : x.phone ? esc(x.phone) : 'بدون رقم: تختار المحادثة بنفسك'}</small></span><span class="send-ic">${ic(CL.sent.has(x.id) ? 'check' : 'send')}</span></button>`).join('')}</div>
    <div class="row"><button class="btn soft" data-act="t-print-codes">${ic('print')} طباعة البطاقات</button><button class="btn soft" data-act="t-export-codes">${ic('download')} تصدير Excel</button></div></div>`);
};
/* v250 (Khalid «يعور العين ومو مرتب»): class settings = calm grouped list, no red buttons; archive/delete live in ⋯ */
ACTS['c-menu'] = t => modal(cmHtml(ctx(t)));
function cmHtml(c){ const on = !!c.self_join, lk = joinLink(c.join_code);
  return (`<div class="aw-sheet cm2" data-cid="${c.id}"><h3>إعدادات الصف</h3>
    <div class="set-h">اسم الصف</div><div class="set-grp"><form data-form="c-rename" data-cid="${c.id}" class="cm2-name"><input id="cr-n" name="name" value="${esc(c.name)}" required autocomplete="off" enterkeyhint="done"></form></div>
    <div class="set-h">الطلبة</div><div class="cg">${genderSeg('cg', c.gender || '', [['m', 'بنين'], ['f', 'بنات'], ['mix', 'مختلط']])}</div>
    <div class="set-h">التسجيل بالرابط</div><div class="set-grp">
      <button class="set-row" data-act="t-self" data-on="${on ? 0 : 1}" role="switch" aria-checked="${on}"><span class="grow rl-txt"><b>الطلبة يسجّلون بأنفسهم</b><small>بالرابط أو QR</small></span><span class="ios-sw${on ? ' on' : ''}"><i></i></span></button>
      <button class="set-row${on ? '' : ' cm2-off'}" data-act="copy" data-v="${esc(lk)}" ${on ? '' : 'disabled'}><span class="grow">نسخ الرابط</span><span class="cm2-v" dir="ltr">${esc(c.join_code || '')}</span></button><button class="set-row${on ? '' : ' cm2-off'}" data-act="c-joinshow" ${on ? '' : 'disabled'}><span class="grow">عرض QR بملء الشاشة</span></button>
    </div></div>`); }
document.addEventListener('change', e => { const i = e.target; if (i && i.id === 'cr-n' && i.form && i.value.trim()) i.form.requestSubmit(); });
document.addEventListener('change', e => { const r = e.target.closest && e.target.closest('.cg input'); if (!r) return; const c = ctx(r);
  sb.from('classes').update({ gender: r.value || null }).eq('id', c.id).then(({ error }) => { if (error) return toast(errMsg(error)); c.gender = r.value; r.closest('.seg-g').querySelectorAll('label').forEach(l => l.classList.toggle('on', l.contains(r))); toast('تم الحفظ'); renderClasses(); }); });
ACTS['c-archive'] = async t => { const c = ctx(t);
  if (!await ask(`أرشفة «${c.name}»؟ يختفي من القوائم وتبقى نتائجه، وتقدر تسترجعه من أسفل صفحة الصفوف.`, { ok: 'أرشفة' })) return;
  const { error } = await sb.from('classes').update({ archived: true }).eq('id', c.id); if (error) return toast(errMsg(error));
  closeModals(); CL.open.delete(c.id); toast('تمت الأرشفة'); await tClasses(); };
ACTS['c-unarchive'] = async t => { const { error } = await sb.from('classes').update({ archived: false }).eq('id', t.dataset.id); if (error) return toast(errMsg(error)); toast('تم الاسترجاع'); await tClasses(); };
function nextGradeName(n){
  const o = ORD.find(x => n.includes(x[0])); if (o) return o[1] >= 12 ? null : n.replace(o[0], GRADES[o[1]]);
  const m = String(n).match(/[0-9٠-٩]+/); if (!m) return null; /* v252: digits like 7G → 8G */
  const v = Number(m[0].replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))); if (!v || v >= 12) return null;
  const nx = /[٠-٩]/.test(m[0]) ? String(v + 1).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) : String(v + 1); return n.replace(m[0], nx);
}
ACTS['c-promote'] = async t => { const c = ctx(t), nn = nextGradeName(c.name);
  const v = await ask(`نفس الطلبة ورموزهم ونقاطهم، بس يتغير اسم الصف. مثلاً في بداية السنة الجديدة.`, { title: 'ترقية «' + c.name + '» إلى:', input: nn || '', placeholder: 'اسم الصف الجديد', ok: 'ترقية' });
  const name = (v || '').trim(); if (!name || name === c.name) return;
  const { error } = await sb.from('classes').update({ name }).eq('id', c.id); if (error) return toast(errMsg(error));
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
  if (error) return toast(errMsg(error)); const c = CL.byId[f.dataset.cid]; if (c) c.name = f.name.value.trim(); if (document.activeElement) document.activeElement.blur(); toast('تم الحفظ'); await tClasses();
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
function ncName(){ if (NC.custom) return NC.custom; return cnameOf(NC.stage, NC.grade, NC.sec); }
function ncHtml(){
  const st = NC_ST.find(x => x[0] === NC.stage), last = (T.settings || {}).lastStage, sts = stOpts(NC_ST);
  const chip = (act, v, label, on, big) => `<button type="button" class="nc2-c${big ? ' big' : ''}${on ? ' on' : ''}" data-act="${act}" data-v="${v}">${label}</button>`;
  const name = ncName();
  return `<div class="nc2"><h3>صف جديد</h3>
    ${myStages().length && !NC.allSt ? `<button type="button" class="link nc2-all" data-act="nc2-all">مرحلة ثانية؟</button>` : ''}${sts.length > 1 ? `<div class="nc2-s"><div class="nc2-l">المرحلة ${last && last === NC.stage ? '<small>✓ آخر مرحلة اخترتها</small>' : ''}</div><div class="nc2-g4">${sts.map(x => chip('nc2-st', x[0], x[1], x[0] === NC.stage, 1)).join('')}</div></div>` : ''}
    ${st ? `<div class="nc2-s"><div class="nc2-l">${NC.stage === 'university' ? 'السنة' : 'الصف'}</div><div class="nc2-gr" style="--n:${st[2].length > 5 ? 5 : st[2].length}">${st[2].map((g, k) => chip('nc2-gr', g, NC.stage === 'university' ? UNI_Y[k] : GRADES[g - 1], g === NC.grade)).join('')}</div></div>` : ''}
    <details class="nc2-det"${NC.det || NC.sec || NC.g ? ' open' : ''}><summary>تفاصيل الصف <small class="sub">${[NC.sec ? 'الشعبة ' + esc(NC.sec) : '', NC.g ? { m: 'بنين', f: 'بنات', mix: 'مختلط' }[NC.g] : ''].filter(Boolean).join(' · ') || 'الشعبة ونوع الصف (اختياري)'}</small></summary>
    <div class="nc2-s"><div class="nc2-l">الشعبة</div><div class="nc2-gr" style="--n:${Math.min(5, secList().length)}">${secList().map(x => chip('nc2-sec', x, x, x === NC.sec)).join('')}</div></div>
    <div class="nc2-s"><div class="nc2-l">الطلبة</div><div class="nc2-g3">${[['m', 'بنين'], ['f', 'بنات'], ['mix', 'مختلط']].map(x => chip('nc2-gd', x[0], x[1], x[0] === NC.g, 1)).join('')}</div></div></details>
    <label class="nc2-name"><div class="grow"><small>اسم الصف</small><input class="nc2-inp" id="nc2-in" value="${esc(name)}" maxlength="60" placeholder="اختر الصف أو اكتب اسمه" autocomplete="off" enterkeyhint="done"></div></label>
    <button class="btn" data-act="nc2-save" ${name ? '' : 'disabled'}>إنشاء الصف</button></div>`;
}
function ncRender(){ const m = document.querySelector('.nc2'); if (m) { m.outerHTML = ncHtml(); if (NC.editing) { const i = document.getElementById('nc2-in'); if (i) { i.focus(); i.select(); } } } }
document.addEventListener('input', e => { if (e.target.id !== 'nc2-in') return; NC.custom = e.target.value.replace(/\s+/g, ' ').trim(); const b = document.querySelector('[data-act="nc2-save"]'); if (b) b.disabled = NC.custom.length < 2; });
document.addEventListener('keydown', e => { if (e.target.id === 'nc2-in' && e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });
/* iPad/tablet: student screens are phone-sized; scale the page up to fill the screen (teacher .wide keeps device width) */
(() => {
  const m = document.querySelector('meta[name=viewport]'); if (!m || !(navigator.maxTouchPoints > 0)) return;
  const DEF = m.content, fit = () => {
    const a = Math.min(screen.width, screen.height), b = Math.max(screen.width, screen.height);
    const land = (screen.orientation && /landscape/.test(screen.orientation.type)) || Math.abs(window.orientation || 0) === 90;
    const W = land ? b : a, H = land ? a : b, s = Math.min(W / 540, H / 720);
    const c = (s > 1.15 && !document.body.classList.contains('wide')) ? 'width=' + Math.round(W / s) + ',user-scalable=no,viewport-fit=cover' : DEF;
    if (m.content !== c) m.content = c;
  };
  fit(); new MutationObserver(fit).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  addEventListener('orientationchange', () => setTimeout(fit, 50)); if (screen.orientation) screen.orientation.addEventListener('change', fit);
})();
/* iOS keyboard: lift bottom sheets above it */
if (window.visualViewport) { const kb = () => { const v = visualViewport, h = Math.max(0, window.innerHeight - v.height - v.offsetTop); document.documentElement.style.setProperty('--kb', h + 'px'); }; visualViewport.addEventListener('resize', kb); visualViewport.addEventListener('scroll', kb); }
document.addEventListener('focusin', e => { const m = e.target.closest && e.target.closest('.modal'); if (m && /INPUT|TEXTAREA/.test(e.target.tagName)) setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300); });
ACTS['t-add-class'] = () => { closeModals(); Object.assign(NC, { allSt: false, det: false, stage: (() => { const m = myStages(), c = SG('def_stage') || (T.settings || {}).lastStage || 'primary'; return !m.length || m.includes(c) ? c : m[0]; })(), grade: null, sec: '', g: SG('def_gender') || '', custom: '', editing: false }); modal(ncHtml()); };
ACTS['nc2-st'] = t => { if (NC.stage !== t.dataset.v) NC.grade = null; NC.stage = t.dataset.v; NC.custom = ''; ncRender(); };
ACTS['nc2-gr'] = t => { NC.grade = Number(t.dataset.v); NC.custom = ''; ncRender(); };
ACTS['nc2-sec'] = t => { NC.sec = NC.sec === t.dataset.v ? '' : t.dataset.v; NC.custom = ''; ncRender(); };
ACTS['nc2-gd'] = t => { NC.g = NC.g === t.dataset.v ? '' : t.dataset.v; ncRender(); };
document.addEventListener('change', e => { if (e.target.name !== 'start_date') return; const f = e.target.form, b = f && f.querySelector('.cf2-go'); if (b && /ابدأ المسابقة|جدولة المسابقة/.test(b.textContent)) b.textContent = e.target.value > todayKW() ? 'جدولة المسابقة' : 'ابدأ المسابقة'; });
document.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('nc2-det')) NC.det = e.target.open; }, true);
ACTS['nc2-edit'] = () => { NC.editing = true; ncRender(); };
ACTS['nc2-all'] = () => { NC.allSt = true; ncRender(); };
ACTS['nc2-save'] = async t => {
  const inp = document.getElementById('nc2-in'); if (inp) NC.custom = inp.value.replace(/\s+/g, ' ').trim();
  const name = ncName(); if (name.length < 2) return toast('اختر الصف أو اكتب اسمه');
  if (CL.classes.some(c => c.name.trim() === name)) return toast('يوجد صف بنفس الاسم');
  t.disabled = true; t.textContent = 'جارٍ الإنشاء…';
  const style = NC.stage === 'primary' ? 'kids' : NC.stage === 'university' ? 'uni' : 'mid';
  const { data, error } = await sb.from('classes').insert({ teacher_id: T.user.id, name, stage: NC.stage, style, gender: NC.g || null }).select().single();
  if (error) { t.disabled = false; t.textContent = 'إنشاء الصف'; return toast(errMsg(error)); }
  if ((T.settings || {}).lastStage !== NC.stage) saveSettings({ lastStage: NC.stage });
  learnStage(NC.stage);
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
        const r = await sb.from('classes').insert({ teacher_id: T.user.id, name, stage: defStage(name), style: 'mid' }).select().single();
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
async function tClass(id){ CL.tab = 'classes'; CL.cur = id || null; if (!id) return location.replace('#/t/classes'); await tClasses(); }
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
    const c = CK.cls, m = t.closest('.cm2'); c.self_join = t.dataset.on === '1'; if (code && typeof code === 'string') c.join_code = code;
    if (m) { m.outerHTML = cmHtml(c); haptic(); return; } /* v254: stay in the sheet, no close/reopen */
    closeModals(); await tClasses();
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
    const r = await rpc('add_students', { p_class: CK.cls.id, p_rows: [{ name: f.name.value, student_no: f.no.value, phone: normPhone(f.ph.value), gender: (f.querySelector('[name=g]:checked') || {}).value || '' }] });
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
  const el = document.createElement('div'); el.id = 'snack'; el.className = 'snack'; el.setAttribute('role', 'status'); el.innerHTML = `<span>${esc(msg)}</span><button type="button">تراجع</button><i class="snack-bar" aria-hidden="true"></i>`;
  let done = false; const commit = () => { if (done) return; done = true; el.remove(); onCommit(); };
  el._commit = commit;
  el.querySelector('button').onclick = () => { if (done) return; done = true; el.remove(); onUndo(); };
  document.body.appendChild(el); setTimeout(commit, 5000);
}
window.addEventListener('pagehide', () => { const s2 = document.getElementById('snack'); if (s2 && s2._commit) s2._commit(); });
/* v268: deleting a student hides them (rpc teacher_hide_student, sql/keep_results.sql); history stays */
async function hideStu(ids){ for (const id of ids) { const { error } = await sb.rpc('teacher_hide_student', { p_student: id }); if (error) { toast(/teacher_hide_student|PGRST202|function/i.test(error.message || '') ? 'يحتاج تحديث قاعدة البيانات أول' : errMsg(error)); return false; } } return true; }
/* ===== v270 student report (teacher page, WhatsApp/PDF, student «تقريري») — sql/student_report.sql ===== */
const RP = { d: null, id: null, back: null, all: false };
const rpPct = (c, t) => t ? Math.round(c * 100 / t) : 0;
const rpLes = l => l === 'عام' ? 'أسئلة عامة' : l;
function rpLvl(x){ if (x.t < 4) return 'few'; const p = rpPct(x.c, x.t); return p >= 80 ? 'ok' : p >= 50 ? 'mid' : 'bad'; }
const RP_LV = { ok: 'متمكّن', mid: 'جيد', bad: 'يحتاج مراجعة', few: 'قليل' };
function rpTrend(d){ const w = (d.weeks || []).filter(x => x.t >= 3); if (w.length < 2) return null; return rpPct(w[w.length - 1].c, w[w.length - 1].t) - rpPct(w[0].c, w[0].t); }
function rpDate(s, y){ try { return new Date(s + 'T12:00:00').toLocaleDateString('ar-KW-u-nu-latn', y ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' }); } catch(e){ return s; } }
/* weekly line: newest on the left (RTL time) */
function rpChart(d, light){
  const w = (d.weeks || []).filter(x => x.t > 0); if (w.length < 2) return '';
  const n = w.length, X = i => n === 1 ? 150 : 285 - i * (270 / (n - 1)), Y = p => 85 - p * .65, pts = w.map((x, i) => [X(i), Y(rpPct(x.c, x.t))]);
  const ln = light ? '#C8102E' : '#FFD60A', grid = light ? '#EEEEF1' : '#2C2C2E', txt = light ? '#16161A' : '#fff', mut = light ? '#6B6B73' : '#8E8E93';
  const last = w[n - 1], first = w[0];
  return `<svg viewBox="0 0 300 100" class="rp2-svg" aria-label="نسبة الإجابات الصحيحة أسبوع بأسبوع">${[20, 52, 85].map(y => `<line x1="0" y1="${y}" x2="300" y2="${y}" stroke="${grid}"/>`).join('')}
    ${light ? `<polygon fill="${ln}" fill-opacity=".08" points="${pts.map(p => p.join(',')).join(' ')} ${pts[n - 1][0]},85 ${pts[0][0]},85"/>` : ''}
    <polyline fill="none" stroke="${ln}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" points="${pts.map(p => p.join(',')).join(' ')}"/>
    ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === n - 1 ? 4.5 : 3.5}" fill="${i === n - 1 || !light ? ln : '#fff'}" stroke="${ln}" stroke-width="2"/>`).join('')}
    <text x="${pts[n - 1][0]}" y="${Math.max(11, pts[n - 1][1] - 9)}" fill="${txt}" font-size="11" font-weight="700" text-anchor="middle">${rpPct(last.c, last.t)}%</text>
    <text x="${pts[0][0]}" y="${Math.min(97, pts[0][1] + 16)}" fill="${mut}" font-size="10" text-anchor="middle">${rpPct(first.c, first.t)}%</text></svg>
    <div class="rp2-wk"><span>${rpDate(first.w)}</span><span>هالأسبوع</span></div>`;
}
function rpOpen(id){ RP.back = location.hash; go('#/t/rep/' + id); }
ACTS['s-rep'] = t => { closeModals(); rpOpen(t.dataset.id); };
async function tStuRep(id){
  const back = RP.back && RP.back.indexOf('/rep/') < 0 ? RP.back : '#/t/classes';
  view('تقرير الطالب', '<div class="spin"></div>', 'classes', '', back);
  let d; try { d = await rpc('teacher_student_report2', { p_student: id }); }
  catch(e){ return view('تقرير الطالب', `<p class="sub center">${/PGRST202|teacher_student_report2/.test(e.message || '') ? 'يحتاج تحديث قاعدة البيانات أول' : esc(errMsg(e))}</p>`, 'classes', '', back); }
  RP.d = d; RP.id = id; RP.all = false;
  view('تقرير الطالب', rpHtml(d), 'classes', '', back);
}
function rpHtml(d){
  const acc = rpPct(d.correct, d.total), tr = rpTrend(d), name = fmtStu(d.name || '');
  const hero = `<div class="rp2-hero"><div class="rp2-av">${esc(d.avatar || (d.name || '?').trim().charAt(0))}</div><b class="rp2-nm">${esc(name)}</b>
    <div class="rp2-pills">${d.cls ? `<span>${esc(d.cls)}</span>` : ''}<span class="g">المستوى ${lvlOf(d.xp || 0).n}</span>${d.streak ? `<span>🔥 ${d.streak} ${d.streak > 2 && d.streak < 11 ? 'أيام' : 'يوم'}</span>` : ''}</div>`;
  if (!d.rounds) return hero + `<div class="rp2-empty">ما لعب جولات رسمية للحين.${d.practice ? `<br><small>تدرّب ${d.practice} ${d.practice > 2 && d.practice < 11 ? 'مرات' : 'مرة'} بدون نقاط.</small>` : ''}</div></div>`;
  const les = d.lessons || [], wr = d.wrong || [], cm = d.comps || [];
  return hero + `<div class="rp2-nums"><div><b>${d.rounds}</b><small>جولة</small></div><div><b>${acc}%</b><small>صح</small></div><div><b>${d.avg_secs != null ? Math.round(d.avg_secs) + 'ث' : '—'}</b><small>السرعة</small></div><div><b>${d.rank || '—'}</b><small>ترتيبه</small></div></div></div>
    ${tr != null ? `<h3 class="rp2-h">هل يتحسن؟</h3><div class="rp2-card"><p class="rp2-say">${tr > 2 ? `إجاباته الصحيحة زادت <b class="up">${tr}%</b> من أول أسبوع.` : tr < -2 ? `إجاباته الصحيحة نزلت <b class="dn">${-tr}%</b> عن أول أسبوع.` : 'مستواه ثابت من أول أسبوع.'}</p>${rpChart(d)}</div>` : ''}
    ${les.length ? `<h3 class="rp2-h">دروسه</h3><div class="rp2-les">${les.map(x => { const k = rpLvl(x); return `<div class="rp2-l k-${k}"><i></i><span class="grow">${esc(rpLes(x.l))}</span><b>${k === 'few' ? 'قليل' : rpPct(x.c, x.t) + '%'}</b></div>`; }).join('')}</div>
      <div class="rp2-key"><span><i class="k-ok"></i>متمكّن</span><span><i class="k-mid"></i>بين بين</span><span><i class="k-bad"></i>يحتاج مراجعة</span></div>` : ''}
    ${wr.length ? `<h3 class="rp2-h">وين يغلط؟</h3><div id="rp2-wr">${rpWrong(wr)}</div>` : ''}
    ${cm.length || d.gone ? `<details class="rp2-det"><summary>التحديات اللي لعبها <span>${cm.length + (d.gone ? 1 : 0)}</span></summary>${cm.map(c => `<div class="rp2-ch"><b>${esc(c.t)}</b><span>${c.p ? (c.r <= 3 ? ['🥇', '🥈', '🥉'][c.r - 1] + ' ' : '') + 'المركز ' + c.r : '—'}</span></div>`).join('')}${d.gone ? `<div class="rp2-ch"><b>تحديات محذوفة</b><span class="gone">نتيجتها محفوظة</span></div>` : ''}</details>` : ''}
    <div class="rp2-bar"><button class="btn" data-act="rp-send">📤 أرسل التقرير</button></div>`;
}
function rpWrong(wr){ const list = RP.all ? wr : wr.slice(0, 3);
  return list.map(w => `<div class="rp2-mis"><q>${esc(w.q)}</q><div class="a">${w.chosen ? `<span class="w">✗ ${esc(w.chosen)}</span>` : '<span class="w">✗ ما جاوب</span>'}<span class="c">✓ ${esc(w.right || '')}</span></div></div>`).join('') +
    (!RP.all && wr.length > 3 ? `<button class="rp2-more" data-act="rp-more">كل أخطائه (${wr.length}) ‹</button>` : ''); }
ACTS['rp-more'] = () => { RP.all = true; const el = document.getElementById('rp2-wr'); if (el && RP.d) el.innerHTML = rpWrong(RP.d.wrong || []); };
ACTS['rp-send'] = () => { if (!RP.d) return; const n = fmtStu(RP.d.name || '');
  modal(`<div class="st1"><div class="st1-h"><b>أرسل تقرير ${esc(n.split(' ')[0])}</b><button class="icon-btn st1-x" data-act="close-modal" aria-label="إغلاق">${ic('x')}</button></div>
    <textarea id="rp-note" class="input rp2-note" rows="2" maxlength="300" placeholder="ملاحظتك (اختياري)">${esc(RP.note || '')}</textarea>
    <div class="st1-opts"><button class="st1-o" data-act="rp-wa"><span class="e">💬</span><b>واتساب</b></button><button class="st1-o" data-act="rp-pdf"><span class="e">📄</span><b>ملف PDF</b></button></div></div>`); };
const rpNote = () => { const el = document.getElementById('rp-note'); if (el) RP.note = el.value.trim(); return RP.note || ''; };
function rpSummary(d){ const acc = rpPct(d.correct, d.total), les = (d.lessons || []).filter(x => x.t >= 4), tr = rpTrend(d);
  const s = les.filter(x => rpLvl(x) === 'ok').map(x => rpLes(x.l)), w = les.filter(x => rpLvl(x) === 'bad').map(x => rpLes(x.l));
  return { acc, tr, s, w }; }
ACTS['rp-wa'] = async () => { const d = RP.d; if (!d) return; const note = rpNote(), m = rpSummary(d);
  let ph = ''; try { const r = await sb.from('students').select('phone').eq('id', RP.id).maybeSingle(); ph = (r.data && r.data.phone || '').replace(/[^0-9]/g, ''); } catch(e){}
  if (ph.length === 8) ph = '965' + ph; else if (ph.startsWith('00')) ph = ph.slice(2);
  const txt = `تقرير ${fmtStu(d.name || '')}${d.cls ? ' · ' + d.cls : ''}\n` +
    `لعب ${d.rounds} جولة، وإجاباته الصحيحة ${m.acc}%` + (m.tr != null && m.tr > 2 ? ` (تحسّن ${m.tr}%)` : '') + `.\n` +
    (m.s.length ? `💪 قوي في: ${m.s.join('، ')}\n` : '') + (m.w.length ? `🎯 يحتاج مراجعة: ${m.w.join('، ')}\n` : '') +
    (note ? `\n${note}\n` : '') + `\n${T.name || ''}`;
  closeModals(); window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(txt), '_blank'); };
/* PDF v2 (Khalid sample style): red band header, rings per lesson, class average, radar + bars, page 2 summary/progress/mistakes */
const RP_GR = p => p >= 90 ? ['ممتاز', 'ok'] : p >= 80 ? ['جيد جداً', 'ok'] : p >= 65 ? ['جيد', 'mid'] : p >= 50 ? ['مقبول', 'mid'] : ['يحتاج تطوير', 'bad'];
const RP_COL = { ok: '#1E8E4E', mid: '#D9930D', bad: '#C8102E' };
function rpRing(p, k, size, w){ const r = (size - w) / 2, C = 2 * Math.PI * r, f = Math.max(0, Math.min(100, p)) / 100;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#F0E6D6" stroke-width="${w}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${RP_COL[k]}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${(C * f).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`; }
function rpRadar(les){ const n = les.length, R = 105, cx = 160, cy = 140, ang = i => -Math.PI / 2 + i * 2 * Math.PI / n, pt = (i, p) => [cx + Math.cos(ang(i)) * R * p / 100, cy + Math.sin(ang(i)) * R * p / 100];
  const poly = f => les.map((x, i) => pt(i, f(x)).map(v => v.toFixed(1)).join(',')).join(' ');
  const grid = [25, 50, 75, 100].map(g => `<polygon points="${les.map((x, i) => pt(i, g).map(v => v.toFixed(1)).join(',')).join(' ')}" fill="${g === 100 ? '#FBF6EC' : 'none'}" stroke="#EADFC8" stroke-width="1"/>`).join('') + les.map((x, i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, 100)[0].toFixed(1)}" y2="${pt(i, 100)[1].toFixed(1)}" stroke="#EADFC8"/>`).join('');
  const me = les.map((x, i) => pt(i, rpPct(x.c, x.t)));
  const svg = `<svg viewBox="0 0 320 280" width="320" height="280">${grid}
    ${les.some(x => x.ca != null) ? `<polygon points="${poly(x => x.ca || 0)}" fill="none" stroke="#3B2A1A" stroke-width="1.6" stroke-dasharray="5 4"/>` : ''}
    <polygon points="${poly(x => rpPct(x.c, x.t))}" fill="#C8102E" fill-opacity=".22" stroke="#C8102E" stroke-width="2.4" stroke-linejoin="round"/>
    ${me.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" fill="#C8102E"/>`).join('')}</svg>`;
  const lbl = les.map((x, i) => { const p = pt(i, 122), a = Math.cos(ang(i)); return `<span class="rp4-rl" style="top:${(p[1] - 9).toFixed(0)}px;${Math.abs(a) < .2 ? `left:${(p[0] - 70).toFixed(0)}px;width:140px;text-align:center` : a > 0 ? `left:${(p[0] - 6).toFixed(0)}px;text-align:left` : `right:${(320 - p[0] - 6).toFixed(0)}px;text-align:right`}">${esc(rpLes(x.l))}</span>`; }).join('');
  return `<div class="rp4-radar">${svg}${lbl}</div>`; }
function rpPdfHtml(d, note){
  const m = rpSummary(d), les = (d.lessons || []).filter(x => x.t >= 3), today = new Date().toISOString().slice(0, 10), subj = SG('prof_subject').split('|').filter(Boolean)[0] || '';
  const name = fmtStu(d.name || ''), ini = (d.name || '?').trim().charAt(0), acc = m.acc, g0 = RP_GR(acc), ca = d.cls_acc;
  const head = `<div class="rp4-hd"><img src="icon-192.png?i=10" alt=""><div class="grow"><h1>تقرير أداء الطالب</h1><small>اهزم الدقيقة${d.cls ? ' · الصف ' + esc(d.cls) : ''}${subj ? ' · ' + esc(subj) : ''}</small></div><span class="rp4-dt">${rpDate(today, 1)}</span></div>`;
  const foot = n => `<div class="rp4-ft"><span>${esc(d.school || 'اهزم الدقيقة')}${d.teacher ? ' · المعلم: ' + esc(d.teacher) : ''}</span><span>${n} / 2</span></div>`;
  const diff = (a, b) => b == null ? '' : a >= b ? ` · <b class="g">أعلى بـ ${a - b}</b>` : ` · <b class="r">أقل بـ ${b - a}</b>`;
  const top = les.slice(0, 3), bars = les.slice(0, 8);
  const p1 = `<div class="rp4-pg">${head}<div class="rp4-bd">
    <div class="rp4-card rp4-who"><span class="rp4-ini">${esc(ini)}</span><div class="grow"><b>${esc(name)}</b><small>${[d.cls ? 'الصف ' + d.cls : '', d.from ? 'من ' + rpDate(d.from) + ' إلى ' + rpDate(d.to, 1) : ''].filter(Boolean).map(esc).join(' · ')}</small></div>
      <div class="rp4-ring big">${rpRing(acc, g0[1], 110, 14)}<span><b>${acc}%</b><small>نسبة الصح</small></span></div></div>
    <div class="rp4-kpi">
      <div class="rp4-card"><b>${d.rounds}</b><small>جولة رسمية</small></div>
      <div class="rp4-card"><b style="color:${RP_COL[g0[1]]}">${acc}%</b><small>نسبة الصح${ca != null ? ' · الصف ' + ca + '%' : ''}</small></div>
      <div class="rp4-card"><b>${d.avg_secs != null ? Math.max(1, Math.round(d.avg_secs)) + ' ث' : '—'}</b><small>متوسط سرعة الإجابة</small></div>
      <div class="rp4-card"><b>${d.rank || '—'}</b><small>الترتيب${d.of ? ' من ' + d.of : ''}</small></div></div>
    ${top.length ? `<h2>الدروس الأساسية</h2><div class="rp4-tops n${top.length}">${top.map(x => { const p = rpPct(x.c, x.t), g = RP_GR(p); return `<div class="rp4-card rp4-top"><b class="t">${esc(rpLes(x.l))}</b>
      <div class="rp4-ring">${rpRing(p, g[1], 120, 15)}<span><b>${p}%</b><small>${x.t} سؤال</small></span></div>
      <b class="rp4-gr" style="color:${RP_COL[g[1]]}">${g[0]}</b><small>${x.ca != null ? 'متوسط الصف ' + x.ca + '%' + diff(p, x.ca) : '&nbsp;'}</small></div>`; }).join('')}</div>` : ''}
    ${bars.length >= 2 ? `<h2>الأداء حسب الدرس</h2><div class="rp4-two${bars.length >= 3 ? '' : ' one'}">
      ${bars.length >= 3 ? `<div class="rp4-card">${rpRadar(bars)}<div class="rp4-leg"><span><i style="background:#C8102E"></i>الطالب</span><span><i style="background:#3B2A1A"></i>متوسط الصف</span></div></div>` : ''}
      <div class="rp4-card rp4-bars">${bars.map(x => { const p = rpPct(x.c, x.t), g = RP_GR(p); return `<div class="rp4-br"><span class="n">${esc(rpLes(x.l))}</span><div class="tr"><i style="width:${Math.max(4, p)}%;background:${RP_COL[g[1]]}"></i>${x.ca != null ? `<u style="right:${x.ca}%"></u>` : ''}</div><b class="p">${p}%</b></div>`; }).join('')}
        <div class="rp4-ax"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
        <div class="rp4-leg"><span><i style="background:${RP_COL.ok}"></i>80% فأكثر</span><span><i style="background:${RP_COL.mid}"></i>50–79%</span><span><i style="background:${RP_COL.bad}"></i>أقل من 50%</span><span><i class="ln"></i>متوسط الصف</span></div></div></div>` : ''}
  </div>${foot(1)}</div>`;
  const wr = (d.wrong || []).slice(0, 10), recs = [];
  m.w.forEach(x => recs.push(`مراجعة درس ${x} والتدرّب على أسئلته.`));
  if (d.avg_secs != null && d.avg_secs < 4 && acc < 60) recs.push('التأني في قراءة الخيارات قبل الإجابة.');
  if (m.tr != null && m.tr < -2) recs.push('مستواه نزل مؤخراً، يحتاج تشجيع ومتابعة.');
  if (!recs.length) recs.push(acc >= 85 ? 'مستوى ممتاز، نشجعه على الاستمرار.' : 'الاستمرار على الجولة اليومية يرفع المستوى.');
  const p2 = `<div class="rp4-pg">${head}<div class="rp4-bd">
    <h2>الخلاصة والتوصيات</h2><div class="rp4-two eq"><div class="rp4-card rp4-chips">${m.s.map(x => `<span class="g">💪 ${esc(x)} ${rpPct(les.find(y => rpLes(y.l) === x).c, les.find(y => rpLes(y.l) === x).t)}%</span>`).join('')}${m.w.map(x => `<span class="r">⚠️ ${esc(x)} ${rpPct(les.find(y => rpLes(y.l) === x).c, les.find(y => rpLes(y.l) === x).t)}%</span>`).join('')}${!m.s.length && !m.w.length ? '<small>تتضح نقاط القوة والضعف مع جولات أكثر.</small>' : ''}</div>
      <div class="rp4-card rp4-recs">${recs.map(x => `<div>• ${esc(x)}</div>`).join('')}</div></div>
    ${(d.weeks || []).filter(x => x.t > 0).length >= 2 ? `<h2>التقدم أسبوع بأسبوع</h2><div class="rp4-card">${m.tr != null ? `<p class="rp4-say">${m.tr > 2 ? `نسبة الصح زادت <b class="g">${m.tr}%</b> من أول أسبوع.` : m.tr < -2 ? `نسبة الصح نزلت <b class="r">${-m.tr}%</b> عن أول أسبوع.` : 'مستواه ثابت من أول أسبوع.'}</p>` : ''}${rpChart(d, 1)}</div>` : ''}
    ${wr.length ? `<h2>أسئلة أخطأ فيها: ${(d.wrong || []).length}</h2><div class="rp4-wr"><div class="rp4-wh"><span>الدرس</span><span>السؤال</span><span>إجابته</span><span>الإجابة الصحيحة</span></div>
      ${wr.map(w => `<div class="rp4-card rp4-wrow"><span class="l">${esc(rpLes(w.l || ''))}</span><span class="q">${esc(w.q)}</span><span class="x">${w.chosen ? esc(w.chosen) : 'ما جاوب'}</span><span class="c">${esc(w.right || '')}</span></div>`).join('')}</div>` : ''}
    ${note ? `<h2>ملاحظة المعلم</h2><div class="rp4-card rp4-note">${esc(note)}</div>` : ''}
    <div class="rp4-sig"><div>توقيع المعلم</div><div>توقيع ولي الأمر</div></div>
  </div>${foot(2)}</div>`;
  return p1 + p2;
}
/* html2canvas draws inline SVG badly: swap each chart for an <img> of itself */
function rpSvgImg(root){ root.querySelectorAll('svg').forEach(sv => { const c = sv.cloneNode(true), w = sv.getAttribute('width'), h = sv.getAttribute('height'); c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); c.setAttribute('font-family', 'Arial, sans-serif');
  if (!w) { c.setAttribute('width', '600'); c.setAttribute('height', '200'); }
  const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(c.outerHTML); im.style.cssText = w ? `display:block;width:${w}px;height:${h}px;flex:none` : 'display:block;width:100%;height:auto'; sv.replaceWith(im); }); }
ACTS['rp-pdf'] = async t => { const d = RP.d; if (!d) return; const note = rpNote(); t.disabled = true; toast('جاري تجهيز الملف…');
  const host = document.createElement('div'); host.className = 'rp-pdf-host';
  const page = document.createElement('div'); page.className = 'rp4'; page.dir = 'rtl'; page.innerHTML = rpPdfHtml(d, note);
  host.appendChild(page); document.body.appendChild(host); rpSvgImg(page); rpSplitWords(page);
  const file = 'تقرير-' + String(d.name || 'طالب').replace(/[\\/:*?"<>|]/g, '-') + '.pdf';
  try {
    await loadScript(H2P); try { await document.fonts.ready; } catch(e){}
    await Promise.all([...page.querySelectorAll('img')].map(i => i.decode ? i.decode().catch(() => {}) : 0));
    const _sy = window.scrollY; window.scrollTo(0, 0);
    const w = html2pdf().set({ margin: 0, filename: file, image: { type: 'jpeg', quality: 0.96 }, html2canvas: { scale: 2, scrollX: 0, scrollY: 0, useCORS: true, backgroundColor: '#ffffff' }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: [] } }).from(page);
    const blob = await w.outputPdf('blob'), f = new File([blob], file, { type: 'application/pdf' }); window.scrollTo(0, _sy);
    closeModals();
    if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: file }); } catch(e){} }
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); toast('تم تنزيل التقرير'); }
  } catch(e){ toast('ما قدرنا نجهز الملف، جرّب مرة ثانية'); }
  finally { host.remove(); t.disabled = false; }
};
/* student: «تقريري» in «أنا» */
ACTS['s-rep-me'] = async () => { if (!S.home) return;
  sPage('me', '<div class="s-pgc"><div class="spin"></div></div>');
  let d; try { d = await rpc('student_my_report', { p_token: S.token }); } catch(e){ toast(errMsg(e)); return ACTS['s-tab']({ dataset: { t: 'me' } }); }
  if (S.tab !== 'me') return;
  const les = (d.lessons || []).filter(x => x.t >= 4), s = les.filter(x => rpLvl(x) === 'ok'), w = les.filter(x => rpLvl(x) !== 'ok' && rpLvl(x) !== 'few').sort((a, b) => a.c / a.t - b.c / b.t).slice(0, 4), tr = rpTrend(d);
  const c = document.querySelector('.s-tabpg .s-pgc'); if (!c) return;
  c.innerHTML = `<div class="rp2-top"><button class="icon-btn" data-act="s-tab" data-t="me" aria-label="رجوع">${ic('back')}</button><h3>📊 تقريري</h3></div>
    <div class="rp2-hero"><div class="rp2-nums n3"><div><b>${d.rounds}</b><small>جولة</small></div><div><b>${rpPct(d.correct, d.total)}%</b><small>صح</small></div><div><b>${tr != null && tr > 0 ? '↑' + tr + '%' : lvlOf(d.xp || 0).n}</b><small>${tr != null && tr > 0 ? 'تحسّنت' : 'مستواك'}</small></div></div></div>
    ${!d.rounds ? '<div class="rp2-empty">العب جولات، وتقريرك يطلع هني.</div>' : `
    <h3 class="rp2-h">💪 دروسك القوية</h3>${s.length ? `<div class="rp2-chips">${s.map(x => `<span class="k-ok">${esc(rpLes(x.l))}</span>`).join('')}</div>` : '<p class="rp2-mut">تطلع هني لما تجاوب صح في درس أكثر من مرة.</p>'}
    <h3 class="rp2-h">🎯 تحتاج تدريب</h3>${w.length ? `<div class="rp2-chips">${w.map(x => `<span class="k-w">${esc(rpLes(x.l))}</span>`).join('')}</div>` : '<p class="rp2-mut">ما فيه دروس ضعيفة، كفو! 👏</p>'}
    <button class="btn soft rp2-prac" data-act="s-start" data-kind="practice">🔁 تدرّب بدون نقاط</button>`}
    <p class="rp2-note2">كل أسبوع تشوف هني كيف تتحسّن. التدريب ما يأثر على نقاطك.</p>`;
};
async function tHidden(){
  view('الطلاب المحذوفين', '<div class="spin"></div>', 'settings', '', '#/t/sset');
  let d = []; try { d = await rpc('teacher_hidden_students'); } catch(e){ return view('الطلاب المحذوفين', `<p class="sub center">${esc(errMsg(e))}</p>`, 'settings', '', '#/t/sset'); }
  view('الطلاب المحذوفين', d.length ? sGrp('', d.map(x => `<div class="set-row"><span class="grow"><b>${esc(x.name)}</b><small class="sub" style="display:block">${esc(x.cls || 'صف محذوف')} · ${x.rounds} جولة</small></span><button class="btn sm soft" data-act="hs-back" data-id="${x.id}">رجّعه</button><button class="btn sm soft dng-t" data-act="hs-purge" data-id="${x.id}" data-n="${esc(x.name)}" aria-label="حذف نهائي">${ic('trash')}</button></div>`), 'نتائجهم محفوظة وتنحسب في تقاريرهم. «رجّعه» يرجّعه لصفه بنفس نقاطه.')
    : `<div class="cl-empty sm"><b>ما فيه طلاب محذوفين</b><small>لما تحذف طالب يطلع هنا، ونتائجه تبقى محفوظة.</small></div>`, 'settings', '', '#/t/sset');
}
ACTS['hs-back'] = async t => { try { await rpc('teacher_restore_student', { p_student: t.dataset.id }); toast('رجع لصفه ✓'); CL.loaded = false; tHidden(); } catch(e){ toast(/class_gone/.test(e.message || '') ? 'صفه انحذف، ما نقدر نرجعه' : errMsg(e)); } };
ACTS['hs-purge'] = async t => { if (!await ask('تنحذف نتائجه كلها، وما ترجع.', { title: `حذف ${t.dataset.n} نهائياً؟`, ok: 'حذف', cancel: 'لا', danger: true })) return;
  try { await rpc('teacher_purge_student', { p_student: t.dataset.id }); toast('انحذف'); tHidden(); } catch(e){ toast(errMsg(e)); } };
ACTS['t-del-student'] = async t => { const c = ctx(t); closeModals();
  const arr = CL.students[c.id] || [], st0 = arr.find(x => x.id === t.dataset.id); if (!st0) return;
  if (!await ask('يطلع من الصف، ونتائجه تبقى محفوظة. تقدر ترجعه من الإعدادات.', { title: `حذف ${st0.name}؟`, ok: 'حذف', cancel: 'لا', danger: true })) return;
  if (!await hideStu([st0.id])) return;
  const i = arr.findIndex(x => x.id === st0.id); if (i >= 0) arr.splice(i, 1);
  renderClasses(); toast('تم حذف ' + st0.name);
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
  document.getElementById('print-area').innerHTML = `<h2 style="text-align:center;margin:0 0 10px">${esc(CK.cls.name)} — رموز الدخول إلى «اهزم الدقيقة»</h2><p style="text-align:center;direction:ltr;margin:0 0 12px">${esc(url)}</p>` +
    `<div class="pcards">${CK.students.map(s => `<div class="pcard${qr ? ' qr' : ''}">${qr ? `<div class="pq">${qrSvg(url + '#/c/' + s.code)}</div>` : ''}<div><b>${esc(s.name)}</b><div class="pc">${esc(s.code)}</div><small>${esc(s.student_no)}</small></div></div>`).join('')}</div>` + (qr ? '<p style="text-align:center;font-size:12px;margin-top:10px">امسح الرمز بكاميرا الجوال للدخول مباشرة، أو اكتب الرمز في الموقع.</p>' : '');
  /* v252: iPhone app can't open the print dialog, so show the cards first; print / share from there */
  const w = document.createElement('div'); w.className = 'pcv'; w.innerHTML = `<div class="pcv-bar"><button class="btn sm soft" data-x>إغلاق</button><b>بطاقات الدخول</b><button class="btn sm" data-p>🖨️ طباعة</button></div><p class="pcv-t">بطاقة لكل طالب فيها اسمه ورمزه وQR. تطبعها وتوزعها، والطالب يمسح الـQR بالجوال ويدخل على طول بدون ما يكتب شي.</p><div class="pcv-in">${document.getElementById('print-area').innerHTML}</div>`;
  w.querySelector('[data-x]').onclick = () => w.remove();
  w.querySelector('[data-p]').onclick = () => { try { window.print(); } catch(e){} setTimeout(() => { if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) toast('إذا ما طلعت الطباعة: افتح الموقع من Safari واطبع من هناك'); }, 1200); };
  closeModals(); document.body.appendChild(w);
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
  /* v119: active challenges live on the home page; this page is only the past ones */
  return cpPast() || '<div class="h-empty"><div class="h-em">🏆</div><b>ما فيه تحديات سابقة</b><small>لما ينتهي تحدي، يطلع هنا مع نتائجه</small></div>';
}
function cpPast(){
  const by = {}, order = []; (CL.past || []).forEach(k => { if (!by[k.group_id]) { by[k.group_id] = []; order.push(k.group_id); } by[k.group_id].push(k); });
  if (!order.length) return '';
  return `<div class="cp-past"><div class="qsubs">${order.map(gid => { const g = by[gid], c = g[0];
    return `<div class="cpp-row"><a class="qsub" href="#/t/results/${c.class_id}/${c.id}"><span class="qsub-ic" style="--c:#8E8E93">${ic('trophy')}</span><span class="grow"><b>${esc(c.title)}</b><small>${esc(fmtDate(c.start_date))} ← ${esc(fmtDate(c.end_date))} · ${g.map(x => esc((CL.byId[x.class_id] || {}).name || '')).filter(Boolean).join('، ')}</small></span><i>‹</i></a><button class="cpp-del" data-act="cp-del-past" data-g="${esc(gid)}" aria-label="حذف نهائي">${ic('trash')}</button></div>`; }).join('')}</div></div>`;
}
ACTS['cp-del-past'] = async t => {
  const gid = t.dataset.g, k = (CL.past || []).find(x => x.group_id === gid); if (!k) return;
  if (!await ask('يختفي من القائمة. نقاط الطلاب ومستوياتهم وتقاريرهم تبقى.', { title: `حذف «${k.title.split('·').pop().trim()}»؟`, danger: true, ok: 'حذف', cancel: 'لا' })) return;
  const { error } = await sb.from('competitions').delete().eq('group_id', gid).eq('status', 'finished'); if (!error) NT.items = NT.items.filter(x => x.k !== 'e:' + gid);
  if (error) return toast(errMsg(error));
  Object.keys(PCACHE).forEach(h => { if (h.indexOf('#/t/results') === 0) delete PCACHE[h]; });
  toast('تم حذف المسابقة نهائياً'); await tClasses();
};
ACTS['cp-pause'] = async t => {
  if (!await ask('الطلاب ما يلعبون لين تستأنفه، والنقاط تبقى.', { title: 'إيقاف التحدي؟', ok: 'إيقاف', cancel: 'لا', danger: false})) return;
  const { error } = await sb.from('competitions').update({ paused_at: new Date().toISOString() }).eq('group_id', t.dataset.g).eq('status', 'active');
  if (error) return toast(errMsg(error)); toast('تم إيقاف المسابقة مؤقتاً'); await tClasses();
};
ACTS['cp-resume'] = async t => {
  const ks = (CL.allComps || []).filter(k => k.group_id === t.dataset.g); if (!ks.length) return;
  const today = todayKW();
  try {
    for (const k of ks) {
      const from = String(k.paused_at || '').slice(0, 10) || today, d = Math.max(0, cfDays(from, today));
      const u = { paused_at: null };
      if (d) { if (k.start_date > from) u.start_date = addDays(k.start_date, d); u.points_end_date = addDays(k.points_end_date, d); u.end_date = addDays(k.end_date, d); }
      const { error } = await sb.from('competitions').update(u).eq('id', k.id); if (error) throw error;
    }
    toast('رجعت المسابقة، والمواعيد تأخرت بعدد أيام الإيقاف'); await tClasses();
  } catch(e){ toast(errMsg(e)); }
};
ACTS['t-remind'] = t => {
  const s = (T.homeStats || []).find(x => x.c.id === t.dataset.c); if (!s) return;
  const left = s.rs.filter(r => !r.played_today).map(r => r.name);
  const msg = `تذكير من «اهزم الدقيقة» ⏱️\nجولة اليوم ما زالت مفتوحة لصف ${s.c.name} حتى منتصف الليل.\nلم يلعب بعد (${left.length}): ${left.join('، ')}\nادخلوا من هنا: ${location.origin + location.pathname}`;
  open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
};
ACTS['cp-new'] = async () => {
  if (!CL.classes.length) return toast('أضف صفاً أولاً');
  await loadCurricula().catch(() => {});
  T.compEdit = 'new'; CC.sel = new Set(CL.classes.filter(c => !CL.comps[c.id]).map(c => c.id));
  const st = T.settings || {}; CC.qtypes = (st.qtypes || ['curriculum', 'general', 'quick']).slice(); CC.diff = st.difficulty || 'normal'; CC.cu = ''; CC.lessons = []; CC.cus = null; CC.gsel = null; CC.style = (CL.classes.find(c => CC.sel.has(c.id)) || CL.classes[0]).style || 'mid';
  renderClasses();
};
ACTS['cp-edit'] = async t => {
  await loadCurricula().catch(() => {});
  T.compEdit = t.dataset.g;
  const g = CL.allComps.filter(c => c.group_id === T.compEdit);
  CC.sel = new Set(g.map(c => c.class_id));
  const first = CL.byId[g[0].class_id] || {}; CC.qtypes = (g[0].qtypes || first.qtypes || ['curriculum', 'general', 'quick']).slice(); CC.diff = g[0].difficulty || 'normal'; CC.cu = g[0].curriculum_id || ''; CC.lessons = (g[0].lessons || []).slice(); CC.style = first.style || 'mid'; if (CC.cu && !CC.qtypes.includes('curriculum')) CC.qtypes = ['curriculum'].concat(CC.qtypes);
  CC.cus = g[0].curricula && g[0].curricula.length ? g[0].curricula.slice() : CC.cu ? [CC.cu] : []; CC.gsel = CC.qtypes.filter(x => x !== 'curriculum');
  await qCounts().catch(() => {});
  renderClasses();
};
ACTS['cp-cancel'] = () => { T.compEdit = null; if (location.hash.indexOf('#/t/ch/') === 0) return renderClasses(); if (location.hash.indexOf('#/t/new') === 0) return go('#/t/home'); renderClasses(); };
ACTS['cp-end'] = async t => {
  if (!await ask('النتائج تبقى في «التحديات السابقة».', { title: 'إنهاء التحدي؟', ok: 'إنهاء', cancel: 'لا', danger: true})) return;
  if (SG('msg_auto')) { const ks = (CL.allComps || []).filter(k => k.group_id === t.dataset.g); for (const k of ks) { try { const rs = await rpc('teacher_class_results', { p_class: k.class_id }); await autoPraise(k.class_id, k.id, rs.map(r => Object.assign({ cls: (CL.byId[k.class_id] || {}).name || '' }, r))); } catch(e){} } }
  const { error } = await sb.from('competitions').update({ status: 'finished' }).eq('group_id', t.dataset.g);
  if (error) return toast(errMsg(error)); await tClasses();
};
const CF_STYLES = [['kids', 'مرح', 'ابتدائي'], ['mid', 'مرح قليلاً', 'متوسط'], ['uni', 'هادئ', 'ثانوي وجامعة']];
function compForm(){
  const isNew = T.compEdit === 'new', t = todayKW();
  const g = isNew ? null : CL.allComps.find(c => c.group_id === T.compEdit);
  const v = g || Object.assign({ title: cfAutoTitle(), start_date: t, group_size: 6, qualifiers: 8, round_window_hours: 24 }, cfSpan(t, 7, 8, 24));
  if (isNew) { CC.titleManual = false; CC.styleManual = false; } else { CC.titleManual = true; CC.styleManual = true; }
  CC.ko = v.end_date > v.points_end_date;
  const step = (name, label, val, min, max, hint) => `<div class="set-row cf-row"><span class="grow">${label}${hint ? `<small class="cf-hint">${hint}</small>` : ''}</span><div class="cf-step"><button type="button" data-act="cf-step" data-n="${name}" data-d="-1" aria-label="إنقاص">−</button><input name="${name}" type="number" inputmode="numeric" min="${min}" max="${max}" value="${val}"><button type="button" data-act="cf-step" data-n="${name}" data-d="1" aria-label="زيادة">+</button></div></div>`;
  if (!isNew) return compEditForm(v);
  const date = (name, label, val) => `<label class="set-row cf-row"><span class="grow">${label}</span><input class="cf-date" type="date" name="${name}" value="${val}" required></label>`;
  return `<form class="col cf cf2" data-form="cp-save">
    <div class="cf2-head"><input class="cf2-title" id="cf-title" name="title" value="${esc(v.title)}" required maxlength="80" aria-label="عنوان المسابقة"><span class="cf2-pen">${ic('edit')}</span></div>
    <div class="cf2-sum" id="cf-sum"></div>
    <section class="cf2-sec"><div class="cf2-q"><span>1</span>أي صف؟<em id="cf-cnt"></em>${CL.classes.length > 2 ? '<button type="button" class="link" data-act="cp-all">الكل</button>' : ''}</div>
      <div class="cf2-cls">${CL.classes.map(c => { const other = CL.comps[c.id] && CL.comps[c.id].group_id !== T.compEdit; return `<button type="button" class="cf2-c ${CC.sel.has(c.id) ? 'on' : ''}" data-act="cp-cls" data-id="${c.id}">${ic('check')}<span>${esc(c.name)}</span>${other ? '<small>في مسابقة أخرى</small>' : ''}</button>`; }).join('')}</div></section>
    <section class="cf2-sec"><div class="cf2-q"><span>2</span>كم مدتها؟</div>
      <div class="cf2-dur">${CF_DUR.map(d => `<button type="button" data-act="cf-dur" data-d="${d[0]}">${d[1]}</button>`).join('')}</div>
      <div class="cf2-end" id="cf-end"></div><div class="cf-tl" id="cf-tl"></div></section>
    <section class="cf2-sec"><div class="cf2-q"><span>3</span>من أي أسئلة؟</div>
      <select class="input cf2-sel" name="cu" data-change="cp-cu">${cuOptions(CC.cu, 'كل الأسئلة المتاحة')}</select>
      <div class="cf-les" id="cf-les"></div><div class="cf-pool" id="cf-pool"></div></section>
    <details class="cf2-more"><summary>إعدادات إضافية <small>المواعيد، التصفيات، الصعوبة</small></summary>
      <div class="set-grp cf3">
        <label class="cf3-r"><span class="grow">تبدأ</span><b id="cf3-sd"></b><i>‹</i><input class="cf3-date" type="date" name="start_date" value="${v.start_date}" required></label>
        <div class="cf3-note" id="cf3-dates"></div>
        <input type="hidden" name="points_end_date" value="${v.points_end_date}"><input type="hidden" name="end_date" value="${v.end_date}">
        <input type="hidden" name="group_size" value="${v.group_size || 6}"><input type="hidden" name="qualifiers" value="${v.qualifiers || 8}"><input type="hidden" name="round_window_hours" value="${v.round_window_hours || 24}">
      </div>
      <div class="set-grp cf3">
        <button type="button" class="cf3-r" data-act="cf3-ko"><span class="grow">تصفيات في النهاية<small>الأوائل يتنافسون وجهاً لوجه</small></span><span class="ios-sw ${CC.ko ? 'on' : ''}" id="cf3-kosw"><i></i></span></button>
        <button type="button" class="cf3-r ${CC.ko ? '' : 'hide'}" id="cf3-qr" data-act="cf3-q"><span class="grow">عدد المتأهلين</span><b id="cf3-qv"></b><i>‹</i></button>
      </div>
      <div class="set-grp cf3">
        <button type="button" class="cf3-r" data-act="cf3-diff"><span class="grow">الصعوبة</span><b id="cf3-dv"></b><i>‹</i></button>
      </div>
      <div class="set-f">كل جولة: 4 أسئلة × 15 ثانية. جولة رسمية يومياً، والتدريب مفتوح.</div>
    </details>
    <button class="btn cf2-go" type="submit">${isNew ? (v.start_date > todayKW() ? 'جدولة المسابقة' : 'ابدأ المسابقة') : 'حفظ التعديلات'}</button>
    <button type="button" class="link cf2-cancel" data-act="cp-cancel">إلغاء</button></form>`;
}
/* edit an existing challenge (v116): name, duration, lessons; the rest in «المزيد» (in-form overlays so the fields stay in the form) */
function compEditForm(v){
  if (CC.pzFor !== v.group_id) { CC.pzFor = v.group_id; CC.prizes = v.prizes && v.prizes.length ? v.prizes.slice() : null; }
  return `<form class="col cf cf2 ce1" data-form="cp-save">
    <input class="input ce1-n" id="cf-title" name="title" value="${esc(v.title)}" required maxlength="80" aria-label="اسم التحدي">
    <div class="ce1-q">كم مدته؟</div>
    <div class="cf2-dur">${CF_DUR.map(d => `<button type="button" data-act="cf-dur" data-d="${d[0]}">${d[1]}</button>`).join('')}</div>
    <div class="cf2-end" id="cf-end"></div>
    <div class="ce1-q">الأسئلة</div>
    <button type="button" class="ce1-row" data-act="ce-open" data-p="les"><span class="ce1-e">📖</span><span class="grow"><b id="ce-lb">كل الدروس</b><small id="ce-ls"></small></span><span class="ce1-ch">←</span></button>
    ${pzRow(CC.prizes, 'cc')}
    <button type="button" class="ce1-more" data-act="ce-open" data-p="more">المزيد ⋯</button>
    <button class="btn cf2-go ce1-save" type="submit">حفظ</button>
    <div class="ce1-sh" id="ce-les"><div class="ce1-card"><div class="ce1-h"><b>من أي مادة؟</b><button type="button" class="ce1-x" data-act="ce-close" aria-label="إغلاق">✕</button></div>
      <div id="ce-subj">${ceTiles()}</div>
      <div class="cf-les" id="cf-les"></div><div class="cf-pool" id="cf-pool"></div>
      <button type="button" class="btn" data-act="ce-close">تم</button></div></div>
    <div class="ce1-sh" id="ce-more"><div class="ce1-card"><div class="ce1-h"><b>المزيد</b><button type="button" class="ce1-x" data-act="ce-close" aria-label="إغلاق">✕</button></div>
      ${CL.classes.length > 1 ? `<div class="ce1-l">الصف</div><div class="cf2-cls">${CL.classes.map(c => { const other = CL.comps[c.id] && CL.comps[c.id].group_id !== T.compEdit; return `<button type="button" class="cf2-c ${CC.sel.has(c.id) ? 'on' : ''}" data-act="cp-cls" data-id="${c.id}">${ic('check')}<span>${esc(c.name)}</span>${other ? '<small>في مسابقة أخرى</small>' : ''}</button>`; }).join('')}</div>` : ''}
      <div class="set-grp cf3">
        <label class="cf3-r"><span class="grow">يبدأ</span><b id="cf3-sd"></b><i>‹</i><input class="cf3-date" type="date" name="start_date" value="${v.start_date}" required></label>
        <div class="cf3-note" id="cf3-dates"></div>
        <input type="hidden" name="points_end_date" value="${v.points_end_date}"><input type="hidden" name="end_date" value="${v.end_date}">
        <input type="hidden" name="group_size" value="${v.group_size || 6}"><input type="hidden" name="qualifiers" value="${v.qualifiers || 8}"><input type="hidden" name="round_window_hours" value="${v.round_window_hours || 24}">
      </div>
      ${'remind_at' in v ? `<div class="set-grp cf3"><label class="cf3-r"><span class="grow">🔔 وقت التذكير<small>للي ما لعب، من الأحد للخميس</small></span><input class="cf3-time" type="time" name="remind_at" step="900" min="07:00" max="19:45" value="${esc(String(v.remind_at || '16:00').slice(0, 5))}"></label></div>` : ''}
      <div class="set-grp cf3">
        <button type="button" class="cf3-r" data-act="cf3-ko"><span class="grow">تصفيات في النهاية<small>الأوائل وجهاً لوجه</small></span><span class="ios-sw ${CC.ko ? 'on' : ''}" id="cf3-kosw"><i></i></span></button>
        <button type="button" class="cf3-r ${CC.ko ? '' : 'hide'}" id="cf3-qr" data-act="cf3-q"><span class="grow">عدد المتأهلين</span><b id="cf3-qv"></b><i>‹</i></button>
      </div>
      <div class="set-grp cf3">
        <button type="button" class="cf3-r" data-act="cf3-diff"><span class="grow">الصعوبة</span><b id="cf3-dv"></b><i>‹</i></button>
      </div>
      <button type="button" class="btn" data-act="ce-close">تم</button></div></div>
  </form>`;
}
ACTS['ce-open'] = t => { const x = document.getElementById('ce-' + t.dataset.p); if (x) x.classList.add('on'); };
ACTS['ce-close'] = t => { const x = t.closest('.ce1-sh'); if (x) x.classList.remove('on'); };
document.addEventListener('click', e => { if (e.target.classList && e.target.classList.contains('ce1-sh')) e.target.classList.remove('on'); });
/* v162: edit sheet uses the same subject squares as «تحدي جديد» (several allowed) */
function ceSel(){ return (CC.cus || []).concat(CC.gsel || []); }
function ceTiles(){ const c = CL.byId[[...CC.sel][0]] || {}; return subjTiles(c, ceSel(), 'ce-subj', CC.cus); }
ACTS['ce-subj'] = t => { const k = t.dataset.k, isG = NW_GEN.some(o => o[0] === k);
  if (isG) CC.gsel = (CC.gsel || []).includes(k) ? CC.gsel.filter(x => x !== k) : (CC.gsel || []).concat(k);
  else CC.cus = (CC.cus || []).includes(k) ? CC.cus.filter(x => x !== k) : (CC.cus || []).concat(k);
  const cu = (CC.cus || [])[0] || ''; if (cu !== CC.cu || (CC.cus || []).length > 1) CC.lessons = [];
  CC.cu = (CC.cus || []).length === 1 ? cu : cu;
  CC.qtypes = ((CC.cus || []).length ? ['curriculum'] : []).concat(CC.gsel || []); if (!CC.qtypes.length) CC.qtypes = ['general', 'quick'];
  const el = document.getElementById('ce-subj'); if (el) el.innerHTML = ceTiles();
  if ((CC.cus || []).length === 1) cfLessons(); else { const l = document.getElementById('cf-les'); if (l) l.innerHTML = ''; }
  cfUpdate(); ceSum(); };
function ceSum(){
  const lb = document.getElementById('ce-lb'), ls = document.getElementById('ce-ls'); if (!lb) return;
  const cu = CC.cu && CU.list.find(x => x.id === CC.cu), names = CC.cus ? ceSel().map(nwName).filter(Boolean) : [];
  lb.textContent = names.length > 1 ? names.join('، ') : !cu ? (names[0] || 'منوعة (ثقافة عامة وسرعة بديهة)') : `${cu.subject} · ${gradeAr(cu)} · ${!CC.lessons.length ? 'كل الدروس' : CC.lessons.length + ' دروس'}`;
  ls.textContent = CC.poolN == null ? '' : `${CC.poolN} سؤال · تكفي ${CC.poolDays} يوم ${CC.poolOk ? '✓' : '⚠️'}`;
  ls.className = CC.poolOk === false ? 'low' : '';
}
/* simple setup helpers: duration presets, auto title, auto student-screen style */
const CF_DUR = [[7, 'أسبوع'], [14, 'أسبوعين'], [30, 'شهر']];
function cfSpan(start, total, q, hours){
  const ko = q === 0 ? 0 : Math.ceil(Math.log2(Math.max(2, q || 8))) * Math.max(1, Math.ceil((hours || 24) / 24));
  const pts = Math.max(2, total - ko), pe = addDays(start, pts - 1);
  return { points_end_date: pe, end_date: addDays(pe, ko) };
}
function cfAutoTitle(){ const cs = CL.classes.filter(c => CC.sel.has(c.id)); return cs.length === 1 ? 'مسابقة ' + cs[0].name : 'مسابقة اهزم الدقيقة'; }
const STAGE_STYLE = { primary: 'kids', middle: 'mid', secondary: 'mid', university: 'uni' };
function cfAutoStyle(){ const c = CL.classes.find(x => CC.sel.has(x.id)); return (c && STAGE_STYLE[c.stage]) || (c && c.style) || 'mid'; }
const cfQ = f => CC.ko ? Number(f.qualifiers.value) : 0;
ACTS['cf-dur'] = t => { const f = t.closest('form'), st = f.start_date.value || todayKW(); const sp = cfSpan(st, Number(t.dataset.d), cfQ(f), Number(f.round_window_hours.value));
  f.start_date.value = st; f.points_end_date.value = sp.points_end_date; f.end_date.value = sp.end_date; cfUpdate(); };
function cfAuto(){
  const f = document.querySelector('[data-form="cp-save"]'); if (!f) return;
  if (!CC.titleManual) f.title.value = cfAutoTitle();
  if (!CC.styleManual) { CC.style = cfAutoStyle(); f.querySelectorAll('.cf-th').forEach(b => b.classList.toggle('on', b.dataset.v === CC.style)); }
  cfUpdate();
}
document.addEventListener('input', e => { if (e.target.id === 'cf-title') CC.titleManual = true; });
/* live summary + timeline for the competition form */
function cfDays(a, b){ return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5); }
function cfUpdate(){
  const f = document.querySelector('[data-form="cp-save"]'); if (!f) return;
  const n = CC.sel.size, st = [...CC.sel].reduce((x, id) => x + (CL.students[id] || []).length, 0);
  const s = f.start_date.value, p = f.points_end_date.value, e = f.end_date.value;
  const pd = s && p ? cfDays(s, p) + 1 : 0, kd = p && e ? cfDays(p, e) : 0;
  const cnt = document.getElementById('cf-cnt'); if (cnt) cnt.textContent = `(${n} من ${CL.classes.length})`;
  const sum = document.getElementById('cf-sum'); if (sum) sum.textContent = n ? `${n === 1 ? 'صف واحد' : n + ' صفوف'} · ${st} طالب/ـة` : 'اختر صفاً واحداً على الأقل';
  const tot = s && e ? cfDays(s, e) + 1 : 0;
  f.querySelectorAll('[data-act="cf-dur"]').forEach(b => { const sp = s && cfSpan(s, Number(b.dataset.d), cfQ(f), Number(f.round_window_hours.value)); b.classList.toggle('on', !!sp && sp.end_date === e && sp.points_end_date === p); });
  const en = document.getElementById('cf-end'); if (en) en.textContent = s && e ? `${s === todayKW() ? 'تبدأ اليوم' : 'تبدأ ' + fmtDate(s)} وتنتهي ${fmtDate(e)} (${tot} يوماً)` : '';
  cf3Fill(f, s, p, e, kd);
  const tl = document.getElementById('cf-tl'); if (!tl) return;
  if (pd <= 0 || kd < 0) { tl.innerHTML = '<span class="cf-bad">تحقق من ترتيب التواريخ</span>'; return; }
  tl.innerHTML = `<div class="cf-bar2"><i class="pts" style="flex:${pd}"><span>نقاط · ${pd} يوم</span></i>${kd > 0 ? `<i class="ko" style="flex:${kd}"><span>تصفيات · ${kd}</span></i>` : ''}</div><div class="cf-dates"><span>${esc(fmtDate(s))}</span><span>${esc(fmtDate(e))}</span></div>`;
  tl.title = tot + ' يوم';
  cfPool(pd);
}
const POOL = {};
async function cfPool(pd){
  CC.lastPd = pd;
  const el = document.getElementById('cf-pool'); if (!el) return;
  const les = CC.cu && CC.lessons && CC.lessons.length ? CC.lessons : null;
  const key = (CC.qtypes || []).join(',') + '|' + (CC.cu || '') + '|' + (les || []).join('§');
  if (POOL[key] == null) { el.textContent = ''; try { POOL[key] = await rpc('question_pool', { p_types: CC.qtypes || [], p_cu: CC.cu || null, p_lessons: les }); } catch(e){ return; } }
  const n = POOL[key], days = Math.floor(n / 4), ok = days >= pd;
  const x = document.getElementById('cf-pool'); if (!x) return;
  x.className = 'cf-pool ' + (ok ? 'ok' : 'low');
  CC.poolN = n; CC.poolDays = days; CC.poolOk = ok; setTimeout(ceSum); x.innerHTML = `${ic(ok ? 'check' : 'help')} <span>من «أسئلتي»: ${n} سؤالاً يناسب هذه المسابقة، تكفي لـ ${days} يوماً دون تكرار${ok ? '' : `. تحتاج ${pd * 4 - n} سؤالاً إضافياً لتغطية ${pd} يوم`}</span>${ok ? '' : `<button type="button" class="btn sm" data-act="cf-addready">${ic('plus')} أضف بنك الأسئلة المناسبة</button>`}`;
}
/* one tap for a new teacher: pick every ready question that fits this competition (types, curriculum, lessons) */
ACTS['cf-addready'] = async t => {
  t.setAttribute('aria-busy', 'true'); t.textContent = 'جارٍ الإضافة…';
  const types = CC.qtypes && CC.qtypes.length ? CC.qtypes : ['curriculum', 'general', 'quick', 'memory'];
  let q = sb.from('questions').select('id,qtype,curriculum_id,lesson').is('owner_id', null).eq('status', 'approved').in('qtype', types).limit(3000);
  const { data, error } = await q;
  if (error) { toast('تعذّر جلب بنك الأسئلة'); t.removeAttribute('aria-busy'); return; }
  const les = CC.cu && CC.lessons && CC.lessons.length ? new Set(CC.lessons) : null;
  const ids = (data || []).filter(x => x.qtype !== 'curriculum' || (CC.cu ? x.curriculum_id === CC.cu && (!les || les.has(x.lesson)) : true)).map(x => x.id);
  if (!ids.length) { toast('لا توجد أسئلة في البنك تناسب هذا الاختيار. أضف أسئلتك من صفحة الأسئلة'); t.remove(); return; }
  if (!QS.pick) { const r = await sb.from('question_picks').select('question_id'); QS.pickOk = !r.error; QS.pick = new Set((r.data || []).map(x => x.question_id)); }
  if (await qPickSet(ids, true)) { toast(`أُضيف ${ids.length} سؤالاً من البنك إلى أسئلتك ✓`); cfPool(CC.lastPd || 7); }
  else t.removeAttribute('aria-busy');
};
/* teacher plays a practice round with this challenge's own questions (no points, not in rankings) */
ACTS['cp-try'] = async t => {
  const ks = (CL.allComps || []).filter(k => k.group_id === t.dataset.g); if (!ks.length) return;
  const k = ks[0], cls = CL.byId[k.class_id] || {}; t.setAttribute('aria-busy', 'true');
  try {
    /* same rule as start_attempt: picked/own approved, type in the challenge's types, curriculum questions from its subjects (+ lessons) */
    const sel = 'id,body,options,correct_index,curriculum_id,lesson,payload,qtype,status';
    const q1 = sb.from('questions').select(sel + ',question_picks!inner(teacher_id)').eq('question_picks.teacher_id', T.user.id).eq('status', 'approved').limit(2000);
    const [a, b] = await Promise.all([q1, sb.from('questions').select(sel).eq('owner_id', T.user.id).eq('status', 'approved').limit(2000)]);
    const cus = new Set((k.curricula && k.curricula.length ? k.curricula : [k.curriculum_id]).filter(Boolean)), types = k.qtypes && k.qtypes.length ? k.qtypes : ['curriculum'], les = k.lessons && k.lessons.length ? new Set(k.lessons) : null;
    let pool = [...((a && a.data) || []), ...((b && b.data) || [])].filter(q => Array.isArray(q.options) && q.options.length >= 2 && types.indexOf(q.qtype || 'curriculum') >= 0 &&
      ((q.qtype || 'curriculum') !== 'curriculum' || !cus.size || (cus.has(q.curriculum_id) && (!les || les.has(q.lesson)))));
    const seen = new Set(); pool = pool.filter(q => !seen.has(q.id) && seen.add(q.id));
    if (pool.length < 4) { t.removeAttribute('aria-busy'); return toast('ما فيه أسئلة كافية في «أسئلتي» لهذا التحدي، أضف دروس من بنك الأسئلة'); }
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    LS.set('mc_demoq', JSON.stringify(pool.slice(0, 4).map(q => ({ body: q.body, options: q.options, c: q.correct_index, payload: q.payload || null }))));
    t.removeAttribute('aria-busy'); themePreview(cls.style || k.style || 'mid');
  } catch(e){ t.removeAttribute('aria-busy'); toast(errMsg(e)); }
};
ACTS['cf-preview'] = () => { LS.del('mc_demoq'); themePreview(CC.style || 'mid'); };
function themePreview(th){
  /* v123: full screen (no phone frame: iOS sized the iframe wrong) with a ✕ that returns here */
  LS.set('mc_pvback', location.hash || '#/t/home'); location.hash = '#/p/' + th; return;
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
  if (!CFL[cu]) { const r = await sb.from('questions').select('lesson').eq('curriculum_id', cu).eq('status', 'approved').not('lesson', 'is', null).order('created_at').limit(5000);
    const cnt = {}, order = []; (r.data || []).forEach(q => { if (!cnt[q.lesson]) order.push(q.lesson); cnt[q.lesson] = (cnt[q.lesson] || 0) + 1; }); CFL[cu] = order.map(l => [l, cnt[l]]); }
  const x = document.getElementById('cf-les'); if (!x || CC.cu !== cu) return;
  const ls = CFL[cu]; CC.lessons = (CC.lessons || []).filter(l => ls.some(y => y[0] === l));
  if (!ls.length) { x.innerHTML = ''; return; }
  const all = !CC.lessons.length;
  x.innerHTML = `<div class="cf-les-h"><span>الدروس</span><small>${all ? 'كل الدروس' : CC.lessons.length + ' من ' + ls.length}</small></div><div class="cf2-les">
    <button type="button" class="cf2-l all ${all ? 'on' : ''}" data-act="cp-les" data-l=""><i>${ic('check')}</i><span class="grow">كل الدروس</span><em>${ls.reduce((a, y) => a + y[1], 0)}</em></button>
    ${ls.map(([l, n], i) => `<button type="button" class="cf2-l ${!all && CC.lessons.includes(l) ? 'on' : ''}" data-act="cp-les" data-l="${esc(l)}"><i>${ic('check')}</i><span class="grow">${esc(l)}</span><em>${n}</em></button>`).join('')}</div>`;
}
ACTS['cp-cu'] = t => { CC.cu = t.value; CC.lessons = []; if (CC.cu && CC.qtypes && !CC.qtypes.includes('curriculum')) CC.qtypes = ['curriculum'].concat(CC.qtypes); cfLessons(); cfUpdate(); ceSum(); };
ACTS['cp-les'] = t => { const l = t.dataset.l;
  if (!l) CC.lessons = []; else if (CC.lessons.includes(l)) CC.lessons = CC.lessons.filter(x => x !== l); else CC.lessons.push(l);
  if (CFL[CC.cu] && CC.lessons.length === CFL[CC.cu].length) CC.lessons = [];
  cfLessons(); cfUpdate(); ceSum(); };
function cpKeep(){ const f = document.querySelector('[data-form="cp-save"]'); if (f && f.cu) CC.cu = f.cu.value; }
/* «إعدادات إضافية»: iOS-style rows; each opens a small sheet */
const fmtDay = d => { try { return new Date(d + 'T00:00:00').toLocaleDateString('ar-KW-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' }); } catch(e){ return d; } };
const fmtRange = (a, b) => a === b ? fmtDate(a) : fmtDate(a).split(' ')[1] === fmtDate(b).split(' ')[1] ? fmtDate(a).split(' ')[0] + '–' + fmtDate(b) : fmtDate(a) + ' – ' + fmtDate(b);
function cf3Fill(f, s, p, e, kd){
  const set = (id, h) => { const x = document.getElementById(id); if (x) x.innerHTML = h; };
  set('cf3-sd', s ? (s === todayKW() ? 'اليوم' : esc(fmtDay(s))) : '');
  set('cf3-dates', s && p && e ? `النقاط ${esc(fmtRange(s, p))}${kd > 0 ? ` · التصفيات ${esc(fmtRange(addDays(p, 1), e))}` : ''}` : '');
  set('cf3-qv', 'أفضل ' + f.qualifiers.value);
  set('cf3-dv', esc((DIFF.find(d => d[0] === CC.diff) || DIFF[1])[1]));
  set('cf3-tv', CC.qtypes.length === QTYPES.length ? 'الكل' : esc(QTYPES.filter(q => CC.qtypes.includes(q[0])).map(q => q[1]).join('، ')));
  set('cf3-yv', esc((CF_STYLES.find(x => x[0] === CC.style) || CF_STYLES[1])[1]));
}
function cf3Respan(f){ // keep the chosen total length, recompute points/knockout split
  const s = f.start_date.value || todayKW(), tot = Math.max(3, cfDays(CC.cfS || s, f.end_date.value) + 1);
  const sp = cfSpan(s, tot, cfQ(f), Number(f.round_window_hours.value)); f.points_end_date.value = sp.points_end_date; f.end_date.value = sp.end_date; CC.cfS = s; cfUpdate();
}
document.addEventListener('focusin', e => { if (e.target.classList && e.target.classList.contains('cf3-date')) CC.cfS = e.target.value; });
document.addEventListener('change', e => { if (e.target.classList && e.target.classList.contains('cf3-date')) { if (e.target.value < todayKW() && T.compEdit === 'new') e.target.value = todayKW(); cf3Respan(e.target.form); } });
const cf3Form = () => document.querySelector('[data-form="cp-save"]');
ACTS['cf3-ko'] = () => { const f = cf3Form(); CC.ko = !CC.ko; CC.cfS = f.start_date.value; document.getElementById('cf3-kosw').classList.toggle('on', CC.ko); document.getElementById('cf3-qr').classList.toggle('hide', !CC.ko); cf3Respan(f); };
const cf3Opt = (act, v, on, b, sm) => `<button class="aw-opt cf3-o${on ? ' on' : ''}" data-act="${act}" data-v="${v}"><span class="grow"><b>${b}</b>${sm ? `<small>${sm}</small>` : ''}</span><span class="cf3-ck">${ic('check')}</span></button>`;
ACTS['cf3-q'] = () => { const q = Number(cf3Form().qualifiers.value);
  modal(`<div class="aw-sheet"><h3>عدد المتأهلين للتصفيات</h3><p class="sub">من كل صف، حسب ترتيب النقاط.</p>${[[4, 'دوران · يومان'], [8, '3 أدوار · 3 أيام'], [16, '4 أدوار · 4 أيام']].map(x => cf3Opt('cf3-qset', x[0], q === x[0], 'أفضل ' + x[0], x[1])).join('')}</div>`); };
ACTS['cf3-qset'] = t => { const f = cf3Form(); f.qualifiers.value = t.dataset.v; CC.cfS = f.start_date.value; closeModals(); cf3Respan(f); };
ACTS['cf3-diff'] = () => modal(`<div class="aw-sheet"><h3>الصعوبة</h3>${DIFF.slice().sort((a, b) => (b[0] === 'adaptive') - (a[0] === 'adaptive')).map(d => cf3Opt('cf3-dset', d[0], CC.diff === d[0], d[1], d[2])).join('')}</div>`);
ACTS['cf3-dset'] = t => { CC.diff = t.dataset.v; closeModals(); cfUpdate(); };
ACTS['cf3-qt'] = () => { modal(`<div class="aw-sheet"><h3>أنواع الأسئلة</h3><p class="sub">اختر نوعاً واحداً أو أكثر.</p><div id="cf3-qtl">${cf3QtList()}</div><button class="btn" data-act="close-modal">تم</button></div>`); };
const cf3QtList = () => QTYPES.map(q => cf3Opt('cf3-qtset', q[0], CC.qtypes.includes(q[0]), q[1], q[2])).join('');
ACTS['cf3-qtset'] = t => { const k = t.dataset.v; if (CC.qtypes.includes(k)) { if (CC.qtypes.length === 1) return toast('اختر نوعاً واحداً على الأقل'); CC.qtypes = CC.qtypes.filter(x => x !== k); } else CC.qtypes.push(k);
  const l = document.getElementById('cf3-qtl'); if (l) l.innerHTML = cf3QtList(); cfUpdate(); };
ACTS['cf3-style'] = () => modal(`<div class="aw-sheet"><h3>شكل شاشة الطالب</h3><p class="sub">يتحدد تلقائياً من مرحلة الصف، وتقدر تغيّره.</p>
  <div class="cf-themes">${CF_STYLES.map(x => `<button type="button" class="cf-th ${CC.style === x[0] ? 'on' : ''}" data-act="cf3-yset" data-v="${x[0]}"><span class="cf-ph cf-ph-${x[0]}"><i class="t"></i><i class="q"></i><i class="o"></i><i class="o"></i><i class="o"></i></span><b>${x[1]}</b><small>${x[2]}</small></button>`).join('')}</div>
  <button type="button" class="btn soft" data-act="cf-preview">${ic('play')} معاينة كما يراها الطالب</button></div>`);
ACTS['cf3-yset'] = t => { CC.style = t.dataset.v; CC.styleManual = true; document.querySelectorAll('.cf-th').forEach(b => b.classList.toggle('on', b === t)); cfUpdate(); };
ACTS['cp-style'] = t => { CC.style = t.dataset.v; CC.styleManual = true; t.parentElement.querySelectorAll('.cf-th').forEach(b => b.classList.toggle('on', b === t)); };
ACTS['cp-diff'] = t => { CC.diff = t.dataset.v; t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); const d = document.getElementById('cp-diff-d'); if (d) d.textContent = DIFF.find(x => x[0] === CC.diff)[2]; };
ACTS['cp-cls'] = t => { const id = t.dataset.id; CC.sel.has(id) ? CC.sel.delete(id) : CC.sel.add(id); t.classList.toggle('on'); cfAuto(); cfUpdate(); };
ACTS['cp-all'] = () => { CL.classes.forEach(c => CC.sel.add(c.id)); document.querySelectorAll('[data-act="cp-cls"]').forEach(b => b.classList.add('on')); cfAuto(); cfUpdate(); };
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
  if (CC.cu && CC.qtypes && !CC.qtypes.includes('curriculum')) CC.qtypes = ['curriculum'].concat(CC.qtypes);
  const ids = [...CC.sel];
  if (!ids.length) return toast('اختر صفاً واحداً على الأقل');
  const p = { title: f.title.value.trim() || 'مسابقة اهزم الدقيقة', start_date: f.start_date.value, points_end_date: f.points_end_date.value, end_date: f.end_date.value,
    group_size: Number(f.group_size.value), qualifiers: Number(f.qualifiers.value), round_window_hours: Number(f.round_window_hours.value),
    curriculum_id: CC.cu || null, difficulty: CC.diff || 'normal', qtypes: CC.qtypes, lessons: CC.cu && CC.lessons && CC.lessons.length ? CC.lessons : null };
  if (CC.cus) { p.curricula = CC.cus.length > 1 ? CC.cus.slice() : null; p.curriculum_id = CC.cus[0] || null; if (CC.cus.length > 1) p.lessons = null; }
  if (f.remind_at && f.remind_at.value) { const tm = f.remind_at.value.slice(0, 5); p.remind_at = tm < '07:00' ? '07:00' : tm > '19:45' ? '19:45' : tm; }
  if (CC.prizes || (CL.allComps || []).some(c => c.group_id === T.compEdit && c.prizes)) p.prizes = CC.prizes && CC.prizes.some(Boolean) ? CC.prizes : null;
  if (!(p.start_date <= p.points_end_date && p.points_end_date <= p.end_date)) return toast('تحقق من ترتيب التواريخ');
  const isNew = T.compEdit === 'new', gid = isNew ? crypto.randomUUID() : T.compEdit;
  const inGroup = isNew ? [] : CL.allComps.filter(c => c.group_id === gid);
  const moving = ids.filter(id => CL.comps[id] && CL.comps[id].group_id !== gid);
  if (moving.length && !await ask(`${moving.length} صف مشترك في مسابقة أخرى، سيتم إنهاؤها لهذه الصفوف. متابعة؟`)) return;
  if (CC.saving) return; CC.saving = true;
  const sbtn = f.querySelector('[type=submit]'), slbl = sbtn && sbtn.textContent; if (sbtn) { sbtn.setAttribute('aria-busy', 'true'); sbtn.textContent = 'جارٍ الحفظ…'; }
  const movedIds = moving.map(id => CL.comps[id].id); let ended = false, step = '';
  try {
    const chk = r => { if (r.error) throw r.error; };
    const keep = inGroup.filter(c => ids.includes(c.class_id)), drop = inGroup.filter(c => !ids.includes(c.class_id));
    const add = ids.filter(id => !keep.some(c => c.class_id === id));
    step = 'نقل الصفوف';
    if (movedIds.length) { chk(await sb.from('competitions').update({ status: 'finished' }).in('id', movedIds)); ended = true; }
    /* create the replacements before anything else changes; if this fails, the moved classes get their old competition back */
    if (add.length) chk(await sb.from('competitions').insert(add.map(id => Object.assign({ class_id: id, group_id: gid }, p))));
    ended = false;
    step = 'حفظ الإعدادات';
    if (keep.length) chk(await sb.from('competitions').update(p).in('id', keep.map(c => c.id)));
    if (drop.length) chk(await sb.from('competitions').update({ status: 'finished' }).in('id', drop.map(c => c.id)));
    chk(await sb.from('classes').update({ qtypes: CC.qtypes, style: CC.style || 'mid' }).in('id', ids));
    T.compEdit = null; toast('تم الحفظ'); if (location.hash.indexOf('#/t/new') === 0) { go('#/t/home'); return; } await tClasses();
  } catch(e){
    let back = '';
    if (ended) { const r = await sb.from('competitions').update({ status: 'active' }).in('id', movedIds); back = r.error ? ' تنبيه: لم تُستعد المسابقة السابقة لبعض الصفوف، راجعها من المسابقات.' : ' بقيت الصفوف في مسابقتها السابقة كما كانت.'; }
    toast('تعذّر ' + step + '.' + back + ' حاول مجدداً');
  } finally { CC.saving = false; if (sbtn && document.contains(sbtn)) { sbtn.removeAttribute('aria-busy'); sbtn.textContent = slbl; } }
};

/* ---- questions ---- */
const QPD = 4; // questions a student plays per day
const qNorm = s => String(s || '').replace(/[ً-ْـ]/g, '').replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase();
async function tQuestions(){
  const [own, glob, st] = await Promise.all([
    sb.from('questions').select('*').eq('owner_id', T.user.id).order('created_at', { ascending: false }),
    sb.from('questions').select('id,body,options,correct_index,level,qtype,curriculum_id,lesson,image').is('owner_id', null).eq('status', 'approved').limit(5000),
    rpc('question_stats', {}).catch(() => []),
    sb.from('question_picks').select('question_id').then(r => r, () => ({})),
    sb.from('classes').select('name,stage').eq('archived', false).then(r => { QS.cls3 = r.data || []; }, () => {})
  ]).then(r => { QS.pickOk = !!(r[3] && !r[3].error && r[3].data); QS.pick = new Set(((r[3] && r[3].data) || []).map(x => x.question_id)); QS.hid = new Set(); return r; });
  if (own.error) throw own.error;
  await loadCurricula(true).catch(() => {});
  const hd = await sb.from('question_hides').select('question_id').then(r => r, () => ({}));
  QS.hidSet = new Set(((hd && hd.data) || []).map(x => x.question_id));
  QS.list = own.data; QS.glob = (glob.data || []).filter(q => !QS.hidSet.has(q.id)); QS.globalCount = QS.glob.length;
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
  const pool = QS.list.filter(q => q.status === 'approved').concat(qPicked());
  const lv = { easy: 0, medium: 0, hard: 0 }; pool.forEach(q => { if (lv[q.level] != null) lv[q.level]++; });
  const n = pool.length, days = Math.floor(n / QPD), mine = QS.list.filter(q => q.status === 'approved').length;
  const pc = k => n ? Math.round(lv[k] * 100 / n) : 0;
  const low = days < 14, weak = n && ['easy', 'medium', 'hard'].find(k => lv[k] < n * 0.15);
  return `<div class="qb ${low ? 'low' : 'ok'}"><div class="qb-h"><b>${n}</b><span>سؤالاً متاحاً متاحاً لطلبتك</span><span class="grow"></span><em>تكفي ${daysAr(days)}</em></div>
    <div class="qb-bar">${['easy', 'medium', 'hard'].map(k => `<i class="lv-${k}" style="width:${pc(k)}%"></i>`).join('')}</div>
    <div class="qb-lg">${['easy', 'medium', 'hard'].map(k => `<span><i class="lv-${k}"></i>${LEVEL_AR[k]} ${lv[k]}</span>`).join('')}</div>
    <p class="qb-n">منها ${mine} كتبتها و${pool.length - mine} أضفتها من بنك الأسئلة.${low ? ` أضف ${14 * QPD - n} سؤالاً لتكفي أسبوعين.` : ''}${weak ? ` أسئلة مستوى «${LEVEL_AR[weak]}» قليلة.` : ''}</p></div>`;
}
function qStat(q){
  const s = QS.stats[q.id]; if (!s || !s.answered) return '';
  const p = Math.round(s.correct * 100 / s.answered);
  const tag = s.answered >= 5 && p < 35 ? '<b class="qs-hard">صعب على الطلبة</b>' : s.answered >= 5 && p > 90 ? '<b class="qs-easy">سهل جداً</b>' : '';
  return `<div class="q-stat">${ic('chart')}<span>جاوب عليه ${s.answered} ${s.answered > 10 ? 'طالباً' : s.answered > 2 ? 'طلاب' : 'طالب'} · ${p}٪ أصابوا</span>${tag}</div>`;
}
function qLesHead(list){
  const f = T.qf, P = QS.pick || new Set(), use = list, n = l => use.filter(q => q.level === l).length;
  const title = !f.gl ? 'كل أسئلة الصف' : f.gl === NO_LESSON ? 'أسئلة بدون درس' : f.gl;
  const have = list.filter(q => P.has(q.id)).length, left = list.length - have;
  return `<div class="les-h"><h3>${esc(title)}</h3>
    <div class="les-sum"><b>${use.length} سؤالاً</b><span><i class="lvd lv-easy"></i>${n('easy')} سهل</span><span><i class="lvd lv-medium"></i>${n('medium')} متوسط</span><span><i class="lvd lv-hard"></i>${n('hard')} صعب</span></div>
    <div class="les-pk${have ? ' some' : ''}">${have ? `✓ أضفت ${have} من ${list.length} إلى أسئلتك` : 'لم تضف شيئاً من هنا بعد. ما يدخل مسابقاتك إلا ما تضيفه.'}</div>
    ${left ? `<button class="btn" data-act="q-pk-all" data-on="1">${ic('plus')} أضف ${left === list.length ? 'كل' : 'الباقي من'} ${f.gl ? 'أسئلة الدرس' : 'أسئلة الصف'} (${left})</button>` : `<button class="btn soft" data-act="q-pk-all" data-on="0">${ic('x')} إزالة الكل من أسئلتي</button>`}
    ${have ? `<button class="btn soft" data-act="q-les-comp">${ic('trophy')} ابدأ مسابقة من ${f.gl ? 'هذا الدرس' : 'هذا الصف'}</button>` : ''}
    <button class="btn ghost" data-act="q-show" ${use.length ? '' : 'disabled'}>${ic('eye')} اعرض في الفصل</button></div>
    <div class="les-tip">اضغط على أي سؤال لترى خياراته</div>`;
}
function qItem(q, ro){
  const sel = QS.selOn && !ro, on = QS.sel.has(q.id), open = !sel && (QS.open === q.id || q.status === 'draft');
  const picked = QS.pick && QS.pick.has(q.id), hidden = false;
  const acts = ro ? `<button class="qi2-b${picked ? '' : ' ok'}" data-act="q-pk" data-id="${q.id}">${picked ? `${ic('x')} إزالة من أسئلتي` : `${ic('plus')} أضف إلى أسئلتي`}</button><button class="qi2-b" data-act="q-report" data-id="${q.id}">${ic('flag')} بلّغ عن خطأ</button>`
    : q._pk ? `<button class="qi2-b" data-act="q-pk" data-id="${q.id}">${ic('x')} إزالة من أسئلتي</button><button class="qi2-b" data-act="q-report" data-id="${q.id}">${ic('flag')} بلّغ عن خطأ</button>` : q.status === 'draft'
    ? `<button class="qi2-b ok" data-act="t-q-status" data-id="${q.id}" data-s="approved">${ic('check')} إتاحة في المسابقات</button><button class="qi2-b" data-act="t-q-edit" data-id="${q.id}">${ic('edit')} تعديل</button><button class="qi2-b del" data-act="t-q-del2" data-id="${q.id}">${ic('trash')} حذف</button>`
    : `<button class="qi2-b" data-act="t-q-edit" data-id="${q.id}">${ic('edit')} تعديل</button><button class="qi2-b" data-act="t-q-share1" data-id="${q.id}">${ic('share')} مشاركة</button><button class="qi2-b del" data-act="t-q-del2" data-id="${q.id}">${ic('trash')} حذف</button>`;
  return `<div class="qi2${ro && !picked ? ' out' : ''}${open ? ' open' : ''}${on ? ' sel' : ''}${hidden ? ' hid' : ''}" data-act="${sel ? 't-q-pick' : 't-q-open'}" data-id="${q.id}" role="button" tabindex="0" ${sel ? `aria-pressed="${on ? 'true' : 'false'}"` : `aria-expanded="${open ? 'true' : 'false'}"`}>
    ${sel ? `<span class="tick sq${on ? ' on' : ''}" aria-hidden="true">${ic('check')}</span>` : `<i class="lvd lv-${q.level}" title="${LEVEL_AR[q.level] || ''}"></i>`}
    <div class="qi2-m">${ro && picked ? '<small class="qi2-pk">✓ في أسئلتي</small>' : ro ? '<small class="qi2-out">ما يدخل المسابقات</small>' : !ro && q._pk ? '<small class="qi2-pk">من بنك الأسئلة</small>' : ''}<b class="q-body">${q.image && !open ? '🖼️ ' : ''}${esc(q.body)}</b>
      ${open ? `${q.image ? `<img class="qi2-img" src="${esc(q.image)}" alt="" loading="lazy">` : ''}<div class="qi2-opts">${q.options.map((o, i) => `<span class="${i === q.correct_index ? 'c' : ''}">${i === q.correct_index ? ic('check') : ''}${esc(o)}</span>`).join('')}</div>
        <div class="qi2-meta">${LEVEL_AR[q.level] || ''} · ${TYPE_AR[q.qtype] || q.qtype}${QS.dup.has(q.id) ? ' · <b class="qi-dup">مكرر</b>' : ''}</div>${qStat(q)}${acts ? `<div class="qi2-acts">${acts}</div>` : ''}`
      : `<span class="qi2-a">${ic('check')}${esc(q.options[q.correct_index] || '')}</span>`}</div>${!sel && ((!ro && q._pk) || (ro && picked)) ? `<button class="qi2-x" data-act="q-pk" data-id="${q.id}" aria-label="إزالة من أسئلتي">${ic('x')}</button>` : ''}${!sel && ro && !picked ? `<button class="qi2-x add" data-act="q-pk" data-id="${q.id}" aria-label="أضف إلى أسئلتي">${ic('plus')}</button>` : ''}</div>`;
}
async function qPickSet(ids, on){
  if (!QS.pickOk) { toast('ميزة الإضافة من بنك الأسئلة تحتاج تحديث قاعدة البيانات أولاً'); return false; }
  const P = QS.pick || (QS.pick = new Set());
  const todo = ids.filter(id => on ? !P.has(id) : P.has(id)); if (!todo.length) return true;
  let error;
  if (on) { for (let i = 0; i < todo.length && !error; i += 500) ({ error } = await sb.from('question_picks').insert(todo.slice(i, i + 500).map(id => ({ question_id: id })))); }
  else { for (let i = 0; i < todo.length && !error; i += 200) ({ error } = await sb.from('question_picks').delete().in('question_id', todo.slice(i, i + 200))); }
  if (error) { toast('تعذّر الحفظ، تأكد من الاتصال وحاول مجدداً'); await tQuestions().catch(() => {}); return false; }
  todo.forEach(id => on ? P.add(id) : P.delete(id)); Object.keys(POOL).forEach(k => delete POOL[k]);
  return true;
}
ACTS['q-pk'] = async t => { const id = t.dataset.id, on = !(QS.pick && QS.pick.has(id));
  if (await qPickSet([id], on)) { toast(on ? 'أُضيف إلى أسئلتي ✓ وسيظهر لطلبتك في المسابقات' : 'أُزيل من أسئلتك، لن يظهر لطلبتك'); renderQuestions(); } };
// Lesson list: one tap adds/removes a whole lesson (✓ = in «أسئلتي», + = not yet).
ACTS['q-les-tg'] = async t => { const l = t.dataset.l, on = t.dataset.on === '1', cu = T.qf.gcu;
  const ids = QS.glob.filter(q => q.curriculum_id === cu && (q.lesson || NO_LESSON) === l).map(q => q.id);
  t.setAttribute('aria-busy', 'true'); haptic();
  if (await qPickSet(ids, on)) { toast(on ? `أُضيف الدرس إلى أسئلتك ✓ (${ids.length})` : 'أُزيل الدرس من أسئلتك'); renderQuestions(); } else t.removeAttribute('aria-busy'); };
ACTS['q-pk-all'] = async t => { const ids = qFiltered().map(q => q.id), on = t.dataset.on === '1';
  if (!on && !await ask(`إزالة ${ids.length} سؤالاً من أسئلتك؟ لن تظهر لطلبتك بعد ذلك.`, { title: 'إزالة الكل؟', ok: 'إزالة', danger: true, safe: true })) return;
  t.setAttribute('aria-busy', 'true');
  if (await qPickSet(ids, on)) { toast(on ? `أُضيف ${ids.length} سؤالاً إلى أسئلتك ✓` : 'أُزيلت من أسئلتك'); renderQuestions(); } else t.removeAttribute('aria-busy'); };
ACTS['q-hide'] = async t => {
  const id = t.dataset.id, hid = QS.hid || (QS.hid = new Set()), was = hid.has(id);
  const { error } = was ? await sb.from('question_hides').delete().eq('question_id', id) : await sb.from('question_hides').insert({ question_id: id });
  if (error) return toast(errMsg(error));
  was ? hid.delete(id) : hid.add(id); POOL && Object.keys(POOL).forEach(k => delete POOL[k]);
  toast(was ? 'رجع السؤال لمسابقاتك' : 'ما راح يطلع هذا السؤال لطلبتك'); renderQuestions();
};
ACTS['q-report'] = async t => {
  const v = await ask('ما الخطأ في السؤال؟', { title: 'بلّغ عن خطأ', input: '', placeholder: 'مثال: الإجابة الصحيحة غلط', ok: 'إرسال' });
  if (v == null) return;
  const { error } = await sb.from('question_reports').insert({ question_id: t.dataset.id, note: String(v).trim().slice(0, 500) || null });
  if (error) return toast(errMsg(error)); toast('وصل البلاغ، شكراً لك');
};
ACTS['q-les-comp'] = () => { const f = T.qf; T.compPreset = { cu: f.gcu, lessons: f.gl && f.gl !== NO_LESSON ? [f.gl] : [] }; go('#/t/comps'); };
/* show questions one by one on a projector; answer revealed on tap */
const QSH = { list: [], i: 0, show: false };
ACTS['q-show'] = () => { QSH.list = qFiltered(); QSH.i = 0; QSH.show = false; if (!QSH.list.length) return; document.body.classList.add('qsh-on'); qShowRender(); };
function qShowRender(){
  let el = document.getElementById('qsh'); if (!el) { el = document.createElement('div'); el.id = 'qsh'; el.className = 'qsh'; document.body.appendChild(el); }
  const q = QSH.list[QSH.i], n = QSH.list.length;
  el.innerHTML = `<div class="qsh-top"><button class="icon-btn" data-act="qsh-x" aria-label="إغلاق">${ic('x')}</button><b>${QSH.i + 1} / ${n}</b></div>
    <div class="qsh-q">${q.image ? `<img src="${esc(q.image)}" alt="">` : ''}<h2>${esc(q.body)}</h2>
      <div class="qsh-o">${q.options.map((o, i) => `<div class="${QSH.show ? (i === q.correct_index ? 'c' : 'w') : ''}"><em>${'أبجد'[i]}</em>${esc(o)}</div>`).join('')}</div></div>
    <div class="qsh-nav"><button class="btn soft" data-act="qsh-go" data-d="-1" ${QSH.i ? '' : 'disabled'}>السابق</button>
      ${QSH.show ? `<button class="btn" data-act="qsh-go" data-d="1" ${QSH.i < n - 1 ? '' : 'disabled'}>التالي</button>` : `<button class="btn accent" data-act="qsh-rev">اكشف الجواب</button>`}</div>`;
}
ACTS['qsh-rev'] = () => { QSH.show = true; qShowRender(); };
ACTS['qsh-go'] = t => { QSH.i = Math.max(0, Math.min(QSH.list.length - 1, QSH.i + Number(t.dataset.d))); QSH.show = false; qShowRender(); };
ACTS['qsh-x'] = () => { const el = document.getElementById('qsh'); if (el) el.remove(); document.body.classList.remove('qsh-on'); };
ACTS['t-q-open'] = t => { const id = t.dataset.id, kb = document.activeElement === t; QS.open = QS.open === id ? null : id; const l = document.getElementById('qlist'); if (l) { l.innerHTML = qListHtml(); if (kb) { const n = l.querySelector('[data-id="' + id + '"][role="button"]'); if (n) n.focus({ preventScroll: true }); } } };
ACTS['t-q-share1'] = t => qShareIds([t.dataset.id]);
ACTS['t-q-del2'] = t => {
  const id = t.dataset.id, i = QS.list.findIndex(x => x.id === id); if (i < 0) return;
  const [q] = QS.list.splice(i, 1); QS.open = null; qDupIndex(); renderQuestions();
  snack('سيُحذف السؤال خلال ثوانٍ', () => { QS.list.splice(i, 0, q); qDupIndex(); renderQuestions(); },
    async () => { const { error } = await sb.from('questions').delete().eq('id', id); if (error) { toast('تعذّر حذف السؤال، أُعيد إلى القائمة'); await tQuestions(); } });
};
/* one plain sentence about the bank; details on tap */
function qOk(){
  const n = QS.list.filter(q => q.status === 'approved').length + qPicked().length, days = Math.floor(n / QPD), low = days < 14;
  return `<button class="qok${low ? ' low' : ''}" data-act="t-q-bankinfo"><span class="qok-d"></span><span class="grow"><b>عند طلبتك ${n} سؤالاً</b><small>${low ? `أضف ${14 * QPD - n} سؤالاً لتكفي أسبوعين` : `تكفيهم ${daysAr(days)}`}</small></span><i class="qok-c">‹</i></button>`;
}
ACTS['t-q-bankinfo'] = () => modal(`<h3>الأسئلة المتاحة لطلبتك</h3>${qBank()}<p class="sub">كل طالب يلعب ${QPD} أسئلة في اليوم تقريباً، فكل ${QPD} أسئلة تكفي يوماً.</p><button class="btn soft" data-act="close-modal">تمام</button>`);
/* ready-made (public) questions: subject → stage/grade → lesson → questions */
const QG = [['general', '🌍', 'معلومات عامة'], ['quick', '⚡', 'سرعة بديهة'], ['curriculum', '📚', 'أسئلة منهج']];
const NO_LESSON = '__none';
const qGlobCu = q => q.qtype === 'curriculum' && q.curriculum_id && CU.list.find(c => c.id === q.curriculum_id);
const qGlobSubj = q => { const c = qGlobCu(q); return c ? c.subject : 'مناهج أخرى'; };
function qGroups(){
  if (!QS.glob.length) return '<div class="card center muted">بنك الأسئلة فاضي حالياً.</div>';
  const cnt = {}; QS.glob.filter(q => q.qtype === 'curriculum').forEach(q => { const s = qGlobSubj(q); cnt[s] = (cnt[s] || 0) + 1; });
  const all = [...new Set(SUBJ_MAIN.concat(Object.keys(cnt)))].filter(s => cnt[s]), my = mySubjects();
  const subs = my.length ? all.filter(s => my.includes(s)) : all, other = my.length ? all.filter(s => !my.includes(s)) : [];
  const kinds = QG.filter(g => g[0] !== 'curriculum').map(g => [g, QS.glob.filter(q => q.qtype === g[0]).length]).filter(x => x[1]);
  const stages = s => [...new Set(QS.glob.filter(q => qGlobSubj(q) === s).map(q => { const c = qGlobCu(q); return c ? STAGE_AR[c.stage] : ''; }).filter(Boolean))].join('، ');
  const subBtn = s => `<button class="qsub" data-act="q-gsubj" data-s="${esc(s)}" style="--c:${SUBJ_COLOR(s)}"><span class="qsub-ic">${esc(subjMark(s))}</span><span class="grow"><b>${esc(s)}</b>${stages(s) ? `<small>${stages(s)}</small>` : ''}</span><em>${cnt[s]}</em><i>‹</i></button>`;
  return `<p class="sub q-ro">بنك أسئلة جاهزة. تصفّحه وأضف منه ما تريد إلى «أسئلتي»، وما يدخل مسابقاتك إلا ما تضيفه.</p>
    ${subs.length ? `<div class="qr-h">${my.length ? 'موادي' : 'أسئلة المناهج'}</div><div class="qsubs">${subs.map(subBtn).join('')}</div>` : my.length ? '<div class="card center muted">ما فيه أسئلة في البنك لموادك بعد.</div>' : ''}
    ${other.length ? `<details class="q-other"><summary>مواد أخرى (${other.length})</summary><div class="qsubs">${other.map(subBtn).join('')}</div></details>` : ''}
    ${!my.length && subs.length ? `<button class="q-mysub" data-act="go" data-h="#/t/opt/prof_subject">${ic('edit')} اختر موادك عشان تطلع أول</button>` : ''}
    ${kinds.length ? `<div class="qr-h">أسئلة عامة</div><div class="qsubs">${kinds.map(([g, n]) => `<button class="qsub" data-act="q-grp" data-g="${g[0]}" style="--c:${g[0] === 'quick' ? '#FF9500' : '#34C759'}"><span class="qsub-ic">${g[1]}</span><span class="grow"><b>${g[2]}</b></span><em>${n}</em><i>‹</i></button>`).join('')}</div>` : ''}`;
}
function qGlobGrades(subj){
  const qs = QS.glob.filter(q => q.qtype === 'curriculum' && qGlobSubj(q) === subj), cnt = {};
  qs.forEach(q => { const k = q.curriculum_id || '-'; cnt[k] = (cnt[k] || 0) + 1; });
  const cus = CU.list.filter(c => c.subject === subj && cnt[c.id]);
  const stg = STAGE_ORDER.filter(k => cus.some(c => c.stage === k) || (k !== 'university' && CU.list.some(c => c.subject === subj && c.stage === k && !c.owner_id)));
  if (!stg.length) return '<div class="card center muted">لا توجد أسئلة في البنك في هذه المادة بعد.</div>';
  return `<div class="qs-stages">${stg.map(k => { const have = cus.filter(c => c.stage === k).sort((a, b) => (a.grade || 0) - (b.grade || 0));
      const soon = k === 'university' ? [] : STAGE_GRADES[k].filter(g => !have.some(c => c.grade === g));
      const all = have.map(c => ({ g: c.grade || 0, c })).concat(soon.map(g => ({ g }))).sort((a, b) => a.g - b.g);
      return `<div class="qr-h">${STAGE_AR[k]}</div><div class="qsubs">${all.map(x => x.c
        ? `<button class="qsub" data-act="q-gcu" data-id="${x.c.id}"><span class="qsub-n">${x.g || '•'}</span><span class="grow"><b>${gradeAr(x.c)}</b><small>${cnt[x.c.id]} سؤالاً</small></span><i>‹</i></button>`
        : `<div class="qsub soon"><span class="qsub-n">${x.g}</span><span class="grow"><b>الصف ${GRADES[x.g - 1]}</b><small>قريباً</small></span></div>`).join('')}</div>`; }).join('')}</div>`;
}
function qGlobLessons(cu){
  const qs = QS.glob.filter(q => q.curriculum_id === cu), cnt = {}, order = [];
  const P = QS.pick || new Set(), got = {};
  qs.forEach(q => { const k = q.lesson || NO_LESSON; if (!cnt[k]) order.push(k); cnt[k] = (cnt[k] || 0) + 1; if (P.has(q.id)) got[k] = (got[k] || 0) + 1; });
  if (!qs.length) return '<div class="card center muted">لا توجد أسئلة في هذا الصف بعد.</div>';
  const ls = order.filter(k => k !== NO_LESSON).concat(cnt[NO_LESSON] ? [NO_LESSON] : []);
  return `<div class="qr-h">الدروس (${ls.length})</div>${ls.map((k, i) => `<div class="qgrp-w"><button class="qgrp" data-act="q-gles" data-l="${esc(k)}"><span class="qgrp-e qr-n">${k === NO_LESSON ? '•' : i + 1}</span><span class="grow"><b>${k === NO_LESSON ? 'بدون درس محدد' : esc(k)}</b><small>${cnt[k]} سؤالاً${got[k] ? ` · <b class="qi2-pk" style="display:inline">✓ أضفت ${got[k] === cnt[k] ? 'الكل' : got[k]}</b>` : ''}</small></span><i>‹</i></button>${got[k] === cnt[k] ? `<button class="qgrp-tg on" data-act="q-les-tg" data-l="${esc(k)}" data-on="0" aria-label="إزالة الدرس من أسئلتي">${ic('check')}</button>` : `<button class="qgrp-tg" data-act="q-les-tg" data-l="${esc(k)}" data-on="1" aria-label="أضف الدرس إلى أسئلتي">${ic('plus')}</button>`}</div>`).join('')}
    <button class="q-flat" data-act="q-gles" data-l="">عرض كل أسئلة الصف (${qs.length})</button>`;
}
ACTS['q-grp'] = t => { T.qf.g = t.dataset.g; T.qf.gs = ''; T.qf.gcu = ''; T.qf.gl = null; QS.open = null; renderQuestions(); scrollTo(0, 0); };
ACTS['q-gsubj'] = t => { T.qf.g = 'curriculum'; T.qf.gs = t.dataset.s; T.qf.gcu = ''; T.qf.gl = null; QS.open = null; renderQuestions(); scrollTo(0, 0); };
ACTS['q-gcu'] = t => { T.qf.gcu = t.dataset.id; T.qf.gl = null; QS.open = null; renderQuestions(); scrollTo(0, 0); };
ACTS['q-gles'] = t => { T.qf.gl = t.dataset.l; QS.open = null; renderQuestions(); scrollTo(0, 0); };
/* curriculum tree: subject → stage/grade → questions */
const SUBJ_MAIN = ['اللغة العربية', 'التربية الإسلامية', 'الرياضيات', 'العلوم', 'اللغة الإنجليزية', 'الاجتماعيات'];
const STAGE_ORDER = ['primary', 'middle', 'secondary', 'university'];
function qPicked(){ const P = QS.pick || new Set(); return QS.glob.filter(q => P.has(q.id)).map(q => Object.assign(q, { status: 'approved', _pk: true })); }
function qStatusSrc(){ const f = T.qf; return f.status === 'global' ? QS.glob.filter(q => QS.searchOn || ((!f.g || q.qtype === f.g) && (!f.gcu || q.curriculum_id === f.gcu) && (!f.gl || (q.lesson || NO_LESSON) === f.gl))) : QS.list.filter(q => q.status === f.status).concat(f.status === 'approved' ? qPicked() : []); }
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
    const parts = [`<button data-act="q-grp" data-g="">بنك الأسئلة</button>`];
    if (f.g !== 'curriculum' || !f.gs) { const g = QG.find(x => x[0] === f.g); parts.push(`<b>${g[1]} ${g[2]}</b>`); }
    else { const c = f.gcu && CU.list.find(x => x.id === f.gcu);
      parts.push(c ? `<button data-act="q-gsubj" data-s="${esc(f.gs)}">${esc(f.gs)}</button>` : `<b>${esc(f.gs)}</b>`);
      if (c) parts.push(f.gl != null ? `<button data-act="q-gcu" data-id="${c.id}">${STAGE_AR[c.stage]} · ${gradeAr(c)}</button>` : `<b>${STAGE_AR[c.stage]} · ${gradeAr(c)}</b>`);
    }
    return qBackBar(parts); }
  if (f.status === 'draft') return qBackBar([`<button data-act="t-qs" data-v="approved">أسئلتي</button>`, '<b>تنتظر مراجعتك</b>']);
  if (!f.subj) return '';
  const c = f.cu && CU.list.find(x => x.id === f.cu);
  const parts = [`<button data-act="q-nav" data-s="">كل المواد</button>`];
  if (f.subj === '__list') parts.push('<b>كل الأسئلة</b>');
  else if (f.subj === 'none') parts.push('<b>بدون منهج</b>');
  else { parts.push(c ? `<button data-act="q-nav" data-s="${esc(f.subj)}">${esc(f.subj)}</button>` : `<b>${esc(f.subj)}</b>`);
    if (c) parts.push(`<b>${STAGE_AR[c.stage]} · ${gradeAr(c)}${c.title ? ' · ' + esc(c.title) : ''}</b>`); }
  return qBackBar(parts);
}
// Clear back: a big «‹ parent» button (goes up one level) + the current place as a heading.
function qBackBar(parts){
  let i = parts.length - 1; while (i >= 0 && !parts[i].startsWith('<button')) i--;
  if (i < 0) return '';
  const up = parts[i].replace('<button ', `<button class="q-back-b" aria-label="رجوع" `).replace('>', `>${ic('back')}<span>`).replace('</button>', '</span></button>');
  const here = parts.slice(i + 1).map(p => p.replace(/<\/?b>/g, '')).join(' · ');
  return `<nav class="q-back">${up}</nav>${here ? `<h2 class="q-here">${here}</h2>` : ''}`;
}
const SUBJ_MARK = { 'اللغة العربية': 'ع', 'التربية الإسلامية': 'إ', 'الرياضيات': '÷', 'العلوم': '⚗', 'اللغة الإنجليزية': 'En', 'الاجتماعيات': 'ج', 'الحاسوب': '</>' };
const subjMark = s => SUBJ_MARK[s] || s.replace(/^(اللغة|التربية)\s+/, '').replace(/^ال/, '').slice(0, 1);
function qFolders(){
  const src = qStatusSrc(), cnt = {}; let none = 0;
  src.forEach(q => { const c = q.curriculum_id && CU.list.find(x => x.id === q.curriculum_id); if (c) cnt[c.subject] = (cnt[c.subject] || 0) + 1; else none++; });
  const subs = [...new Set(SUBJ_MAIN.concat(CU.list.map(c => c.subject)))].filter(s => cnt[s]);
  const stages = s => [...new Set(CU.list.filter(c => c.subject === s).map(c => STAGE_AR[c.stage]))].join('، ');
  const row = (act, val, color, mark, name, sub, n) => `<div class="sw-row q-swr"><div class="sw-act"><div class="sw-r"><button class="del" data-act="q-clear" data-s="${esc(val)}"><i>${ic('trash')}</i><span>حذف</span></button></div><div class="sw-l"></div></div><button class="qsub sw-main" data-act="${act}" data-s="${esc(val)}" style="--c:${color}"><span class="qsub-ic">${mark}</span><span class="grow"><b>${esc(name)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span><em>${n}</em><i>‹</i></button></div>`;
  return `<div class="qsubs">${subs.map(s => row('q-nav', s, SUBJ_COLOR(s), esc(subjMark(s)), s, stages(s), cnt[s])).join('')}${none ? row('q-nav', 'none', '#8E8E93', ic('help'), 'عام وسرعة بديهة', '', none) : ''}</div>
    <p class="q-swhint">اسحب المادة لليسار لحذفها</p><div class="qsub-l"><button class="link" data-act="q-subj-pick">${ic('plus')} مادة أو صف جديد</button>${src.length > 5 ? '<button class="link" data-act="q-nav" data-s="__list">كل الأسئلة</button>' : ''}</div>`;
}
ACTS['q-subj-pick'] = () => sheet('اختر المادة', [...new Set(SUBJ_MAIN.concat(CU.list.map(c => c.subject)))].map(x => ({ act: 'm-run', attrs: `data-a="q-nav" data-s="${esc(x)}"`, icon: 'layers', label: esc(x) }))
  .concat([null, { act: 'm-run', attrs: 'data-a="q-subj-add"', icon: 'plus', label: 'مادة أخرى' }]));
function qEmpty(){
  return `<div class="q-empty2"><div class="q-empty2-ic">📝</div><b>ما عندك أسئلة بعد</b><p>المسابقات تلعب من «أسئلتي» فقط. اكتب أسئلتك بالزر فوق، أو أضف من بنك الأسئلة (${QS.glob.length} سؤالاً) درساً كاملاً بضغطة.</p><button class="btn" data-act="t-qs" data-v="global">${ic('plus')} أضف من بنك الأسئلة</button></div>`;
}
function qSubjectView(subj){
  // «أسئلتي» › subject: only the grades that actually have questions (adding is via «إضافة سؤال» / the bank).
  const src = qStatusSrc(), cnt = {}; src.forEach(q => { if (q.curriculum_id) cnt[q.curriculum_id] = (cnt[q.curriculum_id] || 0) + 1; });
  const mine = CU.list.filter(c => c.subject === subj && cnt[c.id]);
  if (mine.length < 2) return '';
  const ttl = c => c.title && c.owner_id ? ' · ' + esc(c.title) : '';
  return `<div class="qs-gr qs-gr-flat">${STAGE_ORDER.flatMap(k => mine.filter(c => c.stage === k).sort((a, b) => (a.grade || 0) - (b.grade || 0))).map(c => `<button class="qs-g on" data-act="q-nav-cu" data-id="${c.id}"><b>${STAGE_AR[c.stage]} · ${gradeAr(c)}${ttl(c)}</b><em>${cnt[c.id]}</em></button>`).join('')}</div>`;
}
function qListHtml(){
  const f = T.qf, ro = f.status === 'global';
  if (ro && !QS.searchOn && !f.g) return qGroups();
  if (ro && !QS.searchOn && f.g === 'curriculum' && f.gs && !f.gcu) return qGlobGrades(f.gs);
  if (ro && !QS.searchOn && f.gcu && f.gl == null) return qGlobLessons(f.gcu);
  if (!QS.list.length && !qPicked().length && !ro && !f.cu && !f.subj && !QS.searchOn) return qEmpty();
  if (f.status === 'approved' && !QS.searchOn && !f.subj) return qFolders();
  const list = qFiltered();
  if (ro && !QS.searchOn && f.gcu && f.gl != null) return qLesHead(list) + qRoList(list);
  const head = f.status === 'approved' && !QS.searchOn && f.subj && !['none', '__list'].includes(f.subj) && !f.cu ? qSubjectView(f.subj) : '';
  const addHere = f.cu ? `<button class="q-addhere" data-act="t-q-add-menu">${ic('plus')} إضافة أسئلة لهذا المنهج</button>` : '';
  if (!list.length) return head + `<div class="card center muted">${QS.searchOn ? 'لا نتائج للبحث.' : f.cu ? 'لا توجد أسئلة في هذا المنهج بعد.' : f.status === 'draft' ? 'لا توجد أسئلة بانتظار المراجعة.' : 'لا توجد أسئلة هنا.'}</div>` + addHere;
  const clr = !ro && f.status === 'approved' && f.subj && !QS.selOn ? `<button class="q-clear" data-act="q-clear">${ic('trash')} ${list.every(q => q._pk) ? 'إزالة' : 'حذف'} كل أسئلة ${f.subj === 'none' ? 'عام وسرعة بديهة' : f.subj === '__list' ? 'أسئلتي' : f.cu ? 'هذا الصف' : esc(f.subj)} (${list.length})</button>` : '';
  return head + (head ? `<div class="qs-lh">كل أسئلة ${esc(f.subj)} (${list.length})</div>` : '') + (ro ? qRoList(list) : list.map(q => qItem(q, ro)).join('')) + addHere + clr;
}
// Ready questions: the ones in «أسئلتي» first, the rest below, dimmed, under their own heading.
function qRoList(list){
  const P = QS.pick || new Set(), inn = list.filter(q => P.has(q.id)), out = list.filter(q => !P.has(q.id));
  return (inn.length && out.length ? `<div class="qs-lh in">${ic('check')} في أسئلتي، تدخل المسابقات (${inn.length})</div>` : '') + inn.map(q => qItem(q, true)).join('')
    + (out.length && inn.length ? `<div class="qs-lh out">غير مضافة، ما تدخل المسابقات (${out.length})</div>` : '') + out.map(q => qItem(q, true)).join('');
}
ACTS['q-nav'] = t => { if (t.classList.contains('open')) { t.classList.remove('open'); t.style.transform = ''; t.dataset.off = 0; return; } T.qf.subj = t.dataset.s; T.qf.cu = ''; QS.selOn = false; QS.sel.clear(); renderQuestions(); scrollTo(0, 0); };
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
    ${[...QS.sel].some(id => QS.pick && QS.pick.has(id)) ? `<button class="btn sm" data-act="t-q-bulk-unpick">${ic('x')} إزالة</button>` : `<button class="btn sm" data-act="t-q-bulk" data-s="approved" ${n ? '' : 'disabled'}>${ic('check')} إتاحة</button>`}
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
    ${f.from3 ? '' : `<div class="seg2 q-tabs2"><button class="${mine ? 'on' : ''}" data-act="t-qs" data-v="approved">أسئلتي</button><button class="${ro ? 'on' : ''}" data-act="t-qs" data-v="global">بنك الأسئلة</button></div>`}
    ${QS.searchOn || (ro ? f.g : f.subj || f.status === 'draft') ? '' : qOk()}
    ${mine && !QS.selOn && !QS.searchOn ? `<div class="q-addrow"><button class="btn q-addbig" data-act="t-q-add">${ic('plus')} إضافة سؤال</button><button class="btn soft" data-act="t-q-add-menu">استيراد مجموعة</button>${QS.list.length || qPicked().length ? `<button class="icon-btn" data-act="t-q-more" aria-label="المزيد">${ic('more')}</button>` : ''}</div>` : ''}
    ${mine && nd && f.status !== 'draft' && !QS.searchOn ? `<button class="q-ban" data-act="t-qs" data-v="draft"><span>⏳ ${nd === 1 ? 'سؤال واحد ينتظر' : nd === 2 ? 'سؤالان ينتظران' : nd + ' أسئلة تنتظر'} مراجعتك</span><u>راجعها</u></button>` : ''}
    ${f.status === 'draft' && nd > 1 && !QS.selOn ? `<button class="btn accent" data-act="t-q-approve-all">${ic('check')} إتاحة الكل (${nd})</button>` : ''}
    ${qSelBar()}
    ${f.from3 && f.gl != null ? '' : qCrumb()}<div id="qlist" class="qi-list">${qListHtml()}</div>
    <input type="file" id="qxl" accept=".xlsx,.xls,.csv" class="hide" data-change="t-q-chosen"><input type="file" id="qocr" accept="image/*" class="hide" data-change="t-q-ocr-chosen">`;
  const home3 = f.status === 'approved' && !QS.searchOn && !f.subj && !QS.selOn;
  if (home3) { T.qf.from3 = false; return view('الأسئلة', q3Home() + `<input type="file" id="qxl" accept=".xlsx,.xls,.csv" class="hide" data-change="t-q-chosen"><input type="file" id="qocr" accept="image/*" class="hide" data-change="t-q-ocr-chosen">`, 'questions'); }
  view('الأسئلة', (T.qf.from3 ? `<button class="q3-back" data-act="q-home3">‹ رجوع لأسئلتي</button>` : '') + body, 'questions', top);
}
/* redesigned «أسئلتي»: the teacher's lessons with on/off switches */
function q3Cus(){
  const P = QS.pick || new Set(), ids = new Set();
  QS.glob.forEach(q => { if (q.curriculum_id && P.has(q.id)) ids.add(q.curriculum_id); });
  QS.list.forEach(q => { if (q.curriculum_id && q.status === 'approved') ids.add(q.curriculum_id); });
  return CU.list.filter(c => ids.has(c.id));
}
function q3Home(){
  const P = QS.pick || new Set(), own = QS.list.filter(q => q.status === 'approved' && !q.lesson).length, nd = QS.list.filter(q => q.status === 'draft').length;
  const cuOf = id => CU.list.find(c => c.id === id);
  // chosen lessons = picked ready questions grouped by curriculum + lesson
  const G = {}; QS.glob.forEach(q => { if (!P.has(q.id) || !q.curriculum_id) return; const k = q.curriculum_id + '|' + (q.lesson || NO_LESSON); (G[k] = G[k] || { cu: q.curriculum_id, l: q.lesson || NO_LESSON, n: 0 }).n++; });
  QS.list.forEach(q => { if (q.status !== 'approved' || !q.lesson || !q.curriculum_id) return; const k = q.curriculum_id + '|' + q.lesson; (G[k] = G[k] || { cu: q.curriculum_id, l: q.lesson, n: 0 }).n++; });
  const mine = Object.values(G).filter(g => cuOf(g.cu)); QS.mine3 = mine;
  if (!mine.some(g => g.cu === T.qf.cu3)) T.qf.cu3 = mine.length ? mine[0].cu : '';
  const total = own + mine.reduce((a, g) => a + g.n, 0), days = Math.floor(total / QPD);
  const tiles = mine.map((g, i) => { const c = cuOf(g.cu); return `<button class="q4-mt${QS.new3 === g.cu + '|' + g.l ? ' new' : ''}" data-act="q4-les" data-i="${i}"><span class="e">${SUBJ_EMOJI[c.subject] || '📘'}</span><b>${g.l === NO_LESSON ? 'أسئلة عامة' : esc(g.l)}</b><small>${esc(q4Gr(c))} · ${g.n} سؤال</small></button>`; }).join('')
    + (own ? `<button class="q4-mt self" data-act="q4-own"><span class="e">✍️</span><b>أسئلتي الخاصة</b><small>${own} سؤال</small></button>` : '');
  QS.new3 = null;
  const subs = q4Subjects(), mySub = new Set(mine.map(g => cuOf(g.cu).subject));
  const bank = subs.sort((x, y) => mySub.has(y.s) - mySub.has(x.s)).map(x => `<button class="q4-st${mySub.has(x.s) ? ' mine' : ''}" data-act="q4-subj" data-s="${esc(x.s)}"><span class="e">${SUBJ_EMOJI[x.s] || '📘'}</span>${esc(x.s)}<small>${x.n} درس</small></button>`).join('');
  const ownAll = QS.list.filter(q => (q.status === 'approved' || q.status === 'draft') && !q.lesson).length;
  const ownTile = ownAll ? `<button class="q4-st${own ? ' mine' : ''}" data-act="q4-own"><span class="e">✍️</span>أسئلتي الخاصة<small>${own} من ${ownAll} شغّالة</small></button>` : '';
  /* v129: one square per subject; subjects with chosen lessons are green with ✓ and come first */
  const st = {}; mine.forEach(g => { const sj = cuOf(g.cu).subject; (st[sj] = st[sj] || { l: 0, n: 0 }); st[sj].l++; st[sj].n += g.n; });
  const sq = subs.sort((x, y) => (!!st[y.s]) - (!!st[x.s])).map(x => { const m = st[x.s]; return `<button class="q5-sb${m ? ' on' : ''}" data-act="q4-subj" data-s="${esc(x.s)}"><span class="e">${SUBJ_EMOJI[x.s] || '📘'}</span><b>${esc(x.s)}</b><small>${m ? `${m.l} ${m.l === 1 ? 'درس' : 'دروس'} · ${m.n} سؤال` : x.n + ' درس'}</small></button>`; });
  /* v261 (Khalid): «موادي» (profile subjects + ones with active lessons + own) first, then «مواد أخرى» */
  const myS = new Set(mySubjects()); Object.keys(st).forEach(k => myS.add(k)); const keyOf = h => (h.match(/data-s="([^"]*)"/) || [])[1];
  const sqMine = sq.filter(h => myS.has(keyOf(h)) || (!myS.size && st[keyOf(h)])), sqOther = sq.filter(h => !sqMine.includes(h));
  if (ownAll) sqMine.splice(own ? sqMine.filter(h => / on"/.test(h)).length : sqMine.length, 0, `<button class="q5-sb${own ? ' on' : ''}" data-act="q4-own"><span class="e">✍️</span><b>أسئلتي الخاصة</b><small>${own ? own + ' شغّالة' : ownAll + ' سؤال'}</small></button>`);
  if (0) sq.splice(own ? Object.keys(st).length : sq.length, 0, `<button class="q5-sb${own ? ' on' : ''}" data-act="q4-own"><span class="e">✍️</span><b>أسئلتي الخاصة</b><small>${own ? own + ' شغّالة' : ownAll + ' سؤال'}</small></button>`);
  return `<div class="q4">
    ${total ? `<div class="q4-days">عندك ${total} سؤال، تكفي ${daysAr(days)} ${days >= 7 ? '👍' : '⚠️'}</div>` : `<div class="q4-days low">اضغط مادة تحت وشغّل دروسها</div>`}
    <button class="p3-big" data-act="q3-add">＋ أضف سؤال</button>
    <div class="q5-lbl">موادي</div><div class="q5-hint">✅ الدروس اللي تشغّلها هنا هي اللي تطلع للطلاب في التحدي</div>
    <div class="q5-sq">${sqMine.join('')}<button class="q5-sb q5-new" data-act="q5-newsubj"><span class="e">＋</span><b>مادة جديدة</b></button></div>
    ${sqOther.length ? `<div class="q5-lbl q5-oth">مواد أخرى</div><div class="q5-sq q5-oth-sq">${sqOther.join('')}</div>` : ''}</div>`;
}
const q4Gr = c => c.grade ? (c.stage === 'university' ? 'سنة ' + c.grade : (GRADES[c.grade - 1] || c.grade)).replace(/^ال/, '') : (STAGE_AR[c.stage] || '');
// curricula that fit the teacher's classes (grade from the class name, else the whole stage)
function q4Fit(){
  const cls = QS.cls3 || []; if (!cls.length) return () => true;
  const g = new Set(), st = new Set(); cls.forEach(c => { const n = nwGrade(c); if (n && c.stage) g.add(c.stage + '|' + n); else if (c.stage) st.add(c.stage); });
  return c => g.has(c.stage + '|' + c.grade) || st.has(c.stage) || (!c.grade && [...g].some(k => k.startsWith(c.stage + '|')));
}
function q4Subjects(){
  const fit = q4Fit(), have = {}; QS.glob.forEach(q => { if (q.curriculum_id) (have[q.curriculum_id] = have[q.curriculum_id] || new Set()).add(q.lesson || NO_LESSON); });
  let list = CU.list.filter(c => have[c.id] && fit(c)); if (!list.length) list = CU.list.filter(c => have[c.id]);
  const ownHas = c => (((T.settings || {}).myLes || {})[c.id] || []).length || QS.list.some(q => q.curriculum_id === c.id);
  CU.list.forEach(c => { if (!list.includes(c) && (c.id === QS.newCu || ((!c.owner_id || c.owner_id === T.user.id) && ownHas(c)))) list.push(c); });
  const by = {}; list.forEach(c => { (by[c.subject] = by[c.subject] || { s: c.subject, cus: [], n: 0 }); by[c.subject].cus.push(c); by[c.subject].n += Object.keys(q4By(c.id)).length; });
  return Object.values(by);
}
const q4Key = (cu, l) => cu + '|' + l;
const q4LN = (cu, l) => l === NO_LESSON ? 'أسئلة عامة' : ((((T.settings || {}).lesName) || {})[q4Key(cu, l)] || l);
const q4On = q => q.owner_id ? q.status === 'approved' : !!(QS.pick && QS.pick.has(q.id));
function q4LesQs(cu, l){ return QS.glob.filter(q => q.curriculum_id === cu && (q.lesson || NO_LESSON) === l).concat(QS.list.filter(q => q.curriculum_id === cu && q.lesson === l && (q.status === 'approved' || q.status === 'draft'))); }
function q4By(cu){
  const by = {}; QS.glob.filter(q => q.curriculum_id === cu).forEach(q => { const l = q.lesson || NO_LESSON; (by[l] = by[l] || []).push(q); });
  QS.list.filter(q => q.curriculum_id === cu && q.lesson && (q.status === 'approved' || q.status === 'draft')).forEach(q => { (by[q.lesson] = by[q.lesson] || []).push(q); });
  ((((T.settings || {}).myLes) || {})[cu] || []).forEach(l => { if (!by[l]) by[l] = []; });
  return by;
}
const q4Mine = (cu, l) => !QS.glob.some(q => q.curriculum_id === cu && (q.lesson || NO_LESSON) === l);
function q4Open(html){ const open = document.querySelector('.modal .q4-sh'); if (open) open.outerHTML = html; else { closeModals(); modal(html); } }
function q4SubjSheet(s){
  const x = q4Subjects().find(y => y.s === s); if (!x) return;
  x.cus.sort((a, b) => (a.grade || 0) - (b.grade || 0));
  const cu = x.cus.find(c => c.id === QS.subjCu) || x.cus[0]; QS.subjCu = cu.id; QS.subj3 = s;
  const by = q4By(cu.id), ed = !!QS.ed4;
  const les = Object.keys(by).sort((a, b) => (a === NO_LESSON) - (b === NO_LESSON)); QS.les3 = les;
  q4Open(`<div class="q4-sh"><div class="q4-shh"><span class="e">${SUBJ_EMOJI[s] || '📘'}</span><h3>${esc(s)}</h3><button class="q4-ed${ed ? ' on' : ''}" data-act="q4-ed">${ed ? 'تم التعديل' : '✏️ تعديل'}</button><button class="q4-x" data-act="close-modal" aria-label="إغلاق">✕</button></div>
    ${x.cus.length > 1 ? `<div class="q4-chips">${x.cus.map(c => `<button class="${c.id === cu.id ? 'on' : ''}" data-act="q4-gr" data-id="${c.id}">${esc(q4Gr(c))}</button>`).join('')}</div>` : ''}
    <div class="q4-les">${les.map((l, i) => { const on = !ed && by[l].some(q4On); return `<button class="q4-lt${on ? ' added' : ''}" data-act="${ed ? 'q4-led' : 'q4-tg'}" data-i="${i}">${ed ? '<span class="q4-pen">✏️</span>' : ''}<b>${esc(q4LN(cu.id, l))}</b><small>${by[l].length} سؤال</small>${q4Mine(cu.id, l) ? '<span class="q4-mine">درسك</span>' : ''}</button>`; }).join('')}${ed ? '<button class="q4-lt q4-add" data-act="q4-newl"><b>＋ درس جديد</b></button>' : ''}</div>
    <p class="p3-note">${ed ? 'اضغط الدرس عشان تعدّل أسئلته أو تحذفه. التعديل عندك بس.' : 'اضغط أكثر من درس، كل واحد ينضاف لأسئلتك ✓'}</p>
    ${!ed && les.some(l => !by[l].some(q4On)) ? `<button class="q4-all" data-act="q4-all">＋ أضف كل الدروس</button>` : ''}
    ${ed && ADM.st && ADM.st.is && !ADM.st.act && cu.owner_id && cu.owner_id === T.user.id ? `<button class="q4-all" data-act="q4-pub">📢 انشرها للكل</button>` : ''}
    <button class="p3-big" data-act="q4-done">تم ✓</button></div>`);
}
ACTS['q4-pub'] = async t => {
  if (!await ask('تنتقل المادة ودروسها وأسئلتها لبنك الأسئلة، ويقدر كل المعلمين يضيفونها.', { title: 'نشر المادة للكل؟', ok: 'نشر', danger: false })) return;
  t.setAttribute('aria-busy', 'true');
  try { const n = await rpc('admin_publish_curriculum', { p_cu: QS.subjCu }); toast(`انتشرت للكل ✓ (${n} سؤال)`); QS.ed4 = false; await tQuestions(); q4SubjSheet(QS.subj3); }
  catch(e){ t.removeAttribute('aria-busy'); toast(/function|schema cache/i.test(e.message || '') ? 'تحتاج تشغيل ملف admin_publish.sql أول' : errMsg(e)); }
};
ACTS['q4-ed'] = () => { QS.ed4 = !QS.ed4; q4SubjSheet(QS.subj3); };
async function q4SetOn(qs, on){
  const bank = qs.filter(q => !q.owner_id).map(q => q.id), own = qs.filter(q => q.owner_id).map(q => q.id);
  if (bank.length && !await qPickSet(bank, on)) return false;
  if (own.length && !await qOwnSet(own, on)) return false;
  return true;
}
async function q4SaveSettings(){ const { error } = await sb.from('teachers').update({ settings: T.settings }).eq('id', T.user.id); if (error) { toast(errMsg(error)); return false; } return true; }
ACTS['q4-newl'] = async () => {
  const v = await ask('', { title: 'درس جديد', input: '', placeholder: 'اسم الدرس', ok: 'إضافة', danger: false }); const n = (v || '').trim().slice(0, 80); if (!n) return;
  const cu = QS.subjCu, by = q4By(cu); if (by[n]) return toast('فيه درس بنفس الاسم');
  T.settings = T.settings || {}; const m = T.settings.myLes = T.settings.myLes || {}; (m[cu] = m[cu] || []).push(n);
  if (!await q4SaveSettings()) return; q4LedSheet(n);
};
ACTS['q4-led'] = t => { const l = (QS.les3 || [])[+t.dataset.i]; if (l != null) q4LedSheet(l); };
function q4LedSheet(l){
  QS.led = l; const cu = QS.subjCu, qs = q4LesQs(cu, l);
  q4Open(`<div class="q4-sh"><div class="q4-shh"><button class="q4-x" data-act="q4-back" aria-label="رجوع">→</button><h3>${esc(q4LN(cu, l))}</h3>${l === NO_LESSON ? '' : '<button class="q4-x" data-act="q4-ren" aria-label="تغيير الاسم">✏️</button>'}</div>
    <div class="q4-ql">${qs.map((q, k) => `<button class="q4-qr" data-act="q4-qe" data-id="${q.id}"><em>${k + 1}</em><span class="grow"><b>${esc(q.body)}</b></span>${q.owner_id && !q4Mine(cu, l) ? '<small>عدّلته</small>' : ''}</button>`).join('') || '<p class="p3-note">ما فيه أسئلة بعد</p>'}</div>
    <div class="q4-2"><button class="q4-addq" data-act="q4-qe" data-id="">＋ أضف سؤال</button><button class="q4-addq" data-act="q4-imp">📷 من صورة أو ملف</button></div>
    <button class="q4-del" data-act="q4-dell">حذف الدرس</button>
    <button class="p3-big" data-act="q4-back">تم ✓</button></div>`);
}
ACTS['q4-back'] = () => q4SubjSheet(QS.subj3);
ACTS['q4-ren'] = async () => {
  const cu = QS.subjCu, l = QS.led, v = await ask('', { title: 'اسم الدرس', input: q4LN(cu, l), ok: 'حفظ', danger: false }); const n = (v || '').trim().slice(0, 80); if (!n || n === q4LN(cu, l)) return;
  if (q4Mine(cu, l)) {
    const ids = QS.list.filter(q => q.curriculum_id === cu && q.lesson === l).map(q => q.id);
    if (ids.length) { const { error } = await sb.from('questions').update({ lesson: n }).in('id', ids); if (error) return toast(errMsg(error)); QS.list.forEach(q => { if (ids.includes(q.id)) q.lesson = n; }); }
    const m = ((T.settings || {}).myLes || {})[cu]; if (m) { const i = m.indexOf(l); if (i >= 0) m[i] = n; await q4SaveSettings(); }
    QS.led = n;
  } else { T.settings = T.settings || {}; (T.settings.lesName = T.settings.lesName || {})[q4Key(cu, l)] = n; if (!await q4SaveSettings()) return; }
  toast('تغيّر الاسم ✓'); renderQuestionsKeepModal(); q4LedSheet(QS.led);
};
ACTS['q4-dell'] = async () => {
  const cu = QS.subjCu, l = QS.led, qs = q4LesQs(cu, l);
  if (!await ask('ينشال من عندك بس.', { title: `حذف «${q4LN(cu, l)}»؟`, ok: 'حذف', danger: true })) return;
  const bank = qs.filter(q => !q.owner_id).map(q => q.id), own = qs.filter(q => q.owner_id).map(q => q.id);
  if (bank.length) { if (!await qPickSet(bank, false)) return; const { error } = await sb.from('question_hides').insert(bank.map(id => ({ question_id: id }))); if (error) return toast(errMsg(error)); }
  if (own.length) { const { error } = await sb.from('questions').delete().in('id', own); if (error) return toast(errMsg(error)); }
  const m = ((T.settings || {}).myLes || {})[cu]; if (m && m.includes(l)) { m.splice(m.indexOf(l), 1); await q4SaveSettings(); }
  toast('انحذف الدرس'); await tQuestions(); q4SubjSheet(QS.subj3);
};
ACTS['q4-qe'] = t => { QS.q4q = null; q4QForm(t.dataset.id); };
function q4QForm(id, pre){
  const q = id ? (QS.glob.find(x => x.id === id) || QS.list.find(x => x.id === id)) : null; QS.qe = id || '';
  const o = q ? q.options.slice() : pre ? pre.options.slice(0, 4) : ['', '', '', '']; while (o.length < 4) o.push(''); const ci = q ? q.correct_index : pre ? -1 : 0;
  const m = q ? (q.payload && q.payload.kind === 'order' ? 2 : q.options.length === 2 ? 1 : 0) : 0;
  const qq = QS.q4q, hd = pre && qq ? `سؤال ${qq.total - qq.list.length} من ${qq.total}` : q ? 'تعديل السؤال' : 'سؤال جديد';
  q4Open(`<div class="q4-sh"><div class="q4-shh"><button class="q4-x" data-act="${pre ? 'q4-qq-stop' : 'q4-bl'}" aria-label="رجوع">→</button><h3>${hd}</h3>${pre ? '<button class="q4-ed" data-act="q4-qq-skip">تخطّي</button>' : ''}</div>
    <form class="q4-qf m${m}" data-form="q4-qsave"><input type="hidden" name="m" value="${m}"><input type="hidden" name="tfa" value="${m === 1 ? (q.correct_index === 0 ? '1' : '0') : ''}">
    ${pre || q ? '' : `<div class="p3-seg">${['٤ خيارات', 'صح أو خطأ', 'رتّب'].map((x, i) => `<button type="button" class="${i === m ? 'on' : ''}" data-act="q4-mode" data-m="${i}">${x}</button>`).join('')}</div>`}
    <label for="q4b">السؤال</label><textarea class="input" id="q4b" name="b" required maxlength="400">${q ? esc(q.body) : pre ? esc(pre.body) : ''}</textarea>
    <div class="q4-tf"><label>الجملة هذي…</label><div class="p3-tfb"><button type="button" class="t${m === 1 && q.correct_index === 0 ? ' on' : ''}" data-act="q4-tfa" data-v="1">✅ صح</button><button type="button" class="f${m === 1 && q.correct_index === 1 ? ' on' : ''}" data-act="q4-tfa" data-v="0">❌ خطأ</button></div></div>
    <div class="q4-or"><label>اكتبها بالترتيب الصحيح، والتطبيق يخلطها للطالب</label>${[0, 1, 2, 3].map(i => `<div class="p3-orr"><b>${'١٢٣٤'[i]}</b><input class="input" name="r${i}" maxlength="60" value="${m === 2 ? esc(q.options[i] || '') : ''}" placeholder="${i < 3 ? 'مطلوب' : 'اختياري'}"></div>`).join('')}</div>
    <div class="q4-mc"><label>${pre ? '👇 اضغط الدائرة جنب الإجابة الصحيحة' : 'الإجابات (اضغط الدائرة للصحيحة)'}</label>
    ${o.slice(0, 4).map((v, j) => `<div class="q4-op"><button type="button" class="${j === ci ? 'ok' : ''}" data-act="q4-ok" data-j="${j}" aria-label="الإجابة الصحيحة">${j === ci ? '✓' : ''}</button><input class="input" name="o${j}" value="${esc(v)}" maxlength="120"></div>`).join('')}</div>
    <input type="hidden" name="c" value="${ci}">
    <p class="p3-note">التعديل عندك بس، وما يتغيّر عند المعلمين الثانيين.</p>
    <button class="p3-big" type="submit">حفظ</button></form>
    ${q ? '<button class="q4-del" data-act="q4-qdel">حذف السؤال</button>' : ''}</div>`);
}
ACTS['q4-bl'] = () => q4LedSheet(QS.led);
ACTS['q4-ok'] = t => { const f = t.closest('form'); f.querySelectorAll('.q4-op button').forEach(b => { b.className = ''; b.textContent = ''; }); t.className = 'ok'; t.textContent = '✓'; f.c.value = t.dataset.j; };
ACTS['q4-mode'] = t => { const f = t.closest('form'); f.m.value = t.dataset.m; f.className = 'q4-qf m' + t.dataset.m; t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); };
ACTS['q4-tfa'] = t => { const f = t.closest('form'); f.tfa.value = t.dataset.v; t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); haptic(); };
ACTS['q4-qsave'] = async f => {
  const cu = QS.subjCu, l = QS.led, body = f.b.value.trim(), m = f.m.value; let opts, ci, payload = null;
  if (!body) return toast('اكتب السؤال');
  if (m === '1') { if (f.tfa.value === '') return toast('اضغط ✅ صح أو ❌ خطأ'); opts = ['صح', 'خطأ']; ci = f.tfa.value === '1' ? 0 : 1; }
  else if (m === '2') { opts = [0, 1, 2, 3].map(i => f['r' + i].value.trim()).filter(Boolean); if (opts.length < 3) return toast('اكتب ٣ أشياء على الأقل'); if (new Set(opts).size < opts.length) return toast('لازم تكون مختلفة'); ci = 0; payload = { kind: 'order' }; }
  else {
    const raw = [0, 1, 2, 3].map(j => f['o' + j].value.trim()), c = +f.c.value;
    if (c < 0) return toast('اضغط الدائرة جنب الإجابة الصحيحة');
    if (!raw[c]) return toast('اكتب الإجابة الصحيحة');
    opts = raw.filter(Boolean); ci = opts.indexOf(raw[c]); if (opts.length < 2) return toast('اكتب إجابتين على الأقل');
  }
  const old = QS.qe ? (QS.glob.find(x => x.id === QS.qe) || QS.list.find(x => x.id === QS.qe)) : null;
  const btn = f.querySelector('[type=submit]'); btn.setAttribute('aria-busy', 'true');
  let error;
  if (old && old.owner_id) ({ error } = await sb.from('questions').update({ body, options: opts, correct_index: ci, payload }).eq('id', old.id));
  else {
    const on = old ? q4On(old) : (q4LesQs(cu, l).some(q4On) || !q4LesQs(cu, l).length || q4Mine(cu, l));
    ({ error } = await sb.from('questions').insert({ owner_id: T.user.id, status: on ? 'approved' : 'draft', source: 'teacher', qtype: 'curriculum', level: (old && old.level) || 'medium', body, options: opts, correct_index: ci, payload, curriculum_id: cu, lesson: l === NO_LESSON ? null : l, image: (old && old.image) || null }));
    if (!error && old) { await qPickSet([old.id], false); ({ error } = await sb.from('question_hides').insert({ question_id: old.id })); }
  }
  if (error) { btn.removeAttribute('aria-busy'); return toast(errMsg(error)); }
  if (QS.q4q) { QS.q4q.saved++; return q4QNext(); }
  toast('انحفظ ✓'); await tQuestions(); q4LedSheet(l);
};
/* import into the open lesson: photo (read, then confirm each) or Excel (preview, then add all) */
ACTS['q4-imp'] = () => { q4File('q4ximg', 'image/*', 'q4-img'); q4File('q4xxl', '.xlsx,.xls,.csv', 'q4-xl');
  q4Open(`<div class="q4-sh"><div class="q4-shh"><button class="q4-x" data-act="q4-bl" aria-label="رجوع">→</button><h3>أضف أسئلة للدرس</h3></div>
    <button class="q5-imp" data-act="q4-pick" data-i="q4ximg"><span class="e">📷</span><b>صورة</b><small>ورقة أسئلة أو صفحة من الكتاب</small></button>
    <button class="q5-imp" data-act="q4-pick" data-i="q4xxl"><span class="e">📊</span><b>ملف Excel</b><small>كل سؤال في سطر</small></button>
    <button class="q4-del" data-act="t-q-template">تنزيل نموذج Excel</button></div>`); };
function q4File(id, acc, ch){ let i = document.getElementById(id); if (!i) { i = document.createElement('input'); i.type = 'file'; i.id = id; i.accept = acc; i.className = 'hide'; i.dataset.change = ch; document.body.appendChild(i); } i.value = ''; return i; }
ACTS['q4-pick'] = t => document.getElementById(t.dataset.i).click();
ACTS['q4-xl'] = async t => { const file = t.files && t.files[0]; if (!file) return;
  try { const c = parseQuestions(await readRows(file)); if (!c.length) return toast('الملف فارغ'); QS.toLes = { cu: QS.subjCu, l: QS.led }; closeModals(); qPreview(c, file.name); } catch(e){ toast(errMsg(e)); } };
ACTS['q4-img'] = async t => { const file = t.files && t.files[0]; if (!file) return;
  q4Open(`<div class="q4-sh"><h3>جاري قراءة الصورة…</h3><p class="p3-note">أول مرة تأخذ دقيقة تقريباً.</p><div class="ocr-bar"><i id="ocr-p"></i></div></div>`);
  try {
    await loadJs(OCRJS, 'Tesseract');
    const w = await Tesseract.createWorker('ara+eng', 1, { logger: x => { if (x.status === 'recognizing text') { const a = document.getElementById('ocr-p'); if (a) a.style.width = Math.round(x.progress * 100) + '%'; } } });
    const { data } = await w.recognize(await shrinkImg(file, 2200)); await w.terminate();
    const qs = ocrToQs(data.text || '').map(q => ({ body: q.body, options: q.options.slice(0, 4) }));
    if (!qs.length) { toast('ما قدرت أقرأ أسئلة واضحة. جرّب صورة أوضح.'); return q4LedSheet(QS.led); }
    QS.q4q = { list: qs, total: qs.length, saved: 0 }; q4QNext();
  } catch(e){ toast('تعذّرت قراءة الصورة'); q4LedSheet(QS.led); }
};
async function q4QNext(){ const o = QS.q4q, q = o && o.list.shift(); if (q) return q4QForm('', q);
  QS.q4q = null; toast(`انضاف ${o ? o.saved : 0} سؤال ✓`); await tQuestions(); q4LedSheet(QS.led); }
ACTS['q4-qq-skip'] = () => q4QNext();
ACTS['q4-qq-stop'] = () => { if (QS.q4q) QS.q4q.list = []; q4QNext(); };
ACTS['q4-qdel'] = async () => {
  const id = QS.qe, q = QS.glob.find(x => x.id === id) || QS.list.find(x => x.id === id); if (!q) return;
  if (!await ask('ينشال من عندك بس.', { title: 'حذف السؤال؟', ok: 'حذف', danger: true })) return;
  let error;
  if (q.owner_id) ({ error } = await sb.from('questions').delete().eq('id', id));
  else { if (!await qPickSet([id], false)) return; ({ error } = await sb.from('question_hides').insert({ question_id: id })); }
  if (error) return toast(errMsg(error)); toast('انحذف السؤال'); await tQuestions(); q4LedSheet(QS.led);
};
ACTS['q4-all'] = async t => { const P = QS.pick || new Set(), ids = QS.glob.filter(q => q.curriculum_id === QS.subjCu && !P.has(q.id)).map(q => q.id); if (!ids.length) return;
  t.setAttribute('aria-busy', 'true'); if (await qPickSet(ids, true)) { renderQuestionsKeepModal(); q4SubjSheet(QS.subj3); toast('انضافت كل الدروس ✓'); } else t.removeAttribute('aria-busy'); };
ACTS['q4-done'] = () => { closeModals(); renderQuestions(); scrollTo(0, 0); };
ACTS['q4-subj'] = t => { QS.subjCu = null; QS.ed4 = false; q4SubjSheet(t.dataset.s); };
ACTS['q4-gr'] = t => { QS.subjCu = t.dataset.id; q4SubjSheet(QS.subj3); };
ACTS['q4-tg'] = async t => {
  const l = (QS.les3 || [])[+t.dataset.i]; if (l == null) return;
  const qs = q4LesQs(QS.subjCu, l), on = !t.classList.contains('added'); if (!qs.length) return toast('الدرس فاضي، اضغط «✏️ تعديل» وأضف أسئلة');
  t.classList.toggle('added', on); t.setAttribute('aria-busy', 'true'); haptic();
  if (!await q4SetOn(qs, on)) { t.classList.toggle('added', !on); t.removeAttribute('aria-busy'); return; }
  t.removeAttribute('aria-busy'); if (on) QS.new3 = QS.subjCu + '|' + l; renderQuestionsKeepModal(); q4SubjSheet(QS.subj3); toast(on ? 'انضاف لأسئلتك ✓' : 'انشال من أسئلتك');
};
function q4LesSheet(i){
  const g = (QS.mine3 || [])[i]; if (!g) return closeModals();
  const c = CU.list.find(x => x.id === g.cu), P = QS.pick || new Set();
  const qs = QS.glob.filter(q => q.curriculum_id === g.cu && (q.lesson || NO_LESSON) === g.l); QS.les4 = { i, ids: qs.map(q => q.id) };
  const html = `<div class="q4-sh"><div class="q4-shh"><span class="e">${SUBJ_EMOJI[c.subject] || '📘'}</span><h3>${g.l === NO_LESSON ? 'أسئلة عامة' : esc(g.l)}</h3><button class="q4-x" data-act="close-modal" aria-label="إغلاق">✕</button></div>
    <p class="p3-note" style="text-align:start">${esc(c.subject)} · ${esc(q4Gr(c))} · ${qs.length} سؤال. اضغط أي سؤال تطفيه أو تشغّله، تقدر أكثر من واحد.</p>
    <div class="q4-qs">${qs.map(q => { const on = P.has(q.id); return `<button class="q4-qt${on ? ' added' : ''}" data-act="q4-q" data-id="${q.id}"><b>${esc(q.body)}</b><small>${esc(q.options[q.correct_index] || '')}</small></button>`; }).join('')}</div>
    ${qs.some(q => !P.has(q.id)) ? `<button class="q4-all" data-act="q4-qall" data-on="1">✓ شغّل كل الأسئلة</button>` : ''}
    <button class="p3-big" data-act="q4-done">تم ✓</button>
    <button class="q4-del" data-act="q4-rm">شيل الدرس</button></div>`;
  const open = document.querySelector('.modal .q4-sh');
  if (open) open.outerHTML = html; else { closeModals(); modal(html); }
}
ACTS['q4-les'] = t => q4LesSheet(+t.dataset.i);
/* own questions: same squares as a lesson; on = approved (plays in challenges), off = draft */
function q4OwnSheet(){
  const qs = QS.list.filter(q => (q.status === 'approved' || q.status === 'draft') && !q.lesson);
  const html = `<div class="q4-sh"><div class="q4-shh"><span class="e">✍️</span><h3>أسئلتي الخاصة</h3><button class="q4-x" data-act="close-modal" aria-label="إغلاق">✕</button></div>
    <p class="p3-note" style="text-align:start">${qs.length} سؤال. اضغط أي سؤال تطفيه أو تشغّله.</p>
    <div class="q4-qs">${qs.map(q => `<button class="q4-qt${q.status === 'approved' ? ' added' : ''}" data-act="q4-ownq" data-id="${q.id}"><b>${esc(q.body)}</b><small>${esc((q.options || [])[q.correct_index] || '')}</small></button>`).join('')}</div>
    ${qs.some(q => q.status !== 'approved') ? `<button class="q4-all" data-act="q4-ownall" data-on="1">✓ شغّل كل الأسئلة</button>` : `<button class="q4-all" data-act="q4-ownall" data-on="0">إيقاف الكل</button>`}
    <button class="p3-big" data-act="q4-done">تم ✓</button>
    <button class="q4-del" data-act="q-own3">تعديل أسئلتي ‹</button></div>`;
  const open = document.querySelector('.modal .q4-sh');
  if (open) open.outerHTML = html; else { closeModals(); modal(html); }
}
async function qOwnSet(ids, on){
  const { error } = await sb.from('questions').update({ status: on ? 'approved' : 'draft' }).in('id', ids);
  if (error) { toast(errMsg(error)); return false; }
  QS.list.forEach(q => { if (ids.includes(q.id)) q.status = on ? 'approved' : 'draft'; }); return true;
}
ACTS['q4-own'] = () => q4OwnSheet();
ACTS['q4-ownq'] = async t => { const id = t.dataset.id, on = !t.classList.contains('added'); t.classList.toggle('added', on); haptic();
  if (!await qOwnSet([id], on)) { t.classList.toggle('added', !on); return; } renderQuestionsKeepModal(); };
ACTS['q4-ownall'] = async t => { const on = t.dataset.on === '1', ids = QS.list.filter(q => q.status === (on ? 'draft' : 'approved')).map(q => q.id); if (!ids.length) return;
  t.setAttribute('aria-busy', 'true'); if (await qOwnSet(ids, on)) { renderQuestionsKeepModal(); q4OwnSheet(); } else t.removeAttribute('aria-busy'); };
ACTS['q4-q'] = async t => { const id = t.dataset.id, on = !(QS.pick && QS.pick.has(id));
  t.classList.toggle('added', on); haptic();
  if (!await qPickSet([id], on)) { t.classList.toggle('added', !on); return; }
  renderQuestionsKeepModal(); };
ACTS['q4-qall'] = async t => { const L = QS.les4; if (!L) return; t.setAttribute('aria-busy', 'true');
  if (await qPickSet(L.ids, true)) { renderQuestionsKeepModal(); q4LesSheet(L.i); } else t.removeAttribute('aria-busy'); };
ACTS['q4-rm'] = async () => { const L = QS.les4; if (!L) return;
  if (await qPickSet(L.ids, false)) { closeModals(); renderQuestions(); toast('انشال الدرس'); } };
/* add one question, like the preview: question, right answer, wrong ones filled in */
ACTS['q3-add'] = async () => {
  await loadCurricula().catch(() => {});
  const cu = CU.list.find(c => c.id === T.qf.cu3);
  modal(`<form class="p3-add" data-form="q3-save"><h3>سؤال جديد</h3>${cu ? `<p class="p3-sub">${esc(cu.subject)} · ${gradeAr(cu)}</p>` : ''}
    <input type="hidden" name="correct" value="0"><input type="hidden" name="tfm" value="0"><input type="hidden" name="tfa" value="">
    <div class="p3-seg"><button type="button" class="on" data-act="q3-type" data-t="0">٤ خيارات</button><button type="button" data-act="q3-type" data-t="1">صح أو خطأ</button><button type="button" data-act="q3-type" data-t="2">رتّب</button></div>
    <input class="p3-in" name="body" required maxlength="300" placeholder="اكتب السؤال" autocomplete="off">
    <div class="p3-tf"><p class="p3-sub">الجملة هذي…</p><div class="p3-tfb"><button type="button" class="t" data-act="q3-tfa" data-v="1">✅ صح</button><button type="button" class="f" data-act="q3-tfa" data-v="0">❌ خطأ</button></div></div>
    <div class="p3-or"><p class="p3-sub">اكتبها بالترتيب الصحيح، والتطبيق يخلطها للطالب</p>${[0, 1, 2, 3].map(i => `<div class="p3-orr"><b>${'١٢٣٤'[i]}</b><input class="p3-in" name="r${i}" maxlength="60" placeholder="${i < 3 ? 'مطلوب' : 'اختياري'}" autocomplete="off"></div>`).join('')}</div>
    <div class="p3-mc"><input class="p3-in ok" name="o0" required maxlength="100" placeholder="الجواب الصحيح" autocomplete="off">
    <p class="p3-sub">خيارات خاطئة (تنكتب لحالها، عدّلها إذا تبي)</p>
    <div class="p3-rows">${[1, 2, 3].map(i => `<div class="p3-row"><input class="p3-wr" name="o${i}" required maxlength="100" placeholder="خيار خاطئ" autocomplete="off"><span class="p3-spark">✨</span></div>`).join('')}</div></div>
    <button class="p3-big" type="submit">حفظ وأضف غيره</button>
    <button type="button" class="p3-ghost" data-act="q3-more">طرق أخرى ‹</button>
    <button type="button" class="p3-ghost muted" data-act="close-modal">خلصت</button></form>`);
  setTimeout(() => { const b = document.querySelector('.p3-add [name=body]'); if (b) b.focus(); }, 60);
};
ACTS['q3-more'] = () => { closeModals(); ACTS['t-q-add-menu'](); };
document.addEventListener('change', e => { const el = e.target; if (!el.closest || !el.closest('.p3-add')) return; if (el.name === 'o0' || el.name === 'body') { const f = el.form; if (f.o0.value.trim()) qfFillSug(f, false); } });
ACTS['q3-type'] = t => { const f = t.closest('form'), m = t.dataset.t; f.tfm.value = m; f.classList.toggle('tf', m === '1'); f.classList.toggle('or', m === '2');
  t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t));
  [0, 1, 2, 3].forEach(i => { f['o' + i].required = m === '0'; f['r' + i].required = m === '2' && i < 3; });
  f.body.placeholder = m === '1' ? 'اكتب جملة، مثل: الصلاة خمس مرات في اليوم' : m === '2' ? 'مثل: رتّب أركان الصلاة' : 'اكتب السؤال'; f.body.focus(); };
ACTS['q3-tfa'] = t => { const f = t.closest('form'); f.tfa.value = t.dataset.v; t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); haptic(); };
ACTS['q3-save'] = async f => {
  const btn = f.querySelector('[type=submit]'); if (btn.disabled) return;
  if (f.tfm.value === '2') {
    const body = f.body.value.trim(), items = [0, 1, 2, 3].map(i => f['r' + i].value.trim()).filter(Boolean); if (!body) return;
    if (items.length < 3) return toast('اكتب ٣ أشياء على الأقل'); if (new Set(items).size < items.length) return toast('لازم تكون مختلفة');
    const cu = T.qf.cu3 || null; btn.disabled = true;
    const r = await sb.from('questions').insert({ owner_id: T.user.id, status: 'approved', source: 'teacher', qtype: cu ? 'curriculum' : 'general', level: 'medium', body, options: items, correct_index: 0, payload: { kind: 'order' }, curriculum_id: cu, lesson: null }).select().single();
    btn.disabled = false;
    if (r.error) return toast(/options_check/.test(r.error.message || '') ? 'رتّب يحتاج تحديث قاعدة البيانات أول' : errMsg(r.error));
    QS.list.unshift(r.data); qDupIndex(); f.body.value = ''; [0, 1, 2, 3].forEach(i => { f['r' + i].value = ''; });
    toast('انحفظ ✓ اكتب اللي بعده'); f.body.focus(); renderQuestionsKeepModal(); return;
  }
  if (f.tfm.value === '1') {
    const body = f.body.value.trim(); if (!body) return;
    if (f.tfa.value === '') return toast('اضغط ✅ صح أو ❌ خطأ');
    if ((QS.norm[qNorm(body)] || []).length) return toast('هذا السؤال موجود من قبل');
    const cu = T.qf.cu3 || null; btn.disabled = true;
    const r = await sb.from('questions').insert({ owner_id: T.user.id, status: 'approved', source: 'teacher', qtype: cu ? 'curriculum' : 'general', level: 'easy', body, options: ['صح', 'خطأ'], correct_index: f.tfa.value === '1' ? 0 : 1, curriculum_id: cu, lesson: null }).select().single();
    btn.disabled = false;
    if (r.error) return toast(/options_check|correct_index_check/.test(r.error.message || '') ? 'صح أو خطأ يحتاج تحديث قاعدة البيانات أول' : errMsg(r.error));
    QS.list.unshift(r.data); qDupIndex(); f.body.value = ''; f.tfa.value = ''; f.querySelectorAll('.p3-tfb button').forEach(b => b.classList.remove('on'));
    toast('انحفظ ✓ اكتب اللي بعده'); f.body.focus(); renderQuestionsKeepModal(); return;
  }
  const opts = [0, 1, 2, 3].map(i => f['o' + i].value.trim()), body = f.body.value.trim();
  if (new Set(opts).size < 4) return toast('الخيارات لازم تكون مختلفة');
  if ((QS.norm[qNorm(body)] || []).length) return toast('هذا السؤال موجود من قبل');
  const o = opts.slice(); for (let i = 3; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
  const cu = T.qf.cu3 || null;
  btn.disabled = true;
  const r = await sb.from('questions').insert({ owner_id: T.user.id, status: 'approved', source: 'teacher', qtype: cu ? 'curriculum' : 'general', level: 'medium', body, options: o, correct_index: o.indexOf(opts[0]), curriculum_id: cu, lesson: null }).select().single();
  btn.disabled = false;
  if (r.error) return toast(errMsg(r.error));
  QS.list.unshift(r.data); qDupIndex();
  f.reset(); [1, 2, 3].forEach(i => { delete f['o' + i].dataset.sug; f['o' + i].classList.remove('sug'); });
  toast('انحفظ ✓ اكتب اللي بعده'); f.body.focus(); renderQuestionsKeepModal();
};
ACTS['q-cu3'] = t => { T.qf.cu3 = t.dataset.id; renderQuestions(); };
ACTS['q-sw3'] = async t => {
  const l = (QS.les3 || [])[+t.dataset.i], on = t.dataset.on === '1'; if (l == null) return;
  const ids = QS.glob.filter(q => q.curriculum_id === T.qf.cu3 && (q.lesson || NO_LESSON) === l).map(q => q.id);
  const sw = t.querySelector('.p3-sw') || t; sw.classList.toggle('on', on); haptic();
  if (await qPickSet(ids, on)) renderQuestions(); else sw.classList.toggle('on', !on);
};
ACTS['q-les3'] = t => { const l = (QS.les3 || [])[+t.dataset.i], c = CU.list.find(x => x.id === T.qf.cu3); if (l == null || !c) return;
  Object.assign(T.qf, { status: 'global', g: 'curriculum', gs: c.subject, gcu: c.id, gl: l, from3: true }); QS.open = null; renderQuestions(); scrollTo(0, 0); };
ACTS['q-own3'] = () => { closeModals(); Object.assign(T.qf, { subj: '__list', cu: '', from3: true }); renderQuestions(); scrollTo(0, 0); };
ACTS['q-bank3'] = () => { Object.assign(T.qf, { status: 'global', g: '', gs: '', gcu: '', gl: null, from3: true }); renderQuestions(); scrollTo(0, 0); };
ACTS['q-home3'] = () => { Object.assign(T.qf, { status: 'approved', subj: '', cu: '', g: '', gs: '', gcu: '', gl: null, from3: false }); QS.searchOn = false; QS.q = ''; renderQuestions(); scrollTo(0, 0); };
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
  modal(`<div class="aw-sheet"><h3>استيراد مجموعة أسئلة</h3>${here ? `<div class="aw-from">${esc(here.subject)} · ${gradeAr(here)}</div>` : ''}
    <button class="aw-opt" data-act="m-run" data-a="t-q-ocr"><span class="aw-oi">📷</span><span class="grow"><b>تصوير ورقة أسئلة</b><small>من كتاب أو اختبار</small></span></button>
    <button class="aw-opt" data-act="m-run" data-a="t-q-paste"><span class="aw-oi">📋</span><span class="grow"><b>لصق مجموعة أسئلة</b><small>سؤال في كل سطر</small></span></button>
    <button class="aw-opt" data-act="m-run" data-a="t-q-import"><span class="aw-oi">📄</span><span class="grow"><b>ملف Excel</b><small>لعدد كبير من الأسئلة</small></span></button>
    <button class="aw-opt" data-act="m-run" data-a="t-q-code"><span class="aw-oi">🔑</span><span class="grow"><b>رمز من زميل</b><small>أسئلة شاركها معلم آخر</small></span></button>
    <button class="link" data-act="m-run" data-a="t-q-template">تنزيل نموذج Excel</button></div>`);
};
ACTS['t-q-more'] = () => sheet('أسئلتي', [
  { act: 'm-run', attrs: 'data-a="t-q-selon"', icon: 'check', label: 'تحديد عدة أسئلة' },
  { act: 'm-run', attrs: 'data-a="t-q-share-all"', icon: 'share', label: 'مشاركة أسئلتي' },
  { act: 'm-run', attrs: 'data-a="t-q-export"', icon: 'download', label: 'تنزيل أسئلتي' }
]);
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
  q = q || { qtype: QS.lastType || 'curriculum', level: QS.lastLevel || 'medium', body: '', options: ['', '', '', ''], correct_index: 0, curriculum_id: QS.lastCu || T.qf.cu3 || '' };
  const seg = (name, cur, map) => `<input type="hidden" name="${name}" value="${cur}"><div class="qf-seg" data-name="${name}">${Object.keys(map).filter(k => k !== 'memory').map(k => `<button type="button" class="${cur === k ? 'on' : ''}" data-act="qf-seg" data-v="${k}">${map[k]}</button>`).join('')}</div>`;
  return `<h3>${ocr ? `سؤال ${QS.ocrQ.total - QS.ocrQ.list.length} من ${QS.ocrQ.total} من الصورة` : isNew ? 'إضافة سؤال' : 'تعديل سؤال'}</h3>${ocr ? '<p class="sub">راجع النص واضغط الدائرة بجانب الإجابة الصحيحة.</p>' : ''}<form class="col qf" data-form="t-save-q"><input type="hidden" name="id" value="${q.id || ''}"><input type="hidden" name="next" value="">
    <div class="field"><label for="q-b">نص السؤال</label><textarea class="input" id="q-b" name="body" rows="2" required maxlength="300" placeholder="اكتب السؤال هنا">${esc(q.body)}</textarea>
      <small id="q-dupw" class="q-dupw hide">هذا السؤال موجود في البنك، ولن يُحفظ مكرراً.</small></div>
    <div class="field"><label class="qf-ol">الخيارات <small class="muted">اضغط الدائرة بجانب الإجابة الصحيحة</small></label><input type="hidden" name="correct" value="${q.correct_index}">
    ${[0, 1, 2, 3].map(i => `<div class="qo${q.correct_index === i ? ' on' : ''}"><button type="button" class="qo-c" data-act="qf-c" data-i="${i}" aria-label="الإجابة الصحيحة ${LETTERS[i]}">${ic('check')}</button><input class="input" name="o${i}" value="${esc(q.options[i])}" required maxlength="100" placeholder="${i === q.correct_index ? 'الإجابة الصحيحة' : 'خيار ' + LETTERS[i]}"></div>`).join('')}
    <button type="button" class="qf-sug" data-act="qf-sug">✨ اقترح إجابات خاطئة</button><small class="qf-sugn hide" id="qf-sugn">اقتراحات تلقائية، عدّلها إذا تحتاج.</small><div class="err hide" id="qf-cerr" role="alert">اختر الإجابة الصحيحة بالضغط على الدائرة بجانبها.</div></div>
    <details class="qf-det"${q.image || !isNew ? ' open' : ''}><summary>تفاصيل السؤال <small class="sub">${LEVEL_AR[q.level] || ''} · ${TYPE_AR[q.qtype] || ''}${q.image ? ' · صورة' : ''}</small></summary>
    <div class="field"><input type="hidden" name="image" value="${esc(q.image || '')}"><div class="q-imgf" id="q-imgf">${qImgField(q.image)}</div><input type="file" id="qf-file" accept="image/*" class="hide" data-change="qf-img-chosen"></div>
    <div class="field"><label>الصعوبة</label>${seg('level', q.level, LEVEL_AR)}</div>
    <div class="field"><label>النوع</label>${seg('qtype', q.qtype, TYPE_AR)}</div></details>
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
ACTS['qf-c'] = t => { const f = t.closest('form'), i = Number(t.dataset.i); f.correct.value = i; const ce = document.getElementById('qf-cerr'); if (ce) ce.classList.add('hide');
  f.querySelectorAll('.qo').forEach((r, j) => { r.classList.toggle('on', j === i); r.querySelector('input').placeholder = j === i ? 'الإجابة الصحيحة' : 'خيار ' + LETTERS[j]; }); };
/* suggest wrong answers without AI: nearby numbers, true/false, or answers of similar questions in the bank */
const Q_NAMES = [
  ['أبو بكر الصديق', 'عمر بن الخطاب', 'عثمان بن عفان', 'علي بن أبي طالب', 'زيد بن حارثة', 'بلال بن رباح', 'خالد بن الوليد', 'سعد بن أبي وقاص', 'الزبير بن العوام', 'طلحة بن عبيد الله', 'عبد الرحمن بن عوف', 'أبو عبيدة بن الجراح', 'مصعب بن عمير', 'حمزة بن عبد المطلب', 'أبو هريرة', 'عبد الله بن عباس', 'عبد الله بن مسعود', 'معاذ بن جبل', 'أنس بن مالك', 'سلمان الفارسي'],
  ['آدم عليه السلام', 'نوح عليه السلام', 'إبراهيم عليه السلام', 'إسماعيل عليه السلام', 'إسحاق عليه السلام', 'يعقوب عليه السلام', 'يوسف عليه السلام', 'موسى عليه السلام', 'هارون عليه السلام', 'داود عليه السلام', 'سليمان عليه السلام', 'يونس عليه السلام', 'عيسى عليه السلام', 'هود عليه السلام', 'صالح عليه السلام', 'شعيب عليه السلام'],
  ['آدم', 'نوح', 'إبراهيم', 'إسماعيل', 'إسحاق', 'يعقوب', 'يوسف', 'موسى', 'هارون', 'داود', 'سليمان', 'يونس', 'عيسى', 'هود', 'صالح', 'شعيب', 'لوط', 'زكريا', 'يحيى', 'أيوب'],
  ['خديجة بنت خويلد', 'عائشة بنت أبي بكر', 'فاطمة الزهراء', 'حفصة بنت عمر', 'أم سلمة', 'سمية بنت خياط', 'أسماء بنت أبي بكر', 'آمنة بنت وهب', 'حليمة السعدية', 'زينب بنت جحش']
];
const QSTOP = new Set(['ما', 'من', 'هو', 'هي', 'في', 'كم', 'متى', 'اين', 'أين', 'هل', 'ماذا', 'لماذا', 'كيف', 'اي', 'أي', 'الى', 'على', 'عن', 'يسمى', 'تسمى', 'the', 'what', 'is', 'of', 'a']);
function qSuggest(body, ans, n){
  n = n || 3; ans = String(ans || '').trim(); if (!ans) return [];
  const ar = /[٠-٩]/.test(ans), toW = x => x.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)), toA = x => ar ? String(x).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) : String(x);
  const shuf = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
  const m = toW(ans).match(/^(-?\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (m) { // number, maybe with a unit
    const dec = (m[1].split(/[.,]/)[1] || '').length, v = Number(m[1].replace(',', '.')), u = m[2] ? ' ' + m[2] : '', st = dec ? Math.pow(10, -dec) : 1;
    const year = !dec && v >= 1000 && v <= 2100;
    let pool = year ? [1, -1, 2, -2, 3, -3, 5, -5, 10, -10].map(d => v + d) : [v + st, v - st, v + 2 * st, v - 2 * st, v + 10 * st, v - 10 * st, v * 2, v / 2];
    if (!dec && v >= 10) { const r = Number(String(Math.abs(v)).split('').reverse().join('')) * Math.sign(v); pool.unshift(r); }
    pool = [...new Set(pool.map(x => Number(x.toFixed(dec))))].filter(x => x !== v && (v < 0 || x >= 0) && (dec || Number.isInteger(x)));
    const near = shuf(pool.slice(0, 5)), far = shuf(pool.slice(5));
    return near.slice(0, 2).concat(far, near.slice(2)).slice(0, n).map(x => toA(dec ? x.toFixed(dec) : x) + u);
  }
  const tf = { 'صح': 'خطأ', 'خطأ': 'صح', 'خطا': 'صح', 'نعم': 'لا', 'لا': 'نعم', 'صحيح': 'خطأ', 'true': 'false', 'false': 'true' };
  if (tf[ans.toLowerCase()]) return [tf[ans.toLowerCase()]];
  // known name families: a person answer gets other people of the same kind
  const an0 = qNorm(ans), who = /^(من|مَن)\s+(هو|هي|الذي|التي|اول|أول|اخر|آخر|اشهر|أشهر|القائل|قائل|الصحابي|الصحابية|النبي|الخليفة)/.test(qNorm(body)) || /^(who)\b/i.test(body.trim());
  const islamic = /(صحاب|خليف|أسلم|اسلم|نبي|رسول|الأنبياء|الانبياء|الإسلام|الاسلام|غزو|هجر)/.test(body), named = /\s(بن|بنت)\s|^(أبو|ابو|أم|ام)\s/.test(ans);
  const fam = Q_NAMES.find(g => g.some(x => qNorm(x) === an0)) || (who && (named || islamic)
    ? (/\sبنت\s|^(أم|ام)\s/.test(ans) ? Q_NAMES[3] : /(نبي|الأنبياء|الانبياء)/.test(body) && !named && !/(صحاب|خليف|أسلم|اسلم)/.test(body) ? Q_NAMES[2] : Q_NAMES[0]) : null);
  if (fam) return shuf(fam.filter(x => qNorm(x) !== an0)).slice(0, n);
  // similar questions: share key words (not only the opening words)
  const toks = t => qNorm(t).split(' ').filter(w => w.length > 1);
  const qt = toks(body), key = qt.filter(w => !QSTOP.has(w)), head = qt.slice(0, 2).join(' ');
  const an = qNorm(ans), aw = an.split(' ').length;
  const score = new Map();
  QS.list.concat(QS.glob).forEach(q => {
    if (!q.options || q.options.length < 2) return;
    const t = toks(q.body), k2 = new Set(t.filter(w => !QSTOP.has(w)));
    const kw = key.filter(w => k2.has(w)).length; if (!kw) return;
    let sc = kw * 2 + (head && t.slice(0, 2).join(' ') === head ? 3 : 0);
    if (sc < 4) return;
    q.options.forEach((o, i) => { const on = qNorm(o); if (!on || on === an || key.includes(on)) return;
      const w = Math.abs(on.split(' ').length - aw) <= 1 ? 1 : 0.4, v = sc * w * (i === q.correct_index ? 1.5 : 1);
      if ((score.get(o.trim()) || 0) < v) score.set(o.trim(), v); });
  });
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const seen = new Set([an]); const out = [];
  shuf(ranked.slice(0, n + 3)).concat(ranked).forEach(o => { const k = qNorm(o); if (out.length < n && !seen.has(k)) { seen.add(k); out.push(o); } });
  return out;
}
function qfFillSug(f, force){
  const ci = Number(f.correct.value); if (ci < 0) { if (force) { const ce = document.getElementById('qf-cerr'); if (ce) ce.classList.remove('hide'); } return 0; }
  const ans = f['o' + ci].value, slots = [0, 1, 2, 3].filter(i => i !== ci && (force ? (!f['o' + i].value.trim() || f['o' + i].dataset.sug) : !f['o' + i].value.trim()));
  if (!slots.length) return force ? toast('امسح خانة لنقترح فيها') : 0;
  const sug = qSuggest(f.body.value, ans, slots.length);
  if (!sug.length) return force ? toast(ans.trim() ? 'ما لقيت اقتراحات مناسبة، اكتبها بنفسك' : 'اكتب الإجابة الصحيحة أولاً') : 0;
  sug.forEach((v, k) => { const el = f['o' + slots[k]]; el.value = v; el.dataset.sug = '1'; el.classList.add('sug'); });
  const nt = document.getElementById('qf-sugn'); if (nt) nt.classList.remove('hide');
  return sug.length;
}
ACTS['qf-sug'] = t => { const f = t.closest('form'); [0, 1, 2, 3].forEach(i => { const el = f['o' + i]; if (el.dataset.sug) el.value = ''; }); qfFillSug(f, true); };
document.addEventListener('focusin', e => { const el = e.target; if (el.dataset && el.dataset.sug && el.closest('.qf .qo')) setTimeout(() => el.select(), 0); });
document.addEventListener('change', e => {
  const el = e.target; if (!el.closest || !el.closest('.qf .qo')) return;
  const f = el.form; if (!f || !f.correct) return;
  if (el.name === 'o' + f.correct.value) { if (el.value.trim()) qfFillSug(f, false); }
  else { delete el.dataset.sug; el.classList.remove('sug'); }
});
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
  if (row.correct_index < 0) { const ce = document.getElementById('qf-cerr'); if (ce) { ce.classList.remove('hide'); ce.scrollIntoView({ block: 'center' }); } return; }
  QS.lastCu = f.cu.value; QS.lastType = row.qtype; QS.lastLevel = row.level; QS.lastLesson = row.lesson || '';
  if (new Set(row.options).size < 4) return toast('الخيارات يجب أن تكون مختلفة');
  const k = qNorm(row.body);
  if ((QS.norm[k] || []).some(x => x !== f.id.value)) return toast('هذا السؤال موجود في البنك، لا يمكن تكراره');
  if (!f.id.value && row.qtype !== 'memory') { const c = row.options[row.correct_index], o = row.options.slice(); for (let i = 3; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } row.options = o; row.correct_index = o.indexOf(c); }
  const r = f.id.value ? await sb.from('questions').update(row).eq('id', f.id.value).select().single() : await sb.from('questions').insert(Object.assign({ owner_id: T.user.id, status: 'approved', source: 'teacher' }, row)).select().single();
  if (r.error) return toast(errMsg(r.error));
  if (f.id.value) { const i = QS.list.findIndex(x => x.id === f.id.value); if (i >= 0) QS.list[i] = r.data; } else QS.list.unshift(r.data);
  qDupIndex();
  if (QS.ocrQ && QS.ocrQ.total && !f.id.value) { QS.ocrQ.saved++; return qOcrNext(); }
  if (next) {
    f.image.value = ''; document.getElementById('q-imgf').innerHTML = qImgField('');
    f.body.value = ''; [0, 1, 2, 3].forEach(i => { const el = f['o' + i]; el.value = ''; delete el.dataset.sug; el.classList.remove('sug'); }); const sn = document.getElementById('qf-sugn'); if (sn) sn.classList.add('hide'); ACTS['qf-c'](f.querySelector('[data-i="0"]'));
    const w = document.getElementById('q-dupw'); if (w) w.classList.add('hide');
    f.body.focus(); toast(`تم الحفظ. أسئلتك المتاحة: ${QS.list.filter(q => q.status === 'approved').length}`);
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
ACTS['t-q-status'] = t => { const s = t.dataset.s; qSetStatus([t.dataset.id], s, s === 'approved' ? 'أصبح السؤال متاحاً في المسابقات' : 'تم رفض السؤال'); };
ACTS['t-q-approve-all'] = () => { const ids = QS.list.filter(q => q.status === 'draft').map(q => q.id); qSetStatus(ids, 'approved', `تمت إتاحة ${ids.length} سؤالاً`); };
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
ACTS['t-q-bulk'] = t => { const ids = [...QS.sel], s = t.dataset.s; closeModals(); qSetStatus(ids, s, `${s === 'approved' ? 'تمت إتاحة' : s === 'rejected' ? 'تم رفض' : 'تم نقل'} ${ids.length} سؤالاً`); };
ACTS['t-q-bulk-more'] = () => sheet(`${QS.sel.size} سؤالاً محدداً`, [
  { act: 't-q-bulk', attrs: 'data-s="approved"', icon: 'check', label: 'إتاحة في المسابقات' },
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
ACTS['t-q-bulk-unpick'] = async () => { const P = QS.pick || new Set(), pk = [...QS.sel].filter(id => P.has(id)), own = [...QS.sel].filter(id => !P.has(id));
  if (!await ask(`إزالة ${pk.length} سؤالاً من البنك من أسئلتك؟ لن تظهر لطلبتك، وتبقى في بنك الأسئلة إذا احتجتها.${own.length ? `\n\n(${own.length} من أسئلتك الخاصة المحددة لن تتأثر)` : ''}`, { title: 'إزالة من أسئلتي؟', ok: 'إزالة', danger: true, safe: true })) return;
  if (await qPickSet(pk, false)) { pk.forEach(id => QS.sel.delete(id)); if (!QS.sel.size) QS.selOn = false; toast(`أُزيل ${pk.length} سؤالاً من أسئلتك`); renderQuestions(); } };
ACTS['t-q-bulk-del'] = async () => { const P = QS.pick || new Set(), pk = [...QS.sel].filter(id => P.has(id)), ids = [...QS.sel].filter(id => !P.has(id)); closeModals();
  if (!await ask(`حذف ${ids.length} سؤالاً نهائياً؟${pk.length ? ` و${pk.length} سؤالاً من البنك ستُزال من أسئلتك فقط.` : ''}`)) return;
  if (pk.length && !await qPickSet(pk, false)) return;
  const { error } = ids.length ? await sb.from('questions').delete().in('id', ids) : {}; if (error) return toast(errMsg(error));
  QS.sel.clear(); QS.selOn = false; await tQuestions(); };

// One tap: remove/delete every question in the folder the teacher is looking at.
ACTS['q-clear'] = async t => { let list;
  if (t && t.dataset.s != null) { const keep = [T.qf.subj, T.qf.cu]; T.qf.subj = t.dataset.s; T.qf.cu = ''; list = qFiltered(); [T.qf.subj, T.qf.cu] = keep; } else list = qFiltered();
  if (!list.length) return;
  const pk = list.filter(q => q._pk).map(q => q.id), ids = list.filter(q => !q._pk).map(q => q.id);
  const msg = [ids.length ? `حذف ${ids.length} سؤالاً كتبتها نهائياً` : '', pk.length ? `إزالة ${pk.length} سؤالاً من البنك من أسئلتك (تبقى في البنك)` : ''].filter(Boolean).join('، و');
  if (!await ask(msg + '؟', { title: 'تفريغ المجلد', ok: ids.length ? 'حذف' : 'إزالة' })) return;
  if (pk.length && !await qPickSet(pk, false)) return;
  const { error } = ids.length ? await sb.from('questions').delete().in('id', ids) : {}; if (error) return toast(errMsg(error));
  T.qf.subj = ''; T.qf.cu = null; await tQuestions(); toast('تم');
};
/* public bank */
ACTS['t-q-view'] = () => toast('هذا سؤال من بنك الأسئلة. انسخه إلى أسئلتك لتعدّله.');
ACTS['t-q-copy'] = async t => {
  const g = QS.glob.find(x => x.id === t.dataset.id); if (!g) return;
  const { data, error } = await sb.from('questions').insert({ owner_id: T.user.id, status: 'approved', source: 'copy', qtype: g.qtype, level: g.level, body: g.body, options: g.options, correct_index: g.correct_index }).select().single();
  if (error) return toast(errMsg(error));
  QS.list.unshift(data); qDupIndex(); toast('تم النسخ إلى أسئلتك، يمكنك تعديله الآن'); renderQuestions();
};

/* Excel template / export */
const QHEAD = ['السؤال', 'أ', 'ب', 'ج', 'د', 'الإجابة الصحيحة', 'المستوى', 'النوع'];
ACTS['t-q-template'] = async () => { await XL();
  const ws = XLSX.utils.aoa_to_sheet([QHEAD, ['ما عاصمة دولة الكويت؟', 'مدينة الكويت', 'الجهراء', 'الفحيحيل', 'الأحمدي', 'أ', 'سهل', 'عام'], ['كم يساوي 12 × 12؟', '124', '144', '154', '164', 'ب', 'متوسط', 'سرعة بديهة'], ['الصلاة خمس مرات في اليوم', '', '', '', '', 'صح', 'سهل', 'منهج'], ['رتّب خطوات الصلاة', 'الوضوء', 'استقبال القبلة', 'تكبيرة الإحرام', 'قراءة الفاتحة', 'ترتيب', 'متوسط', 'منهج']]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'الأسئلة'); XLSX.writeFile(wb, 'نموذج-الأسئلة.xlsx');
};
ACTS['t-q-export'] = async () => { await XL();
  const rows = [QHEAD.concat(['الحالة'])].concat(QS.list.map(q => [q.body].concat(q.options, [LETTERS[q.correct_index], LEVEL_AR[q.level], TYPE_AR[q.qtype], STATUS_AR[q.status]])));
  const ws = XLSX.utils.aoa_to_sheet(rows), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الأسئلة'); XLSX.writeFile(wb, 'أسئلتي.xlsx');
};
ACTS['t-q-import'] = () => { QS.toLes = null; closeModals(); document.getElementById('qxl').click(); };

/* parse rows (Excel) into checked candidates with a reason for each problem */
const Q_LV = { 'سهل': 'easy', 'متوسط': 'medium', 'صعب': 'hard', easy: 'easy', medium: 'medium', hard: 'hard' };
const Q_TY = { 'منهج': 'curriculum', 'عام': 'general', 'بديهة': 'quick', 'سرعة بديهة': 'quick', 'ذاكرة': 'general' };
function qCheck(c, seen){
  if (!c.body) return 'نص السؤال فارغ';
  if (c.options.length < 2 || (c.payload && c.options.length < 3)) return 'الخيارات ناقصة';
  if (c.options.some(o => !o)) return 'أحد الخيارات فارغ';
  if (new Set(c.options).size < c.options.length) return 'خيارات مكررة';
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
    let opts = [1, 2, 3, 4].map(j => String(r[j] == null ? '' : r[j]).trim());
    const ans = String(r[5] == null ? '' : r[5]).trim();
    let ci = ans.toLowerCase() in map ? map[ans.toLowerCase()] : opts.indexOf(ans), payload = null;
    /* «صح أو خطأ»: answer cell صح/خطأ with no options · «رتّب»: answer cell ترتيب, options in the right order */
    if (/^(صح|صحيح|خطأ|خطا|غلط)$/.test(ans) && !opts[2] && !opts[3]) { opts = ['صح', 'خطأ']; ci = /^صح/.test(ans) ? 0 : 1; }
    else if (/^(ترتيب|رتب|رتّب)$/.test(ans)) { opts = opts.filter(Boolean); ci = 0; payload = { kind: 'order' }; }
    const c = { line: i + (head ? 2 : 1), body: String(r[0] || '').trim(), options: opts, correct_index: ci, payload, level: Q_LV[String(r[6] || '').trim()] || 'medium', qtype: Q_TY[String(r[7] || '').trim()] || 'curriculum' };
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
ACTS['t-q-paste'] = t => { if (!(t && t.dataset && t.dataset.keep)) QS.toLes = null; closeModals(); const keep = t && t.dataset && t.dataset.keep ? (QS.pasteText || '') : '';
  modal(`<h3>لصق أسئلة كنص</h3><p class="sub">كل سؤال في سطر: السؤال | الإجابة الصحيحة | خطأ | خطأ | خطأ</p>
    <textarea class="input qp-ta" rows="7" dir="auto" placeholder="ما عاصمة الكويت؟ | مدينة الكويت | الجهراء | الأحمدي | الفروانية">${esc(keep)}</textarea>
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
  QS.pasteText = document.querySelector('.qp-ta').value;
  const c = parsePasteQ(QS.pasteText, document.getElementById('qp-lv').value, document.getElementById('qp-ty').value);
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
  const ok = c.filter(x => !x.err), bad = c.filter(x => x.err), dup = ok.filter(x => x.dup), nNew = ok.length - dup.length;
  modal(`<h3>معاينة الأسئلة</h3><p class="sub">${esc(src)}</p>
    <div class="pv-sum"><span class="ok">${ok.length} صالح</span>${dup.length ? `<span class="warn">${dup.length} موجود مسبقاً</span>` : ''}${bad.length ? `<span class="bad">${bad.length} فيه مشكلة</span>` : ''}</div>
    ${bad.length ? `<div class="qpv-bad"><b>لن تُضاف هذه الأسطر:</b>${bad.slice(0, 30).map(x => `<div><em>سطر ${x.line}</em> ${esc(x.err)}${x.body ? `: <span>${esc(x.body.slice(0, 40))}</span>` : ''}</div>`).join('')}${bad.length > 30 ? `<div class="muted">و${bad.length - 30} أخرى</div>` : ''}</div>` : ''}
    <div class="qpv-list">${ok.slice(0, 40).map(x => `<div class="qpv${x.dup ? ' dup' : ''}"><b>${esc(x.body)}</b><small>${esc(x.options[x.correct_index])} · ${LEVEL_AR[x.level]}${x.dup ? ' · موجود مسبقاً' : ''}</small></div>`).join('')}${ok.length > 40 ? `<p class="muted center">و${ok.length - 40} سؤالاً آخر</p>` : ''}</div>
    <label class="chk"><input type="checkbox" id="qpv-rev"> أريد مراجعتها قبل إتاحتها في المسابقات</label>
    ${nNew ? '' : `<p class="err" role="status">لا توجد أسئلة جديدة لإضافتها: ${dup.length ? 'كل الأسئلة الصالحة موجودة مسبقاً.' : 'صحّح الأسطر التي فيها مشكلة.'}</p>`}
    <button class="btn" data-act="t-q-pv-save" ${nNew ? '' : 'disabled'}>${nNew ? `إضافة ${nNew} سؤالاً جديداً` : 'لا جديد لإضافته'}</button>
    ${src === 'لصق' ? `<button class="btn soft" data-act="t-q-paste" data-keep="1">رجوع لتعديل النص</button>` : ''}`);
}
ACTS['t-q-pv-save'] = async t => {
  const skip = document.getElementById('qpv-skip'), rev = document.getElementById('qpv-rev');
  const src = QS.pv.filter(x => !x.err && !x.dup && !x.saved);
  const rows = src.map(x => ({ owner_id: T.user.id, qtype: x.qtype, level: x.level, body: x.body, options: x.options, correct_index: x.correct_index, payload: x.payload || null, status: rev && rev.checked ? 'draft' : 'approved', source: 'teacher', curriculum_id: QS.toLes ? QS.toLes.cu : x.qtype === 'curriculum' ? (T.qf.cu || null) : null, lesson: QS.toLes && QS.toLes.l !== NO_LESSON ? QS.toLes.l : null }));
  if (!rows.length) return toast('لا توجد أسئلة جديدة لإضافتها');
  t.disabled = true; t.textContent = 'جارٍ الحفظ…';
  const before = QS.pv.filter(x => x.saved).length; let done = before;
  try {
    /* batches that succeed are marked saved, so a retry sends only what is left */
    for (let i = 0; i < rows.length; i += 100) { const { error } = await sb.from('questions').insert(rows.slice(i, i + 100)); if (error) throw error; src.slice(i, i + 100).forEach(x => { x.saved = true; }); done += Math.min(100, rows.length - i); }
    closeModals(); T.qf.status = rows[0].status;
    toast(`تمت إضافة ${done} سؤالاً` + (rows[0].status === 'draft' ? ' للمراجعة' : ''));
    await tQuestions(); if (QS.toLes) { QS.toLes = null; q4LedSheet(QS.led); }
  } catch(e){ t.disabled = false; const left = QS.pv.filter(x => !x.err && !x.dup && !x.saved).length;
    t.textContent = done ? `إكمال إضافة ${left} سؤالاً` : 'إعادة المحاولة';
    toast(done ? `حُفظ ${done} سؤالاً وتعذّر الباقي (${left}). اضغط لإكمال الإضافة` : 'تعذّر حفظ الأسئلة. تأكد من الاتصال وحاول مجدداً'); }
};

/* share questions between teachers by a short code */
async function qShareIds(ids){
  if (!ids.length) return toast('لا توجد أسئلة للمشاركة');
  closeModals();
  try {
    const code = await rpc('share_questions', { p_ids: ids, p_title: T.name ? 'أسئلة ' + T.name : null });
    const url = location.origin + location.pathname + '#/t/qshare/' + code;
    const msg = `أشاركك ${ids.length} سؤالاً في «اهزم الدقيقة». افتح الرابط لإضافتها إلى أسئلتك:\n${url}\nأو أدخل الرمز: ${code}`;
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
    modal(`<h3>أسئلة من ${esc(p.from || 'زميل')}</h3><p class="sub">${qs.length} سؤالاً. تُضاف إلى أسئلتك متاحة، ويمكنك تعديلها.</p>
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
    <div class="st1-opts aw-sq"><button class="st1-o" data-act="aw-photo"><span>📷</span>تصوير الكشف<small>الأسرع</small></button><button class="st1-o" data-act="aw-paste"><span>✍️</span>كتابة الأسماء<small>أو لصقها</small></button><button class="st1-o" data-act="aw-file"><span>📄</span>ملف Excel<small>كشف المدرسة</small></button><button class="st1-o" data-act="aw-self"><span>🔗</span>يسجّلون بأنفسهم<small>رابط أو QR</small></button></div>${made ? '<button class="link aw-later" data-act="close-modal">لاحقاً</button>' : ''}</div>`);
};
/* v163: the file pickers may not be on the page (class page), so make them when needed */
function awInput(id, accept, act){ let i = document.getElementById(id); if (!i) { i = document.createElement('input'); i.type = 'file'; i.id = id; i.accept = accept; i.className = 'hide'; i.dataset.change = act; document.body.appendChild(i); } return i; }
ACTS['aw-photo'] = () => { closeModals(); awInput('awimg', 'image/*', 'aw-img').click(); };
ACTS['aw-file'] = () => { closeModals(); setTimeout(() => modal(`<div class="aw-sheet xl2"><h3>إضافة طلبة من Excel</h3>
  <div class="xl2-s"><b>١</b><span class="grow">نزّل النموذج<small>أو استخدم كشف المدرسة إذا عندك</small></span><button class="btn sm soft" data-act="t-sample-students">نزّله</button></div>
  <div class="xl2-s"><b>٢</b><span class="grow">اكتب فيه أسماء الطلبة</span></div>
  <div class="xl2-s"><b>٣</b><span class="grow">ارفعه هنا</span><button class="btn sm" data-act="aw-file-go">ارفع الملف</button></div></div>`), 30); };
ACTS['aw-file-go'] = () => { closeModals(); awInput('awxl', '.xlsx,.xls,.csv', 'aw-xl').click(); };
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
    /* v164: a printed table (school list) is read cell by cell from the names column, which is far more accurate */
    let text = '';
    try { text = await ocrTable(file, st); } catch(e){ text = ''; }
    if (!text) {
      const w = await Tesseract.createWorker('ara+eng', 1, { logger: x => { if (x.status === 'recognizing text') st(x.progress); } });
      const { data } = await w.recognize(await ocrPrep(file)); await w.terminate(); text = data.text || '';
    }
    m.remove();
    const data = { text };
    const { rows, cls } = namesFromOcr(text);
    if (!rows.length) { ACTS['aw-paste'](); const ta = document.querySelector('.aw-ta'); if (ta) { ta.value = (data.text || '').trim(); pasteInfo(ta); } return toast('ما قدرت أميّز الأسماء، عدّلها هنا'); }
    if (cls && !AW.cid) AW.detect = cls;
    awReview(rows, 'photo');
  } catch(e){ m.remove(); toast('تعذّرت قراءة الصورة: ' + errMsg(e)); }
};
/* table photo/scan: find ruled lines, take the widest column (names), OCR each cell as one line; '' when no table */
async function ocrTable(file, st){
  const bmp = await createImageBitmap(file), k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const W = Math.round(bmp.width * k), H = Math.round(bmp.height * k);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(bmp, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H).data, gray = new Uint8ClampedArray(W * H); let sum = 0;
  for (let i = 0; i < W * H; i++) { const y = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; gray[i] = y; sum += y; }
  const thr = Math.min(140, sum / (W * H) * 0.6), dark = i => gray[i] < thr;
  const rowF = new Float32Array(H), colF = new Float32Array(W);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (dark(y * W + x)) { rowF[y]++; colF[x]++; }
  const grp = (f, n, lim) => { const out = []; let cur = null; for (let i = 0; i < n; i++) { if (f[i] / lim > 0.5) { if (cur && i - cur[1] <= 3) cur[1] = i; else { if (cur) out.push(Math.round((cur[0] + cur[1]) / 2)); cur = [i, i]; } } } if (cur) out.push(Math.round((cur[0] + cur[1]) / 2)); return out; };
  const ys = grp(rowF, H, W);
  if (ys.length < 4) return '';
  const tH = ys[ys.length - 1] - ys[0];
  const colIn = new Float32Array(W); for (let y = ys[0]; y < ys[ys.length - 1]; y++) for (let x = 0; x < W; x++) if (dark(y * W + x)) colIn[x]++;
  const xs = grp(colIn, W, tH);
  if (xs.length < 2) return '';
  let best = [0, 0, 0]; for (let i = 0; i < xs.length - 1; i++) if (xs[i + 1] - xs[i] > best[0]) best = [xs[i + 1] - xs[i], xs[i], xs[i + 1]];
  if (best[0] < W * 0.2) return '';
  const cell = (y0, y1, sc, bin) => { const cw = best[2] - best[1] - 8, ch = y1 - y0 - 5; const o = document.createElement('canvas'); o.width = cw * sc + 40; o.height = ch * sc + 40;
    const og = o.getContext('2d'); og.fillStyle = '#fff'; og.fillRect(0, 0, o.width, o.height); og.imageSmoothingQuality = 'high'; og.drawImage(c, best[1] + 4, y0 + 3, cw, ch, 20, 20, cw * sc, ch * sc);
    const id = og.getImageData(0, 0, o.width, o.height), p = id.data; for (let i = 0; i < p.length; i += 4) { let v = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; if (bin) v = v < 150 ? 0 : 255; p[i] = p[i + 1] = p[i + 2] = v; } og.putImageData(id, 0, 0); return o; };
  const w = await Tesseract.createWorker('ara', 1); await w.setParameters({ tessedit_pageseg_mode: '7' });
  const out = [], n = ys.length - 1;
  try {
    for (let i = 0; i < n; i++) { st((i + 1) / n);
      const y0 = ys[i], y1 = ys[i + 1]; if (y1 - y0 < 12) continue;
      let pick = { t: '', c: -1 };
      for (const [sc, bin] of [[3, false], [2, false], [3, true]]) { const { data } = await w.recognize(cell(y0, y1, sc, bin)); const t = (data.text || '').trim(); if (t && data.confidence > pick.c) pick = { t, c: data.confidence }; if (t && data.confidence >= 80) break; }
      if (pick.t && !/^اسم|الاسم/.test(pick.t.trim())) out.push(pick.t.replace(/\s+/g, ' '));
    }
  } finally { await w.terminate(); }
  return out.length >= 3 ? out.join('\n') : '';
}
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
const AW_HEAD = /كشف|اسماء|أسماء|الاسم|المدرسة|مدرسة|العام الدراسي|الفصل الدراسي|المعلم|الماده|المادة|التوقيع|ملاحظات|المجموع|وزارة|الإدارة|اداره|منطقة|الرقم المدني|^م\s*$/;
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
  AW.rows = rows.map(r => Object.assign({}, r)); AW.src = src; AW.codes = []; AW.savedTo = null; AW.rows.forEach(awFlag);
  awRenderReview();
}
function awRenderReview(){
  closeModals();
  const R = AW.rows, nNew = R.filter(r => r.on && !r.where).length, nOld = R.filter(r => r.where && !r.move).length, nWarn = R.filter(r => r.warn && r.on).length, nMove = R.filter(r => r.move).length;
  const tid = AW.cid || AW.pick || AW.detect || (CL.classes.length === 1 ? CL.classes[0].id : null), tc = CL.classes.find(c => c.id === tid);
  if (tc && !AW.cid) AW.pick = tc.id;
  modal(`<div class="aw-rev"><div class="aw-rh"><button class="link" data-act="close-modal">إلغاء</button><h3>راجع الأسماء</h3><span></span></div>
    <div class="aw-to">${tc ? `إلى <b>${esc(tc.name)}</b>` : '<span class="muted">لم يُحدد الصف بعد</span>'}${AW.cid ? '' : `<button class="link" data-act="aw-chg">${tc ? 'تغيير الصف' : 'اختر الصف'}</button>`}</div>
    <span class="aw-from">📋 ${AW.src === 'photo' ? 'وجدنا' : 'عندك'} ${R.length} اسماً</span>
    <div class="aw-sum"><span class="n">${nNew} جديد</span>${nOld ? `<span class="o">${nOld} مكرر (موجود مسبقاً)</span>` : ''}${nMove ? `<span class="w">${nMove} نقل</span>` : ''}${nWarn ? `<span class="w">${nWarn} يحتاج مراجعة</span>` : ''}</div>
    <div class="aw-list">${R.map((r, i) => r.where
      ? `<div class="aw-nm ${r.move ? 'move' : 'old'}"><span class="grow">${esc(r.name)}</span>${r.move ? `<em>نقل من ${esc(r.where.c.name)}</em><button class="aw-x" data-act="aw-move" data-i="${i}" aria-label="إلغاء النقل">✕</button>` : `<em>في ${esc(r.where.c.name)}</em><button class="aw-mv" data-act="aw-move" data-i="${i}">نقل؟</button>`}</div>`
      : `<div class="aw-nm${r.warn ? ' warn' : ''}${r.on ? '' : ' off'}"><input class="aw-in" data-i="${i}" value="${esc(r.name)}" aria-label="اسم الطالب">${r.warn && r.on ? '<em>تأكد من الاسم</em>' : ''}<button class="aw-x" data-act="aw-del" data-i="${i}" aria-label="${r.on ? 'حذف' : 'إرجاع'}">${r.on ? '✕' : '↺'}</button></div>`).join('')}
      <form class="aw-addline" data-form="aw-add1"><span class="pl">＋</span><input name="n" placeholder="إضافة اسم نسيته" autocomplete="off"></form></div>
    ${nNew + nMove ? '' : '<p class="sub center">لا توجد أسماء جديدة لإضافتها.</p>'}
    <button class="btn aw-go" data-act="${tc ? 'aw-save' : 'aw-next'}" ${nNew + nMove ? '' : 'disabled'}>${tc ? `أضف ${nNew + nMove} إلى ${esc(tc.name)}` : `اختر الصف (${nNew + nMove} طالباً)`}</button></div>`).classList.add('aw-full');
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
    <button class="btn" data-act="${self ? 'aw-self-go' : 'aw-back'}" ${target ? '' : 'disabled'}>${self ? 'عرض الرابط' : 'تم'}</button></div>`).classList.add('aw-full');
}
ACTS['aw-back'] = () => awRenderReview();
ACTS['aw-pk'] = t => { AW.pick = t.dataset.id; awPick(!!t.dataset.self); };
ACTS['aw-newcls'] = async t => {
  const v = await ask('اكتب اسم الصف', { title: 'صف جديد', input: '', placeholder: 'مثال: السادس / أ', ok: 'إنشاء' });
  const name = (v || '').trim(); if (name.length < 2) return;
  if (CL.classes.some(c => c.name.trim() === name)) return toast('يوجد صف بنفس الاسم');
  const { data, error } = await sb.from('classes').insert({ teacher_id: T.user.id, name, stage: defStage(name), style: 'mid' }).select().single();
  if (error) return toast(errMsg(error));
  CL.classes.push(data); CL.byId[data.id] = data; CL.students[data.id] = []; AW.pick = data.id; awPick(!!t.dataset.self);
};
ACTS['aw-save'] = t => awSave(AW.cid || AW.pick, t);
ACTS['aw-chg'] = () => awPick();
async function awSave(cid, btn){
  const c = CL.classes.find(x => x.id === cid); if (!c) return;
  const g = c.gender === 'm' || c.gender === 'f' ? c.gender : '';
  if (AW.savedTo && AW.savedTo !== cid) { AW.rows.forEach(r => { r.saved = false; }); AW.codes = []; }
  const src = AW.rows.filter(r => r.on && !r.where && !r.saved && r.name.length > 1);
  const rows = src.map(r => ({ name: r.name, student_no: r.student_no || '', gender: r.gender || g }));
  const mv = AW.rows.filter(r => r.move && r.where && r.where.c.id !== cid).map(r => r.where.s.id);
  if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الإضافة…'; }
  AW.savedTo = cid; AW.codes = AW.codes || [];
  const total = rows.length + AW.codes.length;
  try {
    let codes = AW.codes;
    /* each successful batch is marked saved, so a retry after a network error only sends what is left */
    for (let i = 0; i < rows.length; i += 150) { const r = await rpc('add_students', { p_class: cid, p_rows: rows.slice(i, i + 150) }); codes = AW.codes = codes.concat(r.added.map(x => x.code)); src.slice(i, i + 150).forEach(x => { x.saved = true; }); }
    if (mv.length) { const { error } = await sb.from('students').update({ class_id: cid }).in('id', mv); if (error) throw error; }
    AW.codes = []; AW.savedTo = null;
    closeModals(); AW.pick = null; AW.detect = null; AW.cid = null;
    CL.open.add(cid); CL.flash = { cid, n: codes.length + mv.length, added: true }; CL.tab = 'classes';
    if (location.hash !== '#/t/classes') location.hash = '#/t/classes'; else await tClasses();
    if (codes.length) snack(`تمت إضافة ${codes.length} طالباً`, async () => {
      const { error } = await sb.from('students').delete().eq('class_id', cid).in('code', codes);
      if (error) toast(errMsg(error)); CL.flash = null; await tClasses(); toast('تم التراجع');
    }, () => {});
  } catch(e){
    const n = (AW.codes || []).length;
    if (btn) { btn.disabled = false; btn.textContent = n ? 'إكمال الإضافة' : 'إعادة المحاولة'; }
    toast(n ? `أُضيف ${n} من ${total} طالباً. اضغط «إكمال الإضافة» لإضافة الباقي دون تكرار` : 'تعذّرت الإضافة: ' + errMsg(e));
  }
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
async function tResults(classId, compId){
  if (!classId) return location.replace('#/t/comps');
  RS.comp = compId || null;
  const [cq, kq] = await Promise.all([sb.from('classes').select('id,name').order('created_at'), compId
    ? sb.from('competitions').select('id,group_id,class_id,title').eq('group_id', (await sb.from('competitions').select('group_id').eq('id', compId).maybeSingle()).data?.group_id || compId)
    : sb.from('competitions').select('id,group_id,class_id,title').eq('status', 'active')]);
  if (cq.error) throw cq.error;
  const comp = (kq.data || []).find(k => k.class_id === classId);
  if (compId && comp) RS.comp = comp.id;
  const inGroup = comp ? new Set(kq.data.filter(k => k.group_id === comp.group_id).map(k => k.class_id)) : new Set([classId]);
  const classes = cq.data.filter(c => inGroup.has(c.id));
  if (!classes.length) return location.replace('#/t/comps');
  const id = classId, pick = classes.filter(c => c.id === id);
  RS.title = comp ? comp.title : 'النتائج';
  RS.err = false; RS.args = [classId, compId];
  const res = await Promise.all(pick.map(c => (RS.comp ? rpc('teacher_comp_results', { p_class: c.id, p_comp: RS.comp }) : rpc('teacher_class_results', { p_class: c.id })).then(r => r.map(x => Object.assign({ cls: c.name }, x))).catch(() => { RS.err = true; return []; })));
  RS.rows = res.flat(); RS.all = false; RS.id = id; RS.classes = classes;
  RS.name = (classes.find(c => c.id === id) || {}).name || '';
  RS.ko = null; RS.k = null;
  if (comp) { const { data: kk } = await sb.from('competitions').select('*').eq('id', RS.comp || comp.id).maybeSingle(); RS.k = kk || null; }
  if (comp && !RS.comp) { const { data: kc } = await sb.from('competitions').select('id,start_date,points_end_date,end_date,status').eq('id', comp.id).maybeSingle(); if (kc && phaseOf(kc) === 'finished') autoPraise(id, kc.id, RS.rows); }
  { try { const b = await (RS.comp ? rpc('teacher_comp_bracket', { p_class: id, p_comp: RS.comp }) : rpc('teacher_bracket', { p_class: id })); if (b && b.size && b.rounds.length && b.today >= b.rounds[0].day) RS.ko = b; } catch(e){} }
  renderResults();
}
function renderResults(){
  const rows = RS.rows, n = rows.length;
  const acc = r => r.rounds ? Math.round(r.correct * 100 / (r.rounds * qPer(r.cls))) : -1;
  const byPts = rows.slice().sort((x, y) => y.pts - x.pts);
  const rank = new Map(); let rk = 0, prev = null;
  byPts.forEach((r, i) => { if (r.pts !== prev) { rk = i + 1; prev = r.pts; } rank.set(r, rk); });
  if (!RS.all) { rows.forEach(r => { if (r.r) rank.set(r, r.r); }); byPts.sort((x, y) => (x.r || 0) - (y.r || 0)); }
  const sorters = { pts: (x, y) => y.pts - x.pts, acc: (x, y) => acc(y) - acc(x), rounds: (x, y) => y.rounds - x.rounds, idle: (x, y) => (x.played_today - y.played_today) || (x.rounds - y.rounds) };
  let list = rows.slice().sort(sorters.pts);
  const played = rows.filter(r => r.played_today).length;
  const tr = rows.reduce((a, r) => a + r.rounds, 0), tc = rows.reduce((a, r) => a + r.correct, 0);
  const avg = n ? Math.round(rows.reduce((a, r) => a + r.pts, 0) / n) : 0;
  const top3 = byPts.filter(r => r.pts > 0).slice(0, 3);
  const pod = top3.length >= 2 ? `<div class="podium">${[1, 0, 2].map(i => top3[i] ? `<div class="pd pd${i + 1}"><div class="pd-medal">${i + 1}</div><b>${esc(top3[i].name.split(' ')[0])}</b><span>${top3[i].pts}</span><div class="pd-step"></div></div>` : '<div class="pd"></div>').join('')}</div>` : '';
  const chips = RS.classes.length > 1 ? `<div class="lv-chips">${RS.classes.map(c => `<button class="${RS.id === c.id ? 'on' : ''}" data-act="r-cls" data-id="${c.id}">${esc(c.name)}</button>`).join('')}</div>` : `<div class="rs-cls">${esc(RS.name)}</div>`;
  const sorts = [['pts', 'النقاط'], ['acc', 'نسبة الصحيح'], ['rounds', 'الجولات'], ['idle', 'لم يلعبوا اليوم']];
  const max = Math.max(1, ...rows.map(r => r.pts));
  const any = rows.some(r => r.rounds > 0);
  if (!any && RS.sort === 'pts') list.sort((x, y) => x.name.localeCompare(y.name, 'ar'));
  const items = list.map(r => { const a2 = acc(r), rr = rank.get(r), md = r.pts && rr <= 3 ? ['🥇', '🥈', '🥉'][rr - 1] : '';
    return `<button class="rs2-row ${r.pts ? '' : 'z'}" data-act="r-open" data-k="${esc(r.cls + '|' + r.name + '|' + r.student_no)}">
      <span class="rs2-rk">${md || (r.pts ? rr : '–')}</span>
      <span class="grow"><b>${esc(r.name)}</b><small>${r.rounds ? r.rounds + ' جولة · ' + a2 + '% صح' : 'ما لعب'}</small></span>
      <span class="rs2-pts">${r.pts}</span></button>`; }).join('');
  if (RS.err) return view('النتائج', chips + `<div class="rs-empty rs-fail" role="alert">${ic('clock')}<div><b>تعذّر تحميل النتائج</b></div></div><button class="btn" data-act="r-retry">إعادة المحاولة</button>`, 'home', '', '#/t/home');
  /* v120: hero card (name, class, dates, champion), 3 numbers, medal list; ⋯ = again / Excel / message */
  const ko = RS.ko ? `<div class="card col ko-card"><b>${ic('trophy')} التصفيات</b>${bracketHtml(RS.ko)}${honorHtml(RS.ko)}</div>` : '';
  const k = RS.k || {}, past = k.status === 'finished', top = top3[0];
  const hero = `<div class="rs2-hero"><div class="rs2-t">${esc(String(RS.title || '').split('·').pop().trim())}</div>
    <div class="rs2-s">${esc(RS.name)}${k.start_date ? ' · ' + esc(fmtDate(k.start_date)) + ' ← ' + esc(fmtDate(k.end_date)) : ''}${past ? ' · انتهى' : ''}</div>
    ${top ? `<div class="rs2-win">🏆 <b>${esc(top.name)}</b><span>${top.pts} نقطة</span></div>` : ''}${pzLine(k.prizes, 'rs2-pz')}</div>`;
  const nums = any ? `<div class="rs2-nums"><div><b>${n}</b><span>طالب</span></div><div><b>${past ? rows.filter(r => r.rounds).length : played}</b><span>${past ? 'شاركوا' : 'لعبوا اليوم'}</span></div><div><b>${tr ? Math.round(tc * 100 / (tr * 4)) + '%' : '—'}</b><span>إجابات صح</span></div></div>` : '';
  const body = chips + hero + nums + ko +
    (!n ? `<div class="rs-empty">${ic('users')}<div><b>لا يوجد طلبة في هذا الصف</b></div></div>` :
     !any ? `<div class="rs-empty">${ic('clock')}<div><b>ما لعب أحد للحين</b></div></div>` : '') +
    (n ? `<div class="rs2-list" id="r-list">${items}</div>` : '');
  view('النتائج', body, 'home', `<button class="icon-btn" data-act="r-more" aria-label="المزيد">${ic('more')}</button>`, CL.chg && !past ? '#/t/ch/' + CL.chg : past ? '#/t/comps' : '#/t/home');
}
ACTS['r-more'] = () => modal(`<div class="aw-sheet"><h3>المزيد</h3><div class="st1-opts">
  ${RS.k ? '<button class="st1-o rs2-again" data-act="r-run" data-a="r-again"><span>🔁</span>تحدي جديد بنفس الإعدادات</button>' : ''}
  <button class="st1-o" data-act="r-run" data-a="t-res-export"><span>📥</span>تنزيل Excel</button>
  <button class="st1-o" data-act="r-run" data-a="r-msg-all"><span>✉️</span>رسالة للصف</button></div></div>`);
ACTS['r-run'] = t => { const a = t.dataset.a; closeModals(); ACTS[a](t); };
/* same challenge again: open «تحدي جديد» at the last step with classes, subject, lessons and duration filled in */
ACTS['r-again'] = async () => {
  const k = RS.k; if (!k) return;
  const { data } = await sb.from('competitions').select('class_id').eq('group_id', k.group_id);
  const days = cfDays(k.start_date, k.end_date) + 1;
  Object.assign(NW, { keep: true, step: 3, multi: false, cls: [...new Set((data || []).map(x => x.class_id))], cu: k.curriculum_id || null, cus: k.curricula && k.curricula.length ? k.curricula.slice() : k.curriculum_id ? [k.curriculum_id] : [], gtypes: (k.qtypes || ['general', 'quick']).filter(x => x !== 'curriculum'),
    subj: String(k.title || '').split('·').pop().trim() || 'منوعة', days: days > 21 ? 30 : days > 10 ? 14 : 7, made: null, prizes: k.prizes && k.prizes.length ? k.prizes.slice() : null, lessons: k.lessons && k.lessons.length ? k.lessons : null, les: {}, diff: k.difficulty || null });
  go('#/t/new');
};
ACTS['r-retry'] = t => { t.setAttribute('aria-busy', 'true'); t.textContent = 'جارٍ التحميل…'; tResults.apply(null, RS.args || [RS.id, RS.comp]).catch(() => renderResults()); };
ACTS['r-cls'] = t => go('#/t/results/' + t.dataset.id + (RS.comp ? '/' + RS.comp : ''));
const rsRank = r => { const l = RS.rows.filter(x => x.cls === r.cls); return r.r || (l.slice().sort((x, y) => y.pts - x.pts).indexOf(r) + 1); };
const rsStu = r => ({ id: r.id, name: r.name, pts: r.pts, rank: r.pts ? rsRank(r) : '—', cls: r.cls });
ACTS['r-msg'] = t => { const r = RS.rows.find(x => x.id === t.dataset.id); if (r) msgSend([rsStu(r)]); };
ACTS['r-msg-all'] = () => msgSend(RS.rows.filter(r => r.id).map(rsStu));
ACTS['r-sort'] = t => { RS.sort = t.dataset.v; renderResults(); };
document.addEventListener('input', e => {
  if (e.target.id !== 'r-q') return;
  RS.q = e.target.value.trim(); const pos = e.target.selectionStart;
  renderResults(); const i = document.getElementById('r-q'); if (i) { i.focus(); i.setSelectionRange(pos, pos); }
});
ACTS['r-open'] = t => {
  const r = RS.rows.find(x => (x.cls + '|' + x.name + '|' + x.student_no) === t.dataset.k); if (!r) return;
  const sorted = RS.rows.filter(x => x.cls === r.cls).sort((x, y) => y.pts - x.pts);
  const acc = r.rounds ? Math.round(r.correct * 100 / (r.rounds * qPer(r.cls))) + '%' : '—';
  const ini = r.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join(' ');
  modal(`<div class="st-card"><div class="st-top"><div class="avatar big-av">${esc(ini)}</div><div><b>${esc(r.name)}</b><div class="sub">${esc(r.cls)} · رقم ${esc(r.student_no) || '—'}</div></div></div>
    <div class="stats"><div class="stat"><b>${r.pts}</b><span>النقاط</span></div><div class="stat"><b>${r.pts ? sorted.indexOf(r) + 1 : '—'}</b><span>في صفه من ${sorted.length}</span></div><div class="stat"><b>${r.rounds}</b><span>الجولات</span></div><div class="stat"><b>${acc}</b><span>نسبة الصحيح</span></div></div>
    <div class="sub center">${r.correct} إجابة صحيحة من ${r.rounds * qPer(r.cls)} · ${r.played_today ? '<b style="color:#168A5B">لعب اليوم ✓</b>' : '<b style="color:#8a5a00">لم يلعب اليوم</b>'}</div>
    <button class="btn" style="margin-top:14px" data-act="s-rep" data-id="${r.id}">📊 تقرير الطالب</button>
    <button class="btn soft" style="margin-top:8px" data-act="r-msg" data-id="${r.id}">${ic('mail')} إرسال رسالة</button></div>`);
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
    <div class="stats"><div class="stat"><b>${acc}%</b><span>نسبة الإجابات الصحيحة</span></div><div class="stat"><b>${d.total}</b><span>أسئلة</span></div><div class="stat"><b>${sp != null ? sp + ' ث' : '—'}</b><span>${speed}</span></div></div>
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
  while (w.nextNode()) if (/\S/.test(w.currentNode.nodeValue) && !(w.currentNode.parentNode.closest && w.currentNode.parentNode.closest('svg'))) nodes.push(w.currentNode);
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
  page.innerHTML = `<div class="rp-pdf-top"><img src="icon-192.png?i=10" alt=""><div><b>اهزم الدقيقة</b><span>تقرير أداء الطالب</span></div><div class="rp-pdf-meta">${RS.lastCls ? esc(RS.lastCls) + '<br>' : ''}${esc(RS.name || '')}<br>${new Date().toLocaleDateString('ar-KW-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}</div></div>`;
  page.appendChild(body);
  page.insertAdjacentHTML('beforeend', `<div class="rp-pdf-foot">المعلم/ـة: ${esc(T.name || '')} · أُعدّ هذا التقرير آلياً من نتائج الجولات الرسمية</div>`);
  wrap.appendChild(page); document.body.appendChild(wrap); rpSplitWords(page);
  const file = 'تقرير-' + String(RS.lastName || 'طالب').replace(/[\\/:*?"<>|]/g, '-') + '.pdf';
  try {
    await loadScript(H2P);
    await html2pdf().set({ margin: [8, 8, 10, 8], filename: file, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2, scrollX: 0, scrollY: 0, useCORS: true, backgroundColor: '#ffffff' }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['css', 'avoid-all'] } }).from(page).save();
    toast('تم تنزيل التقرير');
  } catch (e) {
    const pa = document.getElementById('print-area'); pa.innerHTML = ''; pa.appendChild(page.cloneNode(true)); window.print();
  } finally { wrap.remove(); t.disabled = false; t.innerHTML = lbl; }
};
ACTS['r-report-copy'] = () => { navigator.clipboard && navigator.clipboard.writeText(RS.lastText || ''); toast('تم النسخ'); };
ACTS['t-res-export'] = async () => { await XL();
  const rows = [['الصف', 'الاسم', 'رقم الطالب', 'النقاط', 'الجولات', 'الإجابات الصحيحة', 'نسبة الإجابات الصحيحة %', 'لعب اليوم']].concat(RS.rows.slice().sort((x, y) => y.pts - x.pts).map(r => [r.cls, r.name, r.student_no, r.pts, r.rounds, r.correct, r.rounds ? Math.round(r.correct * 100 / (r.rounds * qPer(r.cls))) : '', r.played_today ? 'نعم' : 'لا']));
  const ws = XLSX.utils.aoa_to_sheet(rows), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'النتائج'); XLSX.writeFile(wb, 'نتائج-' + RS.name.replace(/[\\/:*?"<>|]/g, '-') + '.xlsx');
};

/* ===== settings v2: Apple-style rows, switches, number wheel, choice pages ===== */
const SDEF = { scoring: 'speed', pts_auto: true, pts_e: 15, pts_m: 30, pts_h: 45, speed_pct: 50, pen_pct: 25, lb: 'all', lb_n: 10, lb_pts: true, lb_me: true, names: 'full',
  q_src: 'all', norep: false, shuffle: false, show_ans: 'each', difficulty: 'normal', sec_style: 'letters', sec_n: 5, cname: 'slash', def_stage: '', def_gender: '',
  stu_name: 'tri_fam', stu_sort: 'no', remember: true, rename: false, prof_title: '', school: '', prof_subject: '', prof_stage: '', district: '', msg_auto: false };
const SG = k => { const v = (T.settings || {})[k]; return v === undefined || v === null ? SDEF[k] : v; };
const SET_EMO = { trophy: '🏆', users: '👥', moon: '🌙', sun: '☀️', gear: '⚙️', lock: '🛡️', help: '❓', chart: '📊', mail: '✉️', archive: '🗄️', download: '📥', upload: '📤', star: '⭐', send: '💬', info: 'ℹ️', refresh: '🔄', eye: '👁️', bell: '🔔', user: '👤', clock: '⏰', print: '🖨️', trash: '🗑️', edit: '✏️', image: '🖼️', camera: '📷', share: '🔗', sound: '🔊', mute: '🔇', layers: '📚', home: '🏠', month: '📅', play: '▶️', plus: '➕', check: '✅', flag: '🚩', search: '🔍', logout: '🚪', x: '✖️', circle: '⭕', checkc: '✅', print2: '🖨️' };
const setIc = k => SET_EMO[k] ? `<span class="set-ic emo" aria-hidden="true">${SET_EMO[k]}</span>` : `<span class="set-ic" style="background:#8E8E93">${ic(k)}</span>`;
const sRow = o => `<button class="set-row${o.dim ? ' dim' : ''}${o.cls ? ' ' + o.cls : ''}" data-act="${o.act}" ${o.attrs || ''}>${o.icon ? setIc(o.icon) : ''}<span class="grow${o.sub ? ' rl-txt' : ''}">${o.sub ? `<b>${o.label}</b><small>${o.sub}</small>` : o.label}</span>${o.val != null && o.val !== '' ? `<span class="set-val">${o.val}</span>` : ''}${o.noChev ? '' : `<span class="set-chev">${ic('back')}</span>`}</button>`;
const swRow = o => { const on = o.on != null ? o.on : !!SG(o.k); return `<button class="set-row" data-act="${o.act || 'sw-tog'}" data-k="${o.k}" ${o.re ? 'data-re="1"' : ''} ${o.attrs || ''} role="switch" aria-checked="${on}">${o.icon ? setIc(o.icon) : ''}<span class="grow${o.sub ? ' rl-txt' : ''}">${o.sub ? `<b>${o.label}</b><small>${o.sub}</small>` : o.label}</span><span class="ios-sw${on ? ' on' : ''}"><i></i></span></button>`; };
const sGrp = (title, rows, foot) => `${title ? `<div class="set-h">${title}</div>` : ''}<div class="set-grp">${rows.filter(Boolean).join('')}</div>${foot ? `<div class="set-f">${foot}</div>` : ''}`;
function rerender(){ NS.keepY = scrollY; teacherRoute(); }
function haptic(){ try { if (LS.get('mc_vib') === '1' && navigator.vibrate) navigator.vibrate(6); } catch(e){} }
ACTS['sw-tog'] = async t => {
  const k = t.dataset.k, on = !t.querySelector('.ios-sw').classList.contains('on');
  t.querySelector('.ios-sw').classList.toggle('on', on); t.setAttribute('aria-checked', on); haptic();
  await saveSettings({ [k]: on });
  if (t.dataset.re) rerender();
};
/* number wheel */
function pickNum(o){
  return new Promise(res => {
    const vals = []; for (let v = o.min; v <= o.max + 1e-9; v += o.step) vals.push(Math.round(v * 100) / 100);
    const fmt = o.fmt || (v => String(v));
    let idx = Math.max(0, vals.indexOf(o.value)); if (vals.indexOf(o.value) < 0) idx = vals.reduce((b, v, i) => Math.abs(v - o.value) < Math.abs(vals[b] - o.value) ? i : b, 0);
    const m = modal(`<div class="np"><div class="np-top"><button type="button" class="link" data-np="0">إلغاء</button><b>${esc(o.title)}</b><button type="button" class="link np-ok" data-np="1">تم</button></div>
      <div class="np-wheel"><div class="np-band"></div><div class="np-list">${vals.map((v, i) => `<div class="np-i${i === idx ? ' on' : ''}">${esc(fmt(v))}</div>`).join('')}</div></div>${o.hint ? `<div class="set-f center">${esc(o.hint)}</div>` : ''}</div>`);
    m.classList.add('np-back');
    const list = m.querySelector('.np-list'), H = 44, items = [...list.children];
    requestAnimationFrame(() => { list.scrollTop = idx * H; });
    let raf = 0;
    list.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const i = Math.max(0, Math.min(vals.length - 1, Math.round(list.scrollTop / H))); if (i !== idx) { items[idx].classList.remove('on'); items[i].classList.add('on'); idx = i; haptic(); } }); }, { passive: true });
    items.forEach((el, i) => el.addEventListener('click', () => list.scrollTo({ top: i * H, behavior: 'smooth' })));
    const done = v => { m.remove(); res(v); };
    m.addEventListener('click', e => { const b = e.target.closest('[data-np]'); if (b) done(b.dataset.np === '1' ? vals[idx] : null); else if (e.target === m) res(null); });
  });
}
const NUMS = {
  pts_e: { t: 'نقاط السؤال السهل', min: 0, max: 100, step: 5 }, pts_m: { t: 'نقاط السؤال المتوسط', min: 0, max: 100, step: 5 }, pts_h: { t: 'نقاط السؤال الصعب', min: 0, max: 100, step: 5 },
  speed_pct: { t: 'مكافأة السرعة', min: 0, max: 100, step: 10, fmt: v => 'لين ' + v + '%', hint: 'نسبة من نقاط السؤال لمن يجاوب فوراً، وتقل مع الوقت' },
  pen_pct: { t: 'خصم الإجابة الخاطئة', min: 0, max: 100, step: 5, fmt: v => v + '%', hint: 'نسبة من نقاط السؤال تنخصم عند الخطأ' },
  lb_n: { t: 'عدد المتصدرين', min: 3, max: 20, step: 1 }, sec_n: { t: 'عدد الشعب', min: 1, max: 15, step: 1 }
};
const numVal = k => (NUMS[k].fmt || String)(SG(k));
const numRow = (k, label, dim) => sRow({ act: 'num-pick', attrs: `data-k="${k}"${dim ? ' data-dim="1"' : ''}`, label, val: numVal(k), dim });
ACTS['num-pick'] = async t => {
  const k = t.dataset.k, N = NUMS[k];
  if (t.dataset.dim) return toast('أطفئ «تلقائي» عشان تعدّل النقاط');
  const v = await pickNum({ title: N.t, min: N.min, max: N.max, step: N.step, value: SG(k), fmt: N.fmt, hint: N.hint });
  if (v == null || v === SG(k)) return;
  await saveSettings({ [k]: v }); rerender();
};
/* choice pages (#/t/opt/<key>) */
const DIFF_ALL = () => DIFF.map(d => [d[0], d[1], d[2]]);
const OPTS = {
  difficulty: { t: 'الصعوبة الافتراضية', back: '#/t/rules', o: DIFF_ALL, foot: 'كل جولة فيها 4 أسئلة. «حسب مستوى الطالب» تصعّب الأسئلة لمن يجاوب صح وتسهّلها لمن يغلط.' },
  q_src: { t: 'مصدر الأسئلة', back: '#/t/qset', o: () => [['all', 'أسئلتي + بنك الأسئلة', 'إذا خلصت أسئلتك تكمل من البنك'], ['mine', 'أسئلتي فقط', 'لازم يكون عندك أسئلة متاحة كافية']] },
  show_ans: { t: 'إظهار الإجابة الصحيحة', back: '#/t/rules', o: () => [['each', 'بعد كل سؤال', 'يشوف الجواب الصح على طول، وبنهاية الجولة تطلع له مراجعة أخطائه بعد'], ['end', 'بنهاية الجولة بس', 'أثناء اللعب يعرف صح أو غلط بس، والجواب الصح في مراجعة آخر الجولة'], ['never', 'لا تظهر', 'يعرف الطالب بس إذا كانت إجابته صح أو خطأ']] },
  scoring: { t: 'طريقة الحساب', back: '#/t/rset', o: () => [['speed', 'الإجابة الصحيحة ومكافأة السرعة', 'نقاط السؤال + مكافأة لمن يجاوب أسرع'], ['correct', 'الصحة فقط', 'نقاط السؤال بدون مكافأة سرعة'], ['penalty', 'مع خصم للخطأ', 'مثل الأول، والخاطئة تخصم (الجولة ما تنزل تحت الصفر)']] },
  lb: { t: 'لوحة المتصدرين', back: '#/t/rset', o: () => [['all', 'كاملة', 'يشوف الطالب ترتيب كل الصف'], ['top', 'أفضل عدد', 'تحدد العدد من صفحة النتائج'], ['hidden', 'مخفية حتى النهاية', 'يشوف ترتيبه بس لين تنتهي المسابقة']], get: () => SG('lb') === 'top10' ? 'top' : SG('lb') },
  names: { t: 'أسماء الطلبة في اللوحة', back: '#/t/rset', o: () => [['full', 'الاسم كاملاً', 'محمد أحمد العلي'], ['first_fam', 'الأول وحرف العائلة', 'محمد ع.'], ['first', 'الاسم الأول فقط', 'محمد']] },
  prof_title: { t: 'اللقب', back: '#/t/account', o: () => [['', 'بدون', ''], ['أ.', 'أ.', ''], ['أستاذ', 'أستاذ', ''], ['أستاذة', 'أستاذة', ''], ['د.', 'د.', '']] },
  prof_stage: { t: 'المرحلة', back: '#/t/account', multi: true, o: () => OB_STAGES.map(s => [s, s, '']) },
  district: { t: 'المنطقة التعليمية', back: '#/t/account', o: () => [['', 'بدون', '']].concat(OB_DIST.map(s => [s, s, ''])) },
  prof_subject: { t: 'موادي', back: '#/t/account', multi: true, o: () => SUBJECTS.filter(s => s !== 'عام' && s !== 'أخرى').map(s => [s, s, '']), foot: 'تقدر تختار أكثر من مادة. موادك تطلع أول في «بنك الأسئلة»، والباقي تحت «مواد أخرى».' },
  sec_style: { t: 'تسمية الشعب', back: '#/t/sset', o: () => [['letters', 'حروف', 'أ، ب، ج'], ['numbers', 'أرقام', '1، 2، 3']] },
  cname: { t: 'صيغة اسم الصف', back: '#/t/sset', o: () => [['slash', 'السادس / أ', ''], ['short', '6أ', ''], ['long', 'الصف السادس - أ', '']].map(x => [x[0], cnameDemo(x[0]), '']) },
  def_stage: { t: 'المرحلة الافتراضية', back: '#/t/sset', o: () => [['', 'آخر مرحلة اخترتها', '']].concat(Object.keys(STAGE_AR).map(k => [k, STAGE_AR[k], ''])) },
  def_gender: { t: 'نوع الصف الافتراضي', back: '#/t/sset', o: () => [['', 'بدون', 'تختاره كل مرة'], ['m', 'بنين', ''], ['f', 'بنات', ''], ['mix', 'مختلط', '']] },
  stu_name: { t: 'كيف تشوف أسماء طلابك', back: '#/t/sset', o: () => [['tri_fam', 'ثلاثي مع العائلة', 'محمد أحمد علي العلي'], ['tri', 'ثلاثي بدون العائلة', 'محمد أحمد علي'], ['first_fam', 'الأول وحرف العائلة', 'محمد ع.'], ['first', 'الاسم الأول فقط', 'محمد']] },
  stu_sort: { t: 'ترتيب قائمة الطلبة', back: '#/t/sset', o: () => [['no', 'حسب الإضافة', ''], ['name', 'أبجدي', ''], ['pts', 'حسب النقاط', 'أثناء المسابقة']] }
};
const optGet = k => OPTS[k].get ? OPTS[k].get() : String(SG(k));
const mySubjects = () => String(SG('prof_subject') || '').split('|').filter(Boolean);
const optLabel = k => { if (OPTS[k].multi) { const v = String(SG(k) || '').split('|').filter(Boolean); return v.length ? v.join('، ') : 'بدون'; } const x = OPTS[k].o().find(o => o[0] === optGet(k)); return x ? x[1] : ''; };
const optRow = (k, label, extra) => sRow(Object.assign({ act: 'go', attrs: `data-h="#/t/opt/${k}"`, label, val: esc(optLabel(k)) }, extra || {}));
ACTS['go'] = t => go(t.dataset.h);
function tOpt(k){
  const O = OPTS[k]; if (!O) return go('#/t/settings');
  const cur = optGet(k), curs = O.multi ? cur.split('|') : [cur];
  view(O.t, sGrp('', O.o().map(x => `<button class="set-row radio" data-act="opt-pick" data-k="${k}" data-v="${esc(x[0])}"><span class="grow rl-txt"><b>${esc(x[1])}</b>${x[2] ? `<small>${esc(x[2])}</small>` : ''}</span><span class="tick ${curs.includes(x[0]) ? 'on' : ''}">${ic('check')}</span></button>`), O.foot), 'settings', '', O.back);
}
ACTS['opt-pick'] = async t => {
  const k = t.dataset.k;
  if (OPTS[k].multi) { const tk = t.querySelector('.tick'); tk.classList.toggle('on'); haptic();
    const v = [...t.parentElement.querySelectorAll('[data-act="opt-pick"]')].filter(b => b.querySelector('.tick.on')).map(b => b.dataset.v).join('|');
    return saveSettings({ [k]: v }); }
  t.parentElement.querySelectorAll('.tick').forEach(x => x.classList.toggle('on', x.parentElement === t)); haptic();
  await saveSettings({ [k]: t.dataset.v });
};
const tName = () => (SG('prof_title') ? SG('prof_title') + ' ' : '') + (T.name || '');
const isStandalone = () => isApp() || (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

/* ---- main settings ---- */
async function tSettings(){
  const sub = [mySubjects().join('، '), SG('school')].filter(Boolean).join(' · ');
  view('الإعدادات',
    `<button class="set-profile" data-act="go" data-h="#/t/account">${avatarHtml('big-av')}<div class="grow"><b>${esc(tName())}</b><div class="sub">${sub ? esc(sub) : `<span dir="ltr">${esc(T.user.email || '')}</span>`}</div></div><span class="set-chev">${ic('back')}</span></button>` +
    sGrp('', [sRow({ act: 'go', attrs: 'data-h="#/t/rules"', icon: 'trophy', color: '#C8102E', label: 'قواعد اللعب', val: 'النقاط · الترتيب' }),
      sRow({ act: 'go', attrs: 'data-h="#/t/sset"', icon: 'users', color: '#1FA971', label: 'الطلاب والصفوف', val: 'الأسماء · الرسائل' }),
      sRow({ act: 'go', attrs: 'data-h="#/t/appear"', icon: 'moon', color: '#5856D6', label: 'المظهر', val: `<span id="mode-val">${(FONTS.find(f => f[0] === (LS.get('mc_fs') || 'm')) || FONTS[1])[1]}</span>` }),
      sRow({ act: 'go', attrs: 'data-h="#/t/sg/app"', icon: 'gear', color: '#8E8E93', label: 'التطبيق', val: 'تثبيت · بيانات' }),
      ADM.st && ADM.st.is ? sRow({ act: 'go', attrs: 'data-h="#/t/admin"', icon: 'lock', color: '#30B0C7', label: 'المشرف', val: 'المعلمين · الدعم' }) : '']) +
    sGrp('', [`<button class="set-row danger-row" data-act="st-logout-ask"><span class="grow center">تسجيل الخروج</span></button>`]) +
    `<div class="set-f center">اهزم الدقيقة · الإصدار ${APP_VER}</div>`, 'settings');
}
function tSetGroup(k){
  const G = {
    ch: ['التحدي', sGrp('', [sRow({ act: 'go', attrs: 'data-h="#/t/rules"', icon: 'help', color: '#C8102E', label: 'قواعد اللعب', val: esc(optLabel('scoring') === 'الصحة فقط' ? 'الصح بس' : 'الصح + السرعة') })])],
    st: ['الطلاب', sGrp('', [sRow({ act: 'go', attrs: 'data-h="#/t/sset"', icon: 'users', color: '#1FA971', label: 'الطلبة والصفوف' }),
      sRow({ act: 'go', attrs: 'data-h="#/t/msgtpl"', icon: 'mail', color: '#2F80ED', label: 'قوالب الرسائل', val: 'تشجيع · تقدير · توصية' }),
      sRow({ act: 'go', attrs: 'data-h="#/t/archive"', icon: 'archive', color: '#A2845E', label: 'الصفوف المؤرشفة' })])],
    app: ['التطبيق', sGrp('', [
      isStandalone() ? '' : sRow({ act: 'st-install', icon: 'download', color: '#2F80ED', label: 'تثبيت التطبيق على الشاشة الرئيسية' }),
      sRow({ act: 'st-invite', icon: 'star', color: '#F5B72B', label: 'دعوة زميل/ـة' }),
      sRow({ act: 'st-feedback', icon: 'send', color: '#14A89B', label: 'اقتراح أو مشكلة' }),
      sRow({ act: 'st-about', icon: 'info', color: '#8E8E93', label: 'عن التطبيق', val: 'الإصدار ' + APP_VER })]) +
      sGrp('البيانات', [
      sRow({ act: 'go', attrs: 'data-h="#/t/export"', icon: 'download', color: '#14A89B', label: 'تصدير البيانات', val: 'Excel · PDF' }),
      sRow({ act: 'st-privacy', icon: 'lock', color: '#9B51E0', label: 'الخصوصية' })])]
  }, g = G[k] || G.ch;
  view(g[0], g[1], 'settings', '', '#/t/settings');
}
const APP_VER = '0.3';
ACTS['st-about'] = () => modal(`<div class="aw-sheet"><h3>اهزم الدقيقة</h3><p class="sub">الإصدار ${APP_VER} · تحديث ${String(document.querySelector('script[src*="app.js"]')?.src.split('v=')[1] || '')}</p></div>`);
ACTS['st-feedback'] = () => modal(`<h3>اقتراح أو مشكلة</h3><form class="col" data-form="st-feedback-send"><textarea class="input" name="b" rows="5" maxlength="2000" required placeholder="اكتب اقتراحك أو المشكلة اللي واجهتك..."></textarea><button class="btn" type="submit">${ic('send')} إرسال</button></form>`);
ACTS['st-feedback-send'] = async f => {
  const { error } = await sb.from('feedback').insert({ body: f.b.value.trim() });
  if (error) return toast(errMsg(error)); closeModals(); toast('وصلنا، شكراً لك 🙏');
};
ACTS['st-newyear'] = async () => {
  const { data, error } = await sb.from('classes').select('id').eq('archived', false); if (error) return toast(errMsg(error));
  if (!data.length) return toast('ما فيه صفوف نشطة');
  if (!await ask(`نؤرشف ${data.length} صف عشان تبدأ سنة جديدة؟ تبقى البيانات محفوظة وتقدر تسترجعها من «الصفوف المؤرشفة».`, { danger: false, ok: 'أرشفة الكل' })) return;
  const r = await sb.from('classes').update({ archived: true }).eq('archived', false); if (r.error) return toast(errMsg(r.error));
  toast('تمت أرشفة الصفوف، بالتوفيق في السنة الجديدة 🎉');
};

/* ---- account page ---- */
const AC_TITLES = [['', 'بدون'], ['أ.', 'أ.'], ['أستاذ', 'أستاذ'], ['أستاذة', 'أستاذة'], ['د.', 'د.']];
function accForm(){
  const st = String(SG('prof_stage') || '').split('|'), sj = mySubjects(), t = SG('prof_title') || '', d = SG('district') || '';
  const chip = (k, v, l, on, e) => `<button type="button" class="ac-c${on ? ' on' : ''}" data-act="ac-c" data-k="${k}" data-v="${esc(v)}">${e ? `<span>${e}</span>` : ''}${esc(l)}</button>`;
  return `<form class="ac-f" data-form="ac-save" autocomplete="off">
    <div class="ac-fd"><label for="ac-n">الاسم</label><input class="input" id="ac-n" name="n" value="${esc(T.name || '')}" maxlength="60" required></div>
    <div class="ac-fd"><label>اللقب</label><div class="ac-g g5">${AC_TITLES.map(x => chip('t', x[0], x[1], t === x[0])).join('')}</div></div>
    <div class="ac-fd"><label for="ac-s">المدرسة</label><input class="input" id="ac-s" name="s" value="${esc(SG('school') || '')}" maxlength="80" placeholder="اسم المدرسة"></div>
    <div class="ac-fd"><label>المرحلة</label><div class="ac-g g4">${OB_STAGES.map(v => chip('st', v, v, st.includes(v))).join('')}</div></div>
    <div class="ac-fd"><label>المواد</label><div class="ac-g g2">${SUBJECTS.filter(v => v !== 'عام' && v !== 'أخرى').map(v => chip('sj', v, v, sj.includes(v), SUBJ_EMOJI[v] || '📘')).join('')}</div></div>
    <div class="ac-fd"><label>المنطقة التعليمية</label><div class="ac-g g3">${OB_DIST.map(v => chip('d', v, v, d === v)).join('')}</div></div>
    <p class="ac-note">المدرسة والمادة واللقب تظهر للطلبة في ملفهم.</p>
    <button class="p3-big ac-sv" type="submit" disabled>حفظ</button></form>`;
}
function accCard(){
  const tags = [String(SG('prof_stage') || '').split('|').filter(Boolean).join('، '), mySubjects().map(v => (SUBJ_EMOJI[v] || '📘') + ' ' + v).join('  '), [SG('school'), SG('district')].filter(Boolean).join(' · ')];
  const L = ['المرحلة', 'المواد', 'المدرسة'];
  return `<button class="ac-card" data-act="ac-open">${tags.map((v, i) => `<div class="ac-r"><span>${L[i]}</span><b>${v ? esc(v) : '<i>إضافة</i>'}</b></div>`).join('')}<div class="ac-ed">✏️ تعديل ملفي</div></button>`;
}
ACTS['ac-open'] = () => modal(`<div class="ac-sh"><div class="q4-shh"><h3>ملفي</h3><button class="q4-x" data-act="close-modal" aria-label="إغلاق">✕</button></div>${accForm()}</div>`);
const acDirty = () => { const b = document.querySelector('.ac-sv'); if (b) b.disabled = false; };
ACTS['ac-c'] = t => { const k = t.dataset.k, g = t.parentElement;
  if (k === 't' || k === 'd') g.querySelectorAll('.ac-c').forEach(x => x.classList.toggle('on', x === t && (k === 't' || !t.classList.contains('on'))));
  else t.classList.toggle('on');
  haptic(); acDirty(); };
document.addEventListener('input', e => { if (e.target.closest && e.target.closest('.ac-f')) acDirty(); });
ACTS['ac-save'] = async f => {
  const on = k => [...f.querySelectorAll(`.ac-c.on[data-k="${k}"]`)].map(x => x.dataset.v);
  const name = f.n.value.trim(); if (!name) return toast('اكتب اسمك');
  const btn = f.querySelector('.ac-sv'); btn.setAttribute('aria-busy', 'true');
  if (name !== T.name) { const { error } = await sb.from('teachers').update({ display_name: name }).eq('id', T.user.id); if (error) { btn.removeAttribute('aria-busy'); return toast(errMsg(error)); } T.name = name; }
  await saveSettings({ prof_title: on('t')[0] || '', school: f.s.value.trim().slice(0, 80), prof_stage: on('st').join('|'), prof_subject: on('sj').join('|'), district: on('d')[0] || '' });
  btn.removeAttribute('aria-busy'); toast('انحفظ ✓'); closeModals(); rerender();
};
async function tAccount(){
  const prov = ((T.user.app_metadata || {}).provider) || 'email';
  const PROV = { email: 'البريد الإلكتروني', google: 'Google', apple: 'Apple' };
  view('حسابي', `<div class="acc-head"><button class="prof-av" data-act="av-menu" aria-label="تغيير الصورة">${avatarHtml('prof-big')}<span class="prof-cam">${ic('edit')}</span></button><b>${esc(tName())}</b><div class="sub" id="acc-stats">…</div></div>` +
    accCard() +
    sGrp('تسجيل الدخول', [`<div class="set-row"><span class="grow">طريقة الدخول</span><span class="set-val">${PROV[prov] || esc(prov)}</span></div>`,
      `<div class="set-row"><span class="grow">البريد</span><span class="set-val" dir="ltr">${esc(T.user.email || '')}</span></div>`,
      prov === 'email' ? sRow({ act: 'st-pass', label: 'تغيير كلمة المرور' }) : '']) +
    sGrp('', [`<button class="set-row danger-row" data-act="st-del-acc"><span class="grow center">حذف الحساب</span></button>`], 'يحذف حسابك وكل صفوفك وطلبتك وأسئلتك نهائياً.'), 'settings', '', '#/t/settings');
  try {
    const [c, s, k] = await Promise.all([sb.from('classes').select('id', { count: 'exact', head: true }).eq('archived', false),
      sb.from('students').select('id', { count: 'exact', head: true }), sb.from('competitions').select('id', { count: 'exact', head: true }).eq('status', 'active')]);
    const el = document.getElementById('acc-stats');
    if (el) el.textContent = `${c.count || 0} صفوف · ${s.count || 0} طالب · ${k.count || 0} مسابقة نشطة`;
  } catch(e){}
}
ACTS['st-school'] = async () => { const v = await ask('اسم المدرسة', { input: SG('school'), placeholder: 'مثال: مدرسة الفيحاء', ok: 'حفظ', danger: false }); if (v == null) return; await saveSettings({ school: v.trim().slice(0, 80) }); rerender(); };
ACTS['st-del-acc'] = async () => {
  if (!await ask('بينحذف حسابك وكل بياناتك نهائياً وما تقدر ترجعها. اكتب «حذف» للتأكيد.', { input: '', require: 'حذف', ok: 'حذف الحساب', danger: true })) return;
  try { await rpc('delete_my_account', {}); } catch(e){ return toast(errMsg(e)); }
  try { await sb.auth.signOut(); } catch(e){}
  T.name = null; T.settings = {}; location.hash = '#/t'; toast('تم حذف الحساب');
};

/* ---- v242 (Khalid ❤ preview https://claude.ai/artifact/9U8PfvebVym6SnstV7LxJ2): one «قواعد اللعب» page ---- */
const RL = { adv: false };
function tRules(){
  const sc = SG('scoring') || 'speed', auto = SG('pts_auto'), lb = optGet('lb'), nm = optGet('names');
  const pe = auto ? 15 : SG('pts_e'), pm = auto ? 30 : SG('pts_m'), ph = auto ? 45 : SG('pts_h');
  const maxR = Math.round((pe + 2 * pm + ph) * (sc === 'correct' ? 1 : 1 + SG('speed_pct') / 100));
  const tbk = tbKeys();
  const card = (v, e, b, sm) => `<button class="rl-pc${sc === v ? ' on' : ''}" data-act="rl-sc" data-v="${v}"><span class="rl-e">${e}</span><span class="grow"><b>${b}</b><small>${sm}</small></span><span class="rl-n"></span></button>`;
  const seg = (k, cur, opts) => `<div class="rl-sg">${opts.map(o => `<button class="${cur === o[0] ? 'on' : ''}" data-act="rl-seg" data-k="${k}" data-v="${o[0]}">${o[1]}</button>`).join('')}</div>`;
  view('قواعد اللعب',
    sGrp('الجولة', [optRow('difficulty', 'الصعوبة الافتراضية'), optRow('show_ans', 'إظهار الإجابة الصحيحة'),
      swRow({ k: 'shuffle', label: 'خلط الخيارات', sub: 'الخيارات تنخلط، فكل طالب يشوفها بترتيب مختلف وما ينفع ينقل من غيره' }), swRow({ k: 'norep', label: 'لا تعيد سؤال جاوبه صح', sub: 'السؤال اللي جاوبه الطالب صح ما يرجع له، فيركز على الأسئلة الجديدة واللي غلط فيها' })],
      '٤ أسئلة × ١٥ ثانية (الابتدائي ٣ × ٢٠). الصعوبة تقدر تغيّرها لكل تحدي.') +
    `<div class="set-h">النقاط</div><div class="rl-pts">${card('correct', '✅', 'الصح بس', 'كل إجابة صح تاخذ نقاطها')}${card('speed', '⚡', 'الصح + السرعة', 'الأسرع ياخذ لين ' + SG('speed_pct') + '٪ زيادة')}${card('penalty', '⚖️', 'الصح + السرعة − الخطأ', 'والخطأ يخصم ' + SG('pen_pct') + '٪')}</div>
    <div class="set-f">أعلى جولة تقريباً ${maxR} نقطة. التغيير يأثر على الجولات القادمة بس.</div>
`+
    `<div class="set-h">الترتيب عند الطلاب</div><div class="set-grp">
      <div class="rl2-row"><span>يشوف الطالب</span>${seg('lb', lb, [['all', 'كل الصف'], ['top', 'الأوائل بس'], ['hidden', 'ترتيبه بس']])}</div>
      ${lb === 'top' ? numRow('lb_n', 'عدد الأوائل') + swRow({ k: 'lb_me', label: 'يشوف ترتيبه دائماً', sub: 'حتى لو مو من الأوائل' }) : ''}
      <div class="rl2-row"><span>الأسماء عند الطلاب</span>${seg('names', nm, [['full', 'محمد أحمد العلي'], ['first_fam', 'محمد ع.'], ['first', 'محمد']])}</div>
      ${swRow({ k: 'lb_pts', label: 'إظهار نقاط الآخرين' })}
    </div>`,
    'settings', '', '#/t/settings');
}
ACTS['rl-sc'] = async t => { haptic(); await saveSettings({ scoring: t.dataset.v }); rerender(); };
ACTS['rl-seg'] = async t => { haptic(); await saveSettings({ [t.dataset.k]: t.dataset.v }); rerender(); };
ACTS['rl-adv'] = () => { RL.adv = !RL.adv; rerender(); };
/* ---- question settings (old page, kept for reference; routes now go to tRules) ---- */
async function tQSet(){
  const qt = SG('qtypes') || ['curriculum', 'general', 'quick'];
  const QC = { curriculum: '#2F80ED', general: '#14A89B', quick: '#FF9500', memory: '#AF52DE' };
  view('إعدادات الأسئلة',
    sGrp('الجولة', [optRow('difficulty', 'صعوبة الجولة')], 'كل جولة فيها 4 أسئلة، ولكل سؤال 15 ثانية. الإعدادات تنطبق على كل مسابقة جديدة.') +
    sGrp('أنواع الأسئلة', QTYPES.map(q => swRow({ act: 'qs-type', k: q[0], on: qt.includes(q[0]), icon: q[3], color: QC[q[0]], label: q[1], sub: q[2] })), 'اختر نوع واحد على الأقل، وتنسحب الأسئلة منها عشوائياً.') +
    sGrp('أثناء اللعب', [swRow({ k: 'shuffle', label: 'خلط الخيارات', sub: 'ترتيب الخيارات يختلف لكل طالب' }), swRow({ k: 'norep', label: 'عدم تكرار الأسئلة المجابة صح' }), optRow('show_ans', 'إظهار الإجابة الصحيحة')]),
    'settings', '', '#/t/sg/ch');
}
ACTS['qs-type'] = async t => {
  let v = (SG('qtypes') || ['curriculum', 'general', 'quick']).slice(); const k = t.dataset.k;
  if (v.includes(k)) { if (v.length === 1) return toast('اختر نوع واحد على الأقل'); v = v.filter(x => x !== k); } else v.push(k);
  t.querySelector('.ios-sw').classList.toggle('on', v.includes(k)); haptic();
  await saveSettings({ qtypes: v });
};

/* ---- results settings ---- */
function tRSet(){
  const sc = SG('scoring'), auto = SG('pts_auto'), lb = optGet('lb');
  const pe = auto ? 15 : SG('pts_e'), pm = auto ? 30 : SG('pts_m'), ph = auto ? 45 : SG('pts_h');
  const maxR = Math.round((pe + 2 * pm + ph) * (sc === 'correct' ? 1 : 1 + SG('speed_pct') / 100));
  const tbk = tbKeys();
  view('إعدادات النتائج',
    sGrp('حساب النقاط', [optRow('scoring', 'الطريقة'), swRow({ k: 'pts_auto', re: 1, label: 'تلقائي', sub: 'سهل 15 · متوسط 30 · صعب 45' }),
      numRow('pts_e', 'سهل', auto), numRow('pts_m', 'متوسط', auto), numRow('pts_h', 'صعب', auto),
      sc !== 'correct' ? numRow('speed_pct', 'مكافأة السرعة') : '', sc === 'penalty' ? numRow('pen_pct', 'خصم الخطأ') : ''],
      `أعلى درجة بجولة «متوسط» تقريباً ${maxR} نقطة. التغيير يأثر على الجولات القادمة بس.`) +
    sGrp('لوحة المتصدرين للطلبة', [optRow('lb', 'اللوحة'), lb === 'top' ? numRow('lb_n', 'عدد المتصدرين') : '',
      swRow({ k: 'lb_pts', label: 'إظهار نقاط الطلبة الآخرين' }), swRow({ k: 'lb_me', label: 'إظهار ترتيب الطالب دائماً', sub: 'حتى لو مو من الأوائل' }), optRow('names', 'الأسماء في اللوحة')]),
    'settings', '', '#/t/sg/ch');
}
const TBL = { accuracy: ['نسبة الإجابات الصحيحة', 'الأعلى نسبة إجابات صحيحة'], speed: ['السرعة', 'متوسط زمن الإجابات الصحيحة'], rounds: ['المشاركة', 'عدد الجولات الرسمية'], last: ['آخر جولة', 'نقاط آخر جولة لعبها'] };
function tbKeys(){
  let a = (T.settings || {}).tb;
  if (!Array.isArray(a) || a.length !== 4) { const f = (T.settings || {}).tiebreak || 'accuracy'; a = [f].concat(['accuracy', 'speed', 'rounds', 'last'].filter(x => x !== f)); }
  return a;
}
function tTB(){
  const a = tbKeys();
  view('عند تساوي النقاط', `<div class="set-grp tb-list">${a.map((k, i) => `<div class="set-row tb-row" data-k="${k}"${i ? ` data-act="tb-mv" data-i="${i}" data-d="-1"` : ''}><span class="tb-n">${i + 1}</span><span class="grow rl-txt"><b>${TBL[k][0]}</b><small>${TBL[k][1]}</small></span><span class="drag-h" aria-hidden="true">${ic('grip')}</span></div>`).join('')}</div>
    <div class="set-f">اسحب ☰ أو اضغط على المعيار عشان يطلع فوق. لو تساوى طالبين بالنقاط، يتقدم الأعلى في المعيار الأول، ولو تساووا فيه نروح للي بعده.</div>`, 'settings', '', '#/t/rules');
}
ACTS['tb-mv'] = async t => { const keys = tbKeys().slice(), i = Number(t.dataset.i), j = i + Number(t.dataset.d); if (j < 0 || j >= keys.length) return;
  [keys[i], keys[j]] = [keys[j], keys[i]]; await saveSettings({ tb: keys }); tTB();
  const b = document.querySelector(`.tb-row[data-k="${keys[j]}"] [data-d="${t.dataset.d}"]`) || document.querySelector(`.tb-row[data-k="${keys[j]}"] .tb-b`); if (b) b.focus(); };
(function(){
  let D = null;
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.tb-row .drag-h')) e.stopPropagation(); }, true);
  document.addEventListener('pointerdown', e => {
    const h = e.target.closest('.drag-h'); if (!h) return;
    const row = h.closest('.tb-row'), list = row.parentElement, rows = [...list.children];
    D = { row, list, rows, i0: rows.indexOf(row), y0: e.clientY, H: row.offsetHeight, to: rows.indexOf(row) };
    row.classList.add('drag'); h.setPointerCapture(e.pointerId); e.preventDefault();
  });
  document.addEventListener('pointermove', e => {
    if (!D) return;
    const dy = e.clientY - D.y0, to = Math.max(0, Math.min(D.rows.length - 1, D.i0 + Math.round(dy / D.H)));
    D.row.style.transform = `translateY(${dy}px)`;
    if (to !== D.to) haptic(); D.to = to;
    D.rows.forEach((r, i) => { if (r === D.row) return; let s = 0; if (D.i0 < to && i > D.i0 && i <= to) s = -D.H; if (D.i0 > to && i < D.i0 && i >= to) s = D.H; r.style.transform = s ? `translateY(${s}px)` : ''; });
  });
  const end = async () => {
    if (!D) return; const d = D; D = null;
    const keys = d.rows.map(r => r.dataset.k), k = keys.splice(d.i0, 1)[0]; keys.splice(d.to, 0, k);
    d.rows.forEach(r => { r.style.transform = ''; r.classList.remove('drag'); });
    if (d.to !== d.i0) { await saveSettings({ tb: keys }); tTB(); }
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
})();

/* ---- students & classes ---- */
const SEC_L = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي', 'ك', 'ل', 'م', 'ن', 'س'];
const secList = () => { const n = SG('sec_n'); return SG('sec_style') === 'numbers' ? Array.from({ length: n }, (_, i) => String(i + 1)) : SEC_L.slice(0, n); };
function cnameOf(stage, grade, sec, fmt){
  if (!grade) return '';
  fmt = fmt || SG('cname');
  if (stage === 'university') return 'السنة ' + UNI_Y[grade - 1] + (sec ? ' / ' + sec : '');
  const g = GRADES[grade - 1];
  if (fmt === 'short') return grade + (sec ? (/^\d/.test(sec) ? '/' + sec : sec) : '');
  if (fmt === 'long') return 'الصف ' + g + (sec ? ' - ' + sec : '');
  return g + (sec ? ' / ' + sec : '');
}
const cnameDemo = f => cnameOf('primary', 6, SG('sec_style') === 'numbers' ? '1' : 'أ', f);
function fmtStu(name, mode){
  const w = String(name || '').trim().split(/\s+/).filter(Boolean); if (w.length < 2) return name || '';
  mode = mode || SG('stu_name');
  const ini = s => s.replace(/^ال/, '').charAt(0);
  if (mode === 'first') return w[0];
  if (mode === 'first_fam') return w[0] + ' ' + ini(w[w.length - 1]) + '.';
  if (mode === 'tri') return w.slice(0, 3).join(' ');
  return w.length > 4 ? w.slice(0, 3).concat(w[w.length - 1]).join(' ') : w.join(' ');
}
/* v266 (Khalid): one «الطلاب والصفوف» page; dead/old class settings removed */
function tSSet(){
  view('الطلاب والصفوف',
    sGrp('', [optRow('stu_name', 'كيف تشوف أسماء طلابك')], 'في صفحة الصف وصفحة التحدي عندك أنت. اللي يشوفه الطلاب من «قواعد اللعب».') +
    sGrp('', [sRow({ act: 'go', attrs: 'data-h="#/t/msgtpl"', icon: 'mail', color: '#2F80ED', label: 'قوالب الرسائل', val: 'تشجيع · تقدير · توصية' }),
      sRow({ act: 'go', attrs: 'data-h="#/t/archive"', icon: 'archive', color: '#A2845E', label: 'الصفوف المؤرشفة' }),
      sRow({ act: 'go', attrs: 'data-h="#/t/hidden"', icon: 'users', color: '#8E8E93', label: 'الطلاب المحذوفين' }),
      sRow({ act: 'st-newyear', icon: 'refresh', color: '#FF9500', label: 'بدء سنة دراسية جديدة' })], '«سنة جديدة» يؤرشف كل صفوفك وتبقى نتائجها محفوظة.'),
    'settings', '', '#/t/settings');
}
async function tEntry(){
  const url = location.origin + location.pathname;
  view('رابط الدخول', `<div class="card col center entry-c"><div class="entry-qr" id="entry-qr"><div class="spin"></div></div><b dir="ltr" class="entry-u">${esc(url.replace(/^https?:\/\//, ''))}</b><p class="sub">يفتح الطالب الرابط أو يصوّر الرمز، ويدخل برمزه المكون من 6 خانات.</p>
    <div class="row"><button class="btn" data-act="st-share-students">${ic('share')} مشاركة</button><button class="btn soft" data-act="copy" data-v="${esc(url)}">${ic('layers')} نسخ</button></div></div>`, 'settings', '', '#/t/sset');
  try { await loadJs(QRJS, 'qrcode'); const el = document.getElementById('entry-qr'); if (el) el.innerHTML = qrSvg(url); } catch(e){ const el = document.getElementById('entry-qr'); if (el) el.innerHTML = ''; }
}

/* ---- appearance (this device) ---- */
const ACCENTS = [['#C8102E', 'أحمر'], ['#2F6FED', 'أزرق'], ['#1E9E5A', 'أخضر'], ['#7B4BD6', 'بنفسجي'], ['#E8710A', 'برتقالي'], ['#0F9BA8', 'فيروزي']];
const FONTS = [['s', 'صغير', .92], ['m', 'وسط', 1], ['l', 'كبير', 1.1]];
function tAppear(){
  const fs = LS.get('mc_fs') || 'm', vib = !!navigator.vibrate;
  view('المظهر',
    sGrp('حجم الخط', [`<div class="ap-fs"><div class="ap-demo" id="ap-demo" style="font-size:${Math.round(16 * (FONTS.find(f => f[0] === fs) || FONTS[1])[2])}px">كذا بيبان الكلام في التطبيق.</div><div class="ap-sq">${FONTS.map(f => `<button type="button" class="${fs === f[0] ? 'on' : ''}" data-act="ap-fs" data-v="${f[0]}"><b style="font-size:${Math.round(22 * f[2] * f[2])}px">أ</b><span>${f[1]}</span></button>`).join('')}</div></div>`]) +
    sGrp('', [swRow({ act: 'ap-ls', k: 'mc_tsnd', on: LS.get('mc_tsnd') === '1', label: 'الأصوات', sub: 'صوت خفيف عند الضغط' })].concat(vib ? [swRow({ act: 'ap-ls', k: 'mc_vib', on: LS.get('mc_vib') === '1', label: 'الاهتزاز', sub: 'اهتزاز خفيف عند الضغط' })] : []), 'تنحفظ على هذا الجهاز بس.'),
    'settings', '', '#/t/settings');
}
ACTS['ap-mode'] = t => { LS.set('mc_mode', t.dataset.v); applyMode(); t.parentElement.querySelectorAll('.tick').forEach(x => x.classList.toggle('on', x.parentElement === t)); haptic(); };
ACTS['ap-fs'] = t => { LS.set('mc_fs', t.dataset.v); applyLook(); t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); const f = FONTS.find(x => x[0] === t.dataset.v), d = document.getElementById('ap-demo'); if (d && f) d.style.fontSize = Math.round(16 * f[2]) + 'px'; haptic(); };
ACTS['ap-ac'] = t => { LS.set('mc_accent', t.dataset.v); applyLook(); t.parentElement.querySelectorAll('.ac-dot').forEach(b => b.classList.toggle('on', b === t)); haptic(); };
ACTS['ap-ls'] = t => { const on = !t.querySelector('.ios-sw').classList.contains('on'); LS.set(t.dataset.k, on ? '1' : '0'); t.querySelector('.ios-sw').classList.toggle('on', on); haptic(); if (on && t.dataset.k === 'mc_tsnd') tapSound(); };
function applyLook(){
  const wide = document.body.classList.contains('wide');
  const f = FONTS.find(x => x[0] === (LS.get('mc_fs') || 'm')) || FONTS[1];
  document.documentElement.style.zoom = wide && f[2] !== 1 ? f[2] : '';
  const ac = LS.get('mc_accent');
  if (false && wide && ac) { /* fixed brand colour, no picker */ document.body.style.setProperty('--primary', ac); document.body.style.setProperty('--primary-dark', ac); }
  else { document.body.style.removeProperty('--primary'); document.body.style.removeProperty('--primary-dark'); }
}
let _actx = null;
function tapSound(){ try { _actx = _actx || new (window.AudioContext || window.webkitAudioContext)(); const o = _actx.createOscillator(), g = _actx.createGain(); o.frequency.value = 1400; g.gain.setValueAtTime(.05, _actx.currentTime); g.gain.exponentialRampToValueAtTime(.0001, _actx.currentTime + .05); o.connect(g).connect(_actx.destination); o.start(); o.stop(_actx.currentTime + .06); } catch(e){} }
document.addEventListener('click', e => { if (!document.body.classList.contains('wide')) return; if (!e.target.closest('button,a,[data-act]')) return; if (LS.get('mc_tsnd') === '1') tapSound(); haptic(); }, true);

/* ---- export / archive ---- */
const EX = { scope: 'all', cls: '', comp: '', fmt: 'xlsx' };
async function tExport(){
  const [c, k] = await Promise.all([sb.from('classes').select('id,name,archived').order('created_at'), sb.from('competitions').select('id,group_id,class_id,title,status').order('created_at', { ascending: false })]);
  if (c.error) throw c.error;
  EX.classes = c.data; EX.comps = [];
  const seen = new Set(); (k.data || []).forEach(x => { if (!seen.has(x.group_id)) { seen.add(x.group_id); EX.comps.push(x); } });
  if ((EX.scope === 'cls' && !c.data.length) || (EX.scope === 'comp' && !EX.comps.length)) EX.scope = 'all';
  const radio = (v, label, extra, off) => `<button class="set-row radio" data-act="ex-scope" data-v="${v}" ${off ? 'disabled aria-disabled="true"' : ''}><span class="grow">${label}${off ? `<small class="sub" style="display:block">${off}</small>` : ''}</span><span class="tick ${EX.scope === v ? 'on' : ''}">${ic('check')}</span></button>${EX.scope === v && extra ? extra : ''}`;
  const sel = (id, list, val, lab) => `<label class="set-row"><span class="grow muted">${lab}</span><select class="ex-sel" id="${id}">${list.map(x => `<option value="${x.id}" ${val === x.id ? 'selected' : ''}>${esc(x.name || x.title)}</option>`).join('')}</select></label>`;
  view('تصدير البيانات',
    sGrp('ماذا تصدّر؟', [radio('all', 'كل البيانات'), radio('cls', 'صف معين', c.data.length ? sel('ex-cls', c.data, EX.cls, 'الصف') : '', c.data.length ? '' : 'لا توجد صفوف بعد'), radio('comp', 'مسابقة معينة', EX.comps.length ? sel('ex-comp', EX.comps, EX.comp, 'المسابقة') : '', EX.comps.length ? '' : 'لا توجد مسابقات بعد')]) +
    sGrp('الصيغة', [`<div class="set-row"><div class="tabs grow">${[['xlsx', 'Excel'], ['pdf', 'PDF']].map(f => `<button type="button" class="${EX.fmt === f[0] ? 'on' : ''}" data-act="ex-fmt" data-v="${f[0]}">${f[1]}</button>`).join('')}</div></div>`], 'PDF يفتح نافذة الطباعة، واختر «حفظ PDF».') +
    `<button class="btn" data-act="ex-go">${ic('download')} تصدير</button>`, 'settings', '', '#/t/sg/app');
}
ACTS['ex-scope'] = t => { EX.scope = t.dataset.v; rerender(); };
ACTS['ex-fmt'] = t => { EX.fmt = t.dataset.v; t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); };
ACTS['ex-go'] = async () => {
  const cs = document.getElementById('ex-cls'), ks = document.getElementById('ex-comp'); if (cs) EX.cls = cs.value; if (ks) EX.comp = ks.value;
  let classes = EX.classes.filter(c => !c.archived), title = 'كل البيانات';
  if (EX.scope === 'cls') { classes = EX.classes.filter(c => c.id === (EX.cls || (EX.classes[0] || {}).id)); title = (classes[0] || {}).name || ''; }
  if (EX.scope === 'comp') { const k = EX.comps.find(x => x.id === (EX.comp || (EX.comps[0] || {}).id)); if (!k) return toast('ما فيه مسابقات'); const { data } = await sb.from('competitions').select('class_id').eq('group_id', k.group_id); const ids = new Set((data || []).map(x => x.class_id)); classes = EX.classes.filter(c => ids.has(c.id)); title = k.title; }
  if (!classes.length) return toast('ما فيه صفوف للتصدير');
  toast('جارٍ تجهيز الملف...');
  try {
    const s = await sb.from('students').select('*').in('class_id', classes.map(c => c.id)).order('created_at'); if (s.error) throw s.error;
    const res = await Promise.all(classes.map(x => rpc('teacher_class_results', { p_class: x.id }).catch(() => [])));
    const byId = {}; classes.forEach(x => byId[x.id] = x.name);
    const stu = [['الصف', 'الاسم', 'رقم الطالب', 'الرمز']].concat(s.data.map(x => [byId[x.class_id], x.name, x.student_no, x.code]));
    const rs = [['الصف', 'الاسم', 'رقم الطالب', 'النقاط', 'الجولات', 'الصحيحة']].concat(res.flatMap((r, i) => r.slice().sort((a, b) => b.pts - a.pts).map(x => [classes[i].name, x.name, x.student_no, x.pts, x.rounds, x.correct])));
    if (EX.fmt === 'pdf') return printTables(title, [['النتائج', rs], ['الطلبة', stu.map(r => r.slice(0, 3))]]);
    await XL();
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(stu), 'الطلبة');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rs), 'النتائج');
    XLSX.writeFile(wb, 'تحدي-الدقيقة-' + title.replace(/[\\\/?*\[\]:]/g, '-').slice(0, 40) + '.xlsx');
  } catch(e){ toast(errMsg(e)); }
};
function printTables(title, tables){
  let pa = document.getElementById('print-area'); if (!pa) { pa = document.createElement('div'); pa.id = 'print-area'; document.body.appendChild(pa); }
  pa.innerHTML = `<div class="pt-doc"><h2>اهزم الدقيقة · ${esc(title)}</h2>${tables.map(t => `<h3>${esc(t[0])}</h3><table class="pt"><thead><tr>${t[1][0].map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${t[1].slice(1).map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('')}</div>`;
  setTimeout(() => window.print(), 50);
}
async function tArchive(){
  const { data, error } = await sb.from('classes').select('id,name').eq('archived', true).order('created_at'); if (error) throw error;
  view('الصفوف المؤرشفة', data.length ? sGrp('', data.map(c => `<div class="set-row"><span class="grow">${esc(c.name)}</span><button class="btn sm soft" data-act="ar-restore" data-id="${c.id}">استرجاع</button></div>`), 'الصفوف المؤرشفة ما تظهر بالقوائم، وبياناتها محفوظة.')
    : `<div class="cl-empty sm"><b>ما فيه صفوف مؤرشفة</b><small>تقدر تؤرشف صف من قائمة الصفوف، أو تبدأ سنة جديدة من الإعدادات.</small></div>`, 'settings', '', '#/t/sset');
}
ACTS['ar-restore'] = async t => { const { error } = await sb.from('classes').update({ archived: false }).eq('id', t.dataset.id); if (error) return toast(errMsg(error)); toast('تم الاسترجاع'); rerender(); };

/* ---- messages: templates + sending ---- */
const MSG_K = { encourage: ['تشجيع', '#2F80ED', '💪'], praise: ['تقدير', '#E0A100', '🌟'], advice: ['توصية', '#1FA971', '💡'] };
const MSG_DEF = {
  encourage: ['يا {الاسم}، أنت قادر على الأفضل! جرّب جولة اليوم وخلّنا نشوف إبداعك 💪', 'بداية حلوة يا {الاسم}، استمر وكل يوم بتتحسن أكثر'],
  praise: ['أحسنت يا {الاسم}! جمعت {النقاط} نقطة وترتيبك {الترتيب} في الصف 🌟', 'فخور فيك يا {الاسم}، أداؤك مميز في المسابقة 👏'],
  advice: ['يا {الاسم}، راجع أخطاءك من «تدرّب على أخطائك» قبل الجولة القادمة', 'يا {الاسم}، اقرأ السؤال كامل قبل ما تختار، الدقة أهم من السرعة']
};
const tplList = k => (((T.settings || {}).msg_tpl || {})[k]) || MSG_DEF[k];
const fillTpl = (s, st) => s.replace(/\{الاسم\}/g, fmtStu(st.name, 'first')).replace(/\{النقاط\}/g, st.pts != null ? st.pts : 0).replace(/\{الترتيب\}/g, st.rank || '—').replace(/\{الصف\}/g, st.cls || '');
function tMsgTpl(){
  view('قوالب الرسائل', Object.keys(MSG_K).map(k => sGrp(MSG_K[k][2] + ' ' + MSG_K[k][0], tplList(k).map((s, i) => sRow({ act: 'mt-edit', attrs: `data-k="${k}" data-i="${i}"`, label: `<span class="mt-txt">${esc(s)}</span>` }))
      .concat(`<button class="set-row" data-act="mt-edit" data-k="${k}" data-i="-1"><span class="set-ic" style="background:#34C759">${ic('plus')}</span><span class="grow" style="color:var(--primary)">إضافة قالب</span></button>`))).join('') +
    sGrp('تلقائي', [swRow({ k: 'msg_auto', label: 'تقدير تلقائي للثلاثة الأوائل', sub: 'يوصلهم أول قالب تقدير لما تنتهي المسابقة' })],
      'تقدر تستخدم بالقوالب: {الاسم} و{النقاط} و{الترتيب} و{الصف}، وتتعبى تلقائياً لكل طالب.'), 'settings', '', '#/t/sset');
}
ACTS['mt-edit'] = t => {
  const k = t.dataset.k, i = Number(t.dataset.i), s = i >= 0 ? tplList(k)[i] : '';
  modal(`<h3>${i >= 0 ? 'تعديل قالب' : 'قالب جديد'} · ${MSG_K[k][0]}</h3><form class="col" data-form="mt-save" data-k="${k}" data-i="${i}"><textarea class="input" name="b" rows="4" maxlength="500" required>${esc(s)}</textarea>
    <div class="lv-chips">${['{الاسم}', '{النقاط}', '{الترتيب}', '{الصف}'].map(x => `<button type="button" data-act="mt-ins" data-v="${x}">${x}</button>`).join('')}</div>
    <button class="btn" type="submit">حفظ</button>${i >= 0 ? `<button type="button" class="btn soft dng-t" data-act="mt-del" data-k="${k}" data-i="${i}">${ic('trash')} حذف القالب</button>` : ''}</form>`);
};
ACTS['mt-ins'] = t => { const ta = t.closest('form').querySelector('textarea'), p = ta.selectionStart || ta.value.length; ta.value = ta.value.slice(0, p) + t.dataset.v + ta.value.slice(p); ta.focus(); };
async function saveTpl(k, list){ const all = Object.assign({}, (T.settings || {}).msg_tpl || {}); all[k] = list; await saveSettings({ msg_tpl: all }); }
ACTS['mt-save'] = async f => { const k = f.dataset.k, i = Number(f.dataset.i), l = tplList(k).slice(), v = f.b.value.trim(); if (!v) return; if (i >= 0) l[i] = v; else l.push(v); await saveTpl(k, l); closeModals(); rerender(); };
ACTS['mt-del'] = async t => { const k = t.dataset.k, l = tplList(k).slice(), i = Number(t.dataset.i);
  if (!await ask('سيُحذف هذا القالب من رسائلك الجاهزة. الرسائل المرسلة سابقاً لا تتأثر.', { title: 'حذف القالب؟', ok: 'حذف', danger: true, safe: true })) return;
  l.splice(i, 1);
  try { await saveTpl(k, l); } catch(e){ return toast('تعذّر حذف القالب. حاول مجدداً'); }
  closeModals(); rerender(); toast('تم حذف القالب'); };
const MS = { to: [], kind: 'encourage', i: 0 };
function msgSend(students){
  if (!students.length) return toast('حدد طالب واحد على الأقل');
  Object.assign(MS, { to: students, kind: MS.kind || 'encourage', i: -1, draft: '', dirty: false }); closeModals(); modal(msgHtml());
}
/* recipients and text first; ready-made templates are optional and never wipe a typed draft silently */
function msgHtml(){
  const one = MS.to.length === 1, l = tplList(MS.kind);
  const names = MS.to.slice(0, 4).map(x => esc(fmtStu(x.name))).join('، ') + (MS.to.length > 4 ? ` و${MS.to.length - 4} آخرين` : '');
  return `<div class="msg-s"><h3>${ic('mail')} رسالة للطلبة</h3>
    <div class="ms-to"><span class="sub">إلى:</span> <b>${names}</b></div>
    <form class="col" data-form="ms-send"><label class="sr-only" for="ms-b">نص الرسالة</label><textarea class="input" id="ms-b" name="b" rows="4" maxlength="600" required placeholder="اكتب رسالتك…">${esc(MS.draft)}</textarea>
    ${one ? '' : '<small class="sub">{الاسم} و{النقاط} و{الترتيب} تتعبى لكل طالب.</small>'}
    <div class="tabs">${Object.keys(MSG_K).map(k => `<button type="button" class="${MS.kind === k ? 'on' : ''}" data-act="ms-kind" data-v="${k}">${MSG_K[k][2]} ${MSG_K[k][0]}</button>`).join('')}</div>
    <details class="ms-ready"${MS.draft ? '' : ' open'}><summary>استخدم رسالة جاهزة</summary><div class="ms-tpls">${l.map((s, i) => `<button type="button" class="ms-tpl${MS.i === i ? ' on' : ''}" data-act="ms-tpl" data-i="${i}">${esc(one ? fillTpl(s, MS.to[0]) : s)}</button>`).join('') || '<p class="sub">لا توجد رسائل جاهزة لهذا النوع.</p>'}</div></details>
    <button class="btn" type="submit">${ic('send')} إرسال${one ? '' : ' إلى ' + MS.to.length}</button></form></div>`;
}
document.addEventListener('input', e => { if (e.target.id === 'ms-b') { MS.draft = e.target.value; MS.dirty = true; } });
function msRerender(){ const m = document.querySelector('.msg-s'); if (m) m.outerHTML = msgHtml(); }
ACTS['ms-kind'] = t => { MS.kind = t.dataset.v; MS.i = -1; msRerender(); };
ACTS['ms-tpl'] = async t => {
  const i = Number(t.dataset.i), tpl = tplList(MS.kind)[i] || '', txt = MS.to.length === 1 ? fillTpl(tpl, MS.to[0]) : tpl;
  if (MS.dirty && MS.draft.trim() && MS.draft !== txt && !await ask('سيُستبدل النص الذي كتبته بالرسالة الجاهزة.', { title: 'استبدال المسودة؟', ok: 'استبدال', cancel: 'إبقاء نصي', danger: false, safe: true })) return;
  MS.i = i; MS.draft = txt; MS.dirty = false; msRerender();
};
ACTS['ms-send'] = async f => {
  const b = f.b.value.trim(); if (!b) return;
  const rows = MS.to.map(s => ({ student_id: s.id, kind: MS.kind, body: MS.to.length === 1 ? b : fillTpl(b, s) }));
  const btn = f.querySelector('button[type=submit]'); if (btn.disabled) return; const lbl = btn.innerHTML; btn.disabled = true; btn.textContent = 'جارٍ الإرسال…';
  const { error } = await sb.from('messages').insert(rows); btn.disabled = false; btn.innerHTML = lbl;
  if (error) return toast(/relation|does not exist|schema cache/i.test(error.message || '') ? 'ميزة الرسائل غير مفعّلة بعد. تواصل مع الدعم' : 'تعذّر الإرسال، تأكد من الاتصال وحاول مجدداً. نصك محفوظ.');
  MS.draft = ''; closeModals(); toast(MS.to.length === 1 ? 'أُرسلت الرسالة ✓ تظهر للطالب في جرس الرسائل' : `أُرسلت إلى ${MS.to.length} طالب/ـة ✓ تظهر لهم في جرس الرسائل`);
};
async function autoPraise(classId, compId, rows){
  try {
    if (!SG('msg_auto') || !compId) return;
    const done = (T.settings || {}).msg_done || []; if (done.includes(compId)) return;
    const top = rows.filter(r => r.pts > 0 && r.id).sort((a, b) => (a.r || 99) - (b.r || 99) || b.pts - a.pts).slice(0, 3);
    if (!top.length) return;
    const tpl = tplList('praise')[0] || MSG_DEF.praise[0];
    const { error } = await sb.from('messages').insert(top.map((r, i) => ({ student_id: r.id, kind: 'praise', body: fillTpl(tpl, { name: r.name, pts: r.pts, rank: r.r || i + 1, cls: r.cls }) })));
    if (error) return;
    await saveSettings({ msg_done: done.concat(compId).slice(-200) }); toast('وصل التقدير للثلاثة الأوائل 🌟');
  } catch(e){}
}

/* ---- settings ---- */
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
    <div class="set-grp" style="width:100%"><button class="set-row" data-act="st-pass"><span class="set-ic" style="background:#8E8E93">${ic('gear')}</span><span class="grow">تغيير كلمة المرور</span><span class="set-chev">${ic('back')}</span></button></div>
    <input type="file" id="av-file" accept="image/*" class="hide" data-change="av-chosen"></div>`);
}
ACTS['st-profile'] = () => go('#/t/account');
/* profile icon menu (every teacher screen) */
ACTS['t-menu'] = () => {
  const it = (act, icon, color, label, attrs) => `<button class="sheet-i" data-act="${act}" ${attrs || ''}><span class="set-ic" style="background:${color}">${ic(icon)}</span><span class="grow">${label}</span></button>`;
  modal(`<div class="sheet t-menu">
    <button class="sheet-list tm-head" data-act="tm-go" data-a="st-profile">${avatarHtml('big-av')}<div class="grow"><b>${esc(T.name)}</b><div class="sub">حسابي · <span dir="ltr">${esc((T.user && T.user.email) || '')}</span></div></div><span class="set-chev">${ic('back')}</span></button>
    <div class="st1-opts tm-sq"><button class="st1-o" data-act="tm-go" data-a="tm-settings"><span class="e">⚙️</span><b>الإعدادات</b></button><button class="st1-o dng" data-act="tm-go" data-a="st-logout-ask"><span class="e">🚪</span><b>تسجيل الخروج</b></button></div></div>`);
};
ACTS['tm-go'] = t => { const a = t.dataset.a; closeModals(); setTimeout(() => ACTS[a](t), 30); };
ACTS['tm-settings'] = () => go('#/t/settings');
ACTS['go-qset'] = () => go('#/t/qset');
ACTS['go-rset'] = () => go('#/t/rset');
ACTS['rs-pick'] = async t => {
  await saveSettings({ [t.dataset.k]: t.dataset.v });
  t.parentElement.querySelectorAll('.tick').forEach(x => x.classList.toggle('on', x.parentElement === t));
};
/* ---- question settings: curricula library + defaults ---- */
const STAGE_AR = { primary: 'ابتدائي', middle: 'متوسط', secondary: 'ثانوي', university: 'جامعة' };
const STAGE_GRADES = { primary: [1, 2, 3, 4, 5], middle: [6, 7, 8, 9], secondary: [10, 11, 12], university: [1, 2, 3, 4] };
const DIFF = [['beginner', 'مبتدئ', '2 سهل · 2 متوسط'], ['normal', 'متوسط', '1 سهل · 2 متوسط · 1 صعب'], ['advanced', 'متقدم', '2 متوسط · 2 صعب'], ['adaptive', 'حسب مستوى الطالب', 'تتغير الأسئلة حسب أداء كل طالب']];
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
function SUBJ_COLOR(s){ const m = { 'اللغة العربية': '#C8102E', 'الرياضيات': '#2F80ED', 'العلوم': '#14A89B', 'التربية الإسلامية': '#1FA971', 'اللغة الإنجليزية': '#9B51E0', 'الاجتماعيات': '#F2994A', 'الحاسوب': '#5856D6' }; return m[s] || '#8E8E93'; }
async function saveSettings(patch){
  T.settings = Object.assign({}, T.settings || {}, patch);
  const { error } = await sb.from('teachers').update({ settings: T.settings }).eq('id', T.user.id);
  if (error) toast(errMsg(error));
}
function cuForm(c){
  c = c || { subject: '', stage: 'primary', grade: null, title: '' }; CU.form = { stage: c.stage, grade: c.grade, subject: c.subject };
  const subjOpts = SUBJECTS.filter(s => s !== 'عام' && s !== 'أخرى');
  const custom = c.subject && !subjOpts.includes(c.subject);
  if (CU.fromQ && !c.id) return modal(cuNewQ(subjOpts));
  modal(`<h3>${c.id ? 'تعديل منهج' : CU.fromQ ? 'مادة جديدة' : 'منهج جديد'}</h3><form class="col" data-form="cu-save" data-id="${c.id || ''}">
    <div class="field"><label>المادة</label><div class="lv-chips wrap">${subjOpts.map(s => `<button type="button" class="${c.subject === s ? 'on' : ''}" data-act="cu-subj" data-v="${s}">${s}</button>`).join('')}<button type="button" class="${custom ? 'on' : ''}" data-act="cu-subj" data-v="">أخرى…</button></div>
      <input class="input ${custom ? '' : 'hide'}" id="cu-custom" name="custom" placeholder="اسم المادة" value="${custom ? esc(c.subject) : ''}" maxlength="60"></div>
    <div class="field"><label>المرحلة</label><div class="tabs" id="cu-stage">${Object.keys(STAGE_AR).map(k => `<button type="button" class="${c.stage === k ? 'on' : ''}" data-act="cu-stage" data-v="${k}">${STAGE_AR[k]}</button>`).join('')}</div></div>
    <div class="field"><label>${c.stage === 'university' ? 'السنة' : 'الصف'}</label><div class="lv-chips wrap" id="cu-grade">${cuGrades(c.stage, c.grade)}</div></div>
    <div class="field${CU.fromQ ? ' hide' : ''}"><label for="cu-t">الوحدة أو العنوان (اختياري)</label><input class="input" id="cu-t" name="title" value="${esc(c.title || '')}" maxlength="80" placeholder="مثال: الوحدة الثالثة - الكسور"></div>
    <button class="btn" type="submit">حفظ</button>
    ${c.id ? `<button type="button" class="btn danger" data-act="cu-del" data-id="${c.id}">${ic('trash')} حذف المنهج</button>` : ''}</form>`);
}
function cuGrades(stage, sel){ return `<button type="button" class="${!sel ? 'on' : ''}" data-act="cu-grade" data-v="">الكل</button>` + STAGE_GRADES[stage].map(g => `<button type="button" class="${sel === g ? 'on' : ''}" data-act="cu-grade" data-v="${g}">${g}</button>`).join(''); }
ACTS['cu-add'] = () => { CU.fromQ = false; cuForm(); };
ACTS['q5-newsubj'] = async () => { const r = await sb.from('classes').select('name,stage,archived'); CU.cls = (r.data || []).filter(c => !c.archived); CU.fromQ = true; cuForm(); };
// v145: «مادة جديدة» from the questions page shows only the teacher's subjects and the grades of his classes
function cuClassGrades(){
  const out = [], seen = new Set();
  (CU.cls || []).forEach(c => {
    const n = String(c.name || ''); let g = null;
    for (let i = GRADES.length - 1; i >= 0 && g == null; i--) if (n.includes(GRADES[i].replace(/^ال/, ''))) g = i + 1;
    if (g == null) { const d = n.replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x)).match(/\d+/); if (d) g = +d[0]; }
    const st = c.stage || 'primary', k = st + '|' + (g || ''); if (seen.has(k)) return; seen.add(k);
    out.push({ st, g, lb: g && GRADES[g - 1] ? 'الصف ' + GRADES[g - 1] : c.name });
  });
  return out.sort((a, b) => (a.g || 0) - (b.g || 0));
}
function cuNewQ(subjOpts){
  const mine = mySubjects().filter(x => subjOpts.includes(x)), gs = cuClassGrades();
  if (gs[0]) Object.assign(CU.form, { stage: gs[0].st, grade: gs[0].g }); if (mine.length === 1) CU.form.subject = mine[0];
  const chip = (s, on) => `<button type="button" class="${on ? 'on' : ''}" data-act="cu-subj" data-v="${s}">${s}</button>`;
  const subj = mine.length ? mine.map(s => chip(s, CU.form.subject === s)).join('') + `<button type="button" class="cu-more" data-act="cu-more">غيرها…</button><span class="cu-rest hide">${subjOpts.filter(s => !mine.includes(s)).map(s => chip(s)).join('')}${chip('').replace('></button>', '>أخرى…</button>')}</span>` : subjOpts.map(s => chip(s)).join('') + chip('').replace('></button>', '>أخرى…</button>');
  return `<h3>مادة جديدة</h3><form class="col" data-form="cu-save" data-id="">
    <div class="field"><label>المادة</label><div class="lv-chips wrap">${subj}</div><input class="input hide" id="cu-custom" name="custom" placeholder="اسم المادة" maxlength="60"></div>
    <div class="field"><label>الصف</label>${gs.length ? `<div class="lv-chips wrap">${gs.map((x, i) => `<button type="button" class="${i ? '' : 'on'}" data-act="cu-cg" data-s="${x.st}" data-g="${x.g || ''}">${esc(x.lb)}</button>`).join('')}<button type="button" data-act="t-add-class">＋ صف جديد</button></div>` : `<p class="p3-note">ما عندك صفوف للحين. ضيف صفك أول، وبعدها ارجع هني.</p><button type="button" class="btn soft" data-act="t-add-class">＋ ضيف صف</button>`}</div>
    <input type="hidden" name="title" value="">
    ${gs.length ? '<button class="btn" type="submit">حفظ</button>' : ''}</form>`;
}
ACTS['cu-more'] = t => { t.classList.add('hide'); t.parentElement.querySelector('.cu-rest').classList.remove('hide'); };
ACTS['cu-cg'] = t => { CU.form.stage = t.dataset.s; CU.form.grade = t.dataset.g ? +t.dataset.g : null; t.parentElement.querySelectorAll('[data-act=cu-cg]').forEach(b => b.classList.toggle('on', b === t)); };
ACTS['cu-open'] = t => { const c = CU.list.find(x => x.id === t.dataset.id); if (!c) return; if (!c.owner_id) return toast('هذا منهج عام، يمكنك استخدامه في المسابقات'); cuForm(c); };
ACTS['cu-subj'] = t => { CU.form.subject = t.dataset.v; t.closest('.lv-chips').querySelectorAll('[data-act=cu-subj]').forEach(b => b.classList.toggle('on', b === t)); document.getElementById('cu-custom').classList.toggle('hide', t.dataset.v !== ''); if (!t.dataset.v) document.getElementById('cu-custom').focus(); };
ACTS['cu-stage'] = t => { CU.form.stage = t.dataset.v; CU.form.grade = null; t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); document.getElementById('cu-grade').innerHTML = cuGrades(t.dataset.v, null); };
ACTS['cu-grade'] = t => { CU.form.grade = t.dataset.v ? Number(t.dataset.v) : null; t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); };
ACTS['cu-save'] = async f => {
  const subject = (CU.form.subject || f.custom.value || '').trim();
  if (!subject) return toast('اختر المادة');
  const row = { subject, stage: CU.form.stage, grade: CU.form.grade, title: f.title.value.trim() || null };
  if (CU.fromQ && !f.dataset.id) { const ex = CU.list.find(k => k.subject === subject && k.stage === row.stage && (k.grade || null) === (row.grade || null) && (!k.owner_id || k.owner_id === T.user.id)); if (ex) { closeModals(); CU.fromQ = false; QS.newCu = ex.id; QS.subjCu = ex.id; QS.ed4 = true; await tQuestions(); QS.subjCu = ex.id; return q4SubjSheet(subject); } }
  const r = f.dataset.id ? await sb.from('curricula').update(row).eq('id', f.dataset.id) : await sb.from('curricula').insert(Object.assign({ owner_id: T.user.id }, row));
  if (r.error) return toast(errMsg(r.error));
  closeModals(); toast('تم الحفظ');
  if (CU.fromQ && !f.dataset.id) { CU.fromQ = false; await tQuestions(); QS.subjCu = null; QS.ed4 = true; const nc = CU.list.find(k => k.owner_id === T.user.id && k.subject === subject && k.stage === row.stage && (k.grade || null) === (row.grade || null)); QS.newCu = nc && nc.id; const x = q4Subjects().find(y => y.s === subject); if (x) { const c = x.cus.find(k => k.owner_id && k.stage === row.stage && (k.grade || null) === (row.grade || null)); QS.subjCu = c ? c.id : null; q4SubjSheet(subject); } return; }
  CU.fromQ = false; await tQSet();
};
ACTS['cu-del'] = async t => {
  if (!await ask('حذف المنهج؟ تبقى أسئلته موجودة لكن بدون منهج.')) return;
  const { error } = await sb.from('curricula').delete().eq('id', t.dataset.id);
  if (error) return toast(errMsg(error)); closeModals(); await tQSet();
};
ACTS['st-mode'] = () => modal(`<h3>المظهر</h3>${modeSeg()}<p class="sub" style="margin-top:10px">«تلقائي» يتبع إعداد جهازك.</p>`);
function avFile(){ let i = document.getElementById('av-file'); if (!i) { i = document.createElement('input'); i.type = 'file'; i.id = 'av-file'; i.accept = 'image/*'; i.className = 'hide'; i.dataset.change = 'av-chosen'; document.body.appendChild(i); } i.value = ''; return i; }
ACTS['av-menu'] = () => {
  if (!T.avatar) return avFile().click();
  sheet('صورة الملف', [
    { act: 'av-pick', icon: 'upload', label: 'اختيار صورة جديدة' },
    { act: 'av-recrop', icon: 'edit', label: 'قص الصورة الحالية' },
    null,
    { act: 'av-del', icon: 'trash', label: 'حذف الصورة', danger: true }
  ]);
};
ACTS['av-pick'] = () => { closeModals(); avFile().click(); };
ACTS['av-recrop'] = () => { closeModals(); cropper(T.avatar); };
ACTS['av-del'] = async () => {
  if (!await ask('حذف صورة الملف؟')) return;
  const { error } = await sb.from('teachers').update({ avatar_url: null }).eq('id', T.user.id);
  if (error) return toast(errMsg(error));
  T.avatar = ''; closeModals(); rerender(); toast('تم حذف الصورة');
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
  T.avatar = url; closeModals(); rerender(); toast('تم حفظ الصورة');
};
ACTS['st-name'] = () => modal(`<h3>الاسم</h3><form class="col" data-form="t-save-name"><div class="field"><input class="input" name="name" value="${esc(T.name)}" required maxlength="60"></div><p class="sub">يظهر هذا الاسم للطلبة في صفحة التسجيل عبر الرابط.</p><button class="btn" type="submit">حفظ</button></form>`);
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
ACTS['st-share-students'] = () => shareOrCopy('اهزم الدقيقة', 'ادخل إلى «اهزم الدقيقة» برمزك:', location.origin + location.pathname);
ACTS['st-invite'] = () => shareOrCopy('اهزم الدقيقة', 'جرّب «اهزم الدقيقة»: مسابقات صفية ممتعة لطلابك، 4 أسئلة في 60 ثانية. سجّل مجاناً:', location.origin + location.pathname + '#/t');
ACTS['st-install'] = () => modal(`<h3>تثبيت التطبيق</h3><div class="col"><div class="set-grp">
  <div class="set-row"><span class="set-ic" style="background:#2F80ED">1</span><span class="grow">افتح الرابط في Safari</span></div>
  <div class="set-row"><span class="set-ic" style="background:#2F80ED">2</span><span class="grow">اضغط زر المشاركة ⬆︎</span></div>
  <div class="set-row"><span class="set-ic" style="background:#2F80ED">3</span><span class="grow">اختر «إضافة إلى الشاشة الرئيسية»</span></div></div>
  <p class="sub">في أندرويد: من قائمة Chrome ⋮ اختر «تثبيت التطبيق». يتحدّث التطبيق تلقائياً بعد التثبيت.</p></div>`);
ACTS['st-privacy'] = () => modal(`<h3>الخصوصية</h3><div class="col"><p>نحفظ فقط اسم الطالب ورقمه ونتائجه داخل المسابقة ورقم الهاتف إن أضفته لإرسال الرمز عبر واتساب. لا نجمع بريداً أو صوراً للطلبة.</p><p>يمكنك حذف أي طالب أو صف في أي وقت، فتُحذف بياناته ونتائجه نهائياً.</p><p class="sub">بيانات كل معلم/ـة لا يراها غيره.</p><a class="btn soft" href="privacy.html" target="_blank" rel="noopener">سياسة الخصوصية كاملة</a></div>`);
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
  T.name = name; closeModals(); toast('تم الحفظ'); if (/settings|account/.test(location.hash)) rerender();
};

/* ======================================================
   ROUTER
   ====================================================== */
const JN = {};
/* codes typed on an Arabic keyboard: Arabic-Indic digits → 0-9, drop spaces/marks */
function normPhone(v){ let p = String(v || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[^0-9+]/g, ''); if (p.startsWith('00')) p = '+' + p.slice(2); if (/^\d{8}$/.test(p)) p = '+965' + p; return p.slice(0, 20); }
function normCode(v){ return String(v || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[^A-Za-z0-9]/g, '').toUpperCase(); }
async function studentJoin(code){
  code = normCode(code);
  document.body.classList.remove('wide');
  $app.innerHTML = '<div class="spin"></div>';
  try {
    const info = await rpc('class_join_info', { p_join: code });
    setTheme(info.style || 'mid'); LS.set('mc_theme', info.style || 'mid');
    Object.assign(JN, { code, info, first: '', fam: '' });
    jnRender((info.names || []).some(n => !n.taken) ? 'list' : 'form');
  } catch(e){
    // not a class code: maybe the student's personal code typed in «انضم» → normal login
    if (/invalid_join/.test((e && e.message) || '') && code.length === 6) { location.hash = '#/c/' + code; return; }
    $app.innerHTML = `<div class="hero">${LOGO}<h1>اهزم الدقيقة</h1></div><div class="pad"><div class="err">${esc(errMsg(e))}</div><button class="btn" data-act="go-student" style="margin-top:14px">رجوع</button></div>`;
  }
}
function jnRender(step){
  JN.step = step;
  const i = JN.info, head = `<div class="hero jn-h">${LOGO}<p>صف <b>${esc(i.class)}</b>${i.teacher ? ' · ' + esc(i.teacher) : ''}</p></div>`;
  let b = '';
  if (step === 'list') b = `<div class="card col"><b class="jn-q">اختر اسمك</b><div class="jn-names">${i.names.map(n => `<button class="jn-n${n.taken ? ' off' : ''}" data-act="${n.taken ? 'jn-locked' : 'jn-pick'}" data-id="${n.id}">${esc(n.name)}${n.taken ? ' 🔒' : ''}</button>`).join('')}</div>
    <button class="link" data-act="jn-form">اسمي مو موجود ‹</button></div>`;
  else if (step === 'form') b = `<form class="card col" data-form="jn-next"><b class="jn-q">اسمك؟</b>
    <div class="field"><label for="jn-f">اسمك الأول</label><input class="input jn-in" id="jn-f" name="first" required maxlength="25" autocomplete="off" value="${esc(JN.first)}"></div>
    <div class="field"><label for="jn-l">اسم العائلة</label><input class="input jn-in" id="jn-l" name="fam" required maxlength="25" autocomplete="off" value="${esc(JN.fam)}"></div>
    <div id="jerr"></div><button class="btn" type="submit">التالي</button></form>`;
  else if (step === 'confirm') b = `<div class="card col center"><p class="sub">اسمك:</p><div class="jn-name">${esc(JN.name)}</div><b class="jn-q">صح؟</b>
    <div id="jerr"></div><button class="btn" data-act="jn-go">نعم صح ✓</button><button class="btn soft" data-act="${JN.pick ? 'jn-list' : 'jn-form'}">لا، أعدّل</button></div>`;
  $app.innerHTML = head + '<div class="pad col">' + b + '</div>';
  $app.querySelectorAll('.jn-in').forEach(el => el.addEventListener('input', () => { const raw = el.value.replace(/ک/g, 'ك').replace(/[یى](?=\S)/g, 'ي').replace(/ی/g, 'ى'), lat = /[A-Za-z]/.test(raw), v = raw.replace(/[^ء-ي ]/g, '').replace(/\s{2,}/g, ' '); if (v !== el.value) el.value = v;
    let h = el.parentNode.querySelector('.jn-hint'); if (lat && !h) { h = document.createElement('div'); h.className = 'jn-hint'; h.textContent = 'اكتب اسمك بالعربي (غيّر لوحة المفاتيح 🌐)'; el.after(h); } else if (!lat && h && v) h.remove(); }));
  const f = document.getElementById('jn-f'); if (f && !f.value) setTimeout(() => f.focus(), 60);
}
ACTS['jn-locked'] = t => { const n = JN.info.names.find(x => x.id === t.dataset.id); if (!n) return; JN.lock = n;
  modal(`<form class="col" data-form="jn-unlock"><h3>هذا اسمك؟</h3><p class="sub">«${esc(n.name)}» دخل من جهاز ثاني. اكتب رمزك الخاص عشان تدخل من هذا الجهاز.</p>
    <input class="input jn-code" name="code" maxlength="6" autocomplete="off" autocapitalize="characters" dir="ltr" placeholder="ABC123" required>
    <div id="jlerr"></div><button class="btn" type="submit">ادخل</button>
    <p class="sub center">ما تعرف رمزك؟ اسأل معلمك، يلقاه في صفحة الصف عند اسمك.</p></form>`);
  setTimeout(() => { const i = document.querySelector('.jn-code'); if (i) i.focus(); }, 60); };
ACTS['jn-unlock'] = async f => { const code = f.code.value.toUpperCase().replace(/[^A-Z0-9]/g, ''), box = document.getElementById('jlerr'), btn = f.querySelector('[type=submit]');
  if (code.length < 6) { box.innerHTML = '<div class="err">اكتب الرمز كامل (6 خانات)</div>'; return; }
  btn.disabled = true;
  try { const r = await rpc('student_login', { p_code: code });
    if (!r.student || r.student.id !== JN.lock.id) { box.innerHTML = '<div class="err" role="alert">هذا الرمز مو لهذا الاسم</div>'; btn.disabled = false; return; }
    closeModals(); profAdd({ token: r.token, name: r.student.name, cls: r.class && r.class.name, code }); history.replaceState(null, '', '#/s'); loadHome();
  } catch(e){ box.innerHTML = '<div class="err" role="alert">' + esc(errMsg(e)) + '</div>'; btn.disabled = false; } };
ACTS['jn-form'] = () => { JN.pick = null; jnRender('form'); };
ACTS['jn-list'] = () => { JN.pick = null; jnRender('list'); };
ACTS['jn-pick'] = t => { const n = JN.info.names.find(x => x.id === t.dataset.id); if (!n) return; JN.pick = n.id; JN.name = n.name; jnRender('confirm'); };
ACTS['jn-next'] = f => {
  JN.first = f.first.value.trim(); JN.fam = f.fam.value.trim();
  const box = document.getElementById('jerr');
  if (JN.first.length < 2 || JN.fam.length < 2) { box.innerHTML = '<div class="err" role="alert">اكتب اسمك الأول واسم العائلة</div>'; return; }
  JN.pick = null; JN.name = JN.first + ' ' + JN.fam; jnRender('confirm');
};
ACTS['jn-go'] = async t => {
  if (t.disabled) return; t.disabled = true; t.textContent = 'لحظة…';
  try {
    const r = await rpc('student_join', { p_join: JN.code, p_name: JN.pick ? null : JN.name, p_student: JN.pick || null, p_device: devId() });
    profAdd({ token: r.token, name: r.student.name, cls: r.class.name, code: r.code });
    history.replaceState(null, '', '#/s'); loadHome();
  } catch(e){ const box = document.getElementById('jerr'); if (box) box.innerHTML = '<div class="err" role="alert">' + esc(errMsg(e)) + '</div>'; t.disabled = false; t.textContent = 'نعم صح ✓'; }
};
ACTS['j-go'] = () => { location.hash = '#/s'; };

function studentRoute(){
  document.body.classList.remove('wide');
  if (S.token) return loadHome();
  if (profs().length) return studentLogin();
  // a signed-in teacher with no student on this device goes straight to his home
  sb.auth.getSession().then(r => { if (r && r.data && r.data.session && !S.token && /^#\/s?$|^$/.test(location.hash)) location.hash = '#/t'; else if (!S.token) studentLogin(); }, () => studentLogin());
}
function route(){
  setTimeout(applyMode, 0);
  const h = location.hash || '#/s';
  if (h.indexOf('#/p/') !== 0) pvClose(false);
  if (/access_token=|error_description=|type=recovery/.test(h)) return authReturn();
  if (h === '#/t/ob') { history.replaceState(null, '', '#/t/home'); if (T.name) setTimeout(() => obStart(true), 300); else OB.want = 1; teacherRoute(); return; }
  if (h.indexOf('#/t') === 0) teacherRoute();
  else if (h.indexOf('#/j/') === 0) studentJoin(decodeURIComponent(h.slice(4)));
  else if (h.indexOf('#/p/') === 0) { if (window.top !== window) document.documentElement.classList.add('embed'); else pvClose(true); demoStart(h.slice(4)); }
  else if (h.indexOf('#/w/') === 0 || h === '#/w') shLanding(decodeURIComponent(h.slice(4)));
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
window.addEventListener('scroll', () => { const s = _sc ? scrollY > 6 : scrollY > 40; if (s !== _sc) { _sc = s; document.body.classList.toggle('scrolled', s); } }, { passive: true });
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
['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); }, { passive: false }));
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
const canSwipeBack = () => !!$app.querySelector(':scope > .t-top .back-btn') && !document.querySelector('.modal-back,.dlg-back');
function backTarget(){ const tp = NS.stack[NS.stack.length - 1]; if (tp) return tp; const b = $app.querySelector(':scope > .t-top .back-btn'), h = b && b.getAttribute('href'), c = h && PCACHE[h]; return { h, html: c ? (() => { const d = document.createElement('div'); d.innerHTML = shell(c.title, c.body, '', c.top, c.back); return [...d.querySelectorAll('.t-top,.t-body')].map(e => e.outerHTML).join(''); })() : '', y: 0, nostack: true }; }
function hScrollable(el){ for (; el && el !== document.body; el = el.parentElement) { if (el.scrollWidth > el.clientWidth + 2) { const o = getComputedStyle(el).overflowX; if (o === 'auto' || o === 'scroll') return true; } } return false; }
document.addEventListener('touchstart', e => {
  if (e.touches.length !== 1) { G = null; return; }
  if (e.target.closest('.t-nav, .crop, .drag-h, .np-list, input[type=range]')) { G = null; return; }
  const t = e.touches[0], row = e.target.closest('.sw-main');
  const rw = row ? row.parentElement : null;
  const page = !row && canSwipeBack() && !hScrollable(e.target);
  G = { x: t.clientX, y: t.clientY, t0: Date.now(), row, page, edge: !row && !page && t.clientX > innerWidth - 28, dx: 0, lock: null,
    base: row ? (Number(row.dataset.off) || 0) : 0,
    wr: rw ? rw.querySelector('.sw-r').offsetWidth + 22 : 0, wl: rw ? rw.querySelector('.sw-l').offsetWidth + 22 : 0 };
  if (!row) document.querySelectorAll('.sw-main.open').forEach(r => { if (!e.target.closest('.sw-act')) { r.classList.remove('open'); r.style.transform = ''; r.dataset.off = 0; } });
}, { passive: true });
function swipeBegin(){
  const tp = backTarget(); G.tp = tp;
  G.W = $app.offsetWidth; G.els = pageEls(); G.L = snapLayer(tp.html, tp.y, 'under dim');
  G.L.firstChild.style.transform = `translateX(${G.W * .3}px)`;
  $app.classList.add('pg-anim'); document.documentElement.classList.add('pg-lock');
  G.els.forEach(el => { el.style.transition = 'none'; });
}
document.addEventListener('touchmove', e => {
  if (!G) return;
  const t = e.touches[0], dx = t.clientX - G.x, dy = t.clientY - G.y;
  if (G.lock === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
    G.lock = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
    if (G.page && G.lock === 'x' && dx < 0) swipeBegin(); else if (G.page) G.page = false;
  }
  if (G.lock !== 'x') return;
  G.dx = dx;
  if (G.row) {
    e.preventDefault();
    const v = Math.max(-G.wr - 20, Math.min(G.wl + 20, G.base + dx));
    G.row.style.transition = 'none'; G.row.style.transform = `translateX(${v}px)`;
  } else if (G.page && G.L) {
    e.preventDefault();
    const x = Math.min(0, dx), p = Math.min(1, -x / G.W);
    G.els.forEach(el => { el.style.transform = `translateX(${x}px)`; });
    G.L.firstChild.style.transform = `translateX(${G.W * .3 * (1 - p)}px)`; G.L.style.setProperty('--dim', String(.12 * (1 - p)));
  } else if (G.edge) {
    e.preventDefault();
    document.body.style.transform = `translateX(${Math.min(0, dx) * 0.35}px)`;
  }
}, { passive: false });
function swipeEnd(cancel){
  const g = G, ease = 'cubic-bezier(.2,.8,.2,1)';
  const v = g.dx / Math.max(1, Date.now() - g.t0), go2 = !cancel && (g.dx < -g.W * .33 || (v < -.5 && g.dx < -40));
  g.els.forEach(el => { el.style.transition = `transform .24s ${ease}`; el.style.transform = go2 ? `translateX(${-g.W}px)` : ''; });
  g.L.firstChild.style.transition = `transform .24s ${ease}`; g.L.firstChild.style.transform = go2 ? '' : `translateX(${g.W * .3}px)`;
  g.L.style.transition = 'opacity .24s'; g.L.style.setProperty('--dim', go2 ? '0' : '.12');
  setTimeout(() => {
    document.documentElement.classList.remove('pg-lock');
    if (go2) { NS.swipe = true; haptic(); const tp = g.tp; if (tp.nostack) { const b = $app.querySelector(':scope > .t-top .back-btn'); if (b && tp.h && tp.h !== location.hash) location.hash = tp.h; else { NS.swipe = false; g.L.remove(); $app.classList.remove('pg-anim'); if (b) b.click(); } } else location.hash = tp.h; }
    else { g.L.remove(); g.els.forEach(el => { el.style.transition = ''; el.style.transform = ''; }); $app.classList.remove('pg-anim'); }
  }, 250);
}
document.addEventListener('touchend', () => {
  if (!G) return;
  if (G.row) {
    const r = G.row; r.style.transition = '';
    const v = G.base + G.dx, off = v < -45 ? -G.wr : v > 45 ? G.wl : 0;
    document.querySelectorAll('.sw-main.open').forEach(x => { if (x !== r) { x.classList.remove('open'); x.style.transform = ''; x.dataset.off = 0; } });
    r.classList.toggle('open', off !== 0); r.dataset.off = off; r.style.transform = off ? `translateX(${off}px)` : '';
  } else if (G.page && G.L) {
    swipeEnd(false);
  } else if (G.edge) {
    document.body.style.transition = 'transform .2s'; document.body.style.transform = '';
    setTimeout(() => { document.body.style.transition = ''; }, 220);
    if (G.dx < -70) goBack();
  }
  G = null;
});
document.addEventListener('touchcancel', () => { if (G && G.page && G.L) swipeEnd(true); G = null; });
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
/* edit-student form: highlight the chosen chip */
document.addEventListener('change', e => { const i = e.target; if (!i.closest || !i.closest('.se1-g,.se1-c')) return; i.closest('.se1-g,.se1-c').querySelectorAll('label').forEach(l => l.classList.toggle('on', l.contains(i))); });
/* v120: an eye next to every password field to show / hide it */
(function(){
  const add = i => { if (i.dataset.eye) return; i.dataset.eye = '1'; const w = document.createElement('span'); w.className = 'pw-w'; i.parentNode.insertBefore(w, i); w.appendChild(i);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pw-eye'; b.setAttribute('aria-label', 'إظهار كلمة المرور'); b.textContent = '👁'; w.appendChild(b);
    b.addEventListener('click', e => { e.preventDefault(); const on = i.type === 'password'; i.type = on ? 'text' : 'password'; b.classList.toggle('on', on); b.setAttribute('aria-label', on ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'); }); };
  const scan = () => document.querySelectorAll('input[type=password]:not([data-eye])').forEach(add);
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true }); scan();
})();
/* v121: pull any sheet down (from anywhere on it) to close it */
(function(){
  let D = null;
  const sheetOf = t => t.closest && (t.closest('.modal-back:not(.dlg-back) .modal') || t.closest('.ce1-sh.on .ce1-card'));
  document.addEventListener('touchstart', e => {
    D = null; if (e.touches.length !== 1 || document.querySelector('.dlg-back')) return;
    const s = sheetOf(e.target); if (!s || e.target.closest('input[type=range],textarea,.crop,.drag-h')) return;
    let sc = e.target; while (sc && sc !== s && !(sc.scrollHeight > sc.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
    D = { s, sc: sc || s, y0: e.touches[0].clientY, x0: e.touches[0].clientX, t0: Date.now(), dy: 0, on: false };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!D) return; const dy = e.touches[0].clientY - D.y0, dx = e.touches[0].clientX - D.x0;
    if (!D.on) { if (Math.abs(dy) < 8) return; if (dy < 0 || Math.abs(dx) > Math.abs(dy) || D.sc.scrollTop > 0 || D.s.scrollTop > 0) { D = null; return; } D.on = true; D.s.style.transition = 'none'; }
    e.preventDefault(); D.dy = Math.max(0, dy); D.s.style.transform = `translateY(${D.dy}px)`;
  }, { passive: false });
  const end = () => {
    if (!D || !D.on) { D = null; return; } const d = D; D = null;
    const v = d.dy / Math.max(1, Date.now() - d.t0), shut = d.dy > Math.min(140, d.s.offsetHeight * .3) || (v > .6 && d.dy > 40);
    d.s.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1)'; d.s.style.transform = shut ? `translateY(${d.s.offsetHeight + 40}px)` : '';
    setTimeout(() => { d.s.style.transition = ''; if (!shut) return; d.s.style.transform = '';
      const sh = d.s.closest('.ce1-sh'); if (sh) sh.classList.remove('on'); else { const m = d.s.closest('.modal-back'); if (m) m.remove(); } }, 220);
  };
  document.addEventListener('touchend', end); document.addEventListener('touchcancel', end);
})();
