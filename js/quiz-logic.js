// ============================================================================
// js/quiz-logic.js
// Pure scoring / correctness for the vocab quiz (no DOM).
// ============================================================================

const TOPIC_BASE_POINTS = {
  Basics: 11,
  'Linear Independence': 12,
  'Rank & Span': 12,
  Determinant: 13,
  Eigenvalues: 14,
  Transformations: 11,
  Decomposition: 13,
};

export function quizAnswerIsCorrect(choiceOriginalIndex, answerIndex) {
  return choiceOriginalIndex === answerIndex;
}

/** Base points for a question — tied to topic difficulty, not shuffle order. */
export function quizBasePointsForTopic(topic) {
  const t = typeof topic === 'string' ? topic : '';
  return TOPIC_BASE_POINTS[t] ?? 12;
}

/** Small streak bonus on correct answers (cap 3). */
export function quizStreakBonusPoints(streakAfterIncrement) {
  return Math.min(3, Math.floor(Number(streakAfterIncrement) / 3));
}

/**
 * @deprecated Use {@link quizBasePointsForTopic} + {@link quizStreakBonusPoints}; kept for tests that assert legacy curve.
 * Points by position in run (old shuffle-sensitive model).
 */
export function quizScoreIncrementForCorrect(zeroBasedQuestionIndex) {
  return Math.max(5, 15 - Math.floor(zeroBasedQuestionIndex * 0.5));
}

export function quizCompletionPercent(correct, total) {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

/** Accuracy over questions answered so far (may differ from final completion %) */
export function quizRunningAccuracyPercent(correct, answered) {
  return answered > 0 ? Math.round((correct / answered) * 100) : 0;
}
