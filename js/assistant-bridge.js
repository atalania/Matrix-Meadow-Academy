// ============================================================================
// js/assistant-bridge.js
// Game-facing API: score portal merge + delegation to stem-assistant-bridge
// for assistant events (no direct postMessage for assistant traffic).
// Works silently when not inside an iframe (standalone dev mode).
// ============================================================================

import {
  initStemAssistantBridge,
  stemAssistant,
  setStemAssistantLevel,
} from 'stem-assistant-bridge';

const GAME_ID = 'matrix-meadow';
const SCORE_STORAGE_KEY = 'mm_bridge_score_v1';

initStemAssistantBridge({
  gameId: GAME_ID,
  defaultTargetConcept: 'matrix_uniform_scaling',
  defaultLevelId: 'level_1',
});

/** In Vitest, skip long portal GET timeouts; full timeout in production iframe. */
const PORTAL_GET_TIMEOUT_MS = (typeof process !== 'undefined' && process.env.VITEST) ? 0 : 2500;

const scoreState = loadScoreState();
let moduleScores = scoreState.moduleScores;
let bestAlignmentScore = scoreState.bestAlignmentScore;
let bestDrillScore = scoreState.bestDrillScore;
let bestQuizScore = scoreState.bestQuizScore;

let cachedPortalGameData = {};
let portalListenerInstalled = false;
let portalBootstrapPromise = null;
const pendingPortalRequests = new Map();

let lastScoreContext = { source: 'alignment', stats: {} };
let scoreFlushTail = Promise.resolve();

/** Map internal diagnosis tags to short hub-friendly machine tags. */
function hubMistakeTag(tag) {
  const t = typeof tag === 'string' ? tag : '';
  const map = {
    element_placed_wrong_position: 'entry_order_swap',
    wrong_off_diagonal: 'wrong_off_diagonal_entry',
    diagonal_swap: 'diagonal_swap',
    sign_error: 'sign_error',
    arithmetic_error: 'arithmetic_error',
    general_mistake: 'general_mistake',
    det_zero: 'determinant_zero',
    det_wrong_sign: 'determinant_wrong_sign',
    det_value_off: 'determinant_value_off',
    dot_product_miscalculation: 'dot_product_error',
    near_miss_one_cell: 'dot_product_near_miss',
    vocab_misconception: 'vocab_concept_mixup',
  };
  return map[t] || t || 'general_mistake';
}

function postRawToParent(message) {
  if (window.parent === window) {
    console.debug('[Assistant Bridge]', message.type, message);
    return;
  }
  window.parent.postMessage(message, '*');
}

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
    if (!raw) {
      return {
        moduleScores: { alignment: 0, drill: 0, quiz: 0 },
        bestAlignmentScore: 0,
        bestDrillScore: 0,
        bestQuizScore: 0,
      };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return {
        moduleScores: { alignment: 0, drill: 0, quiz: 0 },
        bestAlignmentScore: 0,
        bestDrillScore: 0,
        bestQuizScore: 0,
      };
    }
    const alignment = Math.max(0, Math.round(safeNumeric(parsed.alignment)));
    const drill = Math.max(0, Math.round(safeNumeric(parsed.drill)));
    const quiz = Math.max(0, Math.round(safeNumeric(parsed.quiz)));

    let bestAlignment = Math.max(0, Math.round(safeNumeric(parsed.bestAlignment)));
    let bestDrill = Math.max(0, Math.round(safeNumeric(parsed.bestDrill)));
    let bestQuiz = Math.max(0, Math.round(safeNumeric(parsed.bestQuiz)));

    const legacyTotals = parsed.bestTotalScore != null
      && parsed.bestAlignment == null && parsed.bestDrill == null && parsed.bestQuiz == null;
    if (legacyTotals) {
      bestAlignment = Math.max(bestAlignment, alignment);
      bestDrill = Math.max(bestDrill, drill);
      bestQuiz = Math.max(bestQuiz, quiz);
    }
    bestAlignment = Math.max(bestAlignment, alignment);
    bestDrill = Math.max(bestDrill, drill);
    bestQuiz = Math.max(bestQuiz, quiz);

    return {
      moduleScores: { alignment, drill, quiz },
      bestAlignmentScore: bestAlignment,
      bestDrillScore: bestDrill,
      bestQuizScore: bestQuiz,
    };
  } catch {
    return {
      moduleScores: { alignment: 0, drill: 0, quiz: 0 },
      bestAlignmentScore: 0,
      bestDrillScore: 0,
      bestQuizScore: 0,
    };
  }
}

