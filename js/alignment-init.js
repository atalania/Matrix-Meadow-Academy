// ============================================================================
// js/alignment-init.js
// Bootstraps canvas, persistence, listeners, and window hooks for Alignment.
// ============================================================================

import { bridge } from './assistant-bridge.js';
import { buildLevels } from './levels.js';
import { onMonsterReady } from './monster-renderer.js';
import {
  state,
  loadPersistedState,
  persistState,
  safeInt,
  safeIntArray,
} from './alignment-state.js';
import {
  setAlignmentCanvas,
  resizeCanvas,
  render,
} from './alignment-render.js';
import { updateLiveDet } from './alignment-input-presets.js';
import { loadLevel } from './alignment-level.js';
import { updateStats } from './alignment-scoring.js';
import { applyMatrix, previewMatrix, resetLevel } from './alignment-apply.js';
import { applyPreset } from './alignment-input-presets.js';
import { submitToTutor, nextLevel } from './alignment-tutor.js';
import {
  startAlignmentSessionTimer,
  pauseAlignmentTimerForWelcomeOverlay,
  resumeAlignmentTimerAfterWelcomeOverlay,
} from './alignment-timer.js';

export function initAlignment() {
  const canvas = document.getElementById('gc');
  const ctx = canvas?.getContext('2d');
  setAlignmentCanvas(canvas, ctx);

  const saved = loadPersistedState();
  if (saved) {
    state.done = safeIntArray(saved.done);
    state.score = safeInt(saved.score);
    state.bestStreak = safeInt(saved.bestStreak);
    state.totalAttempts = safeInt(saved.totalAttempts);
    state.totalCorrect = safeInt(saved.totalCorrect);
  } else {
    try {
      const legacyDone = localStorage.getItem('mm_done');
      const legacyScore = localStorage.getItem('mm_score');
      if (legacyDone) state.done = safeIntArray(JSON.parse(legacyDone));
      if (legacyScore) state.score = safeInt(legacyScore);
      if (legacyDone || legacyScore) persistState();
    } catch (e) {
      console.warn('Failed to migrate legacy progress; starting fresh.', e);
    }
  }
  state.levels = buildLevels();
  void bridge.onScoreUpdate({
    source: 'alignment',
    score: state.score,
    stats: {
      levelReached: state.done.length ? Math.max(...state.done) + 1 : 1,
    },
  }).then(() => updateStats());

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('mma:iframe-layout', resizeCanvas);
  const wrap = canvas?.parentElement;
  if (wrap && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => resizeCanvas()).observe(wrap);
  }

  onMonsterReady(() => {
    const loadingEl = document.getElementById('canvas-loading');
    if (loadingEl) loadingEl.style.display = 'none';
  });

  ['i00', 'i01', 'i10', 'i11'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', updateLiveDet);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); applyMatrix(); }
    });
  });

  loadLevel(0);
  startAlignmentSessionTimer();
  requestAnimationFrame(render);

  window.addEventListener('mma:welcome-overlay', (e) => {
    const open = !!(e && e.detail && e.detail.open);
    if (open) pauseAlignmentTimerForWelcomeOverlay();
    else resumeAlignmentTimerAfterWelcomeOverlay();
  });

  window.applyMatrix = applyMatrix;
  window.previewMatrix = previewMatrix;
  window.resetLevel = resetLevel;
  window.applyPreset = applyPreset;
  window.submitToTutor = submitToTutor;
  window.nextLevel = nextLevel;
}
