const { ZONES } = require('./constants');
const { buildDeck, buildMarks } = require('./cardUtils');
const { shuffle, assignCardObfuscationIds, assignMarkObfuscationIds, addMemory } = require('./obfuscation');

/**
 * Create initial game state for a 4-player game.
 * Builds deck, assigns obfuscation IDs, deals cards.
 *
 * @returns {Object} full authoritative game state
 */
function createInitialState() {
  // Build and shuffle the deck
  const deck = buildDeck();
  shuffle(deck);

  // Build and shuffle marks
  const marks = buildMarks();
  shuffle(marks);

  // Assign obfuscation IDs
  const { cardMap, obfIdOrder } = assignCardObfuscationIds(deck);
  const { markMap, markObfIds } = assignMarkObfuscationIds(marks);

  // Initialize all zones
  const zones = {};
  for (let p = 1; p <= 4; p++) {
    zones[ZONES.playerHand(p)] = [];
    zones[ZONES.playerBank(p)] = [];
    zones[ZONES.playerMark(p)] = [];
    zones[ZONES.playerEffect(p)] = [];
  }
  zones[ZONES.draw] = [];
  zones[ZONES.discard] = [];
  zones[ZONES.bounty] = [];
  zones[ZONES.extraMark] = [];

  // Deal marks: first 4 marks to players, 5th to extra-mark
  for (let p = 1; p <= 4; p++) {
    zones[ZONES.playerMark(p)].push(markObfIds[p - 1]);
  }
  zones[ZONES.extraMark].push(markObfIds[4]);

  // Initialize player memory
  const playerMemory = { 1: {}, 2: {}, 3: {}, 4: {} };

  // Players do NOT know their own mark at start — marks are hidden

  // Deal 3 cards to each player's hand from the deck
  let drawIndex = 0;
  for (let p = 1; p <= 4; p++) {
    for (let c = 0; c < 3; c++) {
      const obfId = obfIdOrder[drawIndex++];
      zones[ZONES.playerHand(p)].push(obfId);
      // Player knows their own hand cards
      addMemory(playerMemory, p, obfId, cardMap, markMap);
    }
  }

  // Remaining cards go to draw pile
  for (let i = drawIndex; i < obfIdOrder.length; i++) {
    zones[ZONES.draw].push(obfIdOrder[i]);
  }

  const state = {
    version: 1,
    cardMap,
    markMap,
    zones,
    playerMemory,
    turn: {
      currentPlayerNum: 1,
      actionsRemaining: 3,
      gameStarted: true,
    },
    playerAlive: { 1: true, 2: true, 3: true, 4: true },
    bountyState: {},
    reactionState: null,
    currentTurnNumber: 1,
  };

  return state;
}

module.exports = { createInitialState };
