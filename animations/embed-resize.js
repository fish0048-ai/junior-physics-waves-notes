(function () {
  "use strict";
  if (window.parent === window) return;

  function sendHeight() {
    const root = document.querySelector("main") || document.body;
    if (!root) return;
    const height = Math.ceil(
      Math.max(root.scrollHeight || 0, root.getBoundingClientRect().height || 0)
    );
    if (height < 120) return;
    window.parent.postMessage(
      { type: "physics-animation:resize", height },
      location.origin === "null" ? "*" : location.origin
    );
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    if (!event.data || event.data.type !== "physics-animation:request-resize") return;
    sendHeight();
  });

  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(sendHeight).observe(document.body);
  }
  window.addEventListener("load", sendHeight);
  window.addEventListener("orientationchange", () => window.setTimeout(sendHeight, 120));
})();
