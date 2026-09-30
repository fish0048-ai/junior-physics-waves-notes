import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAnswer, normalizeChoice, matchesAnswer } from "../src/normalize.js";
import { gradeStudent } from "../src/grade.js";
import { loadAnswerKey, totalPoints } from "../src/answer-key.js";
import { parseStudentLabel, loadSubmissions, resolveInputRoot } from "../src/ingest.js";
import { buildCsv, buildHtml } from "../src/report.js";
import { extractAnswers } from "../src/vision.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import os from "node:os";
import AdmZip from "adm-zip";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = path.join(root, "fixtures");

test("normalizeAnswer 去除空白與全形標點", () => {
  assert.equal(normalizeAnswer(" D ＝ M ／ V "), "d=m/v");
  assert.equal(normalizeAnswer("1 毫升"), "1毫升");
});

test("normalizeChoice 支援 A–D／甲乙／數字", () => {
  assert.equal(normalizeChoice("a"), "A");
  assert.equal(normalizeChoice("乙"), "B");
  assert.equal(normalizeChoice("選(3)"), "C");
});

test("matchesAnswer 選擇與同義填充", () => {
  const choice = { type: "choice", answer: "A", aliases: ["甲"] };
  assert.equal(matchesAnswer(choice, "甲"), true);
  assert.equal(matchesAnswer(choice, "B"), false);
  assert.equal(matchesAnswer(choice, "unreadable"), false);

  const fill = { type: "fill", answer: "D=M/V", aliases: ["密度=質量/體積"] };
  assert.equal(matchesAnswer(fill, "D＝M／V"), true);
  assert.equal(matchesAnswer(fill, "D=V/M"), false);
});

test("loadAnswerKey 與計分：全對／部分錯／讀不到", async () => {
  const key = await loadAnswerKey(path.join(fixtures, "answer-keys/sample.json"));
  assert.equal(totalPoints(key), 10);

  const allCorrect = gradeStudent(
    key,
    {
      provider: "mock",
      answers: [
        { id: "1", raw: "A", status: "ok" },
        { id: "2", raw: "B", status: "ok" },
        { id: "3", raw: "D=M/V", status: "ok" },
        { id: "4", raw: "1", status: "ok" },
      ],
    },
    { seat: "01", name: "王小明", label: "01-王小明" }
  );
  assert.equal(allCorrect.score, 10);
  assert.equal(allCorrect.wrong.length, 0);
  assert.equal(allCorrect.unreadable.length, 0);

  const partial = gradeStudent(
    key,
    {
      provider: "mock",
      answers: [
        { id: "1", raw: "A", status: "ok" },
        { id: "2", raw: "C", status: "ok" },
        { id: "3", raw: "D=V/M", status: "ok" },
        { id: "4", raw: "1", status: "ok" },
      ],
    },
    { seat: "02", name: "李小華", label: "02-李小華" }
  );
  assert.equal(partial.score, 5);
  assert.equal(partial.wrong.map((w) => w.id).join(","), "2,3");

  const blurry = gradeStudent(
    key,
    {
      provider: "mock",
      answers: [
        { id: "1", raw: null, status: "unreadable" },
        { id: "2", raw: "B", status: "ok" },
        { id: "3", raw: null, status: "unreadable" },
        { id: "4", raw: "1毫升", status: "ok" },
      ],
    },
    { seat: "03", name: "張模糊", label: "03-張模糊" }
  );
  assert.equal(blurry.score, 5);
  assert.equal(blurry.unreadable.map((u) => u.id).join(","), "1,3");
  assert.equal(blurry.wrong.length, 0);
});

test("parseStudentLabel 座號與姓名", () => {
  assert.deepEqual(parseStudentLabel("01-王小明"), { seat: "01", name: "王小明", label: "01-王小明" });
  assert.deepEqual(parseStudentLabel("李小華_12"), { seat: "12", name: "李小華", label: "李小華_12" });
  assert.equal(parseStudentLabel("07").seat, "07");
});

test("loadSubmissions 讀取樣例子資料夾", async () => {
  const students = await loadSubmissions(path.join(fixtures, "submissions"));
  assert.equal(students.length, 3);
  assert.equal(students[0].seat, "01");
  assert.ok(students[0].images.some((p) => p.endsWith("page1.png")));
});

test("ZIP 解壓後可載入", async () => {
  const tmpZip = path.join(os.tmpdir(), `jpwn-grade-test-${Date.now()}.zip`);
  const zip = new AdmZip();
  const img = await fs.readFile(path.join(fixtures, "submissions/01-王小明/page1.png"));
  const extracted = await fs.readFile(path.join(fixtures, "submissions/01-王小明/extracted.json"));
  zip.addFile("pack/05-測ZIP/page1.png", img);
  zip.addFile("pack/05-測ZIP/extracted.json", extracted);
  zip.writeZip(tmpZip);

  const resolved = await resolveInputRoot(tmpZip);
  try {
    const students = await loadSubmissions(resolved.root);
    assert.equal(students.length, 1);
    assert.equal(students[0].seat, "05");
    const key = await loadAnswerKey(path.join(fixtures, "answer-keys/sample.json"));
    const extraction = await extractAnswers(students[0], key.items, { provider: "mock" });
    const report = gradeStudent(key, extraction, students[0]);
    assert.equal(report.score, 10);
  } finally {
    if (resolved.cleanup) await resolved.cleanup();
    await fs.rm(tmpZip, { force: true });
  }
});

test("報表 CSV／HTML 含錯題與讀不到", () => {
  const reports = [
    {
      seat: "02",
      name: "李小華",
      label: "02-李小華",
      score: 5,
      maxScore: 10,
      correctCount: 2,
      wrong: [{ id: "2", type: "choice", status: "wrong", expected: "B", student: "C", points: 2, earned: 0 }],
      unreadable: [],
      missing: [],
      items: [],
    },
    {
      seat: "03",
      name: "張模糊",
      label: "03-張模糊",
      score: 5,
      maxScore: 10,
      correctCount: 2,
      wrong: [],
      unreadable: [{ id: "1", type: "choice", status: "unreadable", expected: "A", student: null, points: 2, earned: 0 }],
      missing: [],
      items: [],
    },
  ];
  const csv = buildCsv(reports, { title: "測試" });
  assert.match(csv, /李小華/);
  assert.match(csv, /第?2|2\(作答/);
  const html = buildHtml(reports, { title: "測試" });
  assert.match(html, /讀不到/);
  assert.match(html, /請訂正錯題/);
});
