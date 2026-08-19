window.EXAM_BANK_SECTIONS = window.EXAM_BANK_SECTIONS || {};
// 1-0 與 1-1 為同一份「1-0～1-1」合併卷，章末只併 1-0＋1-2
window.EXAM_BANK_SECTIONS["ch-1"] = ["1-0", "1-2"].reduce(function (all, id) {
  return all.concat((window.EXAM_BANK_SECTIONS || {})[id] || []);
}, []);