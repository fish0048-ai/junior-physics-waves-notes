(function () {
  const host = document.getElementById("exam-list");
  if (!host) return;

  const secId = document.body.dataset.section || "";
  const letters = ["A", "B", "C", "D"];
  let revealed = false;

  function toast(msg) {
    if (window.NotesApp?.toast) window.NotesApp.toast(msg);
  }

  function assetUrl(p) {
    const root = (document.body.dataset.root || ".").replace(/\/$/, "") || ".";
    if (!p) return "";
    if (root === ".") return p;
    return root + "/" + p.replace(/^\.\//, "");
  }

  function usable(item) {
    const q = String(item.q || "").trim();
    const choices = (item.choices || []).map((c) => String(c || "").trim());
    const filled = choices.filter(Boolean);
    const figChoices = (item.choiceImgs || []).filter(Boolean);
    if (q.includes("複選") && q.includes("0.0025")) return false;
    if (filled.length < 2 && figChoices.length < 2) return false;
    return true;
  }

  function applyFigs(list) {
    const rules = (window.EXAM_FIGS && window.EXAM_FIGS[secId]) || [];
    const used = new Set();
    return list.map((item) => {
      const hay = String(item.q || "") + String(item.lead || "");
      if (hay.includes("複選") && hay.includes("0.0025")) return item;
      const idx = rules.findIndex((rule, i) => !used.has(i) && rule.match && hay.includes(rule.match));
      if (idx < 0) return item;
      used.add(idx);
      const rule = rules[idx];
      const next = Object.assign({}, item);
      if (rule.q && !String(next.q || "").trim()) next.q = rule.q;
      if (rule.lead && !String(next.lead || "").trim()) next.lead = rule.lead;
      if (rule.imgs && rule.imgs.length) next.imgs = rule.imgs;
      if (rule.choiceImgs && rule.choiceImgs.length) {
        next.choiceImgs = rule.choiceImgs;
        const filled = (next.choices || []).filter((c) => String(c || "").trim());
        if (filled.length < 2) next.choices = ["如圖", "如圖", "如圖", "如圖"];
      }
      return next;
    });
  }

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function topicOf(item) {
    const t = `${item.q || ""}${item.lead || ""}`;
    if (/超聲波|次聲波|聲納|蝙蝠|產檢/.test(t)) return "ultra";
    if (/回聲|峭壁|山壁|測距|雷聲/.test(t)) return "echo";
    if (/音調|音色|響度|分貝|噪音|弦|力度|樂音/.test(t)) return "tone";
    if (/真空|電鈴|抽氣|介質|聲速|溫度|音叉/.test(t)) return "sound";
    return "wave";
  }

  function hasKey(item) {
    const a = Number(item.ans);
    return Number.isInteger(a) && a >= 0 && a <= 3;
  }

  function normalizeFigs(list) {
    return list.map((item) => {
      const next = Object.assign({}, item);
      const imgs = (next.imgs || []).filter(Boolean);
      const choices = (next.choices || []).map((c) => String(c || "").trim());
      const filled = choices.filter(Boolean);
      const cImgs = (next.choiceImgs || []).filter(Boolean);
      if (cImgs.length < 2 && filled.length < 2 && imgs.length >= 4) {
        if (imgs.length === 5) {
          next.imgs = [imgs[0]];
          next.choiceImgs = imgs.slice(1, 5);
        } else {
          next.imgs = [];
          next.choiceImgs = imgs.slice(0, 4);
        }
        next.choices = ["如圖", "如圖", "如圖", "如圖"];
      }
      return next;
    });
  }

  function pickSpread(list, n) {
    if (!n || list.length <= n) return list.slice();
    const buckets = {};
    list.forEach((item) => {
      const k = topicOf(item);
      (buckets[k] ||= []).push(item);
    });
    Object.keys(buckets).forEach((k) => {
      buckets[k] = shuffle(buckets[k]);
    });
    const keys = Object.keys(buckets);
    const out = [];
    const used = new Set();
    while (out.length < n) {
      let added = false;
      for (let i = 0; i < keys.length; i++) {
        if (out.length >= n) break;
        const next = buckets[keys[i]].find((x) => !used.has(x));
        if (next) {
          used.add(next);
          out.push(next);
          added = true;
        }
      }
      if (!added) break;
    }
    return out;
  }

  const raw =
    (window.EXAM_BANK_SECTIONS && window.EXAM_BANK_SECTIONS[secId]) ||
    (window.EXAM_BANK && window.EXAM_BANK[secId]) ||
    [];
  const pickN = Number(document.body.dataset.pick) || 0;
  const pool = normalizeFigs(applyFigs(raw)).filter(usable);
  const source = pickN ? pool.filter(hasKey) : pool;
  let items = pickN ? pickSpread(source.length >= pickN ? source : pool, pickN) : pool;

  function render() {
    if (!items.length) {
      host.innerHTML = `<p class="note">本題庫尚未匯入。請提供段考題後再更新。</p>`;
      return;
    }
    let lastLead = "";
    host.innerHTML = items
      .map((item, i) => {
        const choices = (item.choices || []).slice(0, 4);
        const lead = String(item.lead || "").trim();
        const showLead = lead && lead !== lastLead;
        if (lead) lastLead = lead;
        const stem = String(item.q || "").trim() || "（請依附圖作答）";
        const needFig = /如圖|附圖/.test(stem + lead);
        const figHtml = (srcs, alt) =>
          (srcs || [])
            .filter(Boolean)
            .map(
              (src) =>
                `<img class="exam-fig" src="${assetUrl(src)}" alt="${alt}" onerror="this.style.display='none'">`
            )
            .join("");
        const group = item.group
          ? `<p class="exam-group">${item.group.replace(/為題組$/, "")}</p>`
          : "";
        const leadFigs = showLead ? figHtml(item.imgs, "題組附圖") : "";
        const stemFigs = lead ? "" : figHtml(item.imgs, "附圖");
        const hasFig =
          leadFigs ||
          stemFigs ||
          (item.choiceImgs || []).some(Boolean) ||
          (lead && !showLead);
        return `
          <section class="exam-q" data-i="${i}" data-ans="${item.ans}">
            ${showLead ? `<div class="exam-passage">${group}<p>${lead}</p>${leadFigs}</div>` : ""}
            <p class="exam-stem"><strong>${i + 1}.</strong> ${stem}</p>
            ${needFig && !hasFig ? `<p class="exam-fig-note">本題原卷有附圖；若圖未顯示，請依文字題意作答。</p>` : ""}
            ${stemFigs}
            <div class="exam-choices" role="radiogroup" aria-label="第 ${i + 1} 題">
              ${choices
                .map((c, k) => {
                  const src = (item.choiceImgs || [])[k];
                  const fig = src
                    ? `<img class="exam-choice-fig" src="${assetUrl(src)}" alt="選項 ${letters[k]}" onerror="this.style.display='none'">`
                    : "";
                  const text = fig && (!c || c === "如圖") ? "" : `<span>${c || "（如圖）"}</span>`;
                  return `
                <button type="button" class="exam-choice" data-k="${k}" role="radio" aria-checked="false">
                  <span class="exam-letter">${letters[k]}</span>
                  ${text}${fig}
                </button>`;
                })
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
    let scored = 0;
    host.querySelectorAll(".exam-q").forEach((box) => {
      const ans = Number(box.dataset.ans);
      const keyed = Number.isInteger(ans) && ans >= 0 && ans <= 3;
      const picked = box.querySelector(".exam-choice.is-on");
      const pick = picked ? Number(picked.dataset.k) : -1;
      box.querySelectorAll(".exam-choice").forEach((el) => {
        el.classList.remove("is-key", "is-miss");
        if (keyed && Number(el.dataset.k) === ans) el.classList.add("is-key");
      });
      if (!keyed) {
        box.classList.remove("is-right", "is-wrong");
      } else {
        scored += 1;
        if (pick === ans) {
          box.classList.add("is-right");
          box.classList.remove("is-wrong");
          ok += 1;
        } else {
          box.classList.add("is-wrong");
          box.classList.remove("is-right");
          if (picked) picked.classList.add("is-miss");
        }
      }
      const exp = box.querySelector(".exam-explain");
      if (exp) exp.hidden = !showExplain;
    });
    const total = scored || items.length;
    const score = document.getElementById("exam-score");
    if (score) score.textContent = `得分 ${ok} / ${total}`;
    toast(`段考練習：${ok} / ${total} 題正確`);
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

  function startSet() {
    revealed = false;
    if (pickN) items = pickSpread(source.length >= pickN ? source : pool, pickN);
    render();
    const n = document.getElementById("exam-count");
    if (n) n.textContent = String(items.length);
    const score = document.getElementById("exam-score");
    if (score) score.textContent = "";
    const keyBtn = document.getElementById("exam-key");
    if (keyBtn) keyBtn.textContent = "顯示詳解";
  }

  startSet();

  document.getElementById("exam-reshuffle")?.addEventListener("click", () => {
    startSet();
    toast(pickN ? `已另抽 ${pickN} 題` : "已重抽題目");
  });

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
