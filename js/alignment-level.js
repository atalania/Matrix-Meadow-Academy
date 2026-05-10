// ============================================================================
// js/alignment-level.js
// Level loading, progress dots, and STEM assistant context for Alignment.
// ============================================================================

import { M2 } from './math-engine.js';
import { setFeedback } from './ui.js';
import { bridge, setStemAssistantLevel } from './assistant-bridge.js';
import { state } from './alignment-state.js';
import { setActionButtonsDisabled } from './alignment-render.js';
import { updateLiveDet, updatePresetAvailability } from './alignment-input-presets.js';
import { updateStats } from './alignment-scoring.js';
import { setText } from './alignment-dom.js';

export { setText };

export function emitAlignmentProgress() {
  const doneCount = state.done.length;
  const totalLevels = state.levels.length;
  window.dispatchEvent(new CustomEvent('mma:alignment-progress', {
    detail: {
      doneCount,
      totalLevels,
      quizUnlocked: doneCount >= totalLevels && totalLevels > 0,
    },
  }));
}

/** Snapshot for STEM hub web assistants (`level_start` additionalContext). */
export function alignmentAssistantLevelContext(idx, lv) {
  const refDet = lv.target.det();
  return {
    mode: 'monster_alignment',
    activityName: 'Monster Alignment',
    levelNumber: idx + 1,
    levelIndex: idx,
    title: lv.title,
    description: lv.desc,
    objective: lv.obj,
    validation: lv.validate,
    validationRules: lv.validate === 'det6'
      ? 'Accept any diagonal 2×2 matrix with determinant exactly 6 (many answers; reference matrix is one example).'
      : 'Exact matrix match to the level’s target transform.',
    solveGuide: lv.solveGuide || '',
    levelHintTeaching: lv.teach || '',
    formulaReferencePanel: lv.formulaRef || '',
    postLevelTutorQuestion: lv.tutorQ || '',
    referenceTargetMatrix: [[lv.target.a, lv.target.b], [lv.target.c, lv.target.d]],
    referenceTargetDeterminant: refDet,
    uiSummary:
      'Player edits [[a,b],[c,d]], Apply commits the transform, Preview animates without committing, Reset reloads the level. Canvas: solid cyan = current transform, red dashed = target.',
  };
}

export function loadLevel(idx) {
  state.lvl = idx;
  state.attempts = 0;
  state.levelStart = Date.now();
  state.curMat = M2.I();
  state.animT = 1;
  state.animTo = M2.I();
  state.animFrom = M2.I();
  state.animCB = null;
  setActionButtonsDisabled(false);

  const lv = state.levels[idx];
  if (!lv) return;

  setStemAssistantLevel(`level_${idx + 1}`, lv.concept);

  setText('ltitle', lv.title);
  setText('ldesc', lv.desc);
  setText('lobj', '🎯 ' + lv.obj);
  setText('a-ltotal', state.levels.length);
  setText('solve-guide-txt', lv.solveGuide || 'Use Preview first, then apply one matrix idea at a time.');
  setText('teach-txt', lv.teach);
  setText('concept-txt', lv.formulaRef);
  setText('a-lnum', idx + 1);

  ['i00', 'i01', 'i10', 'i11'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = '';
    el.readOnly = false;
    el.classList.remove('good', 'bad');
  });

  setFeedback('afb', 'empty', '🌟', 'Fill in the matrix and click Apply!');
  updateLiveDet();
  updatePresetAvailability();
  updateLevelDots();
  updateStats();
  emitAlignmentProgress();

  bridge.onLevelStart({
    levelId: `level_${idx + 1}`,
    concept: lv.concept,
    additionalContext: alignmentAssistantLevelContext(idx, lv),
  });
}

export function updateLevelDots() {
  const bar = document.getElementById('ldots');
  if (!bar) return;
  bar.innerHTML = '';
  state.levels.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'ldot' + (state.done.includes(i) ? ' done' : '') + (i === state.lvl ? ' cur' : '');
    d.textContent = i + 1;
    d.title = state.levels[i].title;
    d.onclick = () => loadLevel(i);
    bar.appendChild(d);
  });
}
