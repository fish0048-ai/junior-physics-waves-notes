(function () {
  function inFrame() {
    try {
      return window.self !== window.top;
    } catch (err) {
      return true;
    }
  }

  function useEdgeLayout() {
    if (navigator.maxTouchPoints > 0) return true;
    if (window.matchMedia("(pointer: coarse)").matches) return true;
    if (window.matchMedia("(hover: none)").matches) return true;
    if (window.innerWidth <= 1400) return true;
    if (inFrame()) return true;
    return false;
  }

  if (useEdgeLayout()) document.documentElement.classList.add("is-touch");
  if (inFrame()) document.documentElement.classList.add("is-embedded");

  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");
  }

  const cfg = window.APP_CONFIG || {};
  const root = (document.body.dataset.root || ".").replace(/\/$/, "") || ".";
  const page = document.body.dataset.page || "home";
  const currentId = document.body.dataset.section || "";

  (function loadKatex() {
    const cdn = "https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/";

    /** 把題庫／純文字常見破公式轉成 KaTeX inline（已有 \( \) 的區段不重複處理） */
    function polish(text) {
      let s = String(text || "");
      if (!s) return s;
      const slots = [];
      s = s.replace(/\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/g, (m) => {
        slots.push(m);
        return `\uE000${slots.length - 1}\uE001`;
      });
      // 全形符號 → 半形（稍後再包進數學）
      s = s.replace(/＝/g, "=").replace(/／/g, "/").replace(/－/g, "-").replace(/÷/g, "/");

      function wrap(inner) {
        return `\\(${inner}\\)`;
      }

      s = s.replace(/\bcm³\b/gi, () => wrap("\\mathrm{cm}^{3}"));
      s = s.replace(/\bm²\b/gi, () => wrap("\\mathrm{m}^{2}"));
      s = s.replace(/\b(\d+(?:\.\d+)?)\s*cm³\b/gi, (_, n) => wrap(`${n}\\,\\mathrm{cm}^{3}`));
      s = s.replace(/\b(\d+(?:\.\d+)?)\s*g\/cm³\b/gi, (_, n) => wrap(`${n}\\,\\mathrm{g}/\\mathrm{cm}^{3}`));
      s = s.replace(/\bg\/cm³\b/gi, () => wrap("\\mathrm{g}/\\mathrm{cm}^{3}"));

      // 單位與指數（先長後短）
      s = s.replace(/\b(\d+(?:\.\d+)?)\s*g\s*\/\s*cm\s*3\b/gi, (_, n) => wrap(`${n}\\,\\mathrm{g}/\\mathrm{cm}^{3}`));
      s = s.replace(/\bg\s*\/\s*cm\s*3\b/gi, () => wrap("\\mathrm{g}/\\mathrm{cm}^{3}"));
      s = s.replace(/\b(\d+(?:\.\d+)?)\s*kg\s*\/\s*m\s*3\b/gi, (_, n) => wrap(`${n}\\,\\mathrm{kg}/\\mathrm{m}^{3}`));
      s = s.replace(/\b(\d+(?:\.\d+)?)\s*g\s*\/\s*mL\b/gi, (_, n) => wrap(`${n}\\,\\mathrm{g}/\\mathrm{mL}`));
      s = s.replace(/\b(\d+(?:\.\d+)?)\s*cm\s*3\b/gi, (_, n) => wrap(`${n}\\,\\mathrm{cm}^{3}`));
      s = s.replace(/\bcm\s*3\b/gi, () => wrap("\\mathrm{cm}^{3}"));
      s = s.replace(/\b(\d+(?:\.\d+)?)\s*m\s*\/\s*s\b/gi, (_, n) => wrap(`${n}\\,\\mathrm{m}/\\mathrm{s}`));
      s = s.replace(/\b10\s*-\s*(\d+)\s*m\b/gi, (_, e) => wrap(`10^{-${e}}\\,\\mathrm{m}`));
      s = s.replace(/\b10\s*-\s*(\d+)\b/g, (_, e) => wrap(`10^{-${e}}`));
      s = s.replace(/\b1\s*nm\b/gi, () => wrap("1\\,\\mathrm{nm}"));

      // 常見物理式
      s = s.replace(/\bv\s*=\s*f\s*λ\b/g, () => wrap("v=f\\lambda"));
      s = s.replace(/\bv\s*=\s*fλ\b/g, () => wrap("v=f\\lambda"));
      s = s.replace(/\bv\s*=\s*331\s*\+\s*0\.6\s*T\b/g, () => wrap("v=331+0.6T"));
      s = s.replace(/\bD\s*=\s*M\s*\/\s*V\b/g, () => wrap("D=\\dfrac{M}{V}"));
      s = s.replace(/\bH\s*=\s*MS\s*ΔT\b/g, () => wrap("H=MS\\Delta T"));
      s = s.replace(/\bH\s*=\s*M\s*ΔT\b/g, () => wrap("H=M\\,\\Delta T"));
      s = s.replace(/\bh\s*=\s*1\s*\/\s*2\s*v\s*t\b/gi, () => wrap("h=\\dfrac{1}{2}vt"));
      s = s.replace(/\b9\s*\/\s*5\b/g, () => wrap("\\dfrac{9}{5}"));
      s = s.replace(/\b5\s*\/\s*9\b/g, () => wrap("\\dfrac{5}{9}"));

      // 溫度單位
      s = s.replace(/(-?\d+(?:\.\d+)?)\s*°\s*C\b/g, (_, n) => wrap(`${n}^{\\circ}\\mathrm{C}`));
      s = s.replace(/(-?\d+(?:\.\d+)?)\s*°\s*F\b/g, (_, n) => wrap(`${n}^{\\circ}\\mathrm{F}`));
      s = s.replace(/(-?\d+(?:\.\d+)?)\s*℃/g, (_, n) => wrap(`${n}^{\\circ}\\mathrm{C}`));
      s = s.replace(/(-?\d+(?:\.\d+)?)\s*℉/g, (_, n) => wrap(`${n}^{\\circ}\\mathrm{F}`));
      s = s.replace(/°\s*C\b/g, () => wrap("^{\\circ}\\mathrm{C}"));
      s = s.replace(/°\s*F\b/g, () => wrap("^{\\circ}\\mathrm{F}"));
      s = s.replace(/℃/g, () => wrap("^{\\circ}\\mathrm{C}"));
      s = s.replace(/℉/g, () => wrap("^{\\circ}\\mathrm{F}"));

      // 乘號只在「數字 × 數字／變數」時包進數學
      s = s.replace(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)/g, (_, a, b) => wrap(`${a}\\times ${b}`));
      s = s.replace(/(\d+(?:\.\d+)?)\s*×\s*([A-Za-zΔλ])/g, (_, a, b) => wrap(`${a}\\times ${b === "λ" ? "\\lambda" : b === "Δ" ? "\\Delta" : b}`));

      s = s.replace(/\uE000(\d+)\uE001/g, (_, i) => slots[Number(i)] || "");
      return s;
    }

    function render(root) {
      const scope = root || document.body;
      if (!scope || !window.katex) return;

      // 獨立公式框：直接用 katex.render（支援同一格多條 \[...\]）
      scope.querySelectorAll(".formula").forEach((el) => {
        if (el.querySelector(".katex") && !el.querySelector(".katex-error")) return;
        if (!el.dataset.mathSrc) el.dataset.mathSrc = el.innerHTML;
        const src = el.dataset.mathSrc;
        const blocks = [];
        const re = /\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$/g;
        let m;
        while ((m = re.exec(src)) !== null) {
          const tex = (m[1] != null ? m[1] : m[2]).trim();
          if (tex) blocks.push(tex);
        }
        if (!blocks.length) {
          let tex = src.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").trim();
          tex = tex.replace(/^\\\[[\s\n]*/, "").replace(/[\s\n]*\\\]$/, "");
          tex = tex.replace(/^\\\([\s\n]*/, "").replace(/[\s\n]*\\\)$/, "");
          tex = tex.replace(/^\$\$[\s\n]*/, "").replace(/[\s\n]*\$\$$/, "");
          if (tex) blocks.push(tex);
        }
        if (!blocks.length) return;
        el.innerHTML = "";
        blocks.forEach((tex) => {
          const host = document.createElement(blocks.length > 1 ? "div" : "span");
          try {
            window.katex.render(tex, host, {
              displayMode: true,
              throwOnError: false,
              strict: "ignore"
            });
          } catch (err) {
            host.textContent = tex;
          }
          el.appendChild(host);
        });
      });

      // 行內 \(...\) 仍用 auto-render
      if (typeof window.renderMathInElement === "function") {
        window.renderMathInElement(scope, {
          delimiters: [
            { left: "\\[", right: "\\]", display: true },
            { left: "\\(", right: "\\)", display: false },
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false }
          ],
          throwOnError: false,
          ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "input"],
          ignoredClasses: ["katex", "katex-error"]
        });
      }
    }

    function scheduleRender() {
      render();
      window.requestAnimationFrame(() => render());
      window.setTimeout(() => render(), 200);
      window.setTimeout(() => render(), 800);
    }

    window.JPWNMath = { render, polish, scheduleRender };
    if (!document.querySelector("link[data-jpwn-katex]")) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = cdn + "katex.min.css";
      css.setAttribute("data-jpwn-katex", "1");
      document.head.appendChild(css);
    }
    function loadAutoRender() {
      if (typeof window.renderMathInElement === "function") {
        scheduleRender();
        return;
      }
      const auto = document.createElement("script");
      auto.src = cdn + "contrib/auto-render.min.js";
      auto.onload = scheduleRender;
      auto.onerror = scheduleRender; // 沒有 auto-render 也至少渲染 .formula
      document.head.appendChild(auto);
    }
    if (window.katex) {
      loadAutoRender();
    } else {
      const core = document.createElement("script");
      core.src = cdn + "katex.min.js";
      core.onload = loadAutoRender;
      core.onerror = () => console.warn("[JPWNMath] KaTeX 載入失敗");
      document.head.appendChild(core);
    }
    window.addEventListener("load", () => scheduleRender());
    window.addEventListener("pageshow", () => scheduleRender());
  })();

  function url(path) {
    if (!path) return "#";
    if (root === ".") return path;
    return root + "/" + path.replace(/^\.\//, "");
  }

  function currentSection() {
    return (cfg.sections || []).find((s) => s.id === currentId);
  }

  function chapterNavText(c) {
    if (!c) return "";
    return c.nav || `第 ${c.id} 章`;
  }

  function thisChapterNav() {
    return cfg.chapter?.nav || `第 ${cfg.chapter?.id || ""} 章`;
  }

  function renderHeader() {
    const host = document.getElementById("site-header");
    if (!host) return;
    const sec = currentSection();
    const review = cfg.review;
    const brandText = page === "cover"
      ? `${cfg.chapter?.grade || "八年級理化"}　講義封面`
      : page === "review"
      ? `${cfg.chapter?.grade || "八年級理化"}　${review?.title || "章末評量"}`
      : page === "book"
      ? `${cfg.chapter?.grade || "八年級理化"}　整本講義`
      : page === "exam" && sec
      ? `${cfg.chapter?.grade || "八年級理化"}　${sec.id} 段考前練習`
      : sec
      ? `${cfg.chapter?.grade || "八年級理化"}　${sec.id} ${sec.title}`
      : `${cfg.chapter?.grade || "八年級理化"}　${thisChapterNav()}`;
    const checkBtn = (page === "review" || page === "exam")
      ? `<button class="btn btn-ghost" id="btn-check" type="button">檢查作答</button>`
      : "";
    const bookLink = page === "book"
      ? ""
      : `<a class="btn btn-ghost" id="btn-book" href="${url("book.html")}" target="_blank" rel="noopener">整本講義</a>`;
    const tools = (page === "cover")
      ? `<button class="btn btn-orange" id="btn-pdf" type="button">下載封面 PDF</button>
         ${bookLink}`
      : (page === "home")
      ? `<button class="btn btn-orange" id="btn-pdf" type="button">下載目錄 PDF</button>
         ${bookLink}`
      : (page === "book")
      ? `<button class="btn btn-green" id="btn-answers" type="button">顯示答案</button>
         <button class="btn btn-orange" id="btn-pdf" type="button">下載整本 PDF</button>
         <button class="btn btn-ghost" id="btn-pdf-key" type="button">下載含答案 PDF</button>`
      : (page === "section" || page === "review" || page === "exam")
      ? `<button class="btn btn-green" id="btn-answers" type="button">顯示答案</button>
         ${checkBtn}
         <button class="btn btn-orange" id="btn-pdf" type="button">下載 PDF</button>
         <button class="btn btn-ghost" id="btn-pdf-key" type="button">下載含答案 PDF</button>
         ${bookLink}`
      : bookLink;
    const inkBtn = `<button class="btn btn-ghost" id="btn-ink" type="button" aria-pressed="false">筆記</button>`;
    const immersiveBtn = `<button class="btn btn-ghost" id="btn-immersive" type="button" aria-pressed="false">全螢幕</button>`;
    const fontScale = `<span class="font-scale no-print" role="group" aria-label="投影字級">
          <button class="btn btn-ghost btn-font" id="btn-font-minus" type="button" title="縮小投影字級">A−</button>
          <span class="font-scale-label" id="font-scale-label">100%</span>
          <button class="btn btn-ghost btn-font" id="btn-font-plus" type="button" title="放大投影字級">A＋</button>
        </span>`;
    const chapterLinks = (cfg.chapters || []).map((c) => `
          <a href="${url(c.file)}" class="${page !== "cover" && String(cfg.chapter?.id) === String(c.id) ? "is-on" : ""}">${chapterNavText(c)}</a>
        `).join("");
    const sectionLinks = page === "cover" ? "" : (cfg.sections || []).map((s) => `
          <a href="${url(s.file)}" class="${s.id === currentId && page === "section" ? "is-on" : ""} ${s.ready ? "" : "is-draft"}">
            ${s.id} ${s.title}${s.ready ? "" : "（未完成）"}
          </a>
        `).join("");
    const examLinks = page === "cover" ? "" : (cfg.sections || []).filter((s) => s.exam).map((s) => `
          <a href="${url(s.exam)}" class="is-practice ${s.id === currentId && page === "exam" ? "is-on" : ""}">${s.id}</a>
        `).join("");
    const reviewLink = page === "cover" ? "" : (review ? `<a href="${url(review.file)}" class="${page === "review" ? "is-on" : ""}">${review.nav || "章末評量"}</a>` : "");
    const examNav = examLinks ? `
      <details class="section-nav is-exam-nav no-print" aria-label="段考前練習">
        <summary class="exam-nav-summary">段考前練習</summary>
        ${examLinks}
      </details>
    ` : "";
    const chapterNav = (page === "cover" || page === "book") ? "" : `
      <details class="section-nav no-print" open aria-label="${thisChapterNav()}目錄">
        <summary class="section-nav-summary">${thisChapterNav()}</summary>
        <a href="${url(cfg.home || "index.html")}" class="${page === "home" ? "is-on" : ""}">目錄</a>
        ${sectionLinks}
        ${reviewLink}
      </details>
      ${examNav}
    `;

    host.innerHTML = `
      <header class="toolbar no-print">
        <a class="brand" href="${url(page === "cover" ? (cfg.cover?.file || "cover.html") : (cfg.home || "index.html"))}">
          <span class="brand-mark">${page === "cover" ? "理" : (cfg.chapter?.mark || "波")}</span>
          <span>${brandText}</span>
        </a>
        <div class="toolbar-actions">
          ${immersiveBtn}
          ${fontScale}
          ${inkBtn}
          ${tools}
          <a class="btn btn-github" href="${cfg.githubRepo || "#"}" target="_blank" rel="noopener">GitHub</a>
        </div>
      </header>
      <nav class="site-nav no-print" aria-label="全書導覽">
        <span class="nav-label">全書</span>
        ${cfg.cover ? `<a href="${url(cfg.cover.file)}" class="${page === "cover" ? "is-on" : ""}">${cfg.cover.nav || "封面"}</a>` : ""}
        ${chapterLinks}
      </nav>
      ${chapterNav}
    `;
  }

  function pageLabel(n) {
    return n != null ? `第 ${n} 頁` : "";
  }

  function currentPathFile() {
    const path = (location.pathname || "").replace(/\\/g, "/");
    const sec = path.match(/\/(sections\/[^/]+\.html)$/i);
    if (sec) return sec[1];
    const exam = path.match(/\/(exams\/[^/]+\.html)$/i);
    if (exam) return exam[1];
    const base = path.split("/").pop() || "";
    if (/\.html$/i.test(base)) return base;
    return "";
  }

  function findPageEntry() {
    const api = window.JPWNPages;
    const man = window.JPWN_BOOK_MANIFEST;
    if (!api || !man) return null;
    // 封面永不編頁、不印頁碼
    if (page === "cover") return null;
    const file = currentPathFile();
    if (file === "cover.html" || /(?:^|\/)cover\.html$/i.test(file)) return null;
    if (file) {
      const hit = api.lookup(file, man);
      if (hit) return hit;
    }
    if (page === "section" && currentId) {
      if (file && /(?:^|\/)lab-/.test(file)) return api.lookup(file, man);
      const byId = api.index(man).byId[currentId];
      if (byId && byId.kind === "section") return byId;
    }
    if (page === "exam" && currentId) {
      const lecture = api.index(man).list.find((x) => x.id === currentId && x.kind === "section");
      if (lecture) return { ...lecture, examRef: true };
    }
    return null;
  }

  function chapterPageRange() {
    const api = window.JPWNPages;
    const man = window.JPWN_BOOK_MANIFEST;
    if (!api || !man) return null;
    const chId = String(cfg.chapter?.id || "");
    if (chId === "lab") return api.rangeForPack(man.labs?.title || "實驗專區", man);
    const pack = (man.packs || []).find((p) => (p.title || "").indexOf(`第 ${chId} 章`) === 0);
    if (!pack) return null;
    return api.rangeForPack(pack.title, man);
  }

  function ensurePageFolio(startPage) {
    // 改由 JPWNPrintFolios 在 beforeprint 依張數產生遞增頁碼；此處只記錄起始頁
    const n = Math.max(1, Number(startPage) || 1);
    document.body.dataset.bookPage = String(n);
    document.body.dataset.printStartPage = String(n);
    // 清掉舊的單顆固定 folio（會造成整節同號）
    document.querySelectorAll(".page-folio:not(.page-folio-running)").forEach((el) => el.remove());
  }

  function applyPageNumbers() {
    // 封面不顯示、不列印頁碼
    if (page === "cover") {
      document.querySelectorAll(".page-folio, .print-folio-stack").forEach((el) => el.remove());
      delete document.body.dataset.bookPage;
      delete document.body.dataset.printStartPage;
      return;
    }

    const entry = findPageEntry();
    const range = (page === "home") ? chapterPageRange() : null;
    let startPage = 0;

    if (entry && entry.page) {
      startPage = entry.page;
    } else if (range) {
      startPage = range.from;
    }

    if (startPage && page !== "book") ensurePageFolio(startPage);

    // 章首卡片標頁碼（螢幕導覽：該節起始頁）
    if (page === "home") {
      const idx = window.JPWNPages?.index(window.JPWN_BOOK_MANIFEST);
      if (idx) {
        document.querySelectorAll(".section-card[data-section-id]").forEach((card) => {
          const id = card.dataset.sectionId;
          const hit = idx.byId[id] || idx.list.find((x) => x.id === id);
          const slot = card.querySelector("[data-page-slot]");
          if (slot && hit) slot.textContent = pageLabel(hit.page);
        });
      }
    }

    // 側欄小節連結標頁碼（螢幕導覽：該節起始頁）
    const idxNav = window.JPWNPages?.index(window.JPWN_BOOK_MANIFEST);
    if (idxNav) {
      document.querySelectorAll(".section-nav a[href]").forEach((a) => {
        const href = a.getAttribute("href") || "";
        const m = href.replace(/\\/g, "/").match(/(sections\/[^/?#]+\.html)/i);
        if (!m || a.dataset.pageNav) return;
        const hit = idxNav.byFile[m[1]];
        if (!hit) return;
        a.dataset.pageNav = "1";
        a.insertAdjacentHTML("beforeend", ` <span class="nav-page">${hit.page}</span>`);
      });
    }
  }

  function setupPrintFolios() {
    if (page === "cover" || page === "book") return;
    const run = () => {
      if (!window.JPWNPrintFolios) return;
      window.JPWNPrintFolios.remove();
      const start = Number(document.body.dataset.printStartPage || document.body.dataset.bookPage || 0);
      if (!start) return;
      const root = document.querySelector(".wrap") || document.body;
      window.JPWNPrintFolios.install({ startPage: start, root, host: root });
    };
    window.addEventListener("beforeprint", run);
    window.addEventListener("afterprint", () => window.JPWNPrintFolios?.remove());
    // 供 app.js 列印前手動呼叫
    window.NotesLayout = window.NotesLayout || {};
    window.NotesLayout.preparePrintFolios = run;
  }

  function renderHomeCards() {
    const host = document.getElementById("section-cards");
    if (!host) return;
    const isLabHome = String(cfg.chapter?.id) === "lab";
    host.innerHTML = (cfg.sections || []).map((s) => `
      <div class="section-card ${s.ready ? "" : "is-draft"}" data-section-id="${isLabHome ? (s.id.startsWith("lab-") ? s.id : "lab-" + s.id) : s.id}">
        <a class="section-card-main" href="${url(s.file)}">
          <div class="section-card-top">
            <strong>${s.id}</strong>
            <small data-page-slot>${s.ready ? "講義" : "講義建置中"}</small>
          </div>
          <h2>${s.title}</h2>
          ${s.ask ? `<p class="section-card-ask">${s.ask}</p>` : ""}
          <p>${s.summary || ""}</p>
        </a>
        ${s.exam ? `<a class="section-card-exam" href="${url(s.exam)}">段考前練習</a>` : ""}
      </div>
    `).join("") + ((cfg.sections || []).some((s) => s.exam) ? `
      <p class="home-label">段考前練習</p>
    ` : "") + (cfg.sections || []).filter((s) => s.exam).map((s) => `
      <a class="section-card is-practice" href="${url(s.exam)}">
        <div class="section-card-top">
          <strong>${s.id}</strong>
          <small>段考練習</small>
        </div>
        <h2>${s.title}</h2>
        <p>四選一　較難段考程度</p>
      </a>
    `).join("") + (cfg.review ? `
      <a class="section-card is-exam" href="${url(cfg.review.file)}">
        <div class="section-card-top">
          <strong>章末</strong>
          <small>全章複習</small>
        </div>
        <h2>${cfg.review.title}</h2>
        <p>${cfg.review.summary || ""}</p>
      </a>
    ` : "");
  }

  async function setupPageNumbers() {
    try {
      await loadBookScript("js/book-manifest.js");
      if (!window.JPWNPrintFolios) {
        await new Promise((resolve) => {
          const s = document.createElement("script");
          s.src = url("js/print-folios.js");
          s.onload = () => resolve();
          s.onerror = () => resolve();
          document.body.appendChild(s);
        });
      }
    } catch (err) {
      return;
    }
    applyPageNumbers();
  }

  renderHeader();
  renderHomeCards();
  setupImmersive();
  setupPageNumbers();
  setupPrintFolios();
  setupBookPrefetch();

  if (!document.querySelector("script[data-class-ink]")) {
    const s = document.createElement("script");
    s.src = url("js/class-notes.js");
    s.dataset.classInk = "1";
    document.body.appendChild(s);
  }

  function pagesUrl() {
    return location.href.split("#")[0];
  }

  function openInBrowser() {
    const href = pagesUrl();
    const opened = window.open(href, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.prompt("請複製這個網址，改用 Safari 或 Chrome 開啟：", href);
    }
  }

  function setImmersive(on) {
    document.documentElement.classList.toggle("is-immersive", on);
    sessionStorage.setItem("jpwn.immersive", on ? "1" : "0");
    const btn = document.getElementById("btn-immersive");
    if (btn) {
      btn.textContent = on ? "離開全螢幕" : "全螢幕";
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("btn-orange", on);
      btn.classList.toggle("btn-ghost", !on);
    }
    if (on) {
      const el = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) {
        Promise.resolve(req.call(el)).catch(() => {});
      }
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit && (document.fullscreenElement || document.webkitFullscreenElement)) {
        Promise.resolve(exit.call(document)).catch(() => {});
      }
    }
    window.setTimeout(() => window.ClassInk?.redraw?.(), 80);
  }

  function setupImmersive() {
    if (inFrame() && !document.getElementById("embed-banner")) {
      const bar = document.createElement("div");
      bar.id = "embed-banner";
      bar.className = "embed-banner no-print";
      bar.innerHTML = `
        <span>目前開在協作平台的小視窗裡，無法真正無邊框。</span>
        <button type="button" class="btn btn-green" id="btn-open-browser">用瀏覽器開啟</button>
      `;
      document.body.insertBefore(bar, document.body.firstChild);
      document.getElementById("btn-open-browser")?.addEventListener("click", openInBrowser);
    }

    document.getElementById("btn-immersive")?.addEventListener("click", () => {
      const next = !document.documentElement.classList.contains("is-immersive");
      if (next && inFrame()) {
        openInBrowser();
      }
      setImmersive(next);
    });

    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (document.documentElement.classList.contains("is-immersive") && !sessionStorage.getItem("jpwn.immersive")) {
          setImmersive(false);
        }
      }
    });

    if (sessionStorage.getItem("jpwn.immersive") === "1") setImmersive(true);
  }

  const FONT_STEPS = [100, 125, 150, 175, 200];
  const FONT_KEY = "jpwn.fontScale";

  function currentFontScale() {
    const n = Number(sessionStorage.getItem(FONT_KEY) || 100);
    return FONT_STEPS.includes(n) ? n : 100;
  }

  function applyFontScale(pct) {
    const step = FONT_STEPS.includes(pct) ? pct : 100;
    const html = document.documentElement;
    html.style.setProperty("--proj-scale", String(step / 100));
    html.classList.toggle("is-proj", step !== 100);
    sessionStorage.setItem(FONT_KEY, String(step));
    const label = document.getElementById("font-scale-label");
    if (label) label.textContent = step + "%";
    const minus = document.getElementById("btn-font-minus");
    const plus = document.getElementById("btn-font-plus");
    if (minus) minus.disabled = step === FONT_STEPS[0];
    if (plus) plus.disabled = step === FONT_STEPS[FONT_STEPS.length - 1];
    window.setTimeout(() => window.ClassInk?.redraw?.(), 80);
  }

  function setupFontScale() {
    applyFontScale(currentFontScale());
    document.getElementById("btn-font-minus")?.addEventListener("click", () => {
      const i = Math.max(0, FONT_STEPS.indexOf(currentFontScale()) - 1);
      applyFontScale(FONT_STEPS[i]);
    });
    document.getElementById("btn-font-plus")?.addEventListener("click", () => {
      const i = Math.min(FONT_STEPS.length - 1, FONT_STEPS.indexOf(currentFontScale()) + 1);
      applyFontScale(FONT_STEPS[i]);
    });
  }

  function loadBookScript(src) {
    return new Promise((resolve, reject) => {
      const abs = url(src);
      const found = [...document.scripts].some((s) => s.src && s.src.replace(/\/+$/, "") === new URL(abs, document.baseURI).href.replace(/\/+$/, ""));
      if (src === "js/book-manifest.js" && window.JPWN_BOOK_MANIFEST) {
        resolve();
        return;
      }
      if (src === "js/book-cache.js" && window.JPWNBookCache) {
        resolve();
        return;
      }
      if (found && (window.JPWN_BOOK_MANIFEST || src !== "js/book-manifest.js") && (window.JPWNBookCache || src !== "js/book-cache.js")) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.src = abs;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  function setupBookPrefetch() {
    if (page === "book") return;
    const run = async () => {
      try {
        await loadBookScript("js/book-manifest.js");
        await loadBookScript("js/book-cache.js");
      } catch (err) {
        return;
      }
      const api = window.JPWNBookCache;
      if (!api) return;
      if (await api.clearBroken()) return;
      const banner = document.createElement("div");
      banner.id = "book-prefetch-banner";
      banner.className = "book-prefetch no-print";
      banner.hidden = true;
      banner.innerHTML = `
        <span id="book-prefetch-text">整本講義準備中</span>
        <span class="book-prefetch-actions">
          <a class="btn btn-orange" href="${url("book.html")}" target="_blank" rel="noopener">前往下載</a>
          <button type="button" class="book-prefetch-close" aria-label="關閉通知" title="關閉此通知">×</button>
        </span>
      `;
      banner.querySelector(".book-prefetch-close").addEventListener("click", () => {
        banner.hidden = true;
        try { sessionStorage.setItem("jpwn.bannerDismissed", "1"); } catch (e) { /* ignore */ }
      });
      const header = document.getElementById("site-header");
      if (header && header.nextSibling) header.after(banner);
      else document.body.insertBefore(banner, document.body.firstChild);

      function paint(info) {
        try { if (sessionStorage.getItem("jpwn.bannerDismissed")) { banner.hidden = true; return; } } catch (e) { /* ignore */ }
        const data = info || api.readProgress();
        const text = document.getElementById("book-prefetch-text");
        if (!text) return;
        if (data.status === "running" && data.total) {
          banner.hidden = false;
          text.textContent = "整本講義正在合成 " + data.done + "／" + data.total + "，可繼續看其他頁";
        } else if (data.status === "paused" && data.total) {
          banner.hidden = false;
          text.textContent = "整本講義合成已暫停 " + data.done + "／" + data.total + "，回下載頁可繼續";
        } else if (data.status === "done" && data.total) {
          banner.hidden = false;
          text.textContent = "整本講義已備妥，可前往下載（印表機選「另存為 PDF」）";
        } else if (data.status === "error") {
          banner.hidden = false;
          text.textContent = "整本講義有頁面沒載到，請到下載頁查看";
        } else {
          banner.hidden = true;
        }
      }
      paint(api.readProgress());
      api.subscribe(paint);
    };
    run();
  }

  setupFontScale();

  window.NotesLayout = Object.assign(window.NotesLayout || {}, {
    resetFontScaleForPrint() {
      const html = document.documentElement;
      const prev = currentFontScale();
      const had = html.classList.contains("is-proj");
      html.style.setProperty("--proj-scale", "1");
      html.classList.remove("is-proj");
      return () => {
        html.style.setProperty("--proj-scale", String(prev / 100));
        html.classList.toggle("is-proj", had);
      };
    }
  });
})();
