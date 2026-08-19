/** 第 1 章段考答案（依題庫順序覆寫）
 * 1-0、1-1：出版社「1-0～1-1」合併卷；1-2：分節卷；ch-1：章末「CH1 段考前練習」整卷 120 題。
 */
(function () {
  const letter = { A: 0, B: 1, C: 2, D: 3 };
  const keys = {
    "ch-1": "BDDBCBBDBACBBCBDAADAABBBCCDABCABADAABCDCADDBBDAACDAADCDBCBCBBADCBBABDBBAADDCCACBCCACBBACADCBDDDCBDBDDDDBCDBBDCBCADCBACDD",
    "1-0": "CDDBDBCBABCDCDCABBDDBCDBDCBADCDBACADBBDCCDCCBBBACD",
    "1-1": "CDDBDBCBABCDCDCABBDDBCDBDCBADCDBACADBBDCCDCCBBBACD",
    "1-2": "ABDDBAACBCBAACCBDABBADDDBCBBCDCBACADDACCBBBCBBBDBA"
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