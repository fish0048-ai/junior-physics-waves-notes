# 工作流總覽（人工 × AI）

本檔是全站流程的單一入口。硬規則仍以 `SKILL.md` 與 `.cursor/rules/jpwn-*.mdc` 為準。

**原則**：人工交原料與決策；AI 做轉檔、組站、對齊範本、上線。AI 不可代替人工提供課本原文、官方答案、或「這一題要不要收」。

---

## 1. 角色對照

| 項目 | 人工（老師） | AI（Agent） |
|------|--------------|-------------|
| 康橋／課本原文 | 提供檔或路徑 | 讀取、轉成站內 HTML／JS |
| 章號、小節切法、要不要某題 | 決定 | 執行；有疑問先問 |
| 探究問題語氣、主張方向 | 可改稿／拍板 | 依 `inquiry.md` 起草 |
| `.extra`／`.gifted` | 可改科學正確性 | 依 `extras.md` 撰寫 |
| 挖空答案 | 來源在講義裡 | 做成 `input.blank`（凍成 span） |
| 題庫答案／解析 | 提供答案卷／解析卷 | Word COM 抽出，寫入 keys／explain |
| 圖對不對、公式好不好看 | 瀏覽器／平板驗收 | 重畫 SVG／修 KaTeX |
| GitHub 上線 | 預設同意；要暫存再說 | 每次做完 commit＋push |

---

## 2. 工作流一覽

| 流程 | 人工交什麼 | AI 產出什麼 | 細節 |
|------|------------|-------------|------|
| A 新章講義 | 講義檔＋章號 | `chN`、config、sections、exams 殼、review | §3 |
| B 隨堂／段考題庫 | HTM＋`.files`＋答案／解析 | `exam-chN-*.js`、`exams/img/` | §4 |
| C 實驗專區 | 活動紀錄本 | `lab.html`、`sections/lab-*`（步驟格） | §5 |
| D 修圖／改錯 | 截圖或說明 | 改 SVG／PNG／CSS／JS | §6 |
| E 公式／頁碼 | （通常含在 A） | KaTeX、`book-manifest`、列印頁碼 | `math.md`／`pages.md` |
| F 上線 | 「先不要上傳」才擋 | commit＋push | `jpwn-github.mdc` |

---

## 3. 流程 A：新章講義

### 人工

1. 上傳或給路徑：Word／PDF／圖片／可貼文字（**不要**只丟加密或無法開啟的檔）。
2. 說清：第 N 章、小節清單（或同意 AI 依目錄切）。
3. （選）指定探究主問題、哪些實驗要進講義、哪些留給實驗專區。
4. 做完後：平板 Ctrl+F5，抽查挖空與補充。

### AI

1. 讀範本：`ch4.html`、`config-ch4.js`、`sections/4-1.html`、`exams/4-1.html`、`review-ch4.html`。
2. 抽定義／挖空／圖／實驗／練習（**不刪**），加探究鏈與兩層補充。
3. 新增並串好：`chN.html`、`js/config-chN.js`、各節、段考頁殼、`review-chN.html`；**每一份** config 的 `chapters` 都加新章。
4. 更新 `js/book-manifest.js` 頁碼順序。
5. 公式走 KaTeX；座標圖走 `svg.math-graph`。
6. commit＋push。

### 不要混

- 人工沒交題庫 → AI 只做段考**頁殼**，題庫可暫空或標「建置中」，不要瞎編 50 題。
- 活動紀錄本 → 走流程 C，不要塞進普通 `sections/N-x` 當短 `ol.q`。

---

## 4. 流程 B：隨堂練習／段考題庫（CH2／CH6 實務）

### 人工必交（一套齊）

每個小節（及段考前練習）盡量有：

| 檔 | 用途 |
|----|------|
| `N-x-題目卷.htm`＋`N-x-題目卷.files/` | 題幹、選項、附圖（Big5 HTM） |
| `N-x-答案卷.docx` 或含題答案卷 | 答案順序 |
| `N-x-解析卷簡.docx`（或全） | 詳解 |
| 章末：`CHN段考前練習-題目卷.htm`＋`.files`＋答案／解析 | 章末題庫 |

