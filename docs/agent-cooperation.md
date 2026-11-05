# 多 Agent 並行協作（Worktree）

> 正式站：https://junior-physics-waves-notes.vercel.app  
> 倉庫：fish0048-ai/junior-physics-waves-notes  
> 本文件為 `AGENTS.md` 的補充細節。衝突時以 `docs/voice-driven-automation.md`、`.cursor/rules/jpwn-automation.mdc` 為準，其次為本文件與 `jpwn-multi-agent.mdc`。

## Worktree 對照表

| 代號 | 本機路徑 | 分支 | 用途 | 狀態 |
|------|----------|------|------|------|
| 歷史區 | `C:\Users\chunhsinkuo\junior-physics-waves-notes` | `fix/a11y-phase1` | 舊 a11y 線，**暫停新開發** | 保留 |
| **講義（主）** | `C:\Users\chunhsinkuo\junior-physics-lecture` | **`main`**（同步用） | 講義、題庫、動畫；改動開功能分支走 PR | 使用中 |
| **Agent B 品質** | `C:\Users\chunhsinkuo\junior-physics-testing` | `test/site-quality` | Playwright、Actions、a11y | 使用中 |

- 三個目錄共用**同一 Git 物件庫**；`git worktree list` 可一次查看。
- **禁止**在 A 的 Cursor 視窗編輯 B 的路徑檔案（反之亦然）。
- `main` 對應 Vercel 正式站，受 GitHub Ruleset 保護：只能經由 PR 合併，且必須通過 `Chromium` 與 `a11y-phase1`。禁止直推 `main`、force push；被擋下時回報原因，不改 Ruleset。

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
2. `git branch --show-current` — 開始改動前從最新 `origin/main` 開功能分支；不要在 `main` 上直接 commit。
3. `git status` — 記錄是否含**他人**未提交修改；若有，先停止並回報。
4. 列出本次將改的檔案；對照上表是否與另一 Agent 重疊。
5. 公司 Windows：**禁止**執行 `node`／`npm`／`npx`／`pnpm`／`yarn`；測試依 GitHub Actions。

## 結束任務（必做）

1. 列出修改檔案與 commit SHA（若已提交）。
2. 說明 CI／Playwright 結果（PR 連結或 workflow run）。
3. 標註**尚未**在雲端驗證的項目。
4. 若已合併 PR：確認 `main` 的 Actions／Vercel；未合併則標註「尚未上線」並附 PR 連結。
5. 若動到 PWA／Service Worker：註明對 IndexedDB 手寫筆記的影響。

## PR、CI 與部署

1. **講義（lecture worktree）**：`git fetch origin` → 從 `origin/main` 開功能分支 → `commit` → `git push -u origin <分支>` → `gh pr create --base main` → 等 `Chromium` 與 `a11y-phase1` 通過 → `gh pr merge --squash --delete-branch` → 確認 `main` 的 Actions 與 Vercel。
2. **測試（testing worktree）**：在 `test/site-quality` 或新功能分支改 `tests/`、workflow → `commit` → 推送該分支並開 PR，流程同上；不要合到本機 `main` 再推。
3. **跨區**：講義不直接改 testing 目錄；測試不大改講義內容。
4. PR 合併後，各 worktree：`git fetch` + `merge --ff-only origin/main` 同步。
5. CI 失敗：最多三輪修正再推同一分支；仍失敗則停，附 PR 與 run 連結。不得 `--admin` 合併或改 Ruleset。
6. 推送前無法跑 Playwright（本機禁 Node）→ 回報須寫明**風險**，以 PR 上的 Actions 為準。

### 將 `main` 同步到 testing worktree（示例）

```powershell
cd C:\Users\chunhsinkuo\junior-physics-testing
git fetch origin
git merge --ff-only origin/main
```

合併後 `git status` 應仍**不含** `sections/lab-1-2-sheet.html` 等講義 WIP（除非 B 分支刻意納入）。

## Stash 與備份

- 倉庫級 `git stash` 所有 worktree 可見；**勿**在錯誤 worktree 重複 `stash apply`。
- 講義 WIP 應留在 **lecture** worktree 工作目錄或獨立 commit；`stash@{0}` 為歷史備份時，**刪除前須老師確認**。

## 禁止操作

- `git reset --hard`、`git clean -fd`、force push、刪除他人未提交修改。
- 跨 worktree 直接編輯檔案。
- 直推 `main`；未經老師同意就合併高風險變更的 PR。
- 以覆蓋方式解決 merge conflict（須保留雙方意圖、必要時三方合併）。
