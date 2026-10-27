import { expect, test } from '@playwright/test';
import { expectNoMajorErrors, openLocal } from './helpers';

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

test('原子研究所互動可調粒子並檢查', { tag: '@full' }, async ({ page }, testInfo) => {
  const errors = await openLocal(page, '/ch6/islands?island=atom&start=1', testInfo);
  await expect(page.getByRole('heading', { name: /原子研究所/ })).toBeVisible();
  await page.getByRole('button', { name: '檢查：是否為中性碳-12？' }).click();
  await expect(page.locator('#atom-feedback')).toContainText(/正確/);
  await expectNoMajorErrors(errors);
});
