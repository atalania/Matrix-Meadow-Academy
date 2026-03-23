// ============================================================================
// js/ui.js
// Shared UI utilities — feedback, confetti, DOM helpers.
// ============================================================================

/** Update a feedback element with type, icon, and message */
export function setFeedback(elementId, type, icon, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.className = 'fb ' + type;
  el.innerHTML = `<span class="fb-ico">${icon}</span><span>${message}</span>`;
}

/** Parse a numeric input value, returning null if empty or invalid */
export function parseInputValue(id) {
  const raw = document.getElementById(id)?.value.trim();
  if (!raw) return null;
  const num = parseFloat(raw);
  return Number.isNaN(num) ? null : num;
}

/** Format a number for display (clean integers, limited decimals) */
export function fmt(n) {
  return Math.abs(n - Math.round(n)) < 0.0001
    ? Math.round(n).toString()
    : parseFloat(n.toFixed(4)).toString();
}

// ---------------------------------------------------------------------------
// Confetti
// ---------------------------------------------------------------------------

const CONF_COLORS = ['#ff6b6b','#ffd93d','#6bcb77','#48cae4','#c77dff','#f4a261'];
let confPieces = [];
let confRAF = null;

export function spawnConfetti() {
  clearConfetti(); // Prevent stacking — fix for leaked confetti bug

  for (let i = 0; i < 55; i++) {
    const el = document.createElement('div');
    el.className = 'conf';
    const sz = 8 + Math.random() * 9;
    Object.assign(el.style, {
      width: sz + 'px',
      height: sz + 'px',
      background: CONF_COLORS[Math.floor(Math.random() * CONF_COLORS.length)],
      left: Math.random() * 100 + 'vw',
      top: '-20px',
      borderRadius: Math.random() > 0.5 ? '50%' : '3px',
    });
    document.body.appendChild(el);
    confPieces.push({ el, vy: 2 + Math.random() * 4, vx: (Math.random() - 0.5) * 3, g: 0.12, y: -20 });
  }
  animateConfetti();
}

function animateConfetti() {
  let allDone = true;
  confPieces.forEach(p => {
    p.vy += p.g;
    p.y += p.vy;
    p.el.style.top = p.y + 'px';
    p.el.style.left = (parseFloat(p.el.style.left) + p.vx) + 'px';
    if (p.y <= window.innerHeight + 60) allDone = false;
  });
  if (allDone) { clearConfetti(); return; }
  confRAF = requestAnimationFrame(animateConfetti);
}

export function clearConfetti() {
  if (confRAF) cancelAnimationFrame(confRAF);
  confRAF = null;
  confPieces.forEach(p => p.el.remove());
  confPieces = [];
}

// ---------------------------------------------------------------------------
// Formatting helpers for drill
// ---------------------------------------------------------------------------

/** Render an NxN matrix as an HTML table */
export function matrixToTable(M) {
  let h = '<table class="dm">';
  for (let r = 0; r < M.length; r++) {
    h += '<tr>';
    for (let c = 0; c < M[r].length; c++) h += `<td>${M[r][c]}</td>`;
    h += '</tr>';
  }
  return h + '</table>';
}