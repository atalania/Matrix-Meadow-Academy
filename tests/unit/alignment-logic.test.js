import { describe, it, expect } from 'vitest';
import { M2 } from '../../js/math-engine.js';
import { buildLevels } from '../../js/levels.js';
import { checkAnswer, diagnoseMistake } from '../../js/alignment-logic.js';

describe('checkAnswer', () => {
  const levels = buildLevels();

  it('accepts exact target within tolerance', () => {
    const lv = levels[0];
    expect(checkAnswer(lv.target, lv)).toBe(true);
  });

  it('rejects wrong matrix for exact levels', () => {
    const lv = levels[0];
    expect(checkAnswer(new M2(1, 0, 0, 1), lv)).toBe(false);
  });

  it('accepts any diagonal matrix with det 6 for det6 level', () => {
    const lv = levels.find((l) => l.validate === 'det6');
    expect(lv).toBeDefined();
    expect(checkAnswer(new M2(6, 0, 0, 1), lv)).toBe(true);
    expect(checkAnswer(new M2(2, 0, 0, 3), lv)).toBe(true);
    expect(checkAnswer(new M2(1, 0, 0, 1), lv)).toBe(false);
  });
});

describe('diagnoseMistake', () => {
  const levels = buildLevels();
  const lv1 = levels[0];
  const lv2 = levels[1];
  const detLevel = levels.find((l) => l.validate === 'det6');

  it('tags permutation of correct entries', () => {
    const M = new M2(0, 2, 2, 0);
    expect(diagnoseMistake(M, lv1)).toBe('element_placed_wrong_position');
  });

  it('tags wrong off-diagonal when diagonal matches', () => {
    const T = lv2.target;
    const M = new M2(T.a, 9, 9, T.d);
    expect(diagnoseMistake(M, lv2)).toBe('wrong_off_diagonal');
  });

  it('falls back to general_mistake when far off', () => {
    expect(diagnoseMistake(new M2(50, 50, 50, 50), lv1)).toBe('general_mistake');
  });

  it('tags diagonal_swap only when off-diagonals also match', () => {
    // lv2.target = [3, 0; 0, 0.5] — swap diagonal but keep off-diag at 0.
    const swap = new M2(0.5, 0, 0, 3);
    expect(diagnoseMistake(swap, lv2)).toBe('diagonal_swap');
    // Off-diagonals don't match — should NOT be tagged diagonal_swap.
    const swapWithOffdiag = new M2(0.5, 9, 9, 3);
    expect(diagnoseMistake(swapWithOffdiag, lv2)).not.toBe('diagonal_swap');
  });

  it('uses determinant-based tags for det6 levels', () => {
    expect(detLevel).toBeDefined();
    expect(diagnoseMistake(new M2(0, 0, 0, 0), detLevel)).toBe('det_zero');
    expect(diagnoseMistake(new M2(-3, 0, 0, 2), detLevel)).toBe('det_wrong_sign');
    expect(diagnoseMistake(new M2(2, 0, 0, 2), detLevel)).toBe('det_value_off');
  });
});
