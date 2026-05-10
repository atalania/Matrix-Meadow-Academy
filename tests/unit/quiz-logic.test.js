import { describe, it, expect } from 'vitest';
import {
  quizAnswerIsCorrect,
  quizBasePointsForTopic,
  quizStreakBonusPoints,
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

describe('quizBasePointsForTopic', () => {
  it('uses topic weights independent of run order', () => {
    expect(quizBasePointsForTopic('Basics')).toBe(11);
    expect(quizBasePointsForTopic('Eigenvalues')).toBe(14);
    expect(quizBasePointsForTopic('Unknown Topic XYZ')).toBe(12);
  });
});

describe('quizStreakBonusPoints', () => {
  it('matches drill-style +1 per three correct, capped at 3', () => {
    expect(quizStreakBonusPoints(2)).toBe(0);
    expect(quizStreakBonusPoints(3)).toBe(1);
    expect(quizStreakBonusPoints(9)).toBe(3);
    expect(quizStreakBonusPoints(30)).toBe(3);
  });
});

describe('quizScoreIncrementForCorrect (legacy)', () => {
  it('keeps the old position-based curve for compatibility', () => {
    expect(quizScoreIncrementForCorrect(0)).toBe(15);
    expect(quizScoreIncrementForCorrect(20)).toBe(5);
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
