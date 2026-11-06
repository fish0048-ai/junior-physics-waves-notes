import { ISLANDS, LIGHTHOUSE } from "./config.js?v=10";
import { islandProgress } from "./progress.js?v=10";
import { ICONS, UI } from "./icons.js?v=10";

export function mountFallback2D(host, { onSelect, onLighthouse, onExamBoat, failed = false }) {
  host.hidden = false;
  const render = () => {
    host.innerHTML = `
      <div class="isl-fallback-inner">
        <p class="isl-fallback-lead">${failed ? "3D 場景沒有啟動" : "這台裝置無法顯示 3D 場景"}，改用島嶼清單；任務與進度都一樣。</p>
        <ul class="isl-fallback-grid">
          ${ISLANDS.map((island) => {
            const prog = islandProgress(island);
            return `
            <li>
              <button type="button" class="isl-fallback-card ${prog.complete ? "is-done" : ""}" data-id="${island.id}" style="--isl:${island.color};--isl-deep:${island.accent}">
                <span class="isl-fallback-icon">${ICONS[island.id]}</span>
                <span class="isl-fallback-text">
                  <small>島嶼 ${String(island.index).padStart(2, "0")}　講義 ${island.sectionId}　${prog.done}/${prog.total} 關</small>
                  <strong>${island.title}</strong>
                  <span>${island.mission}</span>
                </span>
                <span class="isl-fallback-star" aria-label="${prog.complete ? "已點亮" : "尚未點亮"}">${UI.star}</span>
              </button>
            </li>`;
          }).join("")}
          <li>
            <button type="button" class="isl-fallback-card" data-lighthouse style="--isl:#ff7043;--isl-deep:#d9532c">
              <span class="isl-fallback-icon">${ICONS.lighthouse}</span>
              <span class="isl-fallback-text">
                <small>總挑戰　6-1～6-4</small>
                <strong>${LIGHTHOUSE.title}</strong>
                <span>從四節題庫混合抽 ${LIGHTHOUSE.count} 題，刷新最佳紀錄。</span>
              </span>
            </button>
          </li>
          <li>
            <button type="button" class="isl-fallback-card" data-examboat style="--isl:#0ea5e9;--isl-deep:#0369a1">
              <span class="isl-fallback-icon">${UI.boat}</span>
              <span class="isl-fallback-text">
                <small>會考徽章　6-1～6-4</small>
                <strong>會考小船</strong>
                <span>題庫中註明出自會考或基測的題目，答對八成拿徽章。</span>
              </span>
            </button>
          </li>
        </ul>
      </div>`;
  };
  render();
  host.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-lighthouse]")) {
      onLighthouse?.();
      return;
    }
    if (ev.target.closest("[data-examboat]")) {
      onExamBoat?.();
      return;
    }
    const btn = ev.target.closest("[data-id]");
    if (btn) onSelect(btn.dataset.id);
  });
  return { refresh: render };
}
