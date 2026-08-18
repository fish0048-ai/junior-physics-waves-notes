/** 第 6 章各節段考答案（依題庫順序覆寫） */
(function () {
  const letter = { A: 0, B: 1, C: 2, D: 3 };
  const keys = {
    "6-1": "BBBDCBCBBDBCBBCDDCBBCCCCBBDBBB",
    "6-2": "CBBCBDCBBBBCCBBBBBDBBBBBBBBBBB",
    "6-3": "BBBCBBCABCCBBBACCBBBBBBCCADBAC",
    "6-4": "BBBBBBBABBBBADBBCBCBDABBBBCCAA"
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
