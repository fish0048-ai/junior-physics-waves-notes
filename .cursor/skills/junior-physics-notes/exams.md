# 題庫與評量

新章完全跟第 4 章。第 3 章多一層舊檔，不要複製那套。

**實驗專區不要套用本檔**：不要做 `exams/lab-*.html`、不要 `review-lab.html`、不要各節 `#drill`。見 [labs.md](labs.md)。

**人工 vs AI 完整步驟**見 [workflow.md](workflow.md) §4。摘要：

| 人工交 | AI 做 |
|--------|--------|
| `題目卷.htm`＋`.files`、答案卷／解析卷（docx 可） | 拷圖、Word COM 抽 ans／exp、parse → `exam-chN-*.js` |
| 決策：填充／甲乙題要不要收（預設不收進四選一） | keys 長度對齊題數；題組 lead 掛下一題 |
| 瀏覽器抽查答案與圖 | commit＋push（不含 `_bank_extract/`） |

## 轉題時的品管

Word／PDF 轉出來常見：題幹黏下一題、選項黏圖檔名、殘句「〔會考〕」、空 `q`、一題十張圖、破公式（`g/cm 3`、`10－9`、全形 `＝／`）。處理順序：

1. **人工**交 HTM＋答案／解析（或可貼文字）；**AI**用腳本切成一題四選一。
2. 圖存 `exams/img/N-x/image001.png`，題目寫 `imgs: ["exams/img/N-x/image001.png"]`。
3. 不要解壓縮 docx（Cortex）。使用者若只給 docx，請他匯出 HTM＋`.files`、貼文字，或給已解出的資料夾。
4. 寫進 `exam-chN-sections.js`。`ans` 不確定就先填 0，再用 keys 字串一次覆寫（依**陣列順序**，不要用跳號題號當索引）。
5. 公式修到能 KaTeX 顯示（或交給 `JPWNMath.polish`），見 [math.md](math.md)。
6. 打開該節段考頁，看有沒有被 `isJunkStem` 丟掉；丟掉的要修題幹再放回。

丢掉規則（與 `js/exam.js` 一致）：

- 題幹 trim 後短於 12 字
- 以「基測／會考／補考」開頭且過短
- 題幹含「複選」又含「0.0025」（已知壞題）
- 有效文字選項 < 2 且選項圖 < 2

## keys 檔

```js
const keys = { "N-1": "ABCDABCD..." };
```

A–D 對 0–3。`list.length !== seq.length` 時**整節不覆寫**，所以轉檔後要數題數。全形Ｃ、題組漏答用這個檔補。

## 段考頁 toc

手寫各節連結，當前頁 `class="is-on"`，最後一項回講義 `../sections/N-1.html`。

工具列：檢查作答、顯示詳解、重設。章末另外有「換一套題」、存成此班題本（`exam.js` 已做，HTML 對照 `review-ch4.html`）。

## 章末抽題

`data-pick="40"`。題庫目標約 120，盡量涵蓋每一小節。不要把明顯壞題塞進章末充數。

## 附圖

- 路徑一律站根：`exams/img/4-1/image001.png`（段考頁在 `exams/` 子目錄，`exam.js` 會用 `data-root` 組 URL）
- 檔名穩定，不要空白
- 一題太多圖會被裁成 1–2 張；重要圖放 `imgs[0]`
- 題幹公式用 `\(...\)`，會由 KaTeX 排版（見 [math.md](math.md)）
