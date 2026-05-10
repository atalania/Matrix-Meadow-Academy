# Mobile & iframe sizing — Matrix Meadow Academy (`matrix-meadow`)

Games run **inside an iframe** on `/games/matrix-meadow`. The portal sets the iframe’s **CSS height** from `embedHeight` in `data/game.json` (synced into the portal’s `src/data/games.ts`). On phones the portal uses **different** heights than on desktop so the game fits under the site header + player chrome + toolbar.

**Portal source of truth:** `src/lib/games/embed-height.ts` (`resolveEmbedHeights`) in the LLNL STEM Games portal repository.

This repo implements the patterns below with **`#app`** as the scroll root (not `#root`) and **`js/iframe-layout.js`** + **`js/embed-layout.js`** for layout / optional height `postMessage` to the parent.

---

## 1. Portal behavior (what this game assumes)

| Context | What happens |
|--------|----------------|
| **Not full viewport** | `100vh` / `100dvh` in game CSS refers to the **browser tab**, not the iframe. Inside the iframe that can **overflow** the slot and cause double scroll or a clipped canvas. |
| **Mobile** | Iframe height is roughly `calc(100dvh - 200px)` (budget for header, padding, toolbar, safe areas). Exact rules depend on `embedHeight` and slug — see portal `embed-height.ts`. |
| **Escape hatch** | Players can open the static build in a **new tab** from the toolbar; there the game is top-level (responsive rules still apply). |

**This game:** `html, body` fill the iframe with **`overflow: hidden`** on `body`; **`#app`** uses **`height: 100%`** + **`overflow-y: auto`** so there is **one** primary vertical scroll inside the iframe. The monster canvas width is driven from **`#canvas-wrap`** (`ResizeObserver` + `resize` + `mma:iframe-layout` from `js/iframe-layout.js`).

**Do not** use `height: 100vh` alone as the sole height for the scroll surface inside the embed.

---

## 2. `<head>` (this repo: `index.html`)

```html
<meta charset="utf-8" />
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5"
/>
<title>Matrix Meadow Academy</title>
```

---

## 3. Base layout CSS (this repo: `styles.css`)

Fills the **iframe** without fighting `vh`; scroll on **`#app`**:

```css
html {
  height: 100%;
}

body {
  height: 100%;
  min-height: 0;
  margin: 0;
  padding: 0;
  width: 100%;
  overflow: hidden;
  touch-action: manipulation;
  -webkit-text-size-adjust: 100%;
}

#app {
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
```

Monster canvas (`#gc`): `display: block; max-width: 100%; max-height: 100%;` — intrinsic height is set in JS from the container width.

---

## 4. Resize / layout hooks (this repo)

- **`js/iframe-layout.js`** — `initIframeLayout()` registers `load`, `resize`, and `visualViewport` resize/scroll → dispatches **`mma:iframe-layout`**.
- **`js/alignment-game.js`** — listens for **`mma:iframe-layout`** and **`resize`**, plus **`ResizeObserver`** on the canvas wrapper → **`resizeCanvas()`** (DPR-aware).
- **`js/embed-layout.js`** — optional **`postMessage`** to parent (`mma-embed-content-height`) on narrow / coarse pointer embeds for auto iframe height (parent must opt in).

---

## 5. `data/game.json` (this repo)

- **`game-id`:** `matrix-meadow` (must match portal slug and Vite `base` in `vite.config.js`).
- **`embedHeight`:** e.g. `"800px"` — set to a **minimum playable** height you verified on desktop; the portal may rewrite `100vh` values for nested iframes.

---

## 6. README checklist

- [ ] Viewport meta: `width=device-width`, `initial-scale=1`, `viewport-fit=cover`, `maximum-scale=5`
- [ ] Root layout: `html, body { height: 100%; }`, **`#app`** fills height with **`overflow-y: auto`** — no standalone **`100vh`** as sole height for the scroll surface
- [ ] Resize: `resize` + **`mma:iframe-layout`** (`load` / `visualViewport`) → **`resizeCanvas()`** from **container** width
- [ ] Touch: controls ≥ 44×44px tap targets where appropriate; global **`touch-action: manipulation`** on `body` per portal guide
- [ ] Safe area: `env(safe-area-inset-*)` on `#app` / modals (see `styles.css`)
- [ ] Test: `/games/matrix-meadow` on a real phone (portrait + landscape) and “Open in new tab” from toolbar
- [ ] `embedHeight` in `data/game.json` matches minimum playable height you tested

---

## 7. Quick verification in the portal

1. Run the site, open `/games/matrix-meadow`.
2. DevTools → responsive mode → pick a phone height.
3. Confirm: **one** primary vertical scroll (inside `#app`, not body vs iframe fighting).
4. Confirm: monster canvas uses the **visible** panel width without clipping.
5. Tap **open in new tab** — game still usable at small widths.

---

## 8. Optional — portal monorepo

Link from your team wiki to **`src/lib/games/embed-height.ts`** and game registry docs in the LLNL STEM Games portal repository.
