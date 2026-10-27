import { STORAGE_KEY } from "./config.js?v=4";

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { visited: [], completed: [], lastIsland: null };
    const data = JSON.parse(raw);
    return {
      visited: Array.isArray(data.visited) ? data.visited : [],
      completed: Array.isArray(data.completed) ? data.completed : [],
      lastIsland: data.lastIsland || null,
    };
  } catch {
    return { visited: [], completed: [], lastIsland: null };
  }
}

function write(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

export function markVisited(islandId) {
  const data = readRaw();
  if (!data.visited.includes(islandId)) data.visited.push(islandId);
  data.lastIsland = islandId;
  write(data);
  return data;
}

export function markCompleted(taskId) {
  const data = readRaw();
  if (!data.completed.includes(taskId)) data.completed.push(taskId);
  write(data);
  return data;
}

export function isCompleted(taskId) {
  return readRaw().completed.includes(taskId);
}

export function getProgress() {
  return readRaw();
}
