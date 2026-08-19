/** 列印／PDF 連續頁碼（同節多張紙會遞增；封面不印） */
window.JPWNPrintFolios = (function () {
  const STACK_ID = "jpwn-print-folio-stack";
  /** A4 全高；與 @page size 對齊，讓絕對定位落在每張紙底部 */
  const PAGE_MM = 297;
  const BOTTOM_OFFSET_MM = 12;

  function remove() {
    document.getElementById(STACK_ID)?.remove();
  }

  function measureHeight(root) {
    const el = root || document.querySelector(".wrap") || document.body;
    return Math.max(
      el.scrollHeight || 0,
      el.offsetHeight || 0,
      document.documentElement.scrollHeight || 0,
      document.body.scrollHeight || 0
    );
  }

  function mmToPx(mm) {
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;left:-9999px;top:0;height:" + mm + "mm;width:1px;";
    document.body.appendChild(probe);
    const px = probe.offsetHeight || (mm * 96) / 25.4;
    probe.remove();
    return Math.max(1, px);
  }

  /**
   * @param {{ startPage?: number, root?: Element, host?: Element }} opts
   * startPage: 第一張紙的頁碼（該節在整本的起始頁）
   * root: 用來估高度的內容
   * host: 放置 stack 的容器（預設 body；整本用 .book-body）
   */
  function install(opts) {
    remove();
    const startPage = Math.max(1, Number(opts && opts.startPage) || 1);
    const root = (opts && opts.root) || document.querySelector(".wrap") || document.body;
    const host = (opts && opts.host) || root;

    // 封面列印不裝頁碼
    if (document.body.dataset.page === "cover") return;
    if (host.classList?.contains("is-cover")) return;

    const pagePx = mmToPx(PAGE_MM);
    const height = measureHeight(root);
    // 略為高估，避免最後一張沒號碼；多餘的號碼若超出內容通常不會多長出空白頁（absolute 不佔流）
    const pages = Math.max(1, Math.ceil(height / pagePx) + 1);

    const stack = document.createElement("div");
    stack.id = STACK_ID;
    stack.className = "print-folio-stack";
    stack.setAttribute("aria-hidden", "true");

    for (let i = 0; i < pages; i += 1) {
      const slot = document.createElement("div");
      slot.className = "print-folio-abs";
      slot.style.top = "calc(" + i + " * " + PAGE_MM + "mm + " + (PAGE_MM - BOTTOM_OFFSET_MM) + "mm)";
      slot.textContent = "— " + (startPage + i) + " —";
      stack.appendChild(slot);
    }

    // 相對於 host 定位：整本時 host=.book-body，封面在外不會被蓋上號碼
    const prev = window.getComputedStyle(host).position;
    if (prev === "static") host.dataset.jpwnPosFix = "1";
    if (prev === "static") host.style.position = "relative";
    host.appendChild(stack);
  }

  function installFromBody() {
    const start = Number(document.body.dataset.bookPage || document.body.dataset.printStartPage || 1);
    install({ startPage: start });
  }

  return { install, installFromBody, remove, measureHeight };
})();
