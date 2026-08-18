/** 整本講義下載頁。檔案清單見 js/book-manifest.js。 */
window.APP_CONFIG = {
  githubRepo: "https://github.com/fish0048-ai/junior-physics-waves-notes",
  githubPages: "https://fish0048-ai.github.io/junior-physics-waves-notes/",
  chapter: {
    id: "book",
    mark: "冊",
    title: "整本講義",
    nav: "整本講義",
    grade: "國中八年級理化"
  },
  home: "book.html",
  cover: { file: "cover.html", nav: "封面" },
  chapters: [
    { id: "1", title: "基本測量", file: "ch1.html" },
    { id: "2", title: "物質的世界", file: "ch2.html" },
    { id: "3", title: "波動與聲音", file: "index.html" },
    { id: "4", title: "光", file: "ch4.html" },
    { id: "5", title: "溫度與熱", file: "ch5.html" },
    { id: "6", title: "探索物質組成", file: "ch6.html" },
    { id: "lab", title: "實驗專區", file: "lab.html", nav: "實驗專區" }
  ],
  book: window.JPWN_BOOK_MANIFEST
};
