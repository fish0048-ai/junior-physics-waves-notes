window.EXAM_BANK_SECTIONS = window.EXAM_BANK_SECTIONS || {};
window.EXAM_BANK_SECTIONS["ch-1"] = ["1-0", "1-1", "1-2"].reduce(function (all, id) {
  return all.concat((window.EXAM_BANK_SECTIONS || {})[id] || []);
}, []);
