# 國中理化講義站　科技升級實作計畫

> **用途：** 在既有靜態講義架構上，引入「裝置感測、離線、課堂互動」等新科技，**不是**再堆外部教學連結。  
> **狀態：** 規劃稿（2026-09-24）— 待老師確認優先順序後逐階實作。  
> **實作時：** Agent 依 `jpwn-core.mdc`、`jpwn-workflow.mdc` 對齊第 4 章；每階完成後 commit＋push。

---

## 一、目標與原則

### 目標（一句話）

把講義從「看＋挖空＋動畫」升級為「**學生用平板產生證據、數據回填探究、離線也能上課、全班可同步互動**」。

### 必守原則

| 原則 | 說明 |
|------|------|
| 不換框架 | 維持 HTML/CSS/JS 靜態站 + Vercel，不重寫成 React |
| 對齊探究鏈 | 新工具必須接「提問→證據→主張」，不是炫技小遊戲 |
| 國中範圍 | 公式、用語不超課綱；資優延伸放 `.gifted` |
| 不做學生 AI 聊天 | 禁止開放式問答機器人；AI 僅老師端 Cursor／離線腳本 |
| 隱私 | 麥克風／相機需明確授權說明；課堂互動資料預設不存個資 |
| 沿用既有模組 | 動畫對齊 `animations/` + `embed.css`；評量對齊 `exam.js`／`recap.js` |

### 現有科技資產（不重複造輪）

- 平板筆記：`js/class-notes.js`（IndexedDB + Gist）
- 互動動畫：10 支 `animations/*.html`
- 整本預載：`js/book-cache.js`（BroadcastChannel）
- SW 雛形：`sw-book.js`（**目前會自解註，需重寫**）
- 雙入口：講義／`practice.html` 練習專區

---

## 二、總架構（新增模組）

```
junior-physics-waves-notes/
├── animations/              # 既有；新增 live 互動頁
│   ├── audio-lab.html       # [Phase 1] Web Audio 頻率／波形
│   ├── echo-timer.html      # [Phase 1] 回聲計時
│   └── embed.css            # 共用
├── js/
│   ├── live/                # [新建] 感測與即時工具共用
│   │   ├── audio-analyzer.js
│   │   ├── echo-timer.js
│   │   └── device-motion.js # [Phase 2]
│   ├── pwa/                 # [Phase 1]
│   │   ├── register-sw.js
│   │   └── sw-main.js       # 取代 sw-book 自解註邏輯
│   ├── classroom/           # [Phase 2]
│   │   ├── poll-host.js
│   │   └── poll-client.js
│   └── phyphox-import.js    # [Phase 2] CSV 匯入繪圖
├── manifest.webmanifest     # [Phase 1] PWA
├── classroom-poll.html      # [Phase 2] 老師出題／學生作答
└── sections/                # 各節嵌入 iframe + 探究引導句
```

**對外依賴（Phase 2 起）：**

- 課堂即時互動需 **後端**（建議 Supabase Realtime 或 Vercel KV + Edge Function；詳 Phase 2）
- 其餘 Phase 1 可 **零後端**（純瀏覽器 API）

---

## 三、分階計畫

### Phase 1｜裝置感測實驗室 ＋ 真·離線（4～6 週，學生最有感）

**交付物：** 2 支新 live 動畫、PWA 可離線上整章、3-3／3-4 講義嵌入。

| # | 項目 | 技術 | 對應小節 |
|---|------|------|----------|
| 1.1 | 聲音頻率即時儀 | Web Audio API + AnalyserNode + FFT | 3-4 音調／音色 |
| 1.2 | 回聲距離計算器 | 麥克風 onset 偵測 + 計時 | 3-3 回聲、聲納 |
| 1.3 | PWA 離線 | Service Worker + manifest + 快取策略 | 全站（優先 1～3 章） |
| 1.4 | 講義嵌入與探究引導 | iframe + `.inquiry-ask` 操作步驟 | 3-3、3-4 |

**不做（Phase 1）：** Web Bluetooth、WebXR、課堂後端。

---

### Phase 2｜課堂同步 ＋ 數據匯流 ＋ 3D（6～10 週）

| # | 項目 | 技術 | 對應小節 |
|---|------|------|----------|
| 2.1 | 快問快答房間 | WebSocket／Supabase Realtime + QR | recap／段考題 |
| 2.2 | Phyphox CSV 匯入 | File API + 繪製 `svg.math-graph` | 5-2 比熱、3-2 聲速 |
| 2.3 | 分子 3D 檢視 | `<model-viewer>`（glTF） | 6-2、6-4 |
| 2.4 | 加速度計振動 | DeviceMotion API | 3-1 週期／頻率 |
| 2.5 | 練習專區入口補齊 | config-practice + layout | recap、期中考 |
| 2.6 | 錯題本 | localStorage + recap/exam 整合 | 練習專區 |

