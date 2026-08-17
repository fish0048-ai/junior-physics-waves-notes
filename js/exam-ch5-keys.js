/** 第 5 章各節段考答案（依題庫順序覆寫） */
(function () {
  const letter = { A: 0, B: 1, C: 2, D: 3 };
  const keys = {
    "5-1": "CBDADBADBBDCCDBDAACDDCDDABABABBBADCBBBDBCAABABBACC",
    "5-2": "CDACBAADADDCCDCCCAADCBCCADACCDDCAABBDCDACADBCAABBA",
    "5-3": "DCBCBACAABAABBAADADABBDBACDCCCDBACBDCBCADDCBBBCBCD",
    "5-4": "CCACAABBBCCCCCBCCCBCDDCDCCBBCBCBBABAABAABABBABADBC"
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