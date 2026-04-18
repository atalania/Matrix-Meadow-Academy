/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setFeedback,
  parseInputValue,
  fmt,
  matrixToTable,
  clearConfetti,
  spawnConfetti,
} from '../../js/ui.js';

describe('fmt', () => {
  it('prints integers without trailing noise', () => {
    expect(fmt(3)).toBe('3');
    expect(fmt(3.00000001)).toBe('3');
  });

  it('limits non-integers to four decimals', () => {
    expect(fmt(1.23456)).toBe('1.2346');
  });
});

describe('matrixToTable', () => {
  it('wraps values in a table', () => {
    const html = matrixToTable([[1, 2], [3, 4]]);
    expect(html).toContain('<table class="dm">');
    expect(html).toContain('<td>1</td>');
    expect(html).toContain('<td>4</td>');
  });
});

describe('parseInputValue', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns null for missing or blank input', () => {
    expect(parseInputValue('nope')).toBeNull();
    const inp = document.createElement('input');
    inp.id = 'x';
    inp.value = '   ';
    document.body.appendChild(inp);
    expect(parseInputValue('x')).toBeNull();
  });

  it('parses numeric strings', () => {
    const inp = document.createElement('input');
    inp.id = 'm00';
    inp.value = ' -2.5 ';
    document.body.appendChild(inp);
    expect(parseInputValue('m00')).toBe(-2.5);
  });

  it('returns null for non-numeric text', () => {
    const inp = document.createElement('input');
    inp.id = 'bad';
    inp.value = 'abc';
    document.body.appendChild(inp);
    expect(parseInputValue('bad')).toBeNull();
  });
});

describe('setFeedback', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('updates element class and HTML when present', () => {
    const el = document.createElement('div');
    el.id = 'fb1';
    document.body.appendChild(el);
    setFeedback('fb1', 'ok', '✓', 'Done');
    expect(el.className).toBe('fb ok');
    expect(el.innerHTML).toContain('Done');
  });

  it('no-ops when element is missing', () => {
    expect(() => setFeedback('missing', 'ok', 'x', 'y')).not.toThrow();
  });
});

describe('clearConfetti', () => {
  it('is safe when nothing was spawned', () => {
    expect(() => clearConfetti()).not.toThrow();
  });
});

describe('spawnConfetti', () => {
  afterEach(() => {
    clearConfetti();
    vi.restoreAllMocks();
  });

  it('creates confetti nodes and clearConfetti removes them', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    spawnConfetti();
    expect(document.querySelectorAll('.conf')).toHaveLength(55);

    clearConfetti();
    expect(document.querySelectorAll('.conf')).toHaveLength(0);
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});
