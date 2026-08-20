/**
 * 班級筆記／課堂資料 → GitHub Gist 雲端同步
 * 設定存在本機 localStorage；Token 僅留在使用者瀏覽器，勿提交到倉庫。
 */
(function () {
  const LS = {
    enabled: "jpwn.cloud.enabled",
    token: "jpwn.cloud.token",
    gistId: "jpwn.cloud.gistId",
    lastSync: "jpwn.cloud.lastSync",
    lastError: "jpwn.cloud.lastError",
    localUpdated: "jpwn.cloud.localUpdated"
  };
  const GIST_FILE = "jpwn-classroom-sync.json";
  const API = "https://api.github.com";

  const listeners = new Set();

  function cfg() {
    return {
      enabled: localStorage.getItem(LS.enabled) === "1",
      token: localStorage.getItem(LS.token) || "",
      gistId: localStorage.getItem(LS.gistId) || "",
      lastSync: Number(localStorage.getItem(LS.lastSync) || 0) || 0,
      lastError: localStorage.getItem(LS.lastError) || "",
      localUpdated: Number(localStorage.getItem(LS.localUpdated) || 0) || 0
    };
  }

  function setCfg(partial) {
    if (partial.enabled != null) localStorage.setItem(LS.enabled, partial.enabled ? "1" : "0");
    if (partial.token != null) {
      if (partial.token) localStorage.setItem(LS.token, String(partial.token).trim());
      else localStorage.removeItem(LS.token);
    }
    if (partial.gistId != null) {
      if (partial.gistId) localStorage.setItem(LS.gistId, String(partial.gistId).trim());
      else localStorage.removeItem(LS.gistId);
    }
    if (partial.lastSync != null) localStorage.setItem(LS.lastSync, String(partial.lastSync));
    if (partial.lastError != null) {
      if (partial.lastError) localStorage.setItem(LS.lastError, String(partial.lastError));
      else localStorage.removeItem(LS.lastError);
    }
    if (partial.localUpdated != null) localStorage.setItem(LS.localUpdated, String(partial.localUpdated));
    emit();
  }

  function emit() {
    const snap = status();
    listeners.forEach((fn) => {
      try { fn(snap); } catch (err) { /* ignore */ }
    });
  }

  function status() {
    const c = cfg();
    return {
      enabled: c.enabled,
      hasToken: !!c.token,
      gistId: c.gistId,
      lastSync: c.lastSync,
      lastError: c.lastError,
      localUpdated: c.localUpdated,
      busy: !!syncState.busy,
      phase: syncState.phase
    };
  }

  const syncState = { busy: false, phase: "idle", timer: 0 };

  function markLocalDirty() {
    setCfg({ localUpdated: Date.now() });
  }

  function lsJson(key, fallback) {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || "null");
      return raw == null ? fallback : raw;
    } catch (err) {
      return fallback;
    }
  }

  async function openInkDb() {
    if (!window.indexedDB) return null;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("jpwn-ink", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("pages")) db.createObjectStore("pages");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function readAllInk(db) {
    const ink = {};
    if (!db) {
      Object.keys(localStorage).forEach((k) => {
        if (!k.startsWith("jpwn.ink.")) return;
        try {
          const row = JSON.parse(localStorage.getItem(k) || "null");
          if (row) ink[k.slice("jpwn.ink.".length)] = row;
        } catch (err) { /* ignore */ }
      });
      return ink;
    }
    const keys = await new Promise((resolve, reject) => {
      const tx = db.transaction("pages", "readonly");
      const req = tx.objectStore("pages").getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    for (const key of keys) {
      const row = await new Promise((resolve, reject) => {
        const tx = db.transaction("pages", "readonly");
        const req = tx.objectStore("pages").get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
      if (row) ink[String(key)] = row;
    }
    return ink;
  }

  async function writeInkMap(db, ink) {
    const entries = Object.entries(ink || {});
    for (const [key, row] of entries) {
      const payload = {
        classId: row.classId || String(key).split("::")[0],
        pageKey: row.pageKey || "",
        strokes: Array.isArray(row.strokes) ? row.strokes : [],
        updatedAt: Number(row.updatedAt) || Date.now()
      };
      if (db) {
        await new Promise((resolve, reject) => {
          const tx = db.transaction("pages", "readwrite");
          const req = tx.objectStore("pages").put(payload, key);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } else {
        localStorage.setItem("jpwn.ink." + key, JSON.stringify(payload));
      }
    }
  }

  async function buildSnapshot() {
    let db = null;
    try { db = await openInkDb(); } catch (err) { db = null; }
    const ink = await readAllInk(db);
    if (db) try { db.close(); } catch (err) { /* ignore */ }
    return {
      version: 1,
      updatedAt: Date.now(),
      classes: lsJson("jpwn.classes", []),
      classId: localStorage.getItem("jpwn.classId") || "",
      ink,
      inquiry: lsJson("jpwn.inquiryWrites", {}),
      kit: lsJson("jpwn.labKit", {}),
      examSets: lsJson("jpwn.examSets", {}),
      examUi: lsJson("jpwn.examUi", {}),
      reveal: lsJson("jpwn.revealed", {})
    };
  }

  function localStamp(ink) {
    let maxInk = 0;
    Object.values(ink || {}).forEach((row) => {
      maxInk = Math.max(maxInk, Number(row?.updatedAt) || 0);
    });
    return Math.max(cfg().localUpdated || 0, maxInk);
  }

  function mergeInk(localInk, cloudInk) {
    const out = { ...(localInk || {}) };
    Object.entries(cloudInk || {}).forEach(([key, row]) => {
      const cur = out[key];
      const cloudAt = Number(row?.updatedAt) || 0;
      const localAt = Number(cur?.updatedAt) || 0;
      if (!cur || cloudAt >= localAt) out[key] = row;
    });
    return out;
  }

  function mergeClasses(localList, cloudList) {
    const map = new Map();
    (Array.isArray(localList) ? localList : []).forEach((c) => {
      if (c && c.id && c.name) map.set(c.id, c);
    });
    (Array.isArray(cloudList) ? cloudList : []).forEach((c) => {
      if (c && c.id && c.name) map.set(c.id, c);
    });
    const list = [...map.values()];
    return list.length ? list : [{ id: "default", name: "預設班級" }];
  }

  function mergeDict(localObj, cloudObj, cloudNewer) {
    if (cloudNewer) return { ...(localObj || {}), ...(cloudObj || {}) };
    return { ...(cloudObj || {}), ...(localObj || {}) };
  }

  async function applySnapshot(snap, opts) {
    if (!snap || typeof snap !== "object") throw new Error("雲端資料格式不正確");
    let db = null;
    try { db = await openInkDb(); } catch (err) { db = null; }
    const localInk = await readAllInk(db);
    const localClasses = lsJson("jpwn.classes", []);
    const localInquiry = lsJson("jpwn.inquiryWrites", {});
    const localKit = lsJson("jpwn.labKit", {});
    const localExamSets = lsJson("jpwn.examSets", {});
    const localExamUi = lsJson("jpwn.examUi", {});
    const localReveal = lsJson("jpwn.revealed", {});
    const localClassId = localStorage.getItem("jpwn.classId") || "";
    const cloudNewer = Number(snap.updatedAt || 0) >= localStamp(localInk);

    const classes = mergeClasses(localClasses, snap.classes);
    const ink = mergeInk(localInk, snap.ink);
    localStorage.setItem("jpwn.classes", JSON.stringify(classes));
    const preferId = cloudNewer ? (snap.classId || localClassId) : (localClassId || snap.classId);
    const classId = classes.some((c) => c.id === preferId) ? preferId : classes[0].id;
    localStorage.setItem("jpwn.classId", classId);
    localStorage.setItem("jpwn.inquiryWrites", JSON.stringify(mergeDict(localInquiry, snap.inquiry, cloudNewer)));
    localStorage.setItem("jpwn.labKit", JSON.stringify(mergeDict(localKit, snap.kit, cloudNewer)));
    localStorage.setItem("jpwn.examSets", JSON.stringify(mergeDict(localExamSets, snap.examSets, cloudNewer)));
    localStorage.setItem("jpwn.examUi", JSON.stringify(mergeDict(localExamUi, snap.examUi, cloudNewer)));
    localStorage.setItem("jpwn.revealed", JSON.stringify(mergeDict(localReveal, snap.reveal, cloudNewer)));

    await writeInkMap(db, ink);
    if (db) try { db.close(); } catch (err) { /* ignore */ }

    setCfg({ localUpdated: Math.max(Number(snap.updatedAt) || 0, localStamp(ink), Date.now()) });
    if (opts?.reload !== false) {
      window.dispatchEvent(new CustomEvent("jpwn-cloud-applied", { detail: { classId } }));
    }
  }

  async function gh(path, method, body) {
    const c = cfg();
    if (!c.token) throw new Error("尚未設定 GitHub Token");
    const res = await fetch(API + path, {
      method: method || "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + c.token,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      },
      body: body != null ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (err) { data = { message: text }; }
    if (!res.ok) {
      const msg = (data && (data.message || data.error)) || ("HTTP " + res.status);
      throw new Error(msg);
    }
    return data;
  }

  function parseGistContent(gist) {
    const file = gist?.files?.[GIST_FILE] || Object.values(gist?.files || {})[0];
    if (!file) throw new Error("Gist 裡沒有同步檔");
    const raw = file.content;
    if (!raw && file.raw_url) {
      return fetch(file.raw_url).then((r) => r.text()).then((t) => JSON.parse(t));
    }
    return Promise.resolve(JSON.parse(raw));
  }

  async function ensureGist(snapshot) {
    const c = cfg();
    const content = JSON.stringify(snapshot, null, 2);
    if (c.gistId) {
      await gh("/gists/" + c.gistId, "PATCH", {
        files: { [GIST_FILE]: { content } }
      });
      return c.gistId;
    }
    const created = await gh("/gists", "POST", {
      description: "JPWN 理化講義班級筆記同步（請設為 Secret，勿公開）",
      public: false,
      files: { [GIST_FILE]: { content } }
    });
    const id = created.id;
    setCfg({ gistId: id });
    return id;
  }

  async function pullOnly() {
    const c = cfg();
    if (!c.gistId) return null;
    const gist = await gh("/gists/" + c.gistId, "GET");
    return parseGistContent(gist);
  }

  async function pushNow() {
    const snap = await buildSnapshot();
    await ensureGist(snap);
    setCfg({ lastSync: Date.now(), lastError: "" });
    return snap;
  }

  async function pullNow() {
    const snap = await pullOnly();
    if (!snap) throw new Error("尚未建立 Gist，請先按「立即上傳」");
    await applySnapshot(snap, { reload: true });
    setCfg({ lastSync: Date.now(), lastError: "" });
    return snap;
  }

  async function syncNow(direction) {
    if (syncState.busy) return status();
    const c = cfg();
    if (!c.enabled) throw new Error("尚未啟用雲端同步");
    if (!c.token) throw new Error("請先貼上 GitHub Token");
    syncState.busy = true;
    syncState.phase = direction || "sync";
    emit();
    try {
      if (direction === "pull") {
        await pullNow();
      } else if (direction === "push") {
        await pushNow();
      } else {
        let cloud = null;
        try { cloud = await pullOnly(); } catch (err) { cloud = null; }
        if (cloud) await applySnapshot(cloud, { reload: true });
        await pushNow();
      }
      syncState.phase = "idle";
      return status();
    } catch (err) {
      setCfg({ lastError: err.message || String(err) });
      syncState.phase = "error";
      throw err;
    } finally {
      syncState.busy = false;
      emit();
    }
  }

  function scheduleSync(delayMs) {
    const c = cfg();
    if (!c.enabled || !c.token) return;
    clearTimeout(syncState.timer);
    syncState.timer = setTimeout(() => {
      syncNow("push").catch(() => { /* lastError 已寫入 */ });
    }, delayMs == null ? 2500 : delayMs);
  }

  async function bootPull() {
    const c = cfg();
    if (!c.enabled || !c.token || !c.gistId) return false;
    try {
      await syncNow("pull");
      return true;
    } catch (err) {
      return false;
    }
  }

  function bumpCloud() {
    markLocalDirty();
    scheduleSync(3000);
  }

  window.JPWNCloud = {
    cfg,
    setCfg,
    status,
    markLocalDirty,
    buildSnapshot,
    applySnapshot,
    syncNow,
    scheduleSync,
    bootPull,
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    bump: bumpCloud,
    LS
  };

  // 其他模組存檔後可呼叫 JPWNCloud.bump()
})();
