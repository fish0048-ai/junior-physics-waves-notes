import fs from "node:fs/promises";
import path from "node:path";

/**
 * @typedef {{ id: string, type: "choice"|"fill", answer: string, aliases?: string[], points?: number, prompt?: string }} AnswerItem
 * @typedef {{ title?: string, items: AnswerItem[] }} AnswerKey
 */

/**
 * 載入並驗證答案檔 JSON。
 * @param {string} filePath
 * @returns {Promise<AnswerKey>}
 */
export async function loadAnswerKey(filePath) {
  const abs = path.resolve(filePath);
  const raw = await fs.readFile(abs, "utf8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error(`答案檔不是合法 JSON：${abs}\n${err.message}`);
  }

  if (!data || !Array.isArray(data.items) || data.items.length === 0) {
    throw new Error(`答案檔必須含非空 items 陣列：${abs}`);
  }

  const seen = new Set();
  const items = data.items.map((item, idx) => {
    if (!item || typeof item !== "object") {
      throw new Error(`items[${idx}] 必須是物件`);
    }
    const id = String(item.id ?? "").trim();
    if (!id) throw new Error(`items[${idx}] 缺少 id`);
    if (seen.has(id)) throw new Error(`題號重複：${id}`);
    seen.add(id);

    const type = String(item.type ?? "").trim();
    if (type !== "choice" && type !== "fill") {
      throw new Error(`題號 ${id} 的 type 必須是 choice 或 fill`);
    }
    if (item.answer == null || String(item.answer).trim() === "") {
      throw new Error(`題號 ${id} 缺少 answer`);
    }
    const points = item.points == null ? 1 : Number(item.points);
    if (!Number.isFinite(points) || points < 0) {
      throw new Error(`題號 ${id} 的 points 必須是非負數字`);
    }
    const aliases = Array.isArray(item.aliases)
      ? item.aliases.map((a) => String(a))
      : [];

    return {
      id,
      type,
      answer: String(item.answer),
      aliases,
      points,
      prompt: item.prompt != null ? String(item.prompt) : undefined,
    };
  });

  return {
    title: data.title != null ? String(data.title) : path.basename(abs),
    items,
  };
}

/**
 * 滿分（各題 points 加總）。
 * @param {AnswerKey} key
 */
export function totalPoints(key) {
  return key.items.reduce((sum, item) => sum + item.points, 0);
}
