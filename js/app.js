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
      input.replaceWith(span);
    });
  }

  freezeBlanks();

  const LS_INQUIRY = "jpwn.inquiryWrites";

  function inquiryStoreKey() {
    const classId = localStorage.getItem("jpwn.classId") || "default";
    const sec = document.body.dataset.section || document.body.dataset.page || "page";
    return `${classId}::${sec}`;
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

  function reveal(on) {
    $$(".blank").forEach((el) => revealOne(el, on));
    $$("[data-reveal]").forEach((el) => {
      el.hidden = !on;
    });
    const btn = $("#btn-answers");
    if (btn) btn.textContent = on ? "隱藏答案" : "顯示答案";
    btn?.setAttribute("data-on", on ? "1" : "0");
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

  function printPdf(withAnswers) {
    const wasOn = $("#btn-answers")?.getAttribute("data-on") === "1";
    const oldTitle = document.title;
    if (withAnswers) reveal(true);
    const pageType = document.body.dataset.page || "";
    const chId = window.APP_CONFIG?.chapter?.id || "";
    const secId = pageType === "cover"
      ? "封面"
      : pageType === "home"
      ? `第${chId}章`
      : (document.body.dataset.section || "講義");
    const kind = pageType === "cover"
      ? "講義封面"
      : pageType === "home"
      ? "目錄"
      : pageType === "exam" || pageType === "review"
      ? "段考練習"
      : "講義";
    document.title = withAnswers
      ? `國中理化_${secId}_${kind}_含答案`
      : `國中理化_${secId}_${kind}`;
    toast("請將印表機選成「另存為 PDF」或 Microsoft Print to PDF");
    setTimeout(() => {
      window.print();
      document.title = oldTitle;
      if (withAnswers && !wasOn) reveal(false);
    }, 350);
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

  window.NotesApp = { reveal, check, normalize, toast, printPdf };
})();
