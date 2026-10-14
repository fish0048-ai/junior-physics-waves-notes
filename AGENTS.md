# 代理人須知

本倉庫是國中八年級理化講義網站（第 1 章基本測量、第 2 章物質的世界、第 3 章波動、第 4 章光、第 5 章溫度與熱、第 6 章探索物質組成、實驗專區）。

**正式站**：https://junior-physics-waves-notes.vercel.app  
**GitHub**：fish0048-ai/junior-physics-waves-notes  

---

## 口語指令自動化（必讀優先）

老師以自然語言描述需求即可（例如「改這份講義」「檢查第四章」「修正列印」）。Agent **自行**完成修改、檢查、`commit`、**`push origin main`**、監看 GitHub Actions 與 Vercel 部署，**不需 PR**、**不必**每次詢問是否 push。高風險變更仍須先取得同意（見口語自動化文件）。

- **總則**：[`docs/voice-driven-automation.md`](docs/voice-driven-automation.md)
- **Cursor 規則**：`.cursor/rules/jpwn-automation.mdc`（優先於舊「每步都要確認」習慣）
- **人工必交原料**（新章 Word、題庫 docx 等）仍見 `jpwn-workflow.mdc`／技能 `workflow.md`— AI 不可代替

---

## 多 Agent 並行

本專案以 **Git Worktree** 分工。細節見 [`docs/agent-cooperation.md`](docs/agent-cooperation.md)。規則：`.cursor/rules/jpwn-multi-agent.mdc`、`.cursor/rules/jpwn-github.mdc`（合併 `main` 條件見口語自動化文件）。

### Worktree 與分支

| 工作區 | 路徑 | 分支 | 用途 |
|--------|------|------|------|
| 歷史 | `C:\Users\chunhsinkuo\junior-physics-waves-notes` | `fix/a11y-phase1` | 保留，**勿再開發** |
| **講義（主）** | `C:\Users\chunhsinkuo\junior-physics-lecture` | **`main`** | 講義、題目、詳解、動畫；**push main 主入口** |
| **品質／CI** | `C:\Users\chunhsinkuo\junior-physics-testing` | `test/site-quality` | Playwright、Actions；合入 `main` 後 push |

### 一、Git 工作安全

- 每個並行 Agent **必須**使用上表對應的 Worktree；任務開始前執行 `git worktree list`、`git branch --show-current`、`git status`。
- **不得**跨 Worktree 編輯。講義常規在 **lecture worktree 的 `main`** 開發並 **`push origin main`**。
- **禁止** force push、刪 stash（除非老師明確要求）、覆蓋他人未提交修改、`git reset --hard`／`git clean -fd`。
- 推送前：`git fetch`；落後則 `pull --ff-only`；確認 `git status`（見 [`docs/voice-driven-automation.md`](docs/voice-driven-automation.md)）。
- 推送後：確認 Actions 與 Vercel；失敗則停並回報，不得假稱成功。
- 若 GitHub **拒絕 push**（branch protection）→ 回報須調整的設定，**不得**繞過。
- 使用者當次說「不要合併／不要 push」，或觸發「必須詢問」條款 → 停止合併／部署。

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
- 任務結束須回報：修改摘要、push 後測試／部署結果、commit SHA（失敗時必附）。
- `main` 對應正式站；PWA 變更須評估 Service Worker 與 **IndexedDB 手寫筆記**。

### 五、Agent 內部檢查（不必逐項報告給老師）

開始：Worktree、分支、`git status`、修改範圍、是否與另一 Agent 重疊。
結束：依口語自動化文件**簡短回報**；僅失敗時附 PR／CI 細節。

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
- **自動化**：`jpwn-automation.mdc`（口語驅動、PR、CI、合併條件）
- **並行**：`jpwn-multi-agent.mdc`（Worktree、禁止跨區）
- **GitHub**：`jpwn-github.mdc`（commit／**push main**；推送前後檢查）
