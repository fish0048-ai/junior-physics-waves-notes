import { ISLANDS, LIGHTHOUSE, islandById, stageById } from "./config.js?v=9";
import {
  getLighthouseBest,
  getMistakes,
  islandProgress,
  nextOpenStage,
  recordLighthouse,
  removeMistake,
  resetAllProgress,
  starCount,
} from "./progress.js?v=9";
import { mountFallback2D } from "./fallback-2d.js?v=9";
import { openStage } from "./labs/index.js?v=9";
import { mountQuiz } from "./labs/quiz-lab.js?v=9";
import { pickMixed, questionsFor } from "./quiz-bank.js?v=9";
import { createPanelController } from "./ui-panel.js?v=9";
import { ICONS, UI } from "./icons.js?v=9";
import { sfx } from "./sfx.js?v=9";
import { burst } from "./fx.js?v=9";

const TUTORIAL_KEY = "jpwn.ch6islands.tutorial";
const FINALE_KEY = "jpwn.ch6islands.finale";
const LIGHTHOUSE_COLOR = { color: "#ff7043", accent: "#d9532c" };

const root = document.getElementById("islands-app");
const canvas = document.getElementById("islands-canvas");
const fallbackHost = document.getElementById("islands-fallback");
const labOverlay = document.getElementById("islands-lab");
const tutorialHost = document.getElementById("islands-tutorial");
const finaleHost = document.getElementById("islands-finale");
const mistakesHost = document.getElementById("islands-mistakes");
const starsEl = document.getElementById("islands-progress");
const hintEl = document.getElementById("islands-hint");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const params = new URLSearchParams(location.search);

const panel = createPanelController(root);
let world = null;
let fallback = null;
let lab = null;
let activeId = null;
let pending = null;
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

function lighthouseText() {
  const best = getLighthouseBest();
  return best ? `最佳 ${best.score}／${best.total}` : "混合 10 題";
}

function syncChrome() {
  const { done, total } = starCount();
  starsEl.innerHTML = `${UI.star}<b>${done}</b><span>／${total}</span>`;
  starsEl.setAttribute("aria-label", `已點亮 ${done} 顆星，共 ${total} 顆`);
  root.querySelectorAll("[data-dock]").forEach((btn) => {
    const island = islandById(btn.dataset.dock);
    const prog = islandProgress(island);
    btn.classList.toggle("is-on", island.id === activeId);
    btn.classList.toggle("is-done", prog.complete);
    btn.querySelector(".dock-prog").textContent = `${prog.done}/${prog.total}`;
  });
  const lh = root.querySelector("[data-lighthouse] .dock-prog");
  if (lh) lh.textContent = lighthouseText();
  const count = getMistakes().length;
  const badge = root.querySelector("#islands-mistake-count");
  badge.textContent = String(count);
  badge.hidden = count === 0;
  world?.refreshStatus();
  world?.setHubNote(lighthouseText());
  fallback?.refresh();
}

function mountDock() {
  const dock = root.querySelector("#islands-dock");
  dock.innerHTML =
    ISLANDS.map(
      (island) => `
    <button type="button" class="dock-card" data-dock="${island.id}" style="--isl:${island.color};--isl-deep:${island.accent}" aria-label="${island.index}. ${island.title}">
      <span class="dock-icon">${ICONS[island.id]}</span>
      <span class="dock-text"><span class="dock-num">${pad(island.index)}<span class="dock-prog"></span></span><span class="dock-name">${island.shortTitle}</span></span>
      <span class="dock-star">${UI.star}</span>
    </button>`
    ).join("") +
    `<button type="button" class="dock-card is-lighthouse" data-lighthouse style="--isl:${LIGHTHOUSE_COLOR.color};--isl-deep:${LIGHTHOUSE_COLOR.accent}" aria-label="7. ${LIGHTHOUSE.title}">
      <span class="dock-icon">${ICONS.lighthouse}</span>
      <span class="dock-text"><span class="dock-num">總挑戰<span class="dock-prog"></span></span><span class="dock-name">燈塔</span></span>
    </button>`;
  dock.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-lighthouse]")) {
      startLighthouse();
      return;
    }
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

/** 開一個任務視窗；關閉後依 pending 決定下一步 */
function openOverlay(meta, mount) {
  if (lab) return;
  panel.close();
  labOverlay.style.setProperty("--isl", meta.color);
  labOverlay.style.setProperty("--isl-deep", meta.accent);
  root.querySelector("#islands-lab-icon").innerHTML = meta.icon;
  root.classList.add("is-lab");
  world?.setPaused(true);
  sfx.play("open");
  lab = mount({
    onClose: () => {
      lab = null;
      root.classList.remove("is-lab");
      world?.setPaused(false);
      syncChrome();
      const next = pending;
      pending = null;
      if (finalePending) {
        finalePending = false;
        showFinale();
      }
      if (next?.type === "stage") startExplore(next.island, next.stage);
      else if (next?.type === "island") selectIsland(next.island);
      else if (next?.type === "mistakes") showMistakes();
      else if (next?.type === "mistakeQuiz") startMistakeQuiz();
      else if (meta.islandId) {
        activeId = meta.islandId;
        panel.open(meta.islandId);
        syncChrome();
        sfx.play("close");
      }
    },
    onAnswer: () => syncChrome(),
    onOpenMistakes: () => {
      pending = { type: "mistakes" };
      lab?.close();
    },
    ...meta.handlers,
  });
  if (!lab) {
    root.classList.remove("is-lab");
    world?.setPaused(false);
  }
}

