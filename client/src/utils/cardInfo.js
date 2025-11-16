// Card information and utilities

export const CARD_NAMES = {
  0: 'UNMASKED', 1: 'UNMASKED', 2: 'UNMASKED', 3: 'UNMASKED',
  4: 'TRADE OFF', 5: 'TRADE OFF', 6: 'TRADE OFF', 7: 'TRADE OFF',
  8: 'GREED', 9: 'GREED',
  10: 'BLIND SPOT', 11: 'BLIND SPOT',
  12: 'REVENGE', 13: 'REVENGE',
  14: 'INSOMNIA', 15: 'INSOMNIA',
  16: 'TIED UP', 17: 'TIED UP',
  18: 'ALTER EGO', 19: 'ALTER EGO',
  20: 'BODY SWAP', 21: 'BODY SWAP',
  22: 'SNUB', 23: 'SNUB', 24: 'SNUB', 25: 'SNUB',
  26: 'ARSON', 27: 'ARSON',
  28: 'UPHEAVAL', 29: 'UPHEAVAL',
  30: 'COUNTERFEIT', 31: 'COUNTERFEIT', 32: 'COUNTERFEIT',
  33: 'HEAVY HAND', 34: 'HEAVY HAND', 35: 'HEAVY HAND',
  36: 'RED HANDED', 37: 'RED HANDED',
  38: 'GOLD DIGGER', 39: 'GOLD DIGGER',
  40: 'BACKFIRE', 41: 'BACKFIRE',
  42: 'BLOODSHOT',
  43: 'BOUNTY ♣', 44: 'BOUNTY ♥', 45: 'BOUNTY ♠', 46: 'BOUNTY ♦', 47: 'BOUNTY 🃏'
};

export const CARD_COSTS = {
  'UNMASKED': 3, 'TRADE OFF': 3, 'GREED': 0, 'BLIND SPOT': 0, 'REVENGE': 0,
  'INSOMNIA': 3, 'TIED UP': 3, 'ALTER EGO': 2, 'BODY SWAP': 3,
  'SNUB': 5, 'ARSON': 5, 'UPHEAVAL': 5,
  'COUNTERFEIT': 10, 'HEAVY HAND': 10, 'RED HANDED': 10,
  'GOLD DIGGER': 10, 'BACKFIRE': 10, 'BLOODSHOT': 10,
  'BOUNTY ♣': 0, 'BOUNTY ♥': 0, 'BOUNTY ♠': 0, 'BOUNTY ♦': 0, 'BOUNTY 🃏': 0
};

export const CARD_DESCRIPTIONS = {
  'UNMASKED': 'Cost 3: Peek at another player\'s mark',
  'TRADE OFF': 'Cost 3: Swap any card from your hand with a card from any hand/bank',
  'GREED': 'Cost 0: Draw 2 cards',
  'BLIND SPOT': 'REACTIVE: Block a mark peek',
  'REVENGE': 'REACTIVE: If someone peeks your mark, peek theirs back',
  'INSOMNIA': 'Cost 3: Do 3 more actions',
  'TIED UP': 'Cost 3: Skip any player\'s next turn',
  'ALTER EGO': 'Cost 2: Swap any player\'s mark with the extra mark',
  'BODY SWAP': 'Cost 3: Swap any two player marks',
  'SNUB': 'Cost 5, REACTIVE: Prevent a nonlethal card effect',
  'ARSON': 'Cost 5: Discard all cards from any player\'s bank',
  'UPHEAVAL': 'Cost 5: Cut the deck at any point',
  'COUNTERFEIT': 'Cost 10: Kill player with 6+ cards in BANK',
  'HEAVY HAND': 'Cost 10: Kill player with 6+ cards in HAND',
  'RED HANDED': 'Cost 10: Kill player with 2+ red cards in HAND',
  'GOLD DIGGER': 'Cost 10: Kill player with 5+ cards in BANK',
  'BACKFIRE': 'Cost 10: Kill player with 5+ cards in HAND',
  'BLOODSHOT': 'Cost 10: Kill player with any red card in HAND',
  'BOUNTY ♣': 'Draw 3 cards, place bounty on table (Clubs)',
  'BOUNTY ♥': 'Draw 3 cards, place bounty on table (Hearts)',
  'BOUNTY ♠': 'Draw 3 cards, place bounty on table (Spades)',
  'BOUNTY ♦': 'Draw 3 cards, place bounty on table (Diamonds)',
  'BOUNTY 🃏': 'Draw 3 cards, place bounty on table (Jokers)'
};

export const MARK_NAMES = ['♣ Clubs', '♥ Hearts', '♠ Spades', '♦ Diamonds', '🃏 Jokers'];

export function getCardColor(cardId) {
  if (cardId < 22) return 'white';
  if (cardId < 38) return 'blue';
  return 'red';
}

export function getCardValue(cardId) {
  const color = getCardColor(cardId);
  return color === 'white' ? 1 : color === 'blue' ? 2 : 3;
}

export function getCardName(cardId) {
  return CARD_NAMES[cardId] || 'Unknown';
}

export function getCardDescription(cardName) {
  return CARD_DESCRIPTIONS[cardName] || '';
}

export function getCardCost(cardName) {
  return CARD_COSTS[cardName] || 0;
}
