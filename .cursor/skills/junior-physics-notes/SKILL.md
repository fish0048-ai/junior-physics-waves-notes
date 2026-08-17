---
name: junior-physics-notes
description: Converts junior-high physics lecture notes into this site's HTML workbook with inquiry teaching, frozen blanks, drills, and exam banks. Use when the user uploads a new chapter, Word/PDF/docx 講義, 段考題, 隨堂練習, or asks to add 第N章 the same way as chapters 3 and 4.
---

# 國中八年級理化講義製作

把上傳的課本／講義／題庫做成與第 3、4 章相同的網站。

分冊（做到哪就讀哪）：

- 探究怎麼寫：[inquiry.md](inquiry.md)
- HTML 骨架與 class：[html-templates.md](html-templates.md)
- 題庫與評量：[exams.md](exams.md)
- 檔名與 config：[reference.md](reference.md)

範本頁：`ch4.html`、`js/config-ch4.js`、`sections/4-1.html`、`exams/4-1.html`、`review-ch4.html`。

## 何時啟動

使用者說新的一章、上傳講義、跟現在一樣做；或丟 Word／PDF／圖片／貼文／段考題。

## 硬規則

1. 內容不刪減，只加探究鏈。
2. 新章對齊第 4 章；不要用第 3 章的 `exam-bank.js`。
3. 講義 `input.blank` 凍成 span；探究 textarea 由 `app.js` 自動插。
4. 繁體中文。未要求不 commit／push。
5. 禁止解壓縮 docx、禁止字元碼混淆的 PowerShell。

## 工作流程

```
新章進度：
- [ ] 讀範本頁（上列五個檔）
- [ ] 列出小節、每節探究問題、主張方向（填 inquiry.md 那種表）
- [ ] 抽出定義／挖空／圖／實驗／練習／題庫（不刪）
- [ ] 新增 js/config-chN.js，並改所有現有 config 的 chapters
- [ ] 章首 chN.html：該章目錄（hero 鏈 + 探究故事段，不要 inquiry-map 清單）
- [ ] 各節 sections/N-x.html（順序見 inquiry.md）
- [ ] 各節 exams/N-x.html + exam-chN-sections.js + exam-chN-keys.js
- [ ] review-chN.html + exam-chN.js（約 120 抽 40）
- [ ] 附圖 exams/img/N-x/，路徑 exams/img/...
- [ ] 搜尋檢查：每個 id="p2" 都還有完整 <article> 開頭
- [ ] 不要提交 _bank_extract/
```

## 常見錯誤（做過的坑）

- 用取代插入 `inquiry-bridge` 時吃掉下一張卡的 `<article id="p2">`，頁面從中間爛掉。
- 章首又做 `.inquiry-map` 又做 section-cards，問題重複。
- 講義頁放「檢查作答」；挖空改回可輸入。
- 手寫探究 textarea，和 `app.js` 重複。
- keys 字串長度和題數不同，答案整節沒覆寫。
- 新章仍載入 `exam-bank.js`。
- 只改 `config-chN.js` 的 chapters，舊的 `config.js` 頂欄沒有新章。

## 完成後

未要求就不要 commit。提醒平板 Ctrl+F5。使用者說推 GitHub 再 push，並給 Pages 網址。
