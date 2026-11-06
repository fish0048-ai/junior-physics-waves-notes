import { feedbackHtml, mountLabShell } from "./lab-shell.js?v=10";
import { markCompleted } from "../progress.js?v=10";
import { sfx } from "../sfx.js?v=10";

const MAX_ERRORS = 3;

function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function mountMatchLab(root, { island, stage }, handlers) {
  const shell = mountLabShell(root, {
    title: `${island.title} · 配對挑戰`,
    lead: `先點左邊，再點右邊，把名詞和特徵配成一對。全部配完、錯誤 ${MAX_ERRORS} 次以內就點亮星星。`,
    onClose: handlers.onClose,
  });
  const groups = stage.groups;
  const state = { g: 0, errors: 0, left: null, done: new Set(), order: [] };

  function startGroup(g) {
    state.g = g;
    state.left = null;
    state.done = new Set();
    state.order = shuffle(groups[g].pairs.map((_, i) => i));
    render();
  }

  function render(message = "") {
    const group = groups[state.g];
    shell.content.innerHTML = `
      <div class="quiz-top">
        <span class="quiz-count">第 ${state.g + 1}／${groups.length} 組</span>
        <div class="quiz-dots" aria-hidden="true">${groups
          .map((_, i) => `<span class="${i < state.g ? "is-ok" : i === state.g ? "is-now" : ""}"></span>`)
          .join("")}</div>
        <span class="match-errors ${state.errors > MAX_ERRORS ? "is-over" : ""}">錯誤 ${state.errors}</span>
      </div>
      <h3 class="exp-h">${group.title}</h3>
      <div class="match-board">
        <div class="match-col" role="group" aria-label="名詞">${group.pairs
          .map(
            ([l], i) =>
              `<button type="button" class="match-item ${state.done.has(i) ? "is-matched" : ""} ${state.left === i ? "is-on" : ""}" data-left="${i}" ${state.done.has(i) ? "disabled" : ""}>${l}</button>`
          )
          .join("")}</div>
        <div class="match-col" role="group" aria-label="特徵">${state.order
          .map(
            (i) =>
              `<button type="button" class="match-item ${state.done.has(i) ? "is-matched" : ""}" data-right="${i}" ${state.done.has(i) ? "disabled" : ""}>${group.pairs[i][1]}</button>`
          )
          .join("")}</div>
      </div>
      <div class="match-msg" aria-live="polite">${message || (state.left == null ? "先選左邊的一個詞" : `已選「${group.pairs[state.left][0]}」，再點右邊`)}</div>
      <a class="match-ref" href="${group.ref}">對照講義</a>`;
  }

  function finish() {
    const pass = state.errors <= MAX_ERRORS;
    if (pass) markCompleted(stage.taskId);
    shell.content.innerHTML = `
      <div class="quiz-result ${pass ? "is-pass" : ""}">
        <div class="quiz-ring" role="img" aria-label="錯誤 ${state.errors} 次" style="--p:${pass ? 100 : 40}"><b aria-hidden="true">${state.errors}</b><span aria-hidden="true">次錯誤</span></div>
        <h3>${pass ? "配對完成！" : "全部配完了"}</h3>
        <p>${pass ? "已點亮這一關的星星。" : `錯誤 ${MAX_ERRORS} 次以內才能點亮星星，再試一次吧（順序會重新打亂）。`}</p>
      </div>
      <div class="quiz-actions">
        <button type="button" class="isl-btn ${pass ? "" : "is-primary"}" data-match="retry">再挑戰一次</button>
      </div>
      <div class="quiz-links">${groups.map((g) => `<a class="isl-btn" href="${g.ref}">講義：${g.title}</a>`).join("")}</div>`;
    if (pass) handlers.onComplete?.();
  }

  shell.content.addEventListener("click", (ev) => {
    if (ev.target.closest('[data-match="retry"]')) {
      state.errors = 0;
      startGroup(0);
      return;
    }
    const left = ev.target.closest("[data-left]");
    if (left) {
      state.left = Number(left.dataset.left);
      sfx.play("tap");
      render();
      return;
    }
    const right = ev.target.closest("[data-right]");
    if (!right) return;
    const group = groups[state.g];
    if (state.left == null) {
      render(feedbackHtml("warn", "先選左邊的一個詞，再點右邊。"));
      return;
    }
    const r = Number(right.dataset.right);
    if (r === state.left) {
      state.done.add(r);
      state.left = null;
      sfx.play("select");
      if (state.done.size === group.pairs.length) {
        if (state.g + 1 < groups.length) startGroup(state.g + 1);
        else finish();
        return;
      }
      render();
      return;
    }
    state.errors += 1;
    const [l] = group.pairs[state.left];
    const [owner, feature] = group.pairs[r];
    render(feedbackHtml("warn", `「${l}」和「${feature}」不是一對：「${feature}」說的是「${owner}」。再找找「${l}」的特徵。`));
    const btn = shell.content.querySelector(`[data-right="${r}"]`);
    btn?.classList.add("is-wrong");
  });

  startGroup(0);
  return { close: shell.close };
}
