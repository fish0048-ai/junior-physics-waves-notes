import { expect, test, type Page } from '@playwright/test';
import { expectNoMajorErrors, openLocal } from './helpers';
import { Ch6IslandsPage, ISLAND_TITLES, type IslandId } from './pages/ch6-islands-page';

// CI 以軟體繪製 3D，群島頁比一般講義重
test.beforeEach(() => {
  test.slow();
});

/** 跳過首次教學，避免遮住要測的畫面 */
async function skipTutorial(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('jpwn.ch6islands.tutorial', 'done');
    } catch {
      /* ignore */
    }
  });
}

test('第 6 章群島頁可載入，3D 或 2D 至少一種可用', { tag: '@basic' }, async ({ page }, testInfo) => {
  await skipTutorial(page);
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo);
  await expect(page.getByRole('navigation', { name: '六座島嶼' }).or(islands.fallback)).toBeVisible();
  await islands.expectStars(0);
  await expectNoMajorErrors(errors);
});

test('章首有群島入口', { tag: '@basic' }, async ({ page }, testInfo) => {
  const errors = await openLocal(page, '/ch6.html', testInfo);
  await expect(page.getByRole('link', { name: /3D 理化探索群島/ })).toBeVisible();
  await expectNoMajorErrors(errors);
});

for (const id of Object.keys(ISLAND_TITLES) as IslandId[]) {
  test(`${ISLAND_TITLES[id]}互動任務可從深層連結開啟`, { tag: '@basic' }, async ({ page }, testInfo) => {
    const islands = new Ch6IslandsPage(page);
    const errors = await islands.open(testInfo, `?island=${id}&start=1`);
    await expect(islands.lab).toBeVisible();
    await expect(islands.labHeading(id)).toBeVisible();
    await expectNoMajorErrors(errors);
  });
}

test('首次進入顯示操作說明，略過後不再出現', { tag: '@basic' }, async ({ page }, testInfo) => {
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo);
  const tutorial = page.getByRole('dialog', { name: '歡迎來到理化探索群島' });
  await expect(tutorial).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: '略過' }).click();
  await expect(tutorial).toBeHidden();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(islands.heading).toBeVisible();
  await expect(page.getByRole('dialog', { name: '歡迎來到理化探索群島' })).toBeHidden();
  await expectNoMajorErrors(errors);
});

test('原子研究所：答錯給具體原因且不加星，答對才點亮星星', { tag: '@full' }, async ({ page }, testInfo) => {
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo, '?island=atom&start=1');
  await expect(islands.lab).toBeVisible();

  await islands.checkAtom();
  await expect(page.getByText(/原子序不是 6/)).toBeVisible();
  await islands.expectStars(0);

  await islands.adjustAtom('質子', 5);
  await islands.checkAtom();
  await expect(page.getByText(/目前是離子/)).toBeVisible();

  await islands.adjustAtom('電子', 5);
  await islands.adjustAtom('中子', 6);
  await expect(page.getByText('中性碳原子（C）')).toBeVisible();
  await islands.checkAtom();
  await expect(page.getByText(/正確！中性碳-12/)).toBeVisible();
  await islands.expectStars(1);
  await expect(page.getByRole('button', { name: '下一關：配對挑戰' })).toBeVisible();
  await expectNoMajorErrors(errors);
});

