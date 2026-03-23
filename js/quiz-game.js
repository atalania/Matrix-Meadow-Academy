// ============================================================================
// js/quiz-game.js
// Linear Algebra Vocab Quiz tab.
// ============================================================================

import { shuffle } from './math-engine.js';
import { setFeedback } from './ui.js';
import { bridge } from './assistant-bridge.js';

// ---------------------------------------------------------------------------
// Question bank
// ---------------------------------------------------------------------------

const QUIZ = [
  { t:'Basics', p:'What does it mean for a square matrix to be <b>invertible</b>?', ch:['Its determinant is 0','There exists M⁻¹ such that M·M⁻¹ = I','It has an eigenvalue of 0','Its rows are dependent'], a:1, ex:'Invertible ⟺ det ≠ 0 ⟺ an inverse exists.' },
  { t:'Basics', p:'Two vectors are <b>orthogonal</b> if:', ch:['Their dot product is 1','Their cross product is 0','Their dot product is 0','They have the same length'], a:2, ex:'Orthogonal ⟺ v·w = 0.' },
  { t:'Basics', p:'The <b>identity matrix</b> I satisfies:', ch:['Has all zeros on diagonal','I·x = x for any vector x','det(I) = 0','Swaps rows when applied'], a:1, ex:'I acts like "1" for matrix multiplication.' },
  { t:'Linear Independence', p:'A set of vectors is <b>linearly independent</b> if:', ch:['Some is a scalar multiple of another','Only the trivial combination Σcᵢvᵢ=0 forces all cᵢ=0','They all have unit length','They span ℝⁿ automatically'], a:1, ex:'Independence: the only zero-sum uses all-zero coefficients.' },
  { t:'Rank & Span', p:'The <b>rank</b> of a matrix equals:', ch:['Rows + columns','Dimension of the column space (# pivot columns)','The determinant','Number of zero entries'], a:1, ex:'Rank = dim(col space) = number of pivots.' },
  { t:'Basics', p:'A matrix is <b>symmetric</b> if:', ch:['Aᵀ = A','A² = A','A⁻¹ = A','det(A) = 1'], a:0, ex:'Symmetric means A equals its own transpose.' },
  { t:'Determinant', p:'det(A) ≠ 0 directly implies:', ch:['A is diagonalizable','A is invertible','A is symmetric','A has a zero eigenvalue'], a:1, ex:'det ≠ 0 ⟺ invertible ⟺ columns independent.' },
  { t:'Eigenvalues', p:'An <b>eigenvector</b> v of matrix A satisfies:', ch:['A + v = λ','A·v = λ·v for some scalar λ','v·A = λ','A² = v'], a:1, ex:'Eigenvector: A stretches or flips v by the scalar λ.' },
  { t:'Basics', p:'The <b>trace</b> of a square matrix is:', ch:['Product of diagonal entries','Sum of diagonal entries','Sum of all entries','Number of pivot rows'], a:1, ex:'Trace = sum of diagonals = sum of eigenvalues.' },
  { t:'Determinant', p:'If det(A) = 0, the matrix is:', ch:['Invertible','Orthogonal','Singular (non-invertible)','Symmetric'], a:2, ex:'Singular = det 0 = no inverse = dependent columns.' },
  { t:'Transformations', p:'A <b>shear</b> transformation:', ch:['Changes area','Has det = 0','Slants shapes, det = 1','Reflects across an axis'], a:2, ex:'Shear [1 k / 0 1] has det = 1, so area is preserved.' },
  { t:'Transformations', p:'For a 2×2 rotation matrix R(θ):', ch:['det(R) = 0','det(R) = θ','det(R) = 1 and Rᵀ = R⁻¹','det(R) = −1'], a:2, ex:'Rotation preserves area (det=1) and is orthogonal (Rᵀ=R⁻¹).' },
  { t:'Determinant', p:'Swapping two rows of a matrix:', ch:['Keeps det the same','Doubles det','Negates det','Makes det zero'], a:2, ex:'Row swap → det negated. Fundamental property.' },
  { t:'Rank & Span', p:'The <b>null space</b> of A contains:', ch:['All vectors where A·x = b','All vectors x where A·x = 0','The columns of A','Only eigenvectors'], a:1, ex:'Null space = {x | Ax = 0}.' },
  { t:'Eigenvalues', p:'The <b>characteristic polynomial</b> of A is found by solving:', ch:['det(A − λI) = 0','trace(A) − λ = 0','det(A) · λ = 0','det(A + λI) = 0'], a:0, ex:'Eigenvalues λ satisfy det(A−λI)=0.' },
  { t:'Decomposition', p:'A matrix A is <b>orthogonal</b> if:', ch:['A = Aᵀ','A·Aᵀ = I (i.e. Aᵀ = A⁻¹)','A² = A','det(A) = 0'], a:1, ex:'Orthogonal: columns are orthonormal, Aᵀ = A⁻¹.' },
  { t:'Decomposition', p:'LU decomposition factors A into:', ch:['Lower and upper triangular matrices','Diagonal and symmetric matrices','Eigenvalue and eigenvector matrices','Rotation and scaling matrices'], a:0, ex:'LU: A = L·U — lower-triangular times upper-triangular.' },
  { t:'Transformations', p:'A reflection has det = −1 because:', ch:['It scales area by −1','It reverses the orientation of space','It has no inverse','It only works in 2D'], a:1, ex:'Negative determinant means orientation flips — like a mirror image.' },
];

