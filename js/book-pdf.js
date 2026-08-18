(function () {

  /* ─── 產生獨立列印視窗 ─── */

  function buildPrintHtml(sections, cssHref, withAnswers) {
    const nodes = sections.map((sec) => {
      const clone = sec.cloneNode(true);
      clone.querySelectorAll(".no-print, .wave-deco, .toc, .footer, .exam-jump, .ink-dock, .ink-banner, .ink-fab, .ink-panel, .ink-strip").forEach((el) => el.remove());
      if (withAnswers) {
        clone.querySelectorAll(".blank").forEach((el) => {
          el.classList.add("revealed");
          if (!el.textContent || !el.textContent.trim()) {
            el.textContent = el.dataset.answer ? el.dataset.answer.split("|")[0] : "";
          }
        });
        clone.querySelectorAll("[data-reveal]").forEach((el) => { el.hidden = false; });
      }
      return clone.outerHTML;
    });

    return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="${cssHref}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css">
<style>
  body { margin:0; background:#fff; font-family:"Noto Sans TC","Microsoft JhengHei","PingFang TC",sans-serif; color:#1c1917; }
  .book-section { break-before: page; page-break-before: always; color:#1c1917 !important; background:#fff !important; padding:8mm 10mm 6mm; }
  .book-section:first-child { break-before: auto; page-break-before: auto; }
  .book-kicker { font-size:8pt; color:#166534; margin:0 0 2mm; font-weight:800; }
  .hero { background:#fff !important; color:#14532d !important; border:0.5pt solid #166534; padding:4px 8px; margin:0 0 6px; }
  .hero h1,.hero .kicker,.hero p { color:#14532d !important; opacity:1 !important; }
  .cover-sheet { background:#fff !important; color:#14532d !important; border:0.8pt solid #166534; padding:12mm 14mm 10mm; box-sizing:border-box; min-height:277mm; }
  .cover-sheet h1,.cover-kicker,.cover-series,.cover-lead { color:#14532d !important; opacity:1 !important; }
  .blank { background:#fff !important; color:transparent !important; border:none; border-bottom:0.9pt solid #166534 !important; min-width:2.8em; display:inline-block; }
  .blank.revealed { background:#fde68a !important; color:#1c1917 !important; }
  .no-print, .wave-deco, .toc, .footer, .site-nav, .section-nav, .toolbar, .toast, .book-kicker.no-print { display:none !important; }
  .card { box-shadow:none !important; border:none; }
  svg.diagram, .diagram { max-width:100%; height:auto; display:block; }
</style>
</head>
<body data-page="book">
${nodes.join("\n")}
<script>
(function(){
  var done = false;
  function go() {
    if (done) return;
    done = true;
    window.print();
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function(){
      var imgs = document.querySelectorAll("img");
      var pending = 0;
      imgs.forEach(function(img) {
        if (!img.complete) {
          pending++;
          function finish() { pending--; if (pending === 0) go(); }
          img.addEventListener("load", finish, {once:true});
          img.addEventListener("error", finish, {once:true});
        }
      });
      if (pending === 0) go();
    }).catch(go);
  } else {
    setTimeout(go, 1200);
  }
  window.addEventListener("afterprint", function() {
    setTimeout(function(){ try { window.close(); } catch(e){} }, 400);
  }, {once:true});
})();
<\/script>
</body>
</html>`;
  }

  function cssUrl() {
    const link = document.querySelector('link[href*="style.css"]');
    if (link) return new URL(link.getAttribute("href"), location.href).href;
    return new URL("css/style.css", location.href).href;
  }

  function download({ sections, filename, withAnswers, onProgress }) {
    const list = [...(sections || [])].filter(Boolean);
    if (!list.length) {
      if (typeof onProgress === "function") onProgress(0, 0, "error", "沒有可輸出的頁面");
      return;
    }
    if (typeof onProgress === "function") onProgress(0, list.length, "building");

    const html = buildPrintHtml(list, cssUrl(), !!withAnswers);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);

    const win = window.open(blobUrl, "_blank", "width=900,height=700,menubar=yes,toolbar=yes,scrollbars=yes");
    if (!win) {
      if (typeof onProgress === "function") onProgress(0, 0, "error", "瀏覽器擋了彈出視窗，請允許後再試一次");
      URL.revokeObjectURL(blobUrl);
      return;
    }

    if (typeof onProgress === "function") onProgress(list.length, list.length, "done");

    const cleanup = window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    try {
      win.addEventListener("unload", () => {
        window.clearTimeout(cleanup);
        URL.revokeObjectURL(blobUrl);
      }, { once: true });
    } catch (e) {
      /* cross-origin guard, ignore */
    }
  }

  window.JPWNBookPdf = { download };
})();
