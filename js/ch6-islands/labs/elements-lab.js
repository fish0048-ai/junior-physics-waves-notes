import { feedbackHtml, mountLabShell } from "./lab-shell.js?v=4";
import { isCompleted, markCompleted } from "../progress.js?v=4";

const TASK_ID = "elements:classify-metals";

const SAMPLES = [
  {
    id: "au",
    label: "金（Au）",
    hint: "金黃、有光澤、可敲成薄片",
    category: "metal",
  },
  {
    id: "cu",
    label: "銅（Cu）",
    hint: "紅棕色、良導體、有延展性",
    category: "metal",
  },
  {
    id: "s",
    label: "硫（S）",
    hint: "黃色、脆、通常不導電",
    category: "nonmetal",
  },
  {
    id: "water",
    label: "水（H₂O）",
    hint: "通電可分解出氫、氧兩種氣體",
    category: "not-element",
  },
];

const BIN_LABELS = {
  metal: "金屬元素",
  nonmetal: "非金屬元素",
  "not-element": "不是元素（化合物）",
};

export function mountElementsLab(root, handlers) {
  const shell = mountLabShell(root, {
    title: "元素探索島 · 分類任務",
    lead: "先預測：下列物質哪些是金屬、非金屬？水算不算元素？再點選分類（對照 6-1）。",
    onClose: handlers.onClose,
  });

  const picks = Object.fromEntries(SAMPLES.map((s) => [s.id, null]));

  shell.content.innerHTML = `
    <p class="lab-step"><strong>探究：</strong>元素的國中定義是「一般化學方法無法再分解的純物質」。</p>
    <div class="lab-bin-row" role="group" aria-label="分類區">
      ${Object.entries(BIN_LABELS)
        .map(
          ([key, name]) =>
            `<div class="lab-bin" data-bin="${key}"><strong>${name}</strong><div class="lab-bin-slot" data-slot="${key}"></div></div>`
        )
        .join("")}
    </div>
    <div class="lab-card-row" id="elements-cards">
      ${SAMPLES.map(
        (s) =>
          `<button type="button" class="lab-card" data-sample="${s.id}" aria-pressed="false">
            <strong>${s.label}</strong><small>${s.hint}</small>
          </button>`
      ).join("")}
    </div>
    <div id="elements-feedback"></div>
    <button type="button" class="is-primary lab-check-btn" id="elements-check">檢查分類</button>
    <p class="atom-model-note">水能分解 → 是化合物，不是元素。石墨能導電但仍是非金屬（6-1 易錯）。</p>`;

  let selected = null;

  shell.content.querySelector("#elements-cards").addEventListener("click", (ev) => {
    const card = ev.target.closest("[data-sample]");
    if (!card) return;
    selected = card.dataset.sample;
    shell.content.querySelectorAll(".lab-card").forEach((c) => {
      c.class.toggle("is-selected", c.dataset.sample === selected);
      c.setAttribute("aria-pressed", c.dataset.sample === selected ? "true" : "false");
    });
  });

  shell.content.querySelectorAll(".lab-bin").forEach((bin) => {
    bin.addEventListener("click", () => {
      if (!selected) {
        shell.content.querySelector("#elements-feedback").innerHTML = feedbackHtml(
          "warn",
          "請先點選一張樣本卡，再點要放入的分類區。"
        );
        return;
      }
      picks[selected] = bin.dataset.bin;
      const card = shell.content.querySelector(`[data-sample="${selected}"]`);
      card?.classList.add("is-placed");
      shell.content.querySelectorAll(".lab-bin-slot").forEach((slot) => {
        slot.innerHTML = "";
      });
      SAMPLES.forEach((sample) => {
        if (!picks[sample.id]) return;
        const slot = shell.content.querySelector(`[data-slot="${picks[sample.id]}"]`);
        if (!slot) return;
        const tag = document.createElement("span");
        tag.className = "lab-chip";
        tag.textContent = sample.label;
        slot.appendChild(tag);
      });
      selected = null;
      shell.content.querySelectorAll(".lab-card").forEach((c) => {
        c.class.remove("is-selected");
        c.setAttribute("aria-pressed", "false");
      });
    });
  });

  shell.content.querySelector("#elements-check").addEventListener("click", () => {
    const fb = shell.content.querySelector("#elements-feedback");
    const missing = SAMPLES.filter((s) => !picks[s.id]);
    if (missing.length) {
      fb.innerHTML = feedbackHtml("warn", `還有 ${missing.length} 個樣本未分類。`);
      return;
    }
    let wrong = SAMPLES.filter((s) => picks[s.id] !== s.category);
    if (wrong.length) {
      const w = wrong[0];
      let reason =
        w.id === "water"
          ? "水通電得氫、氧，可再分解，是化合物不是元素。"
          : w.category === "metal"
            ? "這個樣本具金屬元素常見性質（光澤、延展、導電等）。"
            : "這是非金屬元素（硫黃色固体、脆等）。";
      fb.innerHTML = feedbackHtml("warn", `「${w.label}」分類不對。${reason}`);
      return;
    }
    markCompleted(TASK_ID);
    fb.innerHTML = feedbackHtml(
      "ok",
      "全部正確！金、銅是金屬元素；硫是非金屬；水是化合物。可前往「週期表城市」或閱讀 6-1 講義。"
    );
    handlers.onComplete?.();
  });

  if (isCompleted(TASK_ID)) {
    shell.content.querySelector("#elements-feedback").innerHTML = feedbackHtml("ok", "此任務已完成（本機紀錄）。");
  }

  return { close: shell.close };
}
