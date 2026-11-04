import { ISLANDS } from "./config.js?v=8";
import { isCompleted } from "./progress.js?v=8";
import { ICONS, UI } from "./icons.js?v=8";

export function mountFallback2D(host, { onSelect, failed = false }) {
  host.hidden = false;
  const render = () => {
    host.innerHTML = `
      <div class="isl-fallback-inner">
        <p class="isl-fallback-lead">${failed ? "3D 場景沒有啟動" : "這台裝置無法顯示 3D 場景"}，改用島嶼清單；任務與進度都一樣。</p>
        <ul class="isl-fallback-grid">
          ${ISLANDS.map(
            (island) => `
            <li>
              <button type="button" class="isl-fallback-card ${isCompleted(island.taskId) ? "is-done" : ""}" data-id="${island.id}" style="--isl:${island.color};--isl-deep:${island.accent}">
                <span class="isl-fallback-icon">${ICONS[island.id]}</span>
                <span class="isl-fallback-text">
                  <small>島嶼 ${String(island.index).padStart(2, "0")}　講義 ${island.sectionId}</small>
                  <strong>${island.title}</strong>
                  <span>${island.mission}</span>
                </span>
                <span class="isl-fallback-star" aria-label="${isCompleted(island.taskId) ? "已點亮" : "尚未點亮"}">${UI.star}</span>
              </button>
            </li>`
          ).join("")}
        </ul>
      </div>`;
  };
  render();
  host.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-id]");
    if (btn) onSelect(btn.dataset.id);
  });
  return { refresh: render };
}
