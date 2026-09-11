/** 把現行章 config 改成「練習專區」導覽（須在 config 之後、layout 之前載入） */
(function () {
  const cfg = window.APP_CONFIG;
  if (!cfg || !cfg.chapter) return;
  const id = String(cfg.chapter.id || "");
  if (!id || id === "lab" || id === "practice") return;

  cfg.practiceHome = "practice.html";
  cfg.home = `practice-ch${id}.html`;
  cfg.chapter.nav = cfg.chapter.nav || `第 ${id} 章練習`;
  document.body.dataset.mode = "practice";

  cfg.chapters = (cfg.chapters || [])
    .filter((c) => String(c.id) !== "lab")
    .map((c) => {
      const cid = String(c.id);
      return {
        id: c.id,
        title: c.title,
        nav: c.nav || `第 ${cid} 章`,
        file: `practice-ch${cid}.html`
      };
    });
})();
