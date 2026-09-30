# 本機紙本作業自動批改

學校 Workspace 信箱不能自建 OAuth、也不能白名單，因此**不接** Google Classroom／Drive API。  
學生仍在 Classroom 繳交紙本照片；老師下載到本機後，用本工具對答案，產出分數與錯題報表，方便貼給學生自行批改與訂正。

## 流程

1. 學生紙本拍照 → 繳交 Classroom  
2. 老師下載該次作業附件（資料夾或 ZIP）  
3. 依下方規則整理檔名／子資料夾  
4. 準備標準答案 JSON  
5. 本機執行批改 → 得到 CSV／HTML  
6. 把個別錯題清單貼到 Classroom 私人留言或公告  
7. 學生訂正再繳 → 重新下載後再跑一次即可  

## 安裝

```bash
cd tools/classroom-auto-grade
npm install
cp .env.example .env
# 編輯 .env，填入 GEMINI_API_KEY（向 https://aistudio.google.com/apikey 申請）
```

`.env` 已列入 gitignore，**禁止**把真實 API key commit 進倉庫。

## 檔名／子資料夾規則

建議：**每位學生一個子資料夾**，資料夾名含座號與姓名。

| 形式 | 範例 | 解析結果 |
|------|------|----------|
| `座號-姓名` | `01-王小明` | 座號 01、姓名 王小明 |
| `座號_姓名` | `12_李小華` | 座號 12、姓名 李小華 |
| `姓名-座號` | `王小明-01` | 同上 |
| 僅座號 | `07` | 座號 07 |
| 僅姓名 | `陳大同` | 姓名 陳大同 |

子資料夾內放該生所有頁面照片（`.jpg`／`.png`／`.webp` 等）。多頁會一併送給辨識。

若根目錄**沒有**子資料夾、直接放圖片，則「一檔一生」，檔名同樣依上表解析（例如 `03-張模糊.jpg`）。

Classroom 下載的 ZIP 可直接當 `--input`；工具會解壓後套用相同規則。

## 答案檔 JSON

見 `fixtures/answer-keys/sample.json`：

```json
{
  "title": "作業名稱",
  "items": [
    {
      "id": "1",
      "type": "choice",
      "answer": "A",
      "aliases": ["甲", "1"],
      "points": 2,
      "prompt": "可選：題幹摘要，幫助模型對題"
    },
    {
      "id": "3",
      "type": "fill",
      "answer": "D=M/V",
      "aliases": ["D＝M／V", "密度=質量/體積"],
      "points": 3
    }
  ]
}
```

- `type`：`choice`（選擇）或 `fill`（填充）  
- `answer`：標準答案  
- `aliases`：同義寫法（全形符號、甲乙丙丁、單位寫法等）  
- `points`：配分，預設 1  
- 看不清的作答會標 `unreadable`，**不計分**（報表另欄列出，請學生重拍再繳）

## 執行

```bash
# 真實照片＋Gemini
npm run grade -- --input /path/to/下載資料夾或.zip \
  --answers ./fixtures/answer-keys/sample.json \
  --out ./reports

# 合成樣張（不需 API key；讀各生 extracted.json）
npm run demo
# 等同：
node bin/grade.js \
  --input fixtures/submissions \
  --answers fixtures/answer-keys/sample.json \
  --out reports \
  --provider mock
```

### `--provider`

| 值 | 說明 |
|----|------|
| `auto`（預設） | 學生資料夾若有 `extracted.json` 則用 mock；否則呼叫 Gemini |
| `mock` | 只讀 `extracted.json`，適合無 key／單元驗證 |
| `gemini` | 強制呼叫 Gemini（需 `GEMINI_API_KEY`） |

環境變數：

- `GEMINI_API_KEY`（必填，除非 mock）  
- `GEMINI_MODEL`（可選，預設 `gemini-2.0-flash`）

## 報表

輸出目錄會產生：

- `grade-report-<時間>.csv`／`.html`／`.json`  
- `latest.csv`／`latest.html`／`latest.json`（覆寫成最新一次）

HTML 含：

1. **全班總表**：座號、姓名、分數、錯題、讀不到  
2. **個別錯題清單**：方便複製貼到 Classroom 私人留言，請學生自行批改與訂正  

## 訂正再繳後重跑

1. 學生依錯題清單訂正紙本並重新拍照繳交  
2. 老師再下載該次附件，覆蓋或另開資料夾  
3. 用同一份答案 JSON 再執行同一指令  
4. 比對新報表分數是否提升；仍 `unreadable` 者請再提醒重拍  

## 樣例與測試

`fixtures/submissions/` 含三位合成情境（搭配 `extracted.json`，不需真實 API）：

| 資料夾 | 預期 |
|--------|------|
| `01-王小明` | 全對 10/10 |
| `02-李小華` | 第 2、3 題錯 → 5/10 |
| `03-張模糊` | 第 1、3 題讀不到 → 5/10 |

```bash
npm test
npm run demo
```

若要對**真實照片**驗證 Gemini，請自備 1～2 位學生樣張、填好 `.env` 後：

```bash
node bin/grade.js -i /path/to/photos -a fixtures/answer-keys/sample.json -o reports -p gemini
```

## 限制

- 不做 Classroom／Drive API、不自動回寫成績  
- 僅選擇／填充（有標準答案）；開放作答、計算過程、畫圖不自動給分  
- 辨識品質受照片清晰度、光線、裁切影響；模糊會標 `unreadable`  
- 需本機網路與有效 Gemini API key（mock／測試除外）  

## 目錄結構

```
tools/classroom-auto-grade/
  bin/grade.js          # CLI 入口
  src/                  # 讀取、辨識、計分、報表
  fixtures/             # 答案樣例＋合成繳交
  test/                 # 單元／整合測試（mock）
  reports/              # 本機輸出（gitignore）
  .env.example
  README.md
```
