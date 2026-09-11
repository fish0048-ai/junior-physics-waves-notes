/** 講義／練習雙模式
 * 練習專區頁（practice-*）固定練習；講義頁（封面／章首／小節／實驗／整本）固定講義。
 * 只有段考／章末評量可依 ?mode= 或上次練習入口延續練習模式。
 * 不可讓 localStorage 的 practice 把講義封面／小節導覽整頁改成練習區。
 */
(function () {
  const LS = "jpwn.siteMode";

  const PRACTICE_PAGES = new Set(["practice-home", "practice-chapter"]);
  const LECTURE_PAGES = new Set(["cover", "home", "section", "book"]);
  const FLEX_PAGES = new Set(["exam", "review"]);

  function readQueryMode() {
    try {
      const q = new URLSearchParams(location.search).get("mode");
      if (q === "practice" || q === "lecture") return q;
    } catch (err) { /* ignore */ }
    return "";
  }

  function readSaved() {
    try {
      const saved = localStorage.getItem(LS);
      if (saved === "practice" || saved === "lecture") return saved;
    } catch (err) { /* ignore */ }
    return "";
  }

  function persist(mode) {
    try { localStorage.setItem(LS, mode); } catch (err) { /* ignore */ }
    return mode;
  }

  function detect() {
    const page = document.body?.dataset?.page || "";
    const forced = document.body?.dataset?.mode || "";
    const query = readQueryMode();

    if (PRACTICE_PAGES.has(page) || forced === "practice") {
      return persist("practice");
    }

    if (LECTURE_PAGES.has(page) || forced === "lecture") {
      /* 講義頁永遠是講義導覽；順便清掉誤留的 practice，避免之後卡住 */
      if (query === "practice") {
        /* 封面誤帶 ?mode=practice 仍當講義（封面是講義入口） */
      }
      return persist("lecture");
    }

    if (query === "practice" || query === "lecture") {
      return persist(query);
    }

    if (FLEX_PAGES.has(page)) {
      const saved = readSaved();
      if (saved) return saved;
    }

    return persist("lecture");
  }

  function set(mode) {
    return persist(mode === "practice" ? "practice" : "lecture");
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
