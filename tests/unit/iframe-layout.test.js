/** @vitest-environment happy-dom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { initIframeLayout } from '../../js/iframe-layout.js';

describe('iframe-layout', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initIframeLayout dispatches mma:iframe-layout when document already complete', () => {
    const spy = vi.fn();
    window.addEventListener('mma:iframe-layout', spy);
    Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
    initIframeLayout();
    expect(spy).toHaveBeenCalled();
    window.removeEventListener('mma:iframe-layout', spy);
  });
});
