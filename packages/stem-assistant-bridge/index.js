// ============================================================================
// stem-assistant-bridge — posts ASSISTANT_GAME_EVENT payloads to the parent
// frame for the STEM Games hub assistant. Games must not call postMessage
// for assistant traffic directly.
//
// API aligned with the portal “Web Assistant Bridge” guide: init options,
// automatic opening level_start when embedded, sendStemAssistantEvent,
// setStemAssistantHintCount.
// ============================================================================

const isVitest = typeof process !== 'undefined' && process.env.VITEST;

/** @type {{ gameId: string, defaultTargetConcept?: string, defaultLevelId?: string }} */
let config = {
  gameId: 'matrix-meadow',
  defaultLevelId: 'level_1',
};

/** @type {string|null} */
let sessionLevelId = null;
/** @type {string|null} */
let sessionTargetConcept = null;

let hintCount = 0;
let problemStartTime = Date.now();

/** Opening auto level_start pair; first matching stemAssistant.levelStart skips post. */
let openingLevelStartGuard = null;

function serializeAnswer(value) {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

function elapsedSeconds() {
  return Math.round((Date.now() - problemStartTime) / 1000);
}

function postAssistantPayload(payload) {
  if (typeof window === 'undefined') return;
  if (window.parent === window) {
    console.debug('[stem-assistant-bridge]', payload.eventType, payload);
    return;
  }
  window.parent.postMessage({ type: 'ASSISTANT_GAME_EVENT', payload }, '*');
}

/**
 * @param {{
 *   gameId?: string,
 *   defaultTargetConcept?: string,
 *   defaultLevelId?: string,
 *   suppressAutoLevelStart?: boolean,
 * }} [opts]
 */
export function initStemAssistantBridge(opts = {}) {
  config = {
    ...config,
    ...opts,
    gameId: opts.gameId != null ? String(opts.gameId) : config.gameId,
    defaultLevelId: opts.defaultLevelId != null ? String(opts.defaultLevelId) : (config.defaultLevelId || 'level_1'),
  };
  if (opts.defaultTargetConcept != null) {
    config.defaultTargetConcept = String(opts.defaultTargetConcept);
  }

  const embedded = typeof window !== 'undefined' && window.parent !== window;
  const allowAuto = !isVitest && !opts.suppressAutoLevelStart && embedded
    && config.defaultTargetConcept;

  if (allowAuto) {
    const lid = config.defaultLevelId;
    const tc = config.defaultTargetConcept;
    sessionLevelId = lid;
    sessionTargetConcept = tc;
    problemStartTime = Date.now();
    hintCount = 0;
    postAssistantPayload({
      gameId: config.gameId,
      levelId: lid,
      eventType: 'level_start',
      targetConcept: tc,
      hintCount: 0,
      timeSpentSeconds: 0,
    });
    openingLevelStartGuard = { levelId: lid, targetConcept: tc };
  }
}

export function setStemAssistantLevel(levelId, targetConcept) {
  sessionLevelId = levelId != null ? String(levelId) : null;
  sessionTargetConcept = targetConcept != null ? String(targetConcept) : null;
}

/**
 * Override hint count (e.g. after restoring state). Must be non-negative integer.
 * @param {number} n
 */
export function setStemAssistantHintCount(n) {
  const v = Math.floor(Number(n));
  hintCount = Number.isFinite(v) && v >= 0 ? v : 0;
}

/**
 * Low-level escape hatch for advanced / hub-only event types (e.g. recap_request).
 * Merges `gameId`, `hintCount`, and `timeSpentSeconds` when omitted.
 * @param {Record<string, unknown>} event
 */
export function sendStemAssistantEvent(event) {
  if (!event || typeof event !== 'object') return;
  const e = /** @type {Record<string, unknown>} */ (event);
  const eventType = e.eventType;
  if (!eventType || typeof eventType !== 'string') return;
  const { hintCount: hc, timeSpentSeconds: ts, ...rest } = e;
  postAssistantPayload({
    gameId: config.gameId,
    eventType,
    ...rest,
    hintCount: hc != null ? Number(hc) : hintCount,
    timeSpentSeconds: ts != null ? Number(ts) : elapsedSeconds(),
  });
}

export const stemAssistant = {
  resetProblemTimer() {
    problemStartTime = Date.now();
    hintCount = 0;
  },

  /**
   * @param {{
   *   levelId: string,
   *   targetConcept: string,
   *   additionalContext?: Record<string, unknown>,
   * }} p
   */
  levelStart(p) {
    const hasAdditionalContext = p.additionalContext != null && typeof p.additionalContext === 'object';
    // Opening auto level_start has no context; skip only the duplicate bare
    // follow-up so the hub does not see two identical starts. Always post when
    // the game supplies additionalContext (rich level/problem snapshot).
    if (openingLevelStartGuard
      && p.levelId === openingLevelStartGuard.levelId
      && p.targetConcept === openingLevelStartGuard.targetConcept
      && !hasAdditionalContext) {
      openingLevelStartGuard = null;
      setStemAssistantLevel(p.levelId, p.targetConcept);
      this.resetProblemTimer();
      return;
    }
    openingLevelStartGuard = null;

    setStemAssistantLevel(p.levelId, p.targetConcept);
    this.resetProblemTimer();
    postAssistantPayload({
      gameId: config.gameId,
      levelId: p.levelId,
      eventType: 'level_start',
      targetConcept: p.targetConcept,
      hintCount: 0,
      timeSpentSeconds: 0,
      ...(p.additionalContext != null && typeof p.additionalContext === 'object'
        ? { additionalContext: p.additionalContext }
        : {}),
    });
  },

  /**
   * @param {{
   *   targetConcept?: string,
   *   levelId?: string,
   *   playerAnswer?: unknown,
   *   correctAnswer?: unknown,
   *   mistakeCategory?: string,
   *   additionalContext?: Record<string, unknown>,
   * }} p
   */
  incorrect(p) {
    const levelId = p.levelId ?? sessionLevelId ?? undefined;
    const targetConcept = p.targetConcept ?? sessionTargetConcept ?? undefined;
    postAssistantPayload({
      gameId: config.gameId,
      levelId,
      eventType: 'incorrect_submission',
      targetConcept,
      mistakeCategory: p.mistakeCategory || 'general_mistake',
      playerAnswer: serializeAnswer(p.playerAnswer),
      correctAnswer: serializeAnswer(p.correctAnswer),
      hintCount,
      timeSpentSeconds: elapsedSeconds(),
      additionalContext: p.additionalContext,
    });
  },

  /**
   * @param {{ levelId?: string, targetConcept?: string, playerAnswer?: unknown }} p
   */
  correct(p) {
    const levelId = p.levelId ?? sessionLevelId ?? undefined;
    const targetConcept = p.targetConcept ?? sessionTargetConcept ?? undefined;
    postAssistantPayload({
      gameId: config.gameId,
      levelId,
      eventType: 'correct_submission',
      targetConcept,
      playerAnswer: serializeAnswer(p.playerAnswer),
      hintCount,
      timeSpentSeconds: elapsedSeconds(),
    });
  },

  /**
   * @param {{ levelId?: string, targetConcept?: string }} p
   */
  levelComplete(p) {
    const levelId = p.levelId ?? sessionLevelId ?? undefined;
    const targetConcept = p.targetConcept ?? sessionTargetConcept ?? undefined;
    postAssistantPayload({
      gameId: config.gameId,
      levelId,
      eventType: 'level_complete',
      targetConcept,
      hintCount,
      timeSpentSeconds: elapsedSeconds(),
    });
  },

  /**
   * @param {{ levelId?: string, targetConcept?: string, playerAnswer?: unknown, correctAnswer?: unknown }} p
   */
  timeout(p) {
    const levelId = p.levelId ?? sessionLevelId ?? undefined;
    const targetConcept = p.targetConcept ?? sessionTargetConcept ?? undefined;
    postAssistantPayload({
      gameId: config.gameId,
      levelId,
      eventType: 'timeout',
      targetConcept,
      playerAnswer: serializeAnswer(p.playerAnswer),
      correctAnswer: serializeAnswer(p.correctAnswer),
      hintCount,
      timeSpentSeconds: elapsedSeconds(),
    });
  },

  /**
   * @param {{ levelId?: string, targetConcept?: string, additionalContext?: Record<string, unknown> }} p
   */
  hintRequest(p) {
    hintCount++;
    const levelId = p.levelId ?? sessionLevelId ?? undefined;
    const targetConcept = p.targetConcept ?? sessionTargetConcept ?? undefined;
    postAssistantPayload({
      gameId: config.gameId,
      levelId,
      eventType: 'hint_request',
      targetConcept,
      hintCount,
      timeSpentSeconds: elapsedSeconds(),
      additionalContext: p.additionalContext,
    });
  },
};
