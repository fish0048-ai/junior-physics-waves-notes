# PDF 頁碼

頁碼**主要給下載 PDF／列印**用；螢幕上只在章首卡片、側欄顯示「該節起始頁」方便對照。

## 清單

`js/book-manifest.js` 定義順序（**封面不編頁**）：

1. 第 1～6 章各小節（依 `packs`）← 從第 1 頁起
2. 實驗專區各實驗（`labs.files`）

封面永遠不出現頁碼。查詢用 `window.JPWNPages`（同檔）。

## 實作要點

| 情境 | 行為 |
|---|---|
| 螢幕 | 側欄／卡片顯示**起始頁**；不顯示大頁碼 |
| 單節「下載 PDF」 | 從該節起始頁起，**每一張紙遞增**（如 1-1 起始為 2，則 2、3、4…） |
| 整本／分章 PDF | 封面無頁碼；內文用 `js/print-folios.js` 沿高度每隔一張 A4 放一個號碼 |
| `@page` | 必須 `margin: 0`（避免瀏覽器印出 file:// 路徑）；留白用內容 padding |

相關檔：`js/print-folios.js`、`css/style.css`、`js/layout.js`、`js/app.js`、`js/book-pdf.js`。

## 新章檢查

- [ ] 新節已寫入 `book-manifest.js` 的 `packs`（或實驗的 `labs`）
- [ ] 單節 PDF 多頁時頁碼會遞增，不是整節同一個數字
- [ ] 封面無頁碼