---

### Phase 3｜進階／資優／科展（選做）

| # | 項目 | 技術 | 備註 |
|---|------|------|------|
| 3.1 | Web Bluetooth 溫度 | BLE + Chart | 需校內硬體 |
| 3.2 | WebXR 透鏡 AR | WebXR + Three.js | 展示用 |
| 3.3 | 全站搜尋 | Pagefind | 六章完成後 |
| 3.4 | Playwright 煙霧測試 | CI on push | KaTeX、recap 題數、iframe |
| 3.5 | 語音合成／辨識 | Web Speech API | 無障礙＋口述主張 |

---

## 四、Phase 1 細部任務

### Task 1.1｜共用 live 模組骨架

- [ ] 建立 `js/live/audio-analyzer.js`：初始化 AudioContext、權限請求、銷毀
- [ ] 建立 `animations/audio-lab.html`：波形 + 主頻顯示 + 開始／停止
- [ ] 沿用 `animations/embed.css`；提供「另開視窗」連結
- [ ] 螢幕顯示：頻率 Hz、簡化音調高低指示（不冒充精密 dB 計）

**驗收：**

- Chrome／Edge 平板：允許麥克風後可看到隨聲音變化的頻譜
- 無麥克風時顯示繁中說明，不 crash
- `JPWNMath.render()` 後公式正常

---

### Task 1.2｜嵌入 3-4 講義

- [ ] `sections/3-4.html` 樂音三要素段落加 iframe
- [ ] 加 `.inquiry-ask`：「對麥克風敲音叉／说话，預測頻率變高還是變低？」
- [ ] `.extra`：操作步驟（允許麥克風、看 Hz 數字）
- [ ] `.gifted`：FFT 與泛音、基頻關係（國中資優程度）

**驗收：** 講義頁 iframe 可操作；列印 PDF 時 iframe 不裁切（沿用既有 print 規則）

---

### Task 1.3｜回聲計時器

- [ ] 建立 `js/live/echo-timer.js` + `animations/echo-timer.html`
- [ ] 輸入或預設 \(v=340\,\mathrm{m/s}\)，測 \(\Delta t\) 後算 \(d=v\Delta t/2\)
- [ ] UI：開始監聽 → 顯示偵測到的回波時間 → 距離

**驗收：** 教室拍手對牆壁實測，誤差在合理範圍（±20% 可接受，附 `.wrong-note` 說明環境雜訊）

---

### Task 1.4｜嵌入 3-3 講義

- [ ] `sections/3-3.html` 回聲段落嵌入 echo-timer
- [ ] 探究引導對照 \(d=v\Delta t/2\) 為何除以 2

---

### Task 1.5｜PWA 離線

- [ ] 新增 `manifest.webmanifest`（名稱、圖示、theme_color 對齊 `#fffefb`）
- [ ] 新增 `js/pwa/sw-main.js`：快取 `css/`、`js/`、`animations/`、當章 `sections/`
- [ ] 新增 `js/pwa/register-sw.js`；在 `layout.js` 條件載入
- [ ] **移除或改寫** `sw-book.js` 自解註邏輯
- [ ] `layout.js` 頂欄可選顯示「離線狀態」指示（小 icon）

**快取策略：**

| 資源 | 策略 |
|------|------|
| HTML 講義 | network-first，離線 fallback cache |
| css/js/animations | cache-first |
| KaTeX CDN | stale-while-revalidate 或預快取 |
| YouTube／外連 | 不離線（顯示提示） |

**驗收：**

- DevTools → Application → Service Worker 已註冊
- 飛航模式可開啟已快取之 3-4 講義 + audio-lab
- 筆記 IndexedDB 離線仍可用；有網路時 Gist 照常同步

---

### Task 1.6｜文件與 config

- [ ] `reference.md` 增「Live 動畫」一節
- [ ] `AGENTS.md` 或技能補 PWA／麥克風權限說明
- [ ] 更新 `README.md`「加到主畫面／離線使用」

**Phase 1 完成定義（DoD）：** 3-3、3-4 有 live 實驗；PWA 離線可上第 3 章；已 push；老師平板共驗一節課。

---

## 五、Phase 2 細部任務（摘要）

### Task 2.1｜課堂快答（需後端決策）

**架構選項（老師擇一）：**

