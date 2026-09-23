(function () {
  const data = window.RECAP_DATA;
  const listHost = document.getElementById("recap-list");
  const keyHost = document.getElementById("recap-key-list");
  if (!data || !Array.isArray(data.questions) || !listHost || !keyHost) return;

  const letters = ["A", "B", "C", "D"];
  let revealed = false;

  function toast(msg) {
    if (window.NotesApp?.toast) window.NotesApp.toast(msg);
  }

  function mathText(s) {
    const polish = window.JPWNMath && typeof window.JPWNMath.polish === "function"
      ? window.JPWNMath.polish
      : (t) => t;
    return polish(String(s || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/[ \t\u00a0]+/g, " ")
      .trim());
  }

  function answerIndex(q) {
    if (typeof q.answer === "number") return q.answer;
    const letter = String(q.answer || "").trim().toUpperCase();
    const idx = letters.indexOf(letter);
    return idx >= 0 ? idx : 0;
  }

  function renderQuestion(q, i) {
    const num = i + 1;
    const choices = (q.choices || []).slice(0, 4);
    const choiceHtml = choices.map((c, ci) => `
      <label class="exam-choice">
        <input type="radio" name="recap-q${num}" value="${ci}" class="no-print">
        <span class="exam-letter">${letters[ci]}</span>
        <span class="exam-choice-text">${mathText(c)}</span>
      </label>
    `).join("");
    const sec = q.section ? `<span class="recap-sec">${q.section}</span>` : "";
    return `
      <div class="exam-q recap-q" data-q="${num}" data-answer="${answerIndex(q)}">
        <div class="exam-stem"><strong>${num}.</strong> ${sec}${mathText(q.q)}</div>
        <div class="exam-choices">${choiceHtml}</div>
      </div>
    `;
  }

  function renderKeyRow(q, i) {
    const num = i + 1;
    const ans = letters[answerIndex(q)] || "?";
    return `
      <div class="recap-key-row">
        <div class="recap-key-head"><strong>${num}.</strong> 答案：<span class="recap-ans">${ans}</span></div>
        <div class="recap-key-explain">${mathText(q.explain || "")}</div>
      </div>
    `;
  }

  function renderAll() {
    const qs = data.questions.slice(0, 20);
    listHost.innerHTML = qs.map(renderQuestion).join("");
    keyHost.innerHTML = qs.map(renderKeyRow).join("");
    const countEl = document.getElementById("recap-count");
    if (countEl) countEl.textContent = String(qs.length);
    window.JPWNMath?.render?.();
  }

  function checkAnswers() {
    let ok = 0;
    let total = 0;
    listHost.querySelectorAll(".recap-q").forEach((row) => {
      const num = row.dataset.q;
      const correct = parseInt(row.dataset.answer, 10);
      const picked = row.querySelector(`input[name="recap-q${num}"]:checked`);
      row.classList.remove("is-right", "is-wrong");
      if (!picked) return;
      total += 1;
      const val = parseInt(picked.value, 10);
      if (val === correct) {
        ok += 1;
        row.classList.add("is-right");
      } else {
        row.classList.add("is-wrong");
      }
    });
    const scoreEl = document.getElementById("recap-score");
    if (scoreEl) {
      scoreEl.textContent = total ? `答對 ${ok}／${total} 題` : "請先選答案";
    }
    toast(total ? `答對 ${ok}／${total} 題` : "請先選答案再檢查");
  }

  function toggleKey(on) {
    revealed = !!on;
    document.body.classList.toggle("recap-key-visible", revealed);
    const btn = document.getElementById("recap-key-btn");
    if (btn) btn.textContent = revealed ? "隱藏詳解" : "顯示詳解";
  }

  function resetAnswers() {
    listHost.querySelectorAll('input[type="radio"]').forEach((el) => {
      el.checked = false;
    });
    listHost.querySelectorAll(".recap-q").forEach((row) => {
      row.classList.remove("is-right", "is-wrong");
    });
    const scoreEl = document.getElementById("recap-score");
    if (scoreEl) scoreEl.textContent = "";
    toggleKey(false);
  }

  document.getElementById("recap-check")?.addEventListener("click", checkAnswers);
  document.getElementById("recap-key-btn")?.addEventListener("click", () => toggleKey(!revealed));
  document.getElementById("recap-reset")?.addEventListener("click", resetAnswers);

  window.addEventListener("beforeprint", () => toggleKey(true));
  window.addEventListener("jpwn-after-print", () => toggleKey(false));

  renderAll();
})();
