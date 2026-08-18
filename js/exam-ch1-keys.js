/** 第 1 章各節段考答案（依題庫順序覆寫） */
(function () {
  const letter = { A: 0, B: 1, C: 2, D: 3 };
  const keys = {
    "1-0": "BCDCBBBBCDBCBBBBBBBBBBBBBBBBBBBBBDBBCBAB",
    "1-1": "BBBBBDBBCBBCBBBCCBBCABBBBBABBCCDDBBBCCBB",
    "1-2": "BBBCBBBBBBBBBBBBBCABDCACBBABBBAABBBABCBB"
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
