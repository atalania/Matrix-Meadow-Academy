// ============================================================================
// js/drill-logic.js
// Pure drill helpers — range bounds, cell parsing, grading (no DOM).
// ============================================================================

const DRILL_RANGE_BY_KEY = { easy: 3, med: 6, hard: 9 };

export function drillRangeNumber(range) {
  if (Object.prototype.hasOwnProperty.call(DRILL_RANGE_BY_KEY, range)) {
    return DRILL_RANGE_BY_KEY[range];
  }
  // Surface programmer mistakes (typo'd data-range, unknown difficulty key)
  // instead of silently falling through to "hard".
  console.warn(`drillRangeNumber: unknown range "${range}", defaulting to hard.`);
  return DRILL_RANGE_BY_KEY.hard;
}

/** Parse one grid cell; null if empty or not a plain integer string */
export function parseDrillIntegerCell(raw) {
  const t = String(raw).trim();
  if (t === '' || !/^-?\d+$/.test(t)) return null;
  return Number(t);
}

export function gradeDrillMatrices(user, expected) {
  const n = expected.length;
  let correct = 0;
  const wrongEntries = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (user[r][c] === expected[r][c]) correct++;
      else wrongEntries.push(`C[${r}][${c}]: got ${user[r][c]}, expected ${expected[r][c]}`);
    }
  }
  const total = n * n;
  return { correct, total, allOk: correct === total, wrongEntries };
}

/** Score multiplier from grid size and entry range (1.0 = 2×2 easy baseline). */
export function drillDifficultyMultiplier(size, rangeKey) {
  const rangeBoost = { easy: 0, med: 0.12, hard: 0.22 }[rangeKey] ?? 0.15;
  const sizeBoost = Number(size) >= 3 ? 0.18 : 0;
  return Math.round((1 + rangeBoost + sizeBoost) * 100) / 100;
}

/** Extra points on a clean solve: +1 at streak 3–5, +2 at 6–8, +3 from 9+ (capped). */
export function drillStreakScoreBonus(streakAfterIncrement) {
  return Math.min(3, Math.floor(Number(streakAfterIncrement) / 3));
}

/** Near-miss (exactly one wrong cell): small consolation scaled by difficulty. */
export function drillNearMissBonusPoints(multiplier) {
  const m = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  return Math.max(2, Math.round(4 * m));
}
