const { createInitialState } = require('../../../src/game/setup');
const { ZONES } = require('../../../src/game/constants');

describe('setup', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  describe('createInitialState', () => {
    it('should return a state object with all required fields', () => {
      expect(state).toHaveProperty('version', 1);
      expect(state).toHaveProperty('cardMap');
      expect(state).toHaveProperty('markMap');
      expect(state).toHaveProperty('zones');
      expect(state).toHaveProperty('playerMemory');
      expect(state).toHaveProperty('turn');
      expect(state).toHaveProperty('playerAlive');
      expect(state).toHaveProperty('bountyState');
      expect(state).toHaveProperty('reactionState', null);
      expect(state).toHaveProperty('currentTurnNumber', 1);
    });

    it('should have all 20 zones initialized', () => {
      for (let p = 1; p <= 4; p++) {
        expect(state.zones).toHaveProperty(ZONES.playerHand(p));
        expect(state.zones).toHaveProperty(ZONES.playerBank(p));
        expect(state.zones).toHaveProperty(ZONES.playerMark(p));
        expect(state.zones).toHaveProperty(ZONES.playerEffect(p));
      }
      expect(state.zones).toHaveProperty(ZONES.draw);
      expect(state.zones).toHaveProperty(ZONES.discard);
      expect(state.zones).toHaveProperty(ZONES.bounty);
      expect(state.zones).toHaveProperty(ZONES.extraMark);
    });

    it('should deal exactly 1 mark to each player', () => {
      for (let p = 1; p <= 4; p++) {
        expect(state.zones[ZONES.playerMark(p)]).toHaveLength(1);
        const markId = state.zones[ZONES.playerMark(p)][0];
        expect(typeof markId).toBe('string');
        expect(markId).toMatch(/^M[1-5]$/);
      }
    });

    it('should place 1 mark in extra-mark zone', () => {
      expect(state.zones[ZONES.extraMark]).toHaveLength(1);
      const markId = state.zones[ZONES.extraMark][0];
      expect(markId).toMatch(/^M[1-5]$/);
    });

    it('all 5 mark obfuscation IDs should be unique and used', () => {
      const markIds = new Set();
      for (let p = 1; p <= 4; p++) {
        markIds.add(state.zones[ZONES.playerMark(p)][0]);
      }
      markIds.add(state.zones[ZONES.extraMark][0]);
      expect(markIds.size).toBe(5);
    });

    it('should deal 3 cards to each player hand', () => {
      for (let p = 1; p <= 4; p++) {
        expect(state.zones[ZONES.playerHand(p)]).toHaveLength(3);
      }
    });

    it('remaining cards should be in draw pile', () => {
      const totalDealt = 4 * 3; // 3 cards × 4 players
      const drawPile = state.zones[ZONES.draw];
      expect(drawPile).toHaveLength(48 - totalDealt); // 48 non-mark cards - 12 dealt = 36
    });

    it('banks, effects, discard, bounty zones should be empty', () => {
      for (let p = 1; p <= 4; p++) {
        expect(state.zones[ZONES.playerBank(p)]).toHaveLength(0);
        expect(state.zones[ZONES.playerEffect(p)]).toHaveLength(0);
      }
      expect(state.zones[ZONES.discard]).toHaveLength(0);
      expect(state.zones[ZONES.bounty]).toHaveLength(0);
    });

    it('total cards across all zones should equal 48', () => {
      let total = 0;
      for (let p = 1; p <= 4; p++) {
        total += state.zones[ZONES.playerHand(p)].length;
        total += state.zones[ZONES.playerBank(p)].length;
        total += state.zones[ZONES.playerEffect(p)].length;
      }
      total += state.zones[ZONES.draw].length;
      total += state.zones[ZONES.discard].length;
      total += state.zones[ZONES.bounty].length;
      expect(total).toBe(48);
    });

    it('all card obfuscation IDs should be unique across zones', () => {
      const allIds = new Set();
      for (const zone of Object.values(state.zones)) {
        for (const id of zone) {
          if (typeof id === 'string' && id.startsWith('M')) continue; // skip marks
          expect(allIds.has(id)).toBe(false);
          allIds.add(id);
        }
      }
      expect(allIds.size).toBe(48);
    });

    it('cardMap should have 48 entries (non-mark cards)', () => {
      expect(Object.keys(state.cardMap)).toHaveLength(48);
    });

    it('markMap should have 5 entries', () => {
      expect(Object.keys(state.markMap)).toHaveLength(5);
    });

    describe('initial memory', () => {
      it('each player should NOT know their own mark at start', () => {
        for (let p = 1; p <= 4; p++) {
          const markId = state.zones[ZONES.playerMark(p)][0];
          expect(state.playerMemory[p][markId]).toBeUndefined();
        }
      });

      it('each player should know their 5 hand cards', () => {
        for (let p = 1; p <= 4; p++) {
          const hand = state.zones[ZONES.playerHand(p)];
          for (const obfId of hand) {
            expect(state.playerMemory[p][String(obfId)]).toBeDefined();
            expect(state.playerMemory[p][String(obfId)]).toHaveProperty('name');
          }
        }
      });

      it('each player should know exactly 3 things initially (3 hand cards)', () => {
        for (let p = 1; p <= 4; p++) {
          expect(Object.keys(state.playerMemory[p])).toHaveLength(3);
        }
      });

      it('player should NOT know other players\' marks', () => {
        const p1MarkId = state.zones[ZONES.playerMark(1)][0];
        expect(state.playerMemory[2][p1MarkId]).toBeUndefined();
        expect(state.playerMemory[3][p1MarkId]).toBeUndefined();
        expect(state.playerMemory[4][p1MarkId]).toBeUndefined();
      });

      it('player should NOT know other players\' hand cards', () => {
        const p1Hand = state.zones[ZONES.playerHand(1)];
        for (const obfId of p1Hand) {
          expect(state.playerMemory[2][String(obfId)]).toBeUndefined();
        }
      });

      it('no player should know the extra mark', () => {
        const extraMarkId = state.zones[ZONES.extraMark][0];
        for (let p = 1; p <= 4; p++) {
          expect(state.playerMemory[p][extraMarkId]).toBeUndefined();
        }
      });
    });

    describe('turn state', () => {
      it('should start with player 1', () => {
        expect(state.turn.currentPlayerNum).toBe(1);
      });

      it('should have 3 actions remaining', () => {
        expect(state.turn.actionsRemaining).toBe(3);
      });

      it('should be marked as started', () => {
        expect(state.turn.gameStarted).toBe(true);
      });
    });

    it('all players should be alive', () => {
      for (let p = 1; p <= 4; p++) {
        expect(state.playerAlive[p]).toBe(true);
      }
    });

    it('should produce different card distributions on repeated calls', () => {
      const state2 = createInitialState();
      // Compare first few hand cards - extremely unlikely to be identical
      const hand1a = state.zones[ZONES.playerHand(1)];
      const hand1b = state2.zones[ZONES.playerHand(1)];
      const same = hand1a.every((id, i) => id === hand1b[i]);
      // This could theoretically fail but probability is astronomically low
      expect(same).toBe(false);
    });
  });
});
