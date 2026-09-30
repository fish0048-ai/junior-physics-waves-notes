import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * @typedef {{ id: string, raw: string|null, status: "ok"|"unreadable"|"missing" }} ExtractedAnswer
 * @typedef {{ answers: ExtractedAnswer[], provider: string, model?: string, notes?: string }} ExtractionResult
 */

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

/**
 * 讀取同目錄的 mock 抽答案檔（測試／無 API key）。
 * 優先：studentDir/extracted.json；其次：與第一張圖同名的 .extracted.json
 * @param {import("./ingest.js").StudentSubmission} student
 * @param {{ id: string }[]} items
 * @returns {Promise<ExtractionResult|null>}
 */
async function tryLoadMockExtraction(student, items) {
  const candidates = [
    path.join(student.sourceDir, "extracted.json"),
  ];
  if (student.images[0]) {
    const base = student.images[0].replace(/\.[^.]+$/, "");
    candidates.push(`${base}.extracted.json`);
  }

  for (const file of candidates) {
    try {
      const raw = await fs.readFile(file, "utf8");
      const data = JSON.parse(raw);
      const map = new Map();
      for (const a of data.answers || []) {
        map.set(String(a.id), a);
      }
      const answers = items.map((item) => {
        const hit = map.get(item.id);
        if (!hit) {
          return { id: item.id, raw: null, status: "missing" };
        }
        const status = hit.status === "unreadable" || hit.status === "missing" || hit.status === "ok"
          ? hit.status
          : hit.raw == null || String(hit.raw).trim() === ""
            ? "unreadable"
            : "ok";
        return {
          id: item.id,
          raw: hit.raw == null ? null : String(hit.raw),
          status,
        };
      });
      return {
        answers,
        provider: "mock",
        notes: `from ${path.basename(file)}`,
      };
    } catch {
      // try next
    }
  }
  return null;
}

function buildPrompt(items) {
  const list = items
    .map((it) => `- id=${it.id} type=${it.type}${it.prompt ? ` prompt=${JSON.stringify(it.prompt)}` : ""}`)
    .join("\n");
  return `你是國中理化紙本作業辨識助手。請只從照片讀取學生填寫／圈選的答案，不要解題。

題目清單：
${list}

規則：
1. 每題回傳 id、raw（辨識到的作答文字）、status。
2. status 只能是 ok 或 unreadable。看不清、被遮住、空白、無法判斷時用 unreadable，raw 設 null。
3. 選擇題 raw 盡量回傳 A/B/C/D（或甲乙丙丁原樣亦可）。
4. 填充題 raw 回傳學生寫下的文字，保留數字與單位若有寫。
5. 只輸出 JSON 物件，格式：{"answers":[{"id":"1","raw":"A","status":"ok"}, ...]}
6. 必須涵蓋清單中每一題 id。`;
}

function parseModelJson(text) {
  const trimmed = String(text || "").trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("模型未回傳 JSON 物件");
  }
  return JSON.parse(body.slice(start, end + 1));
}

/**
 * 使用 Gemini 多模態從照片抽答案。
 * @param {import("./ingest.js").StudentSubmission} student
 * @param {import("./answer-key.js").AnswerItem[]} items
 * @param {{ apiKey: string, model: string }} opts
 * @returns {Promise<ExtractionResult>}
 */
async function extractWithGemini(student, items, opts) {
  if (!student.images.length) {
    return {
      answers: items.map((it) => ({ id: it.id, raw: null, status: "unreadable" })),
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
  parts.push({ text: buildPrompt(items) });

  const result = await model.generateContent({ contents: [{ role: "user", parts }] });
  const text = result.response.text();
  const parsed = parseModelJson(text);
  const map = new Map();
  for (const a of parsed.answers || []) {
    map.set(String(a.id), a);
  }

  const answers = items.map((item) => {
    const hit = map.get(item.id);
    if (!hit) return { id: item.id, raw: null, status: "missing" };
    let status = hit.status === "unreadable" ? "unreadable" : "ok";
    let raw = hit.raw == null ? null : String(hit.raw).trim();
    if (!raw) {
      status = "unreadable";
      raw = null;
    }
    if (status === "unreadable") raw = null;
    return { id: item.id, raw, status };
  });

  return { answers, provider: "gemini", model: opts.model };
}

/**
 * @param {import("./ingest.js").StudentSubmission} student
 * @param {import("./answer-key.js").AnswerItem[]} items
 * @param {{ provider: "gemini"|"mock"|"auto", apiKey?: string, model?: string }} opts
 * @returns {Promise<ExtractionResult>}
 */
export async function extractAnswers(student, items, opts) {
  const provider = opts.provider || "auto";

  if (provider === "mock") {
    const mock = await tryLoadMockExtraction(student, items);
    if (!mock) {
      throw new Error(
        `provider=mock 但找不到 extracted.json：${student.sourceDir}（請放 fixtures 抽答案檔或改用 gemini）`
      );
    }
    return mock;
  }

  if (provider === "auto") {
    const mock = await tryLoadMockExtraction(student, items);
    if (mock) return mock;
  }

  if (!opts.apiKey) {
    throw new Error(
      "缺少 GEMINI_API_KEY。請在 tools/classroom-auto-grade/.env 設定，或使用 --provider mock 搭配 extracted.json"
    );
  }

  return extractWithGemini(student, items, {
    apiKey: opts.apiKey,
    model: opts.model || "gemini-2.0-flash",
  });
}
