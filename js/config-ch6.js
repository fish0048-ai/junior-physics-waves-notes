/** 第 6 章設定：之後新增小節，只要在 sections 陣列加一筆，並新增對應 HTML */
window.APP_CONFIG = {
  githubRepo: "https://github.com/fish0048-ai/junior-physics-waves-notes",
  githubPages: "https://fish0048-ai.github.io/junior-physics-waves-notes/",
  chapter: {
    id: "6",
    mark: "質",
    title: "探索物質組成",
    grade: "國中八年級理化"
  },
  home: "ch6.html",
  cover: { file: "cover.html", nav: "封面" },
  chapters: [
    { id: "3", title: "波動與聲音", file: "index.html" },
    { id: "4", title: "光", file: "ch4.html" },
    { id: "5", title: "溫度與熱", file: "ch5.html" },
    { id: "6", title: "探索物質組成", file: "ch6.html" },
    { id: "lab", title: "實驗專區", file: "lab.html", nav: "實驗專區" }
  ],
  review: {
    id: "ch-6",
    file: "review-ch6.html",
    nav: "章末評量",
    title: "第 6 章複習評量",
    summary: "題庫 120 題，抽出 40 題　四選一"
  },
  sections: [
    {
      id: "6-1",
      title: "元素的探索",
      file: "sections/6-1.html",
      exam: "exams/6-1.html",
      ready: true,
      ask: "金、銅、硫都是「一種東西」，怎樣才叫元素？金屬和非金屬差在哪？",
      summary: "元素歷史、金屬與非金屬、符號與生活應用"
    },
    {
      id: "6-2",
      title: "元素週期表",
      file: "sections/6-2.html",
      exam: "exams/6-2.html",
      ready: true,
      ask: "鈉和鉀很像、鐵卻不像，元素有沒有排隊的規律？",
      summary: "門得列夫、週期與族、鹼金屬與鈍氣"
    },
    {
      id: "6-3",
      title: "化合物與原子概念的發展",
      file: "sections/6-3.html",
      exam: "exams/6-3.html",
      ready: true,
      ask: "水能拆成氫和氧，最小單位是原子嗎？原子裡面還有什麼？",
      summary: "原子說、化合物、原子序與同位素"
    },
    {
      id: "6-4",
      title: "分子與化學式",
      file: "sections/6-4.html",
      exam: "exams/6-4.html",
      ready: true,
      ask: "空氣裡一堆小球，怎樣分混合物、元素、化合物？化學式怎麼寫？",
      summary: "分子、純物質分類、化學式寫法"
    }
  ]
};
