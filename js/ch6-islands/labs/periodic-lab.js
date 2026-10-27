import { ELEMENTS_Z20 } from "../config.js?v=6";
import { isCompleted, markCompleted } from "../progress.js?v=6";
import { feedbackHtml, mountLabShell } from "./lab-shell.js?v=6";

const TASK_ID = "periodic:alkali-vs-iron";

/** 前 3 週期、Z 1–18 標準位置（col 0-based, row 0-based） */
const PTABLE = [
  { z: 1, col: 0, row: 0 },
  { z: 2, col: 17, row: 0 },
  { z: 3, col: 0, row: 1 },
  { z: 4, col: 1, row: 1 },
  { z: 5, col: 12, row: 1 },
  { z: 6, col: 13, row: 1 },
  { z: 7, col: 14, row: 1 },
  { z: 8, col: 15, row: 1 },
  { z: 9, col: 16, row: 1 },
  { z: 10, col: 17, row: 1 },
  { z: 11, col: 0, row: 2 },
  { z: 12, col: 1, row: 2 },
  { z: 13, col: 12, row: 2 },
  { z: 14, col: 13, row: 2 },
  { z: 15, col: 14, row: 2 },
  { z: 16, col: 15, row: 2 },
  { z: 17, col: 16, row: 2 },
  { z: 18, col: 17, row: 2 },
  { z: 19, col: 0, row: 3 },
  { z: 20, col: 1, row: 3 },
  { z: 26, col: 7, row: 3, ghost: true },
];

const GROUP1 = new Set([1, 3, 11, 19]);
const NOTES = {
  11: "鈉：第 1 族鹼金屬，與水反應劇烈。",
  19: "鉀：同在第 1 族，比鈉更活潑。",
  26: "鐵：過渡金屬，不在第 1 族，性質與鈉、鉀不同。",
};

export function mountPeriodicLab(root, handlers) {
  const shell = mountLabShell(root, {
    title: "週期表城市 · 同族探索",
    lead: "點元素看原子序與性質。任務：選出「與鈉最像的一組」（同族），並說明為什麼不是鐵。",
    onClose: handlers.onClose,
  });

  shell.content.innerHTML = `
    <div class="ptable-wrap" aria-label="週期表前 3 週期示意">
      <div class="ptable-grid" id="pt-grid"></div>
      <aside class="ptable-info" id="pt-info">點選元素查看說明</aside>
    </div>
    <p class="lab-step"><strong>任務：</strong>「鈉（Na）和誰最像？」選兩個都正確的元素（提示：同族）。</p>
    <div class="lab-chip-row" id="pt-pick">
      ${["鈉 Na", "鉀 K", "鐵 Fe", "鎂 Mg"].map(
        (label) => `<button type="button" class="lab-chip-btn" data-pick="${label.split(" ")[1]}">${label}</button>`
      ).join("")}
    </div>
    <div id="pt-feedback"></div>
    <button type="button" class="is-primary lab-check-btn" id="pt-check">提交答案</button>`;

  const grid = shell.content.querySelector("#pt-grid");
  const info = shell.content.querySelector("#pt-info");
  const selected = new Set();

  PTABLE.forEach((cell) => {
    const el = ELEMENTS_Z20[cell.z] || { sym: cell.z === 26 ? "Fe" : "?", name: cell.z === 26 ? "鐵" : "?" };
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pt-cell" + (cell.ghost ? " is-ghost" : "");
    btn.style.gridColumn = cell.col + 1;
    btn.style.gridRow = cell.row + 1;
    btn.innerHTML = `<span class="pt-z">${cell.z}</span><span class="pt-sym">${el.sym}</span>`;
    btn.title = `${el.name} 原子序 ${cell.z}`;
    btn.addEventListener("click", () => {
      const note = NOTES[cell.z] || `${el.name}（${el.sym}），原子序 ${cell.z}。`;
      const groupHint = GROUP1.has(cell.z) ? " 屬第 1 族（鹼金屬）。" : "";
      info.innerHTML = `<strong>${el.name} ${el.sym}</strong><p>Z＝${cell.z}。${note}${groupHint}</p>`;
    });
    grid.appendChild(btn);
  });

  shell.content.querySelector("#pt-pick").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-pick]");
    if (!btn) return;
    const sym = btn.dataset.pick;
    if (selected.has(sym)) selected.delete(sym);
    else selected.add(sym);
    shell.content.querySelectorAll(".lab-chip-btn").forEach((b) => {
      b.classList.toggle("is-on", selected.has(b.dataset.pick));
    });
  });

  shell.content.querySelector("#pt-check").addEventListener("click", () => {
    const fb = shell.content.querySelector("#pt-feedback");
    if (selected.size < 2) {
      fb.innerHTML = feedbackHtml("warn", "請選兩個元素（例如：誰和鈉同族？）。");
      return;
    }
    const ok = selected.has("Na") && selected.has("K") && !selected.has("Fe");
    if (ok) {
      markCompleted(TASK_ID);
      fb.innerHTML = feedbackHtml(
        "ok",
        "正確！鈉與鉀都在第 1 族（鹼金屬），性質相似；鐵不在此族。同族比同列更重要（6-2）。"
      );
      handlers.onComplete?.();
    } else if (selected.has("Fe")) {
      fb.innerHTML = feedbackHtml(
        "warn",
        "鐵是過渡金屬，與鈉、鉀不同族。再想想：誰和鈉都在週期表最左鹼金屬族？"
      );
    } else {
      fb.innerHTML = feedbackHtml("warn", "鎂在第 2 族，與第 1 族鹼金屬不同。請選鈉＋鉀。");
    }
  });

  if (isCompleted(TASK_ID)) {
    shell.content.querySelector("#pt-feedback").innerHTML = feedbackHtml("ok", "此任務已完成。");
  }

  return { close: shell.close };
}
