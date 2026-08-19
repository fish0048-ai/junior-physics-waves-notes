/** 整本講義檔案清單。新章／新節請同步更新 packs；實驗專區改 labs。 */
window.JPWN_BOOK_MANIFEST = {
  cover: { id: "cover", title: "封面", file: "cover.html" },
  packs: [
    {
      title: "第 1 章　基本測量",
      files: [
        { id: "1-0", title: "進入實驗室與科學方法", file: "sections/1-0.html" },
        { id: "1-1", title: "長度與體積的測量", file: "sections/1-1.html" },
        { id: "1-2", title: "質量與密度的測量", file: "sections/1-2.html" }
      ]
    },
    {
      title: "第 2 章　物質的世界",
      files: [
        { id: "2-1", title: "認識物質", file: "sections/2-1.html" },
        { id: "2-2", title: "水溶液", file: "sections/2-2.html" },
        { id: "2-3", title: "空氣的組成", file: "sections/2-3.html" }
      ]
    },
    {
      title: "第 3 章　波動與聲音",
      files: [
        { id: "3-1", title: "波的傳播", file: "sections/3-1.html" },
        { id: "3-2", title: "聲波的產生與傳播", file: "sections/3-2.html" },
        { id: "3-3", title: "聲波的反射與超聲波", file: "sections/3-3.html" },
        { id: "3-4", title: "多變的聲音", file: "sections/3-4.html" }
      ]
    },
    {
      title: "第 4 章　光",
      files: [
        { id: "4-1", title: "光的傳播與光速", file: "sections/4-1.html" },
        { id: "4-2", title: "光的反射與面鏡", file: "sections/4-2.html" },
        { id: "4-3", title: "光的折射與透鏡", file: "sections/4-3.html" },
        { id: "4-4", title: "光學儀器", file: "sections/4-4.html" },
        { id: "4-5", title: "光與顏色", file: "sections/4-5.html" }
      ]
    },
    {
      title: "第 5 章　溫度與熱",
      files: [
        { id: "5-1", title: "溫度與溫度計", file: "sections/5-1.html" },
        { id: "5-2", title: "熱量與比熱", file: "sections/5-2.html" },
        { id: "5-3", title: "熱對物質的影響", file: "sections/5-3.html" },
        { id: "5-4", title: "熱的傳播方式", file: "sections/5-4.html" }
      ]
    },
    {
      title: "第 6 章　探索物質組成",
      files: [
        { id: "6-1", title: "元素的探索", file: "sections/6-1.html" },
        { id: "6-2", title: "元素週期表", file: "sections/6-2.html" },
        { id: "6-3", title: "化合物與原子概念的發展", file: "sections/6-3.html" },
        { id: "6-4", title: "分子與化學式", file: "sections/6-4.html" }
      ]
    }
  ],
  labs: {
    title: "實驗專區",
    files: [
      { id: "lab-1-2", title: "質量與體積的關係", file: "sections/lab-1-2.html" },
      { id: "lab-2-1", title: "混合物的分離", file: "sections/lab-2-1.html" },
      { id: "lab-2-3", title: "氧氣的製備及性質", file: "sections/lab-2-3.html" },
      { id: "lab-4-3", title: "透鏡的成像觀察", file: "sections/lab-4-3.html" },
      { id: "lab-4-5", title: "色光與顏色的關係", file: "sections/lab-4-5.html" },
      { id: "lab-5-1", title: "溫度計的原理", file: "sections/lab-5-1.html" },
      { id: "lab-5-2", title: "熱量與物質溫度變化", file: "sections/lab-5-2.html" },
      { id: "lab-6-1", title: "元素性質的探索與分類", file: "sections/lab-6-1.html" }
    ]
  }
};

/** 依各章小節 → 實驗專區 連續編頁碼（封面不編頁；與整本講義內文順序一致） */
window.JPWNPages = (function () {
  function normalizeFile(file) {
    return String(file || "")
      .replace(/\\/g, "/")
      .replace(/^\.\//, "")
      .replace(/^\/+/, "");
  }

  function build(manifest) {
    const m = manifest || window.JPWN_BOOK_MANIFEST || {};
    const list = [];
    let n = 1;
    // 封面不編頁碼
    (m.packs || []).forEach((pack) => {
      (pack.files || []).forEach((f) => {
        list.push({
          page: n++,
          id: f.id,
          title: f.title || "",
          file: normalizeFile(f.file),
          pack: pack.title || "",
          kind: "section"
        });
      });
    });
    if (m.labs && m.labs.files) {
      m.labs.files.forEach((f) => {
        list.push({
          page: n++,
          id: f.id,
          title: f.title || "",
          file: normalizeFile(f.file),
          pack: m.labs.title || "實驗專區",
          kind: "lab"
        });
      });
    }
    return list;
  }

  function index(manifest) {
    const list = build(manifest);
    const byFile = Object.create(null);
    const byId = Object.create(null);
    list.forEach((item) => {
      byFile[item.file] = item;
      byFile[item.file.replace(/^sections\//, "")] = item;
      if (item.id) byId[item.id] = item;
    });
    return { list, byFile, byId, total: list.length };
  }

  function lookup(fileOrId, manifest) {
    const idx = index(manifest);
    const key = normalizeFile(fileOrId);
    return idx.byFile[key] || idx.byId[fileOrId] || null;
  }

  function rangeForPack(packTitle, manifest) {
    const items = build(manifest).filter((x) => x.pack === packTitle);
    if (!items.length) return null;
    return { from: items[0].page, to: items[items.length - 1].page, items };
  }

  return { build, index, lookup, rangeForPack, normalizeFile };
})();
