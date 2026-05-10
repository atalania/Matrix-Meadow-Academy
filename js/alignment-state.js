// ============================================================================
// js/alignment-state.js
// Monster Alignment — shared mutable state and localStorage persistence.
// ============================================================================

import { M2 } from './math-engine.js';

export const STORAGE_KEY = 'mm_state_v1';

export const state = {
  lvl: 0,
  score: 0,
  streak: 0,
  bestStreak: 0,
  attempts: 0,
  totalAttempts: 0,
  totalCorrect: 0,
  curMat: M2.I(),
  animFrom: M2.I(),
  animTo: M2.I(),
  animT: 1,
  animDur: 600,
  animStart: 0,
  animCB: null,
  done: [],
  seed: 17,
  levels: [],
  timerStart: Date.now(),
  levelStart: Date.now(),
  lastPointsEarned: 0,
  /** Set on each correct Apply for tutor “quality” row */
  lastRoundQuality: null,
};

export function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (e) {
    console.warn('Failed to parse saved progress; starting fresh.', e);
    return null;
  }
}

export function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      done: state.done,
      score: state.score,
      bestStreak: state.bestStreak,
      totalAttempts: state.totalAttempts,
      totalCorrect: state.totalCorrect,
    }));
  } catch (e) {
    console.warn('Failed to save progress.', e);
  }
}

export function safeInt(v, fallback = 0) {
  const n = typeof v === 'number' ? v : parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function safeIntArray(v) {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => Number.isInteger(x) && x >= 0);
}