const TOPICS = [...new Set(QUIZ.map(q => q.t))];

const state = {
  order: [],
  idx: 0,
  score: 0,
  streak: 0,
  correct: 0,
  locked: false,
  topicFilter: new Set(TOPICS),
  results: [],
};

function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

// ---------------------------------------------------------------------------
// Topic filter
// ---------------------------------------------------------------------------

function buildTopicFilter() {
  const el = document.getElementById('topic-filter');
  if (!el) return;
  el.innerHTML = '';
  TOPICS.forEach(t => {
    const b = document.createElement('button');
    b.className = 'diff-btn sel';
    b.textContent = t;
    b.addEventListener('click', () => {
      if (state.topicFilter.has(t) && state.topicFilter.size > 1) state.topicFilter.delete(t);
      else state.topicFilter.add(t);
      b.classList.toggle('sel', state.topicFilter.has(t));
      quizReset();
    });
    el.appendChild(b);
  });
}

// ---------------------------------------------------------------------------
// Quiz logic
// ---------------------------------------------------------------------------

function quizReset() {
  const filtered = QUIZ.map((q, i) => ({ q, i })).filter(({ q }) => state.topicFilter.has(q.t));
  state.order = shuffle(filtered.map(x => x.i));
  state.idx = 0;
  state.score = 0;
  state.streak = 0;
  state.correct = 0;
  state.locked = false;
  state.results = [];

  setText('q-score', 0);
  setText('q-streak', 0);
  setText('q-correct', 0);
  setText('q-total', state.order.length);
  buildProgress();
  renderQuestion();
}

function quizShuffle() {
  state.order = shuffle([...state.order]);
  state.idx = 0;
  state.results = [];
  buildProgress();
  renderQuestion();
}

function buildProgress() {
  const el = document.getElementById('q-prog');
  if (!el) return;
  el.innerHTML = '';
  state.order.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'qp-dot';
    if (i < state.results.length) d.classList.add(state.results[i] ? 'done-ok' : 'done-bad');
    if (i === state.idx) d.classList.add('cur');
    el.appendChild(d);
  });
}

