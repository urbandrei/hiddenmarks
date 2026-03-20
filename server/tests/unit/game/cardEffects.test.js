const { createInitialState } = require('../../../src/game/setup');
const { ZONES } = require('../../../src/game/constants');
const { getCardValue } = require('../../../src/game/cardUtils');

// We'll require cardEffects once it exists
let cardEffects;

beforeAll(() => {
  cardEffects = require('../../../src/game/cardEffects');
});

/**
 * Helper: find an obfuscation ID in a player's hand matching a given card name.
 */
function findCardInHand(state, playerNum, cardName) {
  const hand = state.zones[ZONES.playerHand(playerNum)];
  for (const obfId of hand) {
    if (state.cardMap[obfId]?.name === cardName) return obfId;
  }
  return null;
}

/**
 * Helper: forcefully place a specific card in a player's hand.
 * Finds any card with the given name in the cardMap, moves it to the hand.
 */
function forceCardInHand(state, playerNum, cardName) {
  for (const [obfIdStr, card] of Object.entries(state.cardMap)) {
    if (card.name === cardName) {
      const obfId = Number(obfIdStr);
      // Remove from any zone
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
 * Helper: forcefully place specific card in a player's bank.
 */
function forceCardInBank(state, playerNum, cardName) {
  for (const [obfIdStr, card] of Object.entries(state.cardMap)) {
    if (card.name === cardName) {
      const obfId = Number(obfIdStr);
      // Check if already placed somewhere we don't want
      for (const zone of Object.values(state.zones)) {
        const idx = zone.indexOf(obfId);
        if (idx !== -1) { zone.splice(idx, 1); break; }
      }
      state.zones[ZONES.playerBank(playerNum)].push(obfId);
      return obfId;
    }
  }
  return null;
}

/**
 * Helper: find all obfIds for a given card name in the cardMap.
 */
function findAllObfIds(state, cardName) {
  const ids = [];
  for (const [obfIdStr, card] of Object.entries(state.cardMap)) {
    if (card.name === cardName) ids.push(Number(obfIdStr));
  }
  return ids;
}

/**
 * Helper: give player enough bank value to afford a cost.
 */
function ensureBankValue(state, playerNum, minValue) {
  const bank = state.zones[ZONES.playerBank(playerNum)];
  let currentValue = 0;
  for (const obfId of bank) {
    currentValue += getCardValue(state.cardMap[obfId]?.name);
  }
  // Move cards from draw pile to bank until we have enough
  while (currentValue < minValue && state.zones[ZONES.draw].length > 0) {
    const obfId = state.zones[ZONES.draw].pop();
    bank.push(obfId);
    currentValue += getCardValue(state.cardMap[obfId]?.name);
  }
  return currentValue;
}

// ============================================================
// Step 0: executePlay framework
// ============================================================
describe('executePlay', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  it('should successfully play a free card (cost 0)', () => {
    const greedId = forceCardInHand(state, 1, 'greed');
    const result = cardEffects.executePlay(state, 1, greedId);
    expect(result.success).toBe(true);
    expect(result.cardInfo.name).toBe('greed');
  });

  it('should successfully play an expensive card when bank covers cost', () => {
    const cardId = forceCardInHand(state, 1, 'insomnia'); // cost 3
    ensureBankValue(state, 1, 3);
    const result = cardEffects.executePlay(state, 1, cardId);
    expect(result.success).toBe(true);
    expect(result.payment).not.toBeNull();
  });

  it('should move played card to discard', () => {
    const greedId = forceCardInHand(state, 1, 'greed');
    cardEffects.executePlay(state, 1, greedId);
    expect(state.zones[ZONES.discard]).toContain(greedId);
    expect(state.zones[ZONES.playerHand(1)]).not.toContain(greedId);
  });

  it('should add played card to ALL alive players\' memory', () => {
    const greedId = forceCardInHand(state, 1, 'greed');
    cardEffects.executePlay(state, 1, greedId);
    for (let p = 1; p <= 4; p++) {
      expect(state.playerMemory[p][String(greedId)]).toBeDefined();
      expect(state.playerMemory[p][String(greedId)].name).toBe('greed');
    }
  });

  it('should NOT add played card to dead players\' memory', () => {
    state.playerAlive[3] = false;
    const greedId = forceCardInHand(state, 1, 'greed');
    // Clear any pre-existing memory P3 might have from initial deal
    delete state.playerMemory[3][String(greedId)];
    cardEffects.executePlay(state, 1, greedId);
    expect(state.playerMemory[3][String(greedId)]).toBeUndefined();
  });

  it('should add payment cards to ALL alive players\' memory', () => {
    const cardId = forceCardInHand(state, 1, 'insomnia'); // cost 3
    ensureBankValue(state, 1, 3);
    const bankBefore = [...state.zones[ZONES.playerBank(1)]];
    const result = cardEffects.executePlay(state, 1, cardId);
    // Payment cards should now be known to all alive players
    for (const paidId of result.payment) {
      for (let p = 1; p <= 4; p++) {
        if (state.playerAlive[p]) {
          expect(state.playerMemory[p][String(paidId)]).toBeDefined();
        }
      }
    }
  });

  it('should consume 1 action', () => {
    const greedId = forceCardInHand(state, 1, 'greed');
    expect(state.turn.actionsRemaining).toBe(3);
    cardEffects.executePlay(state, 1, greedId);
    expect(state.turn.actionsRemaining).toBe(2);
  });

  it('should fail if not player\'s turn', () => {
    const cardId = forceCardInHand(state, 2, 'greed');
    const result = cardEffects.executePlay(state, 2, cardId);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should fail if card not in hand', () => {
    const result = cardEffects.executePlay(state, 1, 9999);
    expect(result.success).toBe(false);
  });

  it('should fail if cannot afford cost', () => {
    const cardId = forceCardInHand(state, 1, 'heavy hand'); // cost 10
    state.zones[ZONES.playerBank(1)] = []; // empty bank
    const result = cardEffects.executePlay(state, 1, cardId);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Cannot afford');
  });

  it('should fail if player is dead', () => {
    state.playerAlive[1] = false;
    const greedId = forceCardInHand(state, 1, 'greed');
    const result = cardEffects.executePlay(state, 1, greedId);
    expect(result.success).toBe(false);
  });

  it('should return cardInfo with name', () => {
    const greedId = forceCardInHand(state, 1, 'greed');
    const result = cardEffects.executePlay(state, 1, greedId);
    expect(result.cardInfo).toBeDefined();
    expect(result.cardInfo.name).toBe('greed');
  });
});

// ============================================================
// Step 1: Greed
// ============================================================
describe('effectGreed', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  it('should draw 2 cards from draw pile to hand', () => {
    const greedId = forceCardInHand(state, 1, 'greed');
    const handBefore = state.zones[ZONES.playerHand(1)].length;
    const drawBefore = state.zones[ZONES.draw].length;

    const playResult = cardEffects.executePlay(state, 1, greedId);
    cardEffects.effectGreed(state, 1);

    // Hand should have +2 cards (minus the greed card played, plus 2 drawn)
    // After executePlay: hand lost greedId. After effectGreed: hand gains 2.
    expect(state.zones[ZONES.playerHand(1)]).toHaveLength(handBefore - 1 + 2);
    expect(state.zones[ZONES.draw]).toHaveLength(drawBefore - 2);
  });

  it('should add both drawn cards to player memory', () => {
    const greedId = forceCardInHand(state, 1, 'greed');
    cardEffects.executePlay(state, 1, greedId);

    const drawPile = state.zones[ZONES.draw];
    const topTwo = [drawPile[drawPile.length - 1], drawPile[drawPile.length - 2]];

    cardEffects.effectGreed(state, 1);

    for (const obfId of topTwo) {
      expect(state.playerMemory[1][String(obfId)]).toBeDefined();
      expect(state.playerMemory[1][String(obfId)]).toHaveProperty('name');
    }
  });

  it('should NOT add drawn cards to other players\' memory', () => {
    const greedId = forceCardInHand(state, 1, 'greed');
    cardEffects.executePlay(state, 1, greedId);

    const drawPile = state.zones[ZONES.draw];
    const topTwo = [drawPile[drawPile.length - 1], drawPile[drawPile.length - 2]];

    cardEffects.effectGreed(state, 1);

    for (const obfId of topTwo) {
      expect(state.playerMemory[2][String(obfId)]).toBeUndefined();
      expect(state.playerMemory[3][String(obfId)]).toBeUndefined();
      expect(state.playerMemory[4][String(obfId)]).toBeUndefined();
    }
  });

  it('should handle draw pile with only 1 card', () => {
    const greedId = forceCardInHand(state, 1, 'greed');
    cardEffects.executePlay(state, 1, greedId);

    // Leave only 1 card in draw pile
    const remaining = state.zones[ZONES.draw].splice(0, state.zones[ZONES.draw].length - 1);
    state.zones[ZONES.discard].push(...remaining);

    const handBefore = state.zones[ZONES.playerHand(1)].length;
    const result = cardEffects.effectGreed(state, 1);

    expect(result.drawnCards).toHaveLength(1);
    expect(state.zones[ZONES.playerHand(1)]).toHaveLength(handBefore + 1);
    expect(state.zones[ZONES.draw]).toHaveLength(0);
  });

  it('should handle empty draw pile', () => {
    const greedId = forceCardInHand(state, 1, 'greed');
    cardEffects.executePlay(state, 1, greedId);

    // Empty the draw pile
    state.zones[ZONES.discard].push(...state.zones[ZONES.draw]);
    state.zones[ZONES.draw] = [];

    const handBefore = state.zones[ZONES.playerHand(1)].length;
    const result = cardEffects.effectGreed(state, 1);

    expect(result.drawnCards).toHaveLength(0);
    expect(state.zones[ZONES.playerHand(1)]).toHaveLength(handBefore);
  });
});

// ============================================================
// Step 2: Insomnia
// ============================================================
describe('effectInsomnia', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  it('should NOT grant immediate actions (deferred to consumeEffectCard)', () => {
    const cardId = forceCardInHand(state, 1, 'insomnia');
    ensureBankValue(state, 1, 3);
    cardEffects.executePlay(state, 1, cardId);

    const actionsBefore = state.turn.actionsRemaining;
    cardEffects.effectInsomnia(state, 1, cardId);
    expect(state.turn.actionsRemaining).toBe(actionsBefore); // no change
  });

  it('should move insomnia card from discard to effect zone', () => {
    const cardId = forceCardInHand(state, 1, 'insomnia');
    ensureBankValue(state, 1, 3);
    cardEffects.executePlay(state, 1, cardId);

    // After executePlay, card is in discard
    expect(state.zones[ZONES.discard]).toContain(cardId);

    cardEffects.effectInsomnia(state, 1, cardId);

    expect(state.zones[ZONES.discard]).not.toContain(cardId);
    expect(state.zones[ZONES.playerEffect(1)]).toContain(cardId);
  });

  it('insomnia card should be known to all players (played face-up)', () => {
    const cardId = forceCardInHand(state, 1, 'insomnia');
    ensureBankValue(state, 1, 3);
    cardEffects.executePlay(state, 1, cardId);
    cardEffects.effectInsomnia(state, 1, cardId);

    for (let p = 1; p <= 4; p++) {
      expect(state.playerMemory[p][String(cardId)]).toBeDefined();
      expect(state.playerMemory[p][String(cardId)].name).toBe('insomnia');
    }
  });
});

