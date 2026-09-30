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
 * @param {import("./grade.js").StudentReport[]} reports
 * @param {{ title?: string }} meta
 */
export function buildCsv(reports, meta = {}) {
  const header = [
    "座號",
    "姓名",
    "標籤",
    "得分",
    "滿分",
    "答對題數",
    "錯題",
    "讀不到",
    "缺題",
    "備註",
  ];
  const lines = [header.map(csvEscape).join(",")];
  for (const r of reports) {
    lines.push(
      [
        r.seat || "",
        r.name || "",
        r.label,
        r.score,
        r.maxScore,
        r.correctCount,
        r.wrong.map((w) => `${w.id}(作答:${w.student ?? ""}/正解:${w.expected})`).join("；"),
        r.unreadable.map((u) => u.id).join("；"),
        r.missing.map((m) => m.id).join("；"),
        r.notes || "",
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  if (meta.title) {
    lines.unshift(`# ${meta.title}`);
  }
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
 * @param {import("./grade.js").StudentReport[]} reports
 * @param {{ title?: string, generatedAt?: string }} meta
 */
export function buildHtml(reports, meta = {}) {
  const title = meta.title || "紙本作業批改報表";
  const generatedAt = meta.generatedAt || new Date().toISOString();
  const rows = reports
    .map((r) => {
      const wrongHtml =
        r.wrong.length === 0
          ? "<span class=\"ok\">無</span>"
          : `<ul>${r.wrong
              .map(
                (w) =>
                  `<li>第 ${escHtml(w.id)} 題：作答「${escHtml(w.student)}」／正解「${escHtml(w.expected)}」</li>`
              )
              .join("")}</ul>`;
      const unread =
        r.unreadable.length === 0
          ? "<span class=\"ok\">無</span>"
          : escHtml(r.unreadable.map((u) => u.id).join("、"));
      const missing =
        r.missing.length === 0
          ? "<span class=\"ok\">無</span>"
          : escHtml(r.missing.map((m) => m.id).join("、"));
      return `<tr>
  <td>${escHtml(r.seat || "")}</td>
  <td>${escHtml(r.name || "")}</td>
  <td>${escHtml(r.label)}</td>
  <td class="score">${r.score} / ${r.maxScore}</td>
  <td>${wrongHtml}</td>
  <td>${unread}</td>
  <td>${missing}</td>
</tr>`;
    })
    .join("\n");

  const cards = reports
    .map((r) => {
      const lines = [];
      if (r.wrong.length) {
        lines.push(
          `<p><strong>請訂正錯題：</strong></p><ul>${r.wrong
            .map(
              (w) =>
                `<li>第 ${escHtml(w.id)} 題（你的答案：${escHtml(w.student)}；正確答案：${escHtml(w.expected)}）</li>`
            )
            .join("")}</ul>`
        );
      }
      if (r.unreadable.length) {
        lines.push(
          `<p><strong>讀不到、請重新拍照再繳：</strong> ${escHtml(
            r.unreadable.map((u) => `第 ${u.id} 題`).join("、")
          )}</p>`
        );
      }
      if (!r.wrong.length && !r.unreadable.length && !r.missing.length) {
        lines.push(`<p class="ok">全部可讀題目皆正確，請自行核對後保管作業。</p>`);
      }
      return `<section class="card">
  <h2>${escHtml(r.seat || "")} ${escHtml(r.name || r.label)}　${r.score}/${r.maxScore}</h2>
  ${lines.join("\n")}
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
  .score { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .ok { color: #1b7f3a; }
  ul { margin: .2rem 0 .2rem 1.1rem; padding: 0; }
  .card { background: #fff; border: 1px solid var(--line); padding: 1rem 1.1rem; margin-bottom: .9rem; }
  .card h2 { font-size: 1.05rem; margin: 0 0 .5rem; color: var(--accent); }
  @media print {
    body { background: #fff; }
    .card { break-inside: avoid; }
  }
</style>
</head>
<body>
<main>
  <h1>${escHtml(title)}</h1>
  <p class="meta">產生時間：${escHtml(generatedAt)}　｜　共 ${reports.length} 位　｜　本報表方便老師貼給學生自行批改與訂正</p>
  <h2>全班總表</h2>
  <table>
    <thead>
      <tr><th>座號</th><th>姓名</th><th>標籤</th><th>分數</th><th>錯題</th><th>讀不到</th><th>缺題</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
  <h2>個別錯題清單（可貼 Classroom 私人留言）</h2>
${cards}
</main>
</body>
</html>
`;
}

/**
 * @param {string} outDir
 * @param {import("./grade.js").StudentReport[]} reports
 * @param {{ title?: string }} meta
 */
export async function writeReports(outDir, reports, meta = {}) {
  const abs = path.resolve(outDir);
  await fs.mkdir(abs, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = `grade-report-${stamp}`;
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

  // 穩定檔名方便 demo／腳本接續
  await fs.writeFile(path.join(abs, "latest.csv"), buildCsv(reports, meta), "utf8");
  await fs.writeFile(path.join(abs, "latest.html"), buildHtml(reports, { ...meta, generatedAt }), "utf8");
  await fs.writeFile(
    path.join(abs, "latest.json"),
    JSON.stringify({ title: meta.title, generatedAt, students: reports }, null, 2),
    "utf8"
  );

  return { csvPath, htmlPath, jsonPath, dir: abs };
}
