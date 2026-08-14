(function () {
  const WORD_CSS = `
    body { font-family: "Microsoft JhengHei","PMingLiU",sans-serif; color:#1c1917; line-height:1.7; font-size:12pt; }
    h1 { font-size:22pt; color:#14532d; text-align:center; }
    h2 { font-size:16pt; color:#166534; border-bottom:2px solid #16a34a; padding-bottom:4px; }
    h3 { font-size:13pt; color:#15803d; }
    .kicker { color:#166534; font-weight:bold; }
    .def { background:#f0fdf4; border-left:6px solid #16a34a; padding:8px 12px; margin:8px 0; }
    .formula { text-align:center; font-size:14pt; font-weight:bold; border:2px solid #86efac; background:#ecfdf5; padding:10px; margin:10px 0; }
    table { border-collapse:collapse; width:100%; margin:8px 0 12px; }
    th, td { border:1px solid #86efac; padding:6px 8px; text-align:center; }
    th { background:#15803d; color:#fff; }
    .think { background:#fff7ed; border:1px solid #fdba74; padding:10px; margin:10px 0; }
    .quiz { background:#fffbeb; border:1px solid #fcd34d; padding:10px; margin:10px 0; }
    .skill { background:#eff6ff; border:1px solid #93c5fd; padding:10px; margin:10px 0; }
    .caption { text-align:center; color:#57534e; font-size:10pt; }
    img { max-width:100%; }
    u.blank { display:inline-block; min-width:4em; text-align:center; padding:0 6px; }
    .toolbar, .toc, .footer, .toast, .no-word { display:none !important; }
    .hero { background:#166534; color:#fff; padding:16px; text-align:center; }
    .hero h1, .hero p { color:#fff; }
    .badge { display:none; }
  `;

  function svgToPng(svg) {
    return new Promise((resolve) => {
      const clone = svg.cloneNode(true);
      if (!clone.getAttribute("xmlns")) {
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }
      const vb = svg.viewBox && svg.viewBox.baseVal;
      const w = (vb && vb.width) || svg.clientWidth || 720;
      const h = (vb && vb.height) || svg.clientHeight || 240;
      clone.setAttribute("width", String(w));
      clone.setAttribute("height", String(h));
      const source = new XMLSerializer().serializeToString(clone);
      const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(w * 2);
        canvas.height = Math.round(h * 2);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ dataUrl: canvas.toDataURL("image/png"), w, h });
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  function fillClone(clone, withAnswers) {
    clone.querySelectorAll(".toolbar, .toc, .footer, .toast, .no-word").forEach((el) => el.remove());
    clone.querySelectorAll("button, .btn").forEach((el) => {
      if (!el.closest(".hero")) el.remove();
    });
    clone.querySelectorAll("input.blank").forEach((input) => {
      const u = document.createElement("u");
      u.className = "blank";
      u.textContent = withAnswers
        ? " " + (input.dataset.answer || "").split("|")[0] + " "
        : "　　　　";
      input.replaceWith(u);
    });
    clone.querySelectorAll("input.ox, input.fix").forEach((input) => {
      const span = document.createElement("span");
      span.innerHTML = withAnswers && input.dataset.answer
        ? `<u>${input.dataset.answer}</u>`
        : "<u>　　　</u>";
      input.replaceWith(span);
    });
    clone.querySelectorAll("[data-reveal]").forEach((el) => {
      el.hidden = !withAnswers;
    });
  }

  async function replaceSvgs(clone, originalRoot) {
    const origSvgs = [...originalRoot.querySelectorAll("svg.diagram")];
    const cloneSvgs = [...clone.querySelectorAll("svg.diagram")];
    for (let i = 0; i < cloneSvgs.length; i++) {
      const png = await svgToPng(origSvgs[i] || cloneSvgs[i]);
      if (!png) continue;
      const img = document.createElement("img");
      img.src = png.dataUrl;
      img.width = Math.min(640, png.w);
      img.alt = origSvgs[i]?.getAttribute("aria-label") || "講義圖";
      cloneSvgs[i].replaceWith(img);
    }
  }

  async function exportWord(withAnswers) {
    const source = document.querySelector(".workbook");
    const clone = source.cloneNode(true);
    fillClone(clone, withAnswers);
    await replaceSvgs(clone, source);

    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${withAnswers ? "3-1 波的傳播（含答案）" : "3-1 波的傳播 挖空講義"}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page Section1 {
    size: 21cm 29.7cm;
    margin: 1.5cm 1.6cm 1.6cm 1.6cm;
    mso-header-margin: 0.7cm;
    mso-footer-margin: 0.7cm;
    mso-paper-source: 0;
  }
  div.Section1 { page: Section1; }
  ${WORD_CSS}
</style>
</head>
<body>
<div class="Section1">
${clone.innerHTML}
<p style="text-align:center;color:#78716c;font-size:10pt;margin-top:24px;">
  原始碼 GitHub：${window.APP_CONFIG.githubRepo}
</p>
</div>
</body>
</html>`;

    const blob = new Blob(["\ufeff", html], {
      type: "application/msword;charset=utf-8"
    });
    const a = document.createElement("a");
    const name = withAnswers
      ? "國中理化_3-1波的傳播_教師版含答案.doc"
      : window.APP_CONFIG.filename;
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    window.NotesApp?.toast(withAnswers ? "已下載教師版 Word" : "已下載 A4 挖空講義 Word");
  }

  document.getElementById("btn-word")?.addEventListener("click", () => exportWord(false));
  document.getElementById("btn-word-key")?.addEventListener("click", () => exportWord(true));
})();
