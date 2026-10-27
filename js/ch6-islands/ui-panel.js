import { islandById } from "./config.js?v=6";
import { isCompleted, markVisited } from "./progress.js?v=6";

export function createPanelController(root) {
  const panel = root.querySelector("#islands-panel");
  const titleEl = root.querySelector("#islands-panel-title");
  const bodyEl = root.querySelector("#islands-panel-body");
  const btnExplore = root.querySelector("#islands-btn-explore");
  const btnLecture = root.querySelector("#islands-btn-lecture");
  const btnClose = root.querySelector("#islands-btn-close");
  const btnNext = root.querySelector("#islands-btn-next");

  let currentId = null;
  let onExplore = null;
  let onNext = null;

  function open(islandId) {
    const island = islandById(islandId);
    if (!island) return;
    currentId = islandId;
    markVisited(islandId);
    const done = island.taskId && isCompleted(island.taskId);
    titleEl.textContent = island.title;
    bodyEl.innerHTML = `
      <p class="islands-panel-sub">${island.subtitle}${done ? ' <span class="islands-done">任務已完成</span>' : ""}</p>
      <p class="islands-panel-ask"><strong>探究：</strong>${island.ask}</p>
      <h3>學習目標</h3>
      <ul>${island.goals.map((g) => `<li>${g}</li>`).join("")}</ul>
      <p class="islands-panel-note">按「開始探索」進入互動任務；也可先閱讀講義 ${island.sectionId}。</p>`;
    btnLecture.href = island.sectionHref;
    btnExplore.disabled = false;
    btnExplore.textContent = "開始探索";
    const next = islandById(island.nextIsland);
    if (btnNext && next) {
      btnNext.hidden = false;
      btnNext.textContent = `下一座：${next.shortTitle || next.title}`;
      btnNext.dataset.next = next.id;
    }
    panel.hidden = false;
    panel.dataset.island = islandId;
  }

  function close() {
    panel.hidden = true;
    currentId = null;
  }

  btnClose.addEventListener("click", close);
  btnExplore.addEventListener("click", () => {
    if (currentId && onExplore) onExplore(currentId);
  });
  btnNext?.addEventListener("click", () => {
    const nextId = btnNext.dataset.next;
    if (nextId && onNext) onNext(nextId);
  });

  return {
    open,
    close,
    setHandlers(handlers) {
      onExplore = handlers.onExplore;
      onNext = handlers.onNext;
    },
  };
}
