import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import { openLocal } from '../helpers';

export type IslandId = 'elements' | 'periodic' | 'atom' | 'decompose' | 'molecule' | 'classify';

export const ISLAND_TITLES: Record<IslandId, string> = {
  elements: '元素探索島',
  periodic: '週期表城市',
  atom: '原子研究所',
  decompose: '物質分解實驗島',
  molecule: '分子組裝工坊',
  classify: '物質分類挑戰島',
};

/** 6 個探索任務 + 2 個實驗站 + 6 組挑戰題 */
export const TOTAL_STARS = 14;

export class Ch6IslandsPage {
  readonly heading: Locator;
  readonly stars: Locator;
  readonly lab: Locator;
  readonly fallback: Locator;
  readonly mistakesButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: '理化探索群島' });
    this.stars = page.getByRole('status', { name: /已點亮 \d+ 顆星/ });
    this.lab = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: '返回群島' }) });
    this.fallback = page.getByText('改用島嶼清單');
    this.mistakesButton = page.getByRole('button', { name: '錯題本', exact: true });
  }

  async open(testInfo: TestInfo, query = ''): Promise<string[]> {
    const errors = await openLocal(this.page, `/ch6/islands.html${query}`, testInfo);
    await expect(this.heading).toBeVisible();
    return errors;
  }

  async expectStars(done: number): Promise<void> {
    await expect(this.page.getByRole('status', { name: `已點亮 ${done} 顆星，共 ${TOTAL_STARS} 顆` })).toBeVisible();
  }

  labHeading(id: IslandId): Locator {
    return this.page.getByRole('heading', { level: 2, name: new RegExp(ISLAND_TITLES[id]) });
  }

  async startExplore(): Promise<void> {
    await this.page.getByRole('button', { name: /開始探索|再玩一次|繼續：/ }).click();
  }

  async adjustAtom(part: '質子' | '中子' | '電子', times: number): Promise<void> {
    const button = this.page.getByRole('button', { name: `${times >= 0 ? '增加' : '減少'}${part}` });
    for (let i = 0; i < Math.abs(times); i += 1) await button.click();
  }

  async checkAtom(): Promise<void> {
    await this.page.getByRole('button', { name: '檢查：是否為中性碳-12？' }).click();
  }

  /** 每題都選第一個選項，回傳答對題數 */
  async answerAllWithFirstChoice(count: number): Promise<number> {
    for (let i = 0; i < count; i += 1) {
      await expect(this.page.getByText(`第 ${i + 1}／${count} 題`)).toBeVisible({ timeout: 20_000 });
      await this.page.getByRole('group', { name: '選項' }).getByRole('button').first().click();
      await this.page.getByRole('button', { name: i + 1 < count ? '下一題' : '看結果' }).click();
    }
    const ring = this.page.getByRole('img', { name: new RegExp(`答對 \\d+ 題，共 ${count} 題`) });
    await expect(ring).toBeVisible();
    const label = (await ring.getAttribute('aria-label')) || '';
    return Number(label.match(/答對 (\d+) 題/)?.[1] ?? -1);
  }
}
