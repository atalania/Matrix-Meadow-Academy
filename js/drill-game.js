// ============================================================================
// js/drill-game.js
// Matrix Multiplication Drill tab.
// ============================================================================

import { randomMatrix, multiplyMatrices } from './math-engine.js';
import { setFeedback, matrixToTable } from './ui.js';
import { bridge, setStemAssistantLevel } from './assistant-bridge.js';
import {
  drillRangeNumber,
  parseDrillIntegerCell,
  gradeDrillMatrices,
  drillDifficultyMultiplier,
  drillStreakScoreBonus,
  drillNearMissBonusPoints,
} from './drill-logic.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state = {
  size: 2,
  range: 'easy',
  timerMode: 'off',
  A: [], B: [], C: [],
  score: 0, streak: 0, best: 0,
  timeLeft: null,
  timerHandle: null,
  // Once a problem is solved (correct grade), revealed, or timed out, the
  // problem is "settled": further Check clicks must NOT change the score.
  settled: false,
};

/** Seconds left when welcome tutorial pauses the drill countdown (not cleared by clearTimer). */
let drillWelcomePauseLeft = null;

function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

function drillRangeDescription(range) {
  if (range === 'easy') return 'Entries drawn from small integers (about ±3).';
  if (range === 'med') return 'Entries drawn from medium integers (about ±6).';
  if (range === 'hard') return 'Entries drawn from larger integers (about ±9).';
  return `Range preset: ${range}`;
}

// ---------------------------------------------------------------------------
// Problem generation
// ---------------------------------------------------------------------------

function newDrill() {
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

  // Notify assistant
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

// ---------------------------------------------------------------------------
// Answer grid
// ---------------------------------------------------------------------------

function buildAnswerGrid() {
  const n = state.size;
  const el = document.getElementById('drill-answer');
  if (!el) return;
  el.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'dins';
  grid.style.gridTemplateColumns = `repeat(${n}, 58px)`;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const inp = document.createElement('input');
      inp.className = 'dinput';
      inp.type = 'text';
      // `numeric` hides the minus sign on most mobile keyboards; `tel`
      // shows a numeric keypad that includes "-" so kids can enter
      // negative integers. The `pattern` is only a hint to the browser.
      inp.inputMode = 'tel';
      inp.pattern = '-?[0-9]*';
      inp.autocomplete = 'off';
      inp.dataset.r = r;
      inp.dataset.c = c;
      inp.placeholder = '?';

      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); drillCheck(); return; }
        const nr = +inp.dataset.r, nc = +inp.dataset.c;
        const mv = (r2, c2) => {
          const nxt = el.querySelector(`input[data-r="${r2}"][data-c="${c2}"]`);
          if (nxt) nxt.focus();
        };
        if (e.key === 'ArrowRight') { e.preventDefault(); mv(nr, Math.min(n - 1, nc + 1)); }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); mv(nr, Math.max(0, nc - 1)); }
        if (e.key === 'ArrowDown')  { e.preventDefault(); mv(Math.min(n - 1, nr + 1), nc); }
        if (e.key === 'ArrowUp')    { e.preventDefault(); mv(Math.max(0, nr - 1), nc); }
      });

      grid.appendChild(inp);
    }
  }

  el.appendChild(grid);
  el.querySelector('input')?.focus();
}

