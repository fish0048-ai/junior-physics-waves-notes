/** 共用 lab 外殼：每次 mount 清空內容，避免重複綁定 */
export function mountLabShell(root, { title, lead, onClose }) {
  const overlay = root.querySelector("#islands-lab");
  const content = root.querySelector("#islands-lab-content");
  const titleEl = root.querySelector("#islands-lab-title");
  const leadEl = root.querySelector("#islands-lab-lead");
  const btnClose = root.querySelector("#islands-lab-close");

  titleEl.textContent = title;
  leadEl.textContent = lead || "";
  content.innerHTML = "";
  overlay.hidden = false;

  const close = () => {
    overlay.hidden = true;
    content.innerHTML = "";
    onClose?.();
  };

  btnClose.onclick = close;

  return { content, overlay, close };
}

export function feedbackHtml(kind, text) {
  const cls = kind === "ok" ? "atom-ok" : kind === "warn" ? "atom-warn" : "islands-panel-note";
  return `<p class="lab-feedback"><span class="${cls}">${text}</span></p>`;
}
