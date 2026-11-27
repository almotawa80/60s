// teacher path: needs GitHub secrets E2E_EMAIL / E2E_PASS (test teacher «اختبار آلي»)
const { test, expect } = require('@playwright/test');
const { CLASS, watchErrors } = require('./helpers');

const EMAIL = process.env.E2E_EMAIL, PASS = process.env.E2E_PASS;
test.describe.configure({ mode: 'serial' });
test.skip(!EMAIL || !PASS, 'E2E_EMAIL / E2E_PASS not set: teacher path skipped');

test('المعلم: يسجل دخول ويشوف التحدي والصف والأسئلة والإعدادات', async ({ page }) => {
  const w = watchErrors(page);
  // the one-time «تفعيل الإشعارات» dialog (v493) would cover the home page; mark it answered
  await page.addInitScript(() => { try { localStorage.setItem('mc_tpush_ask2', '1'); } catch (e) {} });
  await page.goto('/index.html#/t');
  await page.locator('#a-email').fill(EMAIL);
  await page.locator('#a-pw').fill(PASS);
  await page.locator('form[data-form="t-auth"] button[type=submit]').click();
  await expect(page.locator('.t-nav')).toBeVisible();

  // home: one card for the running challenge → challenge page
  const card = page.locator('a.hc', { hasText: CLASS.challenge }).first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.locator('.ch-acts')).toBeVisible();
  await expect(page.locator('#app')).toContainText('روبوت');

  // classes → class page lists the students
  await page.locator('.t-nav a[href="#/t/classes"]').click();
  const tile = page.locator('[data-act="c-open"]', { hasText: CLASS.name }).first();
  await expect(tile).toBeVisible();
  await tile.click();
  await expect(page.locator('#app')).toContainText('روبوت أول');

  // questions page and settings render
  await page.locator('.t-nav a[href="#/t/questions"]').click();
  await expect(page.locator('.q5-sb').first()).toBeVisible();
  await page.locator('.t-nav a[href="#/t/settings"]').click();
  await expect(page.locator('#app')).toContainText('اختبار آلي');

  // new challenge wizard opens (nothing is created)
  await page.locator('.t-nav a[href="#/t/new"]').click();
  await expect(page.locator('#app')).toContainText(CLASS.name);
  w.check();
});
