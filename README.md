# 國中八年級理化講義

第 3 章（波動與聲音）與第 4 章（光）的探究式挖空講義網站。之後新章請依同一套方法製作。

Cursor 製作規範（之後新章請整套遵守）：

- `.cursor/skills/junior-physics-notes/SKILL.md`（流程）
- `.cursor/skills/junior-physics-notes/inquiry.md`（探究）
- `.cursor/skills/junior-physics-notes/html-templates.md`（樣板）
- `.cursor/skills/junior-physics-notes/exams.md`（題庫）
- `.cursor/skills/junior-physics-notes/reference.md`（檔名）
- `.cursor/rules/jpwn-*.mdc`

## GitHub

- 倉庫：<https://github.com/fish0048-ai/junior-physics-waves-notes>
- 網頁：<https://fish0048-ai.github.io/junior-physics-waves-notes/>

## 資料夾

```
index.html / ch4.html   章首
css/style.css           全站樣式
js/config.js            第 3 章小節清單
js/config-ch4.js        第 4 章小節清單
js/layout.js            頂欄、章節導覽、章首卡片
js/app.js               挖空、探究填答、PDF
sections/               各節講義
exams/                  各節段考頁與附圖
review.html             第 3 章章末評量
review-ch4.html         第 4 章章末評量
```

## 之後要加新章／小節

請依 `.cursor/skills/junior-physics-notes/SKILL.md`：複製第 4 章檔案結構，不刪原文，補上探究鏈。頂欄由 `js/layout.js` 產生，不必每頁重貼。

頂欄按鈕（顯示答案、PDF）由 `js/layout.js` 統一產生，不必在每個小節重複貼一次。

## 使用方式

1. 開啟 `index.html`（或 GitHub Pages），點小節進入。
2. 點綠色空格可顯示該格答案；可下載 PDF（列印視窗選「另存為 PDF」）。
3. 頂欄「整本講義」會另開分頁合成封面＋第 1～6 章。合成完不會自動下載，要再按「下載整本 PDF」（列印選「另存為 PDF」）。合成時請留著該分頁；其他講義可另開分頁看。實驗專區可勾選附加在最後。
