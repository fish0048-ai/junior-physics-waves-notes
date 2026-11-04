import { ISLANDS, islandById } from "./config.js?v=8";
import { isCompleted } from "./progress.js?v=8";
import { mountFallback2D } from "./fallback-2d.js?v=8";
import { openIslandLab } from "./labs/index.js?v=8";
import { createPanelController } from "./ui-panel.js?v=8";
import { ICONS, UI } from "./icons.js?v=8";
import { sfx } from "./sfx.js?v=8";
import { burst } from "./fx.js?v=8";

const TUTORIAL_KEY = "jpwn.ch6islands.tutorial";
const FINALE_KEY = "jpwn.ch6islands.finale";

const root = document.getElementById("islands-app");
const canvas = document.getElementById("islands-canvas");
const fallbackHost = document.getElementById("islands-fallback");
const labOverlay = document.getElementById("islands-lab");
const tutorialHost = document.getElementById("islands-tutorial");
const finaleHost = document.getElementById("islands-finale");
const starsEl = document.getElementById("islands-progress");
const hintEl = document.getElementById("islands-hint");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const params = new URLSearchParams(location.search);

const panel = createPanelController(root);
let world = null;
let fallback = null;
let lab = null;
let activeId = null;
let pendingNext = null;
let finalePending = false;
let toastTimer = 0;

const pad = (n) => String(n).padStart(2, "0");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

function readFlag(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeFlag(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function completedCount() {
  return ISLANDS.filter((island) => isCompleted(island.taskId)).length;
}

function syncChrome() {
  const done = completedCount();
  starsEl.innerHTML = `${UI.star}<b>${done}</b><span>／${ISLANDS.length}</span>`;
  starsEl.setAttribute("aria-label", `已點亮 ${done} 顆星，共 ${ISLANDS.length} 顆`);
  root.querySelectorAll("[data-dock]").forEach((btn) => {
    const island = islandById(btn.dataset.dock);
    btn.classList.toggle("is-on", island.id === activeId);
    btn.classList.toggle("is-done", isCompleted(island.taskId));
  });
  world?.refreshStatus();
  fallback?.refresh();
}

function mountDock() {
  const dock = root.querySelector("#islands-dock");
  dock.innerHTML = ISLANDS.map(
    (island) => `
    <button type="button" class="dock-card" data-dock="${island.id}" style="--isl:${island.color};--isl-deep:${island.accent}" aria-label="${island.index}. ${island.title}">
      <span class="dock-icon">${ICONS[island.id]}</span>
      <span class="dock-text"><span class="dock-num">${pad(island.index)}</span><span class="dock-name">${island.shortTitle}</span></span>
      <span class="dock-star">${UI.star}</span>
    </button>`
  ).join("");
  dock.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-dock]");
    if (btn) selectIsland(btn.dataset.dock);
  });
}

function hideHint() {
  hintEl?.classList.add("is-hidden");
}

function toast(html) {
  const el = root.querySelector("#islands-toast");
  el.innerHTML = html;
  el.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-show"), 2800);
}

function selectIsland(id, { instant = false, silent = false } = {}) {
  if (lab) return;
  const island = islandById(id);
  if (!island) return;
  activeId = id;
  world?.focus(id, { instant });
  panel.open(id);
  syncChrome();
  history.replaceState(null, "", `?island=${id}`);
  if (!silent) sfx.play("select");
  hideHint();
}

function closePanel() {
  if (!panel.isOpen()) return;
  panel.close();
  activeId = null;
  world?.clearSelection();
  syncChrome();
  history.replaceState(null, "", location.pathname);
  sfx.play("close");
}

function resetView() {
  if (panel.isOpen()) closePanel();
  world?.resetView();
}

