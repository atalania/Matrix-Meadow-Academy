// ============================================================================
// js/drill-dom.js
// Tiny DOM helper for the Drill tab.
// ============================================================================

export function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}
