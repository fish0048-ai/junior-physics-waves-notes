/**
 * 實驗學習單：拍照／上傳圖檔，壓縮後存本機 localStorage。
 * 標記：.sheet-photo[data-photo-id] 內含 .sheet-photo-preview、input[type=file]、.sheet-photo-clear
 */
(function () {
  const LS_KEY = "jpwn.sheetPhotos";
  const MAX_EDGE = 960;
  const JPEG_QUALITY = 0.72;

  function storageRoot() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || "{}") || {};
    } catch (err) {
      return {};
    }
  }

  function saveRoot(all) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(all));
    } catch (err) {
      window.alert("照片儲存失敗（空間可能不足）。請改拍較小張或清除其他照片後再試。");
    }
  }

  function pageKey() {
    const body = document.body;
    const section = body?.getAttribute("data-section") || "sheet";
    return section;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("read failed"));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image load failed"));
      img.src = src;
    });
  }

  async function compressDataUrl(dataUrl) {
    const img = await loadImage(dataUrl);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return dataUrl;
    const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, cw, ch);
    try {
      return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    } catch (err) {
      return dataUrl;
    }
  }

  function setPreview(slot, dataUrl) {
    const img = slot.querySelector(".sheet-photo-preview");
    const placeholder = slot.querySelector(".sheet-photo-placeholder");
    const clearBtn = slot.querySelector(".sheet-photo-clear");
    if (!img) return;
    if (dataUrl) {
      img.src = dataUrl;
      img.hidden = false;
      if (placeholder) placeholder.hidden = true;
      slot.classList.add("has-photo");
      if (clearBtn) clearBtn.disabled = false;
    } else {
      img.removeAttribute("src");
      img.hidden = true;
      if (placeholder) placeholder.hidden = false;
      slot.classList.remove("has-photo");
      if (clearBtn) clearBtn.disabled = true;
    }
  }

  function persist(id, dataUrl) {
    const all = storageRoot();
    const page = pageKey();
    if (!all[page]) all[page] = {};
    if (dataUrl) all[page][id] = dataUrl;
    else delete all[page][id];
    if (all[page] && Object.keys(all[page]).length === 0) delete all[page];
    saveRoot(all);
  }

  async function onFileChange(slot, input) {
    const file = input.files && input.files[0];
    input.value = "";
    if (!file) return;
    if (!/^image\//i.test(file.type || "")) {
      window.alert("請選擇圖片檔。");
      return;
    }
    const id = slot.getAttribute("data-photo-id");
    if (!id) return;
    try {
      const raw = await readFileAsDataUrl(file);
      const compact = await compressDataUrl(raw);
      setPreview(slot, compact);
      persist(id, compact);
    } catch (err) {
      window.alert("讀取照片失敗，請再試一次。");
    }
  }

  function restoreAll() {
    const all = storageRoot();
    const page = all[pageKey()] || {};
    document.querySelectorAll(".sheet-photo[data-photo-id]").forEach((slot) => {
      const id = slot.getAttribute("data-photo-id");
      if (!id) return;
      setPreview(slot, page[id] || "");
    });
  }

  function bindSlot(slot) {
    const input = slot.querySelector('input[type="file"]');
    const clearBtn = slot.querySelector(".sheet-photo-clear");
    if (input) {
      input.addEventListener("change", () => {
        onFileChange(slot, input);
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        const id = slot.getAttribute("data-photo-id");
        if (!id) return;
        setPreview(slot, "");
        persist(id, "");
      });
    }
  }

  function init() {
    document.querySelectorAll(".sheet-photo[data-photo-id]").forEach(bindSlot);
    restoreAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
