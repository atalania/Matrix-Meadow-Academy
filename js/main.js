// ============================================================================
// js/main.js
// Entry point. Initializes all game modules and tab switching.
// ============================================================================

import { bridge } from './assistant-bridge.js';
import { initAlignment } from './alignment-game.js';
import { initDrill } from './drill-game.js';
import { initQuiz } from './quiz-game.js';

// ---------------------------------------------------------------------------
// Tab switching
// ---------------------------------------------------------------------------

let drillInitialized = false;
const WELCOME_STORAGE_KEY = 'mma_welcome_seen_v1';
let quizUnlocked = false;

function refreshTrackHud() {
  const b = bridge.getTrackBests();
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(v);
  };
  set('a-best', b.alignmentBest);
  set('d-high', b.drillBest);
  set('q-high', b.quizBest);
}

function activateTab(tabName) {
  if (tabName === 'quiz' && !quizUnlocked) {
    document.getElementById('quiz-lock-modal')?.classList.add('on');
    return;
  }

  const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  if (!tabBtn) return;

  document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.tab-page').forEach(x => x.classList.remove('active'));
  tabBtn.classList.add('active');
  document.getElementById('tab-' + tabName)?.classList.add('active');

  if (tabName === 'drill' && !drillInitialized) {
    drillInitialized = true;
    window.newDrill?.();
  }
  refreshTrackHud();
}

function setQuizUnlocked(unlocked) {
  quizUnlocked = !!unlocked;
  const quizBtn = document.getElementById('quiz-tab-btn');
  if (!quizBtn) return;
  quizBtn.textContent = unlocked ? '📚 Vocab Quiz' : '📚 Vocab Quiz 🔒';
  quizBtn.classList.toggle('locked', !unlocked);
}

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activateTab(btn.dataset.tab);
    });
  });
}