function persistScoreState() {
  try {
    localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify({
      alignment: moduleScores.alignment,
      drill: moduleScores.drill,
      quiz: moduleScores.quiz,
      bestAlignment: bestAlignmentScore,
      bestDrill: bestDrillScore,
      bestQuiz: bestQuizScore,
    }));
  } catch {
    // Ignore localStorage failures in sandbox/private mode.
  }
}

function safeNumeric(value) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Deep-merge plain objects so portal-owned keys survive (e.g. extra stats).
 * Arrays and non-objects replace; `null` patch values skip (keep base).
 */
function deepMerge(base, patch) {
  if (patch == null) return base == null ? {} : base;
  if (Array.isArray(patch)) return [...patch];
  if (typeof patch !== 'object') return patch;
  const b = base != null && typeof base === 'object' && !Array.isArray(base) ? base : {};
  const out = { ...b };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (v != null && typeof v === 'object' && !Array.isArray(v)
      && out[k] != null && typeof out[k] === 'object' && !Array.isArray(out[k])) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function extractPortalJsonFromMessage(data) {
  if (!data || typeof data !== 'object') return null;
  const nested = data.payload && typeof data.payload === 'object' ? data.payload.dataJson : null;
  const direct = data.dataJson ?? data.gameData;
  const chosen = nested ?? direct;
  if (chosen && typeof chosen === 'object' && !Array.isArray(chosen)) return chosen;
  return null;
}

function installPortalMessageListener() {
  if (portalListenerInstalled) return;
  if (typeof window.addEventListener !== 'function') return;
  portalListenerInstalled = true;

  window.addEventListener('message', (ev) => {
    const data = ev.data;
    if (!data || typeof data !== 'object') return;

    const types = new Set([
      'PORTAL_GAME_DATA',
      'PORTAL_GAME_DATA_RESPONSE',
      'STEM_PORTAL_GAME_DATA',
    ]);
    if (!types.has(data.type)) return;
    if (data.gameId != null && data.gameId !== GAME_ID) return;

    const json = extractPortalJsonFromMessage(data);
    if (json) {
      cachedPortalGameData = deepMerge(cachedPortalGameData, json);
    }

    const rid = data.requestId;
    if (rid && pendingPortalRequests.has(rid)) {
      const resolve = pendingPortalRequests.get(rid);
      pendingPortalRequests.delete(rid);
      resolve(json || {});
    }
  });
}

function requestPortalGameDataJson() {
  installPortalMessageListener();
  if (window.parent === window) return Promise.resolve({});

  return new Promise((resolve) => {
    const requestId = `mm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const timer = setTimeout(() => {
      pendingPortalRequests.delete(requestId);
      resolve({});
    }, PORTAL_GET_TIMEOUT_MS);

    pendingPortalRequests.set(requestId, (incoming) => {
      clearTimeout(timer);
      resolve(incoming && typeof incoming === 'object' ? incoming : {});
    });

    postRawToParent({
      type: 'PORTAL_GAME_DATA_REQUEST',
      gameId: GAME_ID,
      requestId,
    });
  });
}

function ensurePortalGameDataLoaded() {
  if (window.parent === window) return Promise.resolve();
  installPortalMessageListener();
  if (!portalBootstrapPromise) {
    portalBootstrapPromise = requestPortalGameDataJson().then((incoming) => {
      if (incoming && Object.keys(incoming).length) {
        cachedPortalGameData = deepMerge(cachedPortalGameData, incoming);
      }
    });
  }
  return portalBootstrapPromise;
}

function buildTrackGameDataPatch() {
  const alignCurr = Math.max(0, Math.round(safeNumeric(moduleScores.alignment)));
  const alignBest = Math.max(0, Math.round(bestAlignmentScore));
  const drillCurr = Math.max(0, Math.round(safeNumeric(moduleScores.drill)));
  const drillBest = Math.max(0, Math.round(bestDrillScore));
  const quizCurr = Math.max(0, Math.round(safeNumeric(moduleScores.quiz)));
  const quizBest = Math.max(0, Math.round(bestQuizScore));

  return {
    highScore: alignBest,
    score: alignCurr,
    lastPlayedAt: new Date().toISOString(),
    matrixMeadow: {
      highScore: alignBest,
      score: alignCurr,
      multiplicationDrill: { highScore: drillBest, score: drillCurr },
      drill: { highScore: drillBest, score: drillCurr },
      vocabularyQuiz: { highScore: quizBest, score: quizCurr },
      vocabQuiz: { highScore: quizBest, score: quizCurr },
    },
    multiplicationDrillHighScore: drillBest,
    drillHighScore: drillBest,
    vocabularyQuizHighScore: quizBest,
    vocabQuizHighScore: quizBest,
    stats: lastScoreContext.stats || {},
  };
}

function flushScoreToPortal() {
  scoreFlushTail = scoreFlushTail.then(async () => {
    await ensurePortalGameDataLoaded();
    const patch = buildTrackGameDataPatch();
    const { stats: latestStats, ...restPatch } = patch;
    cachedPortalGameData = deepMerge(cachedPortalGameData, restPatch);
    cachedPortalGameData.stats = latestStats;
    sendToPortal({
      gameId: GAME_ID,
      eventType: 'score_update',
      score: Math.max(0, Math.round(safeNumeric(moduleScores.alignment))),
      highScore: Math.max(0, Math.round(bestAlignmentScore)),
      additionalContext: {
        source: lastScoreContext.source,
        gameData: cachedPortalGameData,
      },
    });
    try {
      globalThis.dispatchEvent?.(new CustomEvent('mma:score-bests-updated'));
    } catch {
      /* ignore */
    }
  }).catch(() => {});
  return scoreFlushTail;
}

// ---------------------------------------------------------------------------
// Public API — called from game modules
// ---------------------------------------------------------------------------

export {
  initStemAssistantBridge,
  setStemAssistantLevel,
  stemAssistant,
  sendStemAssistantEvent,
  setStemAssistantHintCount,
} from 'stem-assistant-bridge';

export const bridge = {
  /**
   * Warm up portal `data_json` merge (parent round-trip). Safe to call once at boot.
   * @returns {Promise<void>}
   */
  bootstrapPortalGameData() {
    return ensurePortalGameDataLoaded();
  },

  /** Rolling bests per leaderboard track (local + last portal merge). */
  getTrackBests() {
    return {
      alignmentBest: Math.max(0, Math.round(safeNumeric(bestAlignmentScore))),
      drillBest: Math.max(0, Math.round(safeNumeric(bestDrillScore))),
      quizBest: Math.max(0, Math.round(safeNumeric(bestQuizScore))),
    };
  },

  /** Call when a new level or problem starts */
  resetProblem() {
    stemAssistant.resetProblemTimer();
  },

  /** Call when a level begins */
  onLevelStart(levelId, concept) {
    stemAssistant.levelStart({ levelId, targetConcept: concept });
  },

  /** Call when the player submits a wrong answer */
  onIncorrect({
    levelId, concept, playerAnswer, correctAnswer, mistakeCategory, extra, additionalContext,
  }) {
    const ctx = additionalContext ?? extra;
    stemAssistant.incorrect({
      levelId,
      targetConcept: concept,
      playerAnswer,
      correctAnswer,
      mistakeCategory: hubMistakeTag(mistakeCategory),
      additionalContext: ctx,
    });
  },

  /** Call when the player submits a correct answer */
  onCorrect({ levelId, concept, playerAnswer }) {
    stemAssistant.correct({ levelId, targetConcept: concept, playerAnswer });
  },

  /** Call when the player completes a level */
  onLevelComplete({ levelId, concept }) {
    stemAssistant.levelComplete({ levelId, targetConcept: concept });
  },

  /** Call when time runs out */
  onTimeout({ levelId, concept, playerAnswer, correctAnswer }) {
    stemAssistant.timeout({
      levelId, targetConcept: concept, playerAnswer, correctAnswer,
    });
  },

  /** Call when the player requests a hint */
  onHintRequest({ levelId, concept, extra, additionalContext }) {
    stemAssistant.hintRequest({
      levelId,
      targetConcept: concept,
      additionalContext: additionalContext ?? extra,
    });
  },

  /**
   * Synchronize score for leaderboard ingestion.
   * Root `highScore` / `score` follow **Monster Alignment** (overall track).
   * Drill and quiz rolling bests live under `matrixMeadow.*` and root mirrors
   * expected by the portal API (see README).
   * @returns {Promise<void>}
   */
  onScoreUpdate({ source, score, stats } = {}) {
    const moduleKey = source || 'alignment';
    moduleScores[moduleKey] = Math.max(0, Math.round(safeNumeric(score)));

    if (moduleKey === 'alignment') {
      bestAlignmentScore = Math.max(bestAlignmentScore, moduleScores.alignment);
    } else if (moduleKey === 'drill') {
      bestDrillScore = Math.max(bestDrillScore, moduleScores.drill);
    } else if (moduleKey === 'quiz') {
      bestQuizScore = Math.max(bestQuizScore, moduleScores.quiz);
    }

    lastScoreContext = { source: moduleKey, stats: stats || {} };
    persistScoreState();
    return flushScoreToPortal();
  },
};
