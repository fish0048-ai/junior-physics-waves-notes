(function () {
  const LS = "jpwn.bookPrefetch";
  const CH = "jpwn-book";

  function siteUrl(path) {
    const href = String(path || "");
    if (/^https?:/i.test(href)) return href;
    const root = (document.body?.dataset?.root || ".").replace(/\/$/, "") || ".";
    const rel = root === "." ? href : root + "/" + href.replace(/^\.\//, "");
    return new URL(rel, location.href).href;
  }

  function readProgress() {
    try {
      return JSON.parse(localStorage.getItem(LS) || "null") || { status: "idle", done: 0, total: 0 };
    } catch (err) {
      return { status: "idle", done: 0, total: 0 };
    }
  }

  function writeProgress(data) {
    const next = Object.assign({ status: "idle", done: 0, total: 0, labs: false }, data, { t: Date.now() });
    try {
      localStorage.setItem(LS, JSON.stringify(next));
    } catch (err) {
      /* ignore */
    }
    try {
      new BroadcastChannel(CH).postMessage(next);
    } catch (err) {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent("jpwn-book-progress", { detail: next }));
    return next;
  }

  function subscribe(fn) {
    fn(readProgress());
    window.addEventListener("jpwn-book-progress", (e) => fn(e.detail || readProgress()));
    window.addEventListener("storage", (e) => {
      if (e.key === LS) fn(readProgress());
    });
    try {
      const bc = new BroadcastChannel(CH);
      bc.onmessage = (e) => fn(e.data || readProgress());
    } catch (err) {
      /* ignore */
    }
  }

  async function clearBroken() {
    if (navigator.serviceWorker) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
      } catch (err) {
        /* ignore */
      }
    }
    if (window.caches) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k.indexOf("jpwn-book") === 0).map((k) => caches.delete(k)));
      } catch (err) {
        /* ignore */
      }
    }
    return false;
  }

  function loaderFrame() {
    let frame = document.getElementById("book-loader");
    if (frame) return frame;
    frame = document.createElement("iframe");
    frame.id = "book-loader";
    frame.className = "book-loader no-print";
    frame.title = "講義載入";
    frame.setAttribute("sandbox", "allow-same-origin");
    document.body.appendChild(frame);
    return frame;
  }

  function iframeHtml(href) {
    return new Promise((resolve, reject) => {
      const frame = loaderFrame();
      let settled = false;
      const timer = window.setTimeout(() => finish(new Error("載入逾時")), 25000);

      function finish(err, html) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        frame.onload = null;
        frame.onerror = null;
        if (err) reject(err);
        else resolve(html);
      }

      frame.onload = () => {
        window.setTimeout(() => {
          try {
            const doc = frame.contentDocument;
            if (!doc || !doc.documentElement) {
              finish(new Error("無法讀取頁面"));
              return;
            }
            const html = doc.documentElement.outerHTML || "";
            if (html.length < 40) finish(new Error("頁面是空的"));
            else finish(null, html);
          } catch (err) {
            finish(err);
          }
        }, 30);
      };
      frame.onerror = () => finish(new Error("iframe 載入失敗"));
      if (frame.getAttribute("src") === href) frame.src = "about:blank";
      window.setTimeout(() => {
        frame.src = href;
      }, 0);
    });
  }

  function xhrText(href) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", href);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const text = xhr.responseText || "";
          if (text.length < 40) reject(new Error(href + "（空的）"));
          else resolve(text);
        } else {
          reject(new Error(href + "（HTTP " + xhr.status + "）"));
        }
      };
      xhr.onerror = () => reject(new Error("XHR 失敗"));
      xhr.send();
    });
  }

  async function fetchText(href) {
    const res = await fetch(href);
    if (!res.ok) throw new Error(href + "（HTTP " + res.status + "）");
    const text = await res.text();
    if (!text || text.length < 40) throw new Error(href + "（空的）");
    return text;
  }

  function iframeHtmlLoose(href) {
    return new Promise((resolve, reject) => {
      const frame = document.createElement("iframe");
      frame.className = "book-loader no-print";
      frame.title = "講義載入";
      document.body.appendChild(frame);
      let settled = false;
      const timer = window.setTimeout(() => finish(new Error("載入逾時")), 25000);

      function finish(err, html) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        frame.onload = null;
        frame.onerror = null;
        frame.remove();
        if (err) reject(err);
        else resolve(html);
      }

      frame.onload = () => {
        try {
          const doc = frame.contentDocument;
          const html = doc && doc.documentElement ? doc.documentElement.outerHTML : "";
          if (html.length < 40) finish(new Error("頁面是空的"));
          else finish(null, html);
        } catch (err) {
          finish(err);
        }
      };
      frame.onerror = () => finish(new Error("iframe 載入失敗"));
      frame.src = href;
    });
  }

  async function getHtml(fileOrUrl) {
    const href = siteUrl(fileOrUrl);
    const errors = [];
    try {
      return await iframeHtml(href);
    } catch (err) {
      errors.push("iframe：" + (err && err.message ? err.message : err));
    }
    try {
      return await iframeHtmlLoose(href);
    } catch (err) {
      errors.push("頁面：" + (err && err.message ? err.message : err));
    }
    try {
      return await xhrText(href);
    } catch (err) {
      errors.push("XHR：" + (err && err.message ? err.message : err));
    }
    try {
      return await fetchText(href);
    } catch (err) {
      errors.push("fetch：" + (err && err.message ? err.message : err));
    }
    throw new Error(errors.join("；") || "載入失敗");
  }

  window.JPWNBookCache = {
    siteUrl,
    readProgress,
    writeProgress,
    subscribe,
    getHtml,
    clearBroken
  };
})();