/** Multi-step new-player tutorial (HTML fragments are static; only step index changes). */
const WELCOME_STEPS = [
  {
    icon: '🌿',
    title: 'Welcome — you are in the right place',
    sub: 'This walkthrough assumes you have never touched matrices before. Use Back / Next; there is no timer.',
    html: `
      <div class="welcome-section">
        <div class="welcome-heading">If anything feels unfamiliar, that is normal</div>
        <p><strong>Matrix Meadow Academy</strong> is a small learning playground in your browser. You do not need an account, a textbook, or prior math courses to start.</p>
        <p>Over the next screens we will explain <em>what you are looking at</em>, <em>what a matrix is in everyday language</em>, and <em>exactly what to click</em> in each activity.</p>
      </div>
      <div class="welcome-callout">Tip: read one screen, try the app for a minute, then press Next. You can always use the Back button to reread a step.</div>`,
  },
  {
    icon: '🧭',
    title: 'What you are looking at on this page',
    sub: 'One website, three activities — switch between them with the tabs at the top.',
    html: `
      <div class="welcome-section">
        <div class="welcome-heading">The three tabs (left to right)</div>
        <ul class="welcome-steps">
          <li><strong>Monster Alignment</strong> — You move a friendly creature by filling a small grid of numbers. This builds <em>visual intuition</em> for how matrices change shapes and directions.</li>
          <li><strong>Multiplication Drill</strong> — You practice the pencil-and-paper pattern: multiply rows and columns, add the pieces, and fill a result grid. This builds <em>calculation skill</em>.</li>
          <li><strong>Vocab Quiz</strong> — Short multiple-choice questions about words and ideas. It starts <strong>locked</strong> until you finish all alignment levels (so terms connect to things you have already seen).</li>
        </ul>
      </div>
      <div class="welcome-section">
        <div class="welcome-heading">How to move around</div>
        <p>Click a tab name to switch modes. Your progress on this device is remembered automatically. Nothing here is high-stakes: mistakes are part of learning.</p>
      </div>`,
  },
  {
    icon: '🧮',
    title: 'What is a “matrix” here? (plain English)',
    sub: 'Forget the scary name for a moment — it is just a compact grid of numbers with rules.',
    html: `
      <div class="welcome-section">
        <div class="welcome-heading">Two ways you will see matrices in this app</div>
        <p><strong>1) As a recipe for motion.</strong> In Monster Alignment, a 2×2 matrix tells the computer how to stretch, squash, rotate, or shear the picture. You adjust numbers and press Apply to see the effect.</p>
        <p><strong>2) As tables you combine.</strong> In the Drill, matrices A and B are grids of numbers. Your job is to build matrix C using a specific multiply-and-add pattern you will see on the next screens.</p>
      </div>
      <div class="welcome-section">
        <div class="welcome-heading">You do not need to memorize everything</div>
        <p>Use the on-page hints, formula panels, and the dot-product breakdown after you press Check. The goal is understanding in small steps, not speed on day one.</p>
      </div>`,
  },
  {
    icon: '🐾',
    title: 'Monster Alignment — the big idea',
    sub: 'Match the cyan dot to the red dashed target by choosing your transformation numbers.',
    html: `
      <div class="welcome-section">
        <div class="welcome-heading">Your goal each level</div>
        <p>On the canvas, the <strong>solid cyan dot</strong> shows where the monster’s key point is <em>now</em>. The <strong>red dashed circle</strong> shows where it needs to go.</p>
        <p>You type four numbers in a 2×2 grid (letters <strong>a, b, c, d</strong> are explained soon), then press <strong>Apply</strong> to run that transformation. When the dots line up well enough for the level, you advance.</p>
      </div>
      <div class="welcome-section">
        <div class="welcome-heading">Three buttons you will use often</div>
        <ul class="welcome-steps">
          <li><strong>Apply</strong> — Commit your numbers and see how the monster moves for real (counts as a try toward the level goal).</li>
          <li><strong>Preview</strong> — Peek at the effect without committing (great for experimenting safely).</li>
          <li><strong>Reset</strong> — Put the level back to its starting matrix so you can rethink from scratch.</li>
        </ul>
      </div>`,
  },
  {
    icon: '🗺️',
    title: 'Where to look on the Alignment screen',
    sub: 'Left column = picture and references; right column = level story and your matrix.',
    html: `
      <div class="welcome-section">
        <div class="welcome-heading">Left side (Monster Preview and helpers)</div>
        <ol class="welcome-steps">
          <li><strong>Monster Preview</strong> — The big canvas. Watch the dots while you change numbers.</li>
          <li><strong>Formula Reference</strong> — Short reminders of the math ideas behind the level.</li>
          <li><strong>Quick Experiment Pad</strong> — Preset buttons (like Scale or Rotate) that fill the matrix for you; you can still edit individual cells afterward.</li>
        </ol>
      </div>
      <div class="welcome-section">
        <div class="welcome-heading">Right side (your workspace)</div>
        <ol class="welcome-steps">
          <li><strong>Level title, description, objective</strong> — Read this first every level; it tells you what “good enough” means.</li>
          <li><strong>Explore Prompt</strong> — Extra guidance for experimenting.</li>
          <li><strong>Your Transformation Matrix</strong> — The four inputs in brackets. Press Enter in a cell as a shortcut to Apply.</li>
          <li><strong>Level Hint</strong> — A nudge when you are stuck; combine it with Preview.</li>
        </ol>
      </div>`,
  },
  {
    icon: '✏️',
    title: 'The four boxes: a, b, c, d (start simple)',
    sub: 'You learn faster by tweaking one value at a time and watching Preview.',
    html: `
      <div class="welcome-section">
        <div class="welcome-heading">Rough intuition (good enough to start)</div>
        <ul class="welcome-steps">
          <li><strong>a</strong> (top-left) and <strong>d</strong> (bottom-right) often control stretching, squashing, or flipping along the axes.</li>
          <li><strong>b</strong> (top-right) and <strong>c</strong> (bottom-left) tilt the grid — they “mix” x and y, which produces shear and more complex moves.</li>
        </ul>
        <p>The small <strong>det</strong> (determinant) readout under the matrix summarizes orientation and area scaling; the legend under the presets explains the sign in friendly language.</p>
      </div>
      <div class="welcome-callout">Try this: press a preset, hit Preview, then change only one number a little, Preview again, and narrate what changed in your own words. That narration is real learning.</div>`,
  },
  {
    icon: '⚡',
    title: 'Multiplication Drill — why it exists',
    sub: 'Train the exact pattern: one answer cell = one row of A paired with one column of B.',
    html: `
      <div class="welcome-section">
        <div class="welcome-heading">What you are computing</div>
        <p>The drill asks for <strong>C = A × B</strong> (read “A times B”). The order matters: <strong>A × B</strong> is generally <em>not</em> the same as <strong>B × A</strong>. Always copy the layout shown in the prompt.</p>
      </div>
      <div class="welcome-section">
        <div class="welcome-heading">The rule for every cell in C</div>
        <p>Pick <strong>one row from A</strong> and <strong>one column from B</strong> that correspond to the cell you are filling. Multiply the first number of the row with the first number of the column, second with second, and so on — then <strong>add</strong> all those products. That sum is your answer for that cell.</p>
        <p>Memory hook: <strong>row × column = one cell</strong>. If you ever feel lost, say that phrase out loud while pointing at the grids.</p>
      </div>`,
  },
  {
    icon: '🔢',
    title: 'Drill — what to click, in order',
    sub: 'A calm loop: generate → fill → Check → read feedback → fix or Reveal if truly stuck.',
    html: `
      <div class="welcome-section">
        <div class="welcome-heading">Before the numbers: difficulty row</div>
        <ul class="welcome-steps">
          <li><strong>Size</strong> — 2×2 is the gentlest; 3×3 adds more terms per cell.</li>
          <li><strong>Range</strong> — How large the random entries can be (bigger range = more arithmetic).</li>
          <li><strong>Timer</strong> — Optional pressure; leave Off while learning the pattern.</li>
        </ul>
      </div>
      <div class="welcome-section">
        <div class="welcome-heading">Your practice loop</div>
        <ol class="welcome-steps">
          <li>Click <strong>New Problem</strong> if the answer grid is empty or you want a fresh exercise.</li>
          <li>Fill the answer matrix <strong>one cell at a time</strong>, usually top-left to bottom-right, writing the mini-expressions on paper if that helps.</li>
          <li>Press <strong>Check</strong>. Correct cells lock in green; wrong ones highlight. The <strong>Dot Product Breakdown</strong> panel shows the intermediate products so you can see <em>where</em> a sign or addition slipped.</li>
          <li>Use <strong>Reveal</strong> only when you are totally stuck — then work backward to understand why each value appears.</li>
        </ol>
      </div>`,
  },
  {
    icon: '📚',
    title: 'Vocab Quiz — names for ideas you will earn',
    sub: 'It unlocks after Monster Alignment so words attach to things you have already seen.',
    html: `
      <div class="welcome-section">
        <div class="welcome-heading">Why the quiz tab shows a lock at first</div>
        <p>Vocabulary sticks when it labels <em>your own experience</em>. After you complete every alignment level, the quiz opens automatically so terms like shear, determinant, or inverse point at memories from play, not empty jargon.</p>
      </div>
      <div class="welcome-section">
        <div class="welcome-heading">How a quiz round works</div>
        <ol class="welcome-steps">
          <li>Read the prompt slowly; many wrong answers are from misreading one word.</li>
          <li>Click the choice that best fits. Feedback appears in the feedback strip under the choices.</li>
          <li>Press <strong>Next →</strong> when it unlocks. Use <strong>Restart</strong> for a clean session or <strong>Shuffle</strong> for a new ordering.</li>
          <li>Optional: use the <strong>Topic Filter</strong> chips on the right to focus one area at a time.</li>
        </ol>
      </div>`,
  },
  {
    icon: '🏅',
    title: 'The chips across the top (scores and streaks)',
    sub: 'They celebrate practice and improvement — not punishment for mistakes.',
    html: `
      <div class="welcome-section">
        <div class="welcome-heading">What those little badges mean (roughly)</div>
        <ul class="welcome-steps">
          <li><strong>Level / Score</strong> — Where you are in a track and how well the current session is going.</li>
          <li><strong>Best / High</strong> — Personal bests on this device for that activity.</li>
          <li><strong>Streak / Accuracy / Time</strong> — Extra feedback on consistency and pacing; ignore them at first if they distract you.</li>
        </ul>
        <p>If a timer stresses you out in the Drill, switch it to <strong>Off</strong> until the pattern feels automatic.</p>
      </div>`,
  },
  {
    icon: '⚠️',
    title: 'Mistakes almost every beginner makes',
    sub: 'If you only remember one screen from this tutorial, make it this one.',
    html: `
      <div class="welcome-section">
        <div class="welcome-heading">Save yourself hours of confusion</div>
        <ul class="welcome-steps">
          <li><strong>Wrong pairing</strong> — Do not multiply “across rows” randomly. Each answer cell needs the correct <strong>row of A</strong> with the correct <strong>column of B</strong>.</li>
          <li><strong>Swapping order</strong> — Treat <strong>A × B</strong> like a recipe: ingredients must go in the order written.</li>
          <li><strong>Sign errors</strong> — When negatives appear, write each product with its sign before adding. One dropped minus sign ruins the cell.</li>
          <li><strong>Skipping visuals</strong> — If multiplication feels abstract, spend ten minutes in Monster Alignment; your eyes will teach what symbols mean.</li>
        </ul>
      </div>`,
  },
  {
    icon: '🎓',
    title: 'You are ready — pick a starting place',
    sub: 'There is no wrong choice; you can switch tabs whenever you want.',
    html: `
      <div class="welcome-section">
        <div class="welcome-heading">Two gentle ways to begin</div>
        <p>If you like <strong>pictures and experimenting</strong>, start with <strong>Monster Alignment</strong>. If you like <strong>arithmetic puzzles</strong>, start with <strong>Multiplication Drill</strong> on 2×2, easy range, timer off.</p>
        <p>Use the buttons below to jump straight there, or close this window and click tabs yourself. Professor Meadow is proud of you for reading this far.</p>
      </div>`,
  },
];

