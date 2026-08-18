window.EXAM_BANK_SECTIONS = window.EXAM_BANK_SECTIONS || {};
window.EXAM_BANK_SECTIONS["ch-2"] = ["2-1", "2-2", "2-3"].reduce(function (all, id) {
  return all.concat((window.EXAM_BANK_SECTIONS || {})[id] || []);
}, []);
