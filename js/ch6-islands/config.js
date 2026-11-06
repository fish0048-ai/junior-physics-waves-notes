/** 群島設定：文案摘要對齊 config-ch6 / 講義，不嵌入整篇課文 */
export const STORAGE_KEY = "jpwn.ch6islands.v1";

/** 軸向座標 (q, r) 六角格 */
export const ISLANDS = [
  {
    id: "elements",
    index: 1,
    shortTitle: "元素",
    title: "元素探索島",
    subtitle: "金屬與非金屬",
    sectionId: "6-1",
    sectionHref: "../sections/6-1.html",
    axial: [1, 0],
    color: "#f59e0b",
    accent: "#b45309",
    ask: "金、銅、硫都是「一種東西」，怎樣才叫元素？金屬和非金屬差在哪？",
    goals: [
      "說出元素的國中定義（一般化學方法無法再分解）",
      "比較金屬與非金屬的性質並舉例",
      "用電解水等證據說明「化合物不是元素」",
    ],
    mission: "把金、銅、硫、水放進正確分類區，找出誰不是元素。",
    minutes: 3,
    labelY: 1.7,
    interactive: true,
    lab: "elements",
    taskId: "elements:classify-metals",
    nextIsland: "periodic",
  },
  {
    id: "periodic",
    index: 2,
    shortTitle: "週期表",
    title: "週期表城市",
    subtitle: "週期與族",
    sectionId: "6-2",
    sectionHref: "../sections/6-2.html",
    axial: [0, 1],
    color: "#8b5cf6",
    accent: "#6d28d9",
    ask: "鈉和鉀很像、鐵卻不像，元素有沒有排隊的規律？",
    goals: [
      "在週期表上讀出原子序、符號與元素名稱",
      "說明同族元素性質相近的原因（最外層電子數）",
      "維持週期表正確的行列，不以造型取代排列",
    ],
    mission: "在週期表找出和鈉同一族的元素，說明鐵為什麼不同。",
    minutes: 3,
    labelY: 1.45,
    interactive: true,
    lab: "periodic",
    taskId: "periodic:alkali-vs-iron",
    nextIsland: "atom",
  },
  {
    id: "atom",
    index: 3,
    shortTitle: "原子",
    title: "原子研究所",
    subtitle: "質子、中子、電子",
    sectionId: "6-3",
    sectionHref: "../sections/6-3.html#p2",
    axial: [-1, 1],
    color: "#3b82f6",
    accent: "#1d4ed8",
    ask: "水能拆成氫和氧，最小單位是原子嗎？原子裡面還有什麼？",
    goals: [
      "調整質子、中子、電子並讀出原子序 Z、質量數 A、電荷",
      "區分中性原子與離子（質子數不變、電子數改變）",
      "理解模型為教學示意，電子環不是真實軌道",
    ],
    mission: "調整質子、中子、電子，組出中性的碳-12 原子。",
    minutes: 4,
    labelY: 2.5,
    interactive: true,
    lab: "atom",
    taskId: "atom:neutral-carbon-12",
    nextIsland: "decompose",
  },
  {
    id: "decompose",
    index: 4,
    shortTitle: "分解",
    title: "物質分解實驗島",
    subtitle: "化合物 vs 元素",
    sectionId: "6-3",
    sectionHref: "../sections/6-3.html#p1",
    axial: [-1, 0],
    color: "#ef4444",
    accent: "#b91c1c",
    ask: "化合物加熱、照光或通電能分解嗎？元素呢？",
    goals: [
      "對照氧化汞分解與通電分解水的概念",
      "說明化合物可分解、元素在一般化學變化中不再分解",
      "在模擬中觀察反應物與產物粒子種類",
    ],
    mission: "用模擬器測試氧化汞、水、汞能不能再分解。",
    minutes: 4,
    labelY: 1.8,
    interactive: true,
    lab: "decompose",
    taskId: "decompose:compound-vs-element",
    nextIsland: "molecule",
  },
  {
    id: "molecule",
    index: 5,
    shortTitle: "分子",
    title: "分子組裝工坊",
    subtitle: "化學式與分子",
    sectionId: "6-4",
    sectionHref: "../sections/6-4.html#p1",
    axial: [0, -1],
    color: "#10b981",
    accent: "#047857",
    ask: "分子是什麼？下標代表什麼？",
    goals: [
      "用原子組成 H₂O、O₂、CO₂ 等分子並讀化學式",
      "說明分子可以是元素（O₂）或化合物（H₂O）",
      "知道離子化合物不宜只用「分子模型」解釋",
    ],
    mission: "用原子組出 O₂、H₂O、CO₂，讀懂化學式的下標。",
    minutes: 4,
    labelY: 1.55,
    interactive: true,
    lab: "molecule",
    taskId: "molecule:build-three",
    nextIsland: "classify",
  },
  {
    id: "classify",
    index: 6,
    shortTitle: "分類",
    title: "物質分類挑戰島",
    subtitle: "混合物與純物質",
    sectionId: "6-4",
    sectionHref: "../sections/6-4.html#p1",
    axial: [1, -1],
    color: "#ec4899",
    accent: "#be185d",
    ask: "空氣裡一堆小球，怎樣分混合物、元素、化合物？",
    goals: [
      "用粒子圖判斷混合物、元素、化合物",
      "區分單原子元素、雙原子分子與化合物",
      "完成預測→操作→解釋流程",
    ],
    mission: "判斷四張粒子圖是混合物、元素還是化合物。",
    minutes: 3,
    labelY: 1.8,
    interactive: true,
    lab: "classify",
    taskId: "classify:particle-diagrams",
    nextIsland: "elements",
  },
];

