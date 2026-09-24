(function () {
  "use strict";

  if (!("serviceWorker" in navigator)) return;

  function rootPrefix() {
    const root = (document.body && document.body.dataset.root) || ".";
    return root.replace(/\/$/, "") || ".";
  }

  function swUrls() {
    const root = rootPrefix();
    const swUrl = new URL((root === "." ? "./" : root + "/") + "sw-main.js", location.href).href;
    const scopeUrl = new URL((root === "." ? "./" : root + "/"), location.href).href;
    return { swUrl, scopeUrl };
  }

  function register() {
    const { swUrl, scopeUrl } = swUrls();
    navigator.serviceWorker
      .register(swUrl, { scope: scopeUrl })
      .catch(() => {
        /* 本機 file:// 或部分嵌入環境可能失敗 */
      });
  }

  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
})();
