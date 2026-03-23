// ============================================================================
// js/math-engine.js
// 2×2 matrix class and math utilities. Zero DOM, zero side effects.
// ============================================================================

export class M2 {
  constructor(a, b, c, d) {
    this.a = a; this.b = b;
    this.c = c; this.d = d;
  }

  /** Multiply matrix × vector */
  mv(v) {
    return { x: this.a * v.x + this.b * v.y, y: this.c * v.x + this.d * v.y };
  }

  /** Multiply matrix × matrix */
  mm(N) {
    return new M2(
      this.a * N.a + this.b * N.c, this.a * N.b + this.b * N.d,
      this.c * N.a + this.d * N.c, this.c * N.b + this.d * N.d
    );
  }

  det() { return this.a * this.d - this.b * this.c; }

  inv() {
    const d = this.det();
    if (Math.abs(d) < 1e-10) return null;
    return new M2(this.d / d, -this.b / d, -this.c / d, this.a / d);
  }

  eq(N, tol = 0.01) {
    return Math.abs(this.a - N.a) < tol && Math.abs(this.b - N.b) < tol
        && Math.abs(this.c - N.c) < tol && Math.abs(this.d - N.d) < tol;
  }

  static I() { return new M2(1, 0, 0, 1); }
}

/** Linear interpolation between two matrices with ease-in-out */
export function lerpMatrix(A, B, t) {
  const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  return new M2(
    A.a + (B.a - A.a) * e, A.b + (B.b - A.b) * e,
    A.c + (B.c - A.c) * e, A.d + (B.d - A.d) * e
  );
}

/** Seeded RNG for deterministic monster generation */
export function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

/** Random integer in [min, max] */
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Create NxN matrix with random entries in [-range, range] */
export function randomMatrix(n, range) {
  const M = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) row.push(randInt(-range, range));
    M.push(row);
  }
  return M;
}

/** Multiply two NxN matrices (arrays of arrays) */
export function multiplyMatrices(A, B) {
  const n = A.length;
  const C = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < n; k++)
        C[i][j] += A[i][k] * B[k][j];
  return C;
}

/** Shuffle array in place (Fisher-Yates) */
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}