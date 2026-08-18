/** 第 1 章設定：緒論併入本章第一節（1-0） */
window.APP_CONFIG = {
  githubRepo: "https://github.com/fish0048-ai/junior-physics-waves-notes",
  githubPages: "https://fish0048-ai.github.io/junior-physics-waves-notes/",
  chapter: {
    id: "1",
    mark: "量",
    title: "基本測量",
    grade: "國中八年級理化"
  },
  home: "ch1.html",
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
    id: "ch-1",
    file: "review-ch1.html",
    nav: "章末評量",
    title: "第 1 章複習評量",
    summary: "題庫 120 題，抽出 40 題　四選一"
  },
  sections: [
    {
      id: "1-0",
      title: "進入實驗室與科學方法",
      file: "sections/1-0.html",
      exam: "exams/1-0.html",
      ready: true,
      ask: "進實驗室，先想安全還是先拿藥品？",
      summary: "安全守則、器材操作、控制變因法"
    },
    {
      id: "1-1",
      title: "長度與體積的測量",
      file: "sections/1-1.html",
      exam: "exams/1-1.html",
      ready: true,
      ask: "量一次就準嗎？最後那位數字是量出來的還是估的？",
      summary: "單位、估計值、誤差、排水法"
    },
    {
      id: "1-2",
      title: "質量與密度的測量",
      file: "sections/1-2.html",
      exam: "exams/1-2.html",
      ready: true,
      ask: "同樣一杯，水和酒精的質量會一樣嗎？未知金屬塊要怎麼認？",
      summary: "質量、天平、密度、質量與體積的關係"
    }
  ]
};
