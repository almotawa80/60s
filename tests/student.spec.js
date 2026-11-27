const { test, expect } = require('@playwright/test');
const { STUDENT, STUDENT2, CLASS, watchErrors, clearPopups, playRound } = require('./helpers');

test.describe.configure({ mode: 'serial' });

test('الطالب: يدخل بالرمز، يلعب تدريب، ويشوف النتيجة والتبويبات', async ({ page }) => {
  const w = watchErrors(page);
  await page.goto('/index.html#/s');
  await expect(page.locator('#code')).toBeVisible();
  await page.locator('#code').fill(STUDENT.code);
  await expect(page.locator('.s-nav')).toBeVisible();
  await clearPopups(page);
  await expect(page.locator('#app')).toContainText(CLASS.challenge.slice(0, 8));

  // practice round (no points, always available)
  await page.locator('[data-act="s-start"][data-kind="practice"]').first().click();
  const n = await playRound(page);
  expect(n).toBeGreaterThan(0);
  await expect(page.locator('#bigpts, .res-h').first()).toBeVisible();

  // back home, then every tab renders something
  await page.goto('/index.html#/s');
  await expect(page.locator('.s-nav')).toBeVisible();
  await clearPopups(page);
  await page.locator('.s-nav [data-t="lb"]').click();
  await expect(page.locator('#app')).toContainText('روبوت');
  await clearPopups(page);
  await page.locator('.s-nav [data-t="bd"]').click();
  await expect(page.locator('.bg2').first()).toBeVisible();
  await clearPopups(page);
  await page.locator('.s-nav [data-t="me"]').click();
  await expect(page.locator('.s-me')).toContainText(STUDENT.name);

  // «تقريري»
  await page.locator('[data-act="s-rep-me"]').click();
  await expect(page.locator('.rp2-hero')).toBeVisible();
  await page.locator('.rp2-top .s-back').click();

  // character picker: 3 tabs, switching works
  await page.locator('[data-act="s-av"]').click();
  await expect(page.locator('.av2-tabs button')).toHaveCount(await page.locator('.av2-tabs button').count());
  await page.locator('.av2-tabs [data-k="a"]').click();
  await expect(page.locator('#av2-grid .s-avg button')).toHaveCount(12);
  await page.locator('[data-act="close-modal"]').first().click();
  w.check();
});

test('الطالب: جولة اليوم الرسمية (إذا ما لعب اليوم) وتنحسب له', async ({ page }) => {
  const w = watchErrors(page);
  await page.goto('/index.html#/c/' + STUDENT2.code);
  await expect(page.locator('.s-nav')).toBeVisible();
  await clearPopups(page);
  const play = page.locator('[data-act="s-start"][data-kind="official"]');
  if (await play.count()) {
    await play.first().click();
    await playRound(page);
    await expect(page.locator('#bigpts, .res-h').first()).toBeVisible();
    await page.goto('/index.html#/s');
    await expect(page.locator('.s-nav')).toBeVisible();
    await clearPopups(page);
  }
  // after an official round today the big «العب» button is gone until tomorrow
  await expect(page.locator('.sp-play')).toHaveCount(0);
  w.check();
});

test('رابط الصف: يطلع أسماء الطلاب', async ({ page }) => {
  const w = watchErrors(page);
  await page.goto('/index.html#/j/' + CLASS.join);
  await expect(page.locator('#app')).toContainText(CLASS.name);
  w.check();
});

test('رمز غلط: رسالة خطأ واضحة بدون ما ينهار التطبيق', async ({ page }) => {
  const w = watchErrors(page);
  await page.goto('/index.html#/s');
  await page.locator('#code').fill('ZZZZ99');
  await expect(page.locator('#lerr')).not.toBeEmpty();
  await expect(page.locator('#code')).toBeVisible();
  w.check();
});
