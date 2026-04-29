import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('assistant-bridge portal handshake', () => {
  describe('inside portal iframe', () => {
    let postMessage;
    let bridge;

    beforeEach(async () => {
      postMessage = vi.fn();
      vi.stubGlobal('window', { parent: { postMessage } });
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
        levelId: 'level-1',
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

    it('defaults mistakeCategory to general_mistake when omitted', () => {
      bridge.onIncorrect({
        levelId: 'level-2',
        concept: 'x',
        playerAnswer: 'a',
        correctAnswer: 'b',
      });
      expect(postMessage.mock.calls[0][0].payload.mistakeCategory).toBe('general_mistake');
    });

    it('posts correct_submission and JSON-stringifies object answers', () => {
      bridge.onCorrect({
        levelId: 'level-1',
        concept: 'c',
        playerAnswer: { a: 1, b: 2 },
      });
      const p = postMessage.mock.calls[0][0].payload;
      expect(p.eventType).toBe('correct_submission');
      expect(p.playerAnswer).toBe('{"a":1,"b":2}');
    });

    it('posts level_complete', () => {
      bridge.onLevelComplete({ levelId: 'level-3', concept: 'inverse_matrix' });
      expect(postMessage.mock.calls[0][0].payload.eventType).toBe('level_complete');
    });

    it('posts timeout with undefined answers when absent', () => {
      bridge.onTimeout({ levelId: 'level-1', concept: 'c' });
      const p = postMessage.mock.calls[0][0].payload;
      expect(p.eventType).toBe('timeout');
      expect(p.playerAnswer).toBeUndefined();
      expect(p.correctAnswer).toBeUndefined();
    });

    it('posts timeout with stringified answers when present', () => {
      bridge.onTimeout({
        levelId: 'level-1',
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
      bridge.onHintRequest({ levelId: 'level-1', concept: 'c' });
      bridge.onHintRequest({ levelId: 'level-1', concept: 'c' });
      expect(postMessage.mock.calls[0][0].payload.hintCount).toBe(1);
      expect(postMessage.mock.calls[1][0].payload.hintCount).toBe(2);
    });

    it('reports rounded elapsed seconds since level start', () => {
      let t = 1_000_000;
      vi.spyOn(Date, 'now').mockImplementation(() => t);
      bridge.onLevelStart('level-1', 'concept');
      t += 3_500;
      bridge.onCorrect({ levelId: 'level-1', concept: 'concept', playerAnswer: 'ok' });
      expect(postMessage.mock.calls[1][0].payload.timeSpentSeconds).toBe(4);
    });

    it('resetProblem clears hint baseline for the next level start', () => {
      bridge.onHintRequest({ levelId: 'level-1', concept: 'a' });
      bridge.resetProblem();
      bridge.onLevelStart('level-2', 'b');
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

      bridge.onLevelStart('level-1', 'concept_x');
      expect(self.postMessage).not.toHaveBeenCalled();
    });
  });
});
