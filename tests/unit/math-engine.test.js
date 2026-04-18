import { describe, it, expect, vi, afterEach } from 'vitest';
import { M2, lerpMatrix, seededRng, multiplyMatrices, shuffle } from '../../js/math-engine.js';

describe('M2', () => {
  it('mv applies 2×2 to vector', () => {
    const M = new M2(2, 0, 0, 3);
    expect(M.mv({ x: 1, y: 1 })).toEqual({ x: 2, y: 3 });
  });

  it('mm multiplies matrices', () => {
    const A = new M2(1, 2, 0, 1);
    const B = new M2(2, 0, 0, 1);
    const R = A.mm(B);
    expect(R.a).toBe(2);
    expect(R.b).toBe(2);
    expect(R.c).toBe(0);
    expect(R.d).toBe(1);
  });

  it('det matches formula', () => {
    expect(new M2(1, 2, 3, 4).det()).toBe(-2);
  });

  it('inv returns null when singular', () => {
    expect(new M2(1, 2, 2, 4).inv()).toBeNull();
  });

  it('inv undoes diagonal scale', () => {
    const M = new M2(4, 0, 0, 2);
    const I = M.mm(M.inv());
    expect(I.eq(M2.I(), 1e-9)).toBe(true);
  });

  it('eq respects tolerance', () => {
    const A = new M2(1, 0, 0, 1);
    const B = new M2(1.005, 0, 0, 1);
    expect(A.eq(B, 0.01)).toBe(true);
    expect(A.eq(B, 0.001)).toBe(false);
  });
});

describe('lerpMatrix', () => {
  it('matches endpoints', () => {
    const A = new M2(0, 0, 0, 0);
    const B = new M2(1, 2, 3, 4);
    expect(lerpMatrix(A, B, 0).eq(A, 1e-9)).toBe(true);
    expect(lerpMatrix(A, B, 1).eq(B, 1e-9)).toBe(true);
  });
});

describe('seededRng', () => {
  it('is deterministic for the same seed', () => {
    const a = seededRng(42);
    const b = seededRng(42);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });
});

describe('multiplyMatrices', () => {
  it('multiplies 2×2 example', () => {
    const A = [[1, 2], [3, 4]];
    const B = [[5, 6], [7, 8]];
    expect(multiplyMatrices(A, B)).toEqual([[19, 22], [43, 50]]);
  });
});

describe('shuffle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the same multiset and length', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.31);
    const arr = [1, 2, 3, 4];
    shuffle(arr);
    expect(arr).toHaveLength(4);
    expect([...arr].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });
});
