import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createReadStream } from "node:fs";
import AdmZip from "adm-zip";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".heic"]);

/**
 * @typedef {{ seat?: string, name?: string, label: string, images: string[], sourceDir: string }} StudentSubmission
 */

/**
 * 從檔名或資料夾名解析座號／姓名。
 * 支援：
 * - `01-王小明`、`01_王小明`、`01 王小明`
 * - `王小明-01`、`王小明_01`
 * - `01`（僅座號）
 * - `王小明`（僅姓名）
 * @param {string} label
 * @returns {{ seat?: string, name?: string, label: string }}
 */
export function parseStudentLabel(label) {
  const cleaned = String(label)
    .normalize("NFKC")
    .replace(/\.(jpe?g|png|webp|gif|bmp|tiff?|heic)$/i, "")
    .trim();

  let m = cleaned.match(/^(\d{1,3})\s*[-_－—\s]\s*(.+)$/);
  if (m) {
    return { seat: m[1].padStart(2, "0"), name: m[2].trim(), label: cleaned };
  }

  m = cleaned.match(/^(.+?)\s*[-_－—\s]\s*(\d{1,3})$/);
  if (m) {
    return { seat: m[2].padStart(2, "0"), name: m[1].trim(), label: cleaned };
  }

  if (/^\d{1,3}$/.test(cleaned)) {
    return { seat: cleaned.padStart(2, "0"), label: cleaned };
  }

  return { name: cleaned, label: cleaned };
}

function isImageFile(fileName) {
  return IMAGE_EXT.has(path.extname(fileName).toLowerCase());
}

async function listImages(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && isImageFile(e.name))
    .map((e) => path.join(dir, e.name))
    .sort((a, b) => a.localeCompare(b, "zh-Hant"));
  return files;
}

/**
 * 若輸入是 ZIP，解到暫存目錄並回傳該目錄路徑；否則回傳原路徑。
 * @param {string} inputPath
 * @returns {Promise<{ root: string, cleanup?: () => Promise<void> }>}
 */
export async function resolveInputRoot(inputPath) {
  const abs = path.resolve(inputPath);
  const st = await fs.stat(abs);
  if (st.isDirectory()) {
    return { root: abs };
  }
  if (!abs.toLowerCase().endsWith(".zip")) {
    throw new Error(`輸入必須是資料夾或 .zip：${abs}`);
  }

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "jpwn-grade-"));
  const zip = new AdmZip(abs);
  zip.extractAllTo(tmp, true);

  // 若 ZIP 只有單一頂層資料夾，直接用它當 root，避免多一層
  const top = await fs.readdir(tmp, { withFileTypes: true });
  const dirs = top.filter((e) => e.isDirectory() && e.name !== "__MACOSX");
  const files = top.filter((e) => e.isFile() && isImageFile(e.name));
  let root = tmp;
  if (dirs.length === 1 && files.length === 0) {
    root = path.join(tmp, dirs[0].name);
  }

  return {
    root,
    cleanup: async () => {
      await fs.rm(tmp, { recursive: true, force: true });
    },
  };
}

/**
 * 掃描學生繳交：優先「每生一個子資料夾」；若根目錄直接是圖片，則「一檔一生」。
 * @param {string} rootDir
 * @returns {Promise<StudentSubmission[]>}
 */
export async function loadSubmissions(rootDir) {
  const abs = path.resolve(rootDir);
  const entries = await fs.readdir(abs, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "__MACOSX")
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  const imagesAtRoot = entries
    .filter((e) => e.isFile() && isImageFile(e.name))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, "zh-Hant"));

  /** @type {StudentSubmission[]} */
  const out = [];

  if (dirs.length > 0) {
    for (const d of dirs) {
      const sourceDir = path.join(abs, d.name);
      const images = await listImages(sourceDir);
      // 也接受子資料夾內沒有圖、但有 mock extracted.json 的情況（測試用）
      const meta = parseStudentLabel(d.name);
      out.push({
        ...meta,
        images,
        sourceDir,
      });
    }
    return out;
  }

  for (const name of imagesAtRoot) {
    const meta = parseStudentLabel(name);
    out.push({
      ...meta,
      images: [path.join(abs, name)],
      sourceDir: abs,
    });
  }

  if (out.length === 0) {
    throw new Error(`在 ${abs} 找不到學生子資料夾或圖片檔`);
  }
  return out;
}

/**
 * 複製檔案（供報表附圖可選使用；目前未強制）。
 * @param {string} from
 * @param {string} to
 */
export async function copyFile(from, to) {
  await fs.mkdir(path.dirname(to), { recursive: true });
  await pipeline(createReadStream(from), createWriteStream(to));
}
