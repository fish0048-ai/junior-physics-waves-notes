import { ISLANDS } from "./config.js";
import { getProgress, isCompleted } from "./progress.js";

export function mountFallback2D(host, { onSelect }) {
  const prog = getProgress();
  host.hidden = false;
  host.innerHTML = `
    <div class="islands-fallback-inner">
      <p class="islands-fallback-lead">此裝置無法使用 WebGL 3D 群島。請從下方清單選擇島嶼，仍可進入互動任務或講義。</p>
      <ul class="islands-fallback-list">
        ${ISLANDS.map(
          (island) => `
          <li>
            <button type="button" class="islands-fallback-btn" data-id="${island.id}">
              <span class="islands-fallback-num">${String(island.index).padStart(2, "0")}</span>
              <span>
                <strong>${island.title}</strong>
                <small>${island.subtitle}</small>
              </span>
              ${island.taskId && isCompleted(island.taskId) ? '<span class="islands-done" aria-label="任務已完成">✓</span>' : ""}
            </button>
          </li>`
        ).join("")}
      </ul>
    </div>`;
  host.querySelectorAll("[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => onSelect(btn.getAttribute("data-id")));
  });
}