| 方案 | 優點 | 缺點 |
|------|------|------|
| A. Supabase Realtime | 開發快、免維運 | 需註冊、學校可能擋外連 |
| B. Vercel KV + Edge | 與現站同 deploy | 要設定 KV |
| C. 純 BroadcastChannel | 零後端、同 WiFi | 無法跨裝置房間、老師需開主控分頁 |

**建議：** 先做 **C 原型**（同一台老師電腦投影 + 學生同 URL 帶 `?room=`），驗收流程後再升級 A 或 B。

- [ ] `classroom-poll.html`：老師選 recap 題號 → 顯示 QR
- [ ] 學生頁：四選一 → 提交 → 老師看即時長條圖
- [ ] 不存姓名；可選座號（對齊座位表文化）

---

### Task 2.2｜Phyphox CSV 匯入

- [ ] `js/phyphox-import.js`：讀 CSV 兩欄時間／數值 → 畫 `svg.math-graph`
- [ ] 嵌入 `sections/5-2.html` 或實驗專區 `lab-5-2`
- [ ] 附操作圖：Phyphox 匯出 → 上傳

---

### Task 2.3｜model-viewer 分子 3D

- [ ] 下載或製作 H₂O、NaCl 簡模（glTF，&lt;500KB）
- [ ] `sections/6-4.html` 嵌入 `<model-viewer>`
- [ ] 無 WebGL 時 fallback 靜態圖

---

### Task 2.4～2.6

- [ ] DeviceMotion 振動計 → `animations/` 或 3-1 嵌入
- [ ] `practice.html` 加 recap、期中考卡片
- [ ] 錯題本：`exam.js`／`recap.js` check 後寫入 `jpwn.wrong.*`

---

## 六、Phase 3 選做清單

僅在老師確認硬體／科展需求後啟動；每項獨立 PR，不綁 Phase 1。

---

## 七、風險與對策

| 風險 | 對策 |
|------|------|
| 學校 iPad 禁麥克風 | 頁面頂部說明 + 老師預先設定；fallback 純動畫 |
| HTTPS 才能用感測 API | Vercel 已 HTTPS；本機用 localhost |
| SW 快取舊版講義 | 版本號 `jpwn-cache-vN`，更新時 bump |
| 分貝計不準 | 標示「相對示範」非檢定儀器；教學用對數概念 |
| 課堂互動隱私 | 預設匿名；資料 24h 清除 |
| 動畫過多拖慢平板 | lazy-load iframe；PWA 只快取常用章 |

---

## 八、測試與共驗清單

### 自動（Phase 3 起）

- [ ] Playwright：開 3-4 → iframe 存在 → 按鈕可點
- [ ] 腳本：所有 `recap-*.js` 題數 = `questionCount`
- [ ] 連結檢查：animations 無 404

### 人工（每 Phase 必做）

- [ ] 平板 Ctrl+F5：麥克風授權流程
- [ ] 飛航模式：第 3 章一節可讀 + 筆記可寫
- [ ] 列印 PDF：live 區不亂版（或 print 隱藏 iframe 改 QR）
- [ ] 段考範圍對照 `_refs/supplements/` 115 課本該章

---

## 九、時程建議（依老師可用時間調整）

| 週次 | 工作 | 產出 |
|------|------|------|
| W1 | Task 1.1 + 1.2 | audio-lab + 3-4 嵌入 |
| W2 | Task 1.3 + 1.4 | echo-timer + 3-3 嵌入 |
| W3～W4 | Task 1.5 | PWA 離線第 3 章 |
| W5 | Task 1.6 + 共驗 | 文件、修正、上線 |
| W6～W8 | Phase 2.1 原型 | 課堂快答 BroadcastChannel 版 |
| W9～W10 | Phase 2.2～2.3 | Phyphox + 3D 分子 |

---

## 十、待老師決策（實作前確認）

1. **Phase 1 是否同意先做？**（audio-lab + echo-timer + PWA）
2. **PWA 離線範圍：** 僅第 3 章 vs 第 1～3 章（期中考）vs 整本
3. **課堂互動後端：** 能否用 Supabase／是否校園可連外？
4. **分貝顯示：** Phase 1 只做頻率，還是要相對 dB 示範（需加免責聲明）？
5. **列印策略：** live iframe 列印時隱藏改 QR，還是保留截圖？

---

## 十一、與「教學資源外連」的界線

| 會做 | 不做 |
|------|------|
| 站內 Web API 收學生環境數據 | 只貼 PhET／YouTube 連結當完成 |
| 數據接探究主張與公式 | 開放 AI 聊天解題 |
| PWA、即時互動、3D 嵌入 | 整站改 SPA 框架 |

---

**下一步：** 老師回覆「第十章 5 項決策」→ Agent 依本計畫執行 Phase 1 Task 1.1 起。
