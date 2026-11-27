// Shared helpers. Test data lives in the real database under the teacher «اختبار آلي» (class «صف الاختبار الآلي»).
const STUDENT = { code: '7E2ET7', name: 'روبوت أول' };
const STUDENT2 = { code: '8E2ET8', name: 'روبوت ثاني' };
const CLASS = { name: 'صف الاختبار الآلي', join: 'E2EJ01', challenge: 'تحدي الاختبار الآلي' };

/** collect uncaught JS errors; call .check() at the end of a test */
function watchErrors(page) {
  const errs = [];
  page.on('pageerror', e => errs.push(String(e && e.message || e)));
  return { errs, check() { if (errs.length) throw new Error('JS errors on page:\n' + errs.join('\n')); } };
}

/** close any popup (level up, badges, notifications ask, first-entry character) so the page under it is usable */
async function clearPopups(page) {
  await page.waitForTimeout(1200);   // badge / level popups arrive a moment after the home loads
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => document.querySelectorAll('.bg2-win').forEach(e => (e.closest('.bg2-back') || e).remove()));
    const first = page.locator('.av2-first');
    if (await first.count()) { await first.locator('.s-avg button').nth(2).click(); await first.locator('[data-act="s-avs"]').click(); await page.waitForTimeout(800); continue; }
    const back = page.locator('.modal-back');
    if (!(await back.count())) return;
    const x = back.locator('[data-act="close-modal"]').first();
    if (await x.count()) await x.click().catch(() => {}); else await page.evaluate(() => document.querySelectorAll('.modal-back').forEach(e => e.remove()));
    await page.waitForTimeout(400);
  }
}

/** play the round that is on screen until the result page shows; returns number of questions answered */
async function playRound(page) {
  let answered = 0; const t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    if (await page.locator('#bigpts, .res-h').count()) return answered;
    const ord = page.locator('.opts.ord .opt:not([disabled])');
    const opt = page.locator('.opt[data-act="s-answer"]:not([disabled])');
    if (await ord.count()) { const n = await ord.count(); for (let i = 0; i < n; i++) await ord.nth(i).click({ timeout: 3000 }).catch(() => {}); answered++; await page.waitForTimeout(1500); }
    else if (await opt.count()) { await opt.first().click({ timeout: 3000 }).catch(() => {}); answered++; await page.waitForTimeout(1500); }
    else await page.waitForTimeout(400);
  }
  throw new Error('round did not reach the result screen in 150s');
}

module.exports = { STUDENT, STUDENT2, CLASS, watchErrors, clearPopups, playRound };
