import { feedbackHtml, mountLabShell } from "./lab-shell.js?v=10";
import { markCompleted } from "../progress.js?v=10";

const TASK_ID = "periodic:exp";

/** 觀察結果取自 sections/6-2.html「鈉、鉀、鐵的比較（實驗觀察）」 */
const METALS = [
  { id: "na", name: "鈉", texture: "柔軟", water: "浮在水面", react: "劇烈，在水面移動", phenol: "變紅，呈鹼性", float: true, fire: false, base: true },
  { id: "k", name: "鉀", texture: "柔軟", water: "浮在水面", react: "非常劇烈，甚至起火", phenol: "變紅，呈鹼性", float: true, fire: true, base: true },
  { id: "fe", name: "鐵", texture: "堅硬", water: "沉入水底", react: "無明顯反應", phenol: "不變色", float: false, fire: false, base: false },
];

const COLS = [
  { id: "texture", label: "質地" },
  { id: "water", label: "在水中" },
  { id: "react", label: "與水反應" },
  { id: "phenol", label: "酚酞測水溶液" },
];

function stageSvg(metal, action, reacted) {
  if (!metal) {
    return '<svg viewBox="0 0 320 190" class="exp-stage" aria-hidden="true"><text x="160" y="95" text-anchor="middle" class="exp-hint">先選一種金屬</text></svg>';
  }
  const pink = action === "phenol" && metal.base;
  const water = `<path d="M90 70 V170 Q90 178 98 178 H222 Q230 178 230 170 V70" fill="none" stroke="#94a3b8" stroke-width="4"/>
    <rect x="94" y="96" width="132" height="78" rx="4" fill="${pink ? "#f9a8d4" : "#bae6fd"}" class="${pink ? "exp-pink" : ""}" opacity=".85"/>`;
  if (action === "texture") {
    return `<svg viewBox="0 0 320 190" class="exp-stage is-run" aria-hidden="true">
      <rect x="70" y="128" width="180" height="12" rx="3" fill="#94a3b8"/>
      <rect x="125" y="${metal.texture === "柔軟" ? 106 : 100}" width="70" height="${metal.texture === "柔軟" ? 22 : 28}" rx="6" fill="#cbd5e1" class="${metal.texture === "柔軟" ? "exp-squish" : ""}"/>
      <g class="exp-press"><rect x="152" y="30" width="16" height="56" rx="4" fill="#64748b"/></g>
      <text x="160" y="170" text-anchor="middle" class="exp-caption">質地：${metal.texture}</text>
    </svg>`;
  }
  const inWater = action === "water" || (action === "phenol" && reacted);
  const pieceY = metal.float ? 88 : 158;
  const motion = metal.float ? "exp-skate" : "exp-sink";
  return `<svg viewBox="0 0 320 190" class="exp-stage is-run" aria-hidden="true">
    ${water}
    ${
      inWater
        ? `<g class="${action === "water" ? motion : metal.float ? "exp-skate" : ""}">
            <rect x="150" y="${pieceY}" width="22" height="12" rx="3" fill="#cbd5e1"/>
            ${metal.fire ? `<path d="M154 ${pieceY} q7 -26 14 0 z" fill="#c084fc" class="exp-flame"/><path d="M157 ${pieceY} q4 -14 8 0 z" fill="#fde68a" class="exp-flame"/>` : ""}
            ${metal.float ? `<circle cx="146" cy="${pieceY + 8}" r="3" fill="#fff" class="exp-bubble"/><circle cx="178" cy="${pieceY + 6}" r="2.5" fill="#fff" class="exp-bubble is-b"/>` : ""}
          </g>`
        : ""
    }
    ${action === "phenol" ? '<path d="M160 28 q-6 10 0 14 q6 -4 0 -14z" fill="#f472b6" class="exp-drop"/>' : ""}
    <text x="160" y="22" text-anchor="middle" class="exp-caption">${
      action === "water" ? `${metal.water}；${metal.react}` : `酚酞：${metal.phenol}`
    }</text>
  </svg>`;
}

