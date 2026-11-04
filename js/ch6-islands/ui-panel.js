import { islandById } from "./config.js?v=8";
import { isCompleted, markVisited } from "./progress.js?v=8";
import { ICONS, UI } from "./icons.js?v=8";

export function createPanelController(root) {
  const panel = root.querySelector("#islands-panel");
  let currentId = null;
  let handlers = {};

  function open(islandId) {
    const island = islandById(islandId);
    if (!island) return;
    currentId = islandId;
    markVisited(islandId);
    const done = isCompleted(island.taskId);
    const next = islandById(island.nextIsland);
    panel.style.setProperty("--isl", island.color);
    panel.style.setProperty("--isl-deep", island.accent);
    panel.innerHTML = `
      <div class="isl-panel-head">
        <span class="isl-panel-icon">${ICONS[island.id]}</span>
        <div class="isl-panel-titles">
          <p class="isl-panel-kicker">島嶼 ${String(island.index).padStart(2, "0")}　講義 ${island.sectionId}</p>
          <h2 id="islands-panel-title">${island.title}</h2>
          <p class="isl-panel-sub">${island.subtitle}</p>
        </div>
        <button type="button" class="isl-icon-btn" data-act="close" aria-label="關閉資訊卡">${UI.close}</button>
      </div>
      <div class="isl-panel-body">
        <p class="isl-panel-status ${done ? "is-done" : ""}">
          <span>${done ? UI.star : UI.starOutline}${done ? "已點亮星星" : "尚未點亮"}</span>
          <span>約 ${island.minutes} 分鐘</span>
        </p>
        <section class="isl-panel-card">
          <h3>探究問題</h3>
          <p>${island.ask}</p>
        </section>
        <section class="isl-panel-card is-mission">
          <h3>這座島的任務</h3>
          <p>${island.mission}</p>
        </section>
        <section class="isl-panel-goals">
          <h3>學習目標</h3>
          <ul>${island.goals.map((g) => `<li>${UI.check}<span>${g}</span></li>`).join("")}</ul>
        </section>
      </div>
      <div class="isl-panel-actions">
        <button type="button" class="isl-btn is-primary" data-act="explore" id="islands-btn-explore">${done ? "再玩一次" : "開始探索"}${UI.arrow}</button>
        <div class="isl-panel-row">
          <a class="isl-btn" id="islands-btn-lecture" href="${island.sectionHref}">${UI.book}講義 ${island.sectionId}</a>
          ${next ? `<button type="button" class="isl-btn is-ghost" data-act="next" id="islands-btn-next">下一座：${next.shortTitle}</button>` : ""}
        </div>
      </div>`;
    panel.hidden = false;
    panel.scrollTop = 0;
    requestAnimationFrame(() => panel.classList.add("is-open"));
  }

  function close() {
    panel.classList.remove("is-open");
    panel.hidden = true;
    currentId = null;
  }

  panel.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-act]");
    if (!btn || !currentId) return;
    const act = btn.dataset.act;
    if (act === "close") handlers.onClose?.();
    else if (act === "explore") handlers.onExplore?.(currentId);
    else if (act === "next") handlers.onNext?.(islandById(currentId)?.nextIsland);
  });

  return {
    open,
    close,
    isOpen: () => !panel.hidden,
    currentId: () => currentId,
    setHandlers(next) {
      handlers = next;
    },
  };
}
