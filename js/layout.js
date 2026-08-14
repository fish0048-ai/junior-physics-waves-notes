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
    const brandText = sec
      ? `${cfg.chapter?.grade || "八年級理化"}　${sec.id} ${sec.title}`
      : `${cfg.chapter?.grade || "八年級理化"}　第 ${cfg.chapter?.id || ""} 章`;
    const tools = page === "section"
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
          <a href="${url(s.file)}" class="${s.id === currentId ? "is-on" : ""} ${s.ready ? "" : "is-draft"}">
            ${s.id} ${s.title}${s.ready ? "" : "（未完成）"}
          </a>
        `).join("")}
      </nav>
    `;
  }

  function renderHomeCards() {
    const host = document.getElementById("section-cards");
    if (!host) return;
    host.innerHTML = (cfg.sections || []).map((s) => `
      <a class="section-card ${s.ready ? "" : "is-draft"}" href="${url(s.file)}">
        <small>${s.ready ? "可開始練習" : "講義建置中"}</small>
        <strong>${s.id}</strong>
        <h2>${s.title}</h2>
        <p>${s.summary || ""}</p>
      </a>
    `).join("");
  }

  renderHeader();
  renderHomeCards();
})();
