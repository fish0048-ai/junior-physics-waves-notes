(function () {
  if (document.body.dataset.page !== "book") return;

  const cfg = window.APP_CONFIG?.book || window.JPWN_BOOK_MANIFEST || {};
  const statusEl = document.getElementById("book-status");
  const pagesEl = document.getElementById("book-pages");
  const labsEl = document.getElementById("book-labs");
  const barEl = document.getElementById("book-bar");
  const KEEP_IDS = new Set(["cover-class", "cover-name", "cover-seat", "cover-form"]);

  let building = false;
  let queued = false;
  let haveCore = false;
  let haveLabs = false;
  let pendingPrint = null;
  let pendingScope = "all";
  let assembled = false;
  let lastError = "";
  let paused = false;
  let pauseWait = null;
  const pauseBtn = document.getElementById("btn-book-pause");
  const isFile = location.protocol === "file:";

  function readyNow() {
    if (paused && coreCount() > 0) return true;
    return haveCore && (!labsEl?.checked || haveLabs);
  }

  function paintPauseBtn() {
    if (!pauseBtn) return;
    if (paused) {
      pauseBtn.hidden = false;
      pauseBtn.textContent = "繼續合成";
      return;
    }
    if (building) {
      pauseBtn.hidden = false;
      pauseBtn.textContent = "暫停合成";
      return;
    }
    if (!haveCore) {
      pauseBtn.hidden = false;
      pauseBtn.textContent = "重新合成";
      return;
    }
    pauseBtn.hidden = true;
  }

  function pauseBuild() {
    if (!building || paused) return;
    paused = true;
    paintPauseBtn();
    const done = pagesEl.querySelectorAll(".book-section").length;
    setStatus("已暫停合成（已載入 " + done + " 頁）。可以去看其他講義，回來按「繼續合成」。");
    window.JPWNBookCache?.writeProgress({
      status: "paused",
      done,
      total: Math.max(done, 1),
      labs: !!labsEl?.checked
    });
    if (done) finishMath();
  }

  function resumeBuild() {
    if (!paused) return;
    paused = false;
    paintPauseBtn();
    if (pauseWait) {
      const fn = pauseWait;
      pauseWait = null;
      fn();
    } else if (!building) {
      build();
    }
  }

  function waitIfPaused() {
    if (!paused) return Promise.resolve();
    return new Promise((resolve) => {
      pauseWait = resolve;
    });
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function setBar(done, total) {
    if (!barEl) return;
    barEl.hidden = !total;
    barEl.max = total || 1;
    barEl.value = done;
    barEl.setAttribute("aria-valuenow", String(done));
    barEl.setAttribute("aria-valuemax", String(total || 1));
  }

  function toast(msg) {
    (window.NotesApp?.toast || ((m) => window.alert(m)))(msg);
  }

  if (isFile) {
    setStatus("現在是用檔案開啟（file://），瀏覽器不允許一次抓齊各節。請用本機網站或 GitHub Pages 打開，例如 http://127.0.0.1:4173/book.html");
    toast("整本下載不能直接雙擊 HTML，需要網站網址。");
    if (pauseBtn) {
      pauseBtn.disabled = true;
      pauseBtn.hidden = true;
    }
    document.getElementById("btn-book-pdf")?.setAttribute("disabled", "disabled");
    document.getElementById("btn-book-key")?.setAttribute("disabled", "disabled");
    if (labsEl) labsEl.disabled = true;
    return;
  }

  function navId(item) {
    return item.nav || String(item.id || "").replace(/^lab-/, "");
  }

  function chapterOf(item) {
    if (item.kind === "cover") return "cover";
    if (item.kind === "lab") return "lab";
    const m = String(item.id || "").match(/^(\d+)/);
    return m ? m[1] : "other";
  }

  function failLabel(item) {
    return item.id || navId(item);
  }

  function errText(err) {
    return String(err && err.message ? err.message : err || "載入失敗");
  }

  function coreList() {
    const list = [];
    if (cfg.cover) list.push({ ...cfg.cover, kind: "cover" });
    (cfg.packs || []).forEach((pack) => {
      (pack.files || []).forEach((f) => list.push({ ...f, pack: pack.title, kind: "section" }));
    });
    return list;
  }

  function labList() {
    if (!cfg.labs) return [];
    return (cfg.labs.files || []).map((f) => ({ ...f, pack: cfg.labs.title, kind: "lab" }));
  }

  function resolveAttr(baseUrl, value) {
    if (!value) return value;
    if (/^(https?:|data:|mailto:|javascript:|#)/i.test(value)) return value;
    try {
      return new URL(value, baseUrl).href;
    } catch (err) {
      return value;
    }
  }

  function rewriteAssets(root, pageUrl) {
    root.querySelectorAll("[src], [href], [poster], [srcset]").forEach((el) => {
      if (el.hasAttribute("src")) el.setAttribute("src", resolveAttr(pageUrl, el.getAttribute("src")));
      if (el.hasAttribute("poster")) el.setAttribute("poster", resolveAttr(pageUrl, el.getAttribute("poster")));
      if (el.tagName === "A" && el.hasAttribute("href")) {
        const href = el.getAttribute("href") || "";
        if (!href.startsWith("#")) el.setAttribute("href", resolveAttr(pageUrl, href));
      }
      if (el.hasAttribute("srcset")) {
        const next = (el.getAttribute("srcset") || "").split(",").map((part) => {
          const bits = part.trim().split(/\s+/);
          if (!bits[0]) return part;
          bits[0] = resolveAttr(pageUrl, bits[0]);
          return bits.join(" ");
        }).join(", ");
        el.setAttribute("srcset", next);
      }
    });
  }

  function prefixIds(root, prefix) {
    const map = new Map();
    root.querySelectorAll("[id]").forEach((el) => {
      const oldId = el.id;
      if (!oldId || KEEP_IDS.has(oldId)) return;
      const next = prefix + oldId;
      map.set(oldId, next);
      el.id = next;
    });
    if (!map.size) return;

    function remapHash(value) {
      if (!value || !value.startsWith("#")) return value;
      const id = decodeURIComponent(value.slice(1));
      return map.has(id) ? "#" + map.get(id) : value;
    }

    root.querySelectorAll("*").forEach((el) => {
      ["href", "xlink:href", "for", "aria-labelledby", "aria-describedby"].forEach((name) => {
        const v = el.getAttribute(name);
        if (!v) return;
        if (name === "aria-labelledby" || name === "aria-describedby") {
          el.setAttribute(name, v.split(/\s+/).map((id) => map.get(id) || id).join(" "));
          return;
        }
        if (v.startsWith("#")) el.setAttribute(name, remapHash(v));
      });
      ["fill", "stroke", "filter", "clip-path", "mask", "marker-end", "marker-start", "marker-mid", "style"].forEach((name) => {
        const v = el.getAttribute(name);
        if (!v || !v.includes("url(#")) return;
        el.setAttribute(name, v.replace(/url\(#([^)]+)\)/g, (m, id) => (
          map.has(id) ? "url(#" + map.get(id) + ")" : m
        )));
      });
    });
  }

  function freezeBlanks(root) {
    root.querySelectorAll("input.blank").forEach((input) => {
      const span = document.createElement("span");
      span.className = input.className;
      if (input.id) span.id = input.id;
      span.dataset.answer = input.dataset.answer || "";
      if (input.style.width) span.style.width = input.style.width;
      if (input.style.minWidth) span.style.minWidth = input.style.minWidth;
      span.setAttribute("aria-label", "挖空");
      if (!span.textContent) span.textContent = "\u00a0";
      input.replaceWith(span);
    });
  }

  function stripChrome(root) {
    root.querySelectorAll("script, .toc, .footer, .exam-jump, .wave-deco, .no-print").forEach((el) => el.remove());
  }

  function fillCover(root) {
    let data = { className: "", name: "", seat: "" };
    try {
      const raw = JSON.parse(localStorage.getItem("jpwn.student") || "{}");
      data = {
        className: String(raw.className || ""),
        name: String(raw.name || ""),
        seat: String(raw.seat || "")
      };
    } catch (err) {
      /* ignore */
    }
    if (!data.className) {
      try {
        const id = localStorage.getItem("jpwn.classId") || "";
        const list = JSON.parse(localStorage.getItem("jpwn.classes") || "[]");
        const hit = Array.isArray(list) ? list.find((c) => c && c.id === id) : null;
        if (hit && hit.name && hit.name !== "預設班級") data.className = hit.name;
      } catch (err) {
        /* ignore */
      }
    }
    const cls = root.querySelector("#cover-class");
    const name = root.querySelector("#cover-name");
    const seat = root.querySelector("#cover-seat");
    if (cls) cls.value = data.className;
    if (name) name.value = data.name;
    if (seat) seat.value = data.seat;
  }

  function extractBody(doc) {
    const cover = doc.querySelector(".cover-sheet");
    if (cover) return cover;
    return doc.querySelector(".wrap.workbook") || doc.querySelector(".wrap");
  }

  function yieldTick() {
    return new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  async function parsePage(item) {
    const api = window.JPWNBookCache;
    const pageUrl = api ? api.siteUrl(item.file) : new URL(item.file, document.baseURI).href;
    const html = api
      ? await api.getHtml(item.file)
      : await (await fetch(pageUrl, { credentials: "same-origin" })).text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const source = extractBody(doc);
    if (!source) throw new Error(item.file + " 找不到內容");
    const node = source.cloneNode(true);
    stripChrome(node);
    rewriteAssets(node, pageUrl);
    prefixIds(node, "bk-" + String(item.id).replace(/[^a-zA-Z0-9_-]/g, "") + "-");
    freezeBlanks(node);
    node.querySelectorAll("svg.diagram").forEach((svg) => {
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    });
    if (item.kind === "cover") fillCover(node);

    const section = document.createElement("section");
    section.className = "book-section" + (item.kind === "cover" ? " is-cover" : "");
    section.dataset.src = item.file;
    section.dataset.kind = item.kind || "section";
    section.dataset.chapter = chapterOf(item);
    const pageInfo = item.kind === "cover"
      ? null
      : (window.JPWNPages?.lookup(item.file, cfg) || window.JPWNPages?.lookup(item.id, cfg));
    if (pageInfo && pageInfo.page != null) section.dataset.bookPage = String(pageInfo.page);
    if (item.kind !== "cover") {
      const kicker = document.createElement("p");
      kicker.className = "book-kicker";
      const pageBit = pageInfo && pageInfo.page != null ? `第 ${pageInfo.page} 頁　` : "";
      kicker.textContent = pageBit + (item.pack ? item.pack + "　" : "") + navId(item) + "　" + (item.title || "");
      section.append(kicker);
    }
    if (node.matches(".cover-sheet")) section.append(node);
    else {
      while (node.firstChild) section.append(node.firstChild);
    }
    return section;
  }

  function ensureRunningPrintFolio() {
    // 頁碼改由 book-pdf.js + print-folios.js 在列印視窗安裝；合成頁不放 fixed folio
    document.getElementById("book-print-folio")?.remove();
    return null;
  }

  async function appendList(list, label, progress) {
    const failed = [];
    const api = window.JPWNBookCache;
    const CONCURRENCY = 6;

    // 過濾已載入的，收集待載清單（保留原序）
    const pending = [];
    for (let i = 0; i < list.length; i += 1) {
      if (label.indexOf("實驗") !== -1 && !labsEl?.checked) break;
      const item = list[i];
      if (pagesEl.querySelector('[data-src="' + item.file + '"]')) {
        if (progress) progress.done += 1;
        continue;
      }
      pending.push({ item, origIndex: i });
    }

    // 結果暫存（保留原序後再一次 append）
    const results = new Array(pending.length);

    let dispatchIdx = 0;
    let resolvedCount = 0;

    async function worker() {
      while (dispatchIdx < pending.length) {
        await waitIfPaused();
        if (label.indexOf("實驗") !== -1 && !labsEl?.checked) break;
        const slot = dispatchIdx++;
        const { item } = pending[slot];
        const total = progress ? progress.total : list.length;
        try {
          const section = await parsePage(item);
          results[slot] = section;
        } catch (err) {
          results[slot] = null;
          failed.push(failLabel(item));
          lastError = errText(err);
          console.warn("[整本講義]", item.file, err);
        }
        resolvedCount += 1;
        if (progress) progress.done += 1;
        const n = progress ? progress.done : resolvedCount;
        setStatus("正在載入" + label + "（" + n + "／" + total + "）。可按「暫停合成」。");
        setBar(n, total);
        api?.writeProgress({
          status: paused ? "paused" : "running",
          done: n,
          total,
          labs: !!labsEl?.checked
        });
        await yieldTick();
      }
    }

    // 啟動 CONCURRENCY 個 worker 並行
    const workers = [];
    for (let w = 0; w < Math.min(CONCURRENCY, pending.length); w += 1) {
      workers.push(worker());
    }
    await Promise.all(workers);

    // 依原序 append
    for (const section of results) {
      if (section) {
        pagesEl.append(section);
        pagesEl.hidden = false;
        haveCore = coreCount() > 0;
        finishMath(section);
      }
    }
    return failed;
  }

  function finishMath(root) {
    const target = root || pagesEl;
    freezeBlanks(target);
    pagesEl.hidden = false;
    if (window.JPWNMath?.render) window.JPWNMath.render(target);
  }

  function coreCount() {
    return pagesEl.querySelectorAll('.book-section:not([data-kind="lab"])').length;
  }

  function statusReady(failed) {
    assembled = true;
    paintPauseBtn();
    const extra = failed.length ? "無法載入：" + failed.join("、") + "。" : "";
    const hint = lastError ? "原因：" + lastError + "。" : "";
    if (!haveCore) {
      window.JPWNBookCache?.writeProgress({ status: "error", done: 0, total: 0, labs: !!labsEl?.checked });
      setBar(0, 0);
      setStatus("沒有載入任何頁面。" + extra + hint + "請按「重新合成」再試一次。");
      return;
    }
    ensureRunningPrintFolio();
    window.JPWNBookCache?.writeProgress({
      status: failed.length ? "error" : "done",
      done: failed.length ? 0 : 1,
      total: 1,
      labs: !!labsEl?.checked
    });
    setBar(0, 0);
    if (failed.length) {
      setStatus(extra + hint + "已載入的頁面仍可下載。請按「下載整本 PDF」或分章下載。");
      return;
    }
    if (pendingPrint !== null) {
      setStatus("合成完成，接著會直接下載 PDF。");
    } else {
      setStatus("合成完成。可下載整本，或先按「第 1 章」分章下載（較快）。");
    }
  }

  function setPrintScope(scope) {
    const want = scope || "all";
    pagesEl.querySelectorAll(".book-section").forEach((sec) => {
      const ch = sec.dataset.chapter || "";
      sec.classList.toggle("is-print-skip", want !== "all" && ch !== want);
    });
  }

  function scopeTitle(scope) {
    if (scope === "all") return "整本";
    if (scope === "cover") return "封面";
    if (scope === "lab") return "實驗專區";
    return "第" + scope + "章";
  }

  let exporting = false;

  function downloadBook(withAnswers, filename) {
    if (exporting) return;
    const api = window.JPWNBookPdf;
    if (!api || typeof api.download !== "function") {
      setStatus("找不到輸出元件，請重新整理這一頁。");
      return;
    }
    const sections = [...pagesEl.querySelectorAll(".book-section:not(.is-print-skip)")];
    if (!sections.length) {
      setStatus("沒有可下載的頁面。");
      return;
    }
    exporting = true;
    pagesEl.hidden = false;
    setStatus("正在開啟列印視窗，字型載好後會自動彈出「另存為 PDF」。");
    api.download({
      sections,
      withAnswers,
      filename,
      onProgress(done, total, state, msg) {
        if (state === "error") {
          setBar(0, 0);
          setStatus("輸出失敗：" + (msg || "請確認允許彈出視窗，再試一次。"));
          toast("PDF 輸出失敗。");
          exporting = false;
          setPrintScope("all");
        } else if (state === "done") {
          setBar(0, 0);
          setStatus("列印視窗已開啟。請在視窗中選「另存為 PDF」，印表機選「另存為 PDF」或「Save as PDF」。");
          exporting = false;
          setPrintScope("all");
        } else {
          setBar(done, total);
          setStatus("正在準備「" + filename + "」，稍後會自動開啟列印視窗。");
        }
      }
    });
  }

  function tryAutoDownload() {
    if (pendingPrint === null || !readyNow()) return;
    const withAnswers = pendingPrint;
    const scope = pendingScope || "all";
    pendingPrint = null;
    pendingScope = "all";
    setPrintScope(scope);
    const label = scopeTitle(scope);
    const filename = withAnswers
      ? "國中理化_" + label + "_講義_含答案.pdf"
      : "國中理化_" + label + "_講義.pdf";
    setStatus("正在輸出「" + label + "」PDF，完成後會自動下載。");
    downloadBook(withAnswers, filename);
  }

  function requestDownload(withAnswers, scope) {
    pendingPrint = withAnswers;
    pendingScope = scope || "all";
    if (scope === "lab" && labsEl && !labsEl.checked) {
      labsEl.checked = true;
      setStatus("會先附上實驗專區，再下載。");
    }
    if (readyNow() && (!building || paused)) {
      tryAutoDownload();
      return;
    }
    setStatus("載入完成後會直接下載 PDF。整本較久，建議分章下載。");
    toast("合成完成後會自動下載，請保持這一頁開著。");
    if (!building) build();
  }

  async function build() {
    if (building) {
      queued = true;
      return;
    }
    building = true;
    assembled = false;
    paused = false;
    pauseWait = null;
    lastError = "";
    paintPauseBtn();
    const wantLabs = !!labsEl?.checked;
    const failed = [];
    const api = window.JPWNBookCache;

    if (api) {
      try {
        if (await api.clearBroken()) {
          setStatus("正在清除舊的背景抓檔元件，頁面會重新整理一次……");
          return;
        }
      } catch (err) {
        /* ignore */
      }
    }

    const core = coreList();
    const labs = wantLabs ? labList() : [];
    const progress = { done: 0, total: (haveCore ? 0 : core.length) + (wantLabs && !haveLabs ? labs.length : 0) };
    api?.writeProgress({ status: "running", done: 0, total: progress.total, labs: wantLabs });

    if (!haveCore && !core.length) {
      lastError = "找不到講義清單，請重新整理後再試。";
      building = false;
      statusReady([]);
      return;
    }

    if (!haveCore) {
      setStatus("正在載入封面與各節講義……");
      failed.push(...await appendList(core, " ", progress));
      haveCore = coreCount() > 0;
    }

    if (wantLabs && !haveLabs) {
      setStatus("正在附加實驗專區……");
      failed.push(...await appendList(labs, "實驗 ", progress));
      haveLabs = true;
    }

    if (!wantLabs && haveLabs) {
      pagesEl.querySelectorAll('.book-section[data-kind="lab"]').forEach((el) => el.remove());
      haveLabs = false;
    }

    building = false;
    paintPauseBtn();
    statusReady(failed);
    tryAutoDownload();
    if (queued) {
      queued = false;
      build();
    }
  }

  if (typeof window.NotesApp?.printPdf === "function") {
    window.NotesApp.printPdf = function (withAnswers) {
      requestDownload(!!withAnswers, "all");
    };
  }

  document.getElementById("btn-book-pdf")?.addEventListener("click", () => requestDownload(false, "all"));
  document.getElementById("btn-book-key")?.addEventListener("click", () => requestDownload(true, "all"));
  pauseBtn?.addEventListener("click", () => {
    if (paused) resumeBuild();
    else if (building) pauseBuild();
    else build();
  });
  labsEl?.addEventListener("change", () => {
    if (!labsEl.checked) {
      pagesEl.querySelectorAll('.book-section[data-kind="lab"]').forEach((el) => el.remove());
      haveLabs = false;
      setStatus("會拿掉實驗專區，前面各章留著。");
      if (!building) paintPauseBtn();
      return;
    }
    setStatus("會在最後加上實驗專區。");
    if (!building) build();
    else queued = true;
  });

  (function renderChapterPrintButtons() {
    const host = document.getElementById("book-chapter-actions");
    if (!host) return;
    const btns = [];
    btns.push('<button type="button" class="btn btn-ghost" data-print-ch="cover">封面</button>');
    (cfg.packs || []).forEach((pack) => {
      const first = pack.files && pack.files[0] ? pack.files[0].id : "";
      const m = String(first).match(/^(\d+)/);
      const ch = m ? m[1] : "";
      if (!ch) return;
      btns.push('<button type="button" class="btn btn-ghost" data-print-ch="' + ch + '">第 ' + ch + " 章</button>");
    });
    btns.push('<button type="button" class="btn btn-ghost" data-print-ch="lab">實驗專區</button>');
    host.innerHTML = btns.join("");
    host.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-print-ch]");
      if (!btn) return;
      requestDownload(false, btn.getAttribute("data-print-ch"));
    });
  })();

  window.addEventListener("jpwn-after-print", () => {
    setPrintScope("all");
  });

  window.JPWNBookCache?.subscribe((info) => {
    if (assembled || building) return;
    if (info.status === "running" && info.total) {
      setBar(info.done, info.total);
      setStatus("正在載入 " + info.done + "／" + info.total + "。可以去看其他講義，載完請回到這一頁。");
    }
  });

  setStatus("正在載入整本講義。可按「暫停合成」去看其他講義。");
  paintPauseBtn();
  build();
})();
