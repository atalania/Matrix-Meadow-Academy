import { describe, it, expect } from 'vitest';
import { M2 } from '../../js/math-engine.js';
import { buildLevels } from '../../js/levels.js';

describe('buildLevels', () => {
  const levels = buildLevels();

  it('returns nine alignment levels', () => {
    expect(levels).toHaveLength(9);
  });

  it('exposes required fields on every level', () => {
    for (const lv of levels) {
      expect(typeof lv.title).toBe('string');
      expect(lv.title.length).toBeGreaterThan(0);
      expect(typeof lv.desc).toBe('string');
      expect(typeof lv.obj).toBe('string');
      expect(typeof lv.concept).toBe('string');
      expect(['exact', 'det6']).toContain(lv.validate);
      expect(lv.target).toBeInstanceOf(M2);
      expect(typeof lv.teach).toBe('string');
      expect(typeof lv.tutorQ).toBe('string');
    }
  });

  it('marks the determinant challenge with det6 validation', () => {
    const detLevel = levels.find((l) => l.concept === 'determinant_area');
    expect(detLevel).toBeDefined();
    expect(detLevel.validate).toBe('det6');
  });
});
