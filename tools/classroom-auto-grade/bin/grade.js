#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { loadAnswerKey } from "../src/answer-key.js";
import { resolveInputRoot, loadSubmissions } from "../src/ingest.js";
import { extractAnswers } from "../src/vision.js";
import { gradeStudent } from "../src/grade.js";
import { writeReports } from "../src/report.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toolRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(toolRoot, ".env") });
dotenv.config(); // 也允許從 cwd 讀

function printHelp() {
  console.log(`本機紙本作業自動批改（不接 Classroom API）

用法：
  node bin/grade.js --input <資料夾或ZIP> --answers <答案JSON> [--out <報表目錄>] [--provider auto|mock|gemini]

選項：
  --input, -i      學生照片資料夾或 ZIP（Classroom 下載後整理）
  --answers, -a    標準答案 JSON
  --out, -o        報表輸出目錄（預設 ./reports）
  --provider, -p   auto（預設：有 extracted.json 用 mock，否則 Gemini）
                   mock（只讀 extracted.json，不需 API key）
                   gemini（強制呼叫 Gemini）
  --model          Gemini 模型名稱（預設 GEMINI_MODEL 或 gemini-2.0-flash）
  --help, -h       顯示說明

環境變數（tools/classroom-auto-grade/.env）：
  GEMINI_API_KEY   Google AI Studio API 金鑰
  GEMINI_MODEL     可選

檔名規則見 README.md。
`);
}

/**
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  /** @type {Record<string, string|boolean>} */
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v == null || v.startsWith("-")) throw new Error(`選項 ${a} 需要參數`);
      return v;
    };
    switch (a) {
      case "--help":
      case "-h":
        out.help = true;
        break;
      case "--input":
      case "-i":
        out.input = next();
        break;
      case "--answers":
      case "-a":
        out.answers = next();
        break;
      case "--out":
      case "-o":
        out.out = next();
        break;
      case "--provider":
      case "-p":
        out.provider = next();
        break;
      case "--model":
        out.model = next();
        break;
      default:
        if (a.startsWith("-")) throw new Error(`未知選項：${a}`);
        throw new Error(`多餘參數：${a}`);
    }
  }
  return out;
}

/**
 * @param {string[]} argv
 */
export async function runCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return { ok: true, helped: true };
  }
  if (!args.input || !args.answers) {
    printHelp();
    throw new Error("必須提供 --input 與 --answers");
  }

  const provider = String(args.provider || "auto");
  if (!["auto", "mock", "gemini"].includes(provider)) {
    throw new Error(`--provider 必須是 auto|mock|gemini，收到：${provider}`);
  }

  const key = await loadAnswerKey(String(args.answers));
  const resolved = await resolveInputRoot(String(args.input));
  try {
    const students = await loadSubmissions(resolved.root);
    console.log(`載入 ${students.length} 位學生，題數 ${key.items.length}（${key.title}）`);

    /** @type {import("../src/grade.js").StudentReport[]} */
    const reports = [];
    for (const student of students) {
      process.stdout.write(`批改 ${student.label} ... `);
      const extraction = await extractAnswers(student, key.items, {
        provider: /** @type {"auto"|"mock"|"gemini"} */ (provider),
        apiKey: process.env.GEMINI_API_KEY,
        model: String(args.model || process.env.GEMINI_MODEL || "gemini-2.0-flash"),
      });
      const report = gradeStudent(key, extraction, student);
      reports.push(report);
      console.log(
        `${report.score}/${report.maxScore}（錯 ${report.wrong.length}／讀不到 ${report.unreadable.length}）[${extraction.provider}]`
      );
    }

    reports.sort((a, b) => String(a.seat || a.label).localeCompare(String(b.seat || b.label), "zh-Hant"));

    const outDir = String(args.out || path.join(process.cwd(), "reports"));
    const written = await writeReports(outDir, reports, { title: key.title });
    console.log(`已寫入：\n  ${written.csvPath}\n  ${written.htmlPath}\n  ${written.jsonPath}`);
    console.log(`另有 latest.csv / latest.html / latest.json 於 ${written.dir}`);
    return { ok: true, reports, written };
  } finally {
    if (resolved.cleanup) await resolved.cleanup();
  }
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirect) {
  runCli().catch((err) => {
    console.error(err.message || err);
    process.exitCode = 1;
  });
}