function startExplore(id) {
  const island = islandById(id);
  if (!island || lab) return;
  panel.close();
  activeId = id;
  labOverlay.style.setProperty("--isl", island.color);
  labOverlay.style.setProperty("--isl-deep", island.accent);
  root.querySelector("#islands-lab-icon").innerHTML = ICONS[id];
  root.classList.add("is-lab");
  world?.setPaused(true);
  sfx.play("open");
  lab = openIslandLab(root, id, {
    onClose: () => {
      lab = null;
      root.classList.remove("is-lab");
      world?.setPaused(false);
      const next = pendingNext;
      pendingNext = null;
      if (finalePending) {
        finalePending = false;
        showFinale();
      }
      if (next) {
        selectIsland(next);
      } else {
        activeId = id;
        panel.open(id);
        syncChrome();
        sfx.play("close");
      }
    },
    onComplete: () => celebrate(island),
    onNext: (nextId) => {
      pendingNext = nextId;
      lab?.close();
    },
  });
  syncChrome();
}

function celebrate(island) {
  sfx.play("complete");
  burst(root, [island.color, "#f5b301", "#ffffff", "#ff7043", "#34d399"]);
  const done = completedCount();
  toast(`${UI.star}<span>任務完成！已點亮 ${done}／${ISLANDS.length} 顆星</span>`);
  starsEl.classList.remove("is-bump");
  void starsEl.offsetWidth;
  starsEl.classList.add("is-bump");
  syncChrome();
  if (done === ISLANDS.length && readFlag(FINALE_KEY) !== "done") finalePending = true;
}

const STEPS = [
  {
    icon: UI.drag,
    title: "歡迎來到理化探索群島",
    text: "六座島串起第 6 章 6-1～6-4。拖曳可以旋轉，滾輪或雙指可以縮放。",
  },
  {
    icon: UI.tap,
    title: "點島嶼，接任務",
    text: "點島嶼或下方的島卡，先讀探究問題和學習目標，再按「開始探索」。",
  },
  {
    icon: UI.star,
    title: "點亮六顆星",
    text: "完成任務就點亮一顆星，島上的旗子也會變成金色。進度只存在這台裝置。",
  },
];

function showTutorial(step = 0) {
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  tutorialHost.innerHTML = `
    <div class="isl-modal-card">
      <span class="isl-modal-icon">${s.icon}</span>
      <p class="isl-modal-kicker">操作說明 ${step + 1}／${STEPS.length}</p>
      <h2 id="isl-tut-title">${s.title}</h2>
      <p>${s.text}</p>
      <div class="isl-dots">${STEPS.map((_, i) => `<span class="${i === step ? "is-on" : ""}"></span>`).join("")}</div>
      <div class="isl-modal-actions">
        <button type="button" class="isl-btn is-ghost" data-tut="skip">略過</button>
        <button type="button" class="isl-btn is-primary" data-tut="next">${last ? "出發探索" : "下一步"}${UI.arrow}</button>
      </div>
    </div>`;
  tutorialHost.hidden = false;
  tutorialHost.dataset.step = String(step);
  tutorialHost.querySelector('[data-tut="next"]').focus();
}

function closeTutorial() {
  tutorialHost.hidden = true;
  writeFlag(TUTORIAL_KEY, "done");
}

function showFinale() {
  writeFlag(FINALE_KEY, "done");
  finaleHost.innerHTML = `
    <div class="isl-modal-card is-finale">
      <div class="isl-finale-stars">${ISLANDS.map((i) => `<span style="--isl:${i.color}">${UI.star}</span>`).join("")}</div>
      <h2 id="isl-finale-title">群島全數點亮！</h2>
      <p>你完成了第 6 章六座島的任務。接著用章末評量檢查自己，或回講義複習。</p>
      <div class="isl-modal-actions is-stack">
        <a class="isl-btn is-primary" href="../review-ch6.html">章末評量${UI.arrow}</a>
        <a class="isl-btn" href="../ch6.html">${UI.book}回第 6 章目錄</a>
        <button type="button" class="isl-btn is-ghost" data-finale="close">繼續探索群島</button>
      </div>
    </div>`;
  finaleHost.hidden = false;
  finaleHost.querySelector(".isl-btn.is-primary").focus();
  if (!reducedMotion) burst(root, ISLANDS.map((i) => i.color).concat("#f5b301", "#ffffff"));
}

