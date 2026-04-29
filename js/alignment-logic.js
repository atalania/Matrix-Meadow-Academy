// ============================================================================
// js/alignment-logic.js
// Pure answer validation and mistake tagging (no DOM).
// ============================================================================

import { M2 } from './math-engine.js';

/** Try to identify what kind of mistake the student made */
export function diagnoseMistake(M, lv) {
  // Det-target levels (e.g. "any matrix with det = 6") aren't validated by
  // matrix equality, so the per-entry comparisons against `lv.target` would
  // give nonsensical labels. Diagnose them based on the determinant instead.
  if (lv.validate === 'det6') {
    const d = M.det();
    if (Math.abs(d) < 0.05) return 'det_zero';
    if (Math.sign(d) !== Math.sign(6)) return 'det_wrong_sign';
    return 'det_value_off';
  }

  const T = lv.target;

  // Diagonal swap: ALL four entries must look like a transpose of just the
  // diagonal (a↔d) with the off-diagonal entries already matching the target.
  if (Math.abs(M.a - T.d) < 0.01 && Math.abs(M.d - T.a) < 0.01 &&
      Math.abs(M.b - T.b) < 0.01 && Math.abs(M.c - T.c) < 0.01) {
    return 'diagonal_swap';
  }

  const playerVals = [M.a, M.b, M.c, M.d].sort((x, y) => x - y);
  const targetVals = [T.a, T.b, T.c, T.d].sort((x, y) => x - y);
  if (playerVals.every((v, i) => Math.abs(v - targetVals[i]) < 0.01)) return 'element_placed_wrong_position';

  if (Math.abs(M.a - T.a) < 0.01 && Math.abs(M.d - T.d) < 0.01) return 'wrong_off_diagonal';

  if (M.eq(new M2(-T.a, -T.b, -T.c, -T.d), 0.01) ||
      M.eq(new M2(T.a, -T.b, -T.c, T.d), 0.01)) return 'sign_error';

  if (Math.abs(M.a - T.a) < 1 && Math.abs(M.b - T.b) < 1 &&
      Math.abs(M.c - T.c) < 1 && Math.abs(M.d - T.d) < 1) return 'arithmetic_error';

  return 'general_mistake';
}

export function checkAnswer(M, lv) {
  if (lv.validate === 'det6') return Math.abs(M.det() - 6) < 0.05;
  return M.eq(lv.target, 0.01);
}
