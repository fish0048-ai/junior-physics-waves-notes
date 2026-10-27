import { ELEMENTS_Z20 } from "../config.js?v=6";
import { isCompleted, markCompleted } from "../progress.js?v=6";
import { feedbackHtml, mountLabShell } from "./lab-shell.js?v=6";

const TASK_ID = "atom:neutral-carbon-12";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function describeSpecies(p, e) {
  const z = p;
  const charge = p - e;
  if (z < 1 || z > 20) {
    return { label: "超出國中常用範例（Z＞20）", sym: "?" };
  }
  const el = ELEMENTS_Z20[z];
  if (charge === 0) return { label: `中性${el.name}原子`, sym: el.sym };
  if (charge > 0) return { label: `${el.name}正離子（失去 ${charge} 個電子）`, sym: `${el.sym}${charge > 1 ? charge : ""}+` };
  const c = Math.abs(charge);
  return { label: `${el.name}負離子（得到 ${c} 個電子）`, sym: `${el.sym}${c > 1 ? c : ""}−` };
}

export function mountAtomLab(root, handlers) {
  const shell = mountLabShell(root, {
    title: "原子研究所 · 互動任務",
    lead: "先預測：中性碳原子需要幾個質子、電子、中子？再操作模型驗證（對照 6-3）。",
    onClose: handlers.onClose,
  });

  const state = { p: 6, n: 6, e: 6 };

  shell.content.innerHTML = `
    <div class="atom-controls">
      <div class="atom-part"><strong>質子</strong>
        <button type="button" data-part="p" data-delta="-1">−</button>
        <button type="button" data-part="p" data-delta="1">＋</button></div>
      <div class="atom-part"><strong>中子</strong>
        <button type="button" data-part="n" data-delta="-1">−</button>
        <button type="button" data-part="n" data-delta="1">＋</button></div>
      <div class="atom-part"><strong>電子</strong>
        <button type="button" data-part="e" data-delta="-1">−</button>
        <button type="button" data-part="e" data-delta="1">＋</button></div>
    </div>
    <canvas id="atom-mini-canvas" width="280" height="180" aria-hidden="true"></canvas>
    <div id="atom-readout"></div>
    <div id="atom-feedback"></div>
    <button type="button" class="is-primary lab-check-btn" id="atom-btn-check">檢查：是否為中性碳-12？</button>
    <p class="atom-model-note">⚠ 電子環為示意，不是真實軌道；中性時質子數＝電子數。</p>`;

  const canvasMini = shell.content.querySelector("#atom-mini-canvas");
  const readout = shell.content.querySelector("#atom-readout");
  const feedback = shell.content.querySelector("#atom-feedback");

  shell.content.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-part]");
    if (!btn) return;
    const part = btn.dataset.part;
    const delta = Number(btn.dataset.delta);
    if (part === "p") state.p = clamp(state.p + delta, 1, 20);
    if (part === "n") state.n = clamp(state.n + delta, 0, 24);
    if (part === "e") state.e = clamp(state.e + delta, 0, 22);
    render();
  });

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
    const rings = Math.min(3, Math.ceil(electrons / 2) || 1);
    for (let r = 0; r < rings; r += 1) {
      const radius = 28 + r * 16;
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      const count = r === rings - 1 ? Math.max(0, electrons - (rings - 1) * 2) : 2;
      for (let i = 0; i < count; i += 1) {
        const ang = (i / Math.max(count, 1)) * Math.PI * 2 + r;
        ctx.fillStyle = "#2563eb";
        ctx.beginPath();
        ctx.arc(cx + Math.cos(ang) * radius, cy + Math.sin(ang) * radius, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function render() {
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
      </dl>`;
    drawMini(state.p, state.n, state.e);
    if (isCompleted(TASK_ID)) {
      feedback.innerHTML = feedbackHtml("ok", "任務已完成。可繼續調整觀察離子。");
    }
  }

  shell.content.querySelector("#atom-btn-check").addEventListener("click", () => {
    const ok = state.p === 6 && state.e === 6 && state.n === 6;
    if (ok) {
      markCompleted(TASK_ID);
      feedback.innerHTML = feedbackHtml(
        "ok",
        "正確！中性碳-12：Z＝6，A＝12。質子數＝電子數＝6。"
      );
      handlers.onComplete?.();
    } else if (state.p !== state.e) {
      feedback.innerHTML = feedbackHtml("warn", "目前是離子（p≠e）。任務要求中性碳：6 p、6 e、6 n。");
    } else if (state.p !== 6) {
      feedback.innerHTML = feedbackHtml("warn", "中性但原子序不是 6。碳應有 6 個質子。");
    } else {
      feedback.innerHTML = feedbackHtml("warn", "中子數應為 6（碳-12）。");
    }
  });

  render();
  return { close: shell.close };
}