function quizStage(section, topic) {
  return {
    id: "quiz",
    kind: "quiz",
    title: "挑戰題",
    desc: `從 ${section} 隨堂練習題庫抽 5 題，答對 4 題點亮星星。`,
    section,
    topic,
  };
}

/** 探索任務之後的關卡：實驗內容取自講義，題目取自 exam-ch6-sections.js */
const STAGE_PLAN = {
  elements: [
    {
      id: "exp",
      kind: "lab",
      lab: "exp61",
      title: "實驗 6-1 元素性質的探索與分類",
      desc: "用砂紙、燈泡、鐵鎚檢驗五種樣品，再依結果分類。",
      source: "../sections/6-1.html#exp",
    },
    quizStage("6-1", "金屬|非金屬|元素|符號|汞|溴|石墨|光澤|導電|延展|波以耳|拉瓦節"),
  ],
  periodic: [
    {
      id: "exp",
      kind: "lab",
      lab: "alkali",
      title: "鈉、鉀、鐵的比較（模擬）",
      desc: "觀察質地、放入水中、滴酚酞，比較三種金屬的性質。",
      source: "../sections/6-2.html#p1",
    },
    quizStage("6-2", "週期|族|鹼|鈍氣|門得列夫|鈉|鉀|鹵素"),
  ],
  atom: [quizStage("6-3", "質子|中子|電子|原子序|質量數|同位素|原子核|離子|拉塞福|湯姆森|查兌克")],
  decompose: [quizStage("6-3", "分解|化合物|氧化汞|道耳頓|原子說|電解|拉瓦節|普利士利|元素")],
  molecule: [quizStage("6-4", "化學式|分子|下標|原子數|亞佛加厥")],
  classify: [quizStage("6-4", "混合物|純物質|化合物|元素|粒子")],
};

/** 島嶼事件取自該重點卡的「探究線索」（執行時從講義讀取） */
const EVENTS = {
  elements: { section: "6-1", card: "#p1" },
  periodic: { section: "6-2", card: "#p1" },
  atom: { section: "6-3", card: "#p2" },
  decompose: { section: "6-3", card: "#p1" },
  molecule: { section: "6-4", card: "#p2" },
  classify: { section: "6-4", card: "#p1" },
};

