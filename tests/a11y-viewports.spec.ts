import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { name: "手機", width: 390, height: 844 },
  { name: "平板", width: 768, height: 1024 },
  { name: "桌面", width: 1280, height: 800 },
];

async function openLocal(page: Page, path: string) {
  await page.route("https://api.github.com/**", (route) => route.abort());
  await page.route("https://gist.githubusercontent.com/**", (route) => route.abort());
  const response = await page.goto(path);
  expect(response?.ok()).toBeTruthy();
  expect(new URL(page.url()).hostname).toBe("127.0.0.1");
}

test.describe("三種寬度回歸", () => {
  test.use({ serviceWorkers: "block" });

  for (const viewport of viewports) {
    test(`${viewport.name}：焦點、44px、錨點、toast、動畫框`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openLocal(page, "/sections/4-1.html");
      await page.evaluate(() => document.body.classList.add("ink-draw"));

      const button = page.locator("#btn-answers");
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);

      const nav = page.locator(".site-nav a").first();
      const navBox = await nav.boundingBox();
      expect(navBox).not.toBeNull();
      expect(navBox!.height).toBeGreaterThanOrEqual(44);

      await button.evaluate((el) => {
        if (el instanceof HTMLElement) el.focus({ focusVisible: true });
      });
      const color = await button.evaluate((el) => getComputedStyle(el).outlineColor);
      expect(color).toBe("rgb(28, 25, 23)");

      const margin = await page.locator("#p1").evaluate((el) => parseFloat(getComputedStyle(el).scrollMarginTop));
      expect(margin).toBeGreaterThan(40);

      const toast = page.locator("#toast");
      await page.locator("#btn-answers").click();
      await expect(toast).toHaveAttribute("aria-live", "polite");
      await expect(toast).toContainText("答案");

      const frame = page.locator("#anim-pinhole-image");
      await frame.scrollIntoViewIfNeeded();
      await expect.poll(async () => frame.evaluate((el) => el.getBoundingClientRect().height), {
        timeout: 8000,
      }).toBeGreaterThan(700);
      await page.evaluate(() => {
        window.postMessage({ type: "physics-animation:resize", height: 4200 }, location.origin);
      });
      await page.waitForTimeout(400);
      expect(await frame.evaluate((el) => el.style.height)).not.toBe("4206px");
    });
  }

  test("列印時錨點留白歸零，toast 不占版面", async ({ page }) => {
    await openLocal(page, "/sections/4-1.html");
    await page.emulateMedia({ media: "print" });
    const margin = await page.locator("#p1").evaluate((el) => parseFloat(getComputedStyle(el).scrollMarginTop));
    expect(margin).toBe(0);
    const display = await page.locator("#toast").evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe("none");
  });

  test("回聲動畫仍可播放與重設", async ({ page }) => {
    await openLocal(page, "/animations/echo-distance.html");
    const play = page.locator("#play");
    await expect(play).toHaveText("播放");
    await play.click();
    await expect(play).toHaveText("暫停");
    await page.locator("#reset").click();
    await expect(play).toHaveText("播放");
    await expect(page.locator("#status")).toHaveText("已重設");
  });

  test("筆記資料庫可以開啟，服務工作程檔仍在", async ({ page }) => {
    await openLocal(page, "/sections/4-1.html");
    const opened = await page.evaluate(() => new Promise<boolean>((resolve) => {
      const request = indexedDB.open("jpwn-ink", 1);
      request.onsuccess = () => {
        request.result.close();
        resolve(true);
      };
      request.onerror = () => resolve(false);
      request.onblocked = () => resolve(false);
    }));
    expect(opened).toBeTruthy();
    await expect(page.locator("script[src*='register-sw.js']")).toHaveCount(1);
    const sw = await page.request.get("/sw-main.js");
    expect(sw.ok()).toBeTruthy();
    expect(await sw.text()).toContain('CACHE_VERSION = "jpwn-pwa-v3"');
    expect(await sw.text()).toContain("networkFirst");
    expect(await sw.text()).not.toContain("indexedDB");
  });
});
