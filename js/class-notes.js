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
  const ctx = canvas.getContext("2d");
  const liveCtx = live.getContext("2d");

  function cssWidth() {
    return Math.max(1, wrap.clientWidth);
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

  function drawStrokeOn(target, stroke) {
    const pts = stroke.points || [];
    if (!pts.length) return;
    const w = cssWidth();
    target.save();
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

  function sizeCanvases() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = wrap.clientWidth;
    const h = Math.max(wrap.scrollHeight, wrap.clientHeight, 1);
    const pw = Math.floor(w * dpr);
    const ph = Math.floor(h * dpr);
    [canvas, live].forEach((el) => {
      el.style.width = w + "px";
      el.style.height = h + "px";
      if (el.width !== pw || el.height !== ph) {
        el.width = pw;
        el.height = ph;
      }
      el.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
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

  function fitCanvas() {
    redraw();
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
    const cls = currentClass();
    document.body.classList.toggle("ink-draw", state.drawing);
    host.classList.toggle("is-draw", state.drawing);
    host.classList.toggle("is-hide", !state.visible);
    if (btn) {
      btn.setAttribute("aria-pressed", state.drawing ? "true" : "false");
      btn.classList.toggle("btn-orange", state.drawing);
      btn.classList.toggle("btn-ghost", !state.drawing);
      btn.textContent = state.drawing ? "結束筆記" : "筆記";
    }
    const banner = document.getElementById("ink-banner");
    if (banner) {
      banner.hidden = !state.drawing;
      banner.textContent = `正在筆記 · ${cls?.name || ""}　觸控筆可寫在講義上，手掌會忽略　再點「結束筆記」就能點空格`;
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

  function startStroke(e) {
    if (!state.drawing || !state.visible) return;
    if (!acceptPointer(e)) return;
    e.preventDefault();
    host.setPointerCapture(e.pointerId);
    const tool = state.tool;
    state.current = {
      tool,
      color: tool === "hi" ? (state.color === "#0f172a" ? "#eab308" : state.color) : state.color,
      size: tool === "hi" ? state.size * 5 + 10 : tool === "eraser" ? Math.max(16, state.size * 8) : state.size,
      points: [toPoint(e)]
    };
    liveCtx.clearRect(0, 0, cssWidth(), host.clientHeight);
    drawStrokeOn(liveCtx, state.current);
  }

  function moveStroke(e) {
    if (!state.current) return;
    e.preventDefault();
    const events = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [e];
    events.forEach((ev) => {
      const p = toPoint(ev);
      const last = state.current.points[state.current.points.length - 1];
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      if (dx * dx + dy * dy < 0.000002) return;
      state.current.points.push(p);
    });
    if (state.current.tool === "eraser") {
      redraw();
    } else {
      liveCtx.clearRect(0, 0, cssWidth(), host.clientHeight);
      drawStrokeOn(liveCtx, state.current);
    }
  }

  function endStroke() {
    if (!state.current) return;
    if (state.current.points.length) {
      if (state.current.tool === "eraser") {
        state.strokes.push(state.current);
        redraw();
      } else {
        drawStrokeOn(ctx, state.current);
        state.strokes.push(state.current);
        liveCtx.clearRect(0, 0, cssWidth(), host.clientHeight);
      }
    }
    state.current = null;
    scheduleSave();
  }

  host.addEventListener("pointerdown", startStroke, { passive: false });
  host.addEventListener("pointermove", moveStroke, { passive: false });
  host.addEventListener("pointerup", endStroke);
  host.addEventListener("pointercancel", endStroke);
  host.addEventListener("lostpointercapture", endStroke);
  host.addEventListener("contextmenu", (e) => {
    if (state.drawing) e.preventDefault();
  });

  const dock = document.createElement("aside");
  dock.className = "ink-dock no-print";
  dock.innerHTML = `
    <div class="ink-banner" id="ink-banner" hidden></div>
    <button class="ink-fab" id="ink-fab" type="button" aria-expanded="false">筆記面板</button>
    <div class="ink-panel" id="ink-panel" hidden>
      <div class="ink-panel-head">
        <strong>課堂筆記</strong>
        <span class="ink-status" id="ink-status">—</span>
      </div>
      <label class="ink-field">
        <span>班級</span>
        <select id="ink-class"></select>
      </label>
      <div class="ink-row">
        <input id="ink-new-name" type="text" maxlength="20" placeholder="新班級，例如 801" autocomplete="off">
        <button type="button" class="btn btn-green" id="ink-add-class">加入</button>
      </div>
      <div class="ink-row">
        <button type="button" class="btn btn-ghost" id="ink-rename">改名</button>
        <button type="button" class="btn btn-ghost" id="ink-del-class">刪除班級</button>
      </div>
      <div class="ink-tools">
        <button type="button" data-ink-tool="pen" class="is-on">筆</button>
        <button type="button" data-ink-tool="hi">螢光</button>
        <button type="button" data-ink-tool="eraser">擦布</button>
      </div>
      <div class="ink-colors">
        ${COLORS.map((c) => `<button type="button" data-ink-color="${c}" style="background:${c}" aria-label="顏色"></button>`).join("")}
      </div>
      <label class="ink-field">
        <span>粗細</span>
        <input id="ink-size" type="range" min="1" max="8" value="3">
      </label>
      <div class="ink-row">
        <button type="button" class="btn btn-ghost" id="ink-undo">復原</button>
        <button type="button" class="btn btn-ghost" id="ink-clear">清除本頁</button>
      </div>
      <label class="ink-check"><input id="ink-visible" type="checkbox" checked> 顯示這班的筆記</label>
      <label class="ink-check"><input id="ink-finger" type="checkbox"> 手指也可寫（關閉可防手掌誤觸）</label>
      <div class="ink-row">
        <button type="button" class="btn btn-ghost" id="ink-export">匯出此班</button>
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
  }

  document.getElementById("ink-fab").addEventListener("click", () => {
    setPanel(document.getElementById("ink-panel").hidden);
  });

  document.getElementById("btn-ink")?.addEventListener("click", () => {
    state.drawing = !state.drawing;
    if (state.drawing) {
      state.visible = true;
      setPanel(true);
    }
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