function closeFinale() {
  finaleHost.hidden = true;
}

function syncSoundButton() {
  const btn = root.querySelector("#islands-btn-sound");
  const on = sfx.isOn();
  btn.setAttribute("aria-pressed", String(on));
  btn.innerHTML = `${on ? UI.soundOn : UI.soundOff}<span class="lbl">${on ? "音效開" : "音效關"}</span>`;
}

function bindHud() {
  root.querySelector("#islands-btn-reset-view").addEventListener("click", resetView);
  root.querySelector("#islands-btn-help").addEventListener("click", () => showTutorial(0));
  root.querySelector("#islands-btn-sound").addEventListener("click", () => {
    sfx.setOn(!sfx.isOn());
    syncSoundButton();
    sfx.play("tap");
  });
  tutorialHost.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-tut]");
    if (!btn) return;
    const step = Number(tutorialHost.dataset.step || 0);
    if (btn.dataset.tut === "skip" || step >= STEPS.length - 1) closeTutorial();
    else showTutorial(step + 1);
  });
  finaleHost.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-finale]")) closeFinale();
  });
  panel.setHandlers({
    onExplore: startExplore,
    onNext: (nextId) => selectIsland(nextId),
    onClose: closePanel,
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.target.closest?.("input, select, textarea")) return;
    if (ev.key === "Escape") {
      if (!tutorialHost.hidden) closeTutorial();
      else if (!finaleHost.hidden) closeFinale();
      else if (lab) lab.close();
      else closePanel();
      return;
    }
    if (lab || !tutorialHost.hidden || !finaleHost.hidden || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const island = ISLANDS.find((i) => String(i.index) === ev.key);
    if (island) selectIsland(island.id);
  });
}

function probeWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

function useFallback(failed) {
  canvas?.remove();
  root.classList.add("is-2d");
  fallback = mountFallback2D(fallbackHost, { onSelect: (id) => selectIsland(id), failed });
}

function setLoading(percent, text) {
  const bar = document.getElementById("islands-loading-bar");
  const label = document.getElementById("islands-loading-text");
  if (bar) bar.style.width = `${percent}%`;
  if (label && text) label.textContent = text;
}

function hideLoading() {
  const el = document.getElementById("islands-loading");
  if (!el) return;
  el.classList.add("is-done");
  setTimeout(() => el.remove(), 700);
}

function withTimeout(promise, ms) {
  return Promise.race([promise, delay(ms).then(() => Promise.reject(new Error("載入逾時")))]);
}

async function boot() {
  mountDock();
  syncSoundButton();
  bindHud();
  syncChrome();

  const initial = islandById(params.get("island")) ? params.get("island") : null;
  const autoStart = params.get("start") === "1";

  if (params.get("mode") === "2d" || !probeWebGL()) {
    useFallback(false);
  } else {
    try {
      setLoading(30, "載入 3D 引擎…");
      const mod = await withTimeout(import("./scene-world.js?v=8"), 20000);
      setLoading(70, "建造島嶼與海面…");
      await nextFrame();
      world = new mod.WorldScene(canvas, {
        reducedMotion,
        intro: !initial,
        onIslandPick: (id) => selectIsland(id),
        onHubPick: resetView,
        onFirstInteract: hideHint,
      });
      setLoading(100, "準備出航！");
    } catch (err) {
      console.warn("[理化探索群島] 3D 無法啟動，改用 2D 清單：", err);
      world?.dispose();
      world = null;
      useFallback(true);
    }
  }
  syncChrome();
  await delay(reducedMotion ? 0 : 300);
  hideLoading();

  if (initial) {
    selectIsland(initial, { instant: true, silent: true });
    if (autoStart) startExplore(initial);
  } else if (readFlag(TUTORIAL_KEY) !== "done") {
    showTutorial(0);
  }
  setTimeout(hideHint, 12000);
}

boot();
