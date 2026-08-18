/** 第 4 章設定：之後新增小節，只要在 sections 陣列加一筆，並新增對應 HTML */
window.APP_CONFIG = {
  githubRepo: "https://github.com/fish0048-ai/junior-physics-waves-notes",
  githubPages: "https://fish0048-ai.github.io/junior-physics-waves-notes/",
  chapter: {
    id: "4",
    mark: "光",
    title: "光",
    grade: "國中八年級理化"
  },
  home: "ch4.html",
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
    id: "ch-4",
    file: "review-ch4.html",
    nav: "章末評量",
    title: "第 4 章複習評量",
    summary: "題庫 120 題，抽出 40 題　四選一"
  },
  sections: [
    {
      id: "4-1",
      title: "光的傳播與光速",
      file: "sections/4-1.html",
      exam: "exams/4-1.html",
      ready: true,
      ask: "光是彎著走，還是直直走？",
      summary: "直線前進、針孔成像、影子與光速"
    },
    {
      id: "4-2",
      title: "光的反射與面鏡",
      file: "sections/4-2.html",
      exam: "exams/4-2.html",
      ready: true,
      ask: "鏡子裡的人是真的在鏡子後面嗎？",
      summary: "反射定律、平面鏡、凸面鏡與凹面鏡"
    },
    {
      id: "4-3",
      title: "光的折射與透鏡",
      file: "sections/4-3.html",
      exam: "exams/4-3.html",
      ready: true,
      ask: "泳池為什麼看起來比較淺？",
      summary: "折射、三稜鏡、凸透鏡與凹透鏡成像"
    },
    {
      id: "4-4",
      title: "光學儀器",
      file: "sections/4-4.html",
      exam: "exams/4-4.html",
      ready: true,
      ask: "顯微鏡、相機、眼睛，是不是同一套成像邏輯？",
      summary: "顯微鏡、照相機、眼睛與眼鏡"
    },
    {
      id: "4-5",
      title: "光與顏色",
      file: "sections/4-5.html",
      exam: "exams/4-5.html",
      ready: true,
      ask: "白光裡真的藏著彩虹嗎？",
      summary: "色散、物體顏色、色光與色料三原色"
    }
  ]
};
