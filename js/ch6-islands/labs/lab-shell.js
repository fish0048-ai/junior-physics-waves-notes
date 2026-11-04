/** 共用任務外殼：每次換一個全新的內容節點，避免上一個任務的事件殘留 */
export function mountLabShell(root, { title, lead, onClose }) {
  const overlay = root.querySelector("#islands-lab");
  const old = root.querySelector("#islands-lab-content");
  const content = old.cloneNode(false);
  old.replaceWith(content);
  root.querySelector("#islands-lab-title").textContent = title;
  root.querySelector("#islands-lab-lead").textContent = lead || "";
  overlay.hidden = false;
  overlay.querySelector(".islands-lab-card")?.scrollTo?.(0, 0);
  requestAnimationFrame(() => overlay.classList.add("is-open"));

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    overlay.classList.remove("is-open");
    overlay.hidden = true;
    content.innerHTML = "";
    onClose?.();
  };
  root.querySelector("#islands-lab-close").onclick = close;

  return { content, overlay, close };
}

export function feedbackHtml(kind, text) {
  const cls = kind === "ok" ? "atom-ok" : kind === "warn" ? "atom-warn" : "islands-panel-note";
  return `<p class="lab-feedback"><span class="${cls}">${text}</span></p>`;
}
