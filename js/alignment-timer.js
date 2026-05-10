// ============================================================================
// js/alignment-timer.js
// Wall-clock display for the Alignment tab (pauses during welcome overlay).
// ============================================================================

import { state } from './alignment-state.js';
import { setText } from './alignment-dom.js';

let alignmentTimerId = null;
let alignmentFrozenSec = null;

function tickAlignmentClock() {
  const e = Math.floor((Date.now() - state.timerStart) / 1000);
  const m = Math.floor(e / 60);
  const s = e % 60;
  setText('a-time', `${m}:${s.toString().padStart(2, '0')}`);
}

/** @param {number | null} resumeFromSec wall elapsed to show (null = restart from now) */
export function startAlignmentSessionTimer(resumeFromSec = null) {
  if (alignmentTimerId != null) {
    clearInterval(alignmentTimerId);
    alignmentTimerId = null;
  }
  if (resumeFromSec != null) {
    state.timerStart = Date.now() - resumeFromSec * 1000;
  } else {
    state.timerStart = Date.now();
  }
  tickAlignmentClock();
  alignmentTimerId = setInterval(tickAlignmentClock, 1000);
}

export function pauseAlignmentTimerForWelcomeOverlay() {
  if (alignmentTimerId != null) {
    clearInterval(alignmentTimerId);
    alignmentTimerId = null;
  }
  alignmentFrozenSec = Math.floor((Date.now() - state.timerStart) / 1000);
}

export function resumeAlignmentTimerAfterWelcomeOverlay() {
  const sec = alignmentFrozenSec;
  alignmentFrozenSec = null;
  if (sec == null) return;
  startAlignmentSessionTimer(sec);
}
