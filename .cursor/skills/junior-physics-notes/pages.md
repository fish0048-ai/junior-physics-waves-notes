# PDF 頁碼

頁碼**主要給下載 PDF／列印**用；螢幕上只在章首卡片、側欄顯示編號方便對照。

## 清單

`js/book-manifest.js` 定義順序（**封面不編頁**）：

1. 第 1～6 章各小節（依 `packs`）← 從第 1 頁起
2. 實驗專區各實驗（`labs.files`）

封面永遠不出現頁碼。查詢用 `window.JPWNPages`（同檔）。

## 實作要點

| 情境 | 行為 |
|---|---|
| 螢幕 | `.page-folio { display: none }` |
| 單節「下載 PDF」 | `body` 上 `.page-folio` 文字 `— N —`（N＝整本編號），列印時 `position: fixed; bottom: 6mm; text-align: center` |
| 整本／分章 PDF | 封面段放外層、無 folio；內文包在 `.book-body`，內放一顆 `.page-folio-running`；節標題 `book-kicker` 可寫「第 N 頁」 |
| `@page` | `margin` 下緣約 `16mm`，留給頁底頁碼 |

相關檔：`css/style.css`（`@media print`）、`js/layout.js`、`js/book.js`、`js/book-pdf.js`。

## 新章檢查

- [ ] 新節已寫入 `book-manifest.js` 的 `packs`（或實驗的 `labs`）
- [ ] 單節 PDF 預覽頁底置中有 `— N —`
- [ ] 整本 PDF 每張紙頁底有連續張號，且沒有多顆 folio 疊字
