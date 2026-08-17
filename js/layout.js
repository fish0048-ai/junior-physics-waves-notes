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

  function url(path) {
    if (!path) return "#";
    if (root === ".") return path;
    return root + "/" + path.replace(/^\.\//, "");
  }

  function currentSection() {
    return (cfg.sections || []).find((s) => s.id === currentId);
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
      : page === "exam" && sec
      ? `${cfg.chapter?.grade || "八年級理化"}　${sec.id} 段考前練習`
      : sec
      ? `${cfg.chapter?.grade || "八年級理化"}　${sec.id} ${sec.title}`
      : `${cfg.chapter?.grade || "八年級理化"}　第 ${cfg.chapter?.id || ""} 章`;
    const checkBtn = (page === "review" || page === "exam")
      ? `<button class="btn btn-ghost" id="btn-check" type="button">檢查作答</button>`
      : "";
    const tools = (page === "cover")
      ? `<button class="btn btn-orange" id="btn-pdf" type="button">下載封面 PDF</button>`
      : (page === "home")
      ? `<button class="btn btn-orange" id="btn-pdf" type="button">下載目錄 PDF</button>`
      : (page === "section" || page === "review" || page === "exam")
      ? `<button class="btn btn-green" id="btn-answers" type="button">顯示答案</button>
         ${checkBtn}
         <button class="btn btn-orange" id="btn-pdf" type="button">下載 PDF</button>
         <button class="btn btn-ghost" id="btn-pdf-key" type="button">下載含答案 PDF</button>`
      : "";
    const inkBtn = `<button class="btn btn-ghost" id="btn-ink" type="button" aria-pressed="false">筆記</button>`;
    const immersiveBtn = `<button class="btn btn-ghost" id="btn-immersive" type="button" aria-pressed="false">全螢幕</button>`;
    const chapterLinks = (cfg.chapters || []).map((c) => `
          <a href="${url(c.file)}" class="${page !== "cover" && String(cfg.chapter?.id) === String(c.id) ? "is-on" : ""}">第 ${c.id} 章</a>
        `).join("");
    const sectionLinks = page === "cover" ? "" : (cfg.sections || []).map((s) => `
          <a href="${url(s.file)}" class="${s.id === currentId && page === "section" ? "is-on" : ""} ${s.ready ? "" : "is-draft"}">
            ${s.id} ${s.title}${s.ready ? "" : "（未完成）"}
          </a>
        `).join("");
    const examLink = page === "cover" ? "" : (page === "exam" && sec?.exam ? `<a href="${url(sec.exam)}" class="is-on">${sec.id} 段考</a>` : "");
    const reviewLink = page === "cover" ? "" : (review ? `<a href="${url(review.file)}" class="${page === "review" ? "is-on" : ""}">${review.nav || "章末評量"}</a>` : "");
    const chapterNav = page === "cover" ? "" : `
      <nav class="section-nav no-print" aria-label="第 ${cfg.chapter?.id || ""} 章目錄">
        <span class="nav-label">第 ${cfg.chapter?.id || ""} 章</span>
        <a href="${url(cfg.home || "index.html")}" class="${page === "home" ? "is-on" : ""}">目錄</a>
        ${sectionLinks}
        ${examLink}
        ${reviewLink}
      </nav>
    `;

    host.innerHTML = `
      <header class="toolbar no-print">
        <a class="brand" href="${url(page === "cover" ? (cfg.cover?.file || "cover.html") : (cfg.home || "index.html"))}">
          <span class="brand-mark">${page === "cover" ? "理" : (cfg.chapter?.mark || "波")}</span>
          <span>${brandText}</span>
        </a>
        <div class="toolbar-actions">
          ${immersiveBtn}
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

  function renderHomeCards() {
    const host = document.getElementById("section-cards");
    if (!host) return;
    host.innerHTML = (cfg.sections || []).map((s) => `
      <a class="section-card ${s.ready ? "" : "is-draft"}" href="${url(s.file)}">
        <div class="section-card-top">
          <strong>${s.id}</strong>
          <small>${s.ready ? "講義" : "講義建置中"}</small>
        </div>
        <h2>${s.title}</h2>
        ${s.ask ? `<p class="section-card-ask">${s.ask}</p>` : ""}
        <p>${s.summary || ""}</p>
      </a>
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

  renderHeader();
  renderHomeCards();
  setupImmersive();

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
})();
