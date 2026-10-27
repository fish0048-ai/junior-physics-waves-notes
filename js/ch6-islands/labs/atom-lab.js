import { ELEMENTS_Z20 } from "../config.js";
import { isCompleted, markCompleted } from "../progress.js";

const TASK_ID = "atom:neutral-carbon-12";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function describeSpecies(p, e) {
  const z = p;
  const charge = p - e;
  if (z < 1 || z > 20) {
    return { label: "超出國中常用範例（Z＞20）", sym: "?", name: "—" };
  }
  const el = ELEMENTS_Z20[z];
  if (charge === 0) return { label: `中性${el.name}原子`, sym: el.sym, name: el.name };
  if (charge > 0) return { label: `${el.name}正離子（失去 ${charge} 個電子）`, sym: `${el.sym}${charge > 1 ? charge : ""}+`, name: el.name };
  const c = Math.abs(charge);
  return { label: `${el.name}負離子（得到 ${c} 個電子）`, sym: `${el.sym}${c > 1 ? c : ""}−`, name: el.name };
}

export function mountAtomLab(root, { onClose }) {
  const overlay = root.querySelector("#islands-lab");
  const readout = root.querySelector("#atom-readout");
  const feedback = root.querySelector("#atom-feedback");
  const btnClose = root.querySelector("#atom-lab-close");
  const btnCheck = root.querySelector("#atom-btn-check");
  const canvasMini = root.querySelector("#atom-mini-canvas");

  let p = 6;
  let n = 6;
  let e = 6;

  const state = { p, n, e };

  overlay.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-part]");
    if (!btn) return;
    const part = btn.dataset.part;
    const delta = Number(btn.dataset.delta);
    if (part === "p") state.p = clamp(state.p + delta, 1, 20);
    if (part === "n") state.n = clamp(state.n + delta, 0, 24);
    if (part === "e") state.e = clamp(state.e + delta, 0, 22);
    render();
  });

  function renderReadout() {
    const z = state.p;
    const a = state.p + state.n;
    const charge = state.p - state.e;
    const sp = describeSpecies(state.p, state.e);
    readout.innerHTML = `
      <dl class="atom-readout-grid">
        <div><dt>質子數 p</dt><dd>${state.p}</dd></div>
        <div><dt>中子數 n</dt><dd>${state.n}</dd></div>
        <div><dt>電子數 e</dt><dd>${state.e}</dd></div>
        <div><dt>原子序 Z</dt><dd>${z}</dd></div>
        <div><dt>質量數 A</dt><dd>${a}</dd></div>
        <div><dt>電荷</dt><dd>${charge === 0 ? "0（中性）" : charge > 0 ? `+${charge}` : charge}</dd></div>
        <div class="atom-readout-wide"><dt>粒子種類</dt><dd>${sp.label}（${sp.sym}）</dd></div>
      </dl>
      <p class="atom-model-note">⚠ 教學模型：電子環為示意位置，<strong>不是</strong>電子的真實運動軌跡；中性原子時質子數＝電子數。</p>`;
    drawMini(state.p, state.n, state.e);
  }

  function render() {
    renderReadout();
    feedback.textContent = "";
    if (isCompleted(TASK_ID)) {
      feedback.innerHTML = "<span class=\"atom-ok\">你已完成此任務（紀錄已存於本機）。可調整粒子再觀察離子與同位素。</span>";
    }
  }

  function drawMini(protons, neutrons, electrons) {
    const ctx = canvasMini.getContext("2d");
    const w = canvasMini.width;
    const h = canvasMini.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#f0f9ff";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    ctx.fillStyle = "#991b1b";
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1e293b";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`p${protons}`, cx, cy + 3);
    if (neutrons > 0) {
      ctx.fillStyle = "#64748b";
      ctx.font = "9px sans-serif";
      ctx.fillText(`+n${neutrons}`, cx, cy + 16);
    }
    const rings = Math.min(3, Math.ceil(electrons / 2));
    for (let r = 0; r < rings; r += 1) {
      const radius = 28 + r * 16;
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      const count = r === rings - 1 ? electrons - (rings - 1) * 2 : 2;
      for (let i = 0; i < count; i += 1) {
        const ang = (i / Math.max(count, 1)) * Math.PI * 2 + r;
        ctx.fillStyle = "#2563eb";
        ctx.beginPath();
        ctx.arc(cx + Math.cos(ang) * radius, cy + Math.sin(ang) * radius, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  btnCheck.addEventListener("click", () => {
    const ok = state.p === 6 && state.e === 6 && state.n === 6;
    if (ok) {
      markCompleted(TASK_ID);
      feedback.innerHTML =
        "<span class=\"atom-ok\">正確！中性碳原子：6 質子、6 電子（Z＝6），質量數 12（6 個中子）。這對應講義 6-3 的 Z＝p、A＝p＋n。</span>";
    } else if (state.p !== state.e) {
      feedback.innerHTML =
        "<span class=\"atom-warn\">目前不是中性粒子：質子數與電子數不相等，這是離子。若要完成任務，請調成<strong>中性碳</strong>（6 p、6 e）；中子數也請設為 6 以對應碳-12。</span>";
    } else if (state.p !== 6) {
      feedback.innerHTML =
        "<span class=\"atom-warn\">你做的是中性原子，但原子序不是 6。碳應有 6 個質子。提示：週期表上碳的原子序是 6。</span>";
    } else {
      feedback.innerHTML =
        "<span class=\"atom-warn\">質子與電子已是 6，但中子數還不對。任務要求碳-12：中子數也應為 6（A＝12）。</span>";
    }
  });

  btnClose.addEventListener("click", () => {
    overlay.hidden = true;
    onClose?.();
  });

  overlay.hidden = false;
  render();

  return {
    close() {
      overlay.hidden = true;
    },
  };
}

export function openAtomLabIfNeeded(root, islandId, handlers) {
  if (islandId !== "atom") return null;
  return mountAtomLab(root, handlers);
}
