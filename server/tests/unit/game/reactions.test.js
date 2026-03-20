const { createInitialState } = require('../../../src/game/setup');
const { ZONES } = require('../../../src/game/constants');
const { getCardValue } = require('../../../src/game/cardUtils');

let reactions;

beforeAll(() => {
  reactions = require('../../../src/game/reactions');
});

/**
 * Helper: force a card into a player's hand by name.
 */
function forceCardInHand(state, playerNum, cardName) {
  for (const [obfIdStr, card] of Object.entries(state.cardMap)) {
    if (card.name === cardName) {
      const obfId = Number(obfIdStr);
      for (const zone of Object.values(state.zones)) {
        const idx = zone.indexOf(obfId);
        if (idx !== -1) { zone.splice(idx, 1); break; }
      }
      state.zones[ZONES.playerHand(playerNum)].push(obfId);
      return obfId;
    }
  }
  return null;
}

/**
 * Helper: give player enough bank value.
 */
function ensureBankValue(state, playerNum, minValue) {
  const bank = state.zones[ZONES.playerBank(playerNum)];
  let currentValue = 0;
  for (const obfId of bank) {
    currentValue += getCardValue(state.cardMap[obfId]?.name);
  }
  while (currentValue < minValue && state.zones[ZONES.draw].length > 0) {
    const obfId = state.zones[ZONES.draw].pop();
    bank.push(obfId);
    currentValue += getCardValue(state.cardMap[obfId]?.name);
  }
  return currentValue;
}

/**
 * Helper: find all obfIds for a given card name.
 */
function findAllByName(state, cardName) {
  const ids = [];
  for (const [obfIdStr, card] of Object.entries(state.cardMap)) {
    if (card.name === cardName) ids.push(Number(obfIdStr));
  }
  return ids;
}

/**
 * Helper: place a specific obfId into a player's hand (removing from current zone).
 */
function placeInHand(state, playerNum, obfId) {
  for (const zone of Object.values(state.zones)) {
    const idx = zone.indexOf(obfId);
    if (idx !== -1) { zone.splice(idx, 1); break; }
  }
  state.zones[ZONES.playerHand(playerNum)].push(obfId);
}

/**
 * Helper: find N distinct cards of a given name in the cardMap and place in hand.
 */
function forceMultipleInHand(state, playerNum, cardName, count) {
  const ids = [];
  let found = 0;
  for (const [obfIdStr, card] of Object.entries(state.cardMap)) {
    if (card.name === cardName && found < count) {
      const obfId = Number(obfIdStr);
      for (const zone of Object.values(state.zones)) {
        const idx = zone.indexOf(obfId);
        if (idx !== -1) { zone.splice(idx, 1); break; }
      }
      state.zones[ZONES.playerHand(playerNum)].push(obfId);
      ids.push(obfId);
      found++;
    }
  }
  return ids;
}

