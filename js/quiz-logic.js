// ============================================================================
// js/quiz-logic.js
// Pure scoring / correctness for the vocab quiz (no DOM).
// ============================================================================

export function quizAnswerIsCorrect(choiceOriginalIndex, answerIndex) {
  return choiceOriginalIndex === answerIndex;
}

/** Points awarded for a correct answer at this zero-based position in the run */
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