// ============================================================
// Step 3: executeKill infrastructure
// ============================================================
describe('executeKill', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  it('should mark victim as dead', () => {
    const killCardId = forceCardInHand(state, 1, 'heavy hand');
    ensureBankValue(state, 1, 10);
    cardEffects.executePlay(state, 1, killCardId, 2);

    cardEffects.executeKill(state, 1, 2, killCardId);
    expect(state.playerAlive[2]).toBe(false);
  });

  it('should move top 2 highest-value cards to killer\'s bank', () => {
    const killCardId = forceCardInHand(state, 1, 'heavy hand');
    ensureBankValue(state, 1, 10);
    cardEffects.executePlay(state, 1, killCardId, 2);

    // Give victim specific cards we can verify
    const victimHand = state.zones[ZONES.playerHand(2)];
    const killerBankBefore = state.zones[ZONES.playerBank(1)].length;

    cardEffects.executeKill(state, 1, 2, killCardId);

    // Killer should have gained at most 2 cards in bank
    const gained = state.zones[ZONES.playerBank(1)].length - killerBankBefore;
    expect(gained).toBeLessThanOrEqual(2);
    expect(gained).toBeGreaterThanOrEqual(0);
  });

  it('should move remaining victim cards to discard', () => {
    const killCardId = forceCardInHand(state, 1, 'heavy hand');
    ensureBankValue(state, 1, 10);
    cardEffects.executePlay(state, 1, killCardId, 2);

    cardEffects.executeKill(state, 1, 2, killCardId);

    // Victim should have empty hand and bank
    expect(state.zones[ZONES.playerHand(2)]).toHaveLength(0);
    expect(state.zones[ZONES.playerBank(2)]).toHaveLength(0);
  });

  it('should move kill card to killer\'s effect zone', () => {
    const killCardId = forceCardInHand(state, 1, 'heavy hand');
    ensureBankValue(state, 1, 10);
    cardEffects.executePlay(state, 1, killCardId, 2);

    cardEffects.executeKill(state, 1, 2, killCardId);

    expect(state.zones[ZONES.discard]).not.toContain(killCardId);
    expect(state.zones[ZONES.playerEffect(1)]).toContain(killCardId);
  });

  it('should NOT grant immediate actions (deferred to consumeEffectCard)', () => {
    const killCardId = forceCardInHand(state, 1, 'heavy hand');
    ensureBankValue(state, 1, 10);
    cardEffects.executePlay(state, 1, killCardId, 2);
    const actionsBefore = state.turn.actionsRemaining;

    cardEffects.executeKill(state, 1, 2, killCardId);

    expect(state.turn.actionsRemaining).toBe(actionsBefore); // no change
  });

  it('should reveal victim\'s mark to all alive players', () => {
    const killCardId = forceCardInHand(state, 1, 'heavy hand');
    ensureBankValue(state, 1, 10);
    cardEffects.executePlay(state, 1, killCardId, 2);

    const victimMarkId = state.zones[ZONES.playerMark(2)][0];

    cardEffects.executeKill(state, 1, 2, killCardId);

    // All alive players should know the victim's mark
    for (let p = 1; p <= 4; p++) {
      if (state.playerAlive[p]) {
        expect(state.playerMemory[p][victimMarkId]).toBeDefined();
        expect(state.playerMemory[p][victimMarkId]).toHaveProperty('suit');
      }
    }
  });

  it('should reveal all redistributed cards to all alive players', () => {
    const killCardId = forceCardInHand(state, 1, 'heavy hand');
    ensureBankValue(state, 1, 10);
    cardEffects.executePlay(state, 1, killCardId, 2);

    // Track victim's cards before kill
    const victimCards = [
      ...state.zones[ZONES.playerHand(2)],
      ...state.zones[ZONES.playerBank(2)],
    ];

    cardEffects.executeKill(state, 1, 2, killCardId);

    // All victim's cards should be known to all alive players
    for (const obfId of victimCards) {
      for (let p = 1; p <= 4; p++) {
        if (state.playerAlive[p]) {
          expect(state.playerMemory[p][String(obfId)]).toBeDefined();
        }
      }
    }
  });

  it('should detect victory when 1 player remains', () => {
    // Kill 2 players first
    state.playerAlive[3] = false;
    state.playerAlive[4] = false;

    const killCardId = forceCardInHand(state, 1, 'heavy hand');
    ensureBankValue(state, 1, 10);
    cardEffects.executePlay(state, 1, killCardId, 2);

    const result = cardEffects.executeKill(state, 1, 2, killCardId);
    expect(result.winner).toBe(1);
  });

  it('should not detect victory when 2+ players remain', () => {
    const killCardId = forceCardInHand(state, 1, 'heavy hand');
    ensureBankValue(state, 1, 10);
    cardEffects.executePlay(state, 1, killCardId, 2);

    const result = cardEffects.executeKill(state, 1, 2, killCardId);
    expect(result.winner).toBeNull();
  });

  it('should handle victim with fewer than 2 cards', () => {
    // Give victim only 1 card
    state.zones[ZONES.playerHand(2)] = [state.zones[ZONES.playerHand(2)][0]];
    state.zones[ZONES.playerBank(2)] = [];

    const killCardId = forceCardInHand(state, 1, 'heavy hand');
    ensureBankValue(state, 1, 10);
    cardEffects.executePlay(state, 1, killCardId, 2);

    const killerBankBefore = state.zones[ZONES.playerBank(1)].length;
    cardEffects.executeKill(state, 1, 2, killCardId);

    expect(state.playerAlive[2]).toBe(false);
    // Only 1 card available, so killer gets 1
    const gained = state.zones[ZONES.playerBank(1)].length - killerBankBefore;
    expect(gained).toBe(1);
  });

  it('should handle victim with 0 cards', () => {
    state.zones[ZONES.playerHand(2)] = [];
    state.zones[ZONES.playerBank(2)] = [];

    const killCardId = forceCardInHand(state, 1, 'heavy hand');
    ensureBankValue(state, 1, 10);
    cardEffects.executePlay(state, 1, killCardId, 2);

    cardEffects.executeKill(state, 1, 2, killCardId);
    expect(state.playerAlive[2]).toBe(false);
  });

  it('should collect cards from both hand and bank', () => {
    // Give victim cards in both zones
    const victimHandCount = state.zones[ZONES.playerHand(2)].length;
    // Move some hand cards to bank
    const toBank = state.zones[ZONES.playerHand(2)].splice(0, 2);
    state.zones[ZONES.playerBank(2)].push(...toBank);

    const totalVictimCards = state.zones[ZONES.playerHand(2)].length + state.zones[ZONES.playerBank(2)].length;

    const killCardId = forceCardInHand(state, 1, 'heavy hand');
    ensureBankValue(state, 1, 10);
    cardEffects.executePlay(state, 1, killCardId, 2);

    cardEffects.executeKill(state, 1, 2, killCardId);

    expect(state.zones[ZONES.playerHand(2)]).toHaveLength(0);
    expect(state.zones[ZONES.playerBank(2)]).toHaveLength(0);
  });
});

