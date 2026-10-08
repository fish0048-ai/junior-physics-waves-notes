import { expect, test } from '@playwright/test';
import { expectNoMajorErrors, openLocal } from './helpers';

const viewports = [
  { name: '桌面', width: 1280, height: 800 },
  { name: '平板', width: 768, height: 1024 },
  { name: '手機', width: 390, height: 844 },
];

const pages = [
  { path: '/cover.html', heading: '先提問，找證據，再主張' },
  { path: '/ch4.html', heading: '第 4 章　光' },
  { path: '/exams/4-1.html', heading: '4-1　光的傳播與光速' },
  { path: '/animations/echo-distance.html', heading: '聲音走一趟，還是來回？' },
];

for (const viewport of viewports) {
  test.describe(`Chromium ${viewport.name}`, { tag: '@full' }, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const item of pages) {
      test(`${item.heading}在${viewport.name}尺寸可讀`, async ({ page }, testInfo) => {
        const errors = await openLocal(page, item.path, testInfo);
        const heading = page.getByRole('heading', { level: 1, name: item.heading });
        await expect(heading).toBeVisible();
        const box = await heading.boundingBox();
        expect(box?.width ?? 0).toBeGreaterThan(0);
        expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport.width + 1);

        const overflow = await page.evaluate(() => {
          const root = document.documentElement;
          return root.scrollWidth - root.clientWidth;
        });
        expect(overflow).toBeLessThanOrEqual(20);
        await expectNoMajorErrors(errors);
      });
    }
  });
}
