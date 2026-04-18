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
