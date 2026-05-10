// ============================================================================
// js/iframe-layout.js
// Portal embed: match STEM Games guide — load + resize + visualViewport hook
// so canvas/layout sync to the iframe slot. Dispatches mma:iframe-layout;
// alignment-game listens and calls resizeCanvas().
// ============================================================================

function dispatchLayout() {
  window.dispatchEvent(new CustomEvent('mma:iframe-layout'));
}

/**
 * Call once at boot (after alignment init registers mma:iframe-layout).
 */
export function initIframeLayout() {
  window.addEventListener('resize', dispatchLayout);
  window.addEventListener('load', dispatchLayout);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', dispatchLayout);
    window.visualViewport.addEventListener('scroll', dispatchLayout);
  }
  if (document.readyState === 'complete') {
    dispatchLayout();
  }
}
