(function () {
  const LS_CLASSES = "jpwn.classes";
  const LS_CURRENT = "jpwn.classId";
  const LS_FINGER = "jpwn.allowFinger";
  const DB_NAME = "jpwn-ink";
  const DB_STORE = "pages";
  const COLORS = ["#b91c1c", "#1d4ed8", "#15803d", "#0f172a", "#ea580c", "#7c3aed"];

  const wrap = document.querySelector(".wrap");
  if (!wrap) return;

  const pageKey = `${document.body.dataset.page || "page"}:${document.body.dataset.section || "home"}`;

  const state = {
    classes: [],
    classId: "",
    strokes: [],
    drawing: false,
    visible: true,
    tool: "pen",
    color: "#b91c1c",
    size: 3,
    allowFinger: false,
    current: null,
    dirty: false,
    saving: false,
    savedAt: 0,
    db: null
  };

  function toast(msg) {
    if (window.NotesApp?.toast) {
      window.NotesApp.toast(msg);
      return;
    }
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.style.display = "block";
    clearTimeout(toast._id);
    toast._id = setTimeout(() => {
      t.style.display = "none";
    }, 2400);
  }

  function loadClasses() {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_CLASSES) || "[]");
      if (Array.isArray(raw) && raw.length) return raw.filter((c) => c && c.id && c.name);
    } catch (err) {
      /* ignore */
    }
    return [{ id: "default", name: "預設班級" }];
  }

  function saveClasses() {
    localStorage.setItem(LS_CLASSES, JSON.stringify(state.classes));
    localStorage.setItem(LS_CURRENT, state.classId);
  }

  function inkKey() {
    return `${state.classId}::${pageKey}`;
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("no-idb"));
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function idbGet(key) {
    return new Promise((resolve, reject) => {
      const tx = state.db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  function idbSet(key, value) {
    return new Promise((resolve, reject) => {
      const tx = state.db.transaction(DB_STORE, "readwrite");
      const req = tx.objectStore(DB_STORE).put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  function idbDel(key) {
    return new Promise((resolve, reject) => {
      const tx = state.db.transaction(DB_STORE, "readwrite");
      const req = tx.objectStore(DB_STORE).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  function idbKeys() {
    return new Promise((resolve, reject) => {
      const tx = state.db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  function lsGet(key) {
    try {
      return JSON.parse(localStorage.getItem("jpwn.ink." + key) || "null");
    } catch (err) {
      return null;
    }
  }

  function lsSet(key, value) {
    localStorage.setItem("jpwn.ink." + key, JSON.stringify(value));
  }

  async function readPage() {
    const key = inkKey();
    try {
      if (state.db) {
        const row = await idbGet(key);
        if (row?.strokes) return row.strokes;
      }
    } catch (err) {
      /* fall through */
    }
    return lsGet(key)?.strokes || [];
  }

  async function writePage() {
    const payload = {
      classId: state.classId,
      pageKey,
      strokes: state.strokes,
      updatedAt: Date.now()
    };
    const key = inkKey();
    try {
      if (state.db) await idbSet(key, payload);
      else lsSet(key, payload);
      return true;
    } catch (err) {
      try {
        lsSet(key, payload);
        return true;
      } catch (err2) {
        return false;
      }
    }
  }

  const host = document.createElement("div");
  host.id = "ink-host";
  host.setAttribute("aria-hidden", "true");
  const canvas = document.createElement("canvas");
  const live = document.createElement("canvas");
  live.className = "ink-live";
  host.appendChild(canvas);
  host.appendChild(live);
  wrap.appendChild(host);
  const ctxOpts = { alpha: true, desynchronized: true };
  const ctx = canvas.getContext("2d", ctxOpts) || canvas.getContext("2d");
  const liveCtx = live.getContext("2d", ctxOpts) || live.getContext("2d");

  function cssWidth() {
    return Math.max(1, wrap.clientWidth);
  }

  function cssHeight() {
    return Math.max(1, parseFloat(canvas.style.height) || host.clientHeight);
  }

  function toPoint(e) {
    const r = host.getBoundingClientRect();
    const w = Math.max(1, r.width);
    return {
      x: (e.clientX - r.left) / w,
      y: (e.clientY - r.top) / w,
      p: typeof e.pressure === "number" && e.pressure > 0 ? e.pressure : 0.5
    };
  }

  function lineWidth(stroke, w) {
    const base = stroke.size || (stroke.tool === "hi" ? 18 : stroke.tool === "eraser" ? 24 : 3);
    return Math.max(1, base * (w / 800));
  }

  function applyStrokeStyle(target, stroke, w) {
    if (stroke.tool === "eraser") {
      target.globalCompositeOperation = "destination-out";
      target.strokeStyle = "rgba(0,0,0,1)";
    } else if (stroke.tool === "hi") {
      target.globalAlpha = 0.3;
      target.strokeStyle = stroke.color || "#eab308";
    } else {
      target.strokeStyle = stroke.color || "#b91c1c";
    }
    target.lineCap = "round";
    target.lineJoin = "round";
    target.lineWidth = lineWidth(stroke, w);
  }

  function drawStrokeOn(target, stroke) {
    const pts = stroke.points || [];
    if (!pts.length) return;
    const w = cssWidth();
    target.save();
    applyStrokeStyle(target, stroke, w);
    target.beginPath();
    target.moveTo(pts[0].x * w, pts[0].y * w);
    if (pts.length === 1) {
      target.lineTo(pts[0].x * w + 0.01, pts[0].y * w);
    } else {
      for (let i = 1; i < pts.length; i += 1) {
        const midX = ((pts[i - 1].x + pts[i].x) / 2) * w;
        const midY = ((pts[i - 1].y + pts[i].y) / 2) * w;
        target.quadraticCurveTo(pts[i - 1].x * w, pts[i - 1].y * w, midX, midY);
      }
      const last = pts[pts.length - 1];
      target.lineTo(last.x * w, last.y * w);
    }
    target.stroke();
    target.restore();
  }

  function drawNewSegments(target, stroke, fromIdx) {
    const pts = stroke.points || [];
    if (!pts.length || fromIdx >= pts.length) return;
    const w = cssWidth();
    target.save();
    applyStrokeStyle(target, stroke, w);
    target.beginPath();
    if (fromIdx <= 0) {
      target.moveTo(pts[0].x * w, pts[0].y * w);
      target.lineTo(pts[0].x * w + 0.01, pts[0].y * w);
      fromIdx = 1;
    } else {
      const prev = pts[fromIdx - 1];
      target.moveTo(prev.x * w, prev.y * w);
    }
    for (let i = fromIdx; i < pts.length; i += 1) {
      target.lineTo(pts[i].x * w, pts[i].y * w);
    }
    target.stroke();
    target.restore();
  }

  function canvasScale(w, h) {
    let scale = Math.min(window.devicePixelRatio || 1, 1.5);
    const maxSide = 4096;
    const maxPixels = 5 * 1024 * 1024;
    if (w * scale > maxSide) scale = maxSide / w;
    if (h * scale > maxSide) scale = Math.min(scale, maxSide / h);
    if (w * h * scale * scale > maxPixels) {
      scale = Math.sqrt(maxPixels / Math.max(1, w * h));
    }
    return Math.max(0.5, scale);
  }

  function sizeCanvases() {
    const w = wrap.clientWidth;
    const h = Math.max(wrap.scrollHeight, wrap.clientHeight, 1);
    const scale = canvasScale(w, h);
    const pw = Math.max(1, Math.floor(w * scale));
    const ph = Math.max(1, Math.floor(h * scale));
    [canvas, live].forEach((el) => {
      el.style.width = w + "px";
      el.style.height = h + "px";
      if (el.width !== pw || el.height !== ph) {
        el.width = pw;
        el.height = ph;
      }
      const g = el === canvas ? ctx : liveCtx;
      g.setTransform(scale, 0, 0, scale, 0, 0);
    });
    return { w, h };
  }

  function redraw() {
    const { w, h } = sizeCanvases();
    ctx.clearRect(0, 0, w, h);
    liveCtx.clearRect(0, 0, w, h);
    if (!state.visible) return;
    state.strokes.forEach((stroke) => drawStrokeOn(ctx, stroke));
    if (state.current) {
      if (state.current.tool === "eraser") drawStrokeOn(ctx, state.current);
      else drawStrokeOn(liveCtx, state.current);
    }
  }

  let fitTimer = 0;
  function fitCanvas() {
    if (state.current) return;
    clearTimeout(fitTimer);
    fitTimer = setTimeout(redraw, 50);
  }

  function setStatus(text) {
    const el = document.getElementById("ink-status");
    if (el) el.textContent = text;
  }

  let saveTimer = 0;
  function scheduleSave() {
    state.dirty = true;
    setStatus("尚未儲存");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 500);
  }

  async function flushSave() {
    if (!state.dirty || state.saving) return;
    state.saving = true;
    setStatus("儲存中…");
    const ok = await writePage();
    state.saving = false;
    if (ok) {
      state.dirty = false;
      state.savedAt = Date.now();
      setStatus("已儲存");
    } else {
      setStatus("儲存失敗");
      toast("筆記儲存失敗，可能是空間不足");
    }
  }

  async function loadStrokes() {
    state.strokes = await readPage();
    state.current = null;
    state.dirty = false;
    setStatus(state.strokes.length ? "已載入" : "空白頁");
    redraw();
  }

  function currentClass() {
    return state.classes.find((c) => c.id === state.classId) || state.classes[0];
  }

  function fillClassSelect() {
    const sel = document.getElementById("ink-class");
    if (!sel) return;
    sel.innerHTML = state.classes.map((c) =>
      `<option value="${c.id}" ${c.id === state.classId ? "selected" : ""}>${c.name}</option>`
    ).join("");
  }

  function updateChrome() {
    const btn = document.getElementById("btn-ink");
    document.body.classList.toggle("ink-draw", state.drawing);
    host.classList.toggle("is-draw", state.drawing);
    host.classList.toggle("is-hide", !state.visible);
    if (btn) {
      btn.setAttribute("aria-pressed", state.drawing ? "true" : "false");
      btn.classList.toggle("btn-orange", state.drawing);
      btn.classList.toggle("btn-ghost", !state.drawing);
      btn.textContent = state.drawing ? "結束筆記" : "筆記";
    }
    const stop = document.getElementById("ink-stop");
    if (stop) stop.hidden = !state.drawing;
    const fab = document.getElementById("ink-fab");
    const panel = document.getElementById("ink-panel");
    if (fab) {
      fab.textContent = state.drawing
        ? (panel && !panel.hidden ? "收合" : "工具")
        : "筆記面板";
    }
    document.querySelectorAll("[data-ink-tool]").forEach((b) => {
      b.classList.toggle("is-on", b.dataset.inkTool === state.tool);
    });
    document.querySelectorAll("[data-ink-color]").forEach((b) => {
      b.classList.toggle("is-on", b.dataset.inkColor === state.color);
    });
    const size = document.getElementById("ink-size");
    if (size) size.value = String(state.size);
    const finger = document.getElementById("ink-finger");
    if (finger) finger.checked = state.allowFinger;
    const vis = document.getElementById("ink-visible");
    if (vis) vis.checked = state.visible;
  }

  function acceptPointer(e) {
    if (e.pointerType === "pen" || e.pointerType === "mouse") return true;
    return state.allowFinger;
  }

  function fromUi(e) {
    return !!e.target.closest(".ink-dock, .toolbar, .section-nav, .embed-banner, button, a, input, select, textarea, label");
  }

  let paintRaf = 0;
  function ingestPoints(e) {
    const coalesced = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : null;
    const events = coalesced && coalesced.length ? coalesced : [e];
    events.forEach((ev) => {
      const p = toPoint(ev);
      const last = state.current.points[state.current.points.length - 1];
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      if (dx * dx + dy * dy < 0.0000008) return;
      state.current.points.push(p);
    });
  }

  function paintCurrent() {
    const stroke = state.current;
    if (!stroke) return;
    const from = stroke.drawnUntil || 0;
    if (from >= stroke.points.length && from > 0) return;
    const target = stroke.tool === "eraser" ? ctx : liveCtx;
    drawNewSegments(target, stroke, from);
    stroke.drawnUntil = stroke.points.length;
  }

  function requestPaint() {
    if (paintRaf) return;
    paintRaf = requestAnimationFrame(() => {
      paintRaf = 0;
      paintCurrent();
    });
  }

  function startStroke(e) {
    if (!state.drawing || !state.visible) return;
    if (fromUi(e)) return;
    if (!acceptPointer(e)) return;
    e.preventDefault();
    try {
      wrap.setPointerCapture(e.pointerId);
    } catch (err) {
      /* ignore */
    }
    const tool = state.tool;
    if (paintRaf) {
      cancelAnimationFrame(paintRaf);
      paintRaf = 0;
    }
    state.current = {
      tool,
      color: tool === "hi" ? (state.color === "#0f172a" ? "#eab308" : state.color) : state.color,
      size: tool === "hi" ? state.size * 5 + 10 : tool === "eraser" ? Math.max(16, state.size * 8) : state.size,
      points: [toPoint(e)],
      drawnUntil: 0,
      pointerId: e.pointerId
    };
    liveCtx.clearRect(0, 0, cssWidth(), cssHeight());
    paintCurrent();
  }

  function moveStroke(e) {
    if (!state.current || e.pointerId !== state.current.pointerId) return;
    if (e.cancelable) e.preventDefault();
    ingestPoints(e);
    requestPaint();
  }

  function endStroke(e) {
    if (state.current && e && e.pointerId != null && e.pointerId !== state.current.pointerId) return;
    if (paintRaf) {
      cancelAnimationFrame(paintRaf);
      paintRaf = 0;
    }
    if (!state.current) return;
    paintCurrent();
    if (state.current.points.length) {
      delete state.current.pointerId;
      delete state.current.drawnUntil;
      if (state.current.tool === "eraser") {
        state.strokes.push(state.current);
        redraw();
      } else {
        liveCtx.clearRect(0, 0, cssWidth(), cssHeight());
        drawStrokeOn(ctx, state.current);
        state.strokes.push(state.current);
      }
    }
    state.current = null;
    scheduleSave();
  }

  wrap.addEventListener("pointerdown", startStroke, { capture: true, passive: false });
  wrap.addEventListener("pointermove", moveStroke, { capture: true, passive: false });
  if ("onpointerrawupdate" in window) {
    wrap.addEventListener("pointerrawupdate", moveStroke, { capture: true });
  }
  wrap.addEventListener("pointerup", endStroke, { capture: true });
  wrap.addEventListener("pointercancel", endStroke, { capture: true });
  wrap.addEventListener("lostpointercapture", endStroke);
  wrap.addEventListener("contextmenu", (e) => {
    if (state.drawing && acceptPointer(e)) e.preventDefault();
  });

  const dock = document.createElement("aside");
  dock.className = "ink-dock no-print";
  dock.innerHTML = `
    <button class="ink-fab" id="ink-fab" type="button" aria-expanded="false">筆記面板</button>
    <div class="ink-panel" id="ink-panel" hidden>
      <div class="ink-panel-head">
        <strong>課堂筆記</strong>
        <span class="ink-status" id="ink-status">—</span>
        <button type="button" class="ink-strip-stop" id="ink-stop" hidden>結束</button>
      </div>
      <div class="ink-tools">
        <button type="button" data-ink-tool="pen" class="is-on">筆</button>
        <button type="button" data-ink-tool="hi">螢光</button>
        <button type="button" data-ink-tool="eraser">擦布</button>
      </div>
      <div class="ink-colors">
        ${COLORS.map((c) => `<button type="button" data-ink-color="${c}" style="background:${c}" aria-label="顏色"></button>`).join("")}
      </div>
      <div class="ink-pair">
        <label class="ink-field">
          <span>班級</span>
          <select id="ink-class"></select>
        </label>
        <label class="ink-field">
          <span>粗細</span>
          <input id="ink-size" type="range" min="1" max="8" value="3">
        </label>
      </div>
      <div class="ink-row">
        <input id="ink-new-name" type="text" maxlength="20" placeholder="新班級，例如 801" autocomplete="off">
        <button type="button" class="btn btn-green" id="ink-add-class">加入</button>
      </div>
      <div class="ink-row">
        <button type="button" class="btn btn-ghost" id="ink-rename">改名</button>
        <button type="button" class="btn btn-ghost" id="ink-del-class">刪班</button>
      </div>
      <div class="ink-row">
        <button type="button" class="btn btn-ghost" id="ink-undo">復原</button>
        <button type="button" class="btn btn-ghost" id="ink-clear">清除</button>
      </div>
      <div class="ink-row ink-checks">
        <label class="ink-check"><input id="ink-visible" type="checkbox" checked> 顯示筆記</label>
        <label class="ink-check" title="開啟後手指會變成畫筆，頁面較不好滑動"><input id="ink-finger" type="checkbox"> 手指可寫</label>
      </div>
      <div class="ink-row">
        <button type="button" class="btn btn-ghost" id="ink-export">匯出</button>
        <button type="button" class="btn btn-ghost" id="ink-import">匯入</button>
      </div>
      <input id="ink-file" type="file" accept="application/json,.json" hidden>
      <p class="ink-hint">筆記存在這臺平板的瀏覽器裡，依班級分開。換頁、換班會自動儲存。換裝置請先匯出。</p>
    </div>
  `;
  document.body.appendChild(dock);

  function setPanel(open) {
    const panel = document.getElementById("ink-panel");
    const fab = document.getElementById("ink-fab");
    panel.hidden = !open;
    fab.setAttribute("aria-expanded", open ? "true" : "false");
    dock.classList.toggle("is-open", open);
    if (fab) {
      fab.textContent = state.drawing
        ? (open ? "收合" : "工具")
        : "筆記面板";
    }
  }

  document.getElementById("ink-fab").addEventListener("click", () => {
    setPanel(document.getElementById("ink-panel").hidden);
  });

  document.getElementById("btn-ink")?.addEventListener("click", () => {
    state.drawing = !state.drawing;
    if (state.drawing) {
      state.visible = true;
      setPanel(true);
    } else {
      setPanel(false);
    }
    updateChrome();
  });

  document.getElementById("ink-stop")?.addEventListener("click", () => {
    state.drawing = false;
    setPanel(false);
    updateChrome();
  });

  document.getElementById("ink-class").addEventListener("change", async (e) => {
    await flushSave();
    state.classId = e.target.value;
    saveClasses();
    await loadStrokes();
    updateChrome();
    toast(`已切換到「${currentClass()?.name || ""}」`);
  });

  document.getElementById("ink-add-class").addEventListener("click", async () => {
    const input = document.getElementById("ink-new-name");
    const name = (input.value || "").trim();
    if (!name) {
      toast("請先輸入班級名稱");
      return;
    }
    if (state.classes.some((c) => c.name === name)) {
      toast("已有同名班級");
      return;
    }
    await flushSave();
    const id = "c" + Date.now().toString(36);
    state.classes.push({ id, name });
    state.classId = id;
    saveClasses();
    fillClassSelect();
    input.value = "";
    await loadStrokes();
    updateChrome();
    toast(`已新增「${name}」`);
  });

  document.getElementById("ink-rename").addEventListener("click", () => {
    const cls = currentClass();
    if (!cls) return;
    const name = (window.prompt("班級新名稱", cls.name) || "").trim();
    if (!name || name === cls.name) return;
    cls.name = name;
    saveClasses();
    fillClassSelect();
    updateChrome();
  });

  document.getElementById("ink-del-class").addEventListener("click", async () => {
    const cls = currentClass();
    if (!cls) return;
    if (state.classes.length <= 1) {
      toast("至少要保留一個班級");
      return;
    }
    if (!window.confirm(`刪除「${cls.name}」以及這個班在本機的全部筆記？`)) return;
    await flushSave();
    const prefix = cls.id + "::";
    try {
      if (state.db) {
        const keys = await idbKeys();
        await Promise.all(keys.filter((k) => String(k).startsWith(prefix)).map((k) => idbDel(k)));
      }
    } catch (err) {
      /* ignore */
    }
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith("jpwn.ink." + prefix) || k.startsWith("jpwn.ink." + cls.id)) {
        localStorage.removeItem(k);
      }
    });
    state.classes = state.classes.filter((c) => c.id !== cls.id);
    state.classId = state.classes[0].id;
    saveClasses();
    fillClassSelect();
    await loadStrokes();
    updateChrome();
    toast("已刪除班級");
  });

  dock.addEventListener("click", (e) => {
    const tool = e.target.closest("[data-ink-tool]");
    if (tool) {
      state.tool = tool.dataset.inkTool;
      if (!state.drawing) {
        state.drawing = true;
        state.visible = true;
      }
      updateChrome();
    }
    const color = e.target.closest("[data-ink-color]");
    if (color) {
      state.color = color.dataset.inkColor;
      state.tool = state.tool === "eraser" ? "pen" : state.tool;
      updateChrome();
    }
  });

  document.getElementById("ink-size").addEventListener("input", (e) => {
    state.size = Number(e.target.value) || 3;
  });

  document.getElementById("ink-undo").addEventListener("click", () => {
    if (!state.strokes.length) return;
    state.strokes.pop();
    redraw();
    scheduleSave();
  });

  document.getElementById("ink-clear").addEventListener("click", () => {
    if (!state.strokes.length) return;
    if (!window.confirm(`清除「${currentClass()?.name || ""}」在本頁的筆記？`)) return;
    state.strokes = [];
    redraw();
    scheduleSave();
  });

  document.getElementById("ink-visible").addEventListener("change", (e) => {
    state.visible = e.target.checked;
    updateChrome();
    redraw();
  });

  document.getElementById("ink-finger").addEventListener("change", (e) => {
    state.allowFinger = e.target.checked;
    localStorage.setItem(LS_FINGER, state.allowFinger ? "1" : "0");
  });

  document.getElementById("ink-export").addEventListener("click", async () => {
    await flushSave();
    const cls = currentClass();
    const dump = { class: cls, pages: {} };
    try {
      if (state.db) {
        const keys = await idbKeys();
        for (const key of keys) {
          if (String(key).startsWith(cls.id + "::")) {
            dump.pages[String(key)] = await idbGet(key);
          }
        }
      }
    } catch (err) {
      /* ignore */
    }
    dump.pages[inkKey()] = { classId: cls.id, pageKey, strokes: state.strokes, updatedAt: Date.now() };
    const blob = new Blob([JSON.stringify(dump)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `理化筆記-${cls.name}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("已匯出此班筆記");
  });

  document.getElementById("ink-import").addEventListener("click", () => {
    document.getElementById("ink-file").click();
  });

  document.getElementById("ink-file").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dump = JSON.parse(await file.text());
      const name = dump.class?.name || file.name.replace(/\.json$/i, "");
      let cls = state.classes.find((c) => c.name === name);
      if (!cls) {
        cls = { id: dump.class?.id || ("c" + Date.now().toString(36)), name };
        if (state.classes.some((c) => c.id === cls.id)) cls.id = "c" + Date.now().toString(36);
        state.classes.push(cls);
      }
      await flushSave();
      state.classId = cls.id;
      saveClasses();
      fillClassSelect();
      const pages = dump.pages || {};
      for (const [key, row] of Object.entries(pages)) {
        const nextKey = key.includes("::") ? cls.id + "::" + key.split("::").slice(1).join("::") : inkKey();
        const payload = {
          classId: cls.id,
          pageKey: row.pageKey || pageKey,
          strokes: row.strokes || [],
          updatedAt: Date.now()
        };
        try {
          if (state.db) await idbSet(nextKey, payload);
          else lsSet(nextKey, payload);
        } catch (err) {
          lsSet(nextKey, payload);
        }
      }
      await loadStrokes();
      updateChrome();
      toast(`已匯入「${cls.name}」`);
    } catch (err) {
      toast("匯入失敗，請確認是筆記 JSON 檔");
    }
  });

  document.getElementById("btn-answers")?.addEventListener("click", () => {
    setTimeout(fitCanvas, 80);
  });

  window.addEventListener("resize", () => fitCanvas());
  window.addEventListener("pagehide", () => { flushSave(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) flushSave();
  });

  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => fitCanvas()) : null;
  ro?.observe(wrap);

  async function init() {
    state.classes = loadClasses();
    const savedId = localStorage.getItem(LS_CURRENT);
    state.classId = state.classes.some((c) => c.id === savedId) ? savedId : state.classes[0].id;
    state.allowFinger = localStorage.getItem(LS_FINGER) === "1";
    saveClasses();
    try {
      state.db = await openDb();
    } catch (err) {
      state.db = null;
    }
    fillClassSelect();
    await loadStrokes();
    updateChrome();
    setPanel(false);
  }

  window.ClassInk = {
    save: flushSave,
    redraw: fitCanvas
  };

  init();
})();
