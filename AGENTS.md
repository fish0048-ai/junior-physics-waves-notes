# 代理人須知

本倉庫是國中八年級理化講義網站（第 1 章基本測量、第 2 章物質的世界、第 3 章波動、第 4 章光、第 5 章溫度與熱、第 6 章探索物質組成、實驗專區）。

**正式站**：https://junior-physics-waves-notes.vercel.app  
**GitHub**：fish0048-ai/junior-physics-waves-notes  

---

## 多 Agent 並行（必讀優先）

本專案以 **Git Worktree** 讓多個 Cursor Agent 同時工作。完整細節見 [`docs/agent-cooperation.md`](docs/agent-cooperation.md)。Cursor 規則：`.cursor/rules/jpwn-multi-agent.mdc`（並行時**優先**於 `jpwn-github.mdc` 的 push／合併 main）。

### Worktree 與分支

| 工作區 | 路徑 | 分支 | 用途 |
|--------|------|------|------|
| 歷史 | `C:\Users\chunhsinkuo\junior-physics-waves-notes` | `fix/a11y-phase1` | 保留，**勿再開發** |
| **Agent A 講義** | `C:\Users\chunhsinkuo\junior-physics-lecture` | `feature/lecture-content` | 講義、題目、詳解、動畫 |
| **Agent B 品質** | `C:\Users\chunhsinkuo\junior-physics-testing` | `test/site-quality` | Playwright、Actions、a11y |

### 一、Git 工作安全

- 每個並行 Agent **必須**使用上表對應的 Worktree；任務開始前執行 `git worktree list`、`git branch --show-current`、`git status`。
- **不得**跨 Worktree 編輯；**不得**在 `main` 直接開發。
- **禁止** `git reset --hard`、`git clean -fd`、force push、刪除他人未提交修改。
- 新任務先確認檔案所有權（見 `docs/agent-cooperation.md`）及是否與另一 Agent 重疊。
- 功能完成後開 **PR**，雲端 CI（Playwright 等）通過後，**經老師授權**才合併 `main`（正式 Vercel 站）。
- 未明確授權：**不得**合併 `main`、不得正式部署。

### 二、Agent 分工

**Agent A：理化講義**

- 講義、題目、詳解、圖解、動畫、互動教材（`sections/`、`exams/`、`animations/` 等）。
- 維持國中理化科學正確性；繁體中文；檢查錯字、亂碼與學生可理解程度。
- 優先在**抽象、易誤解**處加圖解／動畫，勿無差別堆素材。
- 不擅自改寫其他章節或變更已驗證正確的物理模型。

**Agent B：網站品質**

- `tests/`、`.github/workflows/`、Playwright、回歸與無障礙檢查。
- 發現教材功能問題：提供重現步驟、測試案例、建議修正；**不**大規模改寫講義／動畫。
- 修改共用設定前，確認與 Agent A 分支是否衝突。

**未來新增 Agent**：必須定義專屬 Worktree、分支、主要目錄責任，並更新 `docs/agent-cooperation.md`。

### 三、共用檔案協作

高衝突檔：`package.json`、`playwright.config.ts`、`.gitignore`、`sw-main.js`、`sw-book.js`、`js/app.js`、`js/layout.js` 等。  
同一時間**僅一 Agent 主導**；另一 Agent 須先 merge 最新變更再改。  
**禁止**以直接覆蓋解決衝突；合併後重跑受影響的 CI。

### 四、測試與部署

- 公司 Windows：**禁止** Node.js、npm、npx、pnpm、yarn。
- 安裝、建置、自動化測試僅在核准的 **GitHub Actions** 或 **Vercel** 執行；不得繞過資安政策。
- PR 須回報：修改檔案、測試結果、commit SHA、潛在衝突。
- `main` 對應正式站；PWA 變更須評估 Service Worker 與 **IndexedDB 手寫筆記**。

### 五、開始／結束檢查清單

**開始**

1. 確認 Worktree 與分支  
2. 確認未提交修改（是否含他人 WIP）  
3. 確認本次修改範圍  
4. 確認是否與其他 Agent 重疊  

**結束**

1. 列出修改檔案  
2. 說明測試／CI 結果  
3. 回報 commit SHA 與 PR  
4. 回報尚未驗證項目  
5. 確認未改 `main` 與正式站  

---

## 講義製作（原有流程）

上傳新章時：不刪內容、用探究教學統整、對齊第 4 章，產出章首、各節、段考、章末評量。活動紀錄本／實驗專區以**步驟**為主軸（一格一步），**不要**練習、段考前練習、章末評量。目前章節含第 1～6 章與實驗專區。緒論併入第 1 章，編號 1-0。

## 必讀技能

1. `.cursor/skills/junior-physics-notes/SKILL.md` — 流程與禁則
2. `.cursor/skills/junior-physics-notes/workflow.md` — **人工 vs AI 工作流總表**（開做前對表）
3. `.cursor/skills/junior-physics-notes/inquiry.md` — 探究怎麼寫
4. `.cursor/skills/junior-physics-notes/html-templates.md` — HTML 樣板
5. `.cursor/skills/junior-physics-notes/math.md` — 公式與座標圖
6. `.cursor/skills/junior-physics-notes/extras.md` — 國中程度＋國中資優兩層補充
7. `.cursor/skills/junior-physics-notes/exams.md` — 題庫
8. `.cursor/skills/junior-physics-notes/reference.md` — 檔名與 config
9. `.cursor/skills/junior-physics-notes/labs.md` — 實驗專區（步驟為主）
10. `.cursor/skills/junior-physics-notes/pages.md` — PDF 頁碼（固定頁底）

## Cursor 規則

`.cursor/rules/jpwn-*.mdc` — 講義格式、數學、題庫、頁碼等。  
- **分工**：`jpwn-workflow.mdc`（人工交原料／AI 組站）  
- **並行**：`jpwn-multi-agent.mdc`（Worktree、PR、禁止動 main）  
- **GitHub**：`jpwn-github.mdc`（commit 訊息繁中；並行期 push／合併 main 受 multi-agent 限制）
