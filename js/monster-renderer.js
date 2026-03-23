// ============================================================================
// js/monster-renderer.js
// Monster image loading, silhouette extraction, and canvas rendering.
// ============================================================================

import { M2, seededRng } from './math-engine.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MONSTER_IMAGE_URL = './monster.png';
const IMG_HALF = 88;
const EMOJI = ['🐱','🐭','🐸','🦊','🐼','🐨','🦁','🐯','🐻','🦄'];
const COLORS = [
  ['#ff6b6b','#c0392b'], ['#48cae4','#0096c7'], ['#6bcb77','#2d6a4f'],
  ['#c77dff','#7b2d8b'], ['#ffd93d','#c8900a'], ['#f4a261','#e76f51'],
  ['#a8dadc','#457b9d'], ['#d4a5a5','#9d4e4e'],
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const monsterImg = new Image();
monsterImg.crossOrigin = 'anonymous';

let imgState = 'loading';
let silhouettePoints = null;
const loadCallbacks = [];

export function getImgState() { return imgState; }
export function getMonsterImageUrl() { return MONSTER_IMAGE_URL; }

/** Register a callback for when the image finishes loading (or fails). */
export function onMonsterReady(cb) {
  if (imgState !== 'loading') { cb(imgState); return; }
  loadCallbacks.push(cb);
}

// ---------------------------------------------------------------------------
// Silhouette extraction (Moore neighbourhood boundary tracing)
// ---------------------------------------------------------------------------

function extractSilhouette(img) {
  const SIZE = 128;
  const oc = document.createElement('canvas');
  oc.width = oc.height = SIZE;
  const octx = oc.getContext('2d', { willReadFrequently: true });
  octx.drawImage(img, 0, 0, SIZE, SIZE);
  const data = octx.getImageData(0, 0, SIZE, SIZE).data;

  const grid = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    grid[i] = data[i * 4 + 3] > 15 ? 1 : 0;
  }

  let sx = -1, sy = -1;
  outer: for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++)
      if (grid[y * SIZE + x]) { sx = x; sy = y; break outer; }
  if (sx < 0) return null;

  const DX = [1, 1, 0, -1, -1, -1, 0, 1];
  const DY = [0, 1, 1, 1, 0, -1, -1, -1];
  const boundary = [];
  let cx = sx, cy = sy, prevDir = 6;

  for (let step = 0; step < SIZE * SIZE; step++) {
    boundary.push([cx, cy]);
    const searchStart = (prevDir + 6) % 8;
    let moved = false;
    for (let i = 0; i < 8; i++) {
      const d = (searchStart + i) % 8;
      const nx = cx + DX[d], ny = cy + DY[d];
      if (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE && grid[ny * SIZE + nx]) {
        prevDir = d; cx = nx; cy = ny; moved = true; break;
      }
    }
    if (!moved) break;
    if (cx === sx && cy === sy && step > 2) break;
  }

  if (boundary.length < 6) return null;

  const skip = Math.max(1, Math.floor(boundary.length / 300));
  let pts = boundary.filter((_, i) => i % skip === 0);

  // Chaikin smoothing (3 passes)
  for (let pass = 0; pass < 3; pass++) {
    const s = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      s.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
      s.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    pts = s;
  }

  return pts.map(([px, py]) => ({
    x: (px / SIZE - 0.5) * IMG_HALF * 2,
    y: (py / SIZE - 0.5) * IMG_HALF * 2,
  }));
}

// ---------------------------------------------------------------------------
// Image loading
// ---------------------------------------------------------------------------

monsterImg.onload = () => {
  silhouettePoints = extractSilhouette(monsterImg);
  imgState = 'loaded';
  loadCallbacks.forEach(cb => cb('loaded'));
  loadCallbacks.length = 0;
};

monsterImg.onerror = () => {
  imgState = 'error';
  loadCallbacks.forEach(cb => cb('error'));
  loadCallbacks.length = 0;
};

monsterImg.src = MONSTER_IMAGE_URL;

// ---------------------------------------------------------------------------
// Canvas drawing
// ---------------------------------------------------------------------------

/** Draw the PNG-based monster with a transformation matrix */
export function drawMonsterPNG(ctx, M, cx, cy, isTarget) {
  if (imgState !== 'loaded') return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(M.a, -M.c, -M.b, M.d, 0, 0);
  const h = IMG_HALF * 2;

  if (isTarget) {
    ctx.globalAlpha = 0.32;
    ctx.drawImage(monsterImg, -IMG_HALF, -IMG_HALF, h, h);
    ctx.globalAlpha = 0.9;
    ctx.setLineDash([9, 6]);
    ctx.strokeStyle = '#e03030';
    ctx.lineWidth = 2.5;

    if (silhouettePoints && silhouettePoints.length > 4) {
      ctx.beginPath();
      ctx.moveTo(silhouettePoints[0].x, silhouettePoints[0].y);
      for (let i = 1; i < silhouettePoints.length; i++)
        ctx.lineTo(silhouettePoints[i].x, silhouettePoints[i].y);
      ctx.closePath();
    } else {
      ctx.rect(-IMG_HALF, -IMG_HALF, h, h);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.globalAlpha = 1;
    ctx.drawImage(monsterImg, -IMG_HALF, -IMG_HALF, h, h);
  }
  ctx.restore();
}

/** Draw procedural fallback monster (used when PNG fails to load) */
export function drawFallbackMonster(ctx, M, cx, cy, seed, isTarget) {
  const r = seededRng(seed);
  const color = COLORS[Math.floor(r() * COLORS.length)];

  const bodyPts = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rad = 62 * (1 + 0.14 * Math.sin(a * 3) + 0.07 * Math.cos(a * 7));
    bodyPts.push(M.mv({ x: Math.cos(a) * rad, y: Math.sin(a) * rad }));
  }

  const earL = [[-38, -50], [-18, -75], [-56, -68]].map(([x, y]) => M.mv({ x, y }));
  const earR = [[38, -50], [18, -75], [56, -68]].map(([x, y]) => M.mv({ x, y }));

  const drawPoly = (pts, fill, stroke, lw = 2.5) => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, -pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, -pts[i].y);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke();
  };

  ctx.save();
  ctx.globalAlpha = isTarget ? 0.55 : 1;
  ctx.translate(cx, cy);
  if (isTarget) ctx.setLineDash([7, 5]);

  const fill = isTarget ? 'transparent' : color[0] + '99';
  const strokeC = isTarget ? '#ff6b6b' : color[1];

  drawPoly(earL, isTarget ? 'transparent' : color[0], strokeC);
  drawPoly(earR, isTarget ? 'transparent' : color[0], strokeC);
  drawPoly(bodyPts, fill, strokeC, 3);

  ctx.setLineDash([]);

  // Face (only for current, not target)
  if (!isTarget) {
    [[-18, 12], [18, 12]].forEach(([ex, ey]) => {
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.ellipse(ex, -ey, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1e2a3a';
      ctx.beginPath(); ctx.arc(ex + 2, -ey + 2, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(ex + 4, -ey + 4, 2, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = color[1];
    ctx.beginPath(); ctx.arc(0, 2, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = color[1]; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 8, 12, 0.2, Math.PI - 0.2); ctx.stroke();
  }

  ctx.restore();
}

/** Draw the background grid */
export function drawGrid(ctx, W, H) {
  const cx = W / 2, cy = H / 2, step = 40;
  ctx.strokeStyle = '#deeef4'; ctx.lineWidth = 1;
  for (let x = cx % step; x < W; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = cy % step; y < H; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.strokeStyle = '#9ecfdc'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
  ctx.fillStyle = '#48cae4';
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
}