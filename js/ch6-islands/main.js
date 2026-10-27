import { islandById } from "./config.js";
import { mountFallback2D } from "./fallback-2d.js";
import { openIslandLab } from "./labs/index.js";
import { WorldScene, probeWebGL } from "./scene-world.js";
import { createPanelController } from "./ui-panel.js";

const root = document.getElementById("islands-app");
const canvas = document.getElementById("islands-canvas");
const fallbackHost = document.getElementById("islands-fallback");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const panel = createPanelController(root);
let world = null;
let labInstance = null;

function selectIsland(id) {
  const island = islandById(id);
  if (!island) return;
  if (world) world.highlightIsland(id);
  panel.open(id);
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
    },
  });
}

panel.setHandlers({ onExplore: startExplore });

root.querySelector("#islands-btn-back")?.addEventListener("click", (ev) => {
  ev.preventDefault();
  window.location.href = "../ch6.html";
});

root.querySelector("#islands-btn-reset-view")?.addEventListener("click", () => {
  world?.resetView();
  panel.close();
});

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
  world = new WorldScene(canvas, {
    reducedMotion,
    onIslandPick: selectIsland,
  });
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
