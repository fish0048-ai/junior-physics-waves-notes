import { islandById } from "./config.js";
import { markVisited } from "./progress.js";

export function createPanelController(root) {
  const panel = root.querySelector("#islands-panel");
  const titleEl = root.querySelector("#islands-panel-title");
  const bodyEl = root.querySelector("#islands-panel-body");
  const btnExplore = root.querySelector("#islands-btn-explore");
  const btnLecture = root.querySelector("#islands-btn-lecture");
  const btnClose = root.querySelector("#islands-btn-close");
  const btnReset = root.querySelector("#islands-btn-reset-view");

  let currentId = null;
  let onExplore = null;
  let onResetView = null;

  function open(islandId) {
    const island = islandById(islandId);
    if (!island) return;
    currentId = islandId;
    markVisited(islandId);
    titleEl.textContent = island.title;
    bodyEl.innerHTML = `
      <p class="islands-panel-sub">${island.subtitle}</p>
      <p class="islands-panel-ask"><strong>探究：</strong>${island.ask}</p>
      <h3>學習目標</h3>
      <ul>${island.goals.map((g) => `<li>${g}</li>`).join("")}</ul>
      ${
        island.interactive
          ? "<p class=\"islands-panel-note\">此島已有互動任務，請按「開始探索」。</p>"
          : "<p class=\"islands-panel-note\">互動任務將陸續開放；可先閱讀講義或預覽目標。</p>"
      }`;
    btnLecture.href = island.sectionHref;
    btnExplore.disabled = false;
    btnExplore.textContent = island.interactive ? "開始探索" : "預覽任務（即將推出）";
    panel.hidden = false;
    panel.dataset.island = islandId;
  }

  function close() {
    panel.hidden = true;
    currentId = null;
  }

  btnClose.addEventListener("click", close);
  btnExplore.addEventListener("click", () => {
    if (!currentId) return;
    const island = islandById(currentId);
    if (island?.interactive && onExplore) onExplore(currentId);
    else if (!island?.interactive) {
      bodyEl.insertAdjacentHTML(
        "beforeend",
        "<p class=\"islands-panel-wait\">這座島的互動仍在開發中。請先按「閱讀講義」對照課文證據。</p>"
      );
    }
  });
  btnReset?.addEventListener("click", () => onResetView?.());

  return {
    open,
    close,
    setHandlers(handlers) {
      onExplore = handlers.onExplore;
      onResetView = handlers.onResetView;
    },
  };
}
