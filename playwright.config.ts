import { defineConfig, devices } from '@playwright/test';

const port = 4173;
const baseURL = `http://127.0.0.1:${port}`;

/**
 * 只對本機靜態檔做測試。正式站的 Vercel rewrite（/ → cover.html）與 clean URL
 * 不在這份設定裡，避免測試打到 https://junior-physics-waves-notes.vercel.app 。
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  outputDir: 'test-results',
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['github'],
    ['list'],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `python3 -m http.server ${port} --bind 127.0.0.1`,
    url: `${baseURL}/cover.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
