import { feedbackHtml, mountLabShell } from "./lab-shell.js?v=9";
import { isCompleted, markCompleted } from "../progress.js?v=9";

const TASK_ID = "elements:exp";

/** 器材、步驟與參考結果皆取自 sections/6-1.html #exp */
const KIT = ["鐵片", "鋅片", "銅片", "硫", "石墨棒", "1.5 V 電池", "小燈泡附燈座", "附夾子的導線", "砂紙", "鐵鎚"];

const SAMPLES = [
  { id: "fe", name: "鐵片", color: "銀灰", hex: "#b9c1c9", dull: "#7d746a", luster: true, bulb: true, hammer: "可延展", kind: "metal" },
  { id: "zn", name: "鋅片", color: "銀灰", hex: "#c6ccd3", dull: "#8a8f94", luster: true, bulb: true, hammer: "可延展", kind: "metal" },
  { id: "cu", name: "銅片", color: "紅", hex: "#c8643a", dull: "#7a4a35", luster: true, bulb: true, hammer: "可延展", kind: "metal" },
  { id: "c", name: "石墨棒", color: "黑", hex: "#2f2f33", dull: "#2f2f33", luster: false, bulb: true, hammer: "碎裂", kind: "nonmetal" },
  { id: "s", name: "硫棒", color: "黃", hex: "#efd23e", dull: "#efd23e", luster: false, bulb: false, hammer: "碎裂", kind: "nonmetal" },
];

const TESTS = [
  { id: "sand", label: "砂紙摩擦", col: "摩擦後顏色／光澤", step: "以砂紙摩擦待測物，觀察顏色與是否具有光澤。" },
  { id: "bulb", label: "接電池與燈泡", col: "燈泡", step: "將待測物以導線連接電池及小燈泡，觀察燈泡是否發亮。" },
  { id: "hammer", label: "鐵鎚敲打", col: "敲打", step: "以鐵鎚敲打待測物，測試其是否可延展。" },
];

const RESULT = {
  sand: (s) => `${s.color}，${s.luster ? "有光澤" : "無光澤"}`,
  bulb: (s) => (s.bulb ? "發亮" : "不亮"),
  hammer: (s) => s.hammer,
};

function stageSvg(sample, test) {
  if (!sample || !test) {
    return '<svg viewBox="0 0 320 170" class="exp-stage" aria-hidden="true"><text x="160" y="90" text-anchor="middle" class="exp-hint">先選樣品，再選一種檢驗</text></svg>';
  }
  if (test === "sand") {
    return `<svg viewBox="0 0 320 170" class="exp-stage is-run" aria-hidden="true">
      <rect x="90" y="70" width="140" height="46" rx="6" fill="${sample.hex}"/>
      <rect x="90" y="70" width="140" height="46" rx="6" fill="${sample.dull}" class="exp-dull"/>
      ${sample.luster ? '<rect x="100" y="76" width="34" height="34" rx="4" fill="#ffffff" class="exp-shine" transform="skewX(-20)"/>' : ""}
      <rect x="150" y="42" width="70" height="22" rx="4" fill="#d9b77a" class="exp-sandpaper"/>
      <text x="160" y="150" text-anchor="middle" class="exp-caption">砂紙摩擦：${RESULT.sand(sample)}</text>
    </svg>`;
  }
  if (test === "bulb") {
    const lit = sample.bulb;
    return `<svg viewBox="0 0 320 170" class="exp-stage is-run" aria-hidden="true">
      <path d="M58 98 V60 H128 M192 60 H262 V84 M262 112 V130 H58 V112" fill="none" stroke="#475569" stroke-width="4"/>
      <rect x="40" y="84" width="36" height="28" rx="4" fill="#334155"/><rect x="40" y="84" width="36" height="9" rx="3" fill="#f59e0b"/>
      <text x="58" y="124" text-anchor="middle" class="exp-tiny" fill="#fff">1.5V</text>
      <rect x="128" y="50" width="64" height="20" rx="4" fill="${sample.hex}"/>
      ${lit ? '<circle cx="262" cy="98" r="30" fill="#fde68a" class="exp-glow"/>' : ""}
      <circle cx="262" cy="98" r="14" fill="${lit ? "#fff7c2" : "#e5e7eb"}" stroke="#94a3b8" stroke-width="2"/>
      <path d="M256 102 q6 -10 12 0" fill="none" stroke="${lit ? "#f59e0b" : "#9ca3af"}" stroke-width="2"/>
      <text x="160" y="160" text-anchor="middle" class="exp-caption">燈泡：${RESULT.bulb(sample)}</text>
    </svg>`;
  }
  const metal = sample.hammer === "可延展";
  return `<svg viewBox="0 0 320 170" class="exp-stage is-run" aria-hidden="true">
    <rect x="70" y="118" width="180" height="12" rx="3" fill="#94a3b8"/>
    ${
      metal
        ? `<rect x="110" y="96" width="100" height="22" rx="5" fill="${sample.hex}" class="exp-flatten"/>`
        : `<g fill="${sample.hex}">
            <polygon points="112,118 140,96 150,118" class="exp-shard is-a"/>
            <polygon points="150,118 160,92 178,118" class="exp-shard is-b"/>
            <polygon points="178,118 196,98 208,118" class="exp-shard is-c"/>
            <polygon points="140,118 150,108 160,118" class="exp-shard is-d"/>
          </g>`
    }
    <g class="exp-hammer"><rect x="150" y="20" width="12" height="62" rx="3" fill="#9b6a43"/><rect x="128" y="8" width="56" height="22" rx="4" fill="#64748b"/></g>
    <text x="160" y="155" text-anchor="middle" class="exp-caption">敲打：${RESULT.hammer(sample)}</text>
  </svg>`;
}

