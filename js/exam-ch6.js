window.EXAM_BANK_SECTIONS = window.EXAM_BANK_SECTIONS || {};
window.EXAM_BANK_SECTIONS["ch-6"] = ["6-1", "6-2", "6-3", "6-4"].reduce(function (all, id) {
  return all.concat((window.EXAM_BANK_SECTIONS || {})[id] || []);
}, []);
