// Load test for «اهزم الدقيقة»: waves of robot students (30 → 60 → 100) play today's round at the same minute.
// Talks straight to the database API like the app does (no browser). Measures speed, errors and correctness.
// Test data: teacher «اختبار آلي», classes «ضغط 30/60/100», student codes LDA001.., LDB001.., LDC001..
const fs = require('fs'), path = require('path');
const cfg = fs.readFileSync(path.join(__dirname, '..', '..', 'config.js'), 'utf8');
const URL_ = cfg.match(/SUPABASE_URL:\s*"([^"]+)"/)[1], KEY = cfg.match(/SUPABASE_KEY:\s*"([^"]+)"/)[1];
// MODE=big: 3000 students = 30 robot schools (10 primary, 10 middle, 10 secondary) × 4 classes × 25, codes Z<TT><C><SS>
const STEP = process.env.MODE === 'step';                          // stepped: 300 → 600 → 1200 different robot students, 4 minutes apart
const BIG = process.env.MODE === 'big' || STEP;
// SHARD/SHARDS: the 30 schools are split over several machines (one machine cannot hold 3000 connections); all start at the same clock minute
const SHARDS = +(process.env.SHARDS || 1), SHARD = +(process.env.SHARD || 0);
const WAVES = STEP ? [{ k: 'S300', n: 300, cls: 25, ts: [1, 3] }, { k: 'S600', n: 600, cls: 25, ts: [4, 9] }, { k: 'S1200', n: 1200, cls: 25, ts: [10, 21] }] : BIG ? [{ k: 'Z', n: 3000 / SHARDS, cls: 25, ts: [1, 30] }] : (process.env.WAVES || 'A:30,B:60,C:100').split(',').map(x => { const [k, n] = x.split(':'); return { k, n: +n, cls: +n }; });
const bigCodes = w => { const a = []; for (let t = w.ts[0]; t <= w.ts[1]; t++) if (t % SHARDS === SHARD % SHARDS) for (let c = 1; c <= 4; c++) for (let g = 1; g <= 25; g++) a.push('Z' + String(t).padStart(2, '0') + c + String(g).padStart(2, '0')); return a; };
const SPREAD = +(process.env.SPREAD_SEC || (BIG ? 60 : 20)) * 1000;           // students of one wave start within this window
const THINK = [2000, 8000];                                       // «thinking» time before each answer
const sleep = ms => new Promise(r => setTimeout(r, ms)), rnd = (a, b) => a + Math.random() * (b - a);

const M = {};                                                     // metrics[wave][rpc] = { t: [], err: 0 }
async function rpc(wave, fn, args) {
  const m = (M[wave] = M[wave] || {})[fn] = (M[wave][fn] || { t: [], err: 0, msgs: {} });
  const t0 = performance.now();
  try {
    const r = await fetch(URL_ + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(args), signal: AbortSignal.timeout(30000) });
    const txt = await r.text(); m.t.push(performance.now() - t0);
    if (!r.ok) { let msg = txt.slice(0, 120); try { msg = JSON.parse(txt).message || msg; } catch (e) {} const er = new Error(msg); er.http = r.status; throw er; }
    return txt ? JSON.parse(txt) : null;
  } catch (e) { m.err++; const k = String(e.http || e.name) + ' ' + String(e.message).slice(0, 80); m.msgs[k] = (m.msgs[k] || 0) + 1; throw e; }
}

async function student(wave, code) {
  const out = { code, ok: false, kind: 'official', pts: 0, answered: 0 };
  await sleep(rnd(0, SPREAD));
  const t0 = Date.now();
  try {
    const lg = await rpc(wave, 'student_login', { p_code: code }), token = lg.token;
    const h0 = await rpc(wave, 'student_home', { p_token: token }); out.before = h0.total_points || 0;
    let st;
    try { st = await rpc(wave, 'start_attempt', { p_token: token, p_kind: 'official' }); }
    catch (e) { out.kind = 'practice'; out.why = e.message; st = await rpc(wave, 'start_attempt', { p_token: token, p_kind: 'practice' }); }
    const att = st.attempt_id; let guard = 0;
    while (st && !st.finished && guard++ < 12) {
      const q = st.question || {}, n = (q.options || []).length || 4;
      await sleep(Math.min(rnd(...THINK), Math.max(500, ((st.seconds_left || st.secs || 15) - 2) * 1000)));
      const isOrd = q.payload && q.payload.kind === 'order';
      const chosen = isOrd ? +('1' + [...Array(n).keys()].sort(() => Math.random() - .5).join('')) : Math.floor(Math.random() * n);
      const r = await rpc(wave, 'submit_answer', { p_token: token, p_attempt: att, p_position: st.position, p_chosen: chosen });
      out.answered++; out.pts += (r.result && r.result.points) || 0; st = r.next;
    }
    out.finished = !!(st && st.finished);
    const lb = await rpc(wave, 'class_leaderboard', { p_token: token }), rows = Array.isArray(lb) ? lb : (lb && lb.rows) || [];
    const me = rows.find(x => x.is_me); out.lbRows = rows.length; out.after = me ? me.points : null;
    const h1 = await rpc(wave, 'student_home', { p_token: token }); out.homeAfter = h1.total_points || 0; out.played = !!h1.played_today;
    out.ok = out.finished;
  } catch (e) { out.err = String(e.message).slice(0, 120); }
  out.ms = Date.now() - t0; return out;
}

