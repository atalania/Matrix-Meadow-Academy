// ============================================================================
// js/assistant-bridge.js
// Sends game events to the LLNL STEM Games portal via postMessage.
// Works silently when not inside an iframe (standalone dev mode).
// ============================================================================

const GAME_ID = 'matrix-meadow';
const SCORE_STORAGE_KEY = 'mm_bridge_score_v1';

let problemStartTime = Date.now();
let hintCount = 0;
let moduleScores = loadScoreState();
let bestTotalScore = Math.max(0, Number(moduleScores.bestTotalScore) || 0);

function elapsed() { return Math.round((Date.now() - problemStartTime) / 1000); }

function sendToPortal(payload) {
  if (window.parent === window) {
    console.debug('[Assistant Bridge]', payload.eventType, payload);
    return;
  }
  window.parent.postMessage({ type: 'ASSISTANT_GAME_EVENT', payload }, '*');
}

function loadScoreState() {
  try {
    const raw = localStorage.getItem(SCORE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

function persistScoreState() {
  try {
    localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify({
      ...moduleScores,
      bestTotalScore,
    }));
  } catch {
    // Ignore localStorage failures in sandbox/private mode.
  }
}

function safeNumeric(value) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function leaderboardData(totalScore, stats = {}) {
  return {
    highScore: bestTotalScore,
    score: totalScore,
    lastPlayedAt: new Date().toISOString(),
    matrixMeadow: {
      highScore: bestTotalScore,
      score: totalScore,
    },
    stats,
  };
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

  /**
   * Synchronize score for leaderboard ingestion.
   * The payload includes root highScore/score plus matrixMeadow aliases.
   */
  onScoreUpdate({ source, score, stats } = {}) {
    const moduleKey = source || 'alignment';
    moduleScores[moduleKey] = Math.max(0, Math.round(safeNumeric(score)));
    const totalScore = Object.entries(moduleScores)
      .filter(([k]) => k !== 'bestTotalScore')
      .reduce((sum, [, val]) => sum + Math.max(0, Math.round(safeNumeric(val))), 0);

    bestTotalScore = Math.max(bestTotalScore, totalScore);
    persistScoreState();

    sendToPortal({
      gameId: GAME_ID,
      eventType: 'score_update',
      score: totalScore,
      highScore: bestTotalScore,
      additionalContext: {
        source: moduleKey,
        gameData: leaderboardData(totalScore, stats),
      },
    });
  },
};
