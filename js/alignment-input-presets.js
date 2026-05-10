// ============================================================================
// js/alignment-input-presets.js
// Matrix cell inputs, live determinant, and experiment presets.
// ============================================================================

import { M2 } from './math-engine.js';
import { setFeedback, parseInputValue } from './ui.js';
import { state } from './alignment-state.js';
import { isAnimating, triggerAnimation } from './alignment-render.js';

export function getInputMatrix() {
  const vals = ['i00', 'i01', 'i10', 'i11'].map(parseInputValue);
  if (vals.some(v => v === null)) return null;
  return new M2(vals[0], vals[1], vals[2], vals[3]);
}

export function updateLiveDet() {
  const M = getInputMatrix();
  const el = document.getElementById('live-det');
  if (el) el.textContent = M ? M.det().toFixed(3) : '—';
}

export function setMatrixInputs(a, b, c, d) {
  const values = [a, b, c, d];
  ['i00', 'i01', 'i10', 'i11'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = String(values[i]);
  });
  updateLiveDet();
}

export function updatePresetAvailability() {
  const buttons = document.querySelectorAll('.preset-btn[data-req-level]');
  buttons.forEach((btn) => {
    const requiredLevel = Number(btn.getAttribute('data-req-level') || '0');
    const requiredIdx = requiredLevel - 1;
    const unlocked = Number.isInteger(requiredIdx) && requiredIdx >= 0 && state.done.includes(requiredIdx);
    btn.dataset.locked = unlocked ? 'false' : 'true';
    btn.classList.toggle('is-locked', !unlocked);
    btn.setAttribute('aria-disabled', unlocked ? 'false' : 'true');
    btn.title = unlocked
      ? 'Unlocked preset'
      : `Unlock by completing Level ${requiredLevel}`;
  });
}

export function applyPreset(kind) {
  if (isAnimating()) return;

  const btn = document.querySelector(`.preset-btn[data-preset="${kind}"]`);
  if (btn?.dataset.locked === 'true') {
    const requiredLevel = btn.getAttribute('data-req-level') || '?';
    setFeedback('afb', 'err', '🔒', `Unlock Level ${requiredLevel} first to use this preset.`);
    return;
  }

  const presets = {
    scale2: [2, 0, 0, 2],
    shear: [1, 1, 0, 1],
    rotate90: [0, -1, 1, 0],
    reflectX: [1, 0, 0, -1],
  };
  const picked = presets[kind];
  if (!picked) return;
  setMatrixInputs(picked[0], picked[1], picked[2], picked[3]);
  const M = new M2(picked[0], picked[1], picked[2], picked[3]);
  triggerAnimation(M, null);
  setFeedback('afb', 'info', '🧪', 'Preset previewed and applied to canvas. Tweak an entry to explore variations.');
}
