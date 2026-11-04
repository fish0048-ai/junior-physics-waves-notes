/** 群島挑戰題：直接讀講義站的第 6 章隨堂題庫，不另存題目 */
const SOURCES = ["../js/exam-ch6-sections.js?v=9", "../js/exam-ch6-keys.js?v=9"];
const LETTERS = ["A", "B", "C", "D"];
const ELEMENT_SYMBOLS = new Set(
  "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn As Se Br Kr Rb Sr Ag Sn I Xe Cs Ba W Pt Au Hg Pb Rn Ra U".split(" ")
);

let loading = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`題庫載入失敗：${src}`));
    document.head.appendChild(s);
  });
}

export function loadBank() {
  if (!loading) {
    loading = (async () => {
      if (!window.EXAM_BANK_SECTIONS?.["6-1"]) {
        for (const src of SOURCES) await loadScript(src);
      }
      return window.EXAM_BANK_SECTIONS || {};
    })();
    loading.catch(() => {
      loading = null;
    });
  }
  return loading;
}

function clean(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\s+([，。、；：！？])/g, "$1")
    .replace(/([（(])\s+/g, "$1")
    .replace(/\s+([）)])/g, "$1")
    .replace(/([\u4e00-\u9fff，。、；：？！「」])\s+(?=[\u4e00-\u9fff，。、；：？！「」])/g, "$1")
    .trim()
    .replace(/^[（(]\s*[0-9０-９]*\s*[）)]\s*/, "");
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 題庫把下標存成「H 2 O」「CO 2」：只對元素符號後的數字改成下標 */
function chem(html) {
  return html
    .replace(/([A-Z][a-z]?) (\d{1,2})(?!\s*\d)(?![.．]\d)/g, (m, sym, n) => (ELEMENT_SYMBOLS.has(sym) ? `${sym}<sub>${n}</sub>` : m))
    .replace(/([A-Z][a-z]?)(\d{1,2})(?=[A-Z(]|<|\s|[，。、；：？！）)]|$)/g, (m, sym, n) => (ELEMENT_SYMBOLS.has(sym) ? `${sym}<sub>${n}</sub>` : m))
    .replace(/<\/sub> (?=[A-Z][a-z]?(?:<sub>|[A-Z]|[\s，。、；：？！）)]|$))/g, "</sub>");
}

/** 轉檔時下一段的「二、題組（每題 2.0 分…）第 46 至 48 題」會黏在上一題最後一個選項 */
function stripLeak(s) {
  return s
    .replace(/\s*[一二三四五六七八九十]+\s*、\s*題\s*組[\s\S]*$/, "")
    .replace(/[。．]?\s*第\s*\d+\s*至\s*\d+\s*題\s*$/, "")
    .trim();
}

export function formatText(s) {
  return chem(escapeHtml(stripLeak(clean(s))));
}

const NEEDS_FIGURE = /如圖|附圖|附表|下圖|右圖|左圖|上圖|下表|右表|甲圖|乙圖|題組|承上|本文|文章|上文|上述|短文|閱讀/;
/** 題組的第 2、3 小題沒有存閱讀文章，單獨出現會看不懂 */
const GROUP_SUBITEM = /^[（(]\s*[）)]\s*[（(]\s*[0-9０-９]+\s*[）)]|^[（(]\s*[0-9０-９]+\s*[）)]/;
const NEEDS_MATH = /cm\s*3|g\s*\/|10\s*[－-]\s*\d|℃|°|kg|mL/;

function flatCount(v) {
  return Array.isArray(v) ? v.flat(3).filter(Boolean).length : v ? 1 : 0;
}

function eligible(item) {
  if (GROUP_SUBITEM.test(String(item.q || "").trim())) return false;
  const q = clean(item.q);
  const choices = (item.choices || []).map((c) => stripLeak(clean(c)));
  if (q.length < 10 || q.length > 230) return false;
  if (/^(基測|會考|補考)/.test(q) && q.length < 28) return false;
  if (flatCount(item.imgs) || flatCount(item.choiceImgs)) return false;
  if (clean(item.lead) || clean(item.group)) return false;
  if (NEEDS_FIGURE.test(q) || NEEDS_MATH.test(q + choices.join(""))) return false;
  if (choices.length !== 4 || choices.some((c) => !c || c.length > 90 || /如圖/.test(c))) return false;
  return Number.isInteger(item.ans) && item.ans >= 0 && item.ans <= 3;
}

function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function toQuestion(section, index, item) {
  return {
    key: `${section}#${index}`,
    section,
    index,
    q: formatText(item.q),
    choices: item.choices.slice(0, 4).map(formatText),
    ans: item.ans,
    letter: LETTERS[item.ans],
    explain: formatText(item.explain).replace(/\/$/, ""),
  };
}

function pool(bank, section, topic) {
  const list = (bank[section] || []).map((item, index) => ({ item, index })).filter(({ item }) => eligible(item));
  if (!topic) return list;
  const re = new RegExp(topic);
  const themed = list.filter(({ item }) => re.test(clean(item.q) + clean(item.explain)));
  return themed.length >= 8 ? themed : list;
}

export async function pickForSection(section, topic, count) {
  const bank = await loadBank();
  return shuffle(pool(bank, section, topic))
    .slice(0, count)
    .map(({ item, index }) => toQuestion(section, index, item));
}

export async function pickMixed(sections, count) {
  const bank = await loadBank();
  const per = Math.ceil(count / sections.length);
  const picked = sections.flatMap((sec) =>
    shuffle(pool(bank, sec, null))
      .slice(0, per)
      .map(({ item, index }) => toQuestion(sec, index, item))
  );
  return shuffle(picked).slice(0, count);
}

export async function questionsFor(refs) {
  const bank = await loadBank();
  return refs
    .map(({ section, index }) => {
      const item = bank[section]?.[index];
      return item && eligible(item) ? toQuestion(section, index, item) : null;
    })
    .filter(Boolean);
}

export async function poolSizes() {
  const bank = await loadBank();
  return Object.fromEntries(["6-1", "6-2", "6-3", "6-4"].map((sec) => [sec, pool(bank, sec, null).length]));
}
