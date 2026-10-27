import { expect, test } from '@playwright/test';
import { expectNoMajorErrors, openLocal } from './helpers';

const islands = [
  { id: 'elements', title: /元素探索島/ },
  { id: 'periodic', title: /週期表城市/ },
  { id: 'atom', title: /原子研究所/ },
  { id: 'decompose', title: /物質分解實驗島/ },
  { id: 'molecule', title: /分子組裝工坊/ },
  { id: 'classify', title: /物質分類挑戰島/ },
];

test('第 6 章群島頁可載入', { tag: '@basic' }, async ({ page }, testInfo) => {
  const errors = await openLocal(page, '/ch6/islands', testInfo);
  await expect(page.getByRole('heading', { level: 1, name: '理化探索群島' })).toBeVisible();
  const canvas = page.locator('#islands-canvas');
  const fallback = page.locator('#islands-fallback:not([hidden])');
  await expect(canvas.or(fallback)).toBeVisible();
  await expectNoMajorErrors(errors);
});

test('章首有群島入口', { tag: '@basic' }, async ({ page }, testInfo) => {
  const errors = await openLocal(page, '/ch6.html', testInfo);
  await expect(page.getByRole('link', { name: /3D 理化探索群島/ })).toBeVisible();
  await expectNoMajorErrors(errors);
});

for (const island of islands) {
  test(`${island.id} 互動任務可開啟`, { tag: '@basic' }, async ({ page }, testInfo) => {
    const errors = await openLocal(page, `/ch6/islands?island=${island.id}&start=1`, testInfo);
    await expect(page.locator('#islands-lab:not([hidden])')).toBeVisible();
    await expect(page.getByRole('heading', { name: island.title })).toBeVisible();
    await expectNoMajorErrors(errors);
  });
}

test('原子研究所可完成碳-12 檢查', { tag: '@full' }, async ({ page }, testInfo) => {
  const errors = await openLocal(page, '/ch6/islands?island=atom&start=1', testInfo);
  await page.getByRole('button', { name: /檢查：是否為中性碳-12/ }).click();
  await expect(page.locator('.lab-feedback, #atom-feedback').first()).toContainText(/正確/);
  await expectNoMajorErrors(errors);
});