function startExplore(id, stageId) {
  const island = islandById(id);
  if (!island || lab) return;
  const stage = stageById(island, stageId) || nextOpenStage(island) || island.stages[0];
  activeId = id;
  openOverlay(
    {
      color: island.color,
      accent: island.accent,
      icon: ICONS[id],
      islandId: id,
      handlers: {
        onComplete: () => celebrate(island),
        onNext: (nextId) => {
          pending = { type: "island", island: nextId };
          lab?.close();
        },
        onStage: (nextStage) => {
          pending = { type: "stage", island: id, stage: nextStage };
          lab?.close();
        },
      },
    },
    (h) => openStage(root, island, stage, h)
  );
  syncChrome();
}

function startLighthouse() {
  if (lab) return;
  openOverlay({ ...LIGHTHOUSE_COLOR, icon: ICONS.lighthouse, islandId: null, handlers: {} }, (h) =>
    mountQuiz(
      root,
      {
        title: LIGHTHOUSE.title,
        lead: "從 6-1～6-4 隨堂練習題庫混合抽 10 題，刷新你的最佳紀錄。答錯的題目會收進錯題本。",
        load: () => pickMixed(LIGHTHOUSE.sections, LIGHTHOUSE.count),
        passAt: null,
        links: [
          { href: "../review-ch6.html", label: "第 6 章章末評量" },
          { href: "../ch6.html", label: "回第 6 章目錄" },
        ],
        onFinish: (score, total) => {
          const before = getLighthouseBest();
          recordLighthouse(score, total);
          if (!before || score > before.score) toast(`${UI.star}<span>燈塔新紀錄：${score}／${total}</span>`);
          syncChrome();
        },
      },
      h
    )
  );
}

function startMistakeQuiz() {
  if (lab) return;
  openOverlay({ color: "#7c3aed", accent: "#5b21b6", icon: UI.notebook, islandId: null, handlers: {} }, (h) =>
    mountQuiz(
      root,
      {
        title: "錯題本練習",
        lead: "最多 10 題，答對的題目會從錯題本移除。",
        load: () => questionsFor(getMistakes().slice(0, 10)),
        passAt: null,
        clearOnCorrect: true,
        emptyText: "錯題本是空的。挑戰題答錯的題目會自動收進來。",
      },
      h
    )
  );
}

async function showMistakes() {
  const refs = getMistakes();
  mistakesHost.hidden = false;
  mistakesHost.innerHTML = `
    <div class="isl-modal-card is-wide">
      <span class="isl-modal-icon is-purple">${UI.notebook}</span>
      <h2 id="isl-mistakes-title">錯題本</h2>
      <p>${refs.length ? `共 ${refs.length} 題。題目來自第 6 章隨堂練習題庫。` : "目前沒有錯題。挑戰題答錯的題目會自動收進來。"}</p>
      <ol class="isl-mistakes"><li class="quiz-loading">${refs.length ? "正在讀取題目…" : ""}</li></ol>
      <div class="isl-modal-actions">
        <button type="button" class="isl-btn is-ghost" data-mk="close">關閉</button>
        <button type="button" class="isl-btn is-primary" data-mk="practice" ${refs.length ? "" : "disabled"}>練習錯題${UI.arrow}</button>
      </div>
    </div>`;
  mistakesHost.querySelector('[data-mk="close"]').focus();
  if (!refs.length) {
    mistakesHost.querySelector(".isl-mistakes").innerHTML = "";
    return;
  }
  try {
    const list = await questionsFor(refs);
    mistakesHost.querySelector(".isl-mistakes").innerHTML = list
      .map(
        (q) => `<li>
          <p class="mk-q"><small>${q.section}</small>${q.q}</p>
          <p class="mk-a">正確答案（${q.letter}）${q.choices[q.ans]}</p>
          ${q.explain ? `<p class="mk-e">${q.explain}</p>` : ""}
          <div class="mk-actions">
            <a href="../exams/${q.section}.html">${q.section} 段考前練習</a>
            <button type="button" data-mk-remove="${q.section}|${q.index}">我會了，移除</button>
          </div>
        </li>`
      )
      .join("");
  } catch {
    mistakesHost.querySelector(".isl-mistakes").innerHTML = '<li class="mk-e">題庫暫時載入不了，請稍後再試。</li>';
  }
}