function initWelcomeTutorial() {
  const modal = document.getElementById('welcome-modal');
  if (!modal) return;

  const closeBtn = document.getElementById('welcome-close');
  const hideNext = document.getElementById('welcome-hide-next');
  const stepIcon = document.getElementById('welcome-step-icon');
  const titleEl = document.getElementById('welcome-title');
  const subEl = document.getElementById('welcome-sub');
  const mainEl = document.getElementById('welcome-step-main');
  const progressLabel = document.getElementById('welcome-progress-label');
  const progressFill = document.getElementById('welcome-progress-fill');
  const backBtn = document.getElementById('welcome-back');
  const nextBtn = document.getElementById('welcome-next');
  const skipBtn = document.getElementById('welcome-skip-tutorial');
  const finalWrap = document.getElementById('welcome-final-only');
  const goAlignment = document.getElementById('welcome-go-alignment');
  const goDrill = document.getElementById('welcome-go-drill');
  const exploreBtn = document.getElementById('welcome-explore');

  let stepIndex = 0;
  const total = WELCOME_STEPS.length;
  const lastIndex = total - 1;

  const focusWelcomeControl = () => {
    if (!modal.classList.contains('on')) return;
    const onLast = stepIndex === lastIndex;
    if (onLast) goAlignment?.focus();
    else nextBtn?.focus();
  };

  const closeWelcome = () => {
    if (hideNext?.checked) {
      try {
        localStorage.setItem(WELCOME_STORAGE_KEY, '1');
      } catch {
        // Ignore localStorage failures in restricted environments.
      }
    }
    window.dispatchEvent(new CustomEvent('mma:welcome-overlay', { detail: { open: false } }));
    modal.classList.remove('on');
  };

  const renderWelcomeStep = () => {
    const step = WELCOME_STEPS[stepIndex];
    if (!step || !mainEl) return;

    if (stepIcon) stepIcon.textContent = step.icon;
    if (titleEl) titleEl.textContent = step.title;
    if (subEl) subEl.textContent = step.sub;
    mainEl.innerHTML = step.html;

    const n = stepIndex + 1;
    if (progressLabel) progressLabel.textContent = `Step ${n} of ${total}`;
    if (progressFill) progressFill.style.width = `${(n / total) * 100}%`;

    if (backBtn) backBtn.disabled = stepIndex === 0;

    const onLast = stepIndex === lastIndex;
    if (nextBtn) nextBtn.hidden = onLast;
    if (skipBtn) skipBtn.hidden = onLast;
    if (finalWrap) finalWrap.hidden = !onLast;

    focusWelcomeControl();
  };

  const goNext = () => {
    if (stepIndex < lastIndex) {
      stepIndex += 1;
      renderWelcomeStep();
    }
  };

  const goPrev = () => {
    if (stepIndex > 0) {
      stepIndex -= 1;
      renderWelcomeStep();
    }
  };

  closeBtn?.addEventListener('click', closeWelcome);
  skipBtn?.addEventListener('click', closeWelcome);
  exploreBtn?.addEventListener('click', closeWelcome);

  nextBtn?.addEventListener('click', goNext);
  backBtn?.addEventListener('click', goPrev);

  const openTabAndClose = (tab) => {
    if (tab) activateTab(tab);
    closeWelcome();
  };
  goAlignment?.addEventListener('click', () => openTabAndClose('alignment'));
  goDrill?.addEventListener('click', () => openTabAndClose('drill'));

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeWelcome();
  });

  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('on')) return;
    if (e.key === 'Escape') {
      closeWelcome();
      return;
    }
    if (e.key === 'ArrowRight' && stepIndex < lastIndex && document.activeElement?.tagName !== 'TEXTAREA') {
      e.preventDefault();
      goNext();
    }
    if (e.key === 'ArrowLeft' && stepIndex > 0) {
      e.preventDefault();
      goPrev();
    }
  });

  let seen = false;
  try {
    seen = localStorage.getItem(WELCOME_STORAGE_KEY) === '1';
  } catch {
    // Ignore localStorage failures and show tutorial by default.
  }

  if (!seen) {
    stepIndex = 0;
    renderWelcomeStep();
    setTimeout(() => {
      modal.classList.add('on');
      window.dispatchEvent(new CustomEvent('mma:welcome-overlay', { detail: { open: true } }));
      focusWelcomeControl();
    }, 250);
  }
}

function initQuizLockModal() {
  const modal = document.getElementById('quiz-lock-modal');
  if (!modal) return;

  const close = () => modal.classList.remove('on');
  document.getElementById('quiz-lock-close')?.addEventListener('click', close);
  document.getElementById('quiz-lock-go-alignment')?.addEventListener('click', () => {
    close();
    activateTab('alignment');
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
}

function initQuizUnlockGate() {
  setQuizUnlocked(false);
  window.addEventListener('mma:alignment-progress', (e) => {
    const detail = e.detail || {};
    setQuizUnlocked(!!detail.quizUnlocked);
  });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function boot() {
  await bridge.bootstrapPortalGameData();
  window.addEventListener('mma:score-bests-updated', refreshTrackHud);
  initQuizUnlockGate();
  initTabs();
  initAlignment();
  initDrill();
  initQuiz();
  initWelcomeTutorial();
  initQuizLockModal();
  refreshTrackHud();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void boot());
} else {
  void boot();
}