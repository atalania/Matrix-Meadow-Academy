// ============================================================================
// js/drill-state.js
// Matrix Multiplication Drill — shared mutable session state.
// ============================================================================

export const state = {
  size: 2,
  range: 'easy',
  timerMode: 'off',
  A: [], B: [], C: [],
  score: 0, streak: 0, best: 0,
  timeLeft: null,
  timerHandle: null,
  settled: false,
};

/** Seconds left when welcome tutorial pauses the drill countdown (not cleared by clearTimer). */
export let drillWelcomePauseLeft = null;

export function setDrillWelcomePauseLeft(v) {
  drillWelcomePauseLeft = v;
}