function closeMistakes() {
  mistakesHost.hidden = true;
}

function celebrate(island) {
  sfx.play("complete");
  burst(root, [island.color, "#f5b301", "#ffffff", "#ff7043", "#34d399"]);
  const { done, total } = starCount();
  const prog = islandProgress(island);
  toast(`${UI.star}<span>${prog.complete ? `${island.title}全部點亮！` : "過關！"}已點亮 ${done}／${total} 顆星</span>`);
  starsEl.classList.remove("is-bump");
  void starsEl.offsetWidth;
  starsEl.classList.add("is-bump");
  syncChrome();
  if (done === total && readFlag(FINALE_KEY) !== "done") finalePending = true;
}

const STEPS = [
  {
    icon: UI.drag,
    title: "歡迎來到理化探索群島",
    text: "六座島串起第 6 章 6-1～6-4。拖曳可以旋轉，滾輪或雙指可以縮放。",
  },
  {
    icon: UI.tap,
    title: "每座島有好幾關",
    text: "點島嶼或下方的島卡，會看到探索任務、實驗站、挑戰題。挑戰題直接取自隨堂練習題庫。",
  },
  {
    icon: UI.star,
    title: "點亮全部星星",
    text: "每過一關點亮一顆星；答錯的題目會收進錯題本。中央燈塔是混合題總挑戰。進度只存在這台裝置。",
    reset: true,
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
      ${s.reset ? '<button type="button" class="isl-text-btn" data-tut="reset">換下一位同學使用？清除這台裝置的群島進度</button>' : ""}
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
      <p>你完成了第 6 章所有關卡。接著挑戰燈塔總挑戰、用章末評量檢查自己，或回講義複習。</p>
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
  root.querySelector("#islands-btn-mistakes").addEventListener("click", () => showMistakes());
  root.querySelector("#islands-btn-sound").addEventListener("click", () => {
    sfx.setOn(!sfx.isOn());
    syncSoundButton();
    sfx.play("tap");
  });
  tutorialHost.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-tut]");
    if (!btn) return;
    const step = Number(tutorialHost.dataset.step || 0);
    if (btn.dataset.tut === "reset") {
      if (window.confirm("清除這台裝置的群島進度、錯題本與燈塔紀錄？此動作無法復原。")) {
        resetAllProgress();
        location.reload();
      }
      return;
    }
    if (btn.dataset.tut === "skip" || step >= STEPS.length - 1) closeTutorial();
    else showTutorial(step + 1);
  });
  finaleHost.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-finale]")) closeFinale();
  });
  mistakesHost.addEventListener("click", (ev) => {
    const rm = ev.target.closest("[data-mk-remove]");
    if (rm) {
      const [section, index] = rm.dataset.mkRemove.split("|");
      removeMistake(section, Number(index));
      syncChrome();
      showMistakes();
      return;
    }
    const act = ev.target.closest("[data-mk]")?.dataset.mk;
    if (act === "close") closeMistakes();
    else if (act === "practice") {
      closeMistakes();
      startMistakeQuiz();
    }
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
      else if (!mistakesHost.hidden) closeMistakes();
      else if (lab) lab.close();
      else closePanel();
      return;
    }
    const modalOpen = !tutorialHost.hidden || !finaleHost.hidden || !mistakesHost.hidden;
    if (lab || modalOpen || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ev.key === "7") {
      startLighthouse();
      return;
    }
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
  fallback = mountFallback2D(fallbackHost, {
    onSelect: (id) => selectIsland(id),
    onLighthouse: startLighthouse,
    failed,
  });
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
  const autoStart = !!initial && params.get("start") === "1";
  const want3D = params.get("mode") !== "2d" && probeWebGL();
  if (!want3D) useFallback(false);

  // 任務與教學不依賴 3D：深層連結立刻開任務，首次進入邊載入邊看說明
  if (autoStart) {
    hideLoading();
    startExplore(initial, params.get("stage"));
  } else if (!initial && readFlag(TUTORIAL_KEY) !== "done") {
    showTutorial(0);
  }

  if (want3D) {
    try {
      setLoading(30, "載入 3D 引擎…");
      const mod = await withTimeout(import("./scene-world.js?v=9"), 20000);
      setLoading(70, "建造島嶼與海面…");
      await nextFrame();
      world = new mod.WorldScene(canvas, {
        reducedMotion,
        intro: !initial,
        onIslandPick: (id) => selectIsland(id),
        onHubPick: startLighthouse,
        onFirstInteract: hideHint,
      });
      if (lab && activeId) {
        world.focus(activeId, { instant: true });
        world.setPaused(true);
      }
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

  if (initial && !autoStart) selectIsland(initial, { instant: true, silent: true });
  setTimeout(hideHint, 12000);
}

boot();
