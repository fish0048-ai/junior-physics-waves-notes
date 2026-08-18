/** 第 5 章設定：之後新增小節，只要在 sections 陣列加一筆，並新增對應 HTML */
window.APP_CONFIG = {
  githubRepo: "https://github.com/fish0048-ai/junior-physics-waves-notes",
  githubPages: "https://fish0048-ai.github.io/junior-physics-waves-notes/",
  chapter: {
    id: "5",
    mark: "熱",
    title: "溫度與熱",
    grade: "國中八年級理化"
  },
  home: "ch5.html",
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
  review: {
    id: "ch-5",
    file: "review-ch5.html",
    nav: "章末評量",
    title: "第 5 章複習評量",
    summary: "題庫 120 題，抽出 40 題　四選一"
  },
  sections: [
    {
      id: "5-1",
      title: "溫度與溫度計",
      file: "sections/5-1.html",
      exam: "exams/5-1.html",
      ready: true,
      ask: "用手摸得出準確的冷熱嗎？溫度計到底在量什麼？",
      summary: "溫度計原理、實驗、攝氏華氏與克氏溫標"
    },
    {
      id: "5-2",
      title: "熱量與比熱",
      file: "sections/5-2.html",
      exam: "exams/5-2.html",
      ready: true,
      ask: "熱量和溫度是同一件事嗎？為什麼有的東西升溫比較快？",
      summary: "熱平衡、卡路里、比熱與加熱實驗"
    },
    {
      id: "5-3",
      title: "熱對物質的影響",
      file: "sections/5-3.html",
      exam: "exams/5-3.html",
      ready: true,
      ask: "加熱以後，東西只是變熱，還是形狀、狀態也會變？",
      summary: "熱脹冷縮、三態變化、吸熱放熱反應"
    },
    {
      id: "5-4",
      title: "熱的傳播方式",
      file: "sections/5-4.html",
      exam: "exams/5-4.html",
      ready: true,
      ask: "熱一定要碰到才會傳嗎？保溫瓶為什麼能擋住三種傳熱？",
      summary: "傳導、對流、輻射與保溫"
    }
  ]
};
