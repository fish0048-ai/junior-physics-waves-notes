(function () {
  const LS = "jpwn.student";
  const $ = (id) => document.getElementById(id);

  function readStudent() {
    try {
      const raw = JSON.parse(localStorage.getItem(LS) || "{}");
      return {
        className: String(raw.className || ""),
        name: String(raw.name || ""),
        seat: String(raw.seat || "")
      };
    } catch (err) {
      return { className: "", name: "", seat: "" };
    }
  }

  function writeStudent(data) {
    localStorage.setItem(LS, JSON.stringify({
      className: data.className || "",
      name: data.name || "",
      seat: data.seat || ""
    }));
  }

  function currentClassName() {
    try {
      const id = localStorage.getItem("jpwn.classId") || "";
      const list = JSON.parse(localStorage.getItem("jpwn.classes") || "[]");
      const hit = Array.isArray(list) ? list.find((c) => c && c.id === id) : null;
      if (hit && hit.name && hit.name !== "預設班級") return hit.name;
    } catch (err) {
      /* ignore */
    }
    return "";
  }

  function fill() {
    const data = readStudent();
    if (!data.className) data.className = currentClassName();
    const cls = $("cover-class");
    const name = $("cover-name");
    const seat = $("cover-seat");
    if (cls) cls.value = data.className;
    if (name) name.value = data.name;
    if (seat) seat.value = data.seat;
  }

  function save() {
    writeStudent({
      className: $("cover-class")?.value.trim() || "",
      name: $("cover-name")?.value.trim() || "",
      seat: $("cover-seat")?.value.trim() || ""
    });
    const hint = $("cover-hint");
    if (hint) hint.textContent = "已記住。換頁或列印封面都會帶著這筆資料。";
  }

  fill();
  $("cover-form")?.addEventListener("submit", (e) => e.preventDefault());
  ["cover-class", "cover-name", "cover-seat"].forEach((id) => {
    $(id)?.addEventListener("input", save);
  });
  window.addEventListener("jpwn-class-change", () => {
    const cls = $("cover-class");
    if (cls && !cls.value.trim()) {
      cls.value = currentClassName();
      save();
    }
  });
})();