// ============================================================
// Reaction framework tests
// ============================================================
describe('reactions', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  describe('startReactionWindow', () => {
    it('should set reactionState as active', () => {
      // P1 played unmasked targeting P2
      const cardId = forceCardInHand(state, 1, 'unmasked');
      reactions.startReactionWindow(state, cardId, 1, 2, 'peek', false);
      expect(state.reactionState).not.toBeNull();
      expect(state.reactionState.active).toBe(true);
    });

    it('should store card, player, target, and effect type', () => {
      const cardId = forceCardInHand(state, 1, 'unmasked');
      reactions.startReactionWindow(state, cardId, 1, 2, 'peek', false);

      expect(state.reactionState.cardObfId).toBe(cardId);
      expect(state.reactionState.playerId).toBe(1);
      expect(state.reactionState.targetId).toBe(2);
      expect(state.reactionState.effectType).toBe('peek');
      expect(state.reactionState.isLethal).toBe(false);
    });

    it('should initialize empty responses and reaction chain', () => {
      const cardId = forceCardInHand(state, 1, 'unmasked');
      reactions.startReactionWindow(state, cardId, 1, 2, 'peek', false);

      expect(state.reactionState.responses).toEqual({});
      expect(state.reactionState.reactionChain).toHaveLength(1); // original card
      expect(state.reactionState.reactionChain[0].isOriginal).toBe(true);
    });
  });

  describe('getEligibleReactors', () => {
    it('peek: target can use blind spot or revenge; others use snub', () => {
      // Give P2 (target) a blind spot + bank, P3 a snub + bank
      forceCardInHand(state, 2, 'blind spot');
      ensureBankValue(state, 2, 5);
      forceCardInHand(state, 3, 'snub');
      ensureBankValue(state, 3, 5);

      const eligible = reactions.getEligibleReactors(state, 1, 2, 'peek', false);

      expect(eligible).toContain(2); // blind spot
      expect(eligible).toContain(3); // snub
      expect(eligible).not.toContain(1); // caster can't react to own card
    });

    it('peek: target with revenge is eligible', () => {
      forceCardInHand(state, 2, 'revenge');
      ensureBankValue(state, 2, 5);

      const eligible = reactions.getEligibleReactors(state, 1, 2, 'peek', false);
      expect(eligible).toContain(2);
    });

    it('non-peek: all non-caster alive players with snub can react', () => {
      // Place 2 distinct snub cards: one for P2, one for P3
      const allSnubIds = findAllByName(state, 'snub');
      placeInHand(state, 2, allSnubIds[0]);
      placeInHand(state, 3, allSnubIds[1]);
      ensureBankValue(state, 2, 5);
      ensureBankValue(state, 3, 5);

      const eligible = reactions.getEligibleReactors(state, 1, 2, 'skip', false);
      expect(eligible).toContain(2);
      expect(eligible).toContain(3);
      expect(eligible).not.toContain(1);
    });

    it('should exclude dead players', () => {
      state.playerAlive[3] = false;
      forceCardInHand(state, 3, 'snub');
      ensureBankValue(state, 3, 5);

      const eligible = reactions.getEligibleReactors(state, 1, 2, 'skip', false);
      expect(eligible).not.toContain(3);
    });

    it('should exclude players who cannot afford reaction cost', () => {
      forceCardInHand(state, 2, 'snub'); // cost 5
      state.zones[ZONES.playerBank(2)] = []; // no bank = can't afford

      const eligible = reactions.getEligibleReactors(state, 1, 2, 'skip', false);
      expect(eligible).not.toContain(2);
    });

    it('should return empty array when no one can react', () => {
      // No one has reaction cards
      const eligible = reactions.getEligibleReactors(state, 1, 2, 'skip', false);
      expect(eligible).toHaveLength(0);
    });
  });

  describe('canPlayerReact', () => {
    it('should return true when player has reaction card and can afford', () => {
      forceCardInHand(state, 2, 'snub');
      ensureBankValue(state, 2, 5);

      expect(reactions.canPlayerReact(state, 2, 'skip')).toBe(true);
    });

    it('should return false when player has no reaction cards', () => {
      expect(reactions.canPlayerReact(state, 2, 'skip')).toBe(false);
    });

    it('should return false when player can\'t afford reaction cost', () => {
      forceCardInHand(state, 2, 'snub');
      state.zones[ZONES.playerBank(2)] = [];

      expect(reactions.canPlayerReact(state, 2, 'skip')).toBe(false);
    });

    it('should recognize blind spot for peek effects (target only)', () => {
      forceCardInHand(state, 2, 'blind spot');
      ensureBankValue(state, 2, 2);

      expect(reactions.canPlayerReact(state, 2, 'peek', 2)).toBe(true);
    });

    it('should recognize revenge for peek effects (target only)', () => {
      forceCardInHand(state, 2, 'revenge');
      ensureBankValue(state, 2, 2);

      expect(reactions.canPlayerReact(state, 2, 'peek', 2)).toBe(true);
    });
  });

  describe('getValidReactionCards', () => {
    it('should return snub for non-peek effects', () => {
      const cards = reactions.getValidReactionCards('skip', false, 2, 2);
      expect(cards).toContain('snub');
      expect(cards).not.toContain('blind spot');
      expect(cards).not.toContain('revenge');
    });

    it('should return snub, blind spot, revenge for peek (target)', () => {
      const cards = reactions.getValidReactionCards('peek', false, 2, 2);
      expect(cards).toContain('snub');
      expect(cards).toContain('blind spot');
      expect(cards).toContain('revenge');
    });

    it('should return only snub for peek (non-target)', () => {
      const cards = reactions.getValidReactionCards('peek', false, 3, 2);
      expect(cards).toContain('snub');
      expect(cards).not.toContain('blind spot');
      expect(cards).not.toContain('revenge');
    });
  });

  describe('getValidCounterCards', () => {
    it('snub can be countered by snub', () => {
      const counters = reactions.getValidCounterCards('snub');
      expect(counters).toContain('snub');
    });

    it('blind spot can be countered by snub', () => {
      const counters = reactions.getValidCounterCards('blind spot');
      expect(counters).toContain('snub');
    });

    it('revenge can be countered by snub or blind spot', () => {
      const counters = reactions.getValidCounterCards('revenge');
      expect(counters).toContain('snub');
      expect(counters).toContain('blind spot');
    });
  });

  describe('submitReactionResponse', () => {
    it('should record a player\'s reaction response', () => {
      const cardId = forceCardInHand(state, 1, 'unmasked');
      const snubId = forceCardInHand(state, 3, 'snub');
      ensureBankValue(state, 3, 5);

      reactions.startReactionWindow(state, cardId, 1, 2, 'peek', false);
      reactions.submitReactionResponse(state, 3, snubId);

      expect(state.reactionState.responses[3]).toBeDefined();
      expect(state.reactionState.reactionChain).toHaveLength(2);
    });

    it('should record pass (null response)', () => {
      const cardId = forceCardInHand(state, 1, 'unmasked');
      reactions.startReactionWindow(state, cardId, 1, 2, 'peek', false);
      reactions.submitReactionResponse(state, 3, null);

      expect(state.reactionState.responses[3]).toBeNull();
    });
  });

  describe('resolveReactionChain', () => {
    it('no reactions: original effect executes', () => {
      const cardId = forceCardInHand(state, 1, 'unmasked');
      reactions.startReactionWindow(state, cardId, 1, 2, 'peek', false);

      const result = reactions.resolveReactionChain(state);
      expect(result.blocked).toBe(false);
      expect(result.execute).toBe(true);
    });

    it('1 reaction (odd): original blocked', () => {
      const cardId = forceCardInHand(state, 1, 'unmasked');
      const snubId = forceCardInHand(state, 3, 'snub');
      ensureBankValue(state, 3, 5);

      reactions.startReactionWindow(state, cardId, 1, 2, 'peek', false);
      reactions.submitReactionResponse(state, 3, snubId);

      const result = reactions.resolveReactionChain(state);
      expect(result.blocked).toBe(true);
      expect(result.execute).toBe(false);
    });

    it('2 reactions (even): original executes', () => {
      const cardId = forceCardInHand(state, 1, 'unmasked');
      const snubId1 = forceMultipleInHand(state, 3, 'snub', 1)[0];
      ensureBankValue(state, 3, 5);
      const snubId2 = forceMultipleInHand(state, 4, 'snub', 1)[0];
      ensureBankValue(state, 4, 5);

      reactions.startReactionWindow(state, cardId, 1, 2, 'peek', false);
      reactions.submitReactionResponse(state, 3, snubId1);
      reactions.submitReactionResponse(state, 4, snubId2);

      const result = reactions.resolveReactionChain(state);
      expect(result.blocked).toBe(false);
      expect(result.execute).toBe(true);
    });

    it('3 reactions (odd): original blocked', () => {
      const cardId = forceCardInHand(state, 1, 'tied up');
      const snubIds2 = forceMultipleInHand(state, 2, 'snub', 2);
      ensureBankValue(state, 2, 10);
      const snubId3 = forceMultipleInHand(state, 3, 'snub', 1)[0];
      ensureBankValue(state, 3, 5);

      reactions.startReactionWindow(state, cardId, 1, 2, 'skip', false);
      reactions.submitReactionResponse(state, 2, snubIds2[0]); // 1st reaction
      reactions.submitReactionResponse(state, 3, snubId3);      // 2nd reaction (counters 1st)
      reactions.submitReactionResponse(state, 2, snubIds2[1]); // 3rd reaction (counters 2nd)

      const result = reactions.resolveReactionChain(state);
      expect(result.blocked).toBe(true);
      expect(result.execute).toBe(false);
    });

    it('should move all reaction cards to discard', () => {
      const cardId = forceCardInHand(state, 1, 'unmasked');
      const snubId = forceCardInHand(state, 3, 'snub');
      ensureBankValue(state, 3, 5);

      reactions.startReactionWindow(state, cardId, 1, 2, 'peek', false);
      reactions.submitReactionResponse(state, 3, snubId);

      reactions.resolveReactionChain(state);

      // Snub card should be in discard
      expect(state.zones[ZONES.discard]).toContain(snubId);
      expect(state.zones[ZONES.playerHand(3)]).not.toContain(snubId);
    });

    it('should pay cost for reaction cards', () => {
      const cardId = forceCardInHand(state, 1, 'unmasked');
      const snubId = forceCardInHand(state, 3, 'snub');
      const bankBefore = state.zones[ZONES.playerBank(3)].length;
      ensureBankValue(state, 3, 5);
      const bankAfterEnsure = state.zones[ZONES.playerBank(3)].length;

      reactions.startReactionWindow(state, cardId, 1, 2, 'peek', false);
      reactions.submitReactionResponse(state, 3, snubId);

      reactions.resolveReactionChain(state);

      // Bank should have fewer cards (paid for snub cost 5)
      expect(state.zones[ZONES.playerBank(3)].length).toBeLessThan(bankAfterEnsure);
    });

    it('should reveal reaction cards to all players (memory)', () => {
      const cardId = forceCardInHand(state, 1, 'unmasked');
      const snubId = forceCardInHand(state, 3, 'snub');
      ensureBankValue(state, 3, 5);

      reactions.startReactionWindow(state, cardId, 1, 2, 'peek', false);
      reactions.submitReactionResponse(state, 3, snubId);

      reactions.resolveReactionChain(state);

      // All alive players should know the snub card
      for (let p = 1; p <= 4; p++) {
        if (state.playerAlive[p]) {
          expect(state.playerMemory[p][String(snubId)]).toBeDefined();
          expect(state.playerMemory[p][String(snubId)].name).toBe('snub');
        }
      }
    });

    it('should clear reactionState after resolution', () => {
      const cardId = forceCardInHand(state, 1, 'unmasked');
      reactions.startReactionWindow(state, cardId, 1, 2, 'peek', false);

      reactions.resolveReactionChain(state);
      expect(state.reactionState).toBeNull();
    });
  });
});
