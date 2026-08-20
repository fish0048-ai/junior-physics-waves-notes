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

  function flattenSrcs(arr) {
    const out = [];
    (function walk(v) {
      if (v == null || v === "") return;
      if (Array.isArray(v)) {
        v.forEach(walk);
        return;
      }
      out.push(String(v));
    })(arr);
    return out;
  }

  function imageNum(p) {
    const m = String(p).match(/image(\d+)/i);
    return m ? parseInt(m[1], 10) : -1;
  }

  function imageExt(p) {
    return String(p).split(".").pop().toLowerCase();
  }

  function imageDir(p) {
    return String(p).replace(/image\d+\.[^.]+$/i, "");
  }

  function imagePath(dir, n, ext) {
    return dir + "image" + String(n).padStart(3, "0") + "." + ext;
  }

  /** Word 同一張圖常同時輸出 png 與下一號 jpg／gif，畫面會出現兩張一樣的。 */
  function dedupeWordPairs(arr) {
    const list = flattenSrcs(arr);
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const cur = list[i];
      const nxt = list[i + 1];
      if (nxt && imageNum(nxt) === imageNum(cur) + 1) {
        const e1 = imageExt(cur);
        const e2 = imageExt(nxt);
        if (e1 === "png" && /^(jpg|jpeg|gif)$/.test(e2)) {
          out.push(cur);
          i += 1;
          continue;
        }
        if (e2 === "png" && /^(jpg|jpeg|gif)$/.test(e1)) {
          out.push(nxt);
          i += 1;
          continue;
        }
      }
      out.push(cur);
    }
    return out;
  }

  function fillChoiceFigPairs(figs) {
    if (figs.length !== 2) return figs;
    const n0 = imageNum(figs[0]);
    const n1 = imageNum(figs[1]);
    if (n0 < 0 || n1 !== n0 + 2 || imageExt(figs[0]) !== "png") return figs;
    const dir = imageDir(figs[0]);
    return [figs[0], figs[1], imagePath(dir, n0 + 4, "png"), imagePath(dir, n0 + 6, "png")];
  }

  function cleanText(s) {
    return String(s || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/[ \t\u00a0]+/g, " ")
      .replace(/\s+([，。、；：！？])/g, "$1")
      .replace(/([（(])\s+/g, "$1")
      .replace(/\s+([）)])/g, "$1")
      .replace(/\s+([°度])/g, "$1")
      .trim();
  }

  function stripLeakedNext(s) {
    return String(s)
      .replace(/[。．]?\s*\d{1,3}\.\s*\(\s*\)[\s\S]*$/, "")
      .replace(/\s*【[^】]{0,16}】\s*$/, "")
      .replace(/[。．]\s*$/, "")
      .trim();
  }

  function isJunkStem(q) {
    if (!q || q.length < 12) return true;
    if (/^(基測|會考|補考)/.test(q) && q.length < 28) return true;
    if (/^〔\s*(基測|會考)/.test(q) && q.length < 20) return true;
    return false;
  }

  function mathText(s) {
    const polish = window.JPWNMath && typeof window.JPWNMath.polish === "function"
      ? window.JPWNMath.polish
      : (t) => t;
    return polish(cleanText(s));
  }

  function sanitizeItem(item) {
    const next = Object.assign({}, item);
    next.q = mathText(next.q);
    next.lead = mathText(next.lead);
    next.explain = mathText(next.explain).replace(/\/$/, "");
    next.group = cleanText(next.group);
    next.choices = (next.choices || []).slice(0, 4).map((c) => stripLeakedNext(mathText(c)));
    const filled = next.choices.filter(Boolean);
    next.imgs = dedupeWordPairs(next.imgs);
    next.choiceImgs = dedupeWordPairs(next.choiceImgs);
    const asFig = next.choices.filter((c) => String(c).includes("如圖")).length >= 2;
    if (asFig) next.choiceImgs = fillChoiceFigPairs(next.choiceImgs);
    if (next.imgs.length > 6) {
      next.imgs = next.imgs.slice(0, filled.length >= 2 ? 2 : 1);
    } else if (next.imgs.length > 4 && filled.length >= 2) {
      next.imgs = next.imgs.slice(0, 2);
    }
    if (next.choiceImgs.length > 4) next.choiceImgs = next.choiceImgs.slice(0, 4);
    return next;
  }

  function usable(item) {
    const q = String(item.q || "").trim();
    const choices = (item.choices || []).map((c) => String(c || "").trim());
    const filled = choices.filter(Boolean);
    const figChoices = flattenSrcs(item.choiceImgs);
    if (isJunkStem(q)) return false;
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
    if (secId === "ch-1" || String(secId).indexOf("1-") === 0) {
      if (/安全|通風|沖眼|飲食|剩餘藥品|滅火|護目|實驗衣/.test(t)) return "safety";
      if (/酒精燈|量筒|陶瓷纖維|玻璃棒|搧聞|通風櫥|本生燈|稀釋|凹面|凸面/.test(t)) return "gear";
      if (/操縱變因|控制變因|應變變因|對照組|實驗組/.test(t)) return "var";
      if (/密度|天平|砝碼|質量|酒精|鋁|斜率|截距/.test(t)) return "density";
      if (/測量|估計|誤差|平均|排水|單位|體積|長度/.test(t)) return "measure";
      return "ch1";
    }
    if (secId === "ch-4" || String(secId).indexOf("4-") === 0) {
      if (/近視|遠視|老花|顯微|照相|眼睛|眼鏡|視網膜|水晶體/.test(t)) return "eye";
      if (/色散|顏色|色光|色料|紅光|綠光|藍光|濾光|三原色/.test(t)) return "color";
      if (/折射|透鏡|凸透|凹透|三稜鏡|焦距|焦點/.test(t)) return "refract";
      if (/反射|平面鏡|凸面鏡|凹面鏡|面鏡|入射角|反射角/.test(t)) return "reflect";
      if (/針孔|影子|光速|直線|日蝕|月蝕|光年|日食|月食/.test(t)) return "prop";
      return "optics";
    }
    if (secId === "ch-5" || String(secId).indexOf("5-") === 0) {
      if (/溫度計|溫標|攝氏|華氏|克氏|液柱|絕對零度/.test(t)) return "temp";
      if (/比熱|熱量|卡路里|熱平衡|混合|大卡/.test(t)) return "heat";
      if (/熔化|沸騰|熱脹|三態|凝固|昇華|凝結|汽化|密度/.test(t)) return "phase";
      if (/傳導|對流|輻射|保溫|海風|陸風|良導體/.test(t)) return "transfer";
      return "thermal";
    }
    if (secId === "ch-6" || String(secId).indexOf("6-") === 0) {
      if (/週期表|週期|第 \d+ 族|鹼金屬|鹼土|鈍氣|門得列夫|礦物油|酚酞/.test(t)) return "periodic";
      if (/質子|中子|電子|同位素|原子序|質量數|道耳頓|湯姆森|拉塞福|查兌克|氧化汞|德謨克利特|原子核/.test(t)) return "atom";
      if (/分子|化學式|混合物|亞佛加厥|粒子圖|實驗式|示性式/.test(t)) return "molecule";
      if (/元素|金屬|非金屬|符號|同素異形|拉瓦節|波以耳|石墨|不鏽鋼/.test(t)) return "element";
      return "matter";
    }
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
      next.imgs = dedupeWordPairs(next.imgs);
      next.choiceImgs = dedupeWordPairs(next.choiceImgs);
      const imgs = next.imgs;
      const choices = (next.choices || []).map((c) => String(c || "").trim());
      const filled = choices.filter(Boolean);
      const cImgs = next.choiceImgs;
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
  const pool = normalizeFigs(applyFigs(raw).map(sanitizeItem)).filter(usable);
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
        const figHtml = (srcs, alt) => {
          const list = flattenSrcs(srcs);
          if (!list.length) return "";
          return `<div class="exam-figs">${list
            .map(
              (src) =>
                `<img class="exam-fig" src="${assetUrl(src)}" alt="${alt}" onerror="this.style.display='none'">`
            )
            .join("")}</div>`;
        };
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
                  const src = flattenSrcs(item.choiceImgs)[k];
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
        saveExamUi();
      });
    });
    applyExamUi();
    window.JPWNMath?.render?.();
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
    saveExamUi();
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
    saveExamUi();
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
    saveExamUi();
  }

  const LS_CLASSES = "jpwn.classes";
  const LS_CURRENT = "jpwn.classId";
  const LS_SETS = "jpwn.examSets";
  const LS_EXAM_UI = "jpwn.examUi";
  let restoringUi = false;

  function loadExamClasses() {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_CLASSES) || "[]");
      if (Array.isArray(raw) && raw.length) return raw.filter((c) => c && c.id && c.name);
    } catch (err) {
      /* ignore */
    }
    return [{ id: "default", name: "預設班級" }];
  }

  function currentExamClass() {
    const classes = loadExamClasses();
    const id = localStorage.getItem(LS_CURRENT);
    return classes.find((c) => c.id === id) || classes[0];
  }

  function itemKey(item) {
    return [item.q || "", (item.choices || []).join("¦"), item.lead || ""].join("::");
  }

  function readSets() {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_SETS) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch (err) {
      return {};
    }
  }

  function setStoreKey() {
    return `${currentExamClass().id}::${secId}`;
  }

  function examUiKey() {
    return setStoreKey();
  }

  function currentItemKeys() {
    return items.map(itemKey);
  }

  function saveExamUi() {
    if (restoringUi || window.NotesApp?.persistPaused) return;
    if (!host || !items.length) return;
    let all = {};
    try {
      all = JSON.parse(localStorage.getItem(LS_EXAM_UI) || "{}");
    } catch (err) {
      all = {};
    }
    const picks = [...host.querySelectorAll(".exam-q")].map((box) => {
      const picked = box.querySelector(".exam-choice.is-on");
      return picked ? Number(picked.dataset.k) : -1;
    });
    all[examUiKey()] = {
      keys: currentItemKeys(),
      picks,
      revealed
    };
    localStorage.setItem(LS_EXAM_UI, JSON.stringify(all));
  }

  function applyExamUi() {
    let rec = null;
    try {
      rec = JSON.parse(localStorage.getItem(LS_EXAM_UI) || "{}")[examUiKey()] || null;
    } catch (err) {
      rec = null;
    }
    if (!rec || !Array.isArray(rec.keys)) return;
    if (rec.keys.join("\n") !== currentItemKeys().join("\n")) return;
    restoringUi = true;
    const boxes = [...host.querySelectorAll(".exam-q")];
    if (Array.isArray(rec.picks)) {
      boxes.forEach((box, i) => {
        const k = rec.picks[i];
        if (!Number.isInteger(k) || k < 0) return;
        const btn = box.querySelector(`.exam-choice[data-k="${k}"]`);
        if (!btn) return;
        box.querySelectorAll(".exam-choice").forEach((el) => {
          el.classList.remove("is-on");
          el.setAttribute("aria-checked", "false");
        });
        btn.classList.add("is-on");
        btn.setAttribute("aria-checked", "true");
      });
    }
    if (rec.revealed) setReveal(true);
    restoringUi = false;
  }

  function savedRecord() {
    return readSets()[setStoreKey()] || null;
  }

  function formatWhen(ts) {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function updateSetStatus() {
    const el = document.getElementById("exam-set-status");
    if (!el) return;
    const cls = currentExamClass();
    const rec = savedRecord();
    if (rec && rec.keys && rec.keys.length) {
      el.textContent = `「${cls.name}」已存 ${rec.keys.length} 題（${formatWhen(rec.savedAt)}）`;
    } else {
      el.textContent = `「${cls.name}」尚未存題本`;
    }
  }

  function fillExamClassSelect() {
    const sel = document.getElementById("exam-class");
    if (!sel) return;
    const classes = loadExamClasses();
    const cur = currentExamClass();
    sel.innerHTML = classes
      .map((c) => `<option value="${c.id}" ${c.id === cur.id ? "selected" : ""}>${c.name}</option>`)
      .join("");
  }

  function restoreItems(keys) {
    const map = new Map(source.map((item) => [itemKey(item), item]));
    const restored = keys.map((k) => map.get(k)).filter(Boolean);
    return restored.length ? restored : null;
  }

  function saveCurrentSet() {
    const cls = currentExamClass();
    const all = readSets();
    all[setStoreKey()] = {
      classId: cls.id,
      className: cls.name,
      section: secId,
      savedAt: Date.now(),
      keys: items.map(itemKey)
    };
    localStorage.setItem(LS_SETS, JSON.stringify(all));
    updateSetStatus();
    try { window.JPWNCloud?.bump?.(); } catch (err) { /* ignore */ }
    toast(`已把目前 ${items.length} 題存給「${cls.name}」`);
  }

  function loadSavedSet() {
    const rec = savedRecord();
    if (!rec || !rec.keys || !rec.keys.length) {
      toast(`「${currentExamClass().name}」還沒有存過題本`);
      return false;
    }
    const restored = restoreItems(rec.keys);
    if (!restored) {
      toast("題庫已更新，無法載入舊題本，請重新抽題後再存");
      return false;
    }
    items = restored;
    revealed = false;
    render();
    const n = document.getElementById("exam-count");
    if (n) n.textContent = String(items.length);
    const score = document.getElementById("exam-score");
    if (score) score.textContent = "";
    const keyBtn = document.getElementById("exam-key");
    if (keyBtn) keyBtn.textContent = "顯示詳解";
    updateSetStatus();
    toast(`已載入「${currentExamClass().name}」的 ${items.length} 題`);
    return true;
  }

  function ensureSetBar() {
    if (!pickN || document.getElementById("exam-set-bar")) return;
    const toolbar = document.querySelector(".exam-toolbar");
    if (!toolbar) return;
    const bar = document.createElement("div");
    bar.id = "exam-set-bar";
    bar.className = "exam-set-bar no-print";
    bar.innerHTML = `
      <label class="exam-set-field">
        <span>班級</span>
        <select id="exam-class"></select>
      </label>
      <button type="button" class="btn btn-green" id="exam-save-set">存成此班題本</button>
      <button type="button" class="btn btn-ghost" id="exam-load-set">載入此班題本</button>
      <span class="exam-set-status" id="exam-set-status"></span>
    `;
    toolbar.after(bar);
    fillExamClassSelect();
    document.getElementById("exam-class").addEventListener("change", (e) => {
      localStorage.setItem(LS_CURRENT, e.target.value);
      const inkSel = document.getElementById("ink-class");
      if (inkSel && inkSel.value !== e.target.value) {
        inkSel.value = e.target.value;
        inkSel.dispatchEvent(new Event("change"));
      }
      if (!loadSavedSet()) updateSetStatus();
    });
    document.getElementById("exam-save-set").addEventListener("click", () => {
      const rec = savedRecord();
      if (rec && rec.keys && rec.keys.length) {
        if (!window.confirm(`「${currentExamClass().name}」已有題本，要覆蓋成目前這一套嗎？`)) return;
      }
      saveCurrentSet();
    });
    document.getElementById("exam-load-set").addEventListener("click", () => {
      loadSavedSet();
    });
  }

  function startSet(opts) {
    revealed = false;
    const forceNew = opts && opts.forceNew;
    if (pickN) {
      if (!forceNew) {
        const rec = savedRecord();
        const restored = rec && rec.keys ? restoreItems(rec.keys) : null;
        items = restored || pickSpread(source.length >= pickN ? source : pool, pickN);
      } else {
        items = pickSpread(source.length >= pickN ? source : pool, pickN);
      }
    }
    render();
    const n = document.getElementById("exam-count");
    if (n) n.textContent = String(items.length);
    const score = document.getElementById("exam-score");
    if (score) score.textContent = "";
    const keyBtn = document.getElementById("exam-key");
    if (keyBtn) keyBtn.textContent = "顯示詳解";
    updateSetStatus();
  }

  ensureSetBar();
  startSet();
  window.addEventListener("jpwn-class-will-change", saveExamUi);
  window.addEventListener("pagehide", saveExamUi);
  window.addEventListener("jpwn-class-change", () => {
    fillExamClassSelect();
    if (pickN) {
      const rec = savedRecord();
      if (rec && rec.keys) loadSavedSet();
      else {
        updateSetStatus();
        applyExamUi();
      }
    } else {
      applyExamUi();
    }
  });

  document.getElementById("exam-reshuffle")?.addEventListener("click", () => {
    startSet({ forceNew: true });
    toast(pickN ? `已另抽 ${pickN} 題，按「存成此班題本」才會覆蓋舊的` : "已重抽題目");
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
      if (document.querySelector("input.blank")) origCheck();
      if (items.length) {
        revealed = true;
        grade(true);
        const btn = document.getElementById("exam-key");
        if (btn) btn.textContent = "隱藏詳解";
      }
    };
    window.NotesApp.printPdf = function (withAnswers) {
      window.NotesApp.persistPaused = true;
      const was = revealed;
      setReveal(!!withAnswers);
      const onAfter = () => {
        window.removeEventListener("jpwn-after-print", onAfter);
        setReveal(was);
      };
      window.addEventListener("jpwn-after-print", onAfter);
      origPrint(withAnswers);
    };
  }
})();
