# 本機作業「自行批改／訂正」檢查

學校 Workspace 信箱不能自建 OAuth／白名單 → **不接** Google Classroom／Drive API。  
老師從 Classroom 下載學生紙本照片後，用本工具檢查是否**自行批改與訂正**。

**本工具不對標準答案、不幫學生確認對錯、不計分。**

## 已定判準

| 項目 | 條件 |
|------|------|
| 有批改 `hasMarked` | 對的打勾（或整面一個大勾）；錯的劃掉並補上正確答案 |
| 有訂正 `hasCorrected` | 錯題有**另外顏色**的筆跡 |
| 看不清 | 模糊／裁切／反光 → 狀態「看不清」，**不要猜成完成** |

整體狀態：

- **完成**：可判斷，且有批改＋有異色訂正  
- **未完成**：可判斷，但缺批改或缺異色訂正（例如只有勾、完全沒改）  
- **看不清**：無法判斷  

## 流程

1. 學生紙本自行批改訂正後拍照 → 繳交 Classroom  
2. 老師下載該次附件（資料夾或 ZIP）  
3. 依檔名規則整理  
4. 本機執行檢查 → CSV／HTML  
5. 未完成／看不清者提醒再繳；重新下載後重跑即可  

## 安裝

```bash
cd tools/classroom-auto-grade
npm install
cp .env.example .env
# 真實照片辨識時填入 GEMINI_API_KEY（https://aistudio.google.com/apikey）
```

`.env` 已 gitignore，禁止提交金鑰。

## 檔名／子資料夾規則

建議每位學生一個子資料夾：

| 形式 | 範例 |
|------|------|
| `座號-姓名` | `01-王小明` |
| `座號_姓名` | `12_李小華` |
| `姓名-座號` | `王小明-01` |
| 僅座號／僅姓名 | `07`、`陳大同` |

子資料夾內放該生照片（`.jpg`／`.png`／`.webp` 等）。也可根目錄直接放圖片（一檔一生）。ZIP 可直接當 `--input`。

## 執行

```bash
# 合成樣張（不需 API key；讀各生 check.json）
npm run demo

# 真實照片＋Gemini
npm run check -- --input /path/to/下載資料夾或.zip --out ./reports --title "3-2 作業訂正"

# 等同
node bin/grade.js -i /path/to/photos -o ./reports -p gemini
```

### `--provider`

| 值 | 說明 |
|----|------|
| `auto`（預設） | 有 `check.json` 用 mock，否則 Gemini |
| `mock` | 只讀 `check.json` |
| `gemini` | 強制 Gemini（需 `GEMINI_API_KEY`） |

環境變數：`GEMINI_API_KEY`、`GEMINI_MODEL`（可選，預設 `gemini-2.0-flash`）。

> 舊版 `--answers` 已移除；若誤用會提示錯誤。

## 報表欄位

- 座號、姓名、標籤  
- **有批改**、**有訂正**  
- **狀態**（完成／未完成／看不清）  
- **依據**（簡短中文）  

輸出：`check-report-<時間>.{csv,html,json}` 與 `latest.*`。

HTML 含全班總表與個別說明，方便貼 Classroom 私人留言。

## 樣例與測試

`fixtures/submissions/`：

| 資料夾 | 情境 | 預期狀態 |
|--------|------|----------|
| `01-王小明` | 有批改有訂正 | 完成 |
| `02-李小華` | 只有勾、無異色訂正 | 未完成 |
| `03-陳大同` | 完全沒改 | 未完成 |
| `04-張模糊` | 模糊反光 | 看不清 |

```bash
npm test
npm run demo
```

## 限制

- 不做 Classroom／Drive API、不自動回寫成績  
- **不對答案、不計分**  
- 辨識受照片品質影響；看不清會標出供抽查  
- 真實照片需 Gemini API key（mock／測試除外）  

## 目錄

```
tools/classroom-auto-grade/
  bin/grade.js       # CLI
  src/check.js       # 狀態推導
  src/vision.js      # Gemini／mock 檢查
  src/ingest.js      # 資料夾／ZIP
  src/report.js      # CSV／HTML
  fixtures/          # 四種合成情境
  test/
  README.md
```
