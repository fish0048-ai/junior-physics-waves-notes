import { expect, type Locator, type Page, test } from '@playwright/test';
import { expectNoMajorErrors, openLocal } from './helpers';

class ExamPracticePage {
  constructor(private readonly page: Page) {}

  question(index = 0): Locator {
    return this.page.locator('.exam-q').nth(index);
  }

  async openSection(): Promise<void> {
    await expect(this.page.getByRole('heading', { level: 1, name: '4-1　光的傳播與光速' })).toBeVisible();
    await expect(this.question(0)).toBeVisible();
    await expect(this.page.locator('#exam-count')).not.toHaveText('0');
  }

  async choose(question: Locator, key: string): Promise<void> {
    await question.locator(`.exam-choice[data-k="${key}"]`).click();
  }

  async answerKey(question: Locator): Promise<string> {
    const key = await question.getAttribute('data-ans');
    expect(key).toMatch(/^[0-3]$/);
    return key as string;
  }

  async wrongKey(question: Locator): Promise<string> {
    const answer = Number(await this.answerKey(question));
    return String((answer + 1) % 4);
  }

  checkButton(): Locator {
    return this.page.locator('#exam-check');
  }

  explainButton(): Locator {
    return this.page.getByRole('button', { name: /顯示詳解|隱藏詳解/ });
  }

  resetButton(): Locator {
    return this.page.getByRole('button', { name: '重設', exact: true });
  }
}

test.describe('線上練習', { tag: '@basic' }, () => {
  test('從練習專區進入第 4 章段考練習', async ({ page }, testInfo) => {
    const errors = await openLocal(page, '/practice.html', testInfo);
    await page.locator('#practice-chapter-cards').getByRole('link', { name: /第 4 章/ }).click();
    await expect(page).toHaveURL(/practice-ch4\.html/);
    await expect(page.getByRole('heading', { level: 1, name: /第 4 章/ })).toBeVisible();
    await page.locator('#section-cards').getByRole('link', { name: /4-1/ }).click();
    await expect(page).toHaveURL(/exams\/4-1\.html/);
    const exam = new ExamPracticePage(page);
    await exam.openSection();
    await expectNoMajorErrors(errors);
  });

  test('選對答案後可檢查並開關詳解', async ({ page }, testInfo) => {
    const errors = await openLocal(page, '/exams/4-1.html', testInfo);
    const exam = new ExamPracticePage(page);
    await exam.openSection();
    const question = exam.question(0);
    await exam.choose(question, await exam.answerKey(question));
    await exam.checkButton().click();

    await expect(question).toHaveClass(/is-right/);
    await expect(page.locator('#exam-score')).toContainText(/得分\s+[1-9]\d*\s*\/\s*[1-9]/);
    await expect(question.locator('.exam-explain')).toBeVisible();
    await expect(exam.explainButton()).toHaveText('隱藏詳解');

    await exam.explainButton().click();
    await expect(question.locator('.exam-explain')).toBeHidden();
    await expect(exam.explainButton()).toHaveText('顯示詳解');

    await exam.explainButton().click();
    await expect(question.locator('.exam-explain')).toBeVisible();
    await expect(question.locator('.exam-explain')).not.toHaveText(/^\s*$/);
    await expectNoMajorErrors(errors);
  });

  test('選錯時標出錯誤並保留正確選項', async ({ page }, testInfo) => {
    const errors = await openLocal(page, '/exams/4-1.html', testInfo);
    const exam = new ExamPracticePage(page);
    await exam.openSection();
    const question = exam.question(0);
    const answer = await exam.answerKey(question);
    const wrong = await exam.wrongKey(question);
    await exam.choose(question, wrong);
    await exam.checkButton().click();

    await expect(question).toHaveClass(/is-wrong/);
    await expect(question.locator(`.exam-choice[data-k="${wrong}"]`)).toHaveClass(/is-miss/);
    await expect(question.locator(`.exam-choice[data-k="${answer}"]`)).toHaveClass(/is-key/);
    await expect(page.locator('#exam-score')).toContainText('得分');
    await expectNoMajorErrors(errors);
  });

  test('未作答就檢查時得分為 0', async ({ page }, testInfo) => {
    const errors = await openLocal(page, '/exams/4-1.html', testInfo);
    const exam = new ExamPracticePage(page);
    await exam.openSection();
    await exam.checkButton().click();
    await expect(exam.question(0)).toHaveClass(/is-wrong/);
    await expect(page.locator('#exam-score')).toContainText(/得分\s+0\s*\//);
    await expect(exam.question(0).locator('.exam-explain')).toBeVisible();
    await expectNoMajorErrors(errors);
  });

  test('重設會清掉選擇、分數與詳解', async ({ page }, testInfo) => {
    const errors = await openLocal(page, '/exams/4-1.html', testInfo);
    const exam = new ExamPracticePage(page);
    await exam.openSection();
    const question = exam.question(0);
    await exam.choose(question, await exam.answerKey(question));
    await exam.checkButton().click();
    await exam.resetButton().click();

    await expect(question).not.toHaveClass(/is-right|is-wrong/);
    await expect(question.locator('.exam-choice.is-on')).toHaveCount(0);
    await expect(question.locator('.exam-explain')).toBeHidden();
    await expect(page.locator('#exam-score')).toHaveText('');
    await expect(exam.explainButton()).toHaveText('顯示詳解');
    await expect(page.getByRole('button', { name: '存成此班題本' })).toHaveCount(0);
    await expectNoMajorErrors(errors);
  });
});
