const { validateTurn, validateDraw, validateBank, validatePlay, validateKillTarget } = require('../../../src/game/validation');
const { createInitialState } = require('../../../src/game/setup');
const { ZONES } = require('../../../src/game/constants');

describe('validation', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  describe('validateTurn', () => {
    it('should accept current player with actions', () => {
      expect(validateTurn(state, 1).valid).toBe(true);
    });

    it('should reject wrong player', () => {
      const result = validateTurn(state, 2);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Not your turn');
    });

    it('should reject when no actions remaining', () => {
      state.turn.actionsRemaining = 0;
      const result = validateTurn(state, 1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('No actions');
    });

    it('should reject dead player', () => {
      state.playerAlive[1] = false;
      const result = validateTurn(state, 1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('dead');
    });

    it('should reject during active reaction', () => {
      state.reactionState = { active: true };
      const result = validateTurn(state, 1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('reaction');
    });

    it('should reject when game not started', () => {
      state.turn.gameStarted = false;
      const result = validateTurn(state, 1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not started');
    });
  });

  describe('validateDraw', () => {
    it('should accept valid draw', () => {
      expect(validateDraw(state, 1).valid).toBe(true);
    });

    it('should reject when draw pile is empty', () => {
      state.zones[ZONES.draw] = [];
      const result = validateDraw(state, 1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });
  });

  describe('validateBank', () => {
    it('should accept valid bank', () => {
      const card = state.zones[ZONES.playerHand(1)][0];
      expect(validateBank(state, 1, card).valid).toBe(true);
    });

    it('should reject card not in hand', () => {
      const result = validateBank(state, 1, 9999);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not in your hand');
    });
  });

  describe('validatePlay', () => {
    it('should accept valid play of free card', () => {
      // Find a greed card in P1's hand (cost 0)
      const hand = state.zones[ZONES.playerHand(1)];
      let greedObfId = null;
      for (const obfId of hand) {
        if (state.cardMap[obfId]?.name === 'greed') {
          greedObfId = obfId;
          break;
        }
      }

      if (greedObfId) {
        const result = validatePlay(state, 1, greedObfId);
        expect(result.valid).toBe(true);
        expect(result.cardInfo.name).toBe('greed');
      }
    });

    it('should reject card not in hand', () => {
      const result = validatePlay(state, 1, 9999);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not in your hand');
    });

    it('should reject if cannot afford card cost', () => {
      // Put an expensive card in P1's hand with empty bank
      // Find a card with cost > 0 in hand
      const hand = state.zones[ZONES.playerHand(1)];
      let expensiveCard = null;
      for (const obfId of hand) {
        if (state.cardMap[obfId]?.cost > 0) {
          expensiveCard = obfId;
          break;
        }
      }

      if (expensiveCard) {
        // Bank is empty, can't afford
        const result = validatePlay(state, 1, expensiveCard);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Cannot afford');
      }
    });

    it('should reject dead target', () => {
      state.playerAlive[2] = false;
      // Give P1 enough bank to afford any card
      const drawPile = state.zones[ZONES.draw];
      state.zones[ZONES.playerBank(1)] = drawPile.splice(0, 10);
      const card = state.zones[ZONES.playerHand(1)][0];
      const result = validatePlay(state, 1, card, 2);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('dead');
    });

    it('should reject invalid target player number', () => {
      // Use a card we know is free (cost 0) so cost check doesn't interfere
      // Find a greed card or just set bank high enough
      const hand = state.zones[ZONES.playerHand(1)];
      // Give P1 enough bank to afford any card
      const drawPile = state.zones[ZONES.draw];
      state.zones[ZONES.playerBank(1)] = drawPile.splice(0, 10);
      const card = hand[0];
      const result = validatePlay(state, 1, card, 5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid target');
    });
  });

  describe('validateKillTarget', () => {
    it('heavy hand: should accept target with 6+ hand cards', () => {
      // Give P2 6 cards in hand
      state.zones[ZONES.playerHand(2)] = [1, 2, 3, 4, 5, 6];
      const result = validateKillTarget(state, 'heavy hand', 2);
      expect(result.valid).toBe(true);
    });

    it('heavy hand: should reject target with < 6 hand cards', () => {
      state.zones[ZONES.playerHand(2)] = [1, 2, 3, 4, 5];
      const result = validateKillTarget(state, 'heavy hand', 2);
      expect(result.valid).toBe(false);
    });

    it('backfire: should accept target with 5+ hand cards', () => {
      state.zones[ZONES.playerHand(2)] = [1, 2, 3, 4, 5];
      const result = validateKillTarget(state, 'backfire', 2);
      expect(result.valid).toBe(true);
    });

    it('backfire: should reject target with < 5 hand cards', () => {
      state.zones[ZONES.playerHand(2)] = [1, 2, 3, 4];
      const result = validateKillTarget(state, 'backfire', 2);
      expect(result.valid).toBe(false);
    });

    it('bloodshot: should accept target with any red card in hand', () => {
      // Place a red-backed card ID in P2's hand
      // Red IDs are in range whiteCount+blueCount+1 to total
      // Find an actual red card obfId
      let redObfId = null;
      for (const [obfId, card] of Object.entries(state.cardMap)) {
        if (card.backColor === 'red') {
          redObfId = Number(obfId);
          break;
        }
      }
      state.zones[ZONES.playerHand(2)] = [redObfId];
      const result = validateKillTarget(state, 'bloodshot', 2);
      expect(result.valid).toBe(true);
    });

    it('bloodshot: should reject target with no red cards', () => {
      // Give P2 only white cards
      let whiteObfIds = [];
      for (const [obfId, card] of Object.entries(state.cardMap)) {
        if (card.backColor === 'white') whiteObfIds.push(Number(obfId));
        if (whiteObfIds.length >= 3) break;
      }
      state.zones[ZONES.playerHand(2)] = whiteObfIds;
      const result = validateKillTarget(state, 'bloodshot', 2);
      expect(result.valid).toBe(false);
    });

    it('red handed: should accept target with 2+ red cards in hand', () => {
      let redObfIds = [];
      for (const [obfId, card] of Object.entries(state.cardMap)) {
        if (card.backColor === 'red') redObfIds.push(Number(obfId));
        if (redObfIds.length >= 2) break;
      }
      state.zones[ZONES.playerHand(2)] = redObfIds;
      const result = validateKillTarget(state, 'red handed', 2);
      expect(result.valid).toBe(true);
    });

    it('red handed: should reject target with < 2 red cards', () => {
      let redObfId = null;
      for (const [obfId, card] of Object.entries(state.cardMap)) {
        if (card.backColor === 'red') { redObfId = Number(obfId); break; }
      }
      let whiteObfId = null;
      for (const [obfId, card] of Object.entries(state.cardMap)) {
        if (card.backColor === 'white') { whiteObfId = Number(obfId); break; }
      }
      state.zones[ZONES.playerHand(2)] = [redObfId, whiteObfId];
      const result = validateKillTarget(state, 'red handed', 2);
      expect(result.valid).toBe(false);
    });

    it('counterfeit: should accept target with 6+ bank cards', () => {
      state.zones[ZONES.playerBank(2)] = [1, 2, 3, 4, 5, 6];
      const result = validateKillTarget(state, 'counterfeit', 2);
      expect(result.valid).toBe(true);
    });

    it('counterfeit: should reject target with < 6 bank cards', () => {
      state.zones[ZONES.playerBank(2)] = [1, 2, 3, 4, 5];
      const result = validateKillTarget(state, 'counterfeit', 2);
      expect(result.valid).toBe(false);
    });

    it('gold digger: should accept target with 5+ bank cards', () => {
      state.zones[ZONES.playerBank(2)] = [1, 2, 3, 4, 5];
      const result = validateKillTarget(state, 'gold digger', 2);
      expect(result.valid).toBe(true);
    });

    it('gold digger: should reject target with < 5 bank cards', () => {
      state.zones[ZONES.playerBank(2)] = [1, 2, 3, 4];
      const result = validateKillTarget(state, 'gold digger', 2);
      expect(result.valid).toBe(false);
    });

    it('should reject dead target for any kill card', () => {
      state.playerAlive[2] = false;
      state.zones[ZONES.playerHand(2)] = [1, 2, 3, 4, 5, 6, 7];
      const result = validateKillTarget(state, 'heavy hand', 2);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('dead');
    });

    it('should reject non-kill card name', () => {
      const result = validateKillTarget(state, 'greed', 2);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not a kill card');
    });
  });
});
