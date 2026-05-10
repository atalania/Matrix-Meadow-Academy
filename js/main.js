// ============================================================================
// js/main.js
// Entry point. Initializes all game modules and tab switching.
// ============================================================================

import { bridge } from './assistant-bridge.js';
import { initAlignment } from './alignment-game.js';
import { initDrill } from './drill-game.js';
import { initQuiz } from './quiz-game.js';
import { initEmbedLayout, scheduleEmbedHeightPost } from './embed-layout.js';
import { initIframeLayout } from './iframe-layout.js';
import { initWelcomeTutorial } from './welcome-tutorial.js';

let drillInitialized = false;
let quizUnlocked = false;

function notifyEmbedLayout() {
  window.dispatchEvent(new CustomEvent('mma:embed-layout-maybe-changed'));
  scheduleEmbedHeightPost();
}

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
    notifyEmbedLayout();
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
  notifyEmbedLayout();
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

function initQuizLockModal() {
  const modal = document.getElementById('quiz-lock-modal');
  if (!modal) return;

  const close = () => {
    modal.classList.remove('on');
    notifyEmbedLayout();
  };
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

async function boot() {
  await bridge.bootstrapPortalGameData();
  window.addEventListener('mma:score-bests-updated', refreshTrackHud);
  initQuizUnlockGate();
  initTabs();
  initEmbedLayout();
  initAlignment();
  initIframeLayout();
  initDrill();
  initQuiz();
  initWelcomeTutorial({ activateTab, notifyEmbedLayout });
  initQuizLockModal();
  refreshTrackHud();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void boot());
} else {
  void boot();
}
