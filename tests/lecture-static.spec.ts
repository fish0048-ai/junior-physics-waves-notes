import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

/** 高信心簡體字／詞（講義應為繁中） */
const SIMPLIFIED_CHARS = /[这国学软网视频据库质优测验]/;
const SIMPLIFIED_WORDS = [
  "软件",
  "网络",
  "视频",
  "数据库",
  "默认",
  "优化",
  "实验",
  "质量",
  "体积",
  "测量",
  "误差",
  "过滤",
];

/** 對照 jpwn-math：禁止當正式公式的字面樣式 */
const BAD_MATH_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "g/cm 3（上標被空格拆開）", re: /g\/cm\s+3/ },
  { name: "cm 3（未排成上標）", re: /\bcm\s+3\b/ },
  { name: "全形等號當公式", re: /[＝／×÷]/ },
  { name: "裸露 \\(...\\) 密度式（應由 KaTeX 渲染）", re: /\\\(D=\\dfrac\{M\}\{V\}\\\)/ },
];

/** 1-2 學習單：關鍵教學用語（科學／流程一致性） */
const LAB_SHEET_SCIENCE: Array<{ file: string; mustInclude: string[] }> = [
  {
    file: "sections/lab-1-2-sheet.html",
    mustInclude: [
      "M<sub>量筒</sub>",
      "誤差提醒",
      "截留",
      "必交",
      "一般木炭不等於活性碳",
    ],
  },
];

function changedPaths(): string[] {
  const raw = process.env.LECTURE_CHANGED_PATHS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function readRepoFile(rel: string): string {
  const full = path.join(process.cwd(), rel);
  expect(fs.existsSync(full), `找不到 ${rel}`).toBeTruthy();
  return fs.readFileSync(full, "utf8");
}

test.describe("講義靜態檢查", { tag: "@lecture" }, () => {
  const paths = changedPaths();

  if (paths.length === 0) {
    test("略過（無 LECTURE_CHANGED_PATHS）", () => {
      test.skip();
    });
  }

  for (const rel of paths) {
    test(`${rel}：繁體中文`, () => {
      const content = readRepoFile(rel);
      const charHit = content.match(SIMPLIFIED_CHARS);
      expect(charHit, `疑似簡體字：${charHit?.[0] ?? ""}`).toBeNull();
      for (const word of SIMPLIFIED_WORDS) {
        expect(content, `疑似簡體詞：${word}`).not.toContain(word);
      }
    });

    test(`${rel}：公式與符號字面`, () => {
      const content = readRepoFile(rel);
      for (const rule of BAD_MATH_PATTERNS) {
        if (rule.name.includes("全形")) {
          const formulas = [...content.matchAll(/class="formula"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => m[1]);
          for (const block of formulas.length ? formulas : [""]) {
            if (!block) continue;
            expect(block, rule.name).not.toMatch(rule.re);
          }
          continue;
        }
        expect(content, rule.name).not.toMatch(rule.re);
      }
    });
  }

  for (const rule of LAB_SHEET_SCIENCE) {
    test(`${rule.file}：關鍵科學／教學用語`, () => {
      if (!paths.includes(rule.file) && process.env.CI_FORCE_LAB_SHEET_STATIC !== "1") {
        test.skip();
        return;
      }
      const content = readRepoFile(rule.file);
      for (const phrase of rule.mustInclude) {
        expect(content, `應包含：${phrase}`).toContain(phrase);
      }
    });
  }
});