function renderQuestion() {
  state.locked = false;
  const nextBtn = document.getElementById('qnext');
  if (nextBtn) nextBtn.disabled = true;
  setText('q-num', Math.min(state.idx + 1, state.order.length || 1));

  // Quiz complete
  if (state.idx >= state.order.length) {
    const pct = state.order.length > 0 ? Math.round(state.correct / state.order.length * 100) : 0;
    const promptEl = document.getElementById('q-prompt');
    if (promptEl) promptEl.innerHTML = `🎉 Done! <b>${state.correct}/${state.order.length}</b> (${pct}%).`;
    const choicesEl = document.getElementById('q-choices');
    if (choicesEl) choicesEl.innerHTML = '';
    setFeedback('qfb', 'ok', '🏆', 'Quiz complete! Click Restart to go again.');
    updateStats();
    buildProgress();
    return;
  }

  const q = QUIZ[state.order[state.idx]];
  const promptEl = document.getElementById('q-prompt');
  if (promptEl) {
    promptEl.innerHTML = `<span style="font-size:11px;font-weight:700;color:var(--purple);text-transform:uppercase;letter-spacing:.5px;">${q.t}</span><br>${q.p}`;
  }

  const cc = document.getElementById('q-choices');
  if (!cc) return;
  cc.innerHTML = '';
  const shuffled = shuffle(q.ch.map((c, i) => ({ c, i })));

  shuffled.forEach(({ c, i }) => {
    const btn = document.createElement('button');
    btn.className = 'choice';
    btn.innerHTML = c;
    btn.addEventListener('click', () => pickAnswer(i, btn, shuffled));
    cc.appendChild(btn);
  });

  setFeedback('qfb', 'empty', '📖', 'Choose the best answer.');
  buildProgress();
  updateStats();

  // Reset bridge timer for this question
  bridge.resetProblem();
}

function pickAnswer(idx, clickedBtn, shuffled) {
  if (state.locked) return;
  state.locked = true;

  const q = QUIZ[state.order[state.idx]];
  const correct = idx === q.a;
  state.results[state.idx] = correct;

  // Highlight correct/wrong
  document.querySelectorAll('#q-choices .choice').forEach((b, bi) => {
    if (shuffled[bi].i === q.a) b.classList.add('correct');
    if (!correct && b === clickedBtn) b.classList.add('wrong');
    b.disabled = true;
  });

  if (correct) {
    state.streak++;
    state.correct++;
    state.score += Math.max(5, 15 - Math.floor(state.idx * 0.5));
    setFeedback('qfb', 'ok', '✅', q.ex);

    bridge.onCorrect({
      levelId: `quiz-q${state.idx + 1}`,
      concept: 'linear_algebra_vocabulary',
      playerAnswer: q.ch[idx],
    });
  } else {
    state.streak = 0;
    setFeedback('qfb', 'err', '❌', `Incorrect. ${q.ex}`);

    bridge.onIncorrect({
      levelId: `quiz-q${state.idx + 1}`,
      concept: 'linear_algebra_vocabulary',
      playerAnswer: q.ch[idx],
      correctAnswer: q.ch[q.a],
      mistakeCategory: 'vocab_misconception',
      extra: { topic: q.t, questionIndex: state.order[state.idx] },
    });
  }

  setText('q-score', state.score);
  setText('q-streak', state.streak);
  setText('q-correct', state.correct);
  if (document.getElementById('qnext')) document.getElementById('qnext').disabled = false;
  buildProgress();
  updateStats();
}

function quizNext() {
  if (!state.locked) return;
  state.idx++;
  renderQuestion();
}

function updateStats() {
  const done = state.results.length;
  const total = state.order.length;
  const pct = done > 0 ? Math.round(state.correct / done * 100) : 0;
  const el = document.getElementById('q-stats');
  if (el) {
    el.innerHTML = `Questions answered: ${done}/${total}<br>Correct: ${state.correct}<br>Accuracy: ${pct}%<br>Score: ${state.score}<br>Streak: ${state.streak}`;
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export function initQuiz() {
  buildTopicFilter();
  quizReset();

  // Expose to global for button onclick handlers
  window.quizNext = quizNext;
  window.quizReset = quizReset;
  window.quizShuffle = quizShuffle;
}