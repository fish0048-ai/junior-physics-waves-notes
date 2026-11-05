# 口語指令驅動的自動化開發

> 對象：國中理化老師（使用者）與 Cursor Agent。  
> 正式站：https://junior-physics-waves-notes.vercel.app  
> 倉庫：fish0048-ai/junior-physics-waves-notes  

使用者以**自然語言**描述教學需求即可；Agent 自行完成修改、檢查、在功能分支 `commit`、開 PR、等必要檢查通過後合併、監看 CI 與 Vercel 部署，**不要求**逐步下 Git／測試指令。

## 規範優先順序（衝突時）

1. 平台實際權限（Cursor／GitHub／Vercel 核准卡）— 不可繞過  
2. 本文件與 `.cursor/rules/jpwn-automation.mdc`  
3. `.cursor/rules/jpwn-github.mdc`、`jpwn-multi-agent.mdc`  
4. `docs/agent-cooperation.md`  
5. `AGENTS.md` 與講義技能（`jpwn-core`、`jpwn-workflow` 等）

使用者若明確說「先不要上傳／不要 commit／不要合併」，以**當次指示**覆寫自動化預設。

---

## 單人維護：功能分支＋PR（預設）

| 原則 | 說明 |
|------|------|
| 上線路徑 | 功能分支 `commit` → 推送分支 → 開 PR → 必要檢查通過 → Squash 合併進 `main`（Vercel 正式站隨 `main` 部署）。 |
| `main` 保護 | GitHub Ruleset：只能經由 PR、必須通過 `Chromium` 與 `a11y-phase1`、禁止刪除與 force push、無人可繞過、不需人工核准人數。直推 `main` 會被拒絕。 |
| 不必詢問 | 常規講義／題庫／規則／測試修改，**不**為了流程詢問「要不要上傳／合併」；檢查全過就合併。 |
| 被擋下 | 推送或合併遭 Ruleset 拒絕 → **停止**並回報原因；**不得** force push、`--admin` 合併或修改 Ruleset。 |

### 推送前（必做）

1. **`git status`** — 確認修改範圍；**不得**覆蓋其他 Agent／使用者的未提交修改（見 worktree 協作）。  
2. **`git fetch origin`** — 從最新 `origin/main` 開功能分支；不在 `main` 上直接 commit。  
3. **靜態／教學自查** — 科學正確、繁中、題庫一致（見下方檢查表）。  
4. **優先依賴 GitHub Actions** — 本機禁止 Node；推送**前**無法跑 Playwright 時，須在回報中**標明風險**（以 PR 上的 Actions 結果為準，失敗即停）。

### 開 PR 後（必做）

1. 等 PR 最新 commit 的必要檢查 `Chromium` 與 `a11y-phase1`；改到講義路徑時也看 `lecture-quality`。  
2. 全部通過 → `gh pr merge --squash --delete-branch`；高風險變更則停在 PR 先問使用者。  
3. 合併後查 `main` 的 Actions 與 **Vercel**／commit status，確認正式部署成功。  
4. **失敗**：停止後續修改、最多三輪修正→推同一分支；仍失敗則回報 PR 與 run 連結，**不得**假稱通過或已部署。

### 禁止（仍不可破）

- 直推 `main`、`git push --force`、`gh pr merge --admin`、修改或停用 GitHub Ruleset  
- `git reset --hard`、`git clean -fd`、**刪除 stash**（除非使用者明確要求）  
- 改 `git config`、`--no-verify`、未授權 `commit --amend`  
- 提交密鑰、`.env`、`_bank_extract/`  

### 必須先問使用者（高風險）

- 大量刪除教材或學生資料  
- 改成績／評分／繳交政策（未明確要求）  
- 新增付費服務、改 GitHub／Vercel 權限或密鑰  
- force push、`reset --hard`、刪 stash  
- 科學或教學爭議無法判定  

### 標準收尾（Agent）

1. 功能分支 `git add` → `git commit -m "<type>: <主旨>"`（繁中）  
2. 推送前檢查（見上）→ `git push -u origin <分支>` → `gh pr create --base main`  
3. 等必要檢查 → `gh pr merge --squash --delete-branch` → 等 `main` 的 Actions + Vercel → 簡短回報（改動、PR、測試、部署、連結）  
4. 各 worktree：`git fetch` + `merge --ff-only origin/main` 同步（不覆蓋未提交 WIP），刪本機舊分支

