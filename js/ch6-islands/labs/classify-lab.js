import { feedbackHtml, mountLabShell } from "./lab-shell.js";
import { isCompleted, markCompleted } from "../progress.js";

const TASK_ID = "classify:particle-diagrams";

/** 對照 6-4 粒子圖：甲雙原子元素、乙混合物、丙單原子元素、丁化合物 */
const SCENES = [
  {
    id: "a",
    title: "圖甲",
    svg: `<svg viewBox="0 0 120 60" class="lab-mini-svg"><circle cx="35" cy="30" r="8" fill="#2563eb"/><circle cx="55" cy="30" r="8" fill="#2563eb"/><circle cx="85" cy="30" r="8" fill="#2563eb"/><circle cx="105" cy="30" r="8" fill="#2563eb"/></svg>`,
    answer: "element",
    explain: "相同藍色原子兩兩成對 → 雙原子元素（如 O₂）。",
  },
  {
    id: "b",
    title: "圖乙",
    svg: `<svg viewBox="0 0 120 60" class="lab-mini-svg"><circle cx="30" cy="25" r="8" fill="#dc2626"/><circle cx="70" cy="35" r="8" fill="#2563eb"/><circle cx="95" cy="20" r="8" fill="#dc2626"/></svg>`,
    answer: "mixture",
    explain: "紅、藍不同單原子混在一起 → 混合物。",
  },
  {
    id: "c",
    title: "圖丙",
    svg: `<svg viewBox="0 0 120 60" class="lab-mini-svg"><circle cx="25" cy="30" r="7" fill="#64748b"/><circle cx="45" cy="30" r="7" fill="#64748b"/><circle cx="65" cy="30" r="7" fill="#64748b"/><circle cx="85" cy="30" r="7" fill="#64748b"/></svg>`,
    answer: "element",
    explain: "全部相同單原子 → 單原子元素（如 He、Ne）。",
  },
  {
    id: "d",
    title: "圖丁",
    svg: `<svg viewBox="0 0 120 60" class="lab-mini-svg"><circle cx="40" cy="30" r="8" fill="#dc2626"/><circle cx="58" cy="30" r="8" fill="#2563eb"/><circle cx="80" cy="30" r="8" fill="#dc2626"/><circle cx="98" cy="30" r="8" fill="#2563eb"/></svg>`,
    answer: "compound",
    explain: "紅藍成對且整齊重複 → 化合物（固定比例的不同原子）。",
  },
];

const OPTIONS = [
  { id: "mixture", label: "混合物" },
  { id: "element", label: "元素（純物質）" },
  { id: "compound", label: "化合物" },
];

export function mountClassifyLab(root, handlers) {
  const shell = mountLabShell(root, {
    title: "物質分類挑戰島",
    lead: "先預測每張粒子圖的類別，再選答案對照解釋（6-4）。",
    onClose: handlers.onClose,
  });

  const answers = {};

  shell.content.innerHTML = `
    ${SCENES.map(
      (s) => `
      <div class="classify-row" data-scene="${s.id}">
        <div>${s.svg}<strong>${s.title}</strong></div>
        <div class="lab-chip-row">
          ${OPTIONS.map(
            (o) =>
              `<button type="button" class="lab-chip-btn" data-scene="${s.id}" data-ans="${o.id}">${o.label}</button>`
          ).join("")}
        </div>
      </div>`
    ).join("")}
    <div id="cls-feedback"></div>
    <button type="button" class="is-primary lab-check-btn" id="cls-check">檢查全部</button>`;

  shell.content.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-scene][data-ans]");
    if (!btn) return;
    answers[btn.dataset.scene] = btn.dataset.ans;
    shell.content.querySelectorAll(`[data-scene="${btn.dataset.scene}"][data-ans]`).forEach((b) => {
      b.classList.toggle("is-on", b === btn);
    });
  });

  shell.content.querySelector("#cls-check").addEventListener("click", () => {
    const fb = shell.content.querySelector("#cls-feedback");
    if (Object.keys(answers).length < SCENES.length) {
      fb.innerHTML = feedbackHtml("warn", "請為四張圖都選一個答案。");
      return;
    }
    const wrong = SCENES.find((s) => answers[s.id] !== s.answer);
    if (wrong) {
      fb.innerHTML = feedbackHtml("warn", `${wrong.title} 不對。${wrong.explain}`);
      return;
    }
    markCompleted(TASK_ID);
    fb.innerHTML = feedbackHtml(
      "ok",
      "全部正確！記得：O₂ 是分子也是元素；空氣是混合物；化合物由不同種原子組成。"
    );
    handlers.onComplete?.();
  });

  if (isCompleted(TASK_ID)) {
    shell.content.querySelector("#cls-feedback").innerHTML = feedbackHtml("ok", "此任務已完成。");
  }

  return { close: shell.close };
}
