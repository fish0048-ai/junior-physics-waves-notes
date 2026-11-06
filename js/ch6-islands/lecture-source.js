/** 島嶼事件與考前速記直接讀講義原檔，群島不另存一份課文 */
const KATEX = "https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/";
const docs = new Map();
let katexReady = null;

function loadSection(section) {
  if (!docs.has(section)) {
    const job = fetch(`../sections/${section}.html`)
      .then((res) => {
        if (!res.ok) throw new Error(`講義 ${section} 載入失敗`);
        return res.text();
      })
      .then((html) => new DOMParser().parseFromString(html, "text/html"));
    job.catch(() => docs.delete(section));
    docs.set(section, job);
  }
  return docs.get(section);
}

/** 挖空改成顯示答案（取第一個可接受答案），其餘只留行內格式 */
function cleanHtml(node) {
  const el = node.cloneNode(true);
  el.querySelectorAll("input.blank").forEach((input) => {
    const b = document.createElement("b");
    b.className = "memo-blank";
    b.textContent = String(input.dataset.answer || "").split("|")[0];
    input.replaceWith(b);
  });
  el.querySelectorAll("svg, img, script, style, input, button, iframe").forEach((n) => n.remove());
  el.querySelectorAll("a").forEach((a) => a.replaceWith(...a.childNodes));
  el.querySelectorAll("*").forEach((n) => {
    [...n.attributes].forEach((attr) => {
      if (!(n.tagName === "B" && attr.name === "class")) n.removeAttribute(attr.name);
    });
  });
  return el.innerHTML.replace(/\s+/g, " ").trim();
}

export async function islandEvent(island) {
  const doc = await loadSection(island.event.section);
  const card = doc.querySelector(island.event.card);
  const ask = card?.querySelector(".inquiry-ask");
  if (!ask) return null;
  const clue = ask.cloneNode(true);
  clue.querySelector("strong")?.remove();
  return {
    title: card.querySelector(".section-head h2")?.textContent.trim() || "",
    clue: cleanHtml(clue),
  };
}

export async function sectionMemo(section) {
  const doc = await loadSection(section);
  return [...doc.querySelectorAll("#memo ul.q > li")].map(cleanHtml).filter(Boolean);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(src));
    document.head.appendChild(s);
  });
}

export function renderMath(el) {
  if (!el || !/\\\(|\\\[/.test(el.textContent)) return;
  if (!katexReady) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = `${KATEX}katex.min.css`;
    document.head.appendChild(css);
    katexReady = loadScript(`${KATEX}katex.min.js`).then(() => loadScript(`${KATEX}contrib/auto-render.min.js`));
    katexReady.catch(() => {
      katexReady = null;
    });
  }
  katexReady
    .then(() =>
      window.renderMathInElement?.(el, {
        delimiters: [
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true },
        ],
        throwOnError: false,
      })
    )
    .catch(() => {});
}
