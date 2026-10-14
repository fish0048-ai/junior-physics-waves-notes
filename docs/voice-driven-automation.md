# 口語指令驅動的自動化開發

> 對象：國中理化老師（使用者）與 Cursor Agent。  
> 正式站：https://junior-physics-waves-notes.vercel.app  
> 倉庫：fish0048-ai/junior-physics-waves-notes  

使用者以**自然語言**描述教學需求即可；Agent 自行完成 Worktree 判斷、修改、commit、push、PR、CI、（符合條件時）合併與部署驗證，**不要求**逐步下 Git／測試指令。

## 規範優先順序（衝突時）

1. 平台實際權限（Cursor／GitHub／Vercel 核准卡）— 不可繞過  
2. **GitHub PR 強制流程**（本文件下一節）— 不可因缺 `gh` CLI 而繞過  
3. 本文件其餘章節與 `.cursor/rules/jpwn-automation.mdc`  
4. `.cursor/rules/jpwn-multi-agent.mdc`、`docs/agent-cooperation.md`  
5. `.cursor/rules/jpwn-github.mdc`  
6. `AGENTS.md` 與講義技能（`jpwn-core`、`jpwn-workflow` 等）

使用者若明確說「先不要 push／不要 commit／不要合併」，以**當次指示**覆寫自動化預設。  
**例外**：「授權自動合併」僅指**符合安全條件的 PR 在 GitHub 上合併**，不是允許跳過 PR 或直接更新 `main`。

---

## GitHub PR 強制流程（不可破）

所有教材與程式修改進入 `main`（含 Vercel 正式站）**只能**經 Pull Request，不得走捷徑。

| # | 規則 |
|---|------|
| 1 | 變更在**功能分支**完成；`commit` 後 `push` 該分支（非 `main`）。 |
| 2 | **禁止**本機 `git push origin main`、本機 `git merge`／fast-forward 進 `main`、cherry-pick 直接上 `main`、或以任何方式**跳過 PR** 更新遠端 `main`。 |
| 3 | 建立 PR：`base` = `main`，`head` = 功能分支。優先順序：`gh pr create` → **GitHub REST API**（`git credential`／環境 token）→ 已連線的 GitHub MCP（若可用）。 |
| 4 | **若無法建立 PR**：保留分支與 commit、回報阻礙（缺 token、403 等）；**不得**改為直接推 `main`。 |
| 5 | 使用者「自動合併」= 在 PR 上、安全清單**全部成立**時，經 **GitHub 合併 PR**（merge／squash 依 repo 慣例）；不是本機合併。 |
| 6 | **CI 必須針對 PR 的 head commit**（`pull_request` 觸發的 workflow run）；僅 `push` 到 `main` 的綠燈**不能**代替 PR 檢查。必要 checks 全綠、`mergeable` 後才可合併。 |
| 7 | PR 合併後：查 Vercel／commit status，確認正式部署成功。 |
| 8 | **禁止**「事後補開 PR」取代事前 PR 審查與 PR 上 CI。 |
| 9 | 教訓案例：曾因本機無 `gh` 而 fast-forward 合併（如 `30ca1e5`）— **僅作流程警示，不回退已上線內容**。 |

### 標準收尾（Agent）

1. 功能分支：`commit` → `push origin <branch>`  
2. 建立／更新 PR（附簡述與測試計畫）  
3. 等待 PR 上必要 Actions success；失敗則最多三輪修正並 push 至**同一分支**（PR head 更新）  
4. 安全清單成立 → **GitHub API／UI 合併 PR**（非本機 `git checkout main && merge`）  
5. 確認 Vercel 部署 → 各 worktree `git fetch` + `merge --ff-only origin/main`（僅同步本機，**不是**寫入遠端 `main`）

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
- 在**安全條件全部成立**時，於 **GitHub 合併 PR**（更新 `main`）
- 依既有 Vercel 連動確認部署（不擅自改正式環境機密設定）

**不得**因「習慣上再問一次」而打斷流程；但若觸發「必須詢問」條款，仍須停下。

---

## 教材變更：自動品質檢查（依範圍取捨）

| 檢查 | 講義 Agent | 測試 Agent／CI |
|------|------------|----------------|
| 國中理化科學正確性 | 必做（靜態＋對照課文） | `lecture-static`（關鍵頁錨點） |
| 題目與詳解一致 | 必做 | 題庫 spec 若有 |
| 繁中、錯字、亂碼 | 必做 | `lecture-static` |
| 國中生可理解度 | 必做 | — |
| 手機／平板／桌面 | 靜態 HTML/CSS 檢查 | Playwright viewport |
| KaTeX、圖、SVG、JS | 靜態＋頁面載入 | Playwright／Chromium |
| PDF 列印頁數／版面 | 標註待測 | `lecture-quality`（artifact：PDF、`print-metrics.json`） |
| 既有 Playwright 回歸 | 透過 PR CI | 直接維護 spec |

圖解／動畫：**只在**抽象或易誤解處增加，不無差別堆素材。

---

## CI 協作（無跨 Agent 直呼時）

1. 講義 PR → `lecture-quality`（依 diff：靜態／KaTeX／RWD／必要 PDF）＋ `a11y-phase1`＋ `playwright`  
2. 測試基礎建設 → `test/site-quality` PR（workflow／spec，**不** overlay 固定教材 SHA）  

講義 Agent **不**在本機跑 Node；以 Actions 結果為準。`lecture-quality` 應上傳 `lecture-quality-evidence-*` artifact；缺少 PDF／截圖時**不得**宣稱視覺驗證通過。

---

## 三輪自動修正

1. CI 失敗 → 讀 log → 在**正確 Worktree**修正 → push → 重跑必要 workflow  
2. 最多 **3 輪**；仍失敗 → 停止，回報原因與最後 run 連結  
3. **禁止**刪測試、放寬關鍵斷言、隱藏錯誤換綠燈  

---

## 自動合併 PR 的安全條件（全部成立才在 GitHub merge）

- [ ] 變更符合使用者當次口語需求（或 PR 描述可追溯）  
- [ ] 必要 CI 全數 success，且 run 綁定**本 PR head SHA**（含 Playwright／`lecture-quality`／a11y 等 required checks）  
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
| 口語 → 判斷 Worktree → 改檔 → commit/push 功能分支/PR | Cursor Agent + git credential／API **可** |
| PR 上 Playwright／Chromium CI | **可**（`playwright.yml`、`a11y-phase1.yml` 等 `pull_request` 觸發） |
| 講義 PDF／RWD 證據 | **可**（`lecture-quality.yml` 等） |
| 建立／合併 PR（無 `gh` 時） | **須** GitHub REST API 或 MCP；**不可**改推 `main` |
| 自動合併 PR | Agent **可**經 GitHub API `merge`（受安全清單約束；**禁止**本機合併後 push `main`） |
| Vercel 部署 | **可**（`main` 合併後自動；Agent 可查 deployment 狀態） |
| 同一對話內「自動呼叫 testing Agent」 | **不可**— 以 CI + 分支協調代替 |
| 本機 Playwright | **不可**（公司政策） |
