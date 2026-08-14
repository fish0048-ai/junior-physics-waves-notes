# 國中八年級理化｜3-1 波的傳播　挖空講義

依國中八年級理化講義「第 3 章 波動與聲音／3-1 波的傳播」（約第 73–79 頁）重點改編的**挖空練習網頁**，可直接在瀏覽器作答、顯示答案，並下載 **A4 Word 圖文講義**。

## GitHub

- 原始碼倉庫：<https://github.com/fish0048-ai/junior-physics-waves-notes>
- GitHub Pages（上傳後）：<https://fish0048-ai.github.io/junior-physics-waves-notes/>

### 上傳本專案

```bash
cd junior-physics-waves-notes
git init
git add .
git commit -m "feat: 新增 3-1 波的傳播挖空講義網頁與 Word 下載"
git branch -M main
git remote add origin https://github.com/chunhsinkuo/junior-physics-waves-notes.git
git push -u origin main
```

接著到 GitHub 倉庫 **Settings → Pages → Deploy from a branch → main / (root)**，即可用 GitHub Pages 開啟網頁。

## 使用方式

1. 用瀏覽器開啟 `index.html`（或 GitHub Pages 網址）。
2. 在綠色底線空格填答；可按 **檢查作答** 或 **顯示答案**。
3. **下載 A4 Word**：學生挖空版；**下載教師版**：含參考答案。請用 Microsoft Word 開啟後可另存 `.docx`。
4. **列印**：瀏覽器列印可輸出 A4 PDF。

## 講義內容（對應原講義）

| 區塊 | 內容 |
| --- | --- |
| 重點 1 波動 | 定義、振源、介質；只傳能量不傳介質；水波／繩波／彈簧波 |
| 重點 2 分類 | 力學波／非力學波；橫波／縱波 |
| 延伸 電磁波 | 無線電波→γ 射線特性與應用 |
| 重點 3 性質 | 波峰、波谷、振幅、波長；密部／疏部 |
| 重點 4 | 週期 T、頻率 f、波速 v＝fλ |
| 計算演練 | 繩波 20 cm／4 s；水波圓形波前；2.5λ＝25 cm |
| 延伸 水波 | 點波源／棒狀波源；深水波長較長、波速較大 |

挖空重點包含：能量、振源、介質、力學波、橫波、縱波、波峰、波谷、振幅、波長、密部、疏部、週期、頻率、波速公式、反比、深淺水等。

## 資料夾

```
index.html          講義網頁
css/style.css       版面樣式
js/config.js        GitHub 網址
js/app.js           填空與答案
js/export-word.js   A4 Word 下載（含 SVG 轉圖）
```

本專案為純靜態網頁，不需安裝 Node／Python。圖示皆以 SVG 重繪，未使用原書掃描檔。
