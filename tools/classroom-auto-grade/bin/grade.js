#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { resolveInputRoot, loadSubmissions } from "../src/ingest.js";
import { checkSubmission } from "../src/vision.js";
import { writeReports } from "../src/report.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toolRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(toolRoot, ".env") });
dotenv.config();

function printHelp() {
  console.log(`本機作業「自行批改／訂正」檢查（不接 Classroom API、不對答案計分）

用法：
  node bin/grade.js --input <資料夾或ZIP> [--out <報表目錄>] [--title <作業名稱>] [--provider auto|mock|gemini]

選項：
  --input, -i      學生照片資料夾或 ZIP（Classroom 下載後整理）
  --out, -o        報表輸出目錄（預設 ./reports）
  --title, -t      報表標題（可選）
  --provider, -p   auto（預設：有 check.json 用 mock，否則 Gemini）
                   mock（只讀 check.json，不需 API key）
                   gemini（強制呼叫 Gemini）
  --model          Gemini 模型（預設 GEMINI_MODEL 或 gemini-2.0-flash）
  --help, -h       顯示說明

判準：
  有批改  對的打勾（或整面大勾）；錯的劃掉並補正確答案
  有訂正  錯題有另外顏色的筆跡
  看不清  模糊／裁切／反光 → 標「看不清」，不要猜成完成

環境變數：GEMINI_API_KEY、GEMINI_MODEL（見 .env.example）
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
      case "--out":
      case "-o":
        out.out = next();
        break;
      case "--title":
      case "-t":
        out.title = next();
        break;
      case "--provider":
      case "-p":
        out.provider = next();
        break;
      case "--model":
        out.model = next();
        break;
      case "--answers":
      case "-a":
        throw new Error("此工具已改為「自行批改／訂正」檢查，不再接受 --answers（不對標準答案計分）");
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
  if (!args.input) {
    printHelp();
    throw new Error("必須提供 --input");
  }

  const provider = String(args.provider || "auto");
  if (!["auto", "mock", "gemini"].includes(provider)) {
    throw new Error(`--provider 必須是 auto|mock|gemini，收到：${provider}`);
  }

  const resolved = await resolveInputRoot(String(args.input));
  try {
    const students = await loadSubmissions(resolved.root);
    const title = String(args.title || "作業自行批改／訂正檢查");
    console.log(`載入 ${students.length} 位學生（${title}）｜不對答案、只看批改與訂正`);

    /** @type {import("../src/check.js").StudentCheckReport[]} */
    const reports = [];
    for (const student of students) {
      process.stdout.write(`檢查 ${student.label} ... `);
      const report = await checkSubmission(student, {
        provider: /** @type {"auto"|"mock"|"gemini"} */ (provider),
        apiKey: process.env.GEMINI_API_KEY,
        model: String(args.model || process.env.GEMINI_MODEL || "gemini-2.0-flash"),
      });
      reports.push(report);
      console.log(
        `${report.status}（批改:${report.hasMarked ? "是" : "否"}／訂正:${report.hasCorrected ? "是" : "否"}）[${report.provider}]`
      );
    }

    reports.sort((a, b) => String(a.seat || a.label).localeCompare(String(b.seat || b.label), "zh-Hant"));

    const outDir = String(args.out || path.join(process.cwd(), "reports"));
    const written = await writeReports(outDir, reports, { title });
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
