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
| `data/game.json` | Game id and metadata for embeds |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch and commit conventions.
