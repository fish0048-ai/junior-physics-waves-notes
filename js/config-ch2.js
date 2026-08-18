/** 第 2 章設定：之後新增小節，只要在 sections 陣列加一筆，並新增對應 HTML */
window.APP_CONFIG = {
  githubRepo: "https://github.com/fish0048-ai/junior-physics-waves-notes",
  githubPages: "https://fish0048-ai.github.io/junior-physics-waves-notes/",
  chapter: {
    id: "2",
    mark: "物",
    title: "物質的世界",
    grade: "國中八年級理化"
  },
  home: "ch2.html",
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
    id: "ch-2",
    file: "review-ch2.html",
    nav: "章末評量",
    title: "第 2 章複習評量",
    summary: "題庫 120 題，抽出 40 題　四選一"
  },
  sections: [
    {
      id: "2-1",
      title: "認識物質",
      file: "sections/2-1.html",
      exam: "exams/2-1.html",
      ready: true,
      ask: "冰塊、糖水、鐵生鏽，哪個還是「原來那個東西」？",
      summary: "三態、物理與化學變化、純物質與混合物、分離"
    },
    {
      id: "2-2",
      title: "水溶液",
      file: "sections/2-2.html",
      exam: "exams/2-2.html",
      ready: true,
      ask: "糖水為什麼有的很甜、有的淡？加到不能再溶又是怎麼回事？",
      summary: "溶質溶劑、濃度、溶解度、擴散與飽和"
    },
    {
      id: "2-3",
      title: "空氣的組成",
      file: "sections/2-3.html",
      exam: "exams/2-3.html",
      ready: true,
      ask: "吸進去的空氣裡，最多的是氧氣嗎？線香怎麼分辨哪一瓶是氧氣？",
      summary: "乾空氣比例、氮氧氬、氧氣與二氧化碳製備"
    }
  ]
};
