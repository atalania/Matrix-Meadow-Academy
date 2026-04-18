// ============================================================================
// js/alignment-game.js
// Monster Alignment tab — level management, matrix input, canvas rendering.
// ============================================================================

import { M2, lerpMatrix } from './math-engine.js';
import { buildLevels } from './levels.js';
import { checkAnswer, diagnoseMistake } from './alignment-logic.js';
import { drawMonsterPNG, drawFallbackMonster, drawGrid, getImgState, onMonsterReady } from './monster-renderer.js';
import { setFeedback, parseInputValue, spawnConfetti, clearConfetti } from './ui.js';
import { askTutor } from './tutor.js';
import { bridge } from './assistant-bridge.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state = {
  lvl: 0,
  score: 0,
  streak: 0,
  bestStreak: 0,
  attempts: 0,
  totalAttempts: 0,
  totalCorrect: 0,
  curMat: M2.I(),
  animFrom: M2.I(),
  animTo: M2.I(),
  animT: 1,
  animDur: 600,
  animStart: 0,
  animCB: null,
  done: [],
  seed: 17,
  levels: [],
  timerStart: Date.now(),
};

// ---------------------------------------------------------------------------
// Canvas setup
// ---------------------------------------------------------------------------

let canvas, ctx;

function resizeCanvas() {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement.getBoundingClientRect().width || 420;
  canvas.width = w * dpr;
  canvas.height = 370 * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = '370px';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
}

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------

function triggerAnimation(to, cb) {
  state.animFrom = state.curMat;
  state.animTo = to;
  state.animT = 0;
  state.animStart = performance.now();
  state.animCB = cb;
}

function render(ts) {
  if (!canvas || !ctx) { requestAnimationFrame(render); return; }

  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width / dpr, H = canvas.height / dpr;
  const cx = W / 2, cy = H / 2;
  ctx.clearRect(0, 0, W, H);
  drawGrid(ctx, W, H);

  // Advance animation
  if (state.animT < 1) {
    state.animT = Math.min(1, (ts - state.animStart) / state.animDur);
    state.curMat = lerpMatrix(state.animFrom, state.animTo, state.animT);
    if (state.animT >= 1 && state.animCB) {
      const cb = state.animCB;
      state.animCB = null;
      cb();
    }
  }

  const lv = state.levels[state.lvl];
  if (!lv) { requestAnimationFrame(render); return; }

  const imgState = getImgState();
  if (imgState === 'loaded') {
    drawMonsterPNG(ctx, lv.target, cx, cy, true);
    drawMonsterPNG(ctx, state.curMat, cx, cy, false);
  } else if (imgState === 'error') {
    drawFallbackMonster(ctx, lv.target, cx, cy, state.seed + state.lvl, true);
    drawFallbackMonster(ctx, state.curMat, cx, cy, state.seed + state.lvl, false);
  }

  const detEl = document.getElementById('det-display');
  if (detEl) detEl.textContent = `det(current) = ${state.curMat.det().toFixed(3)}`;

  requestAnimationFrame(render);
}

// ---------------------------------------------------------------------------
// Input reading
// ---------------------------------------------------------------------------

function getInputMatrix() {
  const vals = ['i00', 'i01', 'i10', 'i11'].map(parseInputValue);
  if (vals.some(v => v === null)) return null;
  return new M2(vals[0], vals[1], vals[2], vals[3]);
}

function updateLiveDet() {
  const M = getInputMatrix();
  const el = document.getElementById('live-det');
  if (el) el.textContent = M ? M.det().toFixed(3) : '—';
}

// ---------------------------------------------------------------------------
// Level management
// ---------------------------------------------------------------------------

function loadLevel(idx) {
  state.lvl = idx;
  state.attempts = 0;
  state.curMat = M2.I();
  state.animT = 1;
  state.animTo = M2.I();

  const lv = state.levels[idx];
  if (!lv) return;

  // Update DOM
  setText('ltitle', lv.title);
  setText('ldesc', lv.desc);
  setText('lobj', '🎯 ' + lv.obj);
  setText('teach-txt', lv.teach);
  setText('concept-txt', lv.formulaRef);
  setText('a-lnum', idx + 1);

  // Reset inputs
  ['i00', 'i01', 'i10', 'i11'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = '';
    el.readOnly = false;
    el.classList.remove('good', 'bad');
  });

  setFeedback('afb', 'empty', '🌟', 'Fill in the matrix and click Apply!');
  updateLiveDet();
  updateLevelDots();
  updateStats();

  // Notify assistant bridge
  bridge.onLevelStart(`level-${idx + 1}`, lv.concept);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ---------------------------------------------------------------------------
// Apply / Preview / Reset
// ---------------------------------------------------------------------------

function applyMatrix() {
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
      const pts = Math.max(10, 110 - state.attempts * 12);
      state.score += pts;

      if (!state.done.includes(state.lvl)) state.done.push(state.lvl);
      localStorage.setItem('mm_done', JSON.stringify(state.done));
      localStorage.setItem('mm_score', state.score);

      setFeedback('afb', 'ok', '🎉', 'Correct! Monster perfectly aligned!');
      updateStats();

      // Notify assistant
      bridge.onCorrect({
        levelId: `level-${state.lvl + 1}`,
        concept: lv.concept,
        playerAnswer: `[[${M.a},${M.b}],[${M.c},${M.d}]]`,
      });
      bridge.onLevelComplete({ levelId: `level-${state.lvl + 1}`, concept: lv.concept });

      setTimeout(showTutorModal, 400);
    } else {
      state.streak = 0;
      setFeedback('afb', 'err', '❌',
        `Not quite — det=${M.det().toFixed(3)}. Use Preview to see what your matrix does, then adjust.`);

      document.querySelector('.game-layout')?.classList.add('shake');
      setTimeout(() => document.querySelector('.game-layout')?.classList.remove('shake'), 380);

      // Notify assistant — identify mistake type
      const mistakeCategory = diagnoseMistake(M, lv);
      bridge.onIncorrect({
        levelId: `level-${state.lvl + 1}`,
        concept: lv.concept,
        playerAnswer: `[[${M.a},${M.b}],[${M.c},${M.d}]]`,
        correctAnswer: `[[${lv.target.a},${lv.target.b}],[${lv.target.c},${lv.target.d}]]`,
        mistakeCategory,
        extra: { attempts: state.attempts, det: M.det() },
      });

      updateStats();
    }
  });
}

