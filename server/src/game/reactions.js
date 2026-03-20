const { ZONES } = require('./constants');
const { getCardCost, getCardValue } = require('./cardUtils');
const { addMemoryAll } = require('./obfuscation');
const { payCardCost } = require('./turnActions');

/**
 * Get the list of valid reaction card names for a given effect type.
 *
 * @param {string} effectType - 'peek', 'skip', 'arson', 'swap_extra', 'swap_marks', 'trade', 'upheaval'
 * @param {boolean} isLethal - whether the original effect is lethal
 * @param {number} reactorNum - the player number of the potential reactor
 * @param {number} targetNum - the target of the original effect
 * @returns {string[]} valid reaction card names
 */
function getValidReactionCards(effectType, isLethal, reactorNum, targetNum) {
  const cards = ['snub'];

  if (effectType === 'peek' && reactorNum === targetNum) {
    cards.push('blind spot');
    cards.push('revenge');
  }

  return cards;
}

/**
 * Get valid cards that can counter a previously played reaction card.
 *
 * @param {string} previousCardName - the card that was just played as a reaction
 * @returns {string[]} cards that can counter it
 */
function getValidCounterCards(previousCardName) {
  switch (previousCardName) {
    case 'snub':
      return ['snub'];
    case 'blind spot':
      return ['snub'];
    case 'revenge':
      return ['snub', 'blind spot'];
    default:
      return ['snub'];
  }
}

/**
 * Check if a player can react (has a valid reaction card + can afford its cost).
 *
 * @param {Object} state
 * @param {number} playerNum
 * @param {string} effectType
 * @param {number} [targetNum] - target of the effect (needed for peek-specific checks)
 * @returns {boolean}
 */
function canPlayerReact(state, playerNum, effectType, targetNum) {
  if (!state.playerAlive[playerNum]) return false;

  const hand = state.zones[ZONES.playerHand(playerNum)];
  const validCards = getValidReactionCards(effectType, false, playerNum, targetNum);

  for (const obfId of hand) {
    const cardInfo = state.cardMap[obfId];
    if (!cardInfo) continue;
    if (!validCards.includes(cardInfo.name)) continue;

    // Check affordability
    const cost = getCardCost(cardInfo.name);
    if (cost <= 0) return true;

    const bank = state.zones[ZONES.playerBank(playerNum)];
    let bankValue = 0;
    for (const bankObfId of bank) {
      bankValue += getCardValue(state.cardMap[bankObfId]?.name);
    }
    if (bankValue >= cost) return true;
  }

  return false;
}

/**
 * Get list of eligible reactor player numbers.
 */
function getEligibleReactors(state, casterNum, targetNum, effectType, isLethal) {
  const eligible = [];

  for (let p = 1; p <= 4; p++) {
    if (p === casterNum) continue;
    if (!state.playerAlive[p]) continue;
    if (canPlayerReact(state, p, effectType, targetNum)) {
      eligible.push(p);
    }
  }

  return eligible;
}

/**
 * Start a reaction window.
 */
function startReactionWindow(state, cardObfId, playerNum, targetNum, effectType, isLethal) {
  const eligible = getEligibleReactors(state, playerNum, targetNum, effectType, isLethal);

  state.reactionState = {
    active: true,
    cardObfId,
    playerId: playerNum,
    targetId: targetNum,
    effectType,
    isLethal,
    eligibleReactors: eligible,
    responses: {},
    reactionPhase: 1,
    reactionChain: [
      {
        playerId: playerNum,
        cardObfId,
        cardName: state.cardMap[cardObfId]?.name || null,
        isOriginal: true,
      },
    ],
    startTime: Date.now(),
    timeRemaining: 5000,
  };
}

/**
 * Submit a reaction response from a player.
 *
 * @param {Object} state
 * @param {number} playerNum
 * @param {number|null} reactionCardObfId - obfuscation ID of reaction card, or null for pass
 */
function submitReactionResponse(state, playerNum, reactionCardObfId) {
  if (!state.reactionState || !state.reactionState.active) return;

  if (reactionCardObfId === null) {
    state.reactionState.responses[playerNum] = null;
    return;
  }

  state.reactionState.responses[playerNum] = reactionCardObfId;

  // Add to reaction chain
  const cardInfo = state.cardMap[reactionCardObfId];
  state.reactionState.reactionChain.push({
    playerId: playerNum,
    cardObfId: reactionCardObfId,
    cardName: cardInfo?.name || null,
    isOriginal: false,
  });
}

/**
 * Resolve the reaction chain.
 * - 0 reactions (just original): effect executes
 * - Odd number of reactions: original blocked
 * - Even number of reactions: original executes
 *
 * All reaction cards are moved to discard with cost paid.
 * Reaction cards revealed to all players.
 *
 * @returns {{ blocked: boolean, execute: boolean, revengeTriggered?: boolean, revengeReactorNum?: number }}
 */
function resolveReactionChain(state) {
  if (!state.reactionState) {
    return { blocked: false, execute: true };
  }

  const chain = state.reactionState.reactionChain;
  const reactionCount = chain.length - 1; // exclude original

  // Process reaction cards: move to discard, pay costs, reveal
  let revengeTriggered = false;
  let revengeReactorNum = null;

  for (let i = 1; i < chain.length; i++) {
    const entry = chain[i];
    const obfId = entry.cardObfId;
    const playerNum = entry.playerId;

    if (entry.cardName === 'revenge') {
      revengeTriggered = true;
      revengeReactorNum = playerNum;
    }

    // Remove from hand
    const hand = state.zones[ZONES.playerHand(playerNum)];
    const idx = hand.indexOf(obfId);
    if (idx !== -1) hand.splice(idx, 1);

    // Move to discard
    state.zones[ZONES.discard].push(obfId);

    // Reveal to all players
    addMemoryAll(state.playerMemory, state.playerAlive, obfId, state.cardMap, state.markMap);

    // Pay cost
    const cost = getCardCost(entry.cardName);
    if (cost > 0) {
      payCardCost(state, playerNum, cost);
    }
  }

  const blocked = reactionCount > 0 && reactionCount % 2 === 1;
  const execute = !blocked;

  // Clear reaction state
  state.reactionState = null;

  return { blocked, execute, revengeTriggered, revengeReactorNum };
}

module.exports = {
  getValidReactionCards,
  getValidCounterCards,
  canPlayerReact,
  getEligibleReactors,
  startReactionWindow,
  submitReactionResponse,
  resolveReactionChain,
};
