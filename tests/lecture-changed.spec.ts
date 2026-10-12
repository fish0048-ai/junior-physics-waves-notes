import { expect, test, type Page, type TestInfo } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { blockRemoteWrites, collectMajorErrors, expectNoMajorErrors } from "./helpers";

const MOBILE = { width: 375, height: 812 };

function changedPaths(): string[] {
  const raw = process.env.LECTURE_CHANGED_PATHS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^(\/)?(sections|exams)\/.+\.html$/.test(s.replace(/^\//, "")))
    .map((s) => (s.startsWith("/") ? s : `/${s.replace(/^\//, "")}`));
}

async function openChangedPage(page: Page, urlPath: string) {
  await blockRemoteWrites(page);
  const response = await page.goto(urlPath, { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();
  await page.waitForLoadState("networkidle");
}

async function waitKatexIfNeeded(page: Page) {
  const formulaCount = await page.locator(".formula").count();
  if (formulaCount === 0) return;
  await expect
    .poll(async () => page.locator(".formula .katex, .formula .katex-display").count(), {
      timeout: 15_000,
      message: ".formula 應由 KaTeX 排版",
    })
    .toBeGreaterThan(0);
  const raw = await page.locator(".formula").allInnerTexts();
  for (const block of raw) {
    expect(block, "不應顯示裸露 \\[...\\]").not.toMatch(/\\[\[\(]/);
  }
}

function artifactDir(testInfo: TestInfo, slug: string) {
  const dir = path.join(testInfo.outputDir, "lecture-changed", slug);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

test.describe("變更講義頁", { tag: "@lecture" }, () => {
  test.use({ serviceWorkers: "block" });

  const paths = changedPaths();

  if (paths.length === 0) {
    test("略過（無 LECTURE_CHANGED_PATHS）", () => {
      test.skip();
    });
  }

  for (const urlPath of paths) {
    const slug = urlPath.replace(/^\//, "").replace(/[/.]/g, "-");

    test(`${urlPath}：手機版面無明顯溢出`, async ({ page }, testInfo) => {
      await page.setViewportSize(MOBILE);
      const errors = collectMajorErrors(page);
      await openChangedPage(page, urlPath);
      await waitKatexIfNeeded(page);
      const overflow = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        body: document.body.scrollWidth - document.body.clientWidth,
      }));
      expect(overflow.doc).toBeLessThanOrEqual(4);
      expect(overflow.body).toBeLessThanOrEqual(4);
      await expectNoMajorErrors(errors);
      const shot = await page.screenshot({ fullPage: true });
      await testInfo.attach(`${slug}-mobile.png`, { body: shot, contentType: "image/png" });
      fs.writeFileSync(path.join(artifactDir(testInfo, slug), "mobile.png"), shot);
    });
  }
});
