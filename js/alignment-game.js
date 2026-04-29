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
// Persistence helpers — never throw on corrupt localStorage
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'mm_state_v1';

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (e) {
    console.warn('Failed to parse saved progress; starting fresh.', e);
    return null;
  }
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      done: state.done,
      score: state.score,
      bestStreak: state.bestStreak,
      totalAttempts: state.totalAttempts,
      totalCorrect: state.totalCorrect,
    }));
  } catch (e) {
    console.warn('Failed to save progress.', e);
  }
}

function safeInt(v, fallback = 0) {
  const n = typeof v === 'number' ? v : parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function safeIntArray(v) {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => Number.isInteger(x) && x >= 0);
}

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

function isAnimating() {
  return state.animT < 1;
}

function setActionButtonsDisabled(disabled) {
  ['btn-apply', 'btn-preview', 'btn-reset'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = disabled;
  });
}

function triggerAnimation(to, cb) {
  state.animFrom = state.curMat;
  state.animTo = to;
  state.animT = 0;
  state.animStart = performance.now();
  state.animCB = cb;
  // Disable user actions while the animation plays so callbacks (scoring,
  // feedback, modal display) can't be silently overwritten by a second
  // Apply/Preview click landing mid-animation.
  setActionButtonsDisabled(true);
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
    if (state.animT >= 1) {
      setActionButtonsDisabled(false);
      if (state.animCB) {
        const cb = state.animCB;
        state.animCB = null;
        cb();
      }
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
  state.animFrom = M2.I();
  // Discard any pending animation callback from the previous level — its
  // scoring/feedback would target the wrong level.
  state.animCB = null;
  // Re-enable the action buttons in case loadLevel was triggered while a
  // previous animation was still in flight (e.g. clicking a level dot).
  setActionButtonsDisabled(false);

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
  // Ignore Apply while a previous animation is still in flight; otherwise
  // its callback (scoring, feedback, modal) gets dropped.
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
      const pts = Math.max(10, 110 - state.attempts * 12);
      state.score += pts;

      if (!state.done.includes(state.lvl)) state.done.push(state.lvl);
      persistState();

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

      persistState();
      updateStats();
    }
  });
}

function previewMatrix() {
  if (isAnimating()) return;

  const M = getInputMatrix();
  if (!M) {
    setFeedback('afb', 'info', '⚠️', 'Please fill in all four matrix entries first.');
    return;
  }
  setFeedback('afb', 'info', '👁', `Preview: det=${M.det().toFixed(3)}. Adjust your values then click Apply.`);
  // Animate to the previewed shape, then ease back to the identity so the
  // canvas state isn't permanently mutated by a "preview" action.
  triggerAnimation(M, () => {
    setTimeout(() => {
      // Only auto-revert if no other animation has started in the meantime.
      if (!isAnimating()) triggerAnimation(M2.I(), null);
    }, 700);
  });
}

function resetLevel() {
  if (isAnimating()) return;
  loadLevel(state.lvl);
}

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

  // Restore saved progress (with safe defaults). Also migrates from older
  // schema where `mm_done` and `mm_score` were stored as separate keys.
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