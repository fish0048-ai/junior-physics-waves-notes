import { expect, type Page, type TestInfo } from '@playwright/test';

const benignConsole = [
  /favicon\.ico/i,
  /service\s*worker/i,
  /serviceworker/i,
  /sw-main\.js/i,
  /fonts\.googleapis\.com/i,
  /fonts\.gstatic\.com/i,
];

export function assertLocalTarget(baseURL: string | undefined): void {
  const host = new URL(baseURL || 'http://127.0.0.1').hostname;
  expect(host, '測試只能連本機靜態站，不能打正式環境').toMatch(/^(127\.0\.0\.1|localhost)$/);
}

/** 擋住會改到 GitHub Gist 的請求。雲端同步要有 token 才會送出，這裡再擋一層。 */
export async function blockRemoteWrites(page: Page): Promise<void> {
  await page.route(/https:\/\/api\.github\.com\//, (route) => route.abort());
  await page.route(/gist\.githubusercontent\.com/, (route) => route.abort());
}

export function collectMajorErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (benignConsole.some((pattern) => pattern.test(text))) return;
    errors.push(text);
  });
  return errors;
}

export async function expectNoMajorErrors(errors: string[]): Promise<void> {
  expect(errors, errors.join('\n')).toEqual([]);
}

export async function openLocal(
  page: Page,
  path: string,
  testInfo: TestInfo
): Promise<string[]> {
  assertLocalTarget(testInfo.project.use.baseURL);
  await blockRemoteWrites(page);
  const errors = collectMajorErrors(page);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  return errors;
}
