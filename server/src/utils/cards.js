// Card definitions for Hidden Marks

const CARD_TYPES = {
  // White cards (value 1)
  UNMASKED: 'UNMASKED',
  TRADE_OFF: 'TRADE_OFF',
  GREED: 'GREED',
  BLIND_SPOT: 'BLIND_SPOT',
  REVENGE: 'REVENGE',
  INSOMNIA: 'INSOMNIA',
  TIED_UP: 'TIED_UP',
  ALTER_EGO: 'ALTER_EGO',
  BODY_SWAP: 'BODY_SWAP',

  // Blue cards (value 2)
  SNUB: 'SNUB',
  ARSON: 'ARSON',
  UPHEAVAL: 'UPHEAVAL',
  COUNTERFEIT: 'COUNTERFEIT',
  HEAVY_HAND: 'HEAVY_HAND',
  RED_HANDED: 'RED_HANDED',

  // Red cards (value 3)
  GOLD_DIGGER: 'GOLD_DIGGER',
  BACKFIRE: 'BACKFIRE',
  BLOODSHOT: 'BLOODSHOT',
  BOUNTY_CLUBS: 'BOUNTY_CLUBS',
  BOUNTY_HEARTS: 'BOUNTY_HEARTS',
  BOUNTY_SPADES: 'BOUNTY_SPADES',
  BOUNTY_DIAMONDS: 'BOUNTY_DIAMONDS',
  BOUNTY_JOKERS: 'BOUNTY_JOKERS'
};

const CARD_COLORS = {
  WHITE: 'white',
  BLUE: 'blue',
  RED: 'red'
};

const CARD_VALUES = {
  [CARD_COLORS.WHITE]: 1,
  [CARD_COLORS.BLUE]: 2,
  [CARD_COLORS.RED]: 3
};

const MARKS = {
  CLUBS: 0,
  HEARTS: 1,
  SPADES: 2,
  DIAMONDS: 3,
  JOKERS: 4
};

// Card ID ranges (0-47, total 48 cards)
const CARD_RANGES = {
  UNMASKED: [0, 3],        // 4 cards (white)
  TRADE_OFF: [4, 7],       // 4 cards (white)
  GREED: [8, 9],           // 2 cards (white)
  BLIND_SPOT: [10, 11],    // 2 cards (white)
  REVENGE: [12, 13],       // 2 cards (white)
  INSOMNIA: [14, 15],      // 2 cards (white)
  TIED_UP: [16, 17],       // 2 cards (white)
  ALTER_EGO: [18, 19],     // 2 cards (white)
  BODY_SWAP: [20, 21],     // 2 cards (white)
  SNUB: [22, 25],          // 4 cards (blue)
  ARSON: [26, 27],         // 2 cards (blue)
  UPHEAVAL: [28, 29],      // 2 cards (blue)
  COUNTERFEIT: [30, 32],   // 3 cards (blue)
  HEAVY_HAND: [33, 35],    // 3 cards (blue)
  RED_HANDED: [36, 37],    // 2 cards (blue)
  GOLD_DIGGER: [38, 39],   // 2 cards (red)
  BACKFIRE: [40, 41],      // 2 cards (red)
  BLOODSHOT: [42, 42],     // 1 card (red)
  BOUNTY_CLUBS: [43, 43],  // 1 card (red)
  BOUNTY_HEARTS: [44, 44], // 1 card (red)
  BOUNTY_SPADES: [45, 45], // 1 card (red)
  BOUNTY_DIAMONDS: [46, 46], // 1 card (red)
  BOUNTY_JOKERS: [47, 47]  // 1 card (red)
};

function getCardType(cardId) {
  for (const [type, [min, max]] of Object.entries(CARD_RANGES)) {
    if (cardId >= min && cardId <= max) {
      return type;
    }
  }
  return null;
}

function getCardColor(cardId) {
  if (cardId < 22) return CARD_COLORS.WHITE;
  if (cardId < 38) return CARD_COLORS.BLUE;
  return CARD_COLORS.RED;
}

function getCardValue(cardId) {
  return CARD_VALUES[getCardColor(cardId)];
}

function getCardCost(cardType) {
  const costs = {
    UNMASKED: 3,
    TRADE_OFF: 3,
    GREED: 0,
    BLIND_SPOT: 0, // reactive
    REVENGE: 0, // reactive
    INSOMNIA: 3,
    TIED_UP: 3,
    ALTER_EGO: 2,
    BODY_SWAP: 3,
    SNUB: 5,
    ARSON: 5,
    UPHEAVAL: 5,
    COUNTERFEIT: 10,
    HEAVY_HAND: 10,
    RED_HANDED: 10,
    GOLD_DIGGER: 10,
    BACKFIRE: 10,
    BLOODSHOT: 10,
    BOUNTY_CLUBS: 0,
    BOUNTY_HEARTS: 0,
    BOUNTY_SPADES: 0,
    BOUNTY_DIAMONDS: 0,
    BOUNTY_JOKERS: 0
  };
  return costs[cardType] || 0;
}

function isReactive(cardType) {
  return ['SNUB', 'BLIND_SPOT', 'REVENGE'].includes(cardType);
}

function isLethal(cardType) {
  return [
    'COUNTERFEIT', 'HEAVY_HAND', 'RED_HANDED',
    'GOLD_DIGGER', 'BACKFIRE', 'BLOODSHOT'
  ].includes(cardType);
}

function isBounty(cardType) {
  return cardType.startsWith('BOUNTY_');
}

function getBountyMark(cardType) {
  const bountyMap = {
    BOUNTY_CLUBS: MARKS.CLUBS,
    BOUNTY_HEARTS: MARKS.HEARTS,
    BOUNTY_SPADES: MARKS.SPADES,
    BOUNTY_DIAMONDS: MARKS.DIAMONDS,
    BOUNTY_JOKERS: MARKS.JOKERS
  };
  return bountyMap[cardType];
}

function createDeck() {
  const deck = [];
  for (let i = 0; i < 48; i++) {
    deck.push(i);
  }
  return shuffleArray(deck);
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

module.exports = {
  CARD_TYPES,
  CARD_COLORS,
  CARD_VALUES,
  MARKS,
  CARD_RANGES,
  getCardType,
  getCardColor,
  getCardValue,
  getCardCost,
  isReactive,
  isLethal,
  isBounty,
  getBountyMark,
  createDeck,
  shuffleArray
};
