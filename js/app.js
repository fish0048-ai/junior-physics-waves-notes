(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const github = window.APP_CONFIG?.githubRepo || "#";
  $$("[data-github]").forEach((a) => {
    a.href = github;
  });

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

  function isCorrect(input) {
    const raw = input.dataset.answer || "";
    const alts = raw.split("|").map(normalize).filter(Boolean);
    const val = normalize(input.value);
    return alts.includes(val);
  }

  function answerOf(el) {
    return (el.dataset.answer || "").split("|")[0];
  }

  function revealOne(el, on) {
    el.classList.remove("correct", "wrong");
    if (on) {
      if (!el.classList.contains("revealed")) el.dataset.user = el.value;
      el.value = answerOf(el);
      el.classList.add("revealed");
      el.readOnly = true;
    } else {
      el.value = el.dataset.user || "";
      el.classList.remove("revealed");
      el.readOnly = false;
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
    let ok = 0;
    let total = 0;
    $$(".blank").forEach((el) => {
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
    const secId = document.body.dataset.section || "講義";
    const kind = document.body.dataset.page === "exam" || document.body.dataset.page === "review"
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
    el.title = "點一下顯示答案，再點一下可填寫";
    el.addEventListener("click", () => {
      revealOne(el, !el.classList.contains("revealed"));
    });
    el.addEventListener("input", () => {
      el.classList.remove("revealed", "correct", "wrong");
      el.readOnly = false;
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
