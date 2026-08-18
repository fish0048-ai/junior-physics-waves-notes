(function () {
  const HTML2CANVAS = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
  const JSPDF = "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js";
  const MAX_PX = 8000;
  const SCALE = 1.5;

  function loadScript(src, ok) {
    return new Promise((resolve, reject) => {
      if (ok()) {
        resolve();
        return;
      }
      const found = [...document.scripts].some((s) => s.src === src);
      if (found) {
        const t = window.setInterval(() => {
          if (ok()) {
            window.clearInterval(t);
            resolve();
          }
        }, 80);
        window.setTimeout(() => {
          window.clearInterval(t);
          if (ok()) resolve();
          else reject(new Error("載入逾時"));
        }, 20000);
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("無法載入輸出元件"));
      document.head.appendChild(s);
    });
  }

  async function ensureLibs() {
    await loadScript(HTML2CANVAS, () => typeof window.html2canvas === "function");
    await loadScript(JSPDF, () => !!(window.jspdf && window.jspdf.jsPDF));
  }

  function yieldTick() {
    return new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  function captureOpts(el) {
    return {
      scale: SCALE,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      imageTimeout: 4000,
      foreignObjectRendering: false,
      width: Math.ceil(el.scrollWidth || el.getBoundingClientRect().width || 800),
      height: Math.ceil(el.scrollHeight || el.getBoundingClientRect().height || 400),
      onclone(doc) {
        doc.querySelectorAll(".no-print, .book-loader, #site-header").forEach((node) => node.remove());
        doc.querySelectorAll(".book-section.is-print-skip").forEach((node) => node.remove());
        const pages = doc.getElementById("book-pages");
        if (pages) pages.hidden = false;
      }
    };
  }

  async function toCanvases(el) {
    const h = Math.max(el.scrollHeight || 0, el.getBoundingClientRect().height || 0);
    if (h * SCALE > MAX_PX && el.children.length > 1) {
      const out = [];
      for (const kid of el.children) {
        if (kid.classList && kid.classList.contains("no-print")) continue;
        if (kid.nodeType !== 1) continue;
        const box = kid.getBoundingClientRect();
        if (box.width < 2 && box.height < 2) continue;
        out.push(...await toCanvases(kid));
        await yieldTick();
      }
      if (out.length) return out;
    }
    const canvas = await window.html2canvas(el, captureOpts(el));
    return [canvas];
  }

  function addCanvas(pdf, canvas, usedFirst) {
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * pageW) / Math.max(canvas.width, 1);
    const data = canvas.toDataURL("image/jpeg", 0.84);
    if (usedFirst) pdf.addPage();
    let pos = 0;
    let left = imgH;
    pdf.addImage(data, "JPEG", 0, pos, imgW, imgH);
    left -= pageH;
    while (left > 1) {
      pos -= pageH;
      pdf.addPage();
      pdf.addImage(data, "JPEG", 0, pos, imgW, imgH);
      left -= pageH;
    }
    canvas.width = 1;
    canvas.height = 1;
    return true;
  }

  async function download({ sections, filename, onProgress }) {
    const list = [...(sections || [])].filter(Boolean);
    if (!list.length) throw new Error("沒有可輸出的頁面");
    await ensureLibs();
    const Ctor = window.jspdf.jsPDF;
    const pdf = new Ctor({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    let usedFirst = false;
    for (let i = 0; i < list.length; i += 1) {
      if (typeof onProgress === "function") onProgress(i + 1, list.length);
      const canvases = await toCanvases(list[i]);
      for (const canvas of canvases) {
        usedFirst = addCanvas(pdf, canvas, usedFirst);
      }
      await yieldTick();
    }
    pdf.save(filename || "國中理化_講義.pdf");
  }

  window.JPWNBookPdf = { download, ensureLibs };
})();
