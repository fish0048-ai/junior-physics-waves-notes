import { expect, test, type Locator, type Page } from "@playwright/test";

async function openLocal(page: Page, path: string) {
  await page.route("https://api.github.com/**", (route) => route.abort());
  await page.route("https://gist.githubusercontent.com/**", (route) => route.abort());
  const response = await page.goto(path);
  expect(response?.ok()).toBeTruthy();
  expect(page.url()).toContain("127.0.0.1");
}

async function pseudoContent(locator: Locator) {
  return locator.evaluate((el) => getComputedStyle(el, "::after").content);
}

test.describe("第一階段無障礙", () => {
  test("鍵盤移到導覽時看得到外框", async ({ page }) => {
    await openLocal(page, "/cover.html");
    const gate = page.locator("a.portal-gate.is-practice");
    for (let i = 0; i < 80; i += 1) {
      const href = await page.evaluate(() => {
        const el = document.activeElement;
        return el instanceof HTMLAnchorElement ? el.getAttribute("href") || "" : "";
      });
      if (href.includes("practice.html")) break;
      await page.keyboard.press("Tab");
    }
    await expect(gate).toBeFocused();
    const outline = await gate.evaluate((el) => ({
      style: getComputedStyle(el).outlineStyle,
      width: parseFloat(getComputedStyle(el).outlineWidth),
      color: getComputedStyle(el).outlineColor,
    }));
    expect(outline.style).not.toBe("none");
    expect(outline.width).toBeGreaterThanOrEqual(3);
    expect(outline.color).toBe("rgb(28, 25, 23)");
  });

  test("尚未檢查時挖空沒有對錯文字", async ({ page }) => {
    await openLocal(page, "/sections/4-1.html");
    const blank = page.locator(".blank").first();
    await expect(blank).toBeVisible();
    expect(await pseudoContent(blank)).toBe("none");
  });

  test("顯示答案會朗讀，對錯樣式帶有文字", async ({ page }) => {
    await openLocal(page, "/sections/4-1.html");
    const toast = page.locator("#toast");
    await expect(toast).not.toHaveAttribute("aria-live", "polite");
    const blank = page.locator(".blank").first();
    await blank.focus();
    await page.keyboard.press("Enter");
    await expect(blank).toHaveClass(/revealed/);
    await page.locator("#btn-answers").click();
    await expect(toast).toHaveAttribute("role", "status");
    await expect(toast).toHaveAttribute("aria-live", "polite");
    await expect(toast).toContainText("答案");
    await blank.evaluate((el) => el.classList.add("wrong"));
    expect(await pseudoContent(blank)).toBe('"再看"');
  });

  test("筆記模式在平板寬度維持 44px", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await openLocal(page, "/sections/4-1.html");
    await page.evaluate(() => document.body.classList.add("ink-draw"));
    const button = page.locator("#btn-answers");
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
    const nav = page.locator(".site-nav a").first();
    const navBox = await nav.boundingBox();
    expect(navBox).not.toBeNull();
    expect(navBox!.height).toBeGreaterThanOrEqual(44);
  });

  test("減少動態時針孔動畫先暫停，點一下仍可播放", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openLocal(page, "/animations/pinhole-image.html");
    const toggle = page.locator("#toggle-ray-anim");
    await expect(toggle).toHaveText("播放光線動畫");
    await toggle.click();
    await expect(toggle).toHaveText("暫停光線動畫");
  });

  test("沒有減少動態時針孔動畫仍可自動播放", async ({ page }) => {
    await openLocal(page, "/animations/pinhole-image.html");
    await expect(page.locator("#toggle-ray-anim")).toHaveText("暫停光線動畫");
  });

  test("章節錨點留出頂欄高度", async ({ page }) => {
    await openLocal(page, "/sections/4-1.html");
    const margin = await page.locator("article[id], section[id], h2[id]").first().evaluate((el) => {
      return parseFloat(getComputedStyle(el).scrollMarginTop);
    });
    expect(margin).toBeGreaterThan(40);
  });

  test("手機上動畫框會依內容變高", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openLocal(page, "/sections/4-1.html");
    const frame = page.locator("#anim-pinhole-image");
    await frame.scrollIntoViewIfNeeded();
    await expect.poll(async () => frame.evaluate((el) => el.getBoundingClientRect().height), {
      timeout: 8000,
    }).toBeGreaterThan(700);
    await expect(frame).not.toHaveClass(/is-anim-fallback/);
  });

  test("動畫檔載入失敗時改為可捲動備援", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/animations/pinhole-image.html", (route) => route.abort());
    await openLocal(page, "/sections/4-1.html");
    const frame = page.locator("#anim-pinhole-image");
    await frame.scrollIntoViewIfNeeded();
    await expect(frame).toHaveClass(/is-anim-fallback/, { timeout: 5000 });
    const minHeight = await frame.evaluate((el) => parseFloat(getComputedStyle(el).minHeight));
    expect(minHeight).toBeGreaterThanOrEqual(480);
  });

  test("段考選項對錯不只靠顏色", async ({ page }) => {
    await openLocal(page, "/exams/4-1.html");
    await page.locator(".exam-q").first().locator(".exam-choice").first().click();
    await page.locator("#exam-check").click();
    const choice = page.locator(".exam-choice.is-key, .exam-choice.is-miss").first();
    await expect(choice).toBeVisible();
    const label = await pseudoContent(choice);
    expect(label === '"正確答案"' || label === '"你的選擇"').toBeTruthy();
  });
});
