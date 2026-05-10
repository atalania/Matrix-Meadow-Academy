// ============================================================================
// js/alignment-apply.js
// Apply / Preview / Reset and the scoring side-effects of a committed matrix.
// ============================================================================

import { M2 } from './math-engine.js';
import { checkAnswer, diagnoseMistake } from './alignment-logic.js';
import { setFeedback } from './ui.js';
import { bridge } from './assistant-bridge.js';
import { state, persistState } from './alignment-state.js';
import { isAnimating, triggerAnimation } from './alignment-render.js';
import { getInputMatrix, updatePresetAvailability } from './alignment-input-presets.js';
import { loadLevel, emitAlignmentProgress } from './alignment-level.js';
import {
  alignmentRoundQuality,
  renderStars,
  scoreForCorrectAttempt,
  updateStats,
} from './alignment-scoring.js';
import { showTutorModal } from './alignment-tutor.js';

export function applyMatrix() {
  if (isAnimating()) return;

  const M = getInputMatrix();
  if (!M) {
    setFeedback('afb', 'info', '⚠️', 'Please fill in all four matrix entries first.');
    return;
  }

  const lv = state.levels[state.lvl];
  state.attempts++;
  state.totalAttempts++;

  const correct = checkAnswer(M, lv);

  triggerAnimation(M, () => {
    if (correct) {
      state.streak++;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      state.totalCorrect++;
      const quickSolveSeconds = Math.floor((Date.now() - state.levelStart) / 1000);
      state.lastRoundQuality = alignmentRoundQuality(quickSolveSeconds, state.attempts, state.streak);

      const pts = scoreForCorrectAttempt();
      state.lastPointsEarned = pts;
      state.score += pts;

      if (!state.done.includes(state.lvl)) state.done.push(state.lvl);
      persistState();
      updatePresetAvailability();
      emitAlignmentProgress();

      const q = state.lastRoundQuality;
      const starHint = q
        ? ` Speed ${renderStars(q.speedStars)} · Tries ${renderStars(q.attStars)} · Streak ${renderStars(q.streakStars)}`
        : '';
      setFeedback('afb', 'ok', '🎉', `Correct! Monster perfectly aligned!${starHint}`);
      updateStats();

      bridge.onCorrect({
        levelId: `level_${state.lvl + 1}`,
        concept: lv.concept,
        playerAnswer: `[[${M.a},${M.b}],[${M.c},${M.d}]]`,
      });
      bridge.onLevelComplete({ levelId: `level_${state.lvl + 1}`, concept: lv.concept });
      void bridge.onScoreUpdate({
        source: 'alignment',
        score: state.score,
        stats: { levelReached: state.lvl + 1 },
      }).then(() => updateStats());

      setTimeout(showTutorModal, 400);
    } else {
      state.streak = 0;
      setFeedback('afb', 'err', '❌',
        `Not quite — det=${M.det().toFixed(3)}. Use Preview to see what your matrix does, then adjust.`);

      document.querySelector('.game-layout')?.classList.add('shake');
      setTimeout(() => document.querySelector('.game-layout')?.classList.remove('shake'), 380);

      const mistakeCategory = diagnoseMistake(M, lv);
      bridge.onIncorrect({
        levelId: `level_${state.lvl + 1}`,
        concept: lv.concept,
        playerAnswer: `[[${M.a},${M.b}],[${M.c},${M.d}]]`,
        correctAnswer: `[[${lv.target.a},${lv.target.b}],[${lv.target.c},${lv.target.d}]]`,
        mistakeCategory,
        additionalContext: {
          mode: 'monster_alignment',
          levelIndex: state.lvl,
          levelTitle: lv.title,
          validate: lv.validate,
          transformObjective: lv.obj,
          attemptsThisLevel: state.attempts,
          playerDet: M.det(),
          targetDet: lv.target.det(),
          internalDiagnosis: mistakeCategory,
        },
      });

      persistState();
      updateStats();
      void bridge.onScoreUpdate({
        source: 'alignment',
        score: state.score,
        stats: { levelReached: state.lvl + 1 },
      }).then(() => updateStats());
    }
  });
}

export function previewMatrix() {
  if (isAnimating()) return;

  const M = getInputMatrix();
  if (!M) {
    setFeedback('afb', 'info', '⚠️', 'Please fill in all four matrix entries first.');
    return;
  }
  setFeedback('afb', 'info', '👁', `Preview: det=${M.det().toFixed(3)}. Adjust your values then click Apply.`);
  triggerAnimation(M, () => {
    setTimeout(() => {
      if (!isAnimating()) triggerAnimation(M2.I(), null);
    }, 700);
  });
}

export function resetLevel() {
  if (isAnimating()) return;
  loadLevel(state.lvl);
}
