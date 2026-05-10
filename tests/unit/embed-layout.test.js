/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initEmbedLayout, scheduleEmbedHeightPost } from '../../js/embed-layout.js';

describe('embed-layout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('scheduleEmbedHeightPost does nothing when not in an iframe', () => {
    const post = vi.spyOn(window.parent, 'postMessage');
    scheduleEmbedHeightPost();
    vi.runAllTimers();
    expect(post).not.toHaveBeenCalled();
  });

  it('initEmbedLayout does not throw when not in an iframe', () => {
    expect(() => initEmbedLayout()).not.toThrow();
  });
});
