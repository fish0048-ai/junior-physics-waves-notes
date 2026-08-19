(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const github = window.APP_CONFIG?.githubRepo || "#";
  $$("[data-github]").forEach((a) => {
    a.href = github;
  });

  function freezeBlanks() {
    $$("input.blank").forEach((input) => {
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

  freezeBlanks();
  window.JPWNMath?.scheduleRender?.() || window.JPWNMath?.render?.();

  const LS_INQUIRY = "jpwn.inquiryWrites";
  const LS_REVEAL = "jpwn.revealed";

  function pageStoreKey() {
    const classId = localStorage.getItem("jpwn.classId") || "default";
    const sec = document.body.dataset.section || document.body.dataset.page || "page";
    return `${classId}::${sec}`;
  }

  function inquiryStoreKey() {
    return pageStoreKey();
  }

  function makeWriteBox({ key, label, placeholder, rows }) {
    const box = document.createElement("div");
    box.className = "inquiry-writebox" + (rows <= 2 ? " is-line" : "");
    const lab = document.createElement("label");
    lab.textContent = label;
    const area = document.createElement("textarea");
    area.className = "inquiry-write";
    area.dataset.inquiry = key;
    area.rows = rows;
    area.placeholder = placeholder;
    area.setAttribute("autocomplete", "off");
    box.append(lab, area);
    return box;
  }

  function setupInquiryWrites() {
    if (document.body.dataset.page !== "section") return;

    $$(".inquiry-lead").forEach((el) => {
      if (el.nextElementSibling?.classList.contains("inquiry-writebox")) return;
      el.after(makeWriteBox({
        key: "predict",
        label: "我的預測",
        placeholder: "先寫預測，再往下找證據。例如：我覺得……因為……",
        rows: 3
      }));
    });

    $$(".inquiry-ask").forEach((el, i) => {
      const t = el.textContent || "";
      if (t.includes("證據卡") || t.includes("檢驗主張")) return;
      if (el.nextElementSibling?.classList.contains("inquiry-writebox")) return;
      el.after(makeWriteBox({
        key: "ask-" + i,
        label: "這一站我先寫",
        placeholder: "先寫你的想法，再對照下面的定義與圖。",
        rows: 2
      }));
    });

    $$(".inquiry-claim").forEach((card) => {
      if (card.querySelector("[data-inquiry='claim']")) return;
      const official = [...card.children].find((el) => el.tagName === "P" && !el.classList.contains("inquiry-next"));
      const box = makeWriteBox({
        key: "claim",
        label: "我的主張",
        placeholder: "讀完證據後，用自己的話回答本節問題。",
        rows: 4
      });
      const hint = document.createElement("p");
      hint.className = "inquiry-ref-hint no-print";
      hint.textContent = "寫完後可按「顯示答案」，對照下面的參考主張。";
      if (official) {
        official.classList.add("inquiry-ref");
        official.setAttribute("data-reveal", "");
        official.hidden = true;
        official.before(box);
        box.after(hint);
      } else {
        card.append(box, hint);
      }
    });

    loadInquiryWrites();
    $$(".inquiry-write").forEach((el) => {
      el.addEventListener("input", saveInquiryWrites);
    });
    window.addEventListener("pagehide", saveInquiryWrites);
  }

  function loadInquiryWrites() {
    let bag = {};
    try {
      const all = JSON.parse(localStorage.getItem(LS_INQUIRY) || "{}");
      bag = all[inquiryStoreKey()] || {};
    } catch (err) {
      bag = {};
    }
    $$(".inquiry-write").forEach((el) => {
      const k = el.dataset.inquiry;
      el.value = (k && bag[k] != null) ? bag[k] : "";
    });
  }

  function saveInquiryWrites() {
    const bag = {};
    $$(".inquiry-write").forEach((el) => {
      if (el.dataset.inquiry) bag[el.dataset.inquiry] = el.value;
    });
    let all = {};
    try {
      all = JSON.parse(localStorage.getItem(LS_INQUIRY) || "{}");
    } catch (err) {
      all = {};
    }
    all[inquiryStoreKey()] = bag;
    localStorage.setItem(LS_INQUIRY, JSON.stringify(all));
  }

  setupInquiryWrites();
  window.addEventListener("jpwn-class-will-change", saveInquiryWrites);
  window.addEventListener("jpwn-class-change", loadInquiryWrites);

  const LS_KIT = "jpwn.labKit";

  function kitFields() {
    return $$(".lab-kit [data-kit]");
  }

  function loadLabKit() {
    let bag = {};
    try {
      const all = JSON.parse(localStorage.getItem(LS_KIT) || "{}");
      bag = all[pageStoreKey()] || {};
    } catch (err) {
      bag = {};
    }
    kitFields().forEach((el) => {
      const k = el.dataset.kit;
      if (!k) return;
      if (el.type === "checkbox") el.checked = !!bag[k];
      else el.value = bag[k] != null ? bag[k] : "";
    });
  }

  function saveLabKit() {
    const bag = {};
    kitFields().forEach((el) => {
      if (!el.dataset.kit) return;
      bag[el.dataset.kit] = el.type === "checkbox" ? el.checked : el.value;
    });
    let all = {};
    try {
      all = JSON.parse(localStorage.getItem(LS_KIT) || "{}");
    } catch (err) {
      all = {};
    }
    all[pageStoreKey()] = bag;
    localStorage.setItem(LS_KIT, JSON.stringify(all));
  }

  function setupLabKit() {
    if (!kitFields().length) return;
    loadLabKit();
    kitFields().forEach((el) => {
      el.addEventListener(el.type === "checkbox" ? "change" : "input", saveLabKit);
    });
    window.addEventListener("pagehide", saveLabKit);
    window.addEventListener("jpwn-class-will-change", saveLabKit);
    window.addEventListener("jpwn-class-change", loadLabKit);
  }

  setupLabKit();

  function normalize(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[（）]/g, (ch) => (ch === "（" ? "(" : ")"))
      .replace(/赫茲/g, "hz")
      .replace(/赫/g, "hz")
      .replace(/秒/g, "s")
      .replace(/公分/g, "cm")
      .replace(/×/g, "*")
      .replace(/＝/g, "=")
      .replace(/／/g, "/");
  }

  function isCorrect(el) {
    const raw = el.dataset.answer || "";
    const alts = raw.split("|").map(normalize).filter(Boolean);
    const val = normalize(el.tagName === "INPUT" ? el.value : el.textContent);
    return alts.includes(val);
  }

  function answerOf(el) {
    return (el.dataset.answer || "").split("|")[0];
  }

  function revealOne(el, on) {
    el.classList.remove("correct", "wrong");
    if (on) {
      el.textContent = answerOf(el);
      el.classList.add("revealed");
    } else {
      el.textContent = "";
      el.classList.remove("revealed");
    }
  }

  function collectRevealState() {
    return {
      blanks: $$(".blank").map((el) => el.classList.contains("revealed")),
      extras: $$("[data-reveal]").map((el) => !el.hidden)
    };
  }

  function answersAllOn() {
    const blanks = $$(".blank");
    const extras = $$("[data-reveal]");
    if (!blanks.length && !extras.length) return false;
    return blanks.every((el) => el.classList.contains("revealed"))
      && extras.every((el) => !el.hidden);
  }

  function syncAnswerButton() {
    const on = answersAllOn();
    const btn = $("#btn-answers");
    if (!btn) return;
    btn.textContent = on ? "隱藏答案" : "顯示答案";
    btn.setAttribute("data-on", on ? "1" : "0");
  }

  function applyRevealState(bag) {
    if (!bag) return;
    const blanks = $$(".blank");
    if (Array.isArray(bag.blanks)) {
      blanks.forEach((el, i) => revealOne(el, !!bag.blanks[i]));
    }
    const extras = $$("[data-reveal]");
    if (Array.isArray(bag.extras)) {
      extras.forEach((el, i) => {
        el.hidden = !bag.extras[i];
      });
    }
    syncAnswerButton();
  }

  function saveRevealState() {
    if (window.NotesApp?.persistPaused) return;
    if (!$$(".blank").length && !$$("[data-reveal]").length) return;
    let all = {};
    try {
      all = JSON.parse(localStorage.getItem(LS_REVEAL) || "{}");
    } catch (err) {
      all = {};
    }
    all[pageStoreKey()] = collectRevealState();
    localStorage.setItem(LS_REVEAL, JSON.stringify(all));
  }

  function loadRevealState() {
    let bag = null;
    try {
      const all = JSON.parse(localStorage.getItem(LS_REVEAL) || "{}");
      bag = all[pageStoreKey()] || null;
    } catch (err) {
      bag = null;
    }
    applyRevealState(bag);
  }

  function reveal(on) {
    $$(".blank").forEach((el) => revealOne(el, on));
    $$("[data-reveal]").forEach((el) => {
      el.hidden = !on;
    });
    syncAnswerButton();
    saveRevealState();
  }

  function check() {
    if ($$("input.blank").length) {
      let ok = 0;
      let total = 0;
      $$("input.blank").forEach((el) => {
        total += 1;
        el.classList.remove("correct", "wrong", "revealed");
        el.readOnly = false;
        if (isCorrect(el)) {
          el.classList.add("correct");
          ok += 1;
        } else {
          el.classList.add("wrong");
        }
      });
      toast(`已檢查：${ok} / ${total} 題空格正確`);
      return;
    }
    toast("挖空無需輸入，請按「顯示答案」");
  }

  function toast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.style.display = "block";
    clearTimeout(toast._id);
    toast._id = setTimeout(() => {
      t.style.display = "none";
    }, 2600);
  }

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function printPdf(withAnswers) {
    const snap = collectRevealState();
    const oldTitle = document.title;
    window.NotesApp.persistPaused = true;
    if (withAnswers) {
      $$(".blank").forEach((el) => revealOne(el, true));
      $$("[data-reveal]").forEach((el) => { el.hidden = false; });
      syncAnswerButton();
    }
    const pageType = document.body.dataset.page || "";
    const chId = window.APP_CONFIG?.chapter?.id || "";
    const secId = pageType === "cover"
      ? "封面"
      : pageType === "book"
      ? "整本"
      : pageType === "home"
      ? `第${chId}章`
      : (document.body.dataset.section || "講義");
    const kind = pageType === "cover"
      ? "講義封面"
      : pageType === "book"
      ? "講義"
      : pageType === "home"
      ? "目錄"
      : pageType === "exam" || pageType === "review"
      ? "段考練習"
      : "講義";
    document.title = withAnswers
      ? `國中理化_${secId}_${kind}_含答案`
      : `國中理化_${secId}_${kind}`;
    toast("請將印表機選成「另存為 PDF」或 Microsoft Print to PDF");
    const restoreScale = window.NotesLayout?.resetFontScaleForPrint?.();
    document.body.classList.add("is-printing");
    document.body.classList.toggle("is-print-answers", !!withAnswers);
    let restored = false;
    function restore() {
      if (restored) return;
      restored = true;
      document.title = oldTitle;
      applyRevealState(snap);
      if (typeof restoreScale === "function") restoreScale();
      document.body.classList.remove("is-printing", "is-print-answers");
      window.dispatchEvent(new Event("jpwn-after-print"));
      window.NotesApp.persistPaused = false;
    }
    window.addEventListener("afterprint", restore, { once: true });
    await delay(350);
    window.print();
    window.setTimeout(restore, 60000);
  }

  $$("svg.diagram").forEach((svg) => {
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  });

  $$(".blank").forEach((el) => {
    el.title = "點一下顯示答案，再點一下隱藏";
    el.addEventListener("click", (e) => {
      if (document.body.classList.contains("ink-draw")) return;
      e.preventDefault();
      revealOne(el, !el.classList.contains("revealed"));
      syncAnswerButton();
      saveRevealState();
    });
  });

  $("#btn-answers")?.addEventListener("click", () => {
    const on = $("#btn-answers").getAttribute("data-on") === "1";
    (window.NotesApp?.reveal || reveal)(!on);
  });
  $("#btn-check")?.addEventListener("click", () => {
    (window.NotesApp?.check || check)();
  });
  $("#btn-pdf")?.addEventListener("click", () => {
    (window.NotesApp?.printPdf || printPdf)(false);
  });
  $("#btn-pdf-key")?.addEventListener("click", () => {
    (window.NotesApp?.printPdf || printPdf)(true);
  });

  loadRevealState();
  window.addEventListener("pagehide", saveRevealState);
  window.addEventListener("jpwn-class-will-change", saveRevealState);
  window.addEventListener("jpwn-class-change", loadRevealState);

  window.NotesApp = { reveal, check, normalize, toast, printPdf, persistPaused: false };
})();
