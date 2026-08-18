/** 實驗專區：第三冊活動紀錄本實驗，依課本實驗編號分節 */
window.APP_CONFIG = {
  githubRepo: "https://github.com/fish0048-ai/junior-physics-waves-notes",
  githubPages: "https://fish0048-ai.github.io/junior-physics-waves-notes/",
  chapter: {
    id: "lab",
    mark: "實",
    title: "實驗專區",
    nav: "實驗專區",
    grade: "國中八年級理化"
  },
  home: "lab.html",
  cover: { file: "cover.html", nav: "封面" },
  chapters: [
    { id: "3", title: "波動與聲音", file: "index.html" },
    { id: "4", title: "光", file: "ch4.html" },
    { id: "5", title: "溫度與熱", file: "ch5.html" },
    { id: "6", title: "探索物質組成", file: "ch6.html" },
    { id: "lab", title: "實驗專區", file: "lab.html", nav: "實驗專區" }
  ],
  sections: [
    {
      id: "1-2",
      title: "質量與體積的關係",
      file: "sections/lab-1-2.html",
      ready: true,
      ask: "同樣一杯，水和酒精的質量會一樣嗎？未知金屬塊要怎麼認？",
      summary: "天平、量筒、密度比值、質量－體積圖"
    },
    {
      id: "2-1",
      title: "混合物的分離",
      file: "sections/lab-2-1.html",
      ready: true,
      ask: "食鹽和沙子混在一起，加水再過濾，為什麼能分開？",
      summary: "溶解、過濾、蒸發結晶、濾紙與紗布"
    },
    {
      id: "2-3",
      title: "氧氣的製備及性質",
      file: "sections/lab-2-3.html",
      ready: true,
      ask: "空氣和氧氣都無色，線香怎麼分辨哪一瓶是氧氣？",
      summary: "雙氧水、二氧化錳、排水集氣、助燃"
    },
    {
      id: "4-3",
      title: "透鏡的成像觀察",
      file: "sections/lab-4-3.html",
      ready: true,
      ask: "紙屏接得到的是實像還虛像？物體靠近時，像會變大還變小？",
      summary: "焦距、物距像距、凸透鏡凹透鏡成像"
    },
    {
      id: "4-5",
      title: "色光與顏色的關係",
      file: "sections/lab-4-5.html",
      ready: true,
      ask: "紅光照到白紙和綠紙，看起來會一樣嗎？",
      summary: "暗箱、色紙、吸收與反射"
    },
    {
      id: "5-1",
      title: "溫度計的原理",
      file: "sections/lab-5-1.html",
      ready: true,
      ask: "自製溫度計放進冰水和熱水，液柱會往哪邊走？",
      summary: "錐形瓶、細管、熱脹冷縮、靈敏度"
    },
    {
      id: "5-2",
      title: "熱量與物質溫度變化",
      file: "sections/lab-5-2.html",
      ready: true,
      ask: "加熱時間、質量、物質種類，哪一個會改變升溫快慢？",
      summary: "變因、水和甘油、ΔT－時間圖"
    },
    {
      id: "6-1",
      title: "元素性質的探索與分類",
      file: "sections/lab-6-1.html",
      ready: true,
      ask: "鐵、鋅、銅、石墨、硫，哪些算金屬？石墨為什麼難分？",
      summary: "光澤、導電、延展、金屬與非金屬"
    }
  ]
};
