import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function lastAssistantPayload(postMessage) {
  const msgs = postMessage.mock.calls.map((c) => c[0]).filter((m) => m?.type === 'ASSISTANT_GAME_EVENT');
  return msgs.at(-1)?.payload;
}

function portalIframeWindow(postMessage) {
  return {
    parent: { postMessage },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

describe('assistant-bridge portal handshake', () => {
  describe('inside portal iframe', () => {
    let postMessage;
    let bridge;

    beforeEach(async () => {
      postMessage = vi.fn();
      vi.stubGlobal('window', portalIframeWindow(postMessage));
      vi.resetModules();
      ({ bridge } = await import('../../js/assistant-bridge.js'));
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('posts ASSISTANT_GAME_EVENT with incorrect_submission payload', () => {
      bridge.resetProblem();
      bridge.onIncorrect({
        levelId: 'level_1',
        concept: 'matrix_uniform_scaling',
        playerAnswer: '[[1,0],[0,1]]',
        correctAnswer: '[[2,0],[0,2]]',
        mistakeCategory: 'arithmetic_error',
        extra: { attempts: 2 },
      });

      expect(postMessage).toHaveBeenCalledTimes(1);
      const msg = postMessage.mock.calls[0][0];
      expect(msg.type).toBe('ASSISTANT_GAME_EVENT');
      expect(msg.payload.gameId).toBe('matrix-meadow');
      expect(msg.payload.eventType).toBe('incorrect_submission');
      expect(msg.payload.targetConcept).toBe('matrix_uniform_scaling');
      expect(msg.payload.mistakeCategory).toBe('arithmetic_error');
      expect(msg.payload.additionalContext).toEqual({ attempts: 2 });
    });

    it('sendStemAssistantEvent posts arbitrary eventType for hub use', async () => {
      const { sendStemAssistantEvent } = await import('../../js/assistant-bridge.js');
      sendStemAssistantEvent({
        eventType: 'recap_request',
        levelId: 'level_1',
        targetConcept: 'matrix_uniform_scaling',
      });
      const p = lastAssistantPayload(postMessage);
      expect(p.eventType).toBe('recap_request');
      expect(p.gameId).toBe('matrix-meadow');
    });

    it('defaults mistakeCategory to general_mistake when omitted', () => {
      bridge.onIncorrect({
        levelId: 'level_2',
        concept: 'x',
        playerAnswer: 'a',
        correctAnswer: 'b',
      });
      expect(postMessage.mock.calls[0][0].payload.mistakeCategory).toBe('general_mistake');
    });

    it('posts correct_submission and JSON-stringifies object answers', () => {
      bridge.onCorrect({
        levelId: 'level_1',
        concept: 'c',
        playerAnswer: { a: 1, b: 2 },
      });
      const p = postMessage.mock.calls[0][0].payload;
      expect(p.eventType).toBe('correct_submission');
      expect(p.playerAnswer).toBe('{"a":1,"b":2}');
    });

    it('posts level_complete', () => {
      bridge.onLevelComplete({ levelId: 'level_3', concept: 'inverse_matrix' });
      expect(postMessage.mock.calls[0][0].payload.eventType).toBe('level_complete');
    });

    it('posts timeout with undefined answers when absent', () => {
      bridge.onTimeout({ levelId: 'level_1', concept: 'c' });
      const p = postMessage.mock.calls[0][0].payload;
      expect(p.eventType).toBe('timeout');
      expect(p.playerAnswer).toBeUndefined();
      expect(p.correctAnswer).toBeUndefined();
    });

    it('posts timeout with stringified answers when present', () => {
      bridge.onTimeout({
        levelId: 'level_1',
        concept: 'c',
        playerAnswer: 42,
        correctAnswer: { x: 1 },
      });
      const p = postMessage.mock.calls[0][0].payload;
      expect(p.playerAnswer).toBe('42');
      // Object answers are JSON-stringified rather than coerced via String()
      // (which would produce the useless literal "[object Object]").
      expect(p.correctAnswer).toBe('{"x":1}');
    });

    it('increments hintCount across hint_request calls', () => {
      bridge.onHintRequest({ levelId: 'level_1', concept: 'c' });
      bridge.onHintRequest({ levelId: 'level_1', concept: 'c' });
      expect(postMessage.mock.calls[0][0].payload.hintCount).toBe(1);
      expect(postMessage.mock.calls[1][0].payload.hintCount).toBe(2);
    });

    it('posts score_update with leaderboard-friendly gameData fields', async () => {
      await bridge.onScoreUpdate({
        source: 'alignment',
        score: 123,
        stats: { levelReached: 4 },
      });

      const p = lastAssistantPayload(postMessage);
      expect(p.eventType).toBe('score_update');
      expect(p.score).toBe(123);
      expect(p.highScore).toBe(123);
      expect(p.additionalContext.gameData.highScore).toBe(123);
      expect(p.additionalContext.gameData.score).toBe(123);
      expect(p.additionalContext.gameData.matrixMeadow.highScore).toBe(123);
      expect(p.additionalContext.gameData.matrixMeadow.score).toBe(123);
      expect(p.additionalContext.gameData.matrixMeadow.multiplicationDrill.highScore).toBe(0);
      expect(p.additionalContext.gameData.matrixMeadow.vocabularyQuiz.highScore).toBe(0);
      expect(p.additionalContext.gameData.stats).toEqual({ levelReached: 4 });
    });

    it('reports rounded elapsed seconds since level start', () => {
      let t = 1_000_000;
      vi.spyOn(Date, 'now').mockImplementation(() => t);
      bridge.onLevelStart({ levelId: 'level_1', concept: 'concept' });
      t += 3_500;
      bridge.onCorrect({ levelId: 'level_1', concept: 'concept', playerAnswer: 'ok' });
      expect(postMessage.mock.calls[1][0].payload.timeSpentSeconds).toBe(4);
    });

    it('includes additionalContext on level_start when provided', () => {
      bridge.onLevelStart({
        levelId: 'level_2',
        concept: 'shear_transformation',
        additionalContext: {
          mode: 'monster_alignment',
          title: 'Level 3: Shear',
          objective: 'Horizontal shear b=1.5',
        },
      });
      const p = postMessage.mock.calls
        .map((c) => c[0].payload)
        .find((pl) => pl.eventType === 'level_start' && pl.levelId === 'level_2');
      expect(p).toBeDefined();
      expect(p.additionalContext.mode).toBe('monster_alignment');
      expect(p.additionalContext.title).toBe('Level 3: Shear');
    });

    it('restores persisted bridge scores across module reloads', async () => {
      const scoreKey = 'mm_bridge_score_v1';
      const storage = new Map();
      const localStorageMock = {
        getItem: vi.fn((k) => (storage.has(k) ? storage.get(k) : null)),
        setItem: vi.fn((k, v) => storage.set(k, v)),
      };

      vi.stubGlobal('localStorage', localStorageMock);

      await bridge.onScoreUpdate({
        source: 'alignment',
        score: 150,
        stats: { levelReached: 3 },
      });
      await bridge.onScoreUpdate({
        source: 'drill',
        score: 50,
        stats: { drillsSolved: 8 },
      });

      expect(storage.has(scoreKey)).toBe(true);
      const saved = JSON.parse(storage.get(scoreKey));
      expect(saved.alignment).toBe(150);
      expect(saved.drill).toBe(50);
      expect(saved.bestAlignment).toBe(150);
      expect(saved.bestDrill).toBe(50);

      vi.resetModules();
      ({ bridge } = await import('../../js/assistant-bridge.js'));

      await bridge.onScoreUpdate({
        source: 'quiz',
        score: 25,
        stats: { perfectRounds: 1 },
      });
      const payload = lastAssistantPayload(postMessage);
      expect(payload.eventType).toBe('score_update');
      expect(payload.score).toBe(150);
      expect(payload.highScore).toBe(150);
      expect(payload.additionalContext.gameData.matrixMeadow.multiplicationDrill.highScore).toBe(50);
      expect(payload.additionalContext.gameData.matrixMeadow.vocabularyQuiz.highScore).toBe(25);
      expect(payload.additionalContext.source).toBe('quiz');
    });

    it('falls back to empty score state when persisted JSON is invalid', async () => {
      const localStorageMock = {
        getItem: vi.fn(() => '{bad json'),
        setItem: vi.fn(),
      };
      vi.stubGlobal('localStorage', localStorageMock);

      vi.resetModules();
      ({ bridge } = await import('../../js/assistant-bridge.js'));

      await bridge.onScoreUpdate({ source: 'alignment', score: 40, stats: {} });
      const payload = lastAssistantPayload(postMessage);
      expect(payload.score).toBe(40);
      expect(payload.highScore).toBe(40);
    });

    it('resetProblem clears hint baseline for the next level start', () => {
      bridge.onHintRequest({ levelId: 'level_1', concept: 'a' });
      bridge.resetProblem();
      bridge.onLevelStart({ levelId: 'level_2', concept: 'b' });
      const startPayload = postMessage.mock.calls.find(
        (c) => c[0].payload.eventType === 'level_start',
      );
      expect(startPayload[0].payload.hintCount).toBe(0);
    });
  });

  describe('standalone dev', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('does not call postMessage when parent is the same window', async () => {
      vi.spyOn(console, 'debug').mockImplementation(() => {});
      const self = { postMessage: vi.fn() };
      self.parent = self;
      vi.stubGlobal('window', self);
      vi.resetModules();
      const { bridge } = await import('../../js/assistant-bridge.js');

      bridge.onLevelStart({ levelId: 'level_1', concept: 'concept_x' });
      expect(self.postMessage).not.toHaveBeenCalled();
    });
  });
});
