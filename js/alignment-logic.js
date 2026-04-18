// ============================================================================
// js/alignment-logic.js
// Pure answer validation and mistake tagging (no DOM).
// ============================================================================

import { M2 } from './math-engine.js';

/** Try to identify what kind of mistake the student made */
export function diagnoseMistake(M, lv) {
  const T = lv.target;

  if (Math.abs(M.a - T.d) < 0.01 && Math.abs(M.d - T.a) < 0.01) return 'row_col_swap';

  const playerVals = [M.a, M.b, M.c, M.d].sort();
  const targetVals = [T.a, T.b, T.c, T.d].sort();
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
