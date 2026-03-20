const { ZONES } = require('./constants');
const { getCardValue } = require('./cardUtils');
const { addMemory, addMemoryAll } = require('./obfuscation');
const { validateDraw, validateBank } = require('./validation');

/**
 * Execute a draw action: take top card from draw pile into hand.
 * Adds the drawn card to the player's memory.
 *
 * @returns {{ success: boolean, error?: string, drawnCardObfId?: number }}
 */
function executeDraw(state, playerNum) {
  const check = validateDraw(state, playerNum);
  if (!check.valid) return { success: false, error: check.error };

  const drawPile = state.zones[ZONES.draw];
  const hand = state.zones[ZONES.playerHand(playerNum)];

  const drawnObfId = drawPile.pop();
  hand.push(drawnObfId);

  // Player learns this card
  addMemory(state.playerMemory, playerNum, drawnObfId, state.cardMap, state.markMap);

  state.turn.actionsRemaining -= 1;

  return { success: true, drawnCardObfId: drawnObfId };
}

/**
 * Execute a bank action: move a card from hand to bank.
 * Banking is hidden — other players don't learn the card identity.
 *
 * @returns {{ success: boolean, error?: string }}
 */
function executeBank(state, playerNum, cardObfId) {
  const check = validateBank(state, playerNum, cardObfId);
  if (!check.valid) return { success: false, error: check.error };

  const hand = state.zones[ZONES.playerHand(playerNum)];
  const bank = state.zones[ZONES.playerBank(playerNum)];

  const idx = hand.indexOf(cardObfId);
  hand.splice(idx, 1);
  bank.push(cardObfId);

  state.turn.actionsRemaining -= 1;

  return { success: true };
}

/**
 * Advance the turn to the next alive player.
 *
 * @returns {{ nextPlayerNum: number }}
 */
function advanceTurn(state) {
  let next = state.turn.currentPlayerNum;
  for (let i = 0; i < 4; i++) {
    next = (next % 4) + 1;
    if (state.playerAlive[next]) {
      break;
    }
  }

  state.turn.currentPlayerNum = next;
  state.turn.actionsRemaining = 3;
  state.currentTurnNumber += 1;

  return { nextPlayerNum: next };
}

/**
 * Pay a card's cost from the player's bank.
 * Uses optimal payment selection.
 * Returns the obfuscation IDs of cards spent, or null if can't afford.
 */
function payCardCost(state, playerNum, cost) {
  if (cost <= 0) return [];

  const bank = state.zones[ZONES.playerBank(playerNum)];
  const discard = state.zones[ZONES.discard];

  // Build value lookup for bank cards
  const bankCards = bank.map(obfId => ({
    obfId,
    value: getCardValue(state.cardMap[obfId]?.name),
  }));

  const { selectPayment } = require('./cardUtils');
  const payment = selectPayment(bankCards, cost);
  if (!payment) return null;

  // Move paid cards from bank to discard
  for (const obfId of payment) {
    const idx = bank.indexOf(obfId);
    if (idx !== -1) {
      bank.splice(idx, 1);
      discard.push(obfId);
    }
    // Payment cards going to discard become known to all
    addMemoryAll(state.playerMemory, state.playerAlive, obfId, state.cardMap, state.markMap);
  }

  return payment;
}

module.exports = {
  executeDraw,
  executeBank,
  advanceTurn,
  payCardCost,
};
