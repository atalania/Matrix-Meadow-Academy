// ============================================================================
// js/alignment-dom.js
// Tiny DOM helpers for the Monster Alignment tab (shared across modules).
// ============================================================================

export function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
