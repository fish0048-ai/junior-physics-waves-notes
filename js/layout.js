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
      : page === "exam" && sec
      ? `${cfg.chapter?.grade || "八年級理化"}　${sec.id} 段考前練習`
      : sec
      ? `${cfg.chapter?.grade || "八年級理化"}　${sec.id} ${sec.title}`
      : `${cfg.chapter?.grade || "八年級理化"}　${thisChapterNav()}`;
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
      <nav class="section-nav is-exam-nav no-print" aria-label="段考前練習">
        <span class="nav-label">段考前練習</span>
        ${examLinks}
      </nav>
    ` : "";
    const chapterNav = page === "cover" ? "" : `
      <nav class="section-nav no-print" aria-label="${thisChapterNav()}目錄">
        <span class="nav-label">${thisChapterNav()}</span>
        <a href="${url(cfg.home || "index.html")}" class="${page === "home" ? "is-on" : ""}">目錄</a>
        ${sectionLinks}
        ${reviewLink}
      </nav>
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

  function renderHomeCards() {
    const host = document.getElementById("section-cards");
    if (!host) return;
    host.innerHTML = (cfg.sections || []).map((s) => `
      <div class="section-card ${s.ready ? "" : "is-draft"}">
        <a class="section-card-main" href="${url(s.file)}">
          <div class="section-card-top">
            <strong>${s.id}</strong>
            <small>${s.ready ? "講義" : "講義建置中"}</small>
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

  setupFontScale();

  window.NotesLayout = {
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
  };
})();
