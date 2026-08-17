(function () {
  const host = document.getElementById("exam-list");
  if (!host) return;

  const secId = document.body.dataset.section || "";
  const items = window.EXAM_BANK?.[secId] || [];
  const letters = ["A", "B", "C", "D"];
  let revealed = false;

  function toast(msg) {
    if (window.NotesApp?.toast) window.NotesApp.toast(msg);
  }

  function render() {
    if (!items.length) {
      host.innerHTML = `<p class="note">本題庫尚未匯入。請提供段考題後再更新。</p>`;
      return;
    }
    host.innerHTML = items
      .map((item, i) => {
        const choices = (item.choices || []).slice(0, 4);
        return `
          <section class="exam-q" data-i="${i}" data-ans="${item.ans}">
            <p class="exam-stem"><strong>${i + 1}.</strong> ${item.q}</p>
            <div class="exam-choices" role="radiogroup" aria-label="第 ${i + 1} 題">
              ${choices
                .map(
                  (c, k) => `
                <button type="button" class="exam-choice" data-k="${k}" role="radio" aria-checked="false">
                  <span class="exam-letter">${letters[k]}</span>
                  <span>${c}</span>
                </button>`
                )
                .join("")}
            </div>
            <p class="exam-explain" hidden>${item.explain || ""}</p>
          </section>`;
      })
      .join("");

    host.querySelectorAll(".exam-choice").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (revealed) return;
        const box = btn.closest(".exam-q");
        box.querySelectorAll(".exam-choice").forEach((el) => {
          el.classList.remove("is-on");
          el.setAttribute("aria-checked", "false");
        });
        btn.classList.add("is-on");
        btn.setAttribute("aria-checked", "true");
        box.classList.remove("is-right", "is-wrong");
      });
    });
  }

  function clearMarks() {
    host.querySelectorAll(".exam-q").forEach((box) => {
      box.classList.remove("is-right", "is-wrong");
      box.querySelectorAll(".exam-choice").forEach((el) => {
        el.classList.remove("is-key", "is-miss");
      });
      const exp = box.querySelector(".exam-explain");
      if (exp) exp.hidden = true;
    });
  }

  function grade(showExplain) {
    if (!items.length) return;
    let ok = 0;
    host.querySelectorAll(".exam-q").forEach((box) => {
      const ans = Number(box.dataset.ans);
      const picked = box.querySelector(".exam-choice.is-on");
      const pick = picked ? Number(picked.dataset.k) : -1;
      box.querySelectorAll(".exam-choice").forEach((el) => {
        el.classList.remove("is-key", "is-miss");
        if (Number(el.dataset.k) === ans) el.classList.add("is-key");
      });
      if (pick === ans) {
        box.classList.add("is-right");
        box.classList.remove("is-wrong");
        ok += 1;
      } else {
        box.classList.add("is-wrong");
        box.classList.remove("is-right");
        if (picked) picked.classList.add("is-miss");
      }
      const exp = box.querySelector(".exam-explain");
      if (exp) exp.hidden = !showExplain;
    });
    const score = document.getElementById("exam-score");
    if (score) score.textContent = `得分 ${ok} / ${items.length}`;
    toast(`段考練習：${ok} / ${items.length} 題正確`);
    return ok;
  }

  function setReveal(on) {
    revealed = on;
    const btn = document.getElementById("exam-key");
    if (on) {
      grade(true);
      if (btn) btn.textContent = "隱藏詳解";
    } else {
      host.querySelectorAll(".exam-explain").forEach((el) => {
        el.hidden = true;
      });
      if (btn) btn.textContent = "顯示詳解";
    }
  }

  function reset() {
    revealed = false;
    host.querySelectorAll(".exam-choice").forEach((el) => {
      el.classList.remove("is-on", "is-key", "is-miss");
      el.setAttribute("aria-checked", "false");
    });
    clearMarks();
    const score = document.getElementById("exam-score");
    if (score) score.textContent = "";
    const btn = document.getElementById("exam-key");
    if (btn) btn.textContent = "顯示詳解";
    toast("已重設段考練習");
  }

  render();
  const n = document.getElementById("exam-count");
  if (n) n.textContent = String(items.length);

  document.getElementById("exam-check")?.addEventListener("click", () => {
    revealed = true;
    grade(true);
    const btn = document.getElementById("exam-key");
    if (btn) btn.textContent = "隱藏詳解";
  });
  document.getElementById("exam-key")?.addEventListener("click", () => {
    setReveal(!revealed);
  });
  document.getElementById("exam-reset")?.addEventListener("click", reset);

  if (window.NotesApp) {
    const origReveal = window.NotesApp.reveal;
    const origPrint = window.NotesApp.printPdf;
    const origCheck = window.NotesApp.check;
    window.NotesApp.reveal = function (on) {
      origReveal(on);
      setReveal(on);
    };
    window.NotesApp.check = function () {
      if (document.querySelector(".blank")) origCheck();
      if (items.length) {
        revealed = true;
        grade(true);
        const btn = document.getElementById("exam-key");
        if (btn) btn.textContent = "隱藏詳解";
      }
    };
    window.NotesApp.printPdf = function (withAnswers) {
      setReveal(!!withAnswers);
      origPrint(withAnswers);
    };
  }
})();
