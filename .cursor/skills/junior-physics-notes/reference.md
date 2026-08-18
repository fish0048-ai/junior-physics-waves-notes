# 檔名與設定對照

以第 4 章為新章範本。第 3 章章首是 `index.html`＋`js/config.js`。

- 探究文案 → [inquiry.md](inquiry.md)
- 頁面骨架 → [html-templates.md](html-templates.md)
- 兩層補充 → [extras.md](extras.md)
- 題庫 → [exams.md](exams.md)
- 實驗專區 → [labs.md](labs.md)

## 倉庫

- GitHub：https://github.com/fish0048-ai/junior-physics-waves-notes
- Pages：https://fish0048-ai.github.io/junior-physics-waves-notes/

## 新章要新增的檔

| 用途 | 路徑 |
|---|---|
| 章首 | `chN.html`（第 3 章例外：`index.html`） |
| 設定 | `js/config-chN.js` |
| 講義 | `sections/N-1.html` … |
| 段考頁 | `exams/N-1.html` … |
| 小節題庫 | `js/exam-chN-sections.js` |
| 小節答案帶 | `js/exam-chN-keys.js` |
| 章末題庫 | `js/exam-chN.js`（鍵 `"ch-N"`） |
| 章末評量 | `review-chN.html` |
| 附圖 | `exams/img/N-x/image001.png` |

還要把新章寫進**每一份**現有 config 的 `chapters`（目前至少 `js/config.js`、`js/config-ch4.js`、`js/config-ch5.js`、`js/config-lab.js`）。

實驗專區：`lab.html`、`js/config-lab.js`、`sections/lab-N-x.html`。`chapter.id` 為 `"lab"`，必填 `nav: "實驗專區"`。**步驟是上課主軸**（一格一步 `.lab-step`）。**不要** `exams/lab-*.html`、不要 `#drill`、不要 `review-lab.html`、config 不要 `exam`／`review`。寫法見 [labs.md](labs.md)。

共用、禁止複製第二份：`css/style.css`、`js/layout.js`、`js/app.js`、`js/class-notes.js`、`js/exam.js`。

## config

```js
window.APP_CONFIG = {
  githubRepo: "https://github.com/fish0048-ai/junior-physics-waves-notes",
  githubPages: "https://fish0048-ai.github.io/junior-physics-waves-notes/",
  chapter: { id: "N", mark: "一字", title: "章名", grade: "國中八年級理化" },
  home: "chN.html",
  chapters: [
    { id: "3", title: "波動與聲音", file: "index.html" },
    { id: "4", title: "光", file: "ch4.html" },
    { id: "N", title: "章名", file: "chN.html" }
  ],
  review: {
    id: "ch-N",
    file: "review-chN.html",
    nav: "章末評量",
    title: "第 N 章複習評量",
    summary: "題庫 120 題，抽出 40 題　四選一"
  },
  sections: [
    {
      id: "N-1",
      title: "小節標題",
      file: "sections/N-1.html",
      exam: "exams/N-1.html",
      ready: true,
      ask: "能進教室的探究問題？",
      summary: "重點關鍵詞，用頓號或逗號"
    }
  ]
};
```

- `mark`：頂欄圓標一個字（波、光）。
- `ask`：與該節 hero 探究問題同一句。
- `summary`：給章首卡片次行，不是探究問題。
- `ready: false` 會顯示「講義建置中」。

`layout.js` 依 `data-root` 組相對路徑；平板／內嵌會加 `is-touch`、`is-embedded`。

## 頁面 data 與腳本

| 頁 | data-root | data-page | data-section | 腳本 |
|---|---|---|---|---|
| 章首 | `.` | `home` | 無 | config、layout、app |
| 講義 | `..` | `section` | `N-1` | 同上 |
| 段考 | `..` | `exam` | `N-1` | 再加 exam-chN-sections、exam-chN-keys、exam.js |
| 章末 | `.` | `review` | `ch-N` 且 `data-pick="40"` | config、layout、app、exam-chN、exam.js |

第 3 章段考／章末另載 `exam-bank.js`、`exam-sections.js`、`exam-figs.js`、`exam-ch3.js`。新章不要加。

## 本機儲存（已有，不要重做）

| 鍵 | 用途 |
|---|---|
| `jpwn.classes` / `jpwn.classId` | 班級名單與目前班級 |
| `jpwn.inquiryWrites` | 探究填答 `${classId}::${sectionId}` |
| `jpwn.examSets` | 章末題本 `${classId}::${secId}` |
| IndexedDB `jpwn-ink` | 觸控筆筆劃 |

## 筆記模式（已有）

`class-notes.js`：筆記鈕、觸控筆、手指預設滑動；開「手指可寫」才用手指當筆。探究 textarea 在筆記模式下仍可打字。