function previewMatrix() {
  const M = getInputMatrix();
  if (!M) {
    setFeedback('afb', 'info', '⚠️', 'Please fill in all four matrix entries first.');
    return;
  }
  setFeedback('afb', 'info', '👁', `Preview: det=${M.det().toFixed(3)}. Adjust your values then click Apply.`);
  triggerAnimation(M, null);
}

function resetLevel() { loadLevel(state.lvl); }

// ---------------------------------------------------------------------------
// UI updates
// ---------------------------------------------------------------------------

function updateLevelDots() {
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

function updateStats() {
  setText('a-score', state.score);
  setText('a-streak', state.streak);

  const accEl = document.getElementById('a-acc');
  if (accEl) {
    accEl.textContent = state.totalAttempts > 0
      ? Math.round(state.totalCorrect / state.totalAttempts * 100) + '%'
      : '—';
  }
}

// ---------------------------------------------------------------------------
// AI Tutor modal
// ---------------------------------------------------------------------------

function showTutorModal() {
  const lv = state.levels[state.lvl];
  setText('tm-mon', '🎓');
  setText('tm-pts', `+${Math.max(10, 110 - state.attempts * 12)} pts earned`);
  const qEl = document.getElementById('tm-question');
  if (qEl) qEl.textContent = lv.tutorQ;
  const aEl = document.getElementById('tm-answer');
  if (aEl) aEl.value = '';
  const resp = document.getElementById('tm-response');
  if (resp) { resp.textContent = ''; resp.className = 'tutor-response'; }
  const submitBtn = document.getElementById('tm-submit');
  if (submitBtn) { submitBtn.style.display = ''; submitBtn.disabled = false; }
  const nextBtn = document.getElementById('tm-next');
  if (nextBtn) nextBtn.style.display = 'none';
  document.getElementById('tutor-modal')?.classList.add('on');
  spawnConfetti();
}

async function submitToTutor() {
  const answer = document.getElementById('tm-answer')?.value.trim();
  if (!answer) { document.getElementById('tm-answer')?.focus(); return; }

  const lv = state.levels[state.lvl];
  const resp = document.getElementById('tm-response');
  if (resp) { resp.className = 'tutor-response thinking show'; resp.textContent = 'Professor Meadow is thinking…'; }
  const submitBtn = document.getElementById('tm-submit');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const reply = await askTutor({
      level_title: lv.title,
      level_concept: lv.formulaRef,
      tutor_question: lv.tutorQ,
      student_answer: answer,
      attempts: state.attempts,
    });
    if (resp) {
      resp.className = 'tutor-response show';
      resp.textContent = reply;
    }
  } catch {
    if (resp) {
      resp.className = 'tutor-response show';
      resp.textContent = 'The tutor is unavailable right now. Keep exploring!';
    }
  }

  if (submitBtn) { submitBtn.disabled = false; submitBtn.style.display = 'none'; }
  const nextBtn = document.getElementById('tm-next');
  if (nextBtn) nextBtn.style.display = '';
}

function nextLevel() {
  document.getElementById('tutor-modal')?.classList.remove('on');
  clearConfetti();
  const n = state.lvl + 1;
  if (n < state.levels.length) {
    loadLevel(n);
  } else {
    setFeedback('afb', 'ok', '🏆', "All 9 levels complete! You're a Matrix Master!");
  }
}

// ---------------------------------------------------------------------------
// Timer
// ---------------------------------------------------------------------------

function startTimer() {
  state.timerStart = Date.now();
  setInterval(() => {
    const e = Math.floor((Date.now() - state.timerStart) / 1000);
    const m = Math.floor(e / 60);
    const s = e % 60;
    setText('a-time', `${m}:${s.toString().padStart(2, '0')}`);
  }, 1000);
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export function initAlignment() {
  canvas = document.getElementById('gc');
  ctx = canvas?.getContext('2d');

  // Restore saved progress
  state.done = JSON.parse(localStorage.getItem('mm_done') || '[]');
  state.score = parseInt(localStorage.getItem('mm_score') || '0', 10);
  state.levels = buildLevels();

  // Canvas
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Loading UI
  onMonsterReady((status) => {
    const loadingEl = document.getElementById('canvas-loading');
    if (loadingEl) loadingEl.style.display = 'none';
  });

  // Input events
  ['i00', 'i01', 'i10', 'i11'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', updateLiveDet);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); applyMatrix(); }
    });
  });

  loadLevel(0);
  startTimer();
  requestAnimationFrame(render);

  // Expose to global for button onclick handlers
  window.applyMatrix = applyMatrix;
  window.previewMatrix = previewMatrix;
  window.resetLevel = resetLevel;
  window.submitToTutor = submitToTutor;
  window.nextLevel = nextLevel;
}