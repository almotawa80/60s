// E2E for «اهزم الدقيقة»: serves the repo as static files and talks to the real database with test accounts.
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.js/,
  timeout: 240000,
  expect: { timeout: 20000 },
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'report' }]],
  use: {
    baseURL: 'http://127.0.0.1:8765',
    viewport: { width: 390, height: 844 },
    locale: 'ar-KW',
    timezoneId: 'Asia/Kuwait',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 20000,
  },
  webServer: { command: 'python3 -m http.server 8765 --bind 127.0.0.1', cwd: '..', url: 'http://127.0.0.1:8765/index.html', reuseExistingServer: true },
});
