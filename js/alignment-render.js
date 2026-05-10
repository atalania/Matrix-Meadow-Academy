// ============================================================================
// js/alignment-render.js
// Canvas sizing, matrix animation, and per-frame monster draw.
// ============================================================================

import { lerpMatrix } from './math-engine.js';
import { drawMonsterPNG, drawFallbackMonster, drawGrid, getImgState } from './monster-renderer.js';
import { state } from './alignment-state.js';

let canvas;
let ctx;

export function getAlignmentCanvas() {
  return canvas;
}

export function setAlignmentCanvas(c, context2d) {
  canvas = c;
  ctx = context2d;
}

export function resizeCanvas() {
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

export function isAnimating() {
  return state.animT < 1;
}

export function setActionButtonsDisabled(disabled) {
  ['btn-apply', 'btn-preview', 'btn-reset'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = disabled;
  });
}

export function triggerAnimation(to, cb) {
  state.animFrom = state.curMat;
  state.animTo = to;
  state.animT = 0;
  state.animStart = performance.now();
  state.animCB = cb;
  setActionButtonsDisabled(true);
}

export function render(ts) {
  if (!canvas || !ctx) { requestAnimationFrame(render); return; }

  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width / dpr, H = canvas.height / dpr;
  const cx = W / 2, cy = H / 2;
  ctx.clearRect(0, 0, W, H);
  drawGrid(ctx, W, H);

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
