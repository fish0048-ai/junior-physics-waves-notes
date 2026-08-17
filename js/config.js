/** 第 3 章設定：之後新增小節，只要在 sections 陣列加一筆，並新增對應 HTML */
window.APP_CONFIG = {
  githubRepo: "https://github.com/fish0048-ai/junior-physics-waves-notes",
  githubPages: "https://fish0048-ai.github.io/junior-physics-waves-notes/",
  chapter: {
    id: "3",
    title: "波動與聲音",
    grade: "國中八年級理化"
  },
  home: "index.html",
  review: {
    id: "ch-3",
    file: "review.html",
    nav: "章末評量",
    title: "第 3 章大型複習評量",
    summary: "全章 3-1～3-4　四選一　較難段考程度"
  },
  sections: [
    {
      id: "3-1",
      title: "波的傳播",
      file: "sections/3-1.html",
      exam: "exams/3-1.html",
      ready: true,
      summary: "振源、介質、橫波縱波、週期頻率與波速"
    },
    {
      id: "3-2",
      title: "聲波的產生與傳播",
      file: "sections/3-2.html",
      exam: "exams/3-2.html",
      ready: true,
      summary: "物體振動發聲、縱波、真空實驗、聲速與溫度"
    },
    {
      id: "3-3",
      title: "聲波的反射與超聲波",
      file: "sections/3-3.html",
      exam: "exams/3-3.html",
      ready: true,
      summary: "回聲、聲納測距、超聲波與次聲波"
    },
    {
      id: "3-4",
      title: "多變的聲音",
      file: "sections/3-4.html",
      exam: "exams/3-4.html",
      ready: true,
      summary: "樂音三要素、共振、噪音與分貝"
    }
  ]
};
