import { ISLANDS, islandById } from "./config.js?v=5";
import { isCompleted } from "./progress.js?v=5";
import { mountFallback2D } from "./fallback-2d.js?v=5";
import { openIslandLab } from "./labs/index.js?v=5";
import { WorldScene, probeWebGL } from "./scene-world.js?v=5";
import { createPanelController } from "./ui-panel.js?v=5";

const root = document.getElementById("islands-app");
const canvas = document.getElementById("islands-canvas");
const fallbackHost = document.getElementById("islands-fallback");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const panel = createPanelController(root);
let world = null;
let labInstance = null;

function syncChrome(activeId) {
  const done = ISLANDS.filter((island) => island.taskId && isCompleted(island.taskId)).length;
  const progress = root.querySelector("#islands-progress");
  if (progress) progress.textContent = `已完成 ${done}／${ISLANDS.length}`;
  root.querySelectorAll("[data-dock]").forEach((btn) => {
    const id = btn.getAttribute("data-dock");
    const island = islandById(id);
    btn.classList.toggle("is-on", id === activeId);
    btn.classList.toggle("is-done", !!(island?.taskId && isCompleted(island.taskId)));
  });
}

function mountDock() {
  const dock = root.querySelector("#islands-dock");
  if (!dock) return;
  dock.innerHTML = ISLANDS.map(
    (island) =>
      `<button type="button" data-dock="${island.id}" style="box-shadow:inset 4px 0 0 ${island.color}"><span>${String(island.index).padStart(2, "0")}</span>${island.shortTitle}</button>`
  ).join("");
  dock.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-dock]");
    if (btn) selectIsland(btn.getAttribute("data-dock"));
  });
}

function selectIsland(id) {
  const island = islandById(id);
  if (!island) return;
  if (world) world.highlightIsland(id);
  panel.open(id);
  syncChrome(id);
  history.replaceState(null, "", `?island=${id}`);
}

function startExplore(id) {
  if (labInstance?.close) labInstance.close();
  panel.close();
  world?.setPaused(true);
  labInstance = openIslandLab(root, id, {
    onClose: () => {
      labInstance = null;
      world?.setPaused(false);
    },
    onComplete: () => {
      world?.refreshCompletionMarkers();
      syncChrome(id);
    },
    onNext: (nextId) => {
      labInstance?.close();
      labInstance = null;
      world?.setPaused(false);
      selectIsland(nextId);
    },
  });
}

panel.setHandlers({
  onExplore: startExplore,
  onNext: (nextId) => selectIsland(nextId),
});

root.querySelector("#islands-btn-back")?.addEventListener("click", (ev) => {
  ev.preventDefault();
  window.location.href = "../ch6.html";
});

root.querySelector("#islands-btn-reset-view")?.addEventListener("click", () => {
  world?.resetView();
  panel.close();
});

mountDock();
syncChrome(null);

if (!probeWebGL()) {
  canvas?.remove();
  mountFallback2D(fallbackHost, {
    onSelect: (id) => {
      selectIsland(id);
      const island = islandById(id);
      if (island?.interactive) startExplore(id);
    },
  });
} else {
  fallbackHost.hidden = true;
  try {
    world = new WorldScene(canvas, {
      reducedMotion,
      onIslandPick: selectIsland,
    });
  } catch (err) {
    canvas?.remove();
    fallbackHost.hidden = false;
    fallbackHost.innerHTML = `<p class="islands-fallback-lead">3D 場景沒有啟動。請重新整理；仍可從上方島嶼進入任務。${err && err.message ? `（${err.message}）` : ""}</p>`;
  }
}

const params = new URLSearchParams(location.search);
const initial = params.get("island");
if (initial && islandById(initial)) {
  selectIsland(initial);
  if (params.get("start") === "1") {
    const island = islandById(initial);
    if (island?.interactive) startExplore(initial);
  }
}
