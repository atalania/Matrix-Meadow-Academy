// ============================================================================
// js/drill-problem.js
// Generates A, B, C and wires the assistant for a new Drill problem.
// ============================================================================

import { randomMatrix, multiplyMatrices } from './math-engine.js';
import { setFeedback, matrixToTable } from './ui.js';
import { bridge, setStemAssistantLevel } from './assistant-bridge.js';
import { drillRangeNumber } from './drill-logic.js';
import { state } from './drill-state.js';
import { buildAnswerGrid, startTimer } from './drill-play.js';

function drillRangeDescription(range) {
  if (range === 'easy') return 'Entries drawn from small integers (about ±3).';
  if (range === 'med') return 'Entries drawn from medium integers (about ±6).';
  if (range === 'hard') return 'Entries drawn from larger integers (about ±9).';
  return `Range preset: ${range}`;
}

export function newDrill() {
  const r = drillRangeNumber(state.range);
  state.A = randomMatrix(state.size, r);
  state.B = randomMatrix(state.size, r);
  state.C = multiplyMatrices(state.A, state.B);
  state.settled = false;

  const el = document.getElementById('drill-mats');
  if (!el) return;
  el.innerHTML = '';

  ['A', 'B'].forEach(name => {
    const box = document.createElement('div');
    box.className = 'dmat-box';
    box.innerHTML = `<div class="dmat-title">Matrix ${name}</div>` +
      matrixToTable(name === 'A' ? state.A : state.B);
    el.appendChild(box);
  });

  buildAnswerGrid();
  setFeedback('dfb', 'empty', '🧮', 'Multiply A × B and fill in the grid!');
  document.getElementById('dp-hint').innerHTML =
    'Fill in the answer grid and click <strong>Check</strong> to see dot-product steps.';
  startTimer();

  const drillLevelId = `drill_${state.size}x${state.size}`;
  setStemAssistantLevel(drillLevelId, 'matrix_multiplication_drill');
  bridge.resetProblem();
  bridge.onLevelStart({
    levelId: drillLevelId,
    concept: 'matrix_multiplication_drill',
    additionalContext: {
      mode: 'multiplication_drill',
      activityName: 'Matrix Multiplication Drill',
      taskDescription: 'Compute C = A × B. Each cell of C is the dot product of one row of A with one column of B; order is not commutative.',
      gridSize: state.size,
      matrixLayoutLabel: `${state.size}×${state.size}`,
      numberRangePreset: state.range,
      numberRangeDescription: drillRangeDescription(state.range),
      timerMode: state.timerMode,
      matrixA: state.A,
      matrixB: state.B,
      expectedProductMatrixC: state.C,
      interactionSummary:
        'Player fills the answer grid, Check marks cells and fills the Dot Product Breakdown panel, Reveal shows the full C, New Problem draws fresh A and B.',
    },
  });
}
