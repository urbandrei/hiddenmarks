const { BACK_NAMES } = require('./constants');
const { getCardValue, getCardBack } = require('./cardUtils');

/**
 * Fisher-Yates shuffle (in place).
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Assign obfuscation IDs to cards, grouped by back color.
 * IDs are within exact-count ranges per color:
 *   white: 1..W
 *   blue:  W+1..W+B
 *   red:   W+B+1..W+B+R
 *
 * @param {Array<{name, back, cost, spriteIndex}>} deck - the expanded deck (no marks)
 * @returns {{ cardMap: Object, obfIdOrder: number[] }}
 *   cardMap: { obfId -> { name, back, cost, backColor } }
 *   obfIdOrder: array of obfuscation IDs in the deck's shuffled order
 */
function assignCardObfuscationIds(deck) {
  // Group cards by back color
  const groups = { 56: [], 55: [], 54: [] }; // white, blue, red
  for (let i = 0; i < deck.length; i++) {
    groups[deck[i].back].push(i);
  }

  const whiteCount = groups[56].length;
  const blueCount = groups[55].length;

  // Create ID pools per color
  const whiteIds = [];
  for (let i = 1; i <= whiteCount; i++) whiteIds.push(i);
  shuffle(whiteIds);

  const blueIds = [];
  for (let i = whiteCount + 1; i <= whiteCount + blueCount; i++) blueIds.push(i);
  shuffle(blueIds);

  const redIds = [];
  for (let i = whiteCount + blueCount + 1; i <= deck.length; i++) redIds.push(i);
  shuffle(redIds);

  // Assign IDs
  const cardMap = {};
  const obfIdByDeckIndex = new Array(deck.length);

  let wi = 0, bi = 0, ri = 0;
  for (let i = 0; i < deck.length; i++) {
    let obfId;
    if (deck[i].back === 56) obfId = whiteIds[wi++];
    else if (deck[i].back === 55) obfId = blueIds[bi++];
    else obfId = redIds[ri++];

    obfIdByDeckIndex[i] = obfId;
    cardMap[obfId] = {
      name: deck[i].name,
      back: deck[i].back,
      backColor: BACK_NAMES[deck[i].back],
      cost: deck[i].cost,
    };
  }

  // Build obfIdOrder (same order as deck, but using obfuscation IDs)
  const obfIdOrder = obfIdByDeckIndex.slice();

  return { cardMap, obfIdOrder };
}

/**
 * Assign obfuscation IDs to mark cards.
 * Marks use a separate namespace: "M1" through "M5".
 *
 * @param {Array<{name, suit}>} marks
 * @returns {{ markMap: Object, markObfIds: string[] }}
 *   markMap: { "M1" -> { suit: "hearts" }, ... }
 *   markObfIds: shuffled array of mark obf IDs matching marks order
 */
function assignMarkObfuscationIds(marks) {
  const ids = marks.map((_, i) => `M${i + 1}`);
  shuffle(ids);

  const markMap = {};
  const markObfIds = [];
  for (let i = 0; i < marks.length; i++) {
    const obfId = ids[i];
    markObfIds.push(obfId);
    markMap[obfId] = { suit: marks[i].suit, name: marks[i].name };
  }

  return { markMap, markObfIds };
}

/**
 * Get the obfuscation ID ranges so clients know which range = which color.
 *
 * @param {Object} cardMap
 * @returns {{ white: {min, max}, blue: {min, max}, red: {min, max} }}
 */
function getObfuscationRanges(cardMap) {
  const ranges = { white: { min: Infinity, max: -Infinity }, blue: { min: Infinity, max: -Infinity }, red: { min: Infinity, max: -Infinity } };

  for (const [obfId, card] of Object.entries(cardMap)) {
    const id = Number(obfId);
    const color = card.backColor;
    if (ranges[color]) {
      ranges[color].min = Math.min(ranges[color].min, id);
      ranges[color].max = Math.max(ranges[color].max, id);
    }
  }

  return ranges;
}

/**
 * Add a card identity to a player's memory.
 *
 * @param {Object} playerMemory - the playerMemory object from game state
 * @param {number} playerNum - seat number (1-4)
 * @param {number|string} obfId - obfuscation ID
 * @param {Object} cardMap - the server's card map
 * @param {Object} markMap - the server's mark map
 */
function addMemory(playerMemory, playerNum, obfId, cardMap, markMap) {
  if (!playerMemory[playerNum]) {
    playerMemory[playerNum] = {};
  }

  const key = String(obfId);
  if (playerMemory[playerNum][key]) return; // already known

  if (typeof obfId === 'string' && obfId.startsWith('M')) {
    const markInfo = markMap[obfId];
    if (markInfo) {
      playerMemory[playerNum][key] = { suit: markInfo.suit, name: markInfo.name };
    }
  } else {
    const cardInfo = cardMap[obfId];
    if (cardInfo) {
      playerMemory[playerNum][key] = {
        name: cardInfo.name,
        back: cardInfo.backColor,
        cost: cardInfo.cost,
      };
    }
  }
}

/**
 * Add a card identity to ALL alive players' memory.
 */
function addMemoryAll(playerMemory, playerAlive, obfId, cardMap, markMap) {
  for (let p = 1; p <= 4; p++) {
    if (playerAlive[p]) {
      addMemory(playerMemory, p, obfId, cardMap, markMap);
    }
  }
}

/**
 * Build the player-facing view for a specific player.
 * Returns board (zones with obf IDs) + that player's memory only.
 *
 * @param {Object} state - full game state
 * @param {number} playerNum - seat number
 * @returns {Object} player view
 */
function getPlayerView(state, playerNum) {
  return {
    board: state.zones,
    memory: state.playerMemory[playerNum] || {},
    turn: state.turn,
    playerAlive: state.playerAlive,
    bountyState: state.bountyState,
    reactionState: state.reactionState ? sanitizeReactionState(state.reactionState) : null,
    currentTurnNumber: state.currentTurnNumber,
    obfuscationRanges: getObfuscationRanges(state.cardMap),
  };
}

/**
 * Strip server-internal fields from reaction state before sending to clients.
 */
function sanitizeReactionState(reactionState) {
  if (!reactionState) return null;
  return {
    active: reactionState.active,
    cardObfId: reactionState.cardObfId,
    playerId: reactionState.playerId,
    targetId: reactionState.targetId,
    effectType: reactionState.effectType,
    isLethal: reactionState.isLethal,
    eligibleReactors: reactionState.eligibleReactors,
    timeRemaining: reactionState.timeRemaining,
    reactionPhase: reactionState.reactionPhase,
  };
}

module.exports = {
  shuffle,
  assignCardObfuscationIds,
  assignMarkObfuscationIds,
  getObfuscationRanges,
  addMemory,
  addMemoryAll,
  getPlayerView,
};
