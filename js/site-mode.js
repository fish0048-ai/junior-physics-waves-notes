/** 講義／練習雙模式 */
(function () {
  const LS = "jpwn.siteMode";

  function detect() {
    try {
      const q = new URLSearchParams(location.search).get("mode");
      if (q === "practice" || q === "lecture") {
        localStorage.setItem(LS, q);
        return q;
      }
    } catch (err) { /* ignore */ }

    const page = document.body?.dataset?.page || "";
    const forced = document.body?.dataset?.mode || "";
    if (forced === "practice" || forced === "lecture") {
      try { localStorage.setItem(LS, forced); } catch (err) { /* ignore */ }
      return forced;
    }
    if (page === "practice-home" || page === "practice-chapter") return "practice";

    try {
      const saved = localStorage.getItem(LS);
      if (saved === "practice" || saved === "lecture") return saved;
    } catch (err) { /* ignore */ }
    return "lecture";
  }

  function set(mode) {
    const m = mode === "practice" ? "practice" : "lecture";
    try { localStorage.setItem(LS, m); } catch (err) { /* ignore */ }
    return m;
  }

  /** 在相對路徑加上 ?mode=practice（已有 mode 則不重複） */
  function appendMode(href, mode) {
    if (!href || href === "#" || mode !== "practice") return href;
    if (/[?&]mode=/.test(href)) return href;
    const hashIdx = href.indexOf("#");
    const hash = hashIdx >= 0 ? href.slice(hashIdx) : "";
    const base = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
    return base + (base.includes("?") ? "&" : "?") + "mode=practice" + hash;
  }

  window.JPWNSiteMode = { detect, set, appendMode, LS };
})();
