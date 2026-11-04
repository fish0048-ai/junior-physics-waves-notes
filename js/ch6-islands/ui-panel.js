import { islandById } from "./config.js?v=9";
import { isCompleted, islandProgress, markVisited, nextOpenStage } from "./progress.js?v=9";
import { ICONS, UI } from "./icons.js?v=9";

const STAGE_ICON = { task: UI.tap, exp: UI.flask, quiz: UI.quiz };

export function createPanelController(root) {
  const panel = root.querySelector("#islands-panel");
  let currentId = null;
  let handlers = {};

  function open(islandId) {
    const island = islandById(islandId);
    if (!island) return;
    currentId = islandId;
    markVisited(islandId);
    const prog = islandProgress(island);
    const nextStage = nextOpenStage(island);
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
        <p class="isl-panel-status ${prog.complete ? "is-done" : ""}">
          <span>${prog.complete ? UI.star : UI.starOutline}${prog.complete ? "整座島已點亮" : `已完成 ${prog.done}／${prog.total} 關`}</span>
          <span class="isl-panel-bar" aria-hidden="true"><i style="width:${(prog.done / prog.total) * 100}%"></i></span>
        </p>
        <section class="isl-panel-card">
          <h3>探究問題</h3>
          <p>${island.ask}</p>
        </section>
        <section class="isl-stages">
          <h3>關卡</h3>
          <ol>${island.stages
            .map((stage, i) => {
              const done = isCompleted(stage.taskId);
              return `<li class="isl-stage ${done ? "is-done" : ""}">
                <span class="isl-stage-icon">${done ? UI.star : STAGE_ICON[stage.id] || UI.tap}</span>
                <span class="isl-stage-text"><small>第 ${i + 1} 關</small><strong>${stage.title}</strong><span>${stage.desc}</span></span>
                <button type="button" class="isl-stage-go" data-act="stage" data-stage="${stage.id}" aria-label="${done ? "再玩" : "開始"}：${stage.title}">${done ? "再玩" : "開始"}</button>
              </li>`;
            })
            .join("")}</ol>
        </section>
        <section class="isl-panel-goals">
          <h3>學習目標</h3>
          <ul>${island.goals.map((g) => `<li>${UI.check}<span>${g}</span></li>`).join("")}</ul>
        </section>
      </div>
      <div class="isl-panel-actions">
        <button type="button" class="isl-btn is-primary" data-act="explore" id="islands-btn-explore">${
          nextStage ? (prog.done ? `繼續：${nextStage.title}` : "開始探索") : "再玩一次"
        }${UI.arrow}</button>
        <div class="isl-panel-row">
          <a class="isl-btn" id="islands-btn-lecture" href="${island.sectionHref}">${UI.book}講義 ${island.sectionId}</a>
          ${next ? `<button type="button" class="isl-btn is-ghost" data-act="next" id="islands-btn-next">下一座：${next.shortTitle}</button>` : ""}
        </div>
      </div>`;
    panel.hidden = false;
    panel.querySelector(".isl-panel-body").scrollTop = 0;
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
    else if (act === "stage") handlers.onExplore?.(currentId, btn.dataset.stage);
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
