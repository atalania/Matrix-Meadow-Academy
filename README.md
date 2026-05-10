# Matrix Meadow Academy

Browser-based practice for **2×2 linear transformations** and **matrix multiplication**, built with vanilla JavaScript and Vite. Transform monsters on a canvas, drill hand multiplication, and review vocabulary—with optional AI tutor feedback when a backend proxy is available.

## What’s inside

### Monster Alignment

Nine progressive levels: uniform and non-uniform scaling, identity, shear, rotation, composition, inverse, determinant intuition, and reflection. Enter a 2×2 matrix, preview or apply it, and match the target shape. Each level includes short teaching text, a formula reference, scoring, streaks, and (when configured) **Professor Meadow**—a short reflective prompt after you clear a level.

### Multiplication Drill

Practice **C = A × B** with **2×2** or **3×3** matrices. Adjust number range, optional **45s / 90s** timers, instant check, reveal, and a dot-product breakdown for feedback.

### Vocab Quiz

Multiple-choice **linear algebra vocabulary** with topic filters, shuffle, and session stats.

## Tech stack

- **Vite** 6 (dev server, build)
- **ES modules** — no framework
- **Canvas** for monster rendering
- Optional **`/api/ai/openai`** proxy for the in-game tutor (see below)

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### Production build

```bash
npm run build
npm run preview
```

### AI tutor (optional)

The tutor calls `POST /api/ai/openai`. In development, [vite.config.js](vite.config.js) proxies `/api` to `http://localhost:3000`. Run whatever service exposes that route, or embed the game in an environment that already provides it; otherwise you can still play—use **Skip & continue** after levels.

### Deploy base path

The build uses `base: /staticGames/matrix-meadow/` (from [data/game.json](data/game.json)) for portal-style hosting. For GitHub Pages or a site root, change `base` in `vite.config.js` (e.g. `'/'` or `'/your-repo-name/'`).

### Portal / mobile iframe

Hosting on `/games/matrix-meadow` uses a **fixed-height iframe**; this repo follows the STEM Games embed conventions (`html`/`body` fill, **`#app`** scrolls, container-based canvas resize). See **[MOBILE_EMBED_GAME_GUIDE.md](MOBILE_EMBED_GAME_GUIDE.md)** for assumptions, `embedHeight`, and verification. Parent pages can listen for `postMessage` payloads `{ source: 'matrix-meadow-academy', type: 'mma-embed-content-height', height }` (narrow / touch embeds only) to adjust iframe height.

#### Portal / mobile iframe checklist

- [ ] Viewport meta: `width=device-width`, `initial-scale=1`, `viewport-fit=cover`, `maximum-scale=5`
- [ ] Root layout: `html, body { height: 100%; }`, `#app` with `height: 100%` and `overflow-y: auto` — no `100vh` as the only scroll-surface height inside the embed
- [ ] Resize: `resize` + `visualViewport` + `mma:iframe-layout` → `resizeCanvas()` from **#canvas-wrap** width (`js/iframe-layout.js`, `js/alignment-game.js`)
- [ ] Touch: ≥ 44×44px tap targets on coarse pointers; `touch-action: manipulation` on `body` (portal baseline)
- [ ] Safe area: critical UI clears iOS home indicator (`env(safe-area-inset-bottom)` on `#app` / modals)
- [ ] Test: `/games/matrix-meadow` on a phone (portrait + landscape) and “Open in new tab”
- [ ] [data/game.json](data/game.json) **`embedHeight`** matches the minimum playable height you tested

## Project layout

| Path | Role |
|------|------|
| `index.html` | UI shell, tabs, tutor modal |
| `styles.css` | Layout and theme |
| `js/main.js` | Bootstraps modules and tabs |
| `js/alignment-game.js` | Monster alignment flow |
| `js/drill-game.js` | Multiplication drill |
| `js/quiz-game.js` | Vocab quiz |
| `js/levels.js` | Level definitions |
| `js/math-engine.js` | Matrix math |
| `js/monster-renderer.js` | Canvas drawing |
| `js/tutor.js` | Tutor API client |
| `js/assistant-bridge.js` | `postMessage` to parent frame (portal integration) |
| `js/embed-layout.js` | Optional iframe height `postMessage` (mobile / coarse pointer) |
| `js/iframe-layout.js` | `load` / `resize` / `visualViewport` → `mma:iframe-layout` for canvas |
| `data/game.json` | Game id, **`embedHeight`**, metadata for portal embeds |
| `MOBILE_EMBED_GAME_GUIDE.md` | Portal iframe sizing assumptions and checklist |

### Portal `data_json` (leaderboards)

The iframe requests existing persisted JSON from the parent, **deep-merges** score fields, then pushes the merged object on each score flush as **`STEM_PORTAL_GAME_DATA`** (`dataJson` / `gameData`, plus root `score` / `highScore` for the Monster Alignment track and `scoreSource` for which tab last wrote stats). This is **not** sent as `ASSISTANT_GAME_EVENT` so hub web assistants are not fed raw leaderboard JSON (they were narrating points instead of math). Request (child → parent):

`{ type: 'PORTAL_GAME_DATA_REQUEST', gameId: 'matrix-meadow', requestId: string }`

The parent may push or reply with any of: `PORTAL_GAME_DATA`, `PORTAL_GAME_DATA_RESPONSE`, or `STEM_PORTAL_GAME_DATA`, carrying `dataJson` (or `gameData`, or `payload.dataJson`). Incoming objects are merged so unknown keys are preserved.

**Numeric fields written by this game (higher is better):**

| Track | Meaning | Paths set on each flush |
|-------|---------|---------------------------|
| **Overall** (Monster Alignment) | Rolling best and current alignment score | `highScore`, `score`, `matrixMeadow.highScore`, `matrixMeadow.score` |
| **Multiplication drill** | Rolling best and current drill tab score | `matrixMeadow.multiplicationDrill.highScore`, `matrixMeadow.multiplicationDrill.score`, mirrors `matrixMeadow.drill.*`, root `multiplicationDrillHighScore`, `drillHighScore` |
| **Vocabulary quiz** | Rolling best and current quiz tab score | `matrixMeadow.vocabularyQuiz.highScore`, `matrixMeadow.vocabularyQuiz.score`, mirrors `matrixMeadow.vocabQuiz.*`, root `vocabularyQuizHighScore`, `vocabQuizHighScore` |

Also set each time: `lastPlayedAt` (ISO string), and `stats` (object from the module that triggered the last score flush).

Overall root scores **do not** change when only the drill or quiz tab updates; those modes only refresh their own nested keys and mirrors.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch and commit conventions.
