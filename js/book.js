(function () {
  if (document.body.dataset.page !== "book") return;

  const cfg = window.APP_CONFIG?.book || {};
  const statusEl = document.getElementById("book-status");
  const pagesEl = document.getElementById("book-pages");
  const labsEl = document.getElementById("book-labs");
  const barEl = document.getElementById("book-bar");
  const KEEP_IDS = new Set(["cover-class", "cover-name", "cover-seat", "cover-form"]);
  const POOL = 4;

  let building = false;
  let queued = false;
  let haveCore = false;
  let haveLabs = false;
  let pendingPrint = null;

  function readyNow() {
    return haveCore && (!labsEl?.checked || haveLabs);
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function setBar(done, total) {
    if (!barEl) return;
    const pct = total ? Math.round((done / total) * 100) : 0;
    barEl.hidden = !total;
    barEl.max = total || 1;
    barEl.value = done;
    barEl.setAttribute("aria-valuenow", String(done));
    barEl.setAttribute("aria-valuemax", String(total || 1));
    barEl.title = pct + "%";
  }

  function toast(msg) {
    (window.NotesApp?.toast || ((m) => window.alert(m)))(msg);
  }

  function navId(item) {
    return item.nav || String(item.id || "").replace(/^lab-/, "");
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

  async function fetchPage(item) {
    const url = new URL(item.file, document.baseURI).href;
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(item.file + "（" + res.status + "）");
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const source = extractBody(doc);
    if (!source) throw new Error(item.file + " 找不到內容");
    const node = source.cloneNode(true);
    stripChrome(node);
    rewriteAssets(node, url);
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
    if (item.kind !== "cover") {
      const kicker = document.createElement("p");
      kicker.className = "book-kicker";
      kicker.textContent = (item.pack ? item.pack + "　" : "") + navId(item) + "　" + (item.title || "");
      section.append(kicker);
    }
    if (node.matches(".cover-sheet")) section.append(node);
    else {
      while (node.firstChild) section.append(node.firstChild);
    }
    return section;
  }

  async function fetchAll(list, label) {
    const failed = [];
    const nodes = new Array(list.length);
    let done = 0;
    let cursor = 0;

    async function worker() {
      while (cursor < list.length) {
        const idx = cursor;
        cursor += 1;
        const item = list[idx];
        setStatus("正在載入" + label + navId(item) + "（" + (done + 1) + "／" + list.length + "）……");
        try {
          nodes[idx] = await fetchPage(item);
        } catch (err) {
          failed.push(navId(item));
          console.warn("[整本講義]", item.file, err);
        }
        done += 1;
        setBar(done, list.length);
      }
    }

    const n = Math.min(POOL, list.length);
    await Promise.all(Array.from({ length: n }, worker));
    nodes.forEach((node) => {
      if (node) pagesEl.append(node);
    });
    return failed;
  }

  function finishMath() {
    freezeBlanks(pagesEl);
    pagesEl.hidden = false;
    if (window.JPWNMath?.render) window.JPWNMath.render();
    else window.setTimeout(() => window.JPWNMath?.render?.(), 400);
  }

  function statusReady(failed) {
    setBar(0, 0);
    const extra = failed.length ? "無法載入：" + failed.join("、") + "。" : "";
    if (pendingPrint !== null) {
      setStatus(extra + "合成完成，接著會打開「另存為 PDF」。若沒跳出視窗，請再按一次下載。");
    } else {
      setStatus(extra + "合成完成。請按「下載整本 PDF」；印表機選「另存為 PDF」。不會自己開始下載。");
    }
  }

  function tryAutoPrint() {
    if (pendingPrint === null || !readyNow()) return;
    const withAnswers = pendingPrint;
    pendingPrint = null;
    window.setTimeout(() => {
      const fn = window.NotesApp?.printPdf;
      if (typeof fn === "function") fn(withAnswers);
    }, 200);
  }

  async function build() {
    if (building) {
      queued = true;
      return;
    }
    building = true;
    const wantLabs = !!labsEl?.checked;
    const failed = [];

    if (!haveCore) {
      setStatus("正在合成封面與各節講義……");
      failed.push(...await fetchAll(coreList(), " "));
      haveCore = true;
      finishMath();
    }

    if (wantLabs && !haveLabs) {
      setStatus("正在附加實驗專區……");
      failed.push(...await fetchAll(labList(), "實驗 "));
      haveLabs = true;
      finishMath();
    }

    if (!wantLabs && haveLabs) {
      pagesEl.querySelectorAll('.book-section[data-kind="lab"]').forEach((el) => el.remove());
      haveLabs = false;
    }

    building = false;
    statusReady(failed);
    tryAutoPrint();
    if (queued) {
      queued = false;
      build();
    }
  }

  function requestPrint(withAnswers) {
    pendingPrint = withAnswers;
    if (readyNow() && !building) {
      tryAutoPrint();
      return;
    }
    setStatus("合成完成後會自動打開「另存為 PDF」。請保留這個分頁；其他講義請另開分頁看。");
    toast("合成完會自動打開列印視窗。請留在這個分頁。");
    if (!building) build();
  }

  const origPrint = window.NotesApp?.printPdf;
  if (typeof origPrint === "function") {
    window.NotesApp.printPdf = function (withAnswers) {
      if (!readyNow() || building) {
        requestPrint(!!withAnswers);
        return;
      }
      origPrint(withAnswers);
    };
  }

  document.getElementById("btn-book-pdf")?.addEventListener("click", () => requestPrint(false));
  document.getElementById("btn-book-key")?.addEventListener("click", () => requestPrint(true));
  labsEl?.addEventListener("change", () => {
    if (labsEl.checked) {
      setStatus("會在講義後面加上實驗專區，不必重抓前面各章。");
    } else {
      setStatus("會拿掉實驗專區，前面各章講義留著。");
    }
    build();
  });

  if (location.protocol === "file:") {
    setStatus("請用 GitHub Pages 或本機網站開啟這一頁，直接雙擊 HTML 無法一次抓齊各節。");
    toast("整本下載需要網站網址，不能直接開檔案。");
    return;
  }

  setStatus("正在合成封面與各節。完成後不會自動下載，請再按「下載整本 PDF」。其他講義請另開分頁，這個分頁請留著。");
  build();
})();
