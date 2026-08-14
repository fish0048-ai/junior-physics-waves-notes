# 國中八年級理化｜第 3 章 波動與聲音　挖空講義

依小節拆開維護，避免全部塞在同一個網頁。

## GitHub

- 倉庫：<https://github.com/fish0048-ai/junior-physics-waves-notes>
- 網頁：<https://fish0048-ai.github.io/junior-physics-waves-notes/>

## 資料夾

```
index.html              第 3 章目錄（章首）
css/style.css           全站樣式
js/config.js            小節清單（新增小節改這裡）
js/layout.js            共用頂欄、章節導覽
js/app.js               挖空、點空格看答案、下載 PDF
sections/3-1.html       3-1 波的傳播（已完成）
sections/3-2.html       3-2 聲波（待補）
sections/3-3.html       3-3 樂音（待補）
sections/3-4.html       3-4 噪音與聲音的應用（待補）
```

## 之後要加／改小節

1. 複製 `sections/3-2.html` 成新檔，或直接編輯 3-2～3-4。
2. 講義本文寫在該檔的 `<div class="wrap workbook">` 裡（挖空用 `<input class="blank" data-answer="答案">`）。
3. 若標題要改，同步改 `js/config.js` 的 `sections` 陣列。
4. 完成後把該小節的 `ready` 改成 `true`。

頂欄按鈕（顯示答案、PDF）由 `js/layout.js` 統一產生，不必在每個小節重複貼一次。

## 使用方式

1. 開啟 `index.html`（或 GitHub Pages），點小節進入。
2. 點綠色空格可顯示該格答案；可下載 PDF（列印視窗選「另存為 PDF」）。
