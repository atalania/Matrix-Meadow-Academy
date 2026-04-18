import { describe, it, expect } from 'vitest';
import {
  drillRangeNumber,
  parseDrillIntegerCell,
  gradeDrillMatrices,
} from '../../js/drill-logic.js';

describe('drillRangeNumber', () => {
  it('maps difficulty keys to entry magnitudes', () => {
    expect(drillRangeNumber('easy')).toBe(3);
    expect(drillRangeNumber('med')).toBe(6);
    expect(drillRangeNumber('hard')).toBe(9);
  });
});

describe('parseDrillIntegerCell', () => {
  it('accepts integer strings', () => {
    expect(parseDrillIntegerCell('  -12  ')).toBe(-12);
    expect(parseDrillIntegerCell('0')).toBe(0);
  });

  it('rejects empty, decimals, and junk', () => {
    expect(parseDrillIntegerCell('')).toBeNull();
    expect(parseDrillIntegerCell('  ')).toBeNull();
    expect(parseDrillIntegerCell('1.5')).toBeNull();
    expect(parseDrillIntegerCell('1e3')).toBeNull();
    expect(parseDrillIntegerCell('x')).toBeNull();
  });
});

describe('gradeDrillMatrices', () => {
  it('flags partial credit and wrong cell labels', () => {
    const expected = [[1, 2], [3, 4]];
    const user = [[1, 9], [3, 4]];
    const g = gradeDrillMatrices(user, expected);
    expect(g.correct).toBe(3);
    expect(g.total).toBe(4);
    expect(g.allOk).toBe(false);
    expect(g.wrongEntries).toEqual(['C[0][1]: got 9, expected 2']);
  });

  it('detects full grid match', () => {
    const M = [[2, 0], [0, 2]];
    const g = gradeDrillMatrices(M, M);
    expect(g.allOk).toBe(true);
    expect(g.wrongEntries).toHaveLength(0);
  });
});
