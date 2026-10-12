# 口語指令驅動的自動化開發

> 對象：國中理化老師（使用者）與 Cursor Agent。  
> 正式站：https://junior-physics-waves-notes.vercel.app  
> 倉庫：fish0048-ai/junior-physics-waves-notes  

使用者以**自然語言**描述教學需求即可；Agent 自行完成 Worktree 判斷、修改、commit、push、PR、CI、（符合條件時）合併與部署驗證，**不要求**逐步下 Git／測試指令。

## 規範優先順序（衝突時）

1. 平台實際權限（Cursor／GitHub／Vercel 核准卡）— 不可繞過  
2. 本文件與 `.cursor/rules/jpwn-automation.mdc`  
3. `.cursor/rules/jpwn-multi-agent.mdc`、`docs/agent-cooperation.md`  
4. `.cursor/rules/jpwn-github.mdc`  
5. `AGENTS.md` 與講義技能（`jpwn-core`、`jpwn-workflow` 等）

使用者若明確說「先不要 push／不要 commit／不要合併」，以**當次指示**覆寫自動化預設。

---

## Worktree 與任務自動判斷

| 使用者意圖（示例） | 負責 Worktree | 分支 |
|-------------------|---------------|------|
| 改講義、題目、詳解、動畫、教學設計、科學內容 | `C:\Users\chunhsinkuo\junior-physics-lecture` | `feature/lecture-content` |
| Playwright、Actions、PDF／RWD／a11y、CI、測試基礎建設 | `C:\Users\chunhsinkuo\junior-physics-testing` | `test/site-quality` |
| 歷史目錄 | `C:\Users\chunhsinkuo\junior-physics-waves-notes` | **不使用**（勿新開發） |

**禁止**跨 Worktree 直接改檔。跨領域需求（例如講義改完需新測試）→ 在各自分支 commit／PR，以 **GitHub Actions** 驗證；**不得**假裝另一 Agent 已在本機執行。

---

## 預設自動授權（常規教學／工程）

使用者已授權 Agent 在常規工作中自動：

- 讀寫本專案檔案（限對應 Worktree 職責）
- 修正教材與程式問題
- `git commit`（訊息 `<type>: <主旨>` 繁中）
- 一般 `git push`（**不含** force push）
- 建立／更新 PR
- 觸發與監看 GitHub Actions
- 依 CI 日誌修正（見下方「三輪修正」）
- 在**安全條件全部成立**時合併常規 PR 至 `main`
- 依既有 Vercel 連動確認部署（不擅自改正式環境機密設定）

**不得**因「習慣上再問一次」而打斷流程；但若觸發「必須詢問」條款，仍須停下。

---

## 教材變更：自動品質檢查（依範圍取捨）

| 檢查 | 講義 Agent | 測試 Agent／CI |
|------|------------|----------------|
| 國中理化科學正確性 | 必做（靜態＋對照課文） | — |
| 題目與詳解一致 | 必做 | 題庫 spec 若有 |
| 繁中、錯字、亂碼 | 必做 | — |
| 國中生可理解度 | 必做 | — |
| 手機／平板／桌面 | 靜態 HTML/CSS 檢查 | Playwright viewport |
| KaTeX、圖、SVG、JS | 靜態＋頁面載入 | Playwright／Chromium |
| PDF 列印頁數／版面 | 標註待測 | `lab-1-2-sheet-pr6` 等 workflow |
| 既有 Playwright 回歸 | 透過 PR CI | 直接維護 spec |

圖解／動畫：**只在**抽象或易誤解處增加，不無差別堆素材。

---

## CI 協作（無跨 Agent 直呼時）

1. 講義 PR → `a11y-phase1`（及 PR 觸發的其他 workflow）  
2. 專項頁面 → 如 `lab-1-2-sheet-pr6`（testing 分支 overlay 教材 SHA）  
3. 測試基礎建設 → `test/site-quality` PR  

講義 Agent **不**在本機跑 Node；以 Actions 結果為準。缺少 PDF／截圖 artifact 時**不得**宣稱視覺驗證通過。

---

## 三輪自動修正

1. CI 失敗 → 讀 log → 在**正確 Worktree**修正 → push → 重跑必要 workflow  
2. 最多 **3 輪**；仍失敗 → 停止，回報原因與最後 run 連結  
3. **禁止**刪測試、放寬關鍵斷言、隱藏錯誤換綠燈  

---

## 自動合併 `main` 的安全條件（全部成立才 merge）

- [ ] 變更符合使用者當次口語需求（或 PR 描述可追溯）  
- [ ] 必要 CI 全數 success（含 Playwright／Chromium 等 PR 上 required checks）  
- [ ] `mergeable`、無未解衝突  
- [ ] 無已知**重大**科學錯誤或高嚴重度功能／版面問題  
- [ ] 所需測試證據完整（無則標待驗證且**不合併**）  
- [ ] PR 不含密鑰、`.env`、權限設定、非預期大檔  
- [ ] 非 force push、非 `reset --hard`、未刪 stash  

**必須詢問使用者**（不可自動合併）：

- 大量刪除教材或學生資料  
- 改成績／評分／繳交政策（使用者未明確要求）  
- 新增付費服務  
- 改 GitHub／Vercel 權限、密鑰、正式環境設定  
- force push、`reset --hard`、刪除 stash  
- 科學或教學爭議無法判定  
- 必要測試無法執行  

**規範類 PR**（僅 `AGENTS.md`、`docs/`、`.cursor/rules/`）：可合併前由使用者指定「規範 PR 不自動合併」— 以當次任務為準。

---

## 合併後 Worktree 同步

`main` 更新且安全時，在**各 Worktree**（lecture／testing）：

1. `git fetch origin`  
2. 無他人未提交 WIP 衝突時，`git merge --ff-only origin/main`（或等價 fast-forward）  
3. **不** `reset --hard`、不覆蓋未提交講義  

---

## 公司電腦

禁止本機：Node.js、npm、npx、pnpm、yarn。建置與 Playwright 僅 **GitHub Actions** 或 **Vercel**。

---

## 完成回報（給老師）

**成功時**（簡短）：

1. 改了什麼（教學面）  
2. 內容是否正確  
3. 測試是否通過  
4. 是否已部署  
5. 網站連結  

**失敗或有風險時**才附：commit SHA、PR、CI run、技術細節。

---

## 實際執行能力（誠實邊界）

| 能力 | 現狀 |
|------|------|
| 口語 → 判斷 Worktree → 改檔 → commit/push/PR | Cursor Agent + git credential／API **可** |
| PR 上 Playwright／Chromium CI | **可**（`a11y-phase1.yml` 等） |
| 專項 PDF／RWD（overlay 教材 SHA） | **可**（`lab-1-2-sheet-pr6.yml` 在 `test/site-quality`） |
| 自動合併 PR | Agent **可**呼叫 GitHub API（需權限；受安全清單約束） |
| Vercel 部署 | **可**（`main` 合併後自動；Agent 可查 deployment 狀態） |
| 同一對話內「自動呼叫 testing Agent」 | **不可**— 以 CI + 分支協調代替 |
| 本機 Playwright | **不可**（公司政策） |