/** 配對內容皆對照講義原文；ref 為講義錨點 */
const PAIRS = {
  elements: [
    { title: "元素名稱與符號", ref: "../sections/6-1.html#p3", pairs: [["金", "Au"], ["銀", "Ag"], ["銅", "Cu"], ["鐵", "Fe"], ["汞", "Hg"]] },
    { title: "特別的元素", ref: "../sections/6-1.html#p2", pairs: [["液態金屬", "汞"], ["液態非金屬", "溴"], ["能導電的非金屬", "石墨"], ["導電性最好的金屬", "銀"]] },
  ],
  periodic: [
    { title: "週期表怎麼排", ref: "../sections/6-2.html#p2", pairs: [["橫列", "週期"], ["直行", "族"], ["門得列夫", "依質量排出週期表"]] },
    { title: "族的名稱", ref: "../sections/6-2.html#p2", pairs: [["第 1 族（氫除外）", "鹼金屬"], ["第 2 族", "鹼土金屬"], ["第 18 族", "鈍氣"]] },
  ],
  atom: [
    { title: "科學家與發現", ref: "../sections/6-3.html#p2", pairs: [["道耳頓", "提出原子說"], ["湯姆森", "發現電子"], ["拉塞福", "發現原子核"], ["查兌克", "發現中子"]] },
    { title: "原子裡的粒子", ref: "../sections/6-3.html#p2", pairs: [["質子", "帶正電"], ["中子", "不帶電"], ["電子", "帶負電"], ["原子序", "等於質子數"]] },
  ],
  decompose: [
    {
      title: "分解與定義",
      ref: "../sections/6-3.html#p1",
      pairs: [
        ["氧化汞", "照光分解成汞和氧"],
        ["水", "通電分解成氫和氧"],
        ["化合物", "可用加熱、光照或通電再分解"],
        ["元素", "不能用一般化學方法再分解"],
        ["拉瓦節", "把這種氣體命名為氧"],
      ],
    },
  ],
  molecule: [
    { title: "物質與化學式", ref: "../sections/6-4.html#p1", pairs: [["氧氣", "O<sub>2</sub>"], ["臭氧", "O<sub>3</sub>"], ["水", "H<sub>2</sub>O"], ["二氧化碳", "CO<sub>2</sub>"], ["氦氣", "He"]] },
    { title: "分子與化學式", ref: "../sections/6-4.html#p2", pairs: [["亞佛加厥", "提出分子的概念"], ["分子", "能表現純物質化學性質的最小粒子"], ["化學式的下標", "表示原子數（1 可省略）"]] },
  ],
  classify: [
    { title: "這是哪一類？", ref: "../sections/6-4.html#p1", pairs: [["空氣", "混合物"], ["氧氣", "元素"], ["二氧化碳", "化合物"], ["氦氣", "以單原子存在的元素"]] },
    { title: "分類的定義", ref: "../sections/6-4.html#p1", pairs: [["混合物", "兩種以上純物質混合"], ["元素", "同一種原子組成的純物質"], ["化合物", "不同種原子以固定比例結合"]] },
  ],
};

ISLANDS.forEach((island) => {
  island.event = EVENTS[island.id];
  const [first, ...rest] = STAGE_PLAN[island.id];
  const quiz = rest.length ? rest[rest.length - 1] : first;
  const middle = rest.length ? [first, ...rest.slice(0, -1)] : [];
  island.stages = [
    { id: "task", kind: "lab", lab: island.lab, title: "探索任務", desc: island.mission, taskId: island.taskId },
    ...middle,
    {
      id: "match",
      kind: "match",
      title: "配對挑戰",
      desc: "把名詞和特徵配成一對，錯誤 3 次以內點亮星星。",
      groups: PAIRS[island.id],
    },
    quiz,
  ].map((stage) => (stage.taskId ? stage : { ...stage, taskId: `${island.id}:${stage.id}` }));
});

export const EXAM_BOAT = {
  title: "會考小船",
  count: 5,
  passRate: 0.8,
};

export const ALL_STAGES = ISLANDS.flatMap((island) => island.stages);

export const LIGHTHOUSE = {
  title: "燈塔總挑戰",
  sections: ["6-1", "6-2", "6-3", "6-4"],
  count: 10,
};

export function stageById(island, stageId) {
  return island?.stages.find((s) => s.id === stageId) || null;
}

export const ELEMENTS_Z20 = {
  1: { sym: "H", name: "氫" },
  2: { sym: "He", name: "氦" },
  3: { sym: "Li", name: "鋰" },
  4: { sym: "Be", name: "鈹" },
  5: { sym: "B", name: "硼" },
  6: { sym: "C", name: "碳" },
  7: { sym: "N", name: "氮" },
  8: { sym: "O", name: "氧" },
  9: { sym: "F", name: "氟" },
  10: { sym: "Ne", name: "氖" },
  11: { sym: "Na", name: "鈉" },
  12: { sym: "Mg", name: "鎂" },
  13: { sym: "Al", name: "鋁" },
  14: { sym: "Si", name: "矽" },
  15: { sym: "P", name: "磷" },
  16: { sym: "S", name: "硫" },
  17: { sym: "Cl", name: "氯" },
  18: { sym: "Ar", name: "氬" },
  19: { sym: "K", name: "鉀" },
  20: { sym: "Ca", name: "鈣" },
};

export function axialToWorld(q, r, size = 2.8) {
  const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const z = size * ((3 / 2) * r);
  return { x, z };
}

export function islandById(id) {
  return ISLANDS.find((i) => i.id === id) || null;
}