test('配對挑戰：沒先選左邊會提醒，配錯說明那個特徵屬於誰，全部配完點亮星星', { tag: '@full' }, async ({ page }, testInfo) => {
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo, '?island=atom&start=1&stage=match');
  await expect(page.getByRole('heading', { level: 2, name: '原子研究所 · 配對挑戰' })).toBeVisible();
  const features = page.getByRole('group', { name: '特徵' });
  await features.getByRole('button', { name: '發現中子' }).click();
  await expect(page.getByText('先選左邊的一個詞，再點右邊。')).toBeVisible();

  await page.getByRole('group', { name: '名詞' }).getByRole('button', { name: '道耳頓' }).click();
  await features.getByRole('button', { name: '發現電子' }).click();
  await expect(page.getByText('「發現電子」說的是「湯姆森」')).toBeVisible();
  await expect(page.getByText('錯誤 1')).toBeVisible();

  await islands.matchPairs([['道耳頓', '提出原子說'], ['湯姆森', '發現電子'], ['拉塞福', '發現原子核'], ['查兌克', '發現中子']]);
  await expect(page.getByRole('heading', { level: 3, name: '原子裡的粒子' })).toBeVisible();
  await islands.matchPairs([['質子', '帶正電'], ['中子', '不帶電'], ['電子', '帶負電'], ['原子序', '等於質子數']]);
  await expect(page.getByRole('heading', { name: '配對完成！' })).toBeVisible();
  await islands.expectStars(1);
  await expect(page.getByRole('button', { name: '下一關：挑戰題' })).toBeVisible();
  await expectNoMajorErrors(errors);
});

test('配對挑戰：錯誤超過 3 次不給星星，可以重來', { tag: '@full' }, async ({ page }, testInfo) => {
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo, '?island=decompose&start=1&stage=match');
  await page.getByRole('group', { name: '名詞' }).getByRole('button', { name: '氧化汞' }).click();
  const wrong = page.getByRole('group', { name: '特徵' }).getByRole('button', { name: '通電分解成氫和氧' });
  for (let i = 0; i < 4; i += 1) await wrong.click();
  await expect(page.getByText('錯誤 4')).toBeVisible();
  await islands.matchPairs([
    ['氧化汞', '照光分解成汞和氧'],
    ['水', '通電分解成氫和氧'],
    ['化合物', '可用加熱、光照或通電再分解'],
    ['元素', '不能用一般化學方法再分解'],
    ['拉瓦節', '把這種氣體命名為氧'],
  ]);
  await expect(page.getByRole('heading', { name: '全部配完了' })).toBeVisible();
  await islands.expectStars(0);
  await page.getByRole('button', { name: '再挑戰一次' }).click();
  await expect(page.getByText('錯誤 0')).toBeVisible();
  await expectNoMajorErrors(errors);
});

test('島嶼事件與考前速記讀自講義，公式已排版', { tag: '@full' }, async ({ page }, testInfo) => {
  await skipTutorial(page);
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo, '?mode=2d&island=atom');
  await expect(page.getByRole('heading', { level: 3, name: '島嶼事件' })).toBeVisible();
  await expect(page.getByText('如果原子質量幾乎都在正中央那顆很小的核')).toBeVisible();
  await page.getByText('讀重點：6-3 考前速記').click();
  await expect(page.getByText('同位素：同質子數、不同中子數。')).toBeVisible();
  await expect(page.getByText(/\\\(/)).toHaveCount(0);
  await expectNoMajorErrors(errors);
});

test('會考小船：只用會考題型、答對八成給徽章；學習檔案記錄答題', { tag: '@full' }, async ({ page }, testInfo) => {
  await skipTutorial(page);
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo, '?mode=2d');
  await page.keyboard.press('8');
  await expect(page.getByRole('heading', { level: 2, name: '會考小船' })).toBeVisible();
  await expect(page.getByText(/[〔［][^〕］]*(會考|基測)/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/&#\d+;/)).toHaveCount(0);
  const score = await islands.answerAllWithFirstChoice(5);
  await expect(page.getByText(score >= 4 ? '拿到會考徽章了！' : /就能拿到會考徽章/)).toBeVisible();
  await islands.expectStars(0);

  await page.getByRole('button', { name: '返回群島' }).click();
  await page.getByRole('button', { name: '學習檔案' }).click();
  const profile = page.getByRole('dialog', { name: '學習檔案' });
  await expect(profile).toBeVisible();
  await expect(profile.getByText(`0／20`)).toBeVisible();
  await expect(profile.getByText(score >= 4 ? '已取得' : '未取得')).toBeVisible();
  await expect(profile.getByText(/答對 \d+%/).first()).toBeVisible();
  await expectNoMajorErrors(errors);
});

test('原子研究所：粒子數不能減到不合理的負值', { tag: '@full' }, async ({ page }, testInfo) => {
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo, '?island=atom&start=1');
  await islands.adjustAtom('質子', -3);
  await islands.adjustAtom('中子', -3);
  await expect(page.getByText('中性氫原子（H）')).toBeVisible();
  await expectNoMajorErrors(errors);
});

