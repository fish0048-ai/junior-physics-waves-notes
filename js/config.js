/** 第 3 章設定：之後新增小節，只要在 sections 陣列加一筆，並新增對應 HTML */
window.APP_CONFIG = {
  githubRepo: "https://github.com/fish0048-ai/junior-physics-waves-notes",
  githubPages: "https://fish0048-ai.github.io/junior-physics-waves-notes/",
  chapter: {
    id: "3",
    mark: "波",
    title: "波動與聲音",
    grade: "國中八年級理化"
  },
  home: "index.html",
  cover: { file: "cover.html", nav: "封面" },
  chapters: [
    { id: "3", title: "波動與聲音", file: "index.html" },
    { id: "4", title: "光", file: "ch4.html" },
    { id: "5", title: "溫度與熱", file: "ch5.html" }
  ],
  review: {
    id: "ch-3",
    file: "review.html",
    nav: "章末評量",
    title: "第 3 章複習評量",
    summary: "題庫 120 題，抽出 40 題　四選一"
  },
  sections: [
    {
      id: "3-1",
      title: "波的傳播",
      file: "sections/3-1.html",
      exam: "exams/3-1.html",
      ready: true,
      ask: "波傳走了什麼？是物質，還是能量？",
      summary: "振源、介質、橫波縱波、週期頻率與波速"
    },
    {
      id: "3-2",
      title: "聲波的產生與傳播",
      file: "sections/3-2.html",
      exam: "exams/3-2.html",
      ready: true,
      ask: "聲音一定要有東西幫忙傳嗎？",
      summary: "物體振動發聲、縱波、真空實驗、聲速與溫度"
    },
    {
      id: "3-3",
      title: "聲波的反射與超聲波",
      file: "sections/3-3.html",
      exam: "exams/3-3.html",
      ready: true,
      ask: "聲音碰到牆壁會消失嗎？",
      summary: "回聲、聲納測距、超聲波與次聲波"
    },
    {
      id: "3-4",
      title: "多變的聲音",
      file: "sections/3-4.html",
      exam: "exams/3-4.html",
      ready: true,
      ask: "同一首歌，樂器不同為什麼聽起來不一樣？",
      summary: "樂音三要素、共振、噪音與分貝"
    }
  ]
};
