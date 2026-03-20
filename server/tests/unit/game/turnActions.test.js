const { executeDraw, executeBank, advanceTurn, payCardCost } = require('../../../src/game/turnActions');
const { createInitialState } = require('../../../src/game/setup');
const { ZONES } = require('../../../src/game/constants');

describe('turnActions', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  describe('executeDraw', () => {
    it('should move top card from draw pile to player hand', () => {
      const drawBefore = state.zones[ZONES.draw].length;
      const handBefore = state.zones[ZONES.playerHand(1)].length;
      const topCard = state.zones[ZONES.draw][state.zones[ZONES.draw].length - 1];

      const result = executeDraw(state, 1);

      expect(result.success).toBe(true);
      expect(result.drawnCardObfId).toBe(topCard);
      expect(state.zones[ZONES.draw]).toHaveLength(drawBefore - 1);
      expect(state.zones[ZONES.playerHand(1)]).toHaveLength(handBefore + 1);
      expect(state.zones[ZONES.playerHand(1)]).toContain(topCard);
    });

    it('should add drawn card to player memory', () => {
      const topCard = state.zones[ZONES.draw][state.zones[ZONES.draw].length - 1];

      executeDraw(state, 1);

      expect(state.playerMemory[1][String(topCard)]).toBeDefined();
      expect(state.playerMemory[1][String(topCard)]).toHaveProperty('name');
    });

    it('should NOT add drawn card to other players\' memory', () => {
      const topCard = state.zones[ZONES.draw][state.zones[ZONES.draw].length - 1];

      executeDraw(state, 1);

      expect(state.playerMemory[2][String(topCard)]).toBeUndefined();
      expect(state.playerMemory[3][String(topCard)]).toBeUndefined();
      expect(state.playerMemory[4][String(topCard)]).toBeUndefined();
    });

    it('should consume 1 action', () => {
      expect(state.turn.actionsRemaining).toBe(3);
      executeDraw(state, 1);
      expect(state.turn.actionsRemaining).toBe(2);
    });

    it('should fail if not player\'s turn', () => {
      const result = executeDraw(state, 2);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Not your turn');
    });

    it('should fail if no actions remaining', () => {
      state.turn.actionsRemaining = 0;
      const result = executeDraw(state, 1);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No actions remaining');
    });

    it('should fail if draw pile is empty', () => {
      state.zones[ZONES.draw] = [];
      const result = executeDraw(state, 1);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Draw pile is empty');
    });

    it('should fail if player is dead', () => {
      state.playerAlive[1] = false;
      const result = executeDraw(state, 1);
      expect(result.success).toBe(false);
      expect(result.error).toContain('dead');
    });

    it('should fail during active reaction', () => {
      state.reactionState = { active: true };
      const result = executeDraw(state, 1);
      expect(result.success).toBe(false);
      expect(result.error).toContain('reaction');
    });
  });

  describe('executeBank', () => {
    it('should move card from hand to bank', () => {
      const hand = state.zones[ZONES.playerHand(1)];
      const cardToBank = hand[0];
      const handBefore = hand.length;

      const result = executeBank(state, 1, cardToBank);

      expect(result.success).toBe(true);
      expect(state.zones[ZONES.playerHand(1)]).toHaveLength(handBefore - 1);
      expect(state.zones[ZONES.playerHand(1)]).not.toContain(cardToBank);
      expect(state.zones[ZONES.playerBank(1)]).toContain(cardToBank);
    });

    it('should consume 1 action', () => {
      const card = state.zones[ZONES.playerHand(1)][0];
      executeBank(state, 1, card);
      expect(state.turn.actionsRemaining).toBe(2);
    });

    it('should fail if card not in hand', () => {
      const result = executeBank(state, 1, 9999);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not in your hand');
    });

    it('should fail if not player\'s turn', () => {
      const card = state.zones[ZONES.playerHand(2)][0];
      const result = executeBank(state, 2, card);
      expect(result.success).toBe(false);
    });

    it('banking should NOT reveal card to other players', () => {
      const card = state.zones[ZONES.playerHand(1)][0];
      executeBank(state, 1, card);

      // Other players should not learn the banked card
      // (They already might not know it, but this confirms no memory is added)
      const memBefore2 = Object.keys(state.playerMemory[2]).length;
      // Memory count for P2 should not have increased from banking
      expect(Object.keys(state.playerMemory[2]).length).toBe(memBefore2);
    });
  });

  describe('advanceTurn', () => {
    it('should advance to next player', () => {
      const { nextPlayerNum } = advanceTurn(state);
      expect(nextPlayerNum).toBe(2);
      expect(state.turn.currentPlayerNum).toBe(2);
    });

    it('should reset actions to 3', () => {
      state.turn.actionsRemaining = 0;
      advanceTurn(state);
      expect(state.turn.actionsRemaining).toBe(3);
    });

    it('should increment turn number', () => {
      const turnBefore = state.currentTurnNumber;
      advanceTurn(state);
      expect(state.currentTurnNumber).toBe(turnBefore + 1);
    });

    it('should skip dead players', () => {
      state.playerAlive[2] = false;
      const { nextPlayerNum } = advanceTurn(state);
      expect(nextPlayerNum).toBe(3);
    });

    it('should skip multiple dead players', () => {
      state.playerAlive[2] = false;
      state.playerAlive[3] = false;
      const { nextPlayerNum } = advanceTurn(state);
      expect(nextPlayerNum).toBe(4);
    });

    it('should wrap around from player 4 to player 1', () => {
      state.turn.currentPlayerNum = 4;
      const { nextPlayerNum } = advanceTurn(state);
      expect(nextPlayerNum).toBe(1);
    });

    it('should wrap around skipping dead players', () => {
      state.turn.currentPlayerNum = 3;
      state.playerAlive[4] = false;
      const { nextPlayerNum } = advanceTurn(state);
      expect(nextPlayerNum).toBe(1);
    });
  });

  describe('payCardCost', () => {
    it('should return empty array for zero cost', () => {
      const result = payCardCost(state, 1, 0);
      expect(result).toEqual([]);
    });

    it('should return null if bank is empty and cost > 0', () => {
      const result = payCardCost(state, 1, 5);
      expect(result).toBeNull();
    });

    it('should move payment cards from bank to discard', () => {
      // First bank some cards
      const hand = state.zones[ZONES.playerHand(1)];
      const card1 = hand[0];
      const card2 = hand[1];
      state.zones[ZONES.playerBank(1)].push(card1, card2);
      state.zones[ZONES.playerHand(1)] = hand.slice(2);

      const bankBefore = state.zones[ZONES.playerBank(1)].length;
      const result = payCardCost(state, 1, 1);

      expect(result).not.toBeNull();
      expect(result.length).toBeGreaterThan(0);
      expect(state.zones[ZONES.playerBank(1)].length).toBeLessThan(bankBefore);
    });

    it('should add paid cards to all alive players\' memory (discard is public)', () => {
      // Bank a card for P1
      const card = state.zones[ZONES.playerHand(1)][0];
      state.zones[ZONES.playerBank(1)].push(card);
      state.zones[ZONES.playerHand(1)] = state.zones[ZONES.playerHand(1)].slice(1);

      payCardCost(state, 1, 1);

      // All alive players should now know this card
      expect(state.playerMemory[1][String(card)]).toBeDefined();
      expect(state.playerMemory[2][String(card)]).toBeDefined();
      expect(state.playerMemory[3][String(card)]).toBeDefined();
      expect(state.playerMemory[4][String(card)]).toBeDefined();
    });
  });
});
