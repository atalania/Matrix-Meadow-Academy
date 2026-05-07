// ============================================================================
// js/main.js
// Entry point. Initializes all game modules and tab switching.
// ============================================================================

import { initAlignment } from './alignment-game.js';
import { initDrill } from './drill-game.js';
import { initQuiz } from './quiz-game.js';

// ---------------------------------------------------------------------------
// Tab switching
// ---------------------------------------------------------------------------

let drillInitialized = false;
const WELCOME_STORAGE_KEY = 'mma_welcome_seen_v1';
let quizUnlocked = false;

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

function initWelcomeTutorial() {
  const modal = document.getElementById('welcome-modal');
  if (!modal) return;

  const startBtn = document.getElementById('welcome-start');
  const closeBtn = document.getElementById('welcome-close');
  const hideNext = document.getElementById('welcome-hide-next');

  const closeWelcome = () => {
    if (hideNext?.checked) {
      try {
        localStorage.setItem(WELCOME_STORAGE_KEY, '1');
      } catch {
        // Ignore localStorage failures in restricted environments.
      }
    }
    modal.classList.remove('on');
  };

  closeBtn?.addEventListener('click', closeWelcome);
  startBtn?.addEventListener('click', closeWelcome);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeWelcome();
  });

  document.querySelectorAll('.welcome-tab-jump').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.goTab;
      if (tab) activateTab(tab);
      closeWelcome();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('on')) {
      closeWelcome();
    }
  });

  let seen = false;
  try {
    seen = localStorage.getItem(WELCOME_STORAGE_KEY) === '1';
  } catch {
    // Ignore localStorage failures and show tutorial by default.
  }

  if (!seen) {
    setTimeout(() => modal.classList.add('on'), 250);
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

function boot() {
  initQuizUnlockGate();
  initTabs();
  initAlignment();
  initDrill();
  initQuiz();
  initWelcomeTutorial();
  initQuizLockModal();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}