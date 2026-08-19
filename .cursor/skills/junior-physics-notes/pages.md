# PDF 頁碼與列印版面

## 版面（優先於花俏頁碼）

- `@page { size: A4; margin: 12mm 12mm 16mm; }` — **不要**用 `margin: 0` 再自己 absolute 疊層（會切版、錯位）
- 列印時隱藏 `.print-folio-stack`；`js/print-folios.js` 的 install 為 no-op
- 瀏覽器左下角 `file://` 路徑：請使用者取消勾選「頁首與頁尾」

## 頁碼

| 情境 | 行為 |
|---|---|
| 螢幕 | 側欄／章首顯示各節**起始頁**（`JPWNPages`） |
| PDF | `@page @bottom-center { content: counter(page) }`（Firefox 等支援；Chrome 可能無此功能，但不破壞版面） |
| 封面 | 不佔 `JPWNPages` 編號；目錄仍可從 1-0＝第 1 頁起算 |

## 禁止

- 用 absolute／fixed 沿文件高度每 297mm 塞頁碼（已證實會錯位、切字）
- `@page { margin: 0 }` 又沒把留白正確還給內容