export function mountAlkaliLab(root, handlers) {
  const shell = mountLabShell(root, {
    title: "鈉、鉀、鐵的比較（模擬）",
    lead: "依 6-2 講義的實驗觀察：比較質地、放入水中的情形，以及用酚酞測水溶液，找出誰和誰最像。",
    onClose: handlers.onClose,
  });

  const records = {};
  let metal = null;
  let action = null;
  let answer = null;

  const total = METALS.length * COLS.length;
  const doneCount = () => Object.keys(records).length;

  function tableHtml() {
    return `<table class="exp-table">
      <thead><tr><th>性質</th>${METALS.map((m) => `<th>${m.name}</th>`).join("")}</tr></thead>
      <tbody>${COLS.map(
        (c) =>
          `<tr><th scope="row">${c.label}</th>${METALS.map((m) => {
            const v = records[`${m.id}:${c.id}`];
            return `<td class="${v ? "is-filled" : ""}">${v || "？"}</td>`;
          }).join("")}</tr>`
      ).join("")}</tbody>
    </table>`;
  }

  function render(message = "") {
    const m = METALS.find((x) => x.id === metal);
    shell.content.innerHTML = `
      <p class="exp-safety"><strong>安全提醒：</strong>鈉、鉀遇水反應劇烈，鉀甚至會起火，必須保存在礦物油中。這裡只做模擬；學生不可自行操作，只能觀看老師示範或影片。</p>
      <div class="exp-grid">
        <div>
          <h3 class="exp-h">1. 選金屬</h3>
          <div class="lab-chip-row">${METALS.map(
            (x) => `<button type="button" class="lab-chip-btn ${x.id === metal ? "is-on" : ""}" data-metal="${x.id}">${x.name}</button>`
          ).join("")}</div>
          <h3 class="exp-h">2. 觀察</h3>
          <div class="lab-chip-row">
            <button type="button" class="lab-chip-btn ${action === "texture" ? "is-on" : ""}" data-action="texture">觀察質地</button>
            <button type="button" class="lab-chip-btn ${action === "water" ? "is-on" : ""}" data-action="water">放入水中</button>
            <button type="button" class="lab-chip-btn ${action === "phenol" ? "is-on" : ""}" data-action="phenol">滴入酚酞</button>
          </div>
          <p class="lab-step">酚酞在酸性無色、在鹼性變紅。</p>
        </div>
        <div class="exp-stage-wrap">${stageSvg(m, action, m && records[`${m.id}:water`])}</div>
      </div>
      <h3 class="exp-h">3. 紀錄表 <small>（已記錄 ${doneCount()}／${total}）</small></h3>
      ${tableHtml()}
      ${
        doneCount() === total
          ? `<h3 class="exp-h">4. 哪兩種金屬性質最像？</h3>
            <div class="lab-chip-row">${[
              ["na-k", "鈉和鉀"],
              ["na-fe", "鈉和鐵"],
              ["k-fe", "鉀和鐵"],
            ]
              .map(([id, label]) => `<button type="button" class="lab-chip-btn ${answer === id ? "is-on" : ""}" data-answer="${id}">${label}</button>`)
              .join("")}</div>
            <button type="button" class="isl-btn is-primary" id="alk-check">確認答案</button>`
          : '<p class="islands-panel-note">三種金屬的四項觀察都記錄完，就能比較。</p>'
      }
      <div id="alk-feedback">${message}</div>`;
  }

  shell.content.addEventListener("click", (ev) => {
    const t = ev.target;
    const mb = t.closest("[data-metal]");
    if (mb) {
      metal = mb.dataset.metal;
      action = null;
      render();
      return;
    }
    const ab = t.closest("[data-action]");
    if (ab) {
      if (!metal) {
        render(feedbackHtml("warn", "先選一種金屬。"));
        return;
      }
      const m = METALS.find((x) => x.id === metal);
      if (ab.dataset.action === "phenol" && !records[`${m.id}:water`]) {
        render(feedbackHtml("warn", `先把${m.name}放入水中，才有水溶液可以用酚酞檢測。`));
        return;
      }
      action = ab.dataset.action;
      if (action === "texture") records[`${m.id}:texture`] = m.texture;
      if (action === "water") {
        records[`${m.id}:water`] = m.water;
        records[`${m.id}:react`] = m.react;
      }
      if (action === "phenol") records[`${m.id}:phenol`] = m.phenol;
      render();
      return;
    }
    const ans = t.closest("[data-answer]");
    if (ans) {
      answer = ans.dataset.answer;
      ans.parentElement.querySelectorAll("[data-answer]").forEach((b) => b.classList.toggle("is-on", b === ans));
      return;
    }
    if (t.closest("#alk-check")) {
      const fb = shell.content.querySelector("#alk-feedback");
      if (!answer) {
        fb.innerHTML = feedbackHtml("warn", "先選一個答案。");
        return;
      }
      if (answer !== "na-k") {
        fb.innerHTML = feedbackHtml("warn", "再看紀錄表：鐵堅硬、沉入水底、和水無明顯反應，水溶液也不使酚酞變紅，和另外兩種都不像。");
        return;
      }
      markCompleted(TASK_ID);
      fb.innerHTML = feedbackHtml(
        "ok",
        "正確！鈉和鉀都柔軟、浮在水面、遇水劇烈反應、水溶液呈鹼性。它們都在第 1 族（鹼金屬），鉀在鈉下面，所以更劇烈；鐵不在這一族。同族才像，不是同列。"
      );
      handlers.onComplete?.();
    }
  });

  render();
  return { close: shell.close };
}
