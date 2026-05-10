// ============================================================================
// js/alignment-scoring.js
// Points, star quality, and stat chips for Monster Alignment.
// ============================================================================

import { bridge } from './assistant-bridge.js';
import { state } from './alignment-state.js';
import { setText } from './alignment-dom.js';

/** Speed bonus tapers hard in the first 45s, then slowly after that. */
export function taperedSpeedBonus(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  if (s <= 45) {
    return Math.max(0, 24 - Math.floor(s / 5));
  }
  const at45 = Math.max(0, 24 - Math.floor(45 / 5));
  return Math.max(0, at45 - Math.floor((s - 45) / 10));
}

/** 1–3 stars each for speed, attempts, streak (shown after a clear). */
export function alignmentRoundQuality(quickSolveSeconds, attemptsUsed, streakAfterSolve) {
  const speedStars = quickSolveSeconds <= 22 ? 3 : quickSolveSeconds <= 50 ? 2 : 1;
  const attStars = attemptsUsed <= 1 ? 3 : attemptsUsed <= 3 ? 2 : 1;
  const streakStars = streakAfterSolve >= 4 ? 3 : streakAfterSolve >= 2 ? 2 : 1;
  return { speedStars, attStars, streakStars };
}

export function renderStars(n) {
  const c = Math.max(0, Math.min(3, Math.round(Number(n)) || 0));
  return `${'★'.repeat(c)}${'☆'.repeat(3 - c)}`;
}

export function scoreForCorrectAttempt() {
  const quickSolveSeconds = Math.floor((Date.now() - state.levelStart) / 1000);
  const base = 70;
  const attemptBonus = Math.max(0, 28 - (state.attempts - 1) * 10);
  const speedBonus = taperedSpeedBonus(quickSolveSeconds);
  const streakBonus = Math.min(18, state.streak * 3);
  return Math.max(12, base + attemptBonus + speedBonus + streakBonus);
}

export function updateStats() {
  setText('a-score', state.score);
  setText('a-streak', state.streak);
  setText('a-attempts', String(state.attempts));
  const b = typeof bridge.getTrackBests === 'function' ? bridge.getTrackBests() : null;
  if (b) setText('a-best', String(b.alignmentBest));

  const accEl = document.getElementById('a-acc');
  if (accEl) {
    accEl.textContent = state.totalAttempts > 0
      ? Math.round(state.totalCorrect / state.totalAttempts * 100) + '%'
      : '—';
  }
}
