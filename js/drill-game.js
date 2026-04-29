// ============================================================================
// js/drill-game.js
// Matrix Multiplication Drill tab.
// ============================================================================

import { randomMatrix, multiplyMatrices } from './math-engine.js';
import { setFeedback, matrixToTable } from './ui.js';
import { bridge } from './assistant-bridge.js';
import { drillRangeNumber, parseDrillIntegerCell, gradeDrillMatrices } from './drill-logic.js';

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

function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

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
  bridge.resetProblem();
  bridge.onLevelStart(`drill-${state.size}x${state.size}`, 'matrix_multiplication_drill');
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

  if (allOk) {
    clearTimer();
    state.settled = true;
    state.streak++;
    state.best = Math.max(state.best, state.streak);
    state.score = Math.max(0, state.score + 10);
    setFeedback('dfb', 'ok', '✅', `All ${total} entries correct! +10 pts`);

    bridge.onCorrect({
      levelId: `drill-${state.size}x${state.size}`,
      concept: 'matrix_multiplication_drill',
      playerAnswer: JSON.stringify(user),
    });
  } else {
    state.streak = 0;
    state.score = Math.max(0, state.score - 3);
    setFeedback('dfb', 'err', '❌', `${correct}/${total} correct. −3 pts.`);

    bridge.onIncorrect({
      levelId: `drill-${state.size}x${state.size}`,
      concept: 'matrix_multiplication_drill',
      playerAnswer: JSON.stringify(user),
      correctAnswer: JSON.stringify(state.C),
      mistakeCategory: 'dot_product_miscalculation',
      extra: { wrongEntries, correctCount: correct, totalCount: total },
    });
  }

  setText('d-score', state.score);
  setText('d-streak', state.streak);
  setText('d-best', state.best);
  buildDotHint();
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
      levelId: `drill-${state.size}x${state.size}`,
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

function startTimer() {
  clearTimer();
  if (state.timerMode === 'off') { setText('d-timer-disp', '—'); return; }
  // Don't run a timer on a problem that's already been graded/revealed.
  if (state.settled) { setText('d-timer-disp', '—'); return; }

  state.timeLeft = +state.timerMode;
  setText('d-timer-disp', `${state.timeLeft}s`);
  updateTimerFill();

  state.timerHandle = setInterval(() => {
    state.timeLeft--;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      updateTimerFill();
      state.score = Math.max(0, state.score - 1);
      setText('d-score', state.score);
      drillReveal(true);
    } else {
      updateTimerFill();
      setText('d-timer-disp', `${state.timeLeft}s`);
    }
  }, 1000);
}

function clearTimer() {
  clearInterval(state.timerHandle);
  state.timerHandle = null;
  state.timeLeft = null;
  setText('d-timer-disp', '—');
  const f = document.getElementById('drill-timer-fill');
  if (f) { f.style.width = '100%'; f.className = 'timer-fill'; }
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
}