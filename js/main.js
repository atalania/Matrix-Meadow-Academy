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

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.tab-page').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab)?.classList.add('active');

      // Lazy-init drill on first visit
      if (btn.dataset.tab === 'drill' && !drillInitialized) {
        drillInitialized = true;
        window.newDrill?.();
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function boot() {
  initTabs();
  initAlignment();
  initDrill();
  initQuiz();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}