test('實驗 6-1：器材沒核對完不能開始，石墨誤判有具體說明，分類正確才過關', { tag: '@full' }, async ({ page }, testInfo) => {
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo, '?island=elements&start=1&stage=exp');
  const go = page.getByRole('button', { name: '器材到齊，開始實驗' });
  const kit = ['鐵片', '鋅片', '銅片', '硫', '石墨棒', '1.5 V 電池', '小燈泡附燈座', '附夾子的導線', '砂紙', '鐵鎚'];
  for (const item of kit.slice(0, -1)) await page.getByRole('checkbox', { name: item, exact: true }).check();
  await expect(go).toBeDisabled();
  await page.getByRole('checkbox', { name: '鐵鎚' }).check();
  await go.click();

  await page.getByRole('button', { name: '接電池與燈泡' }).click();
  await expect(page.getByText('先選一種樣品，再做檢驗。')).toBeVisible();

  for (const sample of ['鐵片', '鋅片', '銅片', '石墨棒', '硫棒']) {
    await page.getByRole('button', { name: sample, exact: true }).click();
    for (const testName of ['砂紙摩擦', '接電池與燈泡', '鐵鎚敲打']) await page.getByRole('button', { name: testName }).click();
  }
  await expect(page.getByRole('cell', { name: '黑，無光澤' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '不亮' })).toBeVisible();

  const metal = page.getByRole('button', { name: '金屬', exact: true });
  const nonmetal = page.getByRole('button', { name: '非金屬', exact: true });
  for (const i of [0, 1, 2, 3]) await metal.nth(i).click();
  await nonmetal.nth(4).click();
  await page.getByRole('button', { name: '光澤、導電、延展三項一起看' }).click();
  await page.getByRole('button', { name: '檢查分類' }).click();
  await expect(page.getByText(/只看燈會把石墨判成金屬/)).toBeVisible();
  await islands.expectStars(0);

  await nonmetal.nth(3).click();
  await page.getByRole('button', { name: '檢查分類' }).click();
  await expect(page.getByText(/分類正確！/)).toBeVisible();
  await islands.expectStars(1);
  await expectNoMajorErrors(errors);
});

test('鈉鉀鐵模擬：有安全提醒，沒放入水中不能滴酚酞，選錯組合會說明', { tag: '@full' }, async ({ page }, testInfo) => {
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo, '?island=periodic&start=1&stage=exp');
  await expect(page.getByText(/學生不可自行操作/)).toBeVisible();
  await page.getByRole('button', { name: '鈉', exact: true }).click();
  await page.getByRole('button', { name: '滴入酚酞' }).click();
  await expect(page.getByText('先把鈉放入水中，才有水溶液可以用酚酞檢測。')).toBeVisible();

  for (const metalName of ['鈉', '鉀', '鐵']) {
    await page.getByRole('button', { name: metalName, exact: true }).click();
    for (const action of ['觀察質地', '放入水中', '滴入酚酞']) await page.getByRole('button', { name: action }).click();
  }
  await page.getByRole('button', { name: '鈉和鐵' }).click();
  await page.getByRole('button', { name: '確認答案' }).click();
  await expect(page.getByText(/鐵堅硬、沉入水底/)).toBeVisible();
  await page.getByRole('button', { name: '鈉和鉀' }).click();
  await page.getByRole('button', { name: '確認答案' }).click();
  await expect(page.getByText(/第 1 族（鹼金屬）/)).toBeVisible();
  await islands.expectStars(1);
  await expectNoMajorErrors(errors);
});

