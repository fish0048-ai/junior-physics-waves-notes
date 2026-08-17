/** 第 4 章各節段考答案（依題庫順序覆寫，補齊題組與全形Ｃ） */
(function () {
  const letter = { A: 0, B: 1, C: 2, D: 3 };
  const keys = {
    "4-1": "BCCCACCBBBCDBBDBAABBCABBDDDCBDCABBDAADDACBBABABAB",
    "4-2": "DCCCACABBBABADAAAACACCBACABCCAAACBABBCBBABCDAACBA",
    "4-3": "CCADCBCDACBCDCBBADDABBBDAABBDCACDDBABCADADBDCAB",
    "4-4": "CDACCDCBACBABCBCBCBCDDAADACBBCBBADAABADBAADDBB",
    "4-5": "BCDCACBCDCADACCACBBCCBCBABABBDACCACCCCCBCACADCAABB"
  };
  const bank = window.EXAM_BANK_SECTIONS || {};
  Object.keys(keys).forEach((sec) => {
    const list = bank[sec];
    const seq = keys[sec];
    if (!list || list.length !== seq.length) return;
    list.forEach((item, i) => {
      const a = letter[seq.charAt(i)];
      if (a >= 0) item.ans = a;
    });
  });
})();
