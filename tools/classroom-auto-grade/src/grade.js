import { matchesAnswer } from "./normalize.js";
import { totalPoints } from "./answer-key.js";

/**
 * @typedef {"correct"|"wrong"|"unreadable"|"missing"} GradeStatus
 * @typedef {{ id: string, type: string, status: GradeStatus, expected: string, student: string|null, points: number, earned: number }} GradedItem
 * @typedef {{ seat?: string, name?: string, label: string, score: number, maxScore: number, correctCount: number, wrong: GradedItem[], unreadable: GradedItem[], missing: GradedItem[], items: GradedItem[], provider?: string, notes?: string }} StudentReport
 */

/**
 * 依答案檔與抽取出的答案計分。
 * @param {import("./answer-key.js").AnswerKey} key
 * @param {import("./vision.js").ExtractionResult} extraction
 * @param {{ seat?: string, name?: string, label: string }} student
 * @returns {StudentReport}
 */
export function gradeStudent(key, extraction, student) {
  const byId = new Map((extraction.answers || []).map((a) => [a.id, a]));
  /** @type {GradedItem[]} */
  const items = [];
  let score = 0;
  let correctCount = 0;

  for (const q of key.items) {
    const ex = byId.get(q.id);
    /** @type {GradeStatus} */
    let status;
    let studentRaw = null;
    let earned = 0;

    if (!ex || ex.status === "missing") {
      status = "missing";
    } else if (ex.status === "unreadable" || ex.raw == null || String(ex.raw).trim() === "") {
      status = "unreadable";
    } else {
      studentRaw = String(ex.raw);
      if (matchesAnswer(q, studentRaw)) {
        status = "correct";
        earned = q.points;
        score += earned;
        correctCount += 1;
      } else {
        status = "wrong";
      }
    }

    items.push({
      id: q.id,
      type: q.type,
      status,
      expected: q.answer,
      student: studentRaw,
      points: q.points,
      earned,
    });
  }

  return {
    seat: student.seat,
    name: student.name,
    label: student.label,
    score,
    maxScore: totalPoints(key),
    correctCount,
    wrong: items.filter((i) => i.status === "wrong"),
    unreadable: items.filter((i) => i.status === "unreadable"),
    missing: items.filter((i) => i.status === "missing"),
    items,
    provider: extraction.provider,
    notes: extraction.notes,
  };
}
