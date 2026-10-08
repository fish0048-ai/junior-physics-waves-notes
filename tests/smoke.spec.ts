import { expect, test } from '@playwright/test';
import { expectNoMajorErrors, openLocal } from './helpers';

const pages: Array<{ path: string; heading: string; cards?: string }> = [
  { path: '/cover.html', heading: '先提問，找證據，再主張' },
  { path: '/ch1.html', heading: '第 1 章　基本測量', cards: '#section-cards a' },
  { path: '/ch2.html', heading: '第 2 章　物質的世界', cards: '#section-cards a' },
  { path: '/index.html', heading: '第 3 章　波動與聲音', cards: '#section-cards a' },
  { path: '/ch4.html', heading: '第 4 章　光', cards: '#section-cards a' },
  { path: '/ch5.html', heading: '第 5 章　溫度與熱', cards: '#section-cards a' },
  { path: '/ch6.html', heading: '第 6 章　探索物質組成', cards: '#section-cards a' },
  { path: '/lab.html', heading: '實驗專區', cards: '#section-cards a' },
  { path: '/sections/4-1.html', heading: '4-1　光的傳播與光速' },
  { path: '/sections/1-0.html', heading: '1-0　進入實驗室與科學方法' },
  { path: '/practice.html', heading: '練習專區', cards: '#practice-chapter-cards a' },
];

for (const item of pages) {
  test(`${item.heading}可以載入`, { tag: '@basic' }, async ({ page }, testInfo) => {
    const errors = await openLocal(page, item.path, testInfo);
    await expect(page.getByRole('heading', { level: 1, name: item.heading })).toBeVisible();
    if (item.cards) {
      await expect(page.locator(item.cards).first()).toBeVisible();
    }
    await expectNoMajorErrors(errors);
  });
}

test('封面可以進講義與練習專區', { tag: '@basic' }, async ({ page }, testInfo) => {
  const errors = await openLocal(page, '/cover.html', testInfo);
  await expect(page.getByRole('link', { name: /探究講義/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /練習專區/ })).toBeVisible();
  await expectNoMajorErrors(errors);
});
