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

export class Ch6IslandsPage {
  readonly heading: Locator;
  readonly stars: Locator;
  readonly lab: Locator;
  readonly panel: Locator;
  readonly fallback: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: '理化探索群島' });
    this.stars = page.getByRole('status', { name: /已點亮 \d+ 顆星/ });
    this.lab = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: '返回群島' }) });
    this.panel = page.getByRole('complementary');
    this.fallback = page.getByText('改用島嶼清單');
  }

  async open(testInfo: TestInfo, query = ''): Promise<string[]> {
    const errors = await openLocal(this.page, `/ch6/islands.html${query}`, testInfo);
    await expect(this.heading).toBeVisible();
    return errors;
  }

  dockCard(id: IslandId): Locator {
    return this.page.getByRole('navigation', { name: '六座島嶼' }).getByRole('button', { name: new RegExp(ISLAND_TITLES[id]) });
  }

  async startExplore(): Promise<void> {
    await this.page.getByRole('button', { name: /開始探索|再玩一次/ }).click();
  }

  labHeading(id: IslandId): Locator {
    return this.page.getByRole('heading', { level: 2, name: new RegExp(ISLAND_TITLES[id]) });
  }

  async adjustAtom(part: '質子' | '中子' | '電子', times: number): Promise<void> {
    const button = this.page.getByRole('button', { name: `${times >= 0 ? '增加' : '減少'}${part}` });
    for (let i = 0; i < Math.abs(times); i += 1) await button.click();
  }

  async checkAtom(): Promise<void> {
    await this.page.getByRole('button', { name: '檢查：是否為中性碳-12？' }).click();
  }
}
