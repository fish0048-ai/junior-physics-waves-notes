/**
 * 正規化作答文字，方便填充題比對。
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeAnswer(value) {
  if (value == null) return "";
  return String(value)
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[，,；;。．.！!？?：:]/g, "")
    .toLowerCase();
}

/**
 * 正規化選擇題選項（只取 A–D／甲–丁 等常見標籤）。
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeChoice(value) {
  const raw = String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toUpperCase();
  if (!raw) return "";

  const latin = raw.match(/[A-D]/);
  if (latin) return latin[0];

  const map = { 甲: "A", 乙: "B", 丙: "C", 丁: "D", "１": "A", "２": "B", "３": "C", "４": "D", "1": "A", "2": "B", "3": "C", "4": "D" };
  for (const [k, v] of Object.entries(map)) {
    if (raw.includes(k)) return v;
  }
  return normalizeAnswer(raw);
}

/**
 * 判斷學生答案是否命中標準答案或同義答案。
 * @param {{ type: string, answer: string, aliases?: string[] }} item
 * @param {unknown} studentRaw
 * @returns {boolean}
 */
export function matchesAnswer(item, studentRaw) {
  if (studentRaw == null) return false;
  const student = String(studentRaw).trim();
  if (!student || student.toLowerCase() === "unreadable") return false;

  const candidates = [item.answer, ...(item.aliases || [])].filter((x) => x != null && String(x).length > 0);
  if (item.type === "choice") {
    const s = normalizeChoice(student);
    return candidates.some((c) => normalizeChoice(c) === s);
  }

  const s = normalizeAnswer(student);
  return candidates.some((c) => normalizeAnswer(c) === s);
}