function readAnswer() {
  const n = state.size;
  const el = document.getElementById('drill-answer');
  if (!el) return null;
  const out = Array.from({ length: n }, () => Array(n).fill(null));

  for (const inp of el.querySelectorAll('input.dinput')) {
    const v = parseDrillIntegerCell(inp.value);
    if (v === null) return null;
    out[+inp.dataset.r][+inp.dataset.c] = v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Check / Reveal
// ---------------------------------------------------------------------------

function drillCheck() {
  if (state.settled) {
    setFeedback('dfb', 'info', 'ℹ️', 'This problem is already settled — click New Problem to play another.');
    return;
  }

  const user = readAnswer();
  if (!user) { setFeedback('dfb', 'info', '⚠️', 'Fill every cell with an integer first!'); return; }

  const n = state.size;
  const el = document.getElementById('drill-answer');
  const { correct, total, allOk, wrongEntries } = gradeDrillMatrices(user, state.C);

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const inp = el.querySelector(`input[data-r="${r}"][data-c="${c}"]`);
      const pass = user[r][c] === state.C[r][c];
      inp.classList.toggle('correct', pass);
      inp.classList.toggle('wrong', !pass);
    }
  }

  const mult = drillDifficultyMultiplier(state.size, state.range);

  if (allOk) {
    clearTimer();
    state.settled = true;
    state.streak++;
    state.best = Math.max(state.best, state.streak);
    const base = Math.round(10 * mult);
    const streakExtra = drillStreakScoreBonus(state.streak);
    const gained = base + streakExtra;
    state.score = Math.max(0, state.score + gained);
    setFeedback('dfb', 'ok', '✅',
      `All ${total} entries correct! +${gained} pts (×${mult.toFixed(2)} grid${streakExtra ? `, +${streakExtra} streak` : ''}).`);

    bridge.onCorrect({
      levelId: `drill_${state.size}x${state.size}`,
      concept: 'matrix_multiplication_drill',
      playerAnswer: JSON.stringify(user),
    });
  } else if (correct === total - 1) {
    state.streak = 0;
    const partial = drillNearMissBonusPoints(mult);
    state.score = Math.max(0, state.score + partial);
    setFeedback('dfb', 'info', '🎯',
      `So close — ${correct}/${total} correct. Near-miss +${partial} pts (one cell off).`);

    bridge.onIncorrect({
      levelId: `drill_${state.size}x${state.size}`,
      concept: 'matrix_multiplication_drill',
      playerAnswer: JSON.stringify(user),
      correctAnswer: JSON.stringify(state.C),
      mistakeCategory: 'near_miss_one_cell',
      additionalContext: {
        mode: 'multiplication_drill',
        gridSize: state.size,
        numberRange: state.range,
        timerMode: state.timerMode,
        correctCells: correct,
        totalCells: total,
        wrongEntries,
        nearMiss: true,
      },
    });
  } else {
    state.streak = 0;
    state.score = Math.max(0, state.score - 3);
    setFeedback('dfb', 'err', '❌', `${correct}/${total} correct. −3 pts.`);

    bridge.onIncorrect({
      levelId: `drill_${state.size}x${state.size}`,
      concept: 'matrix_multiplication_drill',
      playerAnswer: JSON.stringify(user),
      correctAnswer: JSON.stringify(state.C),
      mistakeCategory: 'dot_product_miscalculation',
      additionalContext: {
        mode: 'multiplication_drill',
        gridSize: state.size,
        numberRange: state.range,
        timerMode: state.timerMode,
        correctCells: correct,
        totalCells: total,
        wrongEntries,
      },
    });
  }

  void bridge.onScoreUpdate({
    source: 'drill',
    score: state.score,
    stats: {
      drillSize: state.size,
      bestDrillStreak: state.best,
      timerMode: state.timerMode,
    },
  }).then(() => {
    setText('d-score', state.score);
    setText('d-streak', state.streak);
    setText('d-best', state.best);
    const tb = bridge.getTrackBests?.();
    if (tb) setText('d-high', tb.drillBest);
    buildDotHint();
  });
}

function drillReveal(fromTimeout = false) {
  clearTimer();
  state.streak = 0;
  state.settled = true;
  const n = state.size;
  const el = document.getElementById('drill-answer');
  if (!el) return;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const inp = el.querySelector(`input[data-r="${r}"][data-c="${c}"]`);
      if (!inp) continue;
      inp.value = state.C[r][c];
      inp.classList.add('correct');
      inp.classList.remove('wrong');
    }
  }

  setFeedback('dfb', 'info', fromTimeout ? '⏰' : '👀',
    fromTimeout
      ? 'Time up! Answer revealed. Study the dot-product steps →'
      : 'Answer revealed. Streak reset. Study the dot-product steps →');
  setText('d-streak', 0);
  buildDotHint();

  if (fromTimeout) {
    bridge.onTimeout({
      levelId: `drill_${state.size}x${state.size}`,
      concept: 'matrix_multiplication_drill',
      correctAnswer: JSON.stringify(state.C),
    });
  }
}

