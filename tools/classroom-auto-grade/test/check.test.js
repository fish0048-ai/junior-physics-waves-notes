import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import os from "node:os";
import AdmZip from "adm-zip";
import { deriveStatus, buildStudentReport } from "../src/check.js";
import { parseStudentLabel, loadSubmissions, resolveInputRoot } from "../src/ingest.js";
import { checkSubmission } from "../src/vision.js";
import { buildCsv, buildHtml } from "../src/report.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = path.join(root, "fixtures");

test("deriveStatus：完成／未完成／看不清", () => {
  assert.equal(deriveStatus({ readable: false, hasMarked: true, hasCorrected: true }), "看不清");
  assert.equal(deriveStatus({ readable: true, hasMarked: true, hasCorrected: true }), "完成");
  assert.equal(deriveStatus({ readable: true, hasMarked: true, hasCorrected: false }), "未完成");
  assert.equal(deriveStatus({ readable: true, hasMarked: false, hasCorrected: false }), "未完成");
});

test("看不清時忽略模型對批改／訂正的猜測", () => {
  const report = buildStudentReport(
    { seat: "04", name: "張模糊", label: "04-張模糊" },
    {
      readable: false,
      hasMarked: true,
      hasCorrected: true,
      evidence: "反光",
      provider: "mock",
    }
  );
  assert.equal(report.status, "看不清");
  assert.equal(report.hasMarked, false);
  assert.equal(report.hasCorrected, false);
});

test("parseStudentLabel", () => {
  assert.deepEqual(parseStudentLabel("01-王小明"), {
    seat: "01",
    name: "王小明",
    label: "01-王小明",
  });
});

test("fixtures 四種情境（mock）", async () => {
  const students = await loadSubmissions(path.join(fixtures, "submissions"));
  assert.equal(students.length, 4);

  const byLabel = {};
  for (const s of students) {
    byLabel[s.label] = await checkSubmission(s, { provider: "mock" });
  }

  assert.equal(byLabel["01-王小明"].status, "完成");
  assert.equal(byLabel["01-王小明"].hasMarked, true);
  assert.equal(byLabel["01-王小明"].hasCorrected, true);

  assert.equal(byLabel["02-李小華"].status, "未完成");
  assert.equal(byLabel["02-李小華"].hasMarked, true);
  assert.equal(byLabel["02-李小華"].hasCorrected, false);

  assert.equal(byLabel["03-陳大同"].status, "未完成");
  assert.equal(byLabel["03-陳大同"].hasMarked, false);
  assert.equal(byLabel["03-陳大同"].hasCorrected, false);

  assert.equal(byLabel["04-張模糊"].status, "看不清");
  assert.equal(byLabel["04-張模糊"].hasMarked, false);
  assert.equal(byLabel["04-張模糊"].hasCorrected, false);
  assert.match(byLabel["04-張模糊"].evidence, /反光|模糊/);
});

test("ZIP 輸入可檢查", async () => {
  const tmpZip = path.join(os.tmpdir(), `jpwn-check-${Date.now()}.zip`);
  const zip = new AdmZip();
  const img = await fs.readFile(path.join(fixtures, "submissions/01-王小明/page1.png"));
  const check = await fs.readFile(path.join(fixtures, "submissions/01-王小明/check.json"));
  zip.addFile("pack/05-測ZIP/page1.png", img);
  zip.addFile("pack/05-測ZIP/check.json", check);
  zip.writeZip(tmpZip);

  const resolved = await resolveInputRoot(tmpZip);
  try {
    const students = await loadSubmissions(resolved.root);
    assert.equal(students.length, 1);
    const report = await checkSubmission(students[0], { provider: "mock" });
    assert.equal(report.status, "完成");
  } finally {
    if (resolved.cleanup) await resolved.cleanup();
    await fs.rm(tmpZip, { force: true });
  }
});

test("報表含新欄位", () => {
  const reports = [
    {
      seat: "01",
      name: "王小明",
      label: "01-王小明",
      hasMarked: true,
      hasCorrected: true,
      status: "完成",
      evidence: "有紅筆勾與訂正",
    },
    {
      seat: "04",
      name: "張模糊",
      label: "04-張模糊",
      hasMarked: false,
      hasCorrected: false,
      status: "看不清",
      evidence: "反光",
    },
  ];
  const csv = buildCsv(reports, { title: "測試" });
  assert.match(csv, /有批改/);
  assert.match(csv, /有訂正/);
  assert.match(csv, /看不清/);
  assert.doesNotMatch(csv, /得分|滿分|錯題/);

  const html = buildHtml(reports, { title: "測試" });
  assert.match(html, /不對答案/);
  assert.match(html, /異色訂正/);
  assert.doesNotMatch(html, /請訂正錯題：/);
});
