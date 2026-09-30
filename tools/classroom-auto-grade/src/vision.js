import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildStudentReport } from "./check.js";

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
};

function mimeFor(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || "image/jpeg";
}

const CHECK_PROMPT = `你是國中理化紙本作業檢查助手。老師**不要**對標準答案、也不要判斷學生答對或答錯。
你的唯一任務：從照片判斷學生是否**自行批改與訂正**。

判準（務必遵守）：
1. 有批改（hasMarked）：對的題目有打勾，或整面有一個大勾；錯的有劃掉並補上正確答案（這些痕跡算批改）。
2. 有訂正（hasCorrected）：錯題上有**另外顏色**的筆跡（與原作答明顯不同色，例如紅筆訂正藍筆原答）。
3. 看不清：照片模糊、裁切嚴重、反光、過暗／過曝導致無法判斷 → readable=false。此時不要猜測已完成；hasMarked／hasCorrected 一律 false。

注意：
- 不要核對答案對錯，不要計分。
- 只有勾、沒有異色訂正筆跡 → hasMarked=true, hasCorrected=false。
- 完全沒有勾、劃掉、補答案、異色筆跡 → 兩者皆 false。
- evidence 用一句簡短繁體中文說明你看見什麼（例如：「可見紅筆勾與異色訂正字」「僅見鉛筆大勾無異色訂正」「畫面反光無法辨識筆跡」）。

只輸出 JSON 物件：
{"readable":true,"hasMarked":true,"hasCorrected":true,"evidence":"……"}
`;

/**
 * mock：讀 studentDir/check.json 或與第一張圖同名的 .check.json
 * @param {import("./ingest.js").StudentSubmission} student
 */
async function tryLoadMockCheck(student) {
  const candidates = [path.join(student.sourceDir, "check.json")];
  if (student.images[0]) {
    const base = student.images[0].replace(/\.[^.]+$/, "");
    candidates.push(`${base}.check.json`);
  }
  for (const file of candidates) {
    try {
      const data = JSON.parse(await fs.readFile(file, "utf8"));
      return {
        readable: data.readable === true,
        hasMarked: data.hasMarked === true,
        hasCorrected: data.hasCorrected === true,
        evidence: typeof data.evidence === "string" ? data.evidence : "",
        provider: "mock",
        notes: `from ${path.basename(file)}`,
      };
    } catch {
      // next
    }
  }
  return null;
}

function parseModelJson(text) {
  const trimmed = String(text || "").trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("模型未回傳 JSON 物件");
  return JSON.parse(body.slice(start, end + 1));
}

/**
 * @param {import("./ingest.js").StudentSubmission} student
 * @param {{ apiKey: string, model: string }} opts
 */
async function checkWithGemini(student, opts) {
  if (!student.images.length) {
    return {
      readable: false,
      hasMarked: false,
      hasCorrected: false,
      evidence: "沒有可讀取的照片檔",
      provider: "gemini",
      model: opts.model,
      notes: "no images",
    };
  }

  const genAI = new GoogleGenerativeAI(opts.apiKey);
  const model = genAI.getGenerativeModel({
    model: opts.model,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });

  const parts = [];
  for (const img of student.images) {
    const buf = await fs.readFile(img);
    parts.push({
      inlineData: {
        mimeType: mimeFor(img),
        data: buf.toString("base64"),
      },
    });
  }
  parts.push({ text: CHECK_PROMPT });

  const result = await model.generateContent({ contents: [{ role: "user", parts }] });
  const parsed = parseModelJson(result.response.text());
  const readable = parsed.readable === true;
  return {
    readable,
    hasMarked: readable && parsed.hasMarked === true,
    hasCorrected: readable && parsed.hasCorrected === true,
    evidence: typeof parsed.evidence === "string" ? parsed.evidence : "",
    provider: "gemini",
    model: opts.model,
  };
}

/**
 * @param {import("./ingest.js").StudentSubmission} student
 * @param {{ provider?: "gemini"|"mock"|"auto", apiKey?: string, model?: string }} opts
 * @returns {Promise<import("./check.js").StudentCheckReport>}
 */
export async function checkSubmission(student, opts = {}) {
  const provider = opts.provider || "auto";
  /** @type {import("./check.js").VisionCheckResult | null} */
  let raw = null;

  if (provider === "mock") {
    raw = await tryLoadMockCheck(student);
    if (!raw) {
      throw new Error(
        `provider=mock 但找不到 check.json：${student.sourceDir}`
      );
    }
  } else if (provider === "auto") {
    raw = await tryLoadMockCheck(student);
    if (!raw) {
      if (!opts.apiKey) {
        throw new Error(
          "缺少 GEMINI_API_KEY。請在 tools/classroom-auto-grade/.env 設定，或使用 --provider mock 搭配 check.json"
        );
      }
      raw = await checkWithGemini(student, {
        apiKey: opts.apiKey,
        model: opts.model || "gemini-2.0-flash",
      });
    }
  } else {
    if (!opts.apiKey) {
      throw new Error("缺少 GEMINI_API_KEY（--provider gemini）");
    }
    raw = await checkWithGemini(student, {
      apiKey: opts.apiKey,
      model: opts.model || "gemini-2.0-flash",
    });
  }

  return buildStudentReport(student, raw);
}

// 供測試直接呼叫
export { tryLoadMockCheck, CHECK_PROMPT };
