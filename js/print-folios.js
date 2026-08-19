/** 列印頁碼（簡化版）
 * 絕對定位疊層會把版面切壞，已停用。
 * 實際頁碼改由 css @page @bottom-center + counter(page) 處理。
 * 側欄／章首仍用 JPWNPages 顯示各節「起始頁」。
 */
window.JPWNPrintFolios = (function () {
  function remove() {
    document.getElementById("jpwn-print-folio-stack")?.remove();
    document.querySelectorAll(".print-folio-stack, .page-folio:not(.page-folio-keep)").forEach((el) => el.remove());
  }

  function install() {
    /* no-op：避免錯位／切版 */
    remove();
  }

  function installFromBody() {
    remove();
  }

  return { install, installFromBody, remove, measureHeight: () => 0 };
})();
