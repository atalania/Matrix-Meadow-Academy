// ============================================================================
// js/assistant-bridge.js
// Sends game events to the LLNL STEM Games portal via postMessage.
// Works silently when not inside an iframe (standalone dev mode).
// ============================================================================

const GAME_ID = 'matrix-meadow';

let problemStartTime = Date.now();
let hintCount = 0;

function elapsed() { return Math.round((Date.now() - problemStartTime) / 1000); }

function sendToPortal(payload) {
  if (window.parent === window) {
    console.debug('[Assistant Bridge]', payload.eventType, payload);
    return;
  }
  window.parent.postMessage({ type: 'ASSISTANT_GAME_EVENT', payload }, '*');
}

/**
 * Serialize a player/correct answer for the portal payload.
 * Returns undefined for null/undefined, the original string for strings,
 * and a JSON.stringify'd form for any other value (so objects don't end
 * up as the literal "[object Object]" via implicit coercion).
 */
function serializeAnswer(value) {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

// ---------------------------------------------------------------------------
// Public API — called from game modules
// ---------------------------------------------------------------------------

export const bridge = {
  /** Call when a new level or problem starts */
  resetProblem() {
    problemStartTime = Date.now();
    hintCount = 0;
  },

  /** Call when a level begins */
  onLevelStart(levelId, concept) {
    this.resetProblem();
    sendToPortal({
      gameId: GAME_ID, levelId, eventType: 'level_start',
      targetConcept: concept, hintCount: 0, timeSpentSeconds: 0,
    });
  },

  /** Call when the player submits a wrong answer */
  onIncorrect({ levelId, concept, playerAnswer, correctAnswer, mistakeCategory, extra }) {
    sendToPortal({
      gameId: GAME_ID, levelId, eventType: 'incorrect_submission',
      targetConcept: concept,
      mistakeCategory: mistakeCategory || 'general_mistake',
      playerAnswer: serializeAnswer(playerAnswer),
      correctAnswer: serializeAnswer(correctAnswer),
      hintCount, timeSpentSeconds: elapsed(),
      additionalContext: extra,
    });
  },

  /** Call when the player submits a correct answer */
  onCorrect({ levelId, concept, playerAnswer }) {
    sendToPortal({
      gameId: GAME_ID, levelId, eventType: 'correct_submission',
      targetConcept: concept,
      playerAnswer: serializeAnswer(playerAnswer),
      hintCount, timeSpentSeconds: elapsed(),
    });
  },

  /** Call when the player completes a level */
  onLevelComplete({ levelId, concept }) {
    sendToPortal({
      gameId: GAME_ID, levelId, eventType: 'level_complete',
      targetConcept: concept, hintCount, timeSpentSeconds: elapsed(),
    });
  },

  /** Call when time runs out */
  onTimeout({ levelId, concept, playerAnswer, correctAnswer }) {
    sendToPortal({
      gameId: GAME_ID, levelId, eventType: 'timeout',
      targetConcept: concept,
      playerAnswer: serializeAnswer(playerAnswer),
      correctAnswer: serializeAnswer(correctAnswer),
      hintCount, timeSpentSeconds: elapsed(),
    });
  },

  /** Call when the player requests a hint */
  onHintRequest({ levelId, concept }) {
    hintCount++;
    sendToPortal({
      gameId: GAME_ID, levelId, eventType: 'hint_request',
      targetConcept: concept, hintCount, timeSpentSeconds: elapsed(),
    });
  },
};