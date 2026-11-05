---
name: junior-science-review
description: >-
  Reviews Taiwan junior-high science materials for scientific accuracy, grade-level fit,
  Traditional Chinese, diagrams, and answer keys. Use when the user asks to 審查講義、核對題目、
  檢查科學正確性、迷思概念、實驗解釋、或判斷要不要加動畫. Does not rebuild chapters and does not
  replace junior-physics-notes. Skip a full review for typo-only or formatting-only edits
  unless the user explicitly asks for a review.
---

# 國中理化教材審查

只審查，不把這一章重做成新網站。製作新章仍用 `junior-physics-notes`。不要套用座位表的試算表、學生資料或 `Code.gs` 規則。

小改（錯字、空白、class 名稱）且使用者沒有要求審查時，不要跑完整清單。

## 開始前

1. 讀這份材料的原文，不依檔名假設內容。
2. 對過同專案的 `jpwn-*.mdc` 與 `junior-physics-notes`，避免審查標準和網站骨架互相矛盾。
3. 對象是台灣國中八、九年級。高中或大學內容只在會造成誤解時指出，不要為了完整而加進來。

## 審查

**A. 科學正確性**

- 概念、公式、單位、數值、計算過程。
- 實驗現象和解釋是否同一件事。
- 分開寫：科學事實、教學用簡化模型、推論。
- 沒有把握的內容標「待查證」，不要寫成確定事實。

**B. 國中教學適切性**

- 是否超出八、九年級必要範圍。
- 學生容易形成的迷思概念。
- 例題有沒有足夠引導。
- 可否用學思達或探究式提問，而不是只給結論。

**C. 繁體中文品質**

- 錯字、語意、專有名詞。
- 用台灣課堂常見說法。
- 圖、表、題目沒有亂碼。
- 句子清楚、短，國中生讀得懂。

**D. 圖解與動畫需求**

不是每個概念都要動畫。

- 靜態圖能看懂的，不要建議動畫。
- 時間變化、空間關係或抽象運動，才評估互動。
- 每項建議要寫：學生可能卡在哪個概念、為什麼圖或動畫有幫助。
- 優先沿用現有 HTML、CSS、JavaScript。

**E. 題目與答案驗證**

- 單選必須只有一個明確正確答案。
- 核對數值、單位、計算。
- 題目是否偷偷多了假設。
- 選項是否都說得通。
- 非選題要有可評分的參考解答。

## 輸出

每次完整審查都用這七段，標題不要改：

1. 審查範圍
2. 科學錯誤與證據
3. 學生可能遇到的理解困難
4. 需要修改的文字或題目
5. 建議補充的圖解或動畫
6. 優先修改順序
7. 可信度評分（0–100）

可信度低於 90 的結論標「待查證」。不得為了達到 90 分而提高分數。沒有查到依據時，分數反映把握，不反映希望。

合成練習案例見 [examples.md](examples.md)。那不是網站內容，不要寫進講義。
