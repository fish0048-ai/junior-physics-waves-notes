import { expect, type Page, test } from '@playwright/test';
import { expectNoMajorErrors, openLocal } from './helpers';

const playbackPages = [
  { path: '/animations/echo-distance.html', heading: '聲音走一趟，還是來回？' },
  { path: '/animations/heat-transfer.html', heading: '熱如何從這裡傳到那裡？' },
  { path: '/animations/heat-energy.html', heading: '同樣加熱，升溫為何不同？' },
  { path: '/animations/light-colors.html', heading: '眼睛最後收到什麼色光？' },
  { path: '/animations/heating-curve.html', heading: '加熱不停，溫度為什麼停住？' },
];

async function expectPlaybackControls(page: Page, path: string, heading: string, testInfo: Parameters<typeof openLocal>[2]) {
  const errors = await openLocal(page, path, testInfo);
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  const play = page.locator('#play');
  const reset = page.locator('#reset');
  const status = page.locator('#status');
  await expect(play).toHaveText('播放');
  await play.click();
  await expect(play).toHaveText('暫停');
  await expect(status).toHaveText('播放中');
  await play.click();
  await expect(play).toHaveText('播放');
  await expect(status).toHaveText('已暫停');
  await reset.click();
  await expect(play).toHaveText('播放');
  await expect(status).toHaveText('已重設');
  await expectNoMajorErrors(errors);
}

test.describe('互動動畫', { tag: '@full' }, () => {
  for (const item of playbackPages) {
    test(`${item.heading}可播放、暫停、重設`, async ({ page }, testInfo) => {
      await expectPlaybackControls(page, item.path, item.heading, testInfo);
    });
  }

  test('繩波粒子動畫可播放、暫停、重設', async ({ page }, testInfo) => {
    const errors = await openLocal(page, '/animations/wave-particle.html', testInfo);
    await expect(page.getByRole('heading', { level: 1, name: '波往右走，紅點去哪裡？' })).toBeVisible();
    const play = page.locator('#play');
    const status = page.locator('#state');
    await expect(play).toHaveText('播放');
    await expect(status).toHaveText('已暫停，可拖動時間');
    await play.click();
    await expect(play).toHaveText('暫停');
    await expect(status).toHaveText('播放中');
    await play.click();
    await expect(play).toHaveText('播放');
    await expect(status).toHaveText('已暫停，可拖動時間');
    await page.locator('#reset').click();
    await expect(play).toHaveText('播放');
    await expect(status).toHaveText('已重設至 0T');
    await expectNoMajorErrors(errors);
  });

  test('針孔成像可暫停、播放並重設物距與屏距', async ({ page }, testInfo) => {
    const errors = await openLocal(page, '/animations/pinhole-image.html', testInfo);
    await expect(page.getByRole('heading', { level: 1, name: '小孔怎麼把影像倒過來？' })).toBeVisible();
    const toggle = page.locator('#toggle-ray-anim');
    const status = page.locator('#status');
    await expect(toggle).toHaveText('暫停光線動畫');
    await toggle.click();
    await expect(toggle).toHaveText('播放光線動畫');
    await expect(status).toContainText('已暫停');
    await toggle.click();
    await expect(toggle).toHaveText('暫停光線動畫');
    await expect(status).toContainText('播放中');
    await page.locator('#object').fill('50');
    await page.locator('#preset-reset').click();
    await expect(page.locator('#object')).toHaveValue('80');
    await expect(page.locator('#screen')).toHaveValue('120');
    await expect(status).toHaveText('已重設');
    await expectNoMajorErrors(errors);
  });
});
