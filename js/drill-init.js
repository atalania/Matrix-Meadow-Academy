// ============================================================================
// js/drill-init.js
// Difficulty controls, window hooks, and welcome-overlay timer pause.
// ============================================================================

import { state } from './drill-state.js';
import { newDrill } from './drill-problem.js';
import {
  drillCheck,
  drillReveal,
  startTimer,
  clearTimer,
  pauseDrillTimerForWelcomeOverlay,
  resumeDrillTimerForWelcomeOverlay,
} from './drill-play.js';

export function initDrill() {
  document.querySelectorAll('[data-size]').forEach(b => b.addEventListener('click', () => {
    state.size = +b.dataset.size;
    document.querySelectorAll('[data-size]').forEach(x => x.classList.toggle('sel', x === b));
    newDrill();
  }));

  document.querySelectorAll('[data-range]').forEach(b => b.addEventListener('click', () => {
    state.range = b.dataset.range;
    document.querySelectorAll('[data-range]').forEach(x => x.classList.toggle('sel', x === b));
    newDrill();
  }));

  document.querySelectorAll('[data-timer]').forEach(b => b.addEventListener('click', () => {
    state.timerMode = b.dataset.timer;
    document.querySelectorAll('[data-timer]').forEach(x => x.classList.toggle('sel', x === b));
    if (state.timerMode !== 'off') startTimer(); else clearTimer();
  }));

  window.drillCheck = drillCheck;
  window.drillReveal = () => drillReveal(false);
  window.newDrill = newDrill;

  window.addEventListener('mma:welcome-overlay', (e) => {
    const open = !!(e && e.detail && e.detail.open);
    if (open) pauseDrillTimerForWelcomeOverlay();
    else resumeDrillTimerForWelcomeOverlay();
  });
}
