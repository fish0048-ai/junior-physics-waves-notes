import { feedbackHtml, mountLabShell } from "./lab-shell.js?v=5";
import { isCompleted, markCompleted } from "../progress.js?v=5";

const TASK_ID = "molecule:build-three";

const TARGETS = [
  { id: "o2", name: "氧氣", formula: "O₂", need: { O: 2 }, kind: "元素（雙原子分子）" },
  { id: "h2o", name: "水", formula: "H₂O", need: { H: 2, O: 1 }, kind: "化合物" },
  { id: "co2", name: "二氧化碳", formula: "CO₂", need: { C: 1, O: 2 }, kind: "化合物" },
];

export function mountMoleculeLab(root, handlers) {
  const shell = mountLabShell(root, {
    title: "分子組裝工坊",
    lead: "點原子加入模型區，觀察化學式。適用共價分子（6-4）；離子化合物如 NaCl 不用此模型。",
    onClose: handlers.onClose,
  });

  const counts = { H: 0, O: 0, C: 0 };
  const done = new Set();

  function formulaString() {
    const parts = [];
    if (counts.H) parts.push(`H${counts.H > 1 ? counts.H : ""}`);
    if (counts.C) parts.push(`C${counts.C > 1 ? counts.C : ""}`);
    if (counts.O) parts.push(`O${counts.O > 1 ? counts.O : ""}`);
    return parts.join("") || "—";
  }

  function render() {
    shell.content.innerHTML = `
      <div class="lab-chip-row">
        ${["H", "O", "C"].map(
          (a) => `<button type="button" class="lab-chip-btn" data-add="${a}">＋ ${a}</button>`
        ).join("")}
        <button type="button" class="lab-chip-btn" data-reset="1">清空</button>
      </div>
      <div class="mol-stage" aria-hidden="true">
        ${Array.from({ length: counts.H }, () => '<span class="mol-ball is-h">H</span>').join("")}
        ${Array.from({ length: counts.C }, () => '<span class="mol-ball is-c">C</span>').join("")}
        ${Array.from({ length: counts.O }, () => '<span class="mol-ball is-o">O</span>').join("")}
      </div>
      <p class="lab-readout">目前組成：<strong id="mol-formula">${formulaString()}</strong>
        （H:${counts.H} O:${counts.O} C:${counts.C}）</p>
      <ul class="mol-targets" id="mol-targets">
        ${TARGETS.map(
          (t) =>
            `<li><button type="button" data-target="${t.id}" class="lab-check-btn">${t.name} ${t.formula}</button>
            <span>${done.has(t.id) ? "✓" : ""}</span></li>`
        ).join("")}
      </ul>
      <div id="mol-feedback"></div>`;

    shell.content.querySelectorAll("[data-add]").forEach((btn) => {
      btn.addEventListener("click", () => {
        counts[btn.dataset.add] += 1;
        render();
      });
    });
    shell.content.querySelector("[data-reset]")?.addEventListener("click", () => {
      counts.H = counts.O = counts.C = 0;
      render();
    });
    shell.content.querySelectorAll("[data-target]").forEach((btn) => {
      btn.addEventListener("click", () => checkTarget(btn.dataset.target));
    });
  }

  function matches(need) {
    return Object.entries(need).every(([k, v]) => counts[k] === v) &&
      Object.keys(counts).every((k) => counts[k] === (need[k] || 0));
  }

  function checkTarget(id) {
    const t = TARGETS.find((x) => x.id === id);
    const fb = shell.content.querySelector("#mol-feedback");
    if (matches(t.need)) {
      done.add(id);
      fb.innerHTML = feedbackHtml("ok", `正確！${t.formula} 是${t.kind}。下標表示原子個數。`);
      if (done.size === TARGETS.length) {
        markCompleted(TASK_ID);
        fb.innerHTML += feedbackHtml("ok", "三種分子都組裝成功！任務完成。");
        handlers.onComplete?.();
      }
      render();
    } else {
      fb.innerHTML = feedbackHtml(
        "warn",
        `原子數不符合 ${t.formula}。需要：${Object.entries(t.need)
          .map(([k, v]) => `${v} 個 ${k}`)
          .join("、")}。`
      );
    }
  }

  render();
  if (isCompleted(TASK_ID)) {
    shell.content.insertAdjacentHTML("beforeend", feedbackHtml("ok", "此任務已完成。"));
  }
  return { close: shell.close };
}
