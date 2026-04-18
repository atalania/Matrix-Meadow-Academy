import { describe, it, expect } from 'vitest';
import {
  quizAnswerIsCorrect,
  quizScoreIncrementForCorrect,
  quizCompletionPercent,
  quizRunningAccuracyPercent,
} from '../../js/quiz-logic.js';

describe('quizAnswerIsCorrect', () => {
  it('matches choice index to answer index', () => {
    expect(quizAnswerIsCorrect(1, 1)).toBe(true);
    expect(quizAnswerIsCorrect(0, 1)).toBe(false);
  });
});

describe('quizScoreIncrementForCorrect', () => {
  it('starts at 15 and steps down every two questions', () => {
    expect(quizScoreIncrementForCorrect(0)).toBe(15);
    expect(quizScoreIncrementForCorrect(1)).toBe(15);
    expect(quizScoreIncrementForCorrect(2)).toBe(14);
    expect(quizScoreIncrementForCorrect(3)).toBe(14);
    expect(quizScoreIncrementForCorrect(20)).toBe(5);
    expect(quizScoreIncrementForCorrect(99)).toBe(5);
  });
});

describe('quizCompletionPercent', () => {
  it('returns 0 for empty run', () => {
    expect(quizCompletionPercent(0, 0)).toBe(0);
  });

  it('rounds final ratio', () => {
    expect(quizCompletionPercent(2, 3)).toBe(67);
    expect(quizCompletionPercent(1, 2)).toBe(50);
  });
});

describe('quizRunningAccuracyPercent', () => {
  it('returns 0 when nothing answered', () => {
    expect(quizRunningAccuracyPercent(3, 0)).toBe(0);
  });

  it('uses answered count as denominator', () => {
    expect(quizRunningAccuracyPercent(1, 3)).toBe(33);
  });
});
