# HTML 樣板

新檔一律從現有章複製再改字。講義對齊 `sections/4-1.html`，章首對齊 `ch4.html`，段考對齊 `exams/4-1.html`，章末對齊 `review-ch4.html`。

## 講義頁骨架

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#fffefb">
  <title>國中八年級理化｜第N章 章名｜N-1 小節名</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/style.css">
</head>
<body data-root=".." data-page="section" data-section="N-1">
  <div id="site-header"></div>
  <div class="wrap workbook" id="top">
    <section class="hero">
      <span class="kicker">國中八年級　理化講義</span>
      <h1>N-1　小節名</h1>
      <p>探究問題：……？</p>
      <!-- SVG：波動用正弦；光／直線用折線，見 ch4.html -->
    </section>
    <nav class="toc no-word">
      <a href="#inquiry"><small>探究</small>本節問題</a>
      <a href="#p1"><small>重點 1</small>…</a>
      <a href="#memo"><small>整理</small>考前速記</a>
      <a href="#claim"><small>主張</small>本節結論</a>
      <a href="#drill"><small>練習</small>基本＋進階</a>
      <a href="../exams/N-1.html"><small>段考</small>練習</a>
    </nav>
    <!-- 探究卡、重點卡、memo、claim、drill -->
    <p class="footer">…<br>原始碼：<a data-github target="_blank" rel="noopener">GitHub 專案</a></p>
  </div>
  <div class="toast" id="toast"></div>
  <script src="../js/config-chN.js"></script>
  <script src="../js/layout.js"></script>
  <script src="../js/app.js"></script>
</body>
</html>
```

章首 `data-root="."`，CSS／JS 路徑不加 `../`。第 3 章設定檔是 `js/config.js`，章首／目錄是 `index.html`。班級、姓名、座號只放 `cover.html`，不要放在章首。

## 重點卡內部順序（有就全留）

1. `section-head`
2. `inquiry-ask` 探究線索
3. 課文：`.def`、`.subh`、表格、`.split`＋SVG
4. `.note` 補充句
5. `.tips`（可選）→ `.extra`（**必備，國中程度**）→ `.wrong-note`（可選）→ `.gifted`（**必備，國中資優**）
6. `.ex-box.think` 辨正（○／×）→ `.ex-box.quiz` 牛刀小試 3 題左右
7. `inquiry-bridge`
8. `</article>`

兩層補充的寫法、差別與禁止事項見 [extras.md](extras.md)。課文後一定要外加，不能只抄課本。

補充區塊：

```html
<section class="extra">
  <div class="ex-title"><span class="tag tag-purple">觀念補充</span> 國中必記：標題</div>
  <ul class="q"><li>段考要分得清的那句；一個生活例子。</li></ul>
</section>
<section class="gifted">
  <div class="ex-title"><span class="tag tag-gifted">資優補充</span> 標題</div>
  <ul class="q"><li>同一觀念再往下挖一層，仍用八年級句子。</li></ul>
</section>
```

`tips` 用 `tag-cyan`；`wrong-note` 用 `tag-rose` 易錯提醒。不要為了版型做空的資優框。

辨正：

```html
<p>1. (
  <input class="blank ox" data-answer="×|X|x" style="width:2.2em">
  ) 錯誤敘述。
  <br>訂正：<input class="blank" data-answer="正確說法" style="width:8em">
</p>
```

## 挖空寬度經驗

| 答案字數 | width |
|---|---|
| 1 字 | 2.4em |
| 2–3 字 | 3.2–3.8em |
| 4–6 字 | 4.5–6em |
| 一句話 | 8–12em |
| 是非 | 2.2em |

數字與科學記號給多個答案：`3×10^8|3*10^8|3×10⁸`。

## SVG

`class="diagram"`，`aria-label` 寫人話。旁邊加 `.caption`。複雜圖可參考 `sections/4-1.html` 針孔、`sections/3-1.html` 繩波。畫不出來就用 `exams/img/` 的 PNG，但講義內優先 SVG。

## 綜合練習

```html
<div class="drill-grid">
  <div class="drill-col"><h3>基本題</h3>…5 題挖空…</div>
  <div class="drill-col"><h3>進階題</h3>…5 題挖空…</div>
</div>
```

基本題＝本節主張關鍵句；進階＝計算、比較、易錯。

## 章首卡片

`#section-cards` 留空，`layout.js` 用 config 填。每張顯示 `id`、`title`、`ask`、`summary`，卡片上要有「段考前練習」連結，下方再放橘色段考卡與章末評量卡。頂欄本章目錄下面要有一列「段考前練習」（各節只標 `N-x`，前面已有「段考前練習」就不必再寫段考）。`ready: false` 會顯示建置中，新章做完再改 `true`。章首就是該章目錄；學生資料只在 `cover.html`。
