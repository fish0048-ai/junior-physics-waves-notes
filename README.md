# 國中八年級理化講義

探究式挖空講義網站（第 1～6 章＋實驗專區）。講義與**練習專區**可分開給學生使用。

## 網址（給學生）

| 用途 | 網址 |
|------|------|
| **正式站（Vercel，建議）** | https://junior-physics-waves-notes.vercel.app/ |
| 講義封面 | https://junior-physics-waves-notes.vercel.app/cover |
| 練習專區 | https://junior-physics-waves-notes.vercel.app/practice |
| GitHub 倉庫 | https://github.com/fish0048-ai/junior-physics-waves-notes |
| GitHub Pages（部分校園網可能擋） | https://fish0048-ai.github.io/junior-physics-waves-notes/ |

根網址 `/` 會導向封面。

## 兩個入口

1. **探究講義**（上課／筆記）  
   - 封面：[/cover](https://junior-physics-waves-notes.vercel.app/cover)  
   - 各章目錄、小節挖空講義、實驗專區

2. **練習專區**（學生自測，不含講義正文）  
   - 總目錄：[/practice](https://junior-physics-waves-notes.vercel.app/practice)  
   - 各章：`practice-ch1` … `practice-ch6`  
   - 只有段考前練習（`exams/`）與章末評量（`review*.html`）

頂欄有「講義／練習」切換。練習模式不會把講義小節目錄混進來。

## 部署到 Vercel

本站已部署於上列正式網址。之後 push `main` 會自動重新部署。本機若已登入 Vercel CLI：

```bash
npx vercel --prod
```
## 資料夾

```
cover.html / practice.html   雙入口
practice-chN.html            各章練習目錄
sections/                    講義
exams/                       段考前練習
review*.html                 章末評量
css/ style.js layout.js …
media/labs/                  實驗示範影片
vercel.json                  Vercel 設定
```

## 使用方式

1. 學生若校園網擋 GitHub：請用 **Vercel 網址**。  
2. 只要練習：開 `practice.html`。  
3. 上課講義：開 `cover.html` 或各章目錄。  
4. 挖空點一下可顯示答案；頂欄可「本卡答案／全頁答案」。
