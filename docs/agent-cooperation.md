# 多 Agent 並行協作（Worktree）

> 正式站：https://junior-physics-waves-notes.vercel.app  
> 倉庫：fish0048-ai/junior-physics-waves-notes  
> 本文件為 `AGENTS.md` 的補充細節。衝突時以 `docs/voice-driven-automation.md`、`.cursor/rules/jpwn-automation.mdc` 為準，其次為本文件與 `jpwn-multi-agent.mdc`。

## Worktree 對照表

| 代號 | 本機路徑 | 分支 | 用途 | 狀態 |
|------|----------|------|------|------|
| 歷史區 | `C:\Users\chunhsinkuo\junior-physics-waves-notes` | `fix/a11y-phase1` | 舊 a11y 線，**暫停新開發** | 保留 |
| **Agent A 講義** | `C:\Users\chunhsinkuo\junior-physics-lecture` | `feature/lecture-content` | 講義、題庫、動畫、互動 | 使用中 |
| **Agent B 品質** | `C:\Users\chunhsinkuo\junior-physics-testing` | `test/site-quality` | Playwright、Actions、a11y | 使用中 |

- 三個目錄共用**同一 Git 物件庫**；`git worktree list` 可一次查看。
- **禁止**在 A 的 Cursor 視窗編輯 B 的路徑檔案（反之亦然）。
- `main` 對應 Vercel 正式站；**不得**在 worktree 直接改 `main` 或 force push。合併 `main` 依口語自動化安全清單（非常規 PR 或使用者禁止時不合併）。

## 檔案責任（摘要）

| 區域 | Agent A（講義） | Agent B（品質） |
|------|-----------------|-----------------|
| `sections/`、`exams/`、`review*.html`、`animations/` | 主導 | 僅加測試／回報 issue，不大改內容 |
| `tests/`、`.github/workflows/` | 配合修功能 | 主導 |
| `package.json`、`playwright.config.ts` | 需協調 | 主導 |
| `js/app.js`、`sw-main.js`、`js/layout.js` | 功能需求時改 | 改前確認與 A 分支差異 |
| `css/style.css` | 講義版面 | a11y／列印回歸 |

**高衝突檔**（同一時間只應一個 Agent 主導）：  
`package.json`、`playwright.config.ts`、`.gitignore`、`sw-main.js`、`sw-book.js`、`js/app.js`、`js/layout.js`、`js/book-cache.js`、`vercel.json`

## 開始任務（必做）

1. `git worktree list` — 確認自己在正確目錄。
2. `git branch --show-current` — 確認分支（非 `main`）。
3. `git status` — 記錄是否含**他人**未提交修改；若有，先停止並回報。
4. 列出本次將改的檔案；對照上表是否與另一 Agent 重疊。
5. 公司 Windows：**禁止**執行 `node`／`npm`／`npx`／`pnpm`／`yarn`；測試依 GitHub Actions。

## 結束任務（必做）

1. 列出修改檔案與 commit SHA（若已提交）。
2. 說明 CI／Playwright 結果（PR 連結或 workflow run）。
3. 標註**尚未**在雲端驗證的項目。
4. 確認未改 `main`、未部署正式站。
5. 若動到 PWA／Service Worker：註明對 IndexedDB 手寫筆記的影響。

## PR、CI 與自動合併

1. **講義**：`feature/lecture-content` → PR → CI 綠燈 → 符合 [`voice-driven-automation.md`](voice-driven-automation.md) 安全清單 → **Agent 可自動合併** `main`。
2. **測試**：`test/site-quality` → PR → CI 綠燈 → 同上。
3. **跨 Agent**：講義 Agent 不修改 testing 目錄；需新 spec／workflow 時由 testing 分支 PR，或以既有 workflow **overlay 教材 SHA**（如 `lab-1-2-sheet-pr6.yml`）驗證講義 PR。
4. 規範類文件：在一分支提交後，另一 worktree 以 **merge 該 commit** 同步，勿手動複製覆蓋。
5. 使用者或任務明示「規範 PR 不自動合併」→ 只開 PR、等待確認。

### 將規範同步到 testing worktree（示例）

```powershell
# 在 testing 目錄（勿在有未提交講義修改時覆蓋整棵樹）
cd C:\Users\chunhsinkuo\junior-physics-testing
git fetch origin
git merge <規範提交的 SHA>   # 或 merge origin/feature/lecture-content 上已 push 的節點
```

合併後 `git status` 應仍**不含** `sections/lab-1-2-sheet.html` 等講義 WIP（除非 B 分支刻意納入）。

## Stash 與備份

- 倉庫級 `git stash` 所有 worktree 可見；**勿**在錯誤 worktree 重複 `stash apply`。
- 講義 WIP 應留在 **lecture** worktree 工作目錄或獨立 commit；`stash@{0}` 為歷史備份時，**刪除前須老師確認**。

## 禁止操作

- `git reset --hard`、`git clean -fd`、force push、刪除他人未提交修改。
- 跨 worktree 直接編輯檔案。
- 未授權合併／部署 `main`。
- 以覆蓋方式解決 merge conflict（須保留雙方意圖、必要時三方合併）。
