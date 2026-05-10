// ============================================================================
// js/welcome-tutorial.js
// Multi-step welcome modal wiring (content lives in welcome-steps.js).
// ============================================================================

import { WELCOME_STEPS } from './welcome-steps.js';

const WELCOME_STORAGE_KEY = 'mma_welcome_seen_v1';

/**
 * @param {object} deps
 * @param {(tabName: string) => void} deps.activateTab
 * @param {() => void} deps.notifyEmbedLayout
 */
export function initWelcomeTutorial(deps) {
  const { activateTab, notifyEmbedLayout } = deps;
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
    notifyEmbedLayout();
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
    notifyEmbedLayout();
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
      notifyEmbedLayout();
    }, 250);
  }
}
