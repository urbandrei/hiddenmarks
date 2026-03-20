// Card values by back color
// Back indices: 54=red, 55=blue, 56=white, 57=mark
const BACK_VALUES = { 54: 3, 55: 2, 56: 1 };

const BACK_NAMES = { 54: 'red', 55: 'blue', 56: 'white', 57: 'mark' };

// Card definitions (from sprite sheet, rendering fields stripped)
const CARD_DEFS = [
  // White back (56)
  { index: 1, name: 'body swap', back: 56, count: 2, cost: 3, effect: 'swap any two player marks' },
  { index: 3, name: 'alter ego', back: 56, count: 2, cost: 2, effect: 'swap any player\'s mark with the extra mark' },
  { index: 5, name: 'greed', back: 56, count: 2, cost: 0, effect: 'draw 2 cards' },
  { index: 7, name: 'tied up', back: 56, count: 2, cost: 3, effect: 'skip any player\'s next turn' },
  { index: 9, name: 'revenge', back: 56, count: 2, cost: 2, effect: 'reactive: if someone tries to peek your mark, peek at their mark' },
  { index: 11, name: 'insomnia', back: 56, count: 2, cost: 3, effect: 'do 3 more actions' },
  { index: 13, name: 'blind spot', back: 56, count: 2, cost: 2, effect: 'reactive: block a mark peek' },
  { index: 15, name: 'trade off', back: 56, count: 4, cost: 3, effect: 'swap any card from your hand with a card from any hand/bank' },
  { index: 19, name: 'unmasked', back: 56, count: 4, cost: 3, effect: 'peek at another player\'s mark' },
  // Blue back (55)
  { index: 23, name: 'upheaval', back: 55, count: 2, cost: 5, effect: 'cut the draw pile' },
  { index: 25, name: 'arson', back: 55, count: 2, cost: 5, effect: 'discard all cards from any player\'s bank' },
  { index: 27, name: 'snub', back: 55, count: 4, cost: 5, effect: 'reactive: prevent a nonlethal card effect' },
  { index: 31, name: 'red handed', back: 55, count: 2, cost: 10, effect: 'kill a player with 2+ red cards in their hand' },
  { index: 33, name: 'counterfeit', back: 55, count: 3, cost: 10, effect: 'kill a player with 6+ cards in their bank' },
  { index: 36, name: 'heavy hand', back: 55, count: 3, cost: 10, effect: 'kill a player with 6+ cards in their hand' },
  // Red back (54)
  { index: 39, name: 'clubs bounty', back: 54, count: 1, cost: 0, effect: 'bounty card for clubs suit' },
  { index: 40, name: 'hearts bounty', back: 54, count: 1, cost: 0, effect: 'bounty card for hearts suit' },
  { index: 41, name: 'spades bounty', back: 54, count: 1, cost: 0, effect: 'bounty card for spades suit' },
  { index: 42, name: 'diamonds bounty', back: 54, count: 1, cost: 0, effect: 'bounty card for diamonds suit' },
  { index: 43, name: 'jokers bounty', back: 54, count: 1, cost: 0, effect: 'bounty card for jokers suit' },
  { index: 44, name: 'backfire', back: 54, count: 2, cost: 10, effect: 'kill a player with 5+ cards in their hand' },
  { index: 46, name: 'bloodshot', back: 54, count: 1, cost: 10, effect: 'kill a player with any red card in their hand' },
  { index: 47, name: 'gold digger', back: 54, count: 2, cost: 10, effect: 'kill a player with 5+ cards in their bank' },
  // Mark back (57)
  { index: 49, name: 'hearts mark', back: 57, count: 1 },
  { index: 50, name: 'spades mark', back: 57, count: 1 },
  { index: 51, name: 'clubs mark', back: 57, count: 1 },
  { index: 52, name: 'diamonds mark', back: 57, count: 1 },
  { index: 53, name: 'jokers mark', back: 57, count: 1 },
];

// Lethal card names
const LETHAL_CARDS = ['backfire', 'counterfeit', 'bloodshot', 'heavy hand', 'gold digger', 'red handed'];

// Reactive card names
const REACTIVE_CARDS = ['blind spot', 'snub', 'revenge'];

// Bounty card names
const BOUNTY_CARDS = ['clubs bounty', 'hearts bounty', 'spades bounty', 'diamonds bounty', 'jokers bounty'];

// Extract suit from bounty card name
function getBountySuit(cardName) {
  const match = cardName.match(/^(\w+) bounty$/);
  return match ? match[1] : null;
}

// Extract suit from mark card name
function getMarkSuit(cardName) {
  const match = cardName.match(/^(\w+) mark$/);
  return match ? match[1] : null;
}

// Zone IDs
const ZONES = {
  draw: 'draw',
  discard: 'discard',
  bounty: 'bounty',
  extraMark: 'extra-mark',
  playerHand: (p) => `p${p}-hand`,
  playerBank: (p) => `p${p}-bank`,
  playerMark: (p) => `p${p}-mark`,
  playerEffect: (p) => `p${p}-effect`,
};

module.exports = {
  BACK_VALUES,
  BACK_NAMES,
  CARD_DEFS,
  LETHAL_CARDS,
  REACTIVE_CARDS,
  BOUNTY_CARDS,
  ZONES,
  getBountySuit,
  getMarkSuit,
};
