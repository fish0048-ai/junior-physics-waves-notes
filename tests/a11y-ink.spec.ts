import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { name: "手機", width: 390, height: 844 },
  { name: "平板", width: 768, height: 1024 },
];

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function openInk(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.route("https://api.github.com/**", (route) => route.abort());
  await page.route("https://gist.githubusercontent.com/**", (route) => route.abort());
  const response = await page.goto("/sections/4-1.html");
  expect(response?.ok()).toBeTruthy();
  await page.evaluate(() => {
    document.body.classList.add("ink-draw");
    const panel = document.getElementById("ink-panel");
    const stop = document.getElementById("ink-stop");
    if (panel) panel.hidden = false;
    if (stop) stop.hidden = false;
  });
}

test.describe("筆記按鈕尺寸", () => {
  test.use({ serviceWorkers: "block" });

  for (const viewport of viewports) {
    test(`${viewport.name}的筆記按鈕至少 44px 且不壓到頂欄`, async ({ page }) => {
      await openInk(page, viewport.width, viewport.height);
      const selectors = ["#ink-stop", "#ink-add-class", "#ink-undo", "#ink-clear", "[data-ink-tool='pen']", "[data-ink-color]"];
      for (const selector of selectors) {
        const box = await page.locator(selector).first().boundingBox();
        expect(box, selector).not.toBeNull();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      const toolbar = await page.locator("#btn-answers").boundingBox();
      const ink = await page.locator("#ink-add-class").boundingBox();
      const pen = await page.locator("[data-ink-tool='pen']").boundingBox();
      const eraser = await page.locator("[data-ink-tool='eraser']").boundingBox();
      expect(toolbar).not.toBeNull();
      expect(ink).not.toBeNull();
      expect(pen).not.toBeNull();
      expect(eraser).not.toBeNull();
      expect(overlaps(toolbar!, ink!)).toBeFalsy();
      expect(overlaps(pen!, eraser!)).toBeFalsy();
    });
  }
});
