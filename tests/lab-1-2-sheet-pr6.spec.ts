import { expect, test, type Page, type TestInfo } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const SHEET = "/sections/lab-1-2-sheet.html";
const PR6_MARKERS = ["必交", "誤差提醒", "一般木炭不等於活性碳"];

const viewports = [
  { name: "手機375", width: 375, height: 812 },
  { name: "平板768", width: 768, height: 1024 },
  { name: "桌面1280", width: 1280, height: 800 },
];

async function openLabSheet(page: Page) {
  await page.route("https://api.github.com/**", (route) => route.abort());
  await page.route("https://gist.githubusercontent.com/**", (route) => route.abort());
  const response = await page.goto(SHEET);
  expect(response?.ok()).toBeTruthy();
  expect(new URL(page.url()).hostname).toBe("127.0.0.1");
  await page.waitForLoadState("networkidle");
  await expect.poll(async () => page.locator("#p-d").count(), { timeout: 15_000 }).toBe(1);
}

async function waitForSheetReady(page: Page) {
  await openLabSheet(page);
  for (const text of PR6_MARKERS) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 12_000 });
  }
  await expect
    .poll(async () => page.locator("#p-d .katex").count(), { timeout: 12_000, message: "KaTeX 應渲染密度公式" })
    .toBeGreaterThan(0);
  await page.waitForFunction(() => {
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>(".lab-sheet img"));
    return imgs.every((img) => img.complete && img.naturalWidth > 0);
  });
}

function pdfPageCount(buffer: Buffer): number {
  const raw = buffer.toString("latin1");
  const matches = raw.match(/\/Type\s*\/Page\b/g);
  return matches ? matches.length : 0;
}

function ensureArtifactDir(testInfo: TestInfo) {
  const dir = path.join(testInfo.outputDir, "pr6-lab-sheet");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function attachPdf(testInfo: TestInfo, name: string, buffer: Buffer) {
  const dir = ensureArtifactDir(testInfo);
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, buffer);
  await testInfo.attach(name, { body: buffer, contentType: "application/pdf" });
  return { filePath, pages: pdfPageCount(buffer) };
}

test.describe("PR #6｜1-2 實驗學習單", () => {
  test.use({ serviceWorkers: "block" });

  test("KaTeX：密度公式已排版且無裸露 \\(...\\)", async ({ page }) => {
    await waitForSheetReady(page);
    const katex = page.locator("#p-d .katex").first();
    await expect(katex).toBeVisible();
    const html = await page.locator("#p-d .sheet-prompt-line").filter({ hasText: "密度" }).innerHTML();
    expect(html).not.toMatch(/\\\(D=\\dfrac\{M\}\{V\}\\\)/);
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    await page.reload();
    await waitForSheetReady(page);
    expect(consoleErrors.filter((t) => !/favicon/i.test(t))).toEqual([]);
  });

  test("列印 PDF：A4／B4 頁數與 #p-d 換頁、答案詳解同頁", async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await waitForSheetReady(page);
    await page.emulateMedia({ media: "print" });

    const printLayout = await page.evaluate(() => {
      const pd = document.querySelector("#p-d");
      const answer = document.querySelector(".sheet-answer-line");
      const explain = document.querySelector(".sheet-explain-grow");
      const stem = document.querySelector(".sheet-write-stem");
      if (!pd || !answer || !explain || !stem) return { ok: false as const, reason: "missing nodes" };
      const pdStyle = getComputedStyle(pd);
      const breakBefore = pdStyle.breakBefore || pdStyle.pageBreakBefore;
      const a = answer.getBoundingClientRect();
      const e = explain.getBoundingClientRect();
      const pageH = 1050;
      const aPage = Math.floor((a.top + window.scrollY) / pageH);
      const ePage = Math.floor((e.top + window.scrollY) / pageH);
      return {
        ok: true as const,
        breakBefore,
        answerExplainSamePage: aPage === ePage,
        stemBottom: stem.getBoundingClientRect().bottom + window.scrollY,
        answerTop: a.top + window.scrollY,
      };
    });
    expect(printLayout.ok).toBe(true);
    if (printLayout.ok) {
      expect(String(printLayout.breakBefore)).toMatch(/page|always/i);
      expect(printLayout.answerExplainSamePage).toBe(true);
    }

    await page.emulateMedia({ media: "print" });
    const a4Buf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    const b4Buf = await page.pdf({
      width: "250mm",
      height: "353mm",
      printBackground: true,
      preferCSSPageSize: true,
    });

    const a4 = await attachPdf(testInfo, "lab-1-2-sheet-a4.pdf", Buffer.from(a4Buf));
    const b4 = await attachPdf(testInfo, "lab-1-2-sheet-b4.pdf", Buffer.from(b4Buf));

    expect(a4.pages).toBeGreaterThanOrEqual(2);
    expect(a4.pages).toBeLessThanOrEqual(6);
    expect(b4.pages).toBeGreaterThanOrEqual(2);
    expect(b4.pages).toBeLessThanOrEqual(5);

    test.info().annotations.push({ type: "A4 pages", description: String(a4.pages) });
    test.info().annotations.push({ type: "B4 pages", description: String(b4.pages) });
  });

  for (const vp of viewports) {
    test(`RWD ${vp.name}：無水平溢出、組員表與 #p-d 可見`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await waitForSheetReady(page);
      const overflow = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        body: document.body.scrollWidth - document.body.clientWidth,
      }));
      expect(overflow.doc).toBeLessThanOrEqual(2);
      expect(overflow.body).toBeLessThanOrEqual(2);
      await expect(page.locator(".sheet-members")).toBeVisible();
      await expect(page.locator("#p-d")).toBeVisible();
      await expect(page.locator(".sheet-c-fig svg")).toBeVisible();
      const shot = await page.screenshot({ fullPage: true });
      await testInfo.attach(`rwd-${vp.name}.png`, { body: shot, contentType: "image/png" });
    });
  }
});
