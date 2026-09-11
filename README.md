# 國中八年級理化講義

探究式挖空講義網站（第 1～6 章＋實驗專區）。講義與**練習專區**可分開給學生使用。

## 網址

| 用途 | 網址 |
|------|------|
| GitHub 倉庫 | https://github.com/fish0048-ai/junior-physics-waves-notes |
| GitHub Pages（部分校園網可能擋） | https://fish0048-ai.github.io/junior-physics-waves-notes/ |
| **Vercel（建議學生用這個）** | 部署後見下方說明；入口 `cover.html`／`practice.html` |

## 兩個入口

1. **探究講義**（上課／筆記）  
   - 封面：`cover.html`  
   - 各章目錄、小節挖空講義、實驗專區

2. **練習專區**（學生自測，不含講義正文）  
   - 總目錄：`practice.html`  
   - 各章：`practice-ch1.html` … `practice-ch6.html`  
   - 只有段考前練習（`exams/`）與章末評量（`review*.html`）

頂欄有「講義／練習」切換。練習模式不會把講義小節目錄混進來。

## 部署到 Vercel（繞過校園擋 GitHub Pages）

1. 到 [vercel.com](https://vercel.com) 用 GitHub 登入  
2. **Add New Project** → 選 `junior-physics-waves-notes`  
3. Framework Preset 選 **Other**；Root Directory 留空；直接 Deploy  
4. 部署完成後會得到 `https://xxxxx.vercel.app`  
5. 把學生連結改成：  
   - 講義封面：`https://xxxxx.vercel.app/cover`  
   - 練習專區：`https://xxxxx.vercel.app/practice`

本倉庫已含 `vercel.json`（靜態站）。本機若已登入 Vercel CLI，也可執行：

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
