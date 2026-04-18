// ============================================================================
// js/drill-logic.js
// Pure drill helpers — range bounds, cell parsing, grading (no DOM).
// ============================================================================

export function drillRangeNumber(range) {
  if (range === 'easy') return 3;
  if (range === 'med') return 6;
  return 9;
}

/** Parse one grid cell; null if empty or not a plain integer string */
export function parseDrillIntegerCell(raw) {
  const t = String(raw).trim();
  if (t === '' || !/^-?\d+$/.test(t)) return null;
  return Number(t);
}

export function gradeDrillMatrices(user, expected) {
  const n = expected.length;
  let correct = 0;
  const wrongEntries = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (user[r][c] === expected[r][c]) correct++;
      else wrongEntries.push(`C[${r}][${c}]: got ${user[r][c]}, expected ${expected[r][c]}`);
    }
  }
  const total = n * n;
  return { correct, total, allOk: correct === total, wrongEntries };
}