---

## Worktree 與任務自動判斷

| 使用者意圖（示例） | 負責 Worktree | 預設分支 |
|-------------------|---------------|----------|
| 改講義、題目、詳解、動畫、教學設計 | `C:\Users\chunhsinkuo\junior-physics-lecture` | 從 `origin/main` 開功能分支 |
| Playwright、Actions、PDF／RWD／a11y、CI | `C:\Users\chunhsinkuo\junior-physics-testing` | `test/site-quality` 或新功能分支（開 PR 合入 `main`，見 `agent-cooperation.md`） |
| 歷史目錄 | `C:\Users\chunhsinkuo\junior-physics-waves-notes` | **不使用** |

**禁止**跨 Worktree 直接改檔。同一 Git 物件庫：同一時間僅一個 worktree 可 checkout `main`；遠端 `main` 只透過 PR 合併更新。

---

## 預設自動授權（常規教學／工程）

- 讀寫對應 Worktree 檔案、修正問題  
- 功能分支 `commit`、推送分支、開 PR、必要檢查通過後合併（常規不詢問）  
- 監看 PR 與 `main` 的 GitHub Actions、依 log 修正（最多三輪）  
- 確認 Vercel 部署（不擅自改正式環境機密）  

觸發「必須先問」或使用者說不要上傳／合併 → **停在 PR，不合併**。

---

## 教材變更：自動品質檢查（依範圍取捨）

| 檢查 | Agent 推送前 | PR／`main` 上的 CI |
|------|--------------|------------|
| 國中理化科學正確性 | 必做 | `lecture-static` 等 |
| 題目與詳解一致 | 必做 | 題庫 spec 若有 |
| 繁中、錯字、亂碼 | 必做 | `lecture-static` |
| 國中生可理解度 | 必做 | — |
| 手機／平板／桌面 | 靜態 HTML/CSS | Playwright viewport |
| KaTeX、圖、SVG、JS | 靜態＋載入邏輯 | Playwright／Chromium |
| PDF 列印 | 標註待測 | `lecture-quality` artifact |
| Playwright 回歸 | 靠 PR 上的 CI | `playwright.yml` 等 |

圖解／動畫：只在抽象或易誤解處增加。

---

## CI（PR 與 `main`）

1. 每個 PR 都會跑必要檢查 `Chromium`（`playwright.yml`，PR 上只跑 `@basic`）與 `a11y-phase1`。  
2. 改到講義／`sections`／`css`／`exams`／`recap` 等路徑時，另跑 `lecture-quality`（依 diff）；它有路徑過濾，**不是** Ruleset 必要檢查，但結果失敗時仍不得合併。  
3. 合併進 `main` 後，`playwright.yml` 跑完整測試；`lecture-quality` 依路徑再跑一次。  

Agent **不**在本機跑 Node；以 Actions 為準。缺 artifact 時不得宣稱 PDF／視覺已驗證。

---

## 三輪自動修正

1. CI 失敗 → 讀 log → 在正確 Worktree 修正 → 再 `commit` 並推同一功能分支  
2. 最多 **3 輪**；仍失敗 → 停止並回報  
3. **禁止**刪測試、放寬斷言換綠燈  

---

## 合併後 Worktree 同步

`main` 更新後，其他 worktree：`git fetch` → `merge --ff-only origin/main`（不 `reset --hard`、不蓋未提交講義）。

---

## 公司電腦

禁止本機 Node／npm／npx／pnpm／yarn。建置與 Playwright 僅 **GitHub Actions** 或 **Vercel**。

---

## 完成回報（給老師）

**成功時**（簡短）：改了什麼、內容是否正確、Actions／部署是否通過、正式站連結。  
**失敗或有未驗證風險時**：附 commit SHA、CI run、是否已部署。

---

## 實際執行能力（誠實邊界）

| 能力 | 現狀 |
|------|------|
| 口語 → 改檔 → commit → PR → 檢查通過後合併 | **可** |
| 直推 `main` | **不可**（Ruleset 拒絕） |
| PR 與合併後的 Playwright／lecture-quality | **可** |
| 推送前本機 Playwright | **不可**（公司政策）→ 須標風險 |
| Vercel | **可**（PR 合併進 `main` 後；查 commit status） |
| 讀取 Ruleset | `gh api repos/fish0048-ai/junior-physics-waves-notes/rulesets`；Agent 只讀不改 |
