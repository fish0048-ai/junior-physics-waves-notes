import fs from "node:fs/promises";
import path from "node:path";

/**
 * @param {string} value
 */
function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * @param {boolean} v
 */
function yn(v) {
  return v ? "是" : "否";
}

/**
 * @param {import("./check.js").StudentCheckReport[]} reports
 * @param {{ title?: string }} meta
 */
export function buildCsv(reports, meta = {}) {
  const header = ["座號", "姓名", "標籤", "有批改", "有訂正", "狀態", "依據", "備註"];
  const lines = [header.map(csvEscape).join(",")];
  for (const r of reports) {
    lines.push(
      [
        r.seat || "",
        r.name || "",
        r.label,
        yn(r.hasMarked),
        yn(r.hasCorrected),
        r.status,
        r.evidence,
        r.notes || "",
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  if (meta.title) lines.unshift(`# ${meta.title}`);
  return lines.join("\n") + "\n";
}

/**
 * @param {string} s
 */
function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {import("./check.js").CheckStatus} status
 */
function statusClass(status) {
  if (status === "完成") return "ok";
  if (status === "看不清") return "unread";
  return "incomplete";
}

/**
 * @param {import("./check.js").StudentCheckReport[]} reports
 * @param {{ title?: string, generatedAt?: string }} meta
 */
export function buildHtml(reports, meta = {}) {
  const title = meta.title || "作業自行批改／訂正檢查報表";
  const generatedAt = meta.generatedAt || new Date().toISOString();
  const counts = {
    完成: reports.filter((r) => r.status === "完成").length,
    未完成: reports.filter((r) => r.status === "未完成").length,
    看不清: reports.filter((r) => r.status === "看不清").length,
  };

  const rows = reports
    .map(
      (r) => `<tr class="${statusClass(r.status)}">
  <td>${escHtml(r.seat || "")}</td>
  <td>${escHtml(r.name || "")}</td>
  <td>${escHtml(r.label)}</td>
  <td>${yn(r.hasMarked)}</td>
  <td>${yn(r.hasCorrected)}</td>
  <td><strong>${escHtml(r.status)}</strong></td>
  <td>${escHtml(r.evidence)}</td>
</tr>`
    )
    .join("\n");

  const cards = reports
    .map((r) => {
      let tip = "";
      if (r.status === "完成") {
        tip = `<p class="ok">已見自行批改與異色訂正，可抽查確認。</p>`;
      } else if (r.status === "看不清") {
        tip = `<p class="unread">照片看不清，請學生重新拍照再繳，勿當成已完成。</p>`;
      } else if (r.hasMarked && !r.hasCorrected) {
        tip = `<p class="incomplete">有批改痕跡，但未見錯題的異色訂正筆跡，請提醒學生用另一色筆訂正後再繳。</p>`;
      } else {
        tip = `<p class="incomplete">未見自行批改／訂正，請提醒學生先批改訂正後再拍照繳交。</p>`;
      }
      return `<section class="card ${statusClass(r.status)}">
  <h2>${escHtml(r.seat || "")} ${escHtml(r.name || r.label)}　${escHtml(r.status)}</h2>
  <p>有批改：${yn(r.hasMarked)}　｜　有異色訂正：${yn(r.hasCorrected)}</p>
  <p><strong>依據：</strong>${escHtml(r.evidence)}</p>
  ${tip}
</section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(title)}</title>
<style>
  :root { color-scheme: light; --ink:#1a1a1a; --muted:#555; --line:#ddd; --bg:#f7f7f5; --accent:#0b5fff; }
  body { font-family: "Noto Sans TC", "Microsoft JhengHei", sans-serif; margin: 0; background: var(--bg); color: var(--ink); line-height: 1.5; }
  main { max-width: 960px; margin: 0 auto; padding: 1.5rem; }
  h1 { font-size: 1.4rem; margin: 0 0 .25rem; }
  .meta { color: var(--muted); font-size: .9rem; margin-bottom: 1.25rem; }
  table { width: 100%; border-collapse: collapse; background: #fff; margin-bottom: 2rem; }
  th, td { border: 1px solid var(--line); padding: .5rem .6rem; vertical-align: top; font-size: .92rem; }
  th { background: #eef2ff; text-align: left; }
  tr.ok td:nth-child(6) { color: #1b7f3a; }
  tr.incomplete td:nth-child(6) { color: #a15c00; }
  tr.unread td:nth-child(6) { color: #a11; }
  .ok { color: #1b7f3a; }
  .incomplete { color: #a15c00; }
  .unread { color: #a11; }
  .card { background: #fff; border: 1px solid var(--line); padding: 1rem 1.1rem; margin-bottom: .9rem; }
  .card h2 { font-size: 1.05rem; margin: 0 0 .5rem; color: var(--accent); }
  @media print { body { background: #fff; } .card { break-inside: avoid; } }
</style>
</head>
<body>
<main>
  <h1>${escHtml(title)}</h1>
  <p class="meta">產生時間：${escHtml(generatedAt)}　｜　共 ${reports.length} 位　｜　完成 ${counts.完成}／未完成 ${counts.未完成}／看不清 ${counts.看不清}</p>
  <p class="meta">判準：有批改＝打勾或錯題劃掉補答案；有訂正＝錯題另有異色筆跡。本工具<strong>不對答案、不計分</strong>。</p>
  <h2>全班總表</h2>
  <table>
    <thead>
      <tr><th>座號</th><th>姓名</th><th>標籤</th><th>有批改</th><th>有訂正</th><th>狀態</th><th>依據</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
  <h2>個別說明（可貼 Classroom 私人留言）</h2>
${cards}
</main>
</body>
</html>
`;
}

/**
 * @param {string} outDir
 * @param {import("./check.js").StudentCheckReport[]} reports
 * @param {{ title?: string }} meta
 */
export async function writeReports(outDir, reports, meta = {}) {
  const abs = path.resolve(outDir);
  await fs.mkdir(abs, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = `check-report-${stamp}`;
  const csvPath = path.join(abs, `${base}.csv`);
  const htmlPath = path.join(abs, `${base}.html`);
  const jsonPath = path.join(abs, `${base}.json`);
  const generatedAt = new Date().toISOString();

  await fs.writeFile(csvPath, buildCsv(reports, meta), "utf8");
  await fs.writeFile(htmlPath, buildHtml(reports, { ...meta, generatedAt }), "utf8");
  await fs.writeFile(
    jsonPath,
    JSON.stringify({ title: meta.title, generatedAt, students: reports }, null, 2),
    "utf8"
  );
  await fs.writeFile(path.join(abs, "latest.csv"), buildCsv(reports, meta), "utf8");
  await fs.writeFile(path.join(abs, "latest.html"), buildHtml(reports, { ...meta, generatedAt }), "utf8");
  await fs.writeFile(
    path.join(abs, "latest.json"),
    JSON.stringify({ title: meta.title, generatedAt, students: reports }, null, 2),
    "utf8"
  );

  return { csvPath, htmlPath, jsonPath, dir: abs };
}