路徑可直接貼在對話（如桌面 `康橋\講義電子檔\CHN\...`）。

**只要 docx、沒有 HTM**：人工改匯出「網頁篩選的 HTM」＋資料夾，或貼純文字；AI **禁止解壓 docx**。

### AI 步驟（固定順序）

1. **拷圖**：`.files` → `exams/img/N-x/`、`exams/img/ch-N/`（檔名 `imageNNN.ext`）。
2. **抽文**：Word COM 開答案／解析 → UTF-8 寫入 `_bank_extract/N-x-ans.txt`、`N-x-exp.txt`（**勿 git add**）。
3. **解析**：`_parse_chN.ps1`（ASCII 腳本；路徑用 LiteralPath／Desktop 搜尋；腳本本身可 gitignore）。
4. **對齊題數**：`keys` 字串長度 = 該節 MC 題數，否則整節答案不覆寫。
5. **過濾非四選一**：填充、甲乙複選、填代號空白題 → **略過**，不要硬收。
6. **題組 lead**：`為題組`（HTML 可能被 span 拆開）掛在**下一題**，不要掛在被濾掉的填空題上。
7. **寫入**：`js/exam-chN-sections.js`、`exam-chN-keys.js`、`exam-chN.js`；更新 `exams/N-x.html`／`review-chN.html` 的 exam-lead。
8. commit＋push（含 `exams/img/`，不含 `_bank_extract/`）。

### 人工共驗

- 開 `exams/N-1.html`，抽 3～5 題對答案與圖。
- 章末換一套題，確認能抽滿且無大量「被丟掉」空題。

### 已知坑（AI 必避）

- 答案用題號 `n-1` 當索引，題號跳號（如 6-4 略 41）會錯 → 用**陣列順序**對 keys。
- `list.length !== keys.length` → 整節 ans 不覆寫。
- PowerShell `return ,$array` 再 `@()` 會塌成 1 筆；中文路徑勿用字元碼拼接。
- 章末約 120 題（可 121）；`data-pick="40"`。

---

## 5. 流程 C：實驗專區

### 人工

- 交活動紀錄本（PDF／掃描／可貼步驟原文）。
- 確認哪些實驗進 `lab-*`（可說「跟紀錄本全部做」）。

### AI

- 依 `labs.md`：一格一步 `.lab-step`、動手前 `.lab-kit`、不要段考／練習／`#drill`。
- `lab.html`、`config-lab.js`；每份 config 加 `nav: "實驗專區"`。

### 共驗

- 投影／平板跟著做一輪，確認步驟沒被收成短清單。

---

## 6. 流程 D：修圖／改錯／小改

### 人工

- 指出頁（如 `sections/4-2.html`）、截圖或參考圖、哪裡錯。

### AI

- 只改相關檔；光線／器材示意可 PNG；座標圖維持 `math-graph` 規格。
- 改完 push；回覆看哪一頁。

---

## 7. 流程 F：上線與暫存

| 情況 | 誰決定 | AI 行為 |
|------|--------|---------|
| 一般做完 | 預設人工同意上線 | 自動 commit＋push |
| 「先不要上傳」 | 人工 | 只改檔，不 commit／不 push |
| 半成品不確定 | 人工說要不要暫存 | 先問再 commit |
| `_bank_extract/`、`.env` | — | 永不提交 |

訊息格式：`<type>: <主旨>`（繁中）。Pages：https://fish0048-ai.github.io/junior-physics-waves-notes/

---

## 8. 對話怎麼開（給人工的最短指令）

```
新章：這是第 N 章講義（附檔／路徑），小節 …，請依第 4 章做完並上傳。
題庫：這是第 N 章隨堂練習題庫資料夾（路徑 …），請匯入 6-1～6-4 與段考前練習。
實驗：這是活動紀錄本，請做成實驗專區步驟頁。
修圖：4-3 全反射圖不對，參考這張圖重畫。
暫存：先改不要 push。
```

AI 若原料不足，用一則訊息列出「還缺哪些人工檔」，不要開始假造內容。