test('挑戰題：題目取自題庫、答錯收進錯題本、沒過關不加星', { tag: '@full' }, async ({ page }, testInfo) => {
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo, '?island=molecule&start=1&stage=quiz');
  await expect(page.getByText('題庫 6-4')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/[A-Z][a-z]? \d(?!\d)/)).toHaveCount(0);

  const score = await islands.answerAllWithFirstChoice(5);
  expect(score).toBeGreaterThanOrEqual(0);
  const wrong = 5 - score;
  await islands.expectStars(score >= 4 ? 1 : 0);
  if (wrong > 0) {
    await expect(islands.mistakesButton).toContainText(String(wrong));
    await page.getByRole('button', { name: '打開錯題本' }).click();
    const notebook = page.getByRole('dialog', { name: '錯題本' });
    await expect(notebook).toBeVisible();
    await expect(notebook.getByText(/正確答案（[ABCD]）/)).toHaveCount(wrong);
    await notebook.getByRole('button', { name: '我會了，移除' }).first().click();
    await expect(notebook.getByText(/正確答案（[ABCD]）/)).toHaveCount(wrong - 1);
  }
  await expectNoMajorErrors(errors);
});

test('錯題本是空的時候不能練習', { tag: '@full' }, async ({ page }, testInfo) => {
  await skipTutorial(page);
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo, '?mode=2d');
  await islands.mistakesButton.click();
  const notebook = page.getByRole('dialog', { name: '錯題本' });
  await expect(notebook.getByText('目前沒有錯題。')).toBeVisible();
  await expect(notebook.getByRole('button', { name: '練習錯題' })).toBeDisabled();
  await expectNoMajorErrors(errors);
});

test('燈塔總挑戰：數字鍵 7 開啟，混合四節共 10 題', { tag: '@full' }, async ({ page }, testInfo) => {
  await skipTutorial(page);
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo, '?mode=2d');
  await page.keyboard.press('7');
  await expect(page.getByRole('heading', { level: 2, name: '燈塔總挑戰' })).toBeVisible();
  const score = await islands.answerAllWithFirstChoice(10);
  await expect(page.getByText(`燈塔新紀錄：${score}／10`)).toBeVisible();
  await islands.expectStars(0);
  await expectNoMajorErrors(errors);
});

test('Esc 依序關閉任務視窗與資訊卡', { tag: '@full' }, async ({ page }, testInfo) => {
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo, '?island=classify&start=1');
  await expect(islands.lab).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(islands.lab).toBeHidden();
  await expect(page.getByRole('heading', { level: 2, name: '物質分類挑戰島' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { level: 2, name: '物質分類挑戰島' })).toBeHidden();
  await expectNoMajorErrors(errors);
});

test('不存在的島嶼參數不會開啟面板也不報錯', { tag: '@full' }, async ({ page }, testInfo) => {
  await skipTutorial(page);
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo, '?island=not-an-island&start=1');
  await expect(islands.lab).toBeHidden();
  await expect(page.getByRole('button', { name: /開始探索/ })).toBeHidden();
  await expectNoMajorErrors(errors);
});

test('2D 後備模式：清單選島、看到關卡、開任務', { tag: '@basic' }, async ({ page }, testInfo) => {
  await skipTutorial(page);
  const islands = new Ch6IslandsPage(page);
  const errors = await islands.open(testInfo, '?mode=2d');
  await expect(islands.fallback).toBeVisible();
  await expect(page.getByRole('navigation', { name: '六座島嶼' })).toBeHidden();
  await page.getByRole('button', { name: /分子組裝工坊/ }).click();
  await expect(page.getByRole('button', { name: '開始：挑戰題' })).toBeVisible();
  await islands.startExplore();
  await expect(islands.labHeading('molecule')).toBeVisible();
  await expectNoMajorErrors(errors);
});
