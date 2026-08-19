/** 蝚?2 蝡?蝭畾菔?獢?靘?摨恍?摨?撖恬? */
(function () {
  const letter = { A: 0, B: 1, C: 2, D: 3 };
  const keys = {
    "2-1": "CBDBCBCBCCCDBBDDCCCAAACDAAAADDDCDACDDBDACDCCCAABAA",
    "2-2": "BBCDCADDDCCBCAADDBCDABBDBDDCBDDBADACBBACDADAACDDAD",
    "2-3": "CCCACBDCBCCBDCDBAABCCCBBBCBCCBBBDBDACABBCDDACBCDBB"
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
