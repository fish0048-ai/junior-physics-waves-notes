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

  function reveal(on) {
    $$(".blank").forEach((el) => {
      el.classList.remove("correct", "wrong");
      if (on) {
        el.dataset.user = el.value;
        el.value = (el.dataset.answer || "").split("|")[0];
        el.classList.add("revealed");
        el.readOnly = true;
      } else {
        el.value = el.dataset.user || "";
        el.classList.remove("revealed");
        el.readOnly = false;
      }
    });
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
    }, 2200);
  }

  $("#btn-answers")?.addEventListener("click", () => {
    const on = $("#btn-answers").getAttribute("data-on") === "1";
    reveal(!on);
  });
  $("#btn-check")?.addEventListener("click", check);
  $("#btn-print")?.addEventListener("click", () => window.print());

  window.NotesApp = { reveal, check, normalize, toast };
})();
