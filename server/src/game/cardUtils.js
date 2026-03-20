const { CARD_DEFS, BACK_VALUES, LETHAL_CARDS, BOUNTY_CARDS } = require('./constants');

// Build a lookup map: cardName -> card definition
const CARD_DEF_MAP = new Map();
for (const def of CARD_DEFS) {
  CARD_DEF_MAP.set(def.name, def);
}

/**
 * Get the cost of a card by name.
 */
function getCardCost(cardName) {
  const def = CARD_DEF_MAP.get(cardName);
  return def?.cost ?? 0;
}

/**
 * Get the bank value of a card by name (determined by back color).
 */
function getCardValue(cardName) {
  const def = CARD_DEF_MAP.get(cardName);
  return def ? (BACK_VALUES[def.back] ?? 0) : 0;
}

/**
 * Get the back color name of a card.
 */
function getCardBack(cardName) {
  const def = CARD_DEF_MAP.get(cardName);
  if (!def) return null;
  if (def.back === 54) return 'red';
  if (def.back === 55) return 'blue';
  if (def.back === 56) return 'white';
  if (def.back === 57) return 'mark';
  return null;
}

/**
 * Check if a card is a lethal (kill) card.
 */
function isLethalCard(cardName) {
  return LETHAL_CARDS.includes(cardName);
}

/**
 * Check if a card is a bounty card.
 */
function isBountyCard(cardName) {
  return BOUNTY_CARDS.includes(cardName);
}

/**
 * Get a card definition by name.
 */
function getCardDef(cardName) {
  return CARD_DEF_MAP.get(cardName) || null;
}

/**
 * Select optimal payment from bank cards to cover a cost.
 * Returns array of obfuscation IDs to spend, or null if can't afford.
 *
 * @param {Array<{obfId: number|string, value: number}>} bankCards - cards with their values
 * @param {number} cost - cost to pay
 * @returns {Array<number|string>|null} obfuscation IDs to discard, or null
 */
function selectPayment(bankCards, cost) {
  if (cost <= 0) return [];

  const totalBankValue = bankCards.reduce((sum, c) => sum + c.value, 0);
  if (totalBankValue < cost) return null;

  let bestSubset = null;
  let bestCount = -1;
  let bestTotal = Infinity;

  const n = bankCards.length;
  for (let mask = 1; mask < (1 << n); mask++) {
    const subset = [];
    let total = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        subset.push(bankCards[i].obfId);
        total += bankCards[i].value;
      }
    }

    if (total >= cost) {
      const isExact = (total === cost);
      const bestIsExact = (bestTotal === cost);

      const isBetter =
        (isExact && !bestIsExact) ||
        (isExact === bestIsExact && total < bestTotal) ||
        (total === bestTotal && subset.length > bestCount);

      if (isBetter) {
        bestSubset = subset;
        bestCount = subset.length;
        bestTotal = total;
      }
    }
  }

  return bestSubset;
}

/**
 * Build the full deck (expanded from CARD_DEFS with count).
 * Returns array of { name, back, cost, index } for each card copy.
 */
function buildDeck() {
  const deck = [];
  for (const def of CARD_DEFS) {
    if (def.back === 57) continue; // marks handled separately
    for (let i = 0; i < def.count; i++) {
      deck.push({
        name: def.name,
        back: def.back,
        cost: def.cost,
        spriteIndex: def.index,
      });
    }
  }
  return deck;
}

/**
 * Build the mark cards array.
 * Returns array of { name, suit } for each mark.
 */
function buildMarks() {
  const marks = [];
  for (const def of CARD_DEFS) {
    if (def.back !== 57) continue;
    const suit = def.name.replace(' mark', '');
    marks.push({ name: def.name, suit });
  }
  return marks;
}

module.exports = {
  getCardCost,
  getCardValue,
  getCardBack,
  isLethalCard,
  isBountyCard,
  getCardDef,
  selectPayment,
  buildDeck,
  buildMarks,
};
