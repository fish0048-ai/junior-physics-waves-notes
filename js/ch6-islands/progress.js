import { ALL_STAGES, STORAGE_KEY } from "./config.js?v=10";

const MISTAKE_KEY = "jpwn.ch6islands.mistakes.v1";
const LIGHTHOUSE_KEY = "jpwn.ch6islands.lighthouse.v1";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

function readRaw() {
  const data = readJson(STORAGE_KEY, {});
  return {
    visited: Array.isArray(data.visited) ? data.visited : [],
    completed: Array.isArray(data.completed) ? data.completed : [],
    lastIsland: data.lastIsland || null,
  };
}

export function markVisited(islandId) {
  const data = readRaw();
  if (!data.visited.includes(islandId)) data.visited.push(islandId);
  data.lastIsland = islandId;
  writeJson(STORAGE_KEY, data);
  return data;
}

export function markCompleted(taskId) {
  const data = readRaw();
  if (!data.completed.includes(taskId)) data.completed.push(taskId);
  writeJson(STORAGE_KEY, data);
  return data;
}

export function isCompleted(taskId) {
  return readRaw().completed.includes(taskId);
}

export function getProgress() {
  return readRaw();
}

export function islandProgress(island) {
  const done = island.stages.filter((s) => isCompleted(s.taskId)).length;
  return { done, total: island.stages.length, complete: done === island.stages.length };
}

export function starCount() {
  return { done: ALL_STAGES.filter((s) => isCompleted(s.taskId)).length, total: ALL_STAGES.length };
}

export function nextOpenStage(island) {
  return island.stages.find((s) => !isCompleted(s.taskId)) || null;
}

/** 錯題本只存題號，題目文字一律回題庫讀取 */
export function getMistakes() {
  const list = readJson(MISTAKE_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function addMistake(section, index) {
  const list = getMistakes().filter((m) => !(m.section === section && m.index === index));
  list.unshift({ section, index, at: Date.now() });
  writeJson(MISTAKE_KEY, list.slice(0, 60));
}

export function removeMistake(section, index) {
  writeJson(
    MISTAKE_KEY,
    getMistakes().filter((m) => !(m.section === section && m.index === index))
  );
}

export function getLighthouseBest() {
  const best = readJson(LIGHTHOUSE_KEY, null);
  return best && typeof best.score === "number" ? best : null;
}

export function recordLighthouse(score, total) {
  const best = getLighthouseBest();
  if (!best || score > best.score) writeJson(LIGHTHOUSE_KEY, { score, total, at: Date.now() });
}

const ANSWER_KEY = "jpwn.ch6islands.answers.v1";
const EXAM_KEY = "jpwn.ch6islands.exam.v1";

/** 只記各節作答數與答對數，給學習檔案用 */
export function logAnswer(section, ok) {
  const stats = getAnswerStats();
  const row = stats[section] || { n: 0, ok: 0 };
  row.n += 1;
  if (ok) row.ok += 1;
  stats[section] = row;
  writeJson(ANSWER_KEY, stats);
}

export function getAnswerStats() {
  const stats = readJson(ANSWER_KEY, {});
  return stats && typeof stats === "object" ? stats : {};
}

export function getExamBest() {
  const best = readJson(EXAM_KEY, null);
  return best && typeof best.score === "number" ? best : null;
}

/** 回傳這次是否第一次拿到會考徽章 */
export function recordExam(score, total, passed) {
  const best = getExamBest();
  const badge = !!best?.badge || passed;
  if (!best || score > best.score || badge !== !!best.badge) {
    writeJson(EXAM_KEY, { score: Math.max(score, best?.score || 0), total, badge, at: Date.now() });
  }
  return passed && !best?.badge;
}

export function resetAllProgress() {
  try {
    [STORAGE_KEY, MISTAKE_KEY, LIGHTHOUSE_KEY, ANSWER_KEY, EXAM_KEY, "jpwn.ch6islands.finale"].forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
