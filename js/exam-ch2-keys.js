/** 第 2 章各節段考答案（依題庫順序覆寫） */
(function () {
  const letter = { A: 0, B: 1, C: 2, D: 3 };
  const keys = {
    "2-1": "CBCBCBBBBCBCDCBBCBBBDBBBCBBBBBBCBBBBCBBBB",
    "2-2": "BBBCBCBABBCDABBACACACBBBABBBDBBBBCBCBBBC",
    "2-3": "BBCBBBBBCCBBCBBBBBBACBBBBBABCBCDABBBDBBB"
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
