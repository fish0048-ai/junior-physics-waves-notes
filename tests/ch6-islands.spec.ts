import { expect, test } from '@playwright/test';
import { expectNoMajorErrors, openLocal } from './helpers';
import { Ch6IslandsPage, ISLAND_TITLES, type IslandId } from './pages/ch6-islands-page';

// CI 以軟體繪製 3D，群島頁比一般講義重
test.beforeEach(() => {
  test.slow();
});

/** 跳過首次教學，避免遮住要測的畫面 */
async function skipTutorial(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('jpwn.ch6islands.tutorial', 'done');
    } catch {
      /* ignore */
    }
  });
}

test('第 6 章群島頁可載入，3D 或 2D 至少一種可用', { tag: '@basic' }, async ({ page }, testInfo) => {
  await skipTutorial(page);
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo);
  await expect(page.getByRole('navigation', { name: '六座島嶼' }).or(islands.fallback)).toBeVisible();
  await expect(islands.stars).toContainText('0');
  await expectNoMajorErrors(errors);
});

test('章首有群島入口', { tag: '@basic' }, async ({ page }, testInfo) => {
  const errors = await openLocal(page, '/ch6.html', testInfo);
  await expect(page.getByRole('link', { name: /3D 理化探索群島/ })).toBeVisible();
  await expectNoMajorErrors(errors);
});

for (const id of Object.keys(ISLAND_TITLES) as IslandId[]) {
  test(`${ISLAND_TITLES[id]}互動任務可從深層連結開啟`, { tag: '@basic' }, async ({ page }, testInfo) => {
    const islands = new Ch6IslandsPage(page);
    const errors = await islands.open(testInfo, `?island=${id}&start=1`);
    await expect(islands.lab).toBeVisible();
    await expect(islands.labHeading(id)).toBeVisible();
    await expectNoMajorErrors(errors);
  });
}

test('首次進入顯示操作說明，略過後不再出現', { tag: '@basic' }, async ({ page }, testInfo) => {
  test.slow();
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo);
  const tutorial = page.getByRole('dialog', { name: '歡迎來到理化探索群島' });
  await expect(tutorial).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: '略過' }).click();
  await expect(tutorial).toBeHidden();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(islands.heading).toBeVisible();
  await expect(page.getByRole('dialog', { name: '歡迎來到理化探索群島' })).toBeHidden();
  await expectNoMajorErrors(errors);
});

test('原子研究所：答錯給具體原因且不加星，答對才點亮星星', { tag: '@full' }, async ({ page }, testInfo) => {
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo, '?island=atom&start=1');
  await expect(islands.lab).toBeVisible();

  await islands.checkAtom();
  await expect(page.getByText(/原子序不是 6/)).toBeVisible();
  await expect(islands.stars).toContainText('0');

  await islands.adjustAtom('質子', 5);
  await islands.checkAtom();
  await expect(page.getByText(/目前是離子/)).toBeVisible();

  await islands.adjustAtom('電子', 5);
  await islands.adjustAtom('中子', 6);
  await expect(page.getByText('中性碳原子（C）')).toBeVisible();
  await islands.checkAtom();
  await expect(page.getByText(/正確！中性碳-12/)).toBeVisible();
  await expect(islands.stars).toContainText('1');
  await expect(page.getByRole('button', { name: /前往下一座：物質分解實驗島/ })).toBeVisible();
  await expectNoMajorErrors(errors);
});

test('原子研究所：粒子數不能減到不合理的負值', { tag: '@full' }, async ({ page }, testInfo) => {
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo, '?island=atom&start=1');
  await islands.adjustAtom('質子', -3);
  await islands.adjustAtom('中子', -3);
  await expect(page.getByText('中性氫原子（H）')).toBeVisible();
  await expectNoMajorErrors(errors);
});

test('Esc 依序關閉任務視窗與資訊卡', { tag: '@full' }, async ({ page }, testInfo) => {
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo, '?island=classify&start=1');
  await expect(islands.lab).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(islands.lab).toBeHidden();
  await expect(page.getByRole('heading', { level: 2, name: '物質分類挑戰島' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { level: 2, name: '物質分類挑戰島' })).toBeHidden();
  await expectNoMajorErrors(errors);
});

test('不存在的島嶼參數不會開啟面板也不報錯', { tag: '@full' }, async ({ page }, testInfo) => {
  await skipTutorial(page);
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo, '?island=not-an-island&start=1');
  await expect(islands.lab).toBeHidden();
  await expect(page.getByRole('button', { name: /開始探索/ })).toBeHidden();
  await expectNoMajorErrors(errors);
});

test('2D 後備模式：清單選島、開任務、進度共用', { tag: '@basic' }, async ({ page }, testInfo) => {
  await skipTutorial(page);
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo, '?mode=2d');
  await expect(islands.fallback).toBeVisible();
  await expect(page.getByRole('navigation', { name: '六座島嶼' })).toBeHidden();
  await page.getByRole('button', { name: /分子組裝工坊/ }).click();
  await islands.startExplore();
  await expect(islands.labHeading('molecule')).toBeVisible();
  await expectNoMajorErrors(errors);
});
