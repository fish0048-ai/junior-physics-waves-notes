---
name: junior-physics-notes
description: Converts junior-high physics lecture notes into this site's HTML workbook with inquiry teaching, frozen blanks, drills, exam banks, and a step-first lab chapter. Use when the user uploads a new chapter, Word/PDF/docx 講義, 活動紀錄本, 實驗 PDF, 段考題, 隨堂練習, or asks to add 第N章／實驗專區 the same way as chapters 3 and 4.
---

# 國中八年級理化講義製作

把上傳的課本／講義／題庫做成與第 3、4 章相同的網站。

分冊（做到哪就讀哪）：

- 探究怎麼寫：[inquiry.md](inquiry.md)
- HTML 骨架與 class：[html-templates.md](html-templates.md)
- 公式與圖表：[math.md](math.md)
- 兩層觀念補充：[extras.md](extras.md)
- 題庫與評量：[exams.md](exams.md)
- 檔名與 config：[reference.md](reference.md)
- 實驗專區（步驟為主）：[labs.md](labs.md)

範本頁：`ch4.html`、`js/config-ch4.js`、`sections/4-1.html`、`exams/4-1.html`、`review-ch4.html`。實驗專區範本：`lab.html`、`js/config-lab.js`、`sections/lab-1-2.html`。

## 何時啟動

使用者說新的一章、上傳講義、跟現在一樣做；或丟 Word／PDF／圖片／貼文／段考題、活動紀錄本、實驗專區。

## 硬規則

1. 內容不刪減，只加探究鏈。
2. 新章對齊第 4 章；不要用第 3 章的 `exam-bank.js`。
3. 講義 `input.blank` 凍成 span；探究 textarea 由 `app.js` 自動插。
4. 繁體中文。未要求不 commit／push。
5. 禁止解壓縮 docx、禁止字元碼混淆的 PowerShell。
6. 每個重點卡課文後必備兩層補充：`.extra` 國中程度、`.gifted` 國中資優（見 extras.md）。不能只抄課本。
7. 實驗專區以**步驟**為主軸：活動紀錄本每一步單獨一格 `.lab-step`，見 `labs.md`。頂欄寫「實驗專區」，不要「第 lab 章」。**不要**練習、段考前練習、章末評量（不要 `#drill`、不要 `exam`／`review`、不要 `exams/lab-*.html`、不要 `review-lab.html`）。
8. 公式與座標圖用正式數學格式，見 [math.md](math.md)。

## 工作流程

```
新章進度：
- [ ] 讀範本頁（上列五個檔）
- [ ] 列出小節、每節探究問題、主張方向（填 inquiry.md 那種表）
- [ ] 抽出定義／挖空／圖／實驗／練習／題庫（不刪）
- [ ] 新增 js/config-chN.js，並改所有現有 config 的 chapters
- [ ] 章首 chN.html：該章目錄（hero 鏈 + 探究故事段，不要 inquiry-map 清單）
- [ ] 各節 sections/N-x.html（順序見 inquiry.md；每張重點卡要有 extra＋gifted）
- [ ] 各節 exams/N-x.html + exam-chN-sections.js + exam-chN-keys.js
- [ ] review-chN.html + exam-chN.js（約 120 抽 40）
- [ ] 附圖 exams/img/N-x/，路徑 exams/img/...
- [ ] 搜尋檢查：每個 id="p2" 都還有完整 <article> 開頭
- [ ] 不要提交 _bank_extract/

活動紀錄本／實驗專區另走 labs.md（不要當普通講義寫）：
- [ ] 讀 labs.md 與 sections/lab-1-2.html
- [ ] 操作步驟全部 .lab-step，禁止收成 ol.q；假設／器材才可用 ol.q
- [ ] 每個實驗在器材表之後、動手之前有材料確認 `.lab-step`，內含 `.lab-kit` 核對表（勾到齊／完好，備註寫缺件；不要 class="blank"）
- [ ] 每步保留原句、注意、紀錄、步驟 Q、該步的圖
- [ ] toc 寫「步驟」，頁面最長區塊必須是逐步操作
- [ ] 不要 #drill、不要 exams/lab-*.html、不要 review-lab.html、config 不要 exam 也不要 review
- [ ] lab.html + js/config-lab.js；每一份 config 的 chapters 都加 nav: "實驗專區"
```

## 常見錯誤（做過的坑）

- 用取代插入 `inquiry-bridge` 時吃掉下一張卡的 `<article id="p2">`，頁面從中間爛掉。
- 章首又做 `.inquiry-map` 又做 section-cards，問題重複。
- 講義頁放「檢查作答」；挖空改回可輸入。
- 手寫探究 textarea，和 `app.js` 重複。
- 只抄課本、沒有 `.extra` 國中程度或沒有 `.gifted` 資優；兩層寫成同一句。
- keys 字串長度和題數不同，答案整節沒覆寫。
- 新章仍載入 `exam-bank.js`。
- 只改 `config-chN.js` 的 chapters，舊的 `config.js` 頂欄沒有新章。
- 實驗頁把多步收成短 `ol.q`，上課跟不做。
- 實驗專區 `chapter.id` 用 lab，卻沒設 `nav`，頂欄出現「第 lab 章」。
- 實驗專區又做出 `#drill`、各節段考前練習或章末評量。
- 材料確認沒有核對表，或把勾選做成 `class="blank"` 被凍住不能勾。

## 完成後

未要求就不要 commit。提醒平板 Ctrl+F5。使用者說推 GitHub 再 push，並給 Pages 網址。
