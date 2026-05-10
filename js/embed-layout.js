// ============================================================================
// js/embed-layout.js
// Mobile / touch iframe: report document height to parent via postMessage so
// embedders can resize the iframe. No-op when not in an iframe or on a
// typical desktop (wide + fine pointer) so parent pages are unchanged.
// ============================================================================

const MESSAGE_TYPE = 'mma-embed-content-height';
const SOURCE = 'matrix-meadow-academy';

function inIframe() {
  try {
    return window.parent !== window;
  } catch {
    return false;
  }
}

/** Only report when embed is likely mobile / touch — avoids affecting desktop-in-iframe. */
function shouldReportEmbedSize() {
  if (typeof window.matchMedia !== 'function') return true;
  try {
    const narrow = window.matchMedia('(max-width: 720px)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    return narrow || coarse;
  } catch {
    return true;
  }
}

function measureContentHeight() {
  const el = document.documentElement;
  const body = document.body;
  return Math.max(
    el?.scrollHeight ?? 0,
    body?.scrollHeight ?? 0,
    el?.getBoundingClientRect?.().height ?? 0
  );
}

let embedReportTimer = null;

function postEmbedHeight() {
  if (!inIframe() || !shouldReportEmbedSize()) return;
  const height = Math.ceil(measureContentHeight());
  if (height < 1) return;
  try {
    window.parent.postMessage(
      { source: SOURCE, type: MESSAGE_TYPE, height },
      '*',
    );
  } catch {
    // Cross-origin or detached — ignore
  }
}

export function scheduleEmbedHeightPost() {
  if (!inIframe()) return;
  clearTimeout(embedReportTimer);
  embedReportTimer = window.setTimeout(postEmbedHeight, 100);
}

/**
 * Observe layout changes and viewport chrome (mobile URL bar) so parents can
 * match iframe height. Desktop (wide + fine pointer): no messages.
 */
export function initEmbedLayout() {
  if (!inIframe()) return;

  window.addEventListener('resize', scheduleEmbedHeightPost);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleEmbedHeightPost);
    window.visualViewport.addEventListener('scroll', scheduleEmbedHeightPost);
  }
  window.addEventListener('load', scheduleEmbedHeightPost);
  window.addEventListener('mma:embed-layout-maybe-changed', scheduleEmbedHeightPost);

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => scheduleEmbedHeightPost());
    ro.observe(document.body);
  }

  scheduleEmbedHeightPost();
}
