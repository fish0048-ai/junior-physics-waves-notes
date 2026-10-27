import { feedbackHtml, mountLabShell } from "./lab-shell.js";
import { isCompleted, markCompleted } from "../progress.js";

const TASK_ID = "decompose:compound-vs-element";

const SUBSTANCES = [
  {
    id: "hgo",
    name: "氧化汞（HgO）",
    type: "compound",
    okMethods: ["light"],
    result: "照光分解 → 汞＋氧（對照 6-3 實驗示意）",
  },
  {
    id: "h2o",
    name: "水（H₂O）",
    type: "compound",
    okMethods: ["electric"],
    result: "通電分解 → 氫＋氧（課文概念，僅模擬）",
  },
  {
    id: "hg",
    name: "汞（Hg）",
    type: "element",
    okMethods: [],
    result: "元素：一般化學方法無法再分解成更簡單的純物質。",
  },
  {
    id: "o2",
    name: "氧氣（O₂）",
    type: "element",
    okMethods: [],
    result: "元素：仍為同種原子組成的純物質。",
  },
];

const METHODS = [
  { id: "light", label: "強光／加熱" },
  { id: "electric", label: "通電" },
  { id: "none", label: "不處理" },
];

export function mountDecomposeLab(root, handlers) {
  const shell = mountLabShell(root, {
    title: "物質分解實驗島 · 模擬",
    lead: "選物質與處理方式，觀察能否分解。高風險實驗僅限模擬，請勿自行嘗試（6-3）。",
    onClose: handlers.onClose,
  });

  let substanceId = "hgo";
  let methodId = "light";

  function render() {
    shell.content.innerHTML = `
      <label class="lab-field">選擇物質
        <select id="dec-substance">
          ${SUBSTANCES.map((s) => `<option value="${s.id}">${s.name}</option>`).join("")}
        </select>
      </label>
      <div class="lab-chip-row" id="dec-methods">
        ${METHODS.map(
          (m) =>
            `<button type="button" class="lab-chip-btn ${m.id === methodId ? "is-on" : ""}" data-method="${m.id}">${m.label}</button>`
        ).join("")}
      </div>
      <button type="button" class="is-primary lab-check-btn" id="dec-run">執行（模擬）</button>
      <div class="lab-readout" id="dec-readout"></div>
      <div id="dec-feedback"></div>
      <p class="lab-step"><strong>任務：</strong>各做一次——(1) 氧化汞＋照光 (2) 水＋通電 (3) 汞＋不處理，並在下方確認理解。</p>
      <button type="button" class="lab-check-btn" id="dec-quiz">確認：為什麼汞不能「再分解」？</button>`;

    shell.content.querySelector("#dec-substance").value = substanceId;
    shell.content.querySelector("#dec-substance").addEventListener("change", (ev) => {
      substanceId = ev.target.value;
    });
    shell.content.querySelector("#dec-methods").addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-method]");
      if (!btn) return;
      methodId = btn.dataset.method;
      render();
    });
    shell.content.querySelector("#dec-run").addEventListener("click", runSim);
    shell.content.querySelector("#dec-quiz").addEventListener("click", checkQuiz);
    if (isCompleted(TASK_ID)) {
      shell.content.querySelector("#dec-feedback").innerHTML = feedbackHtml("ok", "任務已完成。");
    }
  }

  const log = [];

  function runSim() {
    const sub = SUBSTANCES.find((s) => s.id === substanceId);
    const readout = shell.content.querySelector("#dec-readout");
    let text = sub.result;
    if (sub.type === "compound" && sub.okMethods.includes(methodId)) {
      text = "✓ 發生分解（化學變化）：" + sub.result;
      log.push(`${sub.id}:${methodId}`);
    } else if (sub.type === "element") {
      text = methodId === "none" ? sub.result : "✗ 元素不會因此分解成其他元素（一般化學變化）。";
      if (methodId === "none") log.push(`${sub.id}:none`);
    } else {
      text = "✗ 此處理方式與課文範例不符。提示：氧化汞用照光；水用通電。";
    }
    readout.innerHTML = `<p>${text}</p>`;
  }

  function checkQuiz() {
    const fb = shell.content.querySelector("#dec-feedback");
    const need = ["hgo:light", "h2o:electric", "hg:none"];
    const done = need.every((k) => log.includes(k));
    if (!done) {
      fb.innerHTML = feedbackHtml("warn", "請依任務完成三次模擬（氧化汞＋照光、水＋通電、汞＋不處理）。");
      return;
    }
    markCompleted(TASK_ID);
    fb.innerHTML = feedbackHtml(
      "ok",
      "正確！化合物可分解；元素是分解的終點。汞已是元素，不會再拆成別種元素。"
    );
    handlers.onComplete?.();
  }

  render();
  return { close: shell.close };
}
