import { feedbackHtml, mountLabShell } from "./lab-shell.js?v=9";
import { addMistake, markCompleted, removeMistake } from "../progress.js?v=9";
import { sfx } from "../sfx.js?v=9";

const LETTERS = ["A", "B", "C", "D"];

/**
 * opts: { title, lead, load, passAt, taskId, clearOnCorrect, links, emptyText, onFinish }
 * passAt 為 null 時只記分、不點亮星星
 */
export function mountQuiz(root, opts, handlers) {
  const shell = mountLabShell(root, { title: opts.title, lead: opts.lead, onClose: handlers.onClose });
  const state = { list: [], i: 0, score: 0, wrong: [], locked: false };

  const linksHtml = () =>
    (opts.links || []).length
      ? `<div class="quiz-links">${opts.links.map((l) => `<a class="isl-btn" href="${l.href}">${l.label}</a>`).join("")}</div>`
      : "";

  async function start() {
    shell.content.innerHTML = '<p class="quiz-loading"><span class="quiz-spinner" aria-hidden="true"></span>正在從題庫抽題…</p>';
    try {
      state.list = await opts.load();
    } catch {
      shell.content.innerHTML = feedbackHtml("warn", "題庫暫時載入不了。請稍後再試，或改到段考前練習頁作答。") + linksHtml();
      return;
    }
    if (!state.list.length) {
      shell.content.innerHTML = `<p class="quiz-empty">${opts.emptyText || "目前沒有可以練習的題目。"}</p>${linksHtml()}`;
      return;
    }
    Object.assign(state, { i: 0, score: 0, wrong: [] });
    renderQuestion();
  }

  function dots() {
    return state.list
      .map((q, k) => {
        if (k === state.i) return '<span class="is-now"></span>';
        if (k > state.i) return "<span></span>";
        return `<span class="${state.wrong.some((w) => w.key === q.key) ? "is-wrong" : "is-ok"}"></span>`;
      })
      .join("");
  }

  function renderQuestion() {
    const q = state.list[state.i];
    state.locked = false;
    shell.content.innerHTML = `
      <div class="quiz-top">
        <span class="quiz-count">第 ${state.i + 1}／${state.list.length} 題</span>
        <div class="quiz-dots" aria-hidden="true">${dots()}</div>
        <span class="quiz-score">答對 ${state.score}</span>
      </div>
      <p class="quiz-source">題庫 ${q.section}</p>
      <p class="quiz-q">${q.q}</p>
      <div class="quiz-choices" role="group" aria-label="選項">
        ${q.choices
          .map(
            (c, k) =>
              `<button type="button" class="quiz-choice" data-choice="${k}"><span class="quiz-letter">${LETTERS[k]}</span><span class="quiz-text">${c}</span></button>`
          )
          .join("")}
      </div>
      <div class="quiz-feedback" aria-live="polite"></div>
      <button type="button" class="isl-btn is-primary quiz-next" hidden>${state.i + 1 < state.list.length ? "下一題" : "看結果"}</button>`;
  }

  function answer(k) {
    state.locked = true;
    const q = state.list[state.i];
    const ok = k === q.ans;
    shell.content.querySelectorAll("[data-choice]").forEach((btn) => {
      const idx = Number(btn.dataset.choice);
      btn.disabled = true;
      if (idx === q.ans) btn.classList.add("is-correct");
      else if (idx === k) btn.classList.add("is-wrong");
    });
    if (ok) {
      state.score += 1;
      if (opts.clearOnCorrect) removeMistake(q.section, q.index);
      sfx.play("tap");
    } else {
      state.wrong.push(q);
      addMistake(q.section, q.index);
    }
    const explain = q.explain ? ` ${q.explain}` : "";
    shell.content.querySelector(".quiz-feedback").innerHTML = ok
      ? `<p class="lab-feedback"><span class="atom-ok"><b>答對了！</b>${explain}</span></p>`
      : `<p class="lab-feedback"><span class="atom-warn"><b>正確答案是（${q.letter}）。</b>${explain || ` 這題已收進錯題本，可回講義 ${q.section} 對照。`}</span></p>`;
    shell.content.querySelector(".quiz-score").textContent = `答對 ${state.score}`;
    const next = shell.content.querySelector(".quiz-next");
    next.hidden = false;
    next.focus();
    handlers.onAnswer?.(ok);
  }

  function finish() {
    const total = state.list.length;
    const pass = opts.passAt != null && state.score >= opts.passAt;
    if (pass && opts.taskId) markCompleted(opts.taskId);
    opts.onFinish?.(state.score, total);
    const headline = pass
      ? "挑戰成功！"
      : opts.passAt != null
        ? `再答對 ${opts.passAt - state.score} 題就過關`
        : state.score === total
          ? "全部答對！"
          : "完成作答";
    shell.content.innerHTML = `
      <div class="quiz-result ${pass ? "is-pass" : ""}">
        <div class="quiz-ring" role="img" aria-label="答對 ${state.score} 題，共 ${total} 題" style="--p:${Math.round((state.score / total) * 100)}"><b aria-hidden="true">${state.score}</b><span aria-hidden="true">／${total}</span></div>
        <h3>${headline}</h3>
        <p>${pass ? "已點亮這一關的星星。" : opts.passAt != null ? `答對 ${opts.passAt} 題以上就能點亮星星，可以再挑戰一次（會重新抽題）。` : "成績已記錄。"}</p>
      </div>
      ${
        state.wrong.length
          ? `<section class="quiz-review"><h3>這次答錯的題目（已收進錯題本）</h3><ol>${state.wrong
              .map((q) => `<li><span>${q.q}</span><b>答案（${q.letter}）${q.choices[q.ans]}</b></li>`)
              .join("")}</ol></section>`
          : ""
      }
      <div class="quiz-actions">
        <button type="button" class="isl-btn ${pass ? "" : "is-primary"}" data-quiz="retry">再挑戰一次</button>
        ${state.wrong.length ? '<button type="button" class="isl-btn is-ghost" data-quiz="mistakes">打開錯題本</button>' : ""}
      </div>
      ${linksHtml()}`;
    if (pass) handlers.onComplete?.();
  }

  shell.content.addEventListener("click", (ev) => {
    const choice = ev.target.closest("[data-choice]");
    if (choice && !state.locked) {
      answer(Number(choice.dataset.choice));
      return;
    }
    if (ev.target.closest(".quiz-next")) {
      state.i += 1;
      if (state.i < state.list.length) renderQuestion();
      else finish();
      return;
    }
    if (ev.target.closest('[data-quiz="retry"]')) start();
    else if (ev.target.closest('[data-quiz="mistakes"]')) handlers.onOpenMistakes?.();
  });

  start();
  return { close: shell.close };
}