export function mountExp61Lab(root, handlers) {
  const shell = mountLabShell(root, {
    title: "實驗 6-1 元素性質的探索與分類",
    lead: "目的：檢測元素的性質，了解分類的依據。先核對器材，再對五種樣品做三項檢驗，最後依結果分類。",
    onClose: handlers.onClose,
  });

  const records = {};
  const picks = {};
  let sample = null;
  let test = null;
  let phase = isCompleted(TASK_ID) ? "bench" : "kit";

  const doneCount = () => Object.keys(records).length;
  const total = SAMPLES.length * TESTS.length;

  function tableHtml() {
    return `
      <table class="exp-table">
        <thead><tr><th>物質</th>${TESTS.map((t) => `<th>${t.col}</th>`).join("")}</tr></thead>
        <tbody>${SAMPLES.map(
          (s) =>
            `<tr><th scope="row">${s.name}</th>${TESTS.map((t) => {
              const v = records[`${s.id}:${t.id}`];
              return `<td class="${v ? "is-filled" : ""}">${v || "？"}</td>`;
            }).join("")}</tr>`
        ).join("")}</tbody>
      </table>`;
  }

  function render() {
    if (phase === "kit") {
      shell.content.innerHTML = `
        <p class="lab-step"><strong>實驗材料確認：</strong>動手前對照器材表逐項核對；缺件或燈泡不亮先舉手。</p>
        <ul class="exp-kit">${KIT.map(
          (k, i) => `<li><label class="exp-kit-item"><input type="checkbox" data-kit="${i}"><span>${k}</span></label></li>`
        ).join("")}</ul>
        <button type="button" class="isl-btn is-primary" id="exp-kit-go" disabled>器材到齊，開始實驗</button>
        <p class="atom-model-note">完整步驟與紀錄表見 <a href="../sections/lab-6-1.html">實驗專區 6-1</a>（活動紀錄本）。</p>`;
      return;
    }
    const current = SAMPLES.find((s) => s.id === sample);
    const currentTest = TESTS.find((t) => t.id === test);
    const allDone = doneCount() === total;
    shell.content.innerHTML = `
      <div class="exp-grid">
        <div>
          <h3 class="exp-h">1. 選樣品</h3>
          <div class="lab-chip-row">${SAMPLES.map(
            (s) =>
              `<button type="button" class="lab-chip-btn exp-sample ${s.id === sample ? "is-on" : ""}" data-sample="${s.id}"><i style="background:${s.dull}"></i>${s.name}</button>`
          ).join("")}</div>
          <h3 class="exp-h">2. 做檢驗</h3>
          <div class="lab-chip-row">${TESTS.map(
            (t) => `<button type="button" class="lab-chip-btn ${t.id === test ? "is-on" : ""}" data-test="${t.id}">${t.label}</button>`
          ).join("")}</div>
          <p class="lab-step">${currentTest ? currentTest.step : "實驗精要：砂紙摩擦看顏色與光澤；接電池與小燈泡看是否發亮；鐵鎚敲打看是否延展。"}</p>
        </div>
        <div class="exp-stage-wrap">${stageSvg(current, test)}</div>
      </div>
      <h3 class="exp-h">3. 紀錄表 <small>（已記錄 ${doneCount()}／${total}）</small></h3>
      ${tableHtml()}
      ${allDone ? classifyHtml() : '<p class="islands-panel-note">五種樣品的三項檢驗都做完，就可以分類。</p>'}
      <div id="exp-feedback"></div>`;
  }

  function classifyHtml() {
    return `
      <h3 class="exp-h">4. 依結果分類</h3>
      ${SAMPLES.map(
        (s) => `<div class="exp-classify-row"><strong>${s.name}</strong>
          <div class="lab-chip-row">
            <button type="button" class="lab-chip-btn ${picks[s.id] === "metal" ? "is-on" : ""}" data-pick="${s.id}" data-kind="metal">金屬</button>
            <button type="button" class="lab-chip-btn ${picks[s.id] === "nonmetal" ? "is-on" : ""}" data-pick="${s.id}" data-kind="nonmetal">非金屬</button>
          </div></div>`
      ).join("")}
      <h3 class="exp-h">5. 分類依據是什麼？</h3>
      <div class="lab-chip-row">
        ${[
          ["three", "光澤、導電、延展三項一起看"],
          ["bulb", "只看能不能讓燈泡發亮"],
          ["color", "只看摩擦後的顏色"],
        ]
          .map(([id, label]) => `<button type="button" class="lab-chip-btn ${picks.basis === id ? "is-on" : ""}" data-basis="${id}">${label}</button>`)
          .join("")}
      </div>
      <button type="button" class="isl-btn is-primary" id="exp-check">檢查分類</button>`;
  }

  function check() {
    const fb = shell.content.querySelector("#exp-feedback");
    const missing = SAMPLES.filter((s) => !picks[s.id]);
    if (missing.length || !picks.basis) {
      fb.innerHTML = feedbackHtml("warn", "五種樣品都要分類，也要選出分類依據。");
      return;
    }
    const wrong = SAMPLES.find((s) => picks[s.id] !== s.kind);
    if (wrong) {
      const reason =
        wrong.id === "c"
          ? "石墨棒能讓燈泡發亮，但沒有光澤、一敲就碎，是非金屬的例外。只看燈會把石墨判成金屬。"
          : wrong.kind === "metal"
            ? `${wrong.name}有光澤、能導電、可延展，三項都符合金屬。`
            : `${wrong.name}沒有光澤、不導電、一敲就碎，是非金屬。`;
      fb.innerHTML = feedbackHtml("warn", `「${wrong.name}」分類不對。${reason}`);
      return;
    }
    if (picks.basis !== "three") {
      fb.innerHTML = feedbackHtml(
        "warn",
        picks.basis === "bulb"
          ? "只看燈泡會把石墨判成金屬。要光澤、導電、延展三項一起看。"
          : "只看顏色會把銅和硫分開，卻分不開鐵和鋅。要光澤、導電、延展三項一起看。"
      );
      return;
    }
    markCompleted(TASK_ID);
    fb.innerHTML = feedbackHtml(
      "ok",
      "分類正確！分類依據是光澤、導電、延展。金屬通常三項都有；石墨沒光澤、易碎，卻能導電，是非金屬的例外。"
    );
    handlers.onComplete?.();
  }

  shell.content.addEventListener("change", (ev) => {
    if (!ev.target.matches("[data-kit]")) return;
    const all = [...shell.content.querySelectorAll("[data-kit]")].every((c) => c.checked);
    shell.content.querySelector("#exp-kit-go").disabled = !all;
  });

  shell.content.addEventListener("click", (ev) => {
    const t = ev.target;
    if (t.closest("#exp-kit-go")) {
      phase = "bench";
      render();
      return;
    }
    const s = t.closest("[data-sample]");
    if (s) {
      sample = s.dataset.sample;
      test = null;
      render();
      return;
    }
    const tb = t.closest("[data-test]");
    if (tb) {
      if (!sample) {
        shell.content.querySelector("#exp-feedback").innerHTML = feedbackHtml("warn", "先選一種樣品，再做檢驗。");
        return;
      }
      test = tb.dataset.test;
      const smp = SAMPLES.find((x) => x.id === sample);
      records[`${sample}:${test}`] = RESULT[test](smp);
      render();
      return;
    }
    const p = t.closest("[data-pick]");
    if (p) {
      picks[p.dataset.pick] = p.dataset.kind;
      p.parentElement.querySelectorAll("[data-pick]").forEach((b) => b.classList.toggle("is-on", b === p));
      return;
    }
    const b = t.closest("[data-basis]");
    if (b) {
      picks.basis = b.dataset.basis;
      b.parentElement.querySelectorAll("[data-basis]").forEach((x) => x.classList.toggle("is-on", x === b));
      return;
    }
    if (t.closest("#exp-check")) check();
  });

  render();
  return { close: shell.close };
}