const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))]); };

(async () => {
  let md = '# اختبار الضغط · ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC\n', bad = 0;
  const step = STEP ? 300000 : 120000, at = Math.ceil((Date.now() + 60000) / step) * step;
  if (BIG && SHARDS > 1) { console.log('shard', SHARD, 'starts at', new Date(at).toISOString()); await sleep(at - Date.now()); }
  for (const [wi, w] of WAVES.entries()) {
    if (STEP && wi) await sleep(Math.max(0, at + wi * 240000 - Date.now()));
    const codes = BIG ? bigCodes(w) : Array.from({ length: w.n }, (_, i) => 'LD' + w.k + String(i + 1).padStart(3, '0'));
    const t0 = Date.now(), res = await Promise.all(codes.map(c => student(w.k, c))), secs = Math.round((Date.now() - t0) / 1000);
    const done = res.filter(r => r.ok), off = done.filter(r => r.kind === 'official');
    // correctness: an official round must add exactly the points the answers returned, and count as «played today»
    const wrongPts = off.filter(r => r.homeAfter - r.before !== Math.max(-r.before, r.pts) && r.homeAfter - r.before !== r.pts);
    const lbMis = off.filter(r => r.after != null && r.after !== r.homeAfter), notPlayed = off.filter(r => !r.played), lbShort = done.filter(r => r.lbRows !== w.cls);
    const calls = Object.values(M[w.k] || {}).reduce((a, m) => a + m.t.length + 0, 0), errs = Object.values(M[w.k] || {}).reduce((a, m) => a + m.err, 0);
    md += `\n## ${w.n} طالب${BIG ? ' · 30 مدرسة · 120 صف' : ''}\n\nخلصوا الجولة: **${done.length} من ${w.n}** (رسمية ${off.length}، تدريب ${done.length - off.length}) · المدة ${secs} ث · الطلبات ${calls} · الأخطاء **${errs}**\n\n`;
    md += '| الطلب | العدد | الوسيط ms | p95 ms | الأبطأ ms | أخطاء |\n|---|---|---|---|---|---|\n';
    for (const [fn, m] of Object.entries(M[w.k] || {})) md += `| ${fn} | ${m.t.length} | ${pct(m.t, .5)} | ${pct(m.t, .95)} | ${pct(m.t, 1)} | ${m.err} |\n`;
    md += `\nمدة الطالب من الدخول لآخر شاشة: الوسيط ${Math.round(pct(done.map(r => r.ms), .5) / 1000)} ث · p95 ${Math.round(pct(done.map(r => r.ms), .95) / 1000)} ث\n`;
    md += `\nالصحة: نقاط ما تطابق الأجوبة **${wrongPts.length}** · ترتيب ما يطابق الرئيسية **${lbMis.length}** · ما انحسب «لعب اليوم» **${notPlayed.length}** · ترتيب ناقص طلاب **${lbShort.length}**\n`;
    const failed = res.filter(r => !r.ok); if (failed.length) { const g = {}; failed.forEach(r => g[r.err || 'ما كملت'] = (g[r.err || 'ما كملت'] || 0) + 1); md += '\nاللي ما كملوا: ' + Object.entries(g).map(([k, v]) => `${v}× ${k}`).join(' · ') + '\n'; }
    const why = {}; done.filter(r => r.kind === 'practice').forEach(r => why[r.why] = (why[r.why] || 0) + 1); if (Object.keys(why).length) md += '\nسبب التدريب بدل الرسمية: ' + Object.entries(why).map(([k, v]) => `${v}× ${k}`).join(' · ') + '\n';
    const em = {}; Object.entries(M[w.k] || {}).forEach(([fn, m]) => Object.entries(m.msgs).forEach(([k, v]) => em[fn + ': ' + k] = v)); if (Object.keys(em).length) md += '\nالأخطاء: ' + Object.entries(em).map(([k, v]) => `${v}× ${k}`).join(' · ') + '\n';
    if (wrongPts.length) md += '\nأمثلة نقاط: ' + wrongPts.slice(0, 5).map(r => `${r.code} قبل ${r.before} بعد ${r.homeAfter} أجوبة ${r.pts}`).join(' · ') + '\n';
    bad += failed.length + wrongPts.length + lbMis.length + notPlayed.length;
    if (BIG) console.log('LOADJSON ' + JSON.stringify({ shard: SHARD, wave: w.k, n: codes.length, done: done.length, official: off.length, secs, wrongPts: wrongPts.length, lbMis: lbMis.length, notPlayed: notPlayed.length, lbShort: lbShort.length, stuMs: done.map(r => r.ms), rpc: Object.fromEntries(Object.entries(M[w.k] || {}).map(([fn, m]) => [fn, { t: m.t.map(Math.round), err: m.err, msgs: m.msgs }])) }));
    if (!BIG) await sleep(8000);
  }
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  process.exit(bad ? 1 : 0);
})();