function buildDotHint() {
  const n = state.size;
  let html = '';
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const terms = [];
      for (let k = 0; k < n; k++) {
        const ac = state.A[i][k] >= 0 ? '#5c35a8' : '#e17055';
        const bc = state.B[k][j] >= 0 ? '#0096c7' : '#e17055';
        terms.push(`<span style="color:${ac}">${state.A[i][k]}</span>×<span style="color:${bc}">${state.B[k][j]}</span>`);
      }
      const cc = state.C[i][j] === 0 ? '#636e72' : state.C[i][j] > 0 ? '#006d5b' : '#b83232';
      html += `C[${i}][${j}] = ${terms.join(' + ')} = <strong style="color:${cc}">${state.C[i][j]}</strong><br>`;
    }
  }
  const el = document.getElementById('dp-hint');
  if (el) el.innerHTML = html;
}

// ---------------------------------------------------------------------------
// Timer
// ---------------------------------------------------------------------------

function drillTimerTick() {
  state.timeLeft--;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    updateTimerFill();
    setText('d-score', state.score);
    void bridge.onScoreUpdate({
      source: 'drill',
      score: state.score,
      stats: {
        drillSize: state.size,
        bestDrillStreak: state.best,
        timerMode: state.timerMode,
        timedOut: true,
      },
    }).then(() => {
      const tb = bridge.getTrackBests?.();
      if (tb) setText('d-high', tb.drillBest);
    });
    drillReveal(true);
  } else {
    updateTimerFill();
    setText('d-timer-disp', `${state.timeLeft}s`);
  }
}

function startTimer() {
  clearTimer();
  if (state.timerMode === 'off') { setText('d-timer-disp', '—'); return; }
  // Don't run a timer on a problem that's already been graded/revealed.
  if (state.settled) { setText('d-timer-disp', '—'); return; }

  state.timeLeft = +state.timerMode;
  setText('d-timer-disp', `${state.timeLeft}s`);
  updateTimerFill();

  state.timerHandle = setInterval(drillTimerTick, 1000);
}

function clearTimer() {
  clearInterval(state.timerHandle);
  state.timerHandle = null;
  state.timeLeft = null;
  drillWelcomePauseLeft = null;
  setText('d-timer-disp', '—');
  const f = document.getElementById('drill-timer-fill');
  if (f) { f.style.width = '100%'; f.className = 'timer-fill'; }
}

function pauseDrillTimerForWelcomeOverlay() {
  if (state.timerHandle == null) return;
  clearInterval(state.timerHandle);
  state.timerHandle = null;
  drillWelcomePauseLeft = state.timeLeft;
}

function resumeDrillTimerForWelcomeOverlay() {
  if (drillWelcomePauseLeft == null) return;
  if (state.timerMode === 'off' || state.settled) {
    drillWelcomePauseLeft = null;
    return;
  }
  state.timeLeft = drillWelcomePauseLeft;
  drillWelcomePauseLeft = null;
  setText('d-timer-disp', `${state.timeLeft}s`);
  updateTimerFill();
  state.timerHandle = setInterval(drillTimerTick, 1000);
}

function updateTimerFill() {
  const max = +state.timerMode;
  const f = document.getElementById('drill-timer-fill');
  if (!f || !max || state.timeLeft == null) { if (f) { f.style.width = '100%'; f.className = 'timer-fill'; } return; }
  const pct = (state.timeLeft / max) * 100;
  f.style.width = pct + '%';
  f.className = 'timer-fill' + (pct < 40 ? ' warn' : '') + (pct < 15 ? ' danger' : '');
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export function initDrill() {
  // Difficulty selectors
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

  // Expose to global for button onclick handlers
  window.drillCheck = drillCheck;
  window.drillReveal = () => drillReveal(false);
  window.newDrill = newDrill;

  window.addEventListener('mma:welcome-overlay', (e) => {
    const open = !!(e && e.detail && e.detail.open);
    if (open) pauseDrillTimerForWelcomeOverlay();
    else resumeDrillTimerForWelcomeOverlay();
  });
}