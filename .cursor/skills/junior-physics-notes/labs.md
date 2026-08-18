# 實驗專區（活動紀錄本）

獨立一章 `lab.html`＋`js/config-lab.js`，**不是**第 6 章。頂欄用 `nav: "實驗專區"`，禁止顯示「第 lab 章」。

觸發：使用者上傳活動紀錄本、實驗 PDF、說要做實驗專區、或改 `sections/lab-*.html`。

## 不可破：步驟是上課主軸

實驗頁不是觀念講義加一段步驟摘要。上課要能**跟著螢幕一步一步做**。活動紀錄本的每一個操作都要單獨一格，這是頁面上最長、最顯眼的區塊。

順序：

1. `#inquiry` 本節要驗證什麼
2. `#p1` 目的、預測、器材（可短）
3. **逐步操作（最長）**：一格一步，甲／乙分卡也一樣
4. `#exp` 紀錄表與結果討論
5. `#memo` → `#claim`（到主張為止）

toc 要能跳到各組步驟，例如「步驟　甲　量液體」，不要寫成「重點 1」。toc **不要**「練習」「段考」。

`ol.q` 只用在假設、器材清單、觀念補充。動手步驟禁止 `ol.q`。

**每個實驗都要材料確認**：器材表之後、動手之前，必須有一格 `.lab-step`（標題用「動手前核對器材是否到齊」）。這一步**一定要有核對表** `.lab-kit`，讓學生逐項勾「到齊」「完好／足量」，缺件寫備註。缺件、破損、藥品／樣品不足時先舉手。可用 `.lab-check`（CSS 自動加「核對」前綴）。勾選與備註用一般 `<input>`（不要 `class="blank"`，否則會被凍成 span）。不要略過這一步直接做。

## 不要練習、段考前練習、章末評量

實驗專區是跟著步驟做，不是練段考。

- 不要 `#drill`、不要 `.drill-grid`
- 不要 `exams/lab-*.html`、不要 `review-lab.html`、不要 `js/exam-lab*.js`
- config **不要** `review`，`sections` **不要** `exam`（頂欄與目錄才不會出現段考前練習、章末評量）
- inquiry-follow 寫到本節主張即可，不要「再用練習檢驗」
- inquiry-next 連下一實驗即可，不要「先用下面練習」

第 3～5 章講義仍要練習、段考前練習與章末評量。實驗專區三樣都不要。

## 一步一格

官方 class（寫在同一份 `css/style.css`，不要另開檔）。`.lab-steps` 會自動出現「逐步操作」標籤；`.lab-caution`／`.lab-record` 會自動加「注意」「紀錄」前綴，正文不要再寫這兩個字。

```html
<ol class="lab-steps">
  <li class="lab-step">
    <h3 class="subh">測量空量筒的質量</h3>
    <p>天平歸零後，測量 50 mL 空量筒的質量 M<sub>量筒</sub>。</p>
    <p class="lab-caution">擺放量筒於天平時，應確保量筒已保持平衡再離手，以免摔落。</p>
    <p class="lab-record">記錄空量筒的質量 M<sub>量筒</sub>。</p>
    <!-- 這一步用得到的 SVG 放在這一格，不要全部堆在最後 -->
  </li>
</ol>
```

材料確認格必備核對表（放在該步 `.lab-step` 裡，不要只寫一句「對照器材表」）：

```html
<div class="lab-kit-wrap">
  <table class="lab-kit">
    <caption>實驗材料核對表（每組）</caption>
    <thead>
      <tr>
        <th scope="col">項次</th>
        <th scope="col">材料</th>
        <th scope="col">應備</th>
        <th scope="col">到齊</th>
        <th scope="col">完好／足量</th>
        <th scope="col">備註</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td class="lab-kit-name">上皿天平（或電子天平）</td>
        <td>1 組</td>
        <td><input type="checkbox" data-kit="h1" aria-label="上皿天平 到齊"></td>
        <td><input type="checkbox" data-kit="g1" aria-label="上皿天平 完好足量"></td>
        <td><input type="text" class="lab-kit-note" data-kit="n1" aria-label="上皿天平 備註" placeholder="缺／破寫這裡" autocomplete="off"></td>
      </tr>
    </tbody>
  </table>
</div>
```

禁止把多步收成短清單：

```html
<!-- 錯：上課跟不做 -->
<ol class="q">
  <li>秤 100 g 水。</li>
  <li>架酒精燈，液泡不可碰杯底。</li>
  <li>每分鐘記一次溫度。</li>
</ol>
```

每一步盡量含：

| 區塊 | 何時要有 |
|---|---|
| `.subh` 動作名 | 一定要，用紀錄本原句 |
| 正文：做什麼、用什麼、讀哪裡 | 一定要，不刪原步驟、不把兩步併成一句 |
| `.lab-check` | **每個實驗第一格必有**：動手前核對器材是否到齊 |
| `.lab-kit` | **材料確認必有**：一列一項，勾到齊／完好，備註寫缺件 |
| `.lab-caution` | 原卷有「注意／！」就留 |
| `.lab-record` | 原卷有「記錄／觀察」就留；材料確認也要記缺件 |
| 步驟 Q 用 `.inquiry-ask` | 原卷有步驟 Q 就留；答案可挖空或放顯示答案 |
| SVG／圖 | 跟該步有關就放在**那一格** |

禁止：

- 把 4～6 步縮成一個編號清單就交差
- 材料確認只寫「對照器材表」、沒有 `.lab-kit` 核對表讓學生勾選
- 只寫原理、略過「先做 A 再做 B」
- 注意事項只出現在 extra，步驟格裡沒有
- 刪掉器材表、安全句、步驟 Q
- 把摺濾紙、量焦距、換三種溫度這類多步收成一格

## 其他仍要遵守

- 不刪內容；兩層 `.extra`＋`.gifted` 仍要有（實驗卡有新觀念也一樣）
- 挖空 `input.blank`；探究 textarea 由 `app.js` 插
- 檔名 `sections/lab-1-2.html`，避免將來和第 1 章講義搶 `sections/1-2.html`
- `chapter.id` 用 `"lab"`，並在**每一份** config 的 `chapters` 加 `{ id: "lab", title: "實驗專區", file: "lab.html", nav: "實驗專區" }`
- `layout.js` 用 `c.nav || "第 "+c.id+" 章"`
- 不要假造題庫，也不要做章末評量
- 原卷沒有的實驗不要發明（PDF 缺第 3 章波動就不要硬補）

範本頁：`sections/lab-1-2.html`。