// ============================================================
// Step 4: Heavy Hand (kill — 6+ cards in hand)
// ============================================================
describe('effectHeavyHand', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  it('should kill target with exactly 6 hand cards', () => {
    const cardId = forceCardInHand(state, 1, 'heavy hand');
    ensureBankValue(state, 1, 10);

    // Give P2 6 cards in hand AFTER forcing kill card (which may take from P2)
    while (state.zones[ZONES.playerHand(2)].length < 6) {
      const card = state.zones[ZONES.draw].pop();
      state.zones[ZONES.playerHand(2)].push(card);
    }
    state.zones[ZONES.playerHand(2)] = state.zones[ZONES.playerHand(2)].slice(0, 6);

    const result = cardEffects.playKillCard(state, 1, cardId, 2);
    expect(result.success).toBe(true);
    expect(state.playerAlive[2]).toBe(false);
  });

  it('should kill target with 7+ hand cards', () => {
    while (state.zones[ZONES.playerHand(2)].length < 7) {
      const card = state.zones[ZONES.draw].pop();
      state.zones[ZONES.playerHand(2)].push(card);
    }

    const cardId = forceCardInHand(state, 1, 'heavy hand');
    ensureBankValue(state, 1, 10);

    const result = cardEffects.playKillCard(state, 1, cardId, 2);
    expect(result.success).toBe(true);
    expect(state.playerAlive[2]).toBe(false);
  });

  it('should fail when target has 5 hand cards', () => {
    state.zones[ZONES.playerHand(2)] = state.zones[ZONES.playerHand(2)].slice(0, 5);

    const cardId = forceCardInHand(state, 1, 'heavy hand');
    ensureBankValue(state, 1, 10);

    const result = cardEffects.playKillCard(state, 1, cardId, 2);
    expect(result.success).toBe(false);
    expect(state.playerAlive[2]).toBe(true);
  });

  it('should fail when target is dead', () => {
    state.playerAlive[2] = false;
    const cardId = forceCardInHand(state, 1, 'heavy hand');
    ensureBankValue(state, 1, 10);

    const result = cardEffects.playKillCard(state, 1, cardId, 2);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Step 5: Backfire (kill — 5+ cards in hand)
// ============================================================
describe('effectBackfire', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  it('should kill target with exactly 5 hand cards', () => {
    const cardId = forceCardInHand(state, 1, 'backfire');
    ensureBankValue(state, 1, 10);

    // Ensure P2 has exactly 5 hand cards AFTER forcing
    while (state.zones[ZONES.playerHand(2)].length < 5) {
      state.zones[ZONES.playerHand(2)].push(state.zones[ZONES.draw].pop());
    }
    state.zones[ZONES.playerHand(2)] = state.zones[ZONES.playerHand(2)].slice(0, 5);

    const result = cardEffects.playKillCard(state, 1, cardId, 2);
    expect(result.success).toBe(true);
    expect(state.playerAlive[2]).toBe(false);
  });

  it('should fail when target has 4 hand cards', () => {
    const cardId = forceCardInHand(state, 1, 'backfire');
    ensureBankValue(state, 1, 10);

    state.zones[ZONES.playerHand(2)] = state.zones[ZONES.playerHand(2)].slice(0, 4);

    const result = cardEffects.playKillCard(state, 1, cardId, 2);
    expect(result.success).toBe(false);
    expect(state.playerAlive[2]).toBe(true);
  });
});

// ============================================================
// Step 6: Bloodshot (kill — any red card in hand)
// ============================================================
describe('effectBloodshot', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  it('should kill target with 1 red card in hand', () => {
    // Place bloodshot in P1's hand first
    const cardId = forceCardInHand(state, 1, 'bloodshot');
    ensureBankValue(state, 1, 10);

    // Now find a DIFFERENT red card and put it in P2's hand
    let redId = null;
    for (const [obfIdStr, card] of Object.entries(state.cardMap)) {
      if (card.backColor === 'red' && Number(obfIdStr) !== cardId) {
        redId = Number(obfIdStr); break;
      }
    }
    for (const zone of Object.values(state.zones)) {
      const idx = zone.indexOf(redId);
      if (idx !== -1) { zone.splice(idx, 1); break; }
    }
    state.zones[ZONES.playerHand(2)].push(redId);

    const result = cardEffects.playKillCard(state, 1, cardId, 2);
    expect(result.success).toBe(true);
    expect(state.playerAlive[2]).toBe(false);
  });

  it('should fail when target has no red cards', () => {
    // Ensure P2 hand has only non-red cards
    const hand = state.zones[ZONES.playerHand(2)];
    const nonRedHand = hand.filter(id => state.cardMap[id]?.backColor !== 'red');
    if (nonRedHand.length < hand.length) {
      // Replace red cards with white/blue ones from draw
      state.zones[ZONES.playerHand(2)] = [];
      for (const obfId of state.zones[ZONES.draw]) {
        if (state.cardMap[obfId]?.backColor !== 'red') {
          state.zones[ZONES.playerHand(2)].push(obfId);
          if (state.zones[ZONES.playerHand(2)].length >= 3) break;
        }
      }
      // Remove those from draw
      for (const id of state.zones[ZONES.playerHand(2)]) {
        const idx = state.zones[ZONES.draw].indexOf(id);
        if (idx !== -1) state.zones[ZONES.draw].splice(idx, 1);
      }
    }

    const cardId = forceCardInHand(state, 1, 'bloodshot');
    ensureBankValue(state, 1, 10);

    const result = cardEffects.playKillCard(state, 1, cardId, 2);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Step 7: Red Handed (kill — 2+ red cards in hand)
// ============================================================
describe('effectRedHanded', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  it('should kill target with exactly 2 red cards', () => {
    // Find 2 red cards
    const redIds = [];
    for (const [obfIdStr, card] of Object.entries(state.cardMap)) {
      if (card.backColor === 'red') redIds.push(Number(obfIdStr));
      if (redIds.length >= 2) break;
    }
    // Move to P2's hand
    for (const id of redIds) {
      for (const zone of Object.values(state.zones)) {
        const idx = zone.indexOf(id);
        if (idx !== -1) { zone.splice(idx, 1); break; }
      }
      state.zones[ZONES.playerHand(2)].push(id);
    }

    const cardId = forceCardInHand(state, 1, 'red handed');
    ensureBankValue(state, 1, 10);

    const result = cardEffects.playKillCard(state, 1, cardId, 2);
    expect(result.success).toBe(true);
    expect(state.playerAlive[2]).toBe(false);
  });

  it('should fail with only 1 red card', () => {
    // Give P2 exactly 1 red card and rest non-red
    state.zones[ZONES.playerHand(2)] = [];
    let redCount = 0;
    for (const obfId of [...state.zones[ZONES.draw]]) {
      const card = state.cardMap[obfId];
      if (card?.backColor === 'red' && redCount < 1) {
        state.zones[ZONES.playerHand(2)].push(obfId);
        state.zones[ZONES.draw].splice(state.zones[ZONES.draw].indexOf(obfId), 1);
        redCount++;
      } else if (card?.backColor !== 'red' && state.zones[ZONES.playerHand(2)].length < 3) {
        state.zones[ZONES.playerHand(2)].push(obfId);
        state.zones[ZONES.draw].splice(state.zones[ZONES.draw].indexOf(obfId), 1);
      }
      if (state.zones[ZONES.playerHand(2)].length >= 3) break;
    }

    const cardId = forceCardInHand(state, 1, 'red handed');
    ensureBankValue(state, 1, 10);

    const result = cardEffects.playKillCard(state, 1, cardId, 2);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Step 8: Counterfeit (kill — 6+ cards in bank)
// ============================================================
describe('effectCounterfeit', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  it('should kill target with 6 bank cards', () => {
    const cardId = forceCardInHand(state, 1, 'counterfeit');
    ensureBankValue(state, 1, 10);

    // Move 6 cards to P2's bank AFTER forcing cards for P1
    while (state.zones[ZONES.playerBank(2)].length < 6) {
      const card = state.zones[ZONES.draw].pop();
      state.zones[ZONES.playerBank(2)].push(card);
    }

    const result = cardEffects.playKillCard(state, 1, cardId, 2);
    expect(result.success).toBe(true);
    expect(state.playerAlive[2]).toBe(false);
  });

  it('should fail with 5 bank cards', () => {
    const cardId = forceCardInHand(state, 1, 'counterfeit');
    ensureBankValue(state, 1, 10);

    while (state.zones[ZONES.playerBank(2)].length < 5) {
      const card = state.zones[ZONES.draw].pop();
      state.zones[ZONES.playerBank(2)].push(card);
    }
    // Ensure exactly 5
    state.zones[ZONES.playerBank(2)] = state.zones[ZONES.playerBank(2)].slice(0, 5);

    const result = cardEffects.playKillCard(state, 1, cardId, 2);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Step 9: Gold Digger (kill — 5+ cards in bank)
// ============================================================
describe('effectGoldDigger', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  it('should kill target with 5 bank cards', () => {
    while (state.zones[ZONES.playerBank(2)].length < 5) {
      const card = state.zones[ZONES.draw].pop();
      state.zones[ZONES.playerBank(2)].push(card);
    }

    const cardId = forceCardInHand(state, 1, 'gold digger');
    ensureBankValue(state, 1, 10);

    const result = cardEffects.playKillCard(state, 1, cardId, 2);
    expect(result.success).toBe(true);
    expect(state.playerAlive[2]).toBe(false);
  });

  it('should fail with 4 bank cards', () => {
    while (state.zones[ZONES.playerBank(2)].length < 4) {
      const card = state.zones[ZONES.draw].pop();
      state.zones[ZONES.playerBank(2)].push(card);
    }
    state.zones[ZONES.playerBank(2)] = state.zones[ZONES.playerBank(2)].slice(0, 4);

    const cardId = forceCardInHand(state, 1, 'gold digger');
    ensureBankValue(state, 1, 10);

    const result = cardEffects.playKillCard(state, 1, cardId, 2);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Step 10: Bounty system
// ============================================================
describe('bounty system', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  describe('effectBounty', () => {
    it('should draw 3 cards to player hand', () => {
      const bountyId = forceCardInHand(state, 1, 'hearts bounty');
      cardEffects.executePlay(state, 1, bountyId);

      const handBefore = state.zones[ZONES.playerHand(1)].length;
      cardEffects.effectBounty(state, 1, bountyId);

      expect(state.zones[ZONES.playerHand(1)]).toHaveLength(handBefore + 3);
    });

    it('should draw fewer if draw pile is small', () => {
      const bountyId = forceCardInHand(state, 1, 'hearts bounty');
      cardEffects.executePlay(state, 1, bountyId);

      // Leave only 1 card in draw
      state.zones[ZONES.discard].push(...state.zones[ZONES.draw].splice(0, state.zones[ZONES.draw].length - 1));

      const result = cardEffects.effectBounty(state, 1, bountyId);
      expect(result.drawnCards).toHaveLength(1);
    });

    it('should add drawn cards to player memory only', () => {
      const bountyId = forceCardInHand(state, 1, 'hearts bounty');
      cardEffects.executePlay(state, 1, bountyId);

      const topThree = state.zones[ZONES.draw].slice(-3);
      cardEffects.effectBounty(state, 1, bountyId);

      for (const obfId of topThree) {
        expect(state.playerMemory[1][String(obfId)]).toBeDefined();
        expect(state.playerMemory[2][String(obfId)]).toBeUndefined();
      }
    });

    it('should move bounty card to effect zone', () => {
      const bountyId = forceCardInHand(state, 1, 'hearts bounty');
      cardEffects.executePlay(state, 1, bountyId);

      cardEffects.effectBounty(state, 1, bountyId);

      expect(state.zones[ZONES.discard]).not.toContain(bountyId);
      expect(state.zones[ZONES.playerEffect(1)]).toContain(bountyId);
    });

    it('should create bountyState entry', () => {
      const bountyId = forceCardInHand(state, 1, 'hearts bounty');
      cardEffects.executePlay(state, 1, bountyId);

      cardEffects.effectBounty(state, 1, bountyId);

      expect(state.bountyState[bountyId]).toBeDefined();
      expect(state.bountyState[bountyId].owner).toBe(1);
      expect(state.bountyState[bountyId].turnPlayed).toBe(state.currentTurnNumber);
      expect(state.bountyState[bountyId].inBountyZone).toBe(false);
    });

    it('bounty card should be known to all players', () => {
      const bountyId = forceCardInHand(state, 1, 'hearts bounty');
      cardEffects.executePlay(state, 1, bountyId);
      cardEffects.effectBounty(state, 1, bountyId);

      for (let p = 1; p <= 4; p++) {
        expect(state.playerMemory[p][String(bountyId)]).toBeDefined();
      }
    });
  });

  describe('processBountyProgression', () => {
    it('should move bounty from effect to bounty zone', () => {
      const bountyId = forceCardInHand(state, 1, 'hearts bounty');
      cardEffects.executePlay(state, 1, bountyId);
      cardEffects.effectBounty(state, 1, bountyId);

      expect(state.zones[ZONES.playerEffect(1)]).toContain(bountyId);

      cardEffects.processBountyProgression(state);

      expect(state.zones[ZONES.playerEffect(1)]).not.toContain(bountyId);
      expect(state.zones[ZONES.bounty]).toContain(bountyId);
      expect(state.bountyState[bountyId].inBountyZone).toBe(true);
    });

    it('should not move bounties already in bounty zone', () => {
      const bountyId = forceCardInHand(state, 1, 'hearts bounty');
      cardEffects.executePlay(state, 1, bountyId);
      cardEffects.effectBounty(state, 1, bountyId);
      cardEffects.processBountyProgression(state);

      const bountyZoneBefore = [...state.zones[ZONES.bounty]];
      cardEffects.processBountyProgression(state);

      expect(state.zones[ZONES.bounty]).toEqual(bountyZoneBefore);
    });

    it('should process multiple bounties', () => {
      const b1 = forceCardInHand(state, 1, 'hearts bounty');
      cardEffects.executePlay(state, 1, b1);
      cardEffects.effectBounty(state, 1, b1);

      // Play second bounty (need actions)
      state.turn.actionsRemaining = 3;
      const b2 = forceCardInHand(state, 1, 'clubs bounty');
      cardEffects.executePlay(state, 1, b2);
      cardEffects.effectBounty(state, 1, b2);

      cardEffects.processBountyProgression(state);

      expect(state.zones[ZONES.bounty]).toContain(b1);
      expect(state.zones[ZONES.bounty]).toContain(b2);
    });
  });

  describe('executeBountyOnMark', () => {
    function setupBountyInZone(state, playerNum, bountyName) {
      const bountyId = forceCardInHand(state, playerNum, bountyName);
      cardEffects.executePlay(state, playerNum, bountyId);
      cardEffects.effectBounty(state, playerNum, bountyId);
      cardEffects.processBountyProgression(state);
      return bountyId;
    }

    it('should kill target on matching suit', () => {
      // Find what suit P2's mark is
      const p2MarkId = state.zones[ZONES.playerMark(2)][0];
      const p2Suit = state.markMap[p2MarkId].suit;

      const bountyId = setupBountyInZone(state, 1, `${p2Suit} bounty`);
      state.turn.actionsRemaining = 3;

      const result = cardEffects.executeBountyOnMark(state, 1, bountyId, 2);
      expect(result.success).toBe(true);
      expect(result.match).toBe(true);
      expect(state.playerAlive[2]).toBe(false);
    });

    it('should kill bounty player on mismatch', () => {
      // Find a suit that does NOT match P2's mark
      const p2MarkId = state.zones[ZONES.playerMark(2)][0];
      const p2Suit = state.markMap[p2MarkId].suit;
      const allSuits = ['hearts', 'spades', 'clubs', 'diamonds', 'jokers'];
      const mismatchSuit = allSuits.find(s => s !== p2Suit);

      const bountyId = setupBountyInZone(state, 1, `${mismatchSuit} bounty`);
      state.turn.actionsRemaining = 3;

      const result = cardEffects.executeBountyOnMark(state, 1, bountyId, 2);
      expect(result.success).toBe(true);
      expect(result.match).toBe(false);
      expect(state.playerAlive[1]).toBe(false);
    });

    it('should swap marks on mismatch', () => {
      const p1MarkId = state.zones[ZONES.playerMark(1)][0];
      const p2MarkId = state.zones[ZONES.playerMark(2)][0];
      const p2Suit = state.markMap[p2MarkId].suit;
      const allSuits = ['hearts', 'spades', 'clubs', 'diamonds', 'jokers'];
      const mismatchSuit = allSuits.find(s => s !== p2Suit);

      const bountyId = setupBountyInZone(state, 1, `${mismatchSuit} bounty`);
      state.turn.actionsRemaining = 3;

      cardEffects.executeBountyOnMark(state, 1, bountyId, 2);

      // Marks should be swapped
      expect(state.zones[ZONES.playerMark(1)][0]).toBe(p2MarkId);
      expect(state.zones[ZONES.playerMark(2)][0]).toBe(p1MarkId);
    });

    it('should reveal marks to all players', () => {
      const p2MarkId = state.zones[ZONES.playerMark(2)][0];
      const p2Suit = state.markMap[p2MarkId].suit;

      const bountyId = setupBountyInZone(state, 1, `${p2Suit} bounty`);
      state.turn.actionsRemaining = 3;

      cardEffects.executeBountyOnMark(state, 1, bountyId, 2);

      // All alive players should know the revealed mark
      for (let p = 1; p <= 4; p++) {
        if (state.playerAlive[p]) {
          expect(state.playerMemory[p][p2MarkId]).toBeDefined();
        }
      }
    });

    it('should remove bounty from bountyState', () => {
      const p2MarkId = state.zones[ZONES.playerMark(2)][0];
      const p2Suit = state.markMap[p2MarkId].suit;

      const bountyId = setupBountyInZone(state, 1, `${p2Suit} bounty`);
      state.turn.actionsRemaining = 3;

      cardEffects.executeBountyOnMark(state, 1, bountyId, 2);

      expect(state.bountyState[bountyId]).toBeUndefined();
    });

    it('should move bounty card to killer effect zone on match', () => {
      const p2MarkId = state.zones[ZONES.playerMark(2)][0];
      const p2Suit = state.markMap[p2MarkId].suit;

      const bountyId = setupBountyInZone(state, 1, `${p2Suit} bounty`);
      state.turn.actionsRemaining = 3;

      cardEffects.executeBountyOnMark(state, 1, bountyId, 2);

      expect(state.zones[ZONES.bounty]).not.toContain(bountyId);
      expect(state.zones[ZONES.playerEffect(1)]).toContain(bountyId);
    });

    it('should move bounty card to discard on mismatch', () => {
      const p2MarkId = state.zones[ZONES.playerMark(2)][0];
      const p2Suit = state.markMap[p2MarkId].suit;
      const allSuits = ['hearts', 'spades', 'clubs', 'diamonds', 'jokers'];
      const mismatchSuit = allSuits.find(s => s !== p2Suit);

      const bountyId = setupBountyInZone(state, 1, `${mismatchSuit} bounty`);
      state.turn.actionsRemaining = 3;

      cardEffects.executeBountyOnMark(state, 1, bountyId, 2);

      expect(state.zones[ZONES.bounty]).not.toContain(bountyId);
      expect(state.zones[ZONES.discard]).toContain(bountyId);
    });

    it('should fail if bounty not in bounty zone', () => {
      const bountyId = forceCardInHand(state, 1, 'hearts bounty');
      const result = cardEffects.executeBountyOnMark(state, 1, bountyId, 2);
      expect(result.success).toBe(false);
    });

    it('should fail if target is dead', () => {
      const p2MarkId = state.zones[ZONES.playerMark(2)][0];
      const p2Suit = state.markMap[p2MarkId].suit;

      const bountyId = setupBountyInZone(state, 1, `${p2Suit} bounty`);
      state.turn.actionsRemaining = 3;
      state.playerAlive[2] = false;

      const result = cardEffects.executeBountyOnMark(state, 1, bountyId, 2);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================
// Step 12: Tied Up
// ============================================================
describe('effectTiedUp', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  it('should move tied up card to target\'s effect zone', () => {
    const cardId = forceCardInHand(state, 1, 'tied up');
    ensureBankValue(state, 1, 3);
    cardEffects.executePlay(state, 1, cardId, 2);

    cardEffects.effectTiedUp(state, 1, cardId, 2);

    expect(state.zones[ZONES.playerEffect(2)]).toContain(cardId);
    expect(state.zones[ZONES.discard]).not.toContain(cardId);
  });
});

// ============================================================
// Step 12b: processStartOfTurn (tied up check)
// ============================================================
describe('processStartOfTurn', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  it('should skip turn if player has tied up in effect zone', () => {
    const cardId = forceCardInHand(state, 1, 'tied up');
    // Place tied up in P2's effect zone
    for (const zone of Object.values(state.zones)) {
      const idx = zone.indexOf(cardId);
      if (idx !== -1) { zone.splice(idx, 1); break; }
    }
    state.zones[ZONES.playerEffect(2)].push(cardId);
    state.turn.currentPlayerNum = 2;

    const result = cardEffects.processStartOfTurn(state);

    expect(result.skipped).toBe(true);
    expect(state.zones[ZONES.playerEffect(2)]).not.toContain(cardId);
    expect(state.zones[ZONES.discard]).toContain(cardId);
  });

  it('should not skip if no tied up in effect zone', () => {
    state.turn.currentPlayerNum = 2;
    const result = cardEffects.processStartOfTurn(state);
    expect(result.skipped).toBe(false);
  });

  it('should reveal discarded tied up card to all players', () => {
    const cardId = forceCardInHand(state, 1, 'tied up');
    for (const zone of Object.values(state.zones)) {
      const idx = zone.indexOf(cardId);
      if (idx !== -1) { zone.splice(idx, 1); break; }
    }
    state.zones[ZONES.playerEffect(2)].push(cardId);
    state.turn.currentPlayerNum = 2;

    cardEffects.processStartOfTurn(state);

    for (let p = 1; p <= 4; p++) {
      expect(state.playerMemory[p][String(cardId)]).toBeDefined();
    }
  });
});

// ============================================================
// Step 13: Arson
// ============================================================
describe('effectArson', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  it('should discard all cards from target\'s bank', () => {
    // Give P2 some bank cards
    while (state.zones[ZONES.playerBank(2)].length < 3) {
      state.zones[ZONES.playerBank(2)].push(state.zones[ZONES.draw].pop());
    }
    const bankCards = [...state.zones[ZONES.playerBank(2)]];

    const cardId = forceCardInHand(state, 1, 'arson');
    ensureBankValue(state, 1, 5);
    cardEffects.executePlay(state, 1, cardId, 2);

    cardEffects.effectArson(state, 2);

    expect(state.zones[ZONES.playerBank(2)]).toHaveLength(0);
    for (const obfId of bankCards) {
      expect(state.zones[ZONES.discard]).toContain(obfId);
    }
  });

  it('should reveal all discarded bank cards to all players', () => {
    state.zones[ZONES.playerBank(2)].push(state.zones[ZONES.draw].pop());
    const bankCard = state.zones[ZONES.playerBank(2)][0];

    const cardId = forceCardInHand(state, 1, 'arson');
    ensureBankValue(state, 1, 5);
    cardEffects.executePlay(state, 1, cardId, 2);
    cardEffects.effectArson(state, 2);

    for (let p = 1; p <= 4; p++) {
      expect(state.playerMemory[p][String(bankCard)]).toBeDefined();
    }
  });

  it('should handle empty bank gracefully', () => {
    state.zones[ZONES.playerBank(2)] = [];

    const cardId = forceCardInHand(state, 1, 'arson');
    ensureBankValue(state, 1, 5);
    cardEffects.executePlay(state, 1, cardId, 2);
    cardEffects.effectArson(state, 2);

    expect(state.zones[ZONES.playerBank(2)]).toHaveLength(0);
  });
});

// ============================================================
// Step 14: Unmasked
// ============================================================
describe('effectUnmasked', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  it('should add target\'s mark to caster\'s memory', () => {
    const targetMarkId = state.zones[ZONES.playerMark(2)][0];

    cardEffects.effectUnmasked(state, 1, 2);

    expect(state.playerMemory[1][targetMarkId]).toBeDefined();
    expect(state.playerMemory[1][targetMarkId]).toHaveProperty('suit');
  });

  it('should NOT reveal target\'s mark to other players', () => {
    const targetMarkId = state.zones[ZONES.playerMark(2)][0];

    cardEffects.effectUnmasked(state, 1, 2);

    expect(state.playerMemory[3][targetMarkId]).toBeUndefined();
    expect(state.playerMemory[4][targetMarkId]).toBeUndefined();
  });
});

// ============================================================
// Step 14b: Revenge effect
// ============================================================
describe('effectRevenge', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  it('should reveal caster\'s mark to revenge player', () => {
    const casterMarkId = state.zones[ZONES.playerMark(1)][0];

    cardEffects.effectRevenge(state, 1, 2);

    expect(state.playerMemory[2][casterMarkId]).toBeDefined();
    expect(state.playerMemory[2][casterMarkId]).toHaveProperty('suit');
  });

  it('should NOT reveal caster\'s mark to other players', () => {
    const casterMarkId = state.zones[ZONES.playerMark(1)][0];

    cardEffects.effectRevenge(state, 1, 2);

    expect(state.playerMemory[3][casterMarkId]).toBeUndefined();
    expect(state.playerMemory[4][casterMarkId]).toBeUndefined();
  });
});

// ============================================================
// Step 15: Alter Ego
// ============================================================
describe('effectAlterEgo', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  it('should swap target\'s mark with extra mark', () => {
    const targetMarkBefore = state.zones[ZONES.playerMark(2)][0];
    const extraMarkBefore = state.zones[ZONES.extraMark][0];

    cardEffects.effectAlterEgo(state, 1, 2);

    expect(state.zones[ZONES.playerMark(2)][0]).toBe(extraMarkBefore);
    expect(state.zones[ZONES.extraMark][0]).toBe(targetMarkBefore);
  });

  it('should NOT reveal any marks to anyone', () => {
    const targetMarkId = state.zones[ZONES.playerMark(2)][0];
    const extraMarkId = state.zones[ZONES.extraMark][0];

    cardEffects.effectAlterEgo(state, 1, 2);

    expect(state.playerMemory[1][targetMarkId]).toBeUndefined();
    expect(state.playerMemory[1][extraMarkId]).toBeUndefined();
  });
});

// ============================================================
// Step 16: Body Swap
// ============================================================
describe('effectBodySwap', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  it('should swap marks between two targets', () => {
    const mark2Before = state.zones[ZONES.playerMark(2)][0];
    const mark3Before = state.zones[ZONES.playerMark(3)][0];

    cardEffects.effectBodySwap(state, 1, 2, 3);

    expect(state.zones[ZONES.playerMark(2)][0]).toBe(mark3Before);
    expect(state.zones[ZONES.playerMark(3)][0]).toBe(mark2Before);
  });

  it('should NOT reveal any marks to anyone', () => {
    const mark2 = state.zones[ZONES.playerMark(2)][0];
    const mark3 = state.zones[ZONES.playerMark(3)][0];

    cardEffects.effectBodySwap(state, 1, 2, 3);

    expect(state.playerMemory[1][mark2]).toBeUndefined();
    expect(state.playerMemory[1][mark3]).toBeUndefined();
  });
});

// ============================================================
// Step 17: Trade Off
// ============================================================
describe('effectTradeOff', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  it('should swap two cards between their zones', () => {
    const ownCardId = state.zones[ZONES.playerHand(1)][0];
    const targetCardId = state.zones[ZONES.playerHand(2)][0];

    cardEffects.effectTradeOff(state, 1, ownCardId, targetCardId, ZONES.playerHand(1), ZONES.playerHand(2));

    expect(state.zones[ZONES.playerHand(1)]).toContain(targetCardId);
    expect(state.zones[ZONES.playerHand(1)]).not.toContain(ownCardId);
    expect(state.zones[ZONES.playerHand(2)]).toContain(ownCardId);
    expect(state.zones[ZONES.playerHand(2)]).not.toContain(targetCardId);
  });

  it('should work with hand-to-bank swaps', () => {
    const ownCardId = state.zones[ZONES.playerHand(1)][0];
    // Put a card in P2's bank
    const bankCard = state.zones[ZONES.draw].pop();
    state.zones[ZONES.playerBank(2)].push(bankCard);

    cardEffects.effectTradeOff(state, 1, ownCardId, bankCard, ZONES.playerHand(1), ZONES.playerBank(2));

    expect(state.zones[ZONES.playerHand(1)]).toContain(bankCard);
    expect(state.zones[ZONES.playerBank(2)]).toContain(ownCardId);
  });

  it('should add both swapped cards to both involved players\' memory', () => {
    const ownCardId = state.zones[ZONES.playerHand(1)][0];
    const targetCardId = state.zones[ZONES.playerHand(2)][0];

    cardEffects.effectTradeOff(state, 1, ownCardId, targetCardId, ZONES.playerHand(1), ZONES.playerHand(2));

    // P1 should know both cards
    expect(state.playerMemory[1][String(ownCardId)]).toBeDefined();
    expect(state.playerMemory[1][String(targetCardId)]).toBeDefined();
    // P2 should know both cards
    expect(state.playerMemory[2][String(ownCardId)]).toBeDefined();
    expect(state.playerMemory[2][String(targetCardId)]).toBeDefined();
  });
});

// ============================================================
// Step 18: Upheaval
// ============================================================
describe('effectUpheaval', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  it('should cut the draw pile at the given index', () => {
    const drawBefore = [...state.zones[ZONES.draw]];
    const splitIndex = 5;

    cardEffects.effectUpheaval(state, splitIndex);

    // After cut: cards after splitIndex move to top
    // Original: [0,1,2,3,4,5,6,7,...] -> [6,7,...,0,1,2,3,4,5]
    const expected = [...drawBefore.slice(splitIndex + 1), ...drawBefore.slice(0, splitIndex + 1)];
    expect(state.zones[ZONES.draw]).toEqual(expected);
  });

  it('should not change pile size', () => {
    const sizeBefore = state.zones[ZONES.draw].length;
    cardEffects.effectUpheaval(state, 10);
    expect(state.zones[ZONES.draw]).toHaveLength(sizeBefore);
  });

  it('should handle split at index 0', () => {
    const drawBefore = [...state.zones[ZONES.draw]];
    cardEffects.effectUpheaval(state, 0);

    const expected = [...drawBefore.slice(1), ...drawBefore.slice(0, 1)];
    expect(state.zones[ZONES.draw]).toEqual(expected);
  });

  it('should handle split at last index (no change)', () => {
    const drawBefore = [...state.zones[ZONES.draw]];
    cardEffects.effectUpheaval(state, drawBefore.length - 1);

    // Splitting at the end means nothing moves
    expect(state.zones[ZONES.draw]).toEqual(drawBefore);
  });
});

// ============================================================
// consumeEffectCard
// ============================================================
describe('consumeEffectCard', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  it('should consume a kill card and grant +2 actions', () => {
    const killCardId = forceCardInHand(state, 1, 'heavy hand');
    // Place directly in P1's effect zone
    state.zones[ZONES.playerHand(1)] = state.zones[ZONES.playerHand(1)].filter(id => id !== killCardId);
    state.zones[ZONES.playerEffect(1)].push(killCardId);
    state.turn.actionsRemaining = 0;

    const result = cardEffects.consumeEffectCard(state, 1);

    expect(result.consumed).toBe(true);
    expect(result.cardName).toBe('heavy hand');
    expect(result.actionsGranted).toBe(2);
    expect(state.turn.actionsRemaining).toBe(2);
  });

  it('should consume an insomnia card and grant +3 actions', () => {
    const insomniaId = forceCardInHand(state, 1, 'insomnia');
    state.zones[ZONES.playerHand(1)] = state.zones[ZONES.playerHand(1)].filter(id => id !== insomniaId);
    state.zones[ZONES.playerEffect(1)].push(insomniaId);
    state.turn.actionsRemaining = 0;

    const result = cardEffects.consumeEffectCard(state, 1);

    expect(result.consumed).toBe(true);
    expect(result.cardName).toBe('insomnia');
    expect(result.actionsGranted).toBe(3);
    expect(state.turn.actionsRemaining).toBe(3);
  });

  it('should NOT consume bounty cards', () => {
    const bountyId = forceCardInHand(state, 1, 'hearts bounty');
    state.zones[ZONES.playerHand(1)] = state.zones[ZONES.playerHand(1)].filter(id => id !== bountyId);
    state.zones[ZONES.playerEffect(1)].push(bountyId);
    state.turn.actionsRemaining = 0;

    const result = cardEffects.consumeEffectCard(state, 1);

    expect(result.consumed).toBe(false);
    expect(state.zones[ZONES.playerEffect(1)]).toContain(bountyId);
  });

  it('should NOT consume tied up cards', () => {
    const tiedUpId = forceCardInHand(state, 1, 'tied up');
    state.zones[ZONES.playerHand(1)] = state.zones[ZONES.playerHand(1)].filter(id => id !== tiedUpId);
    state.zones[ZONES.playerEffect(1)].push(tiedUpId);
    state.turn.actionsRemaining = 0;

    const result = cardEffects.consumeEffectCard(state, 1);

    expect(result.consumed).toBe(false);
    expect(state.zones[ZONES.playerEffect(1)]).toContain(tiedUpId);
  });

  it('should consume only one card per call', () => {
    const killId = forceCardInHand(state, 1, 'heavy hand');
    const insomniaId = forceCardInHand(state, 1, 'insomnia');
    state.zones[ZONES.playerHand(1)] = state.zones[ZONES.playerHand(1)].filter(
      id => id !== killId && id !== insomniaId
    );
    state.zones[ZONES.playerEffect(1)].push(killId, insomniaId);
    state.turn.actionsRemaining = 0;

    const result1 = cardEffects.consumeEffectCard(state, 1);
    expect(result1.consumed).toBe(true);
    // One should still be in effect zone
    expect(state.zones[ZONES.playerEffect(1)]).toHaveLength(1);
  });

  it('should return consumed: false when effect zone is empty', () => {
    state.zones[ZONES.playerEffect(1)] = [];
    state.turn.actionsRemaining = 0;

    const result = cardEffects.consumeEffectCard(state, 1);
    expect(result.consumed).toBe(false);
  });

  it('should chain: kill card first, then insomnia', () => {
    const killId = forceCardInHand(state, 1, 'heavy hand');
    const insomniaId = forceCardInHand(state, 1, 'insomnia');
    state.zones[ZONES.playerHand(1)] = state.zones[ZONES.playerHand(1)].filter(
      id => id !== killId && id !== insomniaId
    );
    state.zones[ZONES.playerEffect(1)].push(killId, insomniaId);
    state.turn.actionsRemaining = 0;

    // First consumption
    const result1 = cardEffects.consumeEffectCard(state, 1);
    expect(result1.consumed).toBe(true);
    const firstGranted = result1.actionsGranted;

    // Use all those actions
    state.turn.actionsRemaining = 0;

    // Second consumption
    const result2 = cardEffects.consumeEffectCard(state, 1);
    expect(result2.consumed).toBe(true);
    expect(result2.actionsGranted).not.toBe(firstGranted); // different card type

    // No more consumables
    state.turn.actionsRemaining = 0;
    const result3 = cardEffects.consumeEffectCard(state, 1);
    expect(result3.consumed).toBe(false);
  });

  it('should move consumed card to discard', () => {
    const killId = forceCardInHand(state, 1, 'heavy hand');
    state.zones[ZONES.playerHand(1)] = state.zones[ZONES.playerHand(1)].filter(id => id !== killId);
    state.zones[ZONES.playerEffect(1)].push(killId);
    state.turn.actionsRemaining = 0;

    cardEffects.consumeEffectCard(state, 1);

    expect(state.zones[ZONES.playerEffect(1)]).not.toContain(killId);
    expect(state.zones[ZONES.discard]).toContain(killId);
  });

  it('should reveal consumed card to all alive players', () => {
    const killId = forceCardInHand(state, 1, 'heavy hand');
    state.zones[ZONES.playerHand(1)] = state.zones[ZONES.playerHand(1)].filter(id => id !== killId);
    state.zones[ZONES.playerEffect(1)].push(killId);
    state.turn.actionsRemaining = 0;

    cardEffects.consumeEffectCard(state, 1);

    for (let p = 1; p <= 4; p++) {
      if (state.playerAlive[p]) {
        expect(state.playerMemory[p][String(killId)]).toBeDefined();
        expect(state.playerMemory[p][String(killId)].name).toBe('heavy hand');
      }
    }
  });

  it('should skip bounty and consume kill card behind it', () => {
    const bountyId = forceCardInHand(state, 1, 'hearts bounty');
    const killId = forceCardInHand(state, 1, 'heavy hand');
    state.zones[ZONES.playerHand(1)] = state.zones[ZONES.playerHand(1)].filter(
      id => id !== bountyId && id !== killId
    );
    // Bounty first, then kill card
    state.zones[ZONES.playerEffect(1)].push(bountyId, killId);
    state.turn.actionsRemaining = 0;

    const result = cardEffects.consumeEffectCard(state, 1);

    expect(result.consumed).toBe(true);
    expect(result.cardName).toBe('heavy hand');
    // Bounty should still be in effect zone
    expect(state.zones[ZONES.playerEffect(1)]).toContain(bountyId);
    expect(state.zones[ZONES.playerEffect(1)]).not.toContain(killId);
  });
});
