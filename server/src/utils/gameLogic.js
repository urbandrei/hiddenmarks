const { createDeck, shuffleArray, getCardValue, getCardType, getCardCost, isLethal, isBounty, getBountyMark } = require('./cards');

function initializeGame() {
  const deck = createDeck();
  const marks = shuffleArray([0, 1, 2, 3, 4]); // Shuffle marks

  const extraMark = marks.pop();
  const playerMarks = [marks.pop(), marks.pop(), marks.pop(), marks.pop()];

  const players = [];
  for (let i = 0; i < 4; i++) {
    const hand = [deck.pop(), deck.pop(), deck.pop()];
    players.push({
      playerIndex: i,
      isAlive: true,
      mark: playerMarks[i],
      hand,
      bank: [],
      knowledge: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]
    });
  }

  return {
    players,
    drawPile: deck,
    discardPile: [],
    extraMark,
    unusedMarks: marks,
    bounties: [],
    currentPlayer: 0,
    actionsRemaining: 3,
    skippedPlayers: [],
    lastDrawMode: false
  };
}

function calculateBankValue(bank) {
  return bank.reduce((sum, cardId) => sum + getCardValue(cardId), 0);
}

function canAffordCost(bank, cost) {
  return calculateBankValue(bank) >= cost;
}

function payFromBank(bank, cost) {
  const paid = [];
  let remaining = cost;

  // Pay from the end of the bank (LIFO)
  while (remaining > 0 && bank.length > 0) {
    const card = bank.pop();
    paid.push(card);
    remaining -= getCardValue(card);
  }

  return { paid, updatedBank: bank };
}

function checkLethalCondition(cardType, targetPlayer, allPlayers) {
  const { hand, bank } = allPlayers[targetPlayer];

  switch (cardType) {
    case 'COUNTERFEIT':
      return bank.length >= 6;
    case 'HEAVY_HAND':
      return hand.length >= 6;
    case 'RED_HANDED':
      const redCount = hand.filter(c => getCardValue(c) === 3).length;
      return redCount >= 2;
    case 'GOLD_DIGGER':
      return bank.length >= 5;
    case 'BACKFIRE':
      return hand.length >= 5;
    case 'BLOODSHOT':
      return hand.some(c => getCardValue(c) === 3);
    default:
      return false;
  }
}

function killPlayer(gameState, targetIndex, killerIndex = null) {
  const target = gameState.players[targetIndex];
  target.isAlive = false;

  // Place mark as unused
  gameState.unusedMarks.push(target.mark);

  // Mark known to all players
  gameState.players.forEach(p => {
    p.knowledge[targetIndex][target.mark] = 1;
  });

  // If there's a killer, they get 2 highest value cards
  if (killerIndex !== null) {
    const allCards = [...target.hand, ...target.bank];
    allCards.sort((a, b) => getCardValue(b) - getCardValue(a));

    const gainedCards = allCards.slice(0, 2);
    const discarded = allCards.slice(2);

    gameState.players[killerIndex].bank.push(...gainedCards);
    gameState.discardPile.push(...discarded);
  } else {
    // No killer, discard everything
    gameState.discardPile.push(...target.hand, ...target.bank);
  }

  target.hand = [];
  target.bank = [];

  return killerIndex !== null; // Returns true if there's a killer (for extra actions)
}

function handleAccusation(gameState, accuserIndex, targetIndex, accusedMark) {
  const target = gameState.players[targetIndex];
  const accuser = gameState.players[accuserIndex];

  if (target.mark === accusedMark) {
    // Correct accusation - target dies
    return killPlayer(gameState, targetIndex, accuserIndex);
  } else {
    // Wrong accusation - accuser dies, swap marks
    const accuserMark = accuser.mark;
    accuser.mark = target.mark;
    target.mark = accuserMark;

    // Update knowledge for all players (swap)
    gameState.players.forEach(p => {
      for (let m = 0; m < 5; m++) {
        const temp = p.knowledge[accuserIndex][m];
        p.knowledge[accuserIndex][m] = p.knowledge[targetIndex][m];
        p.knowledge[targetIndex][m] = temp;
      }
    });

    killPlayer(gameState, accuserIndex, null);
    return false;
  }
}

function getAlivePlayers(gameState) {
  return gameState.players.filter(p => p.isAlive);
}

function advanceTurn(gameState) {
  gameState.actionsRemaining--;

  if (gameState.actionsRemaining <= 0) {
    gameState.actionsRemaining = 3;

    // Decrement bounty timers
    gameState.bounties = gameState.bounties.map(b => ({
      ...b,
      turnsLeft: b.turnsLeft - 1
    }));

    // Move to next alive player
    let nextPlayer = (gameState.currentPlayer + 1) % 4;
    let attempts = 0;
    while (!gameState.players[nextPlayer].isAlive && attempts < 4) {
      nextPlayer = (nextPlayer + 1) % 4;
      attempts++;
    }

    // Check if player is skipped
    if (gameState.skippedPlayers.includes(nextPlayer)) {
      gameState.skippedPlayers = gameState.skippedPlayers.filter(p => p !== nextPlayer);
      // Skip their turn, move to next
      nextPlayer = (nextPlayer + 1) % 4;
      attempts = 0;
      while (!gameState.players[nextPlayer].isAlive && attempts < 4) {
        nextPlayer = (nextPlayer + 1) % 4;
        attempts++;
      }
    }

    gameState.currentPlayer = nextPlayer;
  }
}

function reshuffleDiscardIntoDraw(gameState) {
  gameState.drawPile = shuffleArray(gameState.discardPile);
  gameState.discardPile = [];
}

module.exports = {
  initializeGame,
  calculateBankValue,
  canAffordCost,
  payFromBank,
  checkLethalCondition,
  killPlayer,
  handleAccusation,
  getAlivePlayers,
  advanceTurn,
  reshuffleDiscardIntoDraw
};
