# 口語指令驅動的自動化開發

> 對象：國中理化老師（使用者）與 Cursor Agent。  
> 正式站：https://junior-physics-waves-notes.vercel.app  
> 倉庫：fish0048-ai/junior-physics-waves-notes  

使用者以**自然語言**描述教學需求即可；Agent 自行完成修改、檢查、`commit`、`push origin main`、監看 CI 與 Vercel 部署，**不要求**逐步下 Git／測試指令，**不必**建立 PR。

## 規範優先順序（衝突時）

1. 平台實際權限（Cursor／GitHub／Vercel 核准卡）— 不可繞過  
2. 本文件與 `.cursor/rules/jpwn-automation.mdc`  
3. `.cursor/rules/jpwn-github.mdc`、`jpwn-multi-agent.mdc`  
4. `docs/agent-cooperation.md`  
5. `AGENTS.md` 與講義技能（`jpwn-core`、`jpwn-workflow` 等）

使用者若明確說「先不要 push／不要 commit」，以**當次指示**覆寫自動化預設。

---

## 單人維護：直接推送 `main`（預設）

| 原則 | 說明 |
|------|------|
| 上線路徑 | 變更在 `main` 上 `commit` 後 **`git push origin main`**（Vercel 正式站隨 `main` 部署）。 |
| 不需 PR | 常規講義／題庫／規則／測試修改**不**開 Pull Request；**不**為了流程而詢問「要不要 push」。 |
| 可選 PR | 僅在使用者**明確要求**審查紀錄或外部協作時才開 PR。 |
| GitHub 保護 | 若 `push` 遭拒（branch protection），**停止**並回報須調整的設定；**不得** force push 或繞過。 |

### 推送前（必做）

1. **`git status`** — 確認修改範圍；**不得**覆蓋其他 Agent／使用者的未提交修改（見 worktree 協作）。  
2. **`git fetch origin`** — 若落後 `origin/main`，先 **`git pull --ff-only origin main`**（有衝突則停並回報，禁止 force）。  
3. **靜態／教學自查** — 科學正確、繁中、題庫一致（見下方檢查表）。  
4. **優先依賴 GitHub Actions** — 本機禁止 Node；推送**前**無法跑 Playwright 時，須在回報中**標明風險**（推送後仍須等 Actions 結果，失敗即停）。

### 推送後（必做）

1. 監看本次 commit SHA 觸發的 **GitHub Actions**（`playwright`、`lecture-quality`、`a11y-phase1` 等，依變更路徑）。  
2. 查 **Vercel**／commit status，確認正式部署成功。  
3. **失敗**：停止後續修改、最多三輪修正→再 push；仍失敗則回報 run 連結，**不得**假稱通過或已部署。

### 禁止（仍不可破）

- `git push --force`（含 `main`）、`git reset --hard`、`git clean -fd`、**刪除 stash**（除非使用者明確要求）  
- 改 `git config`、`--no-verify`、未授權 `commit --amend`  
- 提交密鑰、`.env`、`_bank_extract/`  

### 必須先問使用者（高風險）

- 大量刪除教材或學生資料  
- 改成績／評分／繳交政策（未明確要求）  
- 新增付費服務、改 GitHub／Vercel 權限或密鑰  
- force push、`reset --hard`、刪 stash  
- 科學或教學爭議無法判定  

### 標準收尾（Agent）

1. `git add` → `git commit -m "<type>: <主旨>"`（繁中）  
2. 推送前檢查（見上）→ **`git push origin main`**  
3. 等 Actions + Vercel → 簡短回報（改動、測試、部署、連結）  
4. 其他 worktree：`git fetch` + `merge --ff-only origin/main` 同步（不覆蓋未提交 WIP）

---

## Worktree 與任務自動判斷

| 使用者意圖（示例） | 負責 Worktree | 預設分支 |
|-------------------|---------------|----------|
| 改講義、題目、詳解、動畫、教學設計 | `C:\Users\chunhsinkuo\junior-physics-lecture` | **`main`** |
| Playwright、Actions、PDF／RWD／a11y、CI | `C:\Users\chunhsinkuo\junior-physics-testing` | `test/site-quality`（完成後合入 `main` 並 push，見 `agent-cooperation.md`） |
| 歷史目錄 | `C:\Users\chunhsinkuo\junior-physics-waves-notes` | **不使用** |

**禁止**跨 Worktree 直接改檔。同一 Git 物件庫：同一時間僅一個 worktree 可 checkout `main`；push `main` 通常在 **lecture** worktree 執行。

---

## 預設自動授權（常規教學／工程）

- 讀寫對應 Worktree 檔案、修正問題  
- `commit`、**`push origin main`**（常規不詢問）  
- 監看 push 觸發的 GitHub Actions、依 log 修正（最多三輪）  
- 確認 Vercel 部署（不擅自改正式環境機密）  

觸發「必須先問」或使用者說不要 push → **停止**。

---

## 教材變更：自動品質檢查（依範圍取捨）

| 檢查 | Agent 推送前 | push 後 CI |
|------|--------------|------------|
| 國中理化科學正確性 | 必做 | `lecture-static` 等 |
| 題目與詳解一致 | 必做 | 題庫 spec 若有 |
| 繁中、錯字、亂碼 | 必做 | `lecture-static` |
| 國中生可理解度 | 必做 | — |
| 手機／平板／桌面 | 靜態 HTML/CSS | Playwright viewport |
| KaTeX、圖、SVG、JS | 靜態＋載入邏輯 | Playwright／Chromium |
| PDF 列印 | 標註待測 | `lecture-quality` artifact |
| Playwright 回歸 | 靠 push 後 CI | `playwright.yml` 等 |

圖解／動畫：只在抽象或易誤解處增加。

---

## CI（push 到 `main`）

1. 講義／`sections`／`recap` 等 → `lecture-quality`（依 diff）＋ `playwright` ＋ `a11y-phase1`（依 workflow 設定）  
2. 測試基礎建設 → 同上（變更 `tests/`、`.github/workflows/` 時）  

Agent **不**在本機跑 Node；以 **push 後** Actions 為準。缺 artifact 時不得宣稱 PDF／視覺已驗證。

---

## 三輪自動修正

1. CI 失敗 → 讀 log → 在正確 Worktree 修正 → 再 `commit` + **`push origin main`**  
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
| 口語 → 改檔 → commit → **push main** | **可**（需遠端允許 direct push） |
| push 後 Playwright／lecture-quality | **可** |
| 推送前本機 Playwright | **不可**（公司政策）→ 須標風險 |
| Vercel | **可**（`main` push 後；查 commit status） |
| 讀取 branch protection API | 常需 token；**以實際 `push` 結果為準** |
