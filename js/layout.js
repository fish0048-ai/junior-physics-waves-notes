(function () {
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
    const brandText = page === "review"
      ? `${cfg.chapter?.grade || "八年級理化"}　${review?.title || "章末評量"}`
      : page === "exam" && sec
      ? `${cfg.chapter?.grade || "八年級理化"}　${sec.id} 段考前練習`
      : sec
      ? `${cfg.chapter?.grade || "八年級理化"}　${sec.id} ${sec.title}`
      : `${cfg.chapter?.grade || "八年級理化"}　第 ${cfg.chapter?.id || ""} 章`;
    const tools = (page === "section" || page === "review" || page === "exam")
      ? `<button class="btn btn-green" id="btn-answers" type="button">顯示答案</button>
         <button class="btn btn-ghost" id="btn-check" type="button">檢查作答</button>
         <button class="btn btn-orange" id="btn-pdf" type="button">下載 PDF</button>
         <button class="btn btn-ghost" id="btn-pdf-key" type="button">下載含答案 PDF</button>`
      : "";

    host.innerHTML = `
      <header class="toolbar no-print">
        <a class="brand" href="${url(cfg.home || "index.html")}">
          <span class="brand-mark">波</span>
          <span>${brandText}</span>
        </a>
        <div class="toolbar-actions">
          ${tools}
          <a class="btn btn-github" href="${cfg.githubRepo || "#"}" target="_blank" rel="noopener">GitHub</a>
        </div>
      </header>
      <nav class="section-nav no-print" aria-label="章節導覽">
        <a href="${url(cfg.home || "index.html")}" class="${page === "home" ? "is-on" : ""}">章首</a>
        ${(cfg.sections || []).map((s) => `
          <a href="${url(s.file)}" class="${s.id === currentId && page === "section" ? "is-on" : ""} ${s.ready ? "" : "is-draft"}">
            ${s.id} ${s.title}${s.ready ? "" : "（未完成）"}
          </a>
        `).join("")}
        ${page === "exam" && sec?.exam ? `<a href="${url(sec.exam)}" class="is-on">${sec.id} 段考</a>` : ""}
        ${review ? `<a href="${url(review.file)}" class="${page === "review" ? "is-on" : ""}">${review.nav || "章末評量"}</a>` : ""}
      </nav>
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
        <p>${s.summary || ""}</p>
      </a>
    `).join("") + `
      <p class="home-label">段考前練習　獨立頁，與講義分開列印</p>
    ` + (cfg.sections || []).map((s) => s.exam ? `
      <a class="section-card is-practice" href="${url(s.exam)}">
        <div class="section-card-top">
          <strong>${s.id}</strong>
          <small>段考練習</small>
        </div>
        <h2>${s.title}</h2>
        <p>四選一　較難段考程度　與講義分開</p>
      </a>
    ` : "").join("") + (cfg.review ? `
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
})();
