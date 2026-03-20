const { ZONES } = require('./constants');
const { isLethalCard, isBountyCard, getCardCost, getCardValue } = require('./cardUtils');

/**
 * Validate that it is the given player's turn and they have actions remaining.
 */
function validateTurn(state, playerNum) {
  if (!state.turn.gameStarted) {
    return { valid: false, error: 'Game has not started' };
  }
  if (state.turn.currentPlayerNum !== playerNum) {
    return { valid: false, error: 'Not your turn' };
  }
  if (state.turn.actionsRemaining <= 0) {
    return { valid: false, error: 'No actions remaining' };
  }
  if (!state.playerAlive[playerNum]) {
    return { valid: false, error: 'You are dead' };
  }
  if (state.reactionState && state.reactionState.active) {
    return { valid: false, error: 'A reaction is in progress' };
  }
  return { valid: true };
}

/**
 * Validate a draw action.
 */
function validateDraw(state, playerNum) {
  const turnCheck = validateTurn(state, playerNum);
  if (!turnCheck.valid) return turnCheck;

  if (state.zones[ZONES.draw].length === 0) {
    return { valid: false, error: 'Draw pile is empty' };
  }
  return { valid: true };
}

/**
 * Validate a bank action.
 */
function validateBank(state, playerNum, cardObfId) {
  const turnCheck = validateTurn(state, playerNum);
  if (!turnCheck.valid) return turnCheck;

  const hand = state.zones[ZONES.playerHand(playerNum)];
  if (!hand.includes(cardObfId)) {
    return { valid: false, error: 'Card not in your hand' };
  }
  return { valid: true };
}

/**
 * Validate a play action.
 */
function validatePlay(state, playerNum, cardObfId, targetPlayerNum) {
  const turnCheck = validateTurn(state, playerNum);
  if (!turnCheck.valid) return turnCheck;

  const hand = state.zones[ZONES.playerHand(playerNum)];
  if (!hand.includes(cardObfId)) {
    return { valid: false, error: 'Card not in your hand' };
  }

  // Look up actual card
  const cardInfo = state.cardMap[cardObfId];
  if (!cardInfo) {
    return { valid: false, error: 'Unknown card' };
  }

  // Check cost affordability
  const cost = getCardCost(cardInfo.name);
  if (cost > 0) {
    const bank = state.zones[ZONES.playerBank(playerNum)];
    let totalBankValue = 0;
    for (const bankObfId of bank) {
      const bankCard = state.cardMap[bankObfId];
      if (bankCard) {
        totalBankValue += getCardValue(bankCard.name);
      }
    }
    if (totalBankValue < cost) {
      return { valid: false, error: `Cannot afford card (cost ${cost}, bank value ${totalBankValue})` };
    }
  }

  // Validate target if needed
  if (targetPlayerNum !== undefined && targetPlayerNum !== null) {
    if (targetPlayerNum < 1 || targetPlayerNum > 4) {
      return { valid: false, error: 'Invalid target player' };
    }
    if (!state.playerAlive[targetPlayerNum]) {
      return { valid: false, error: 'Target player is dead' };
    }
  }

  return { valid: true, cardInfo };
}

/**
 * Validate kill target meets the kill condition.
 */
function validateKillTarget(state, cardName, targetPlayerNum) {
  if (!state.playerAlive[targetPlayerNum]) {
    return { valid: false, error: 'Target is dead' };
  }

  const targetHand = state.zones[ZONES.playerHand(targetPlayerNum)];
  const targetBank = state.zones[ZONES.playerBank(targetPlayerNum)];

  switch (cardName) {
    case 'heavy hand':
      if (targetHand.length < 6) {
        return { valid: false, error: 'Target needs 6+ cards in hand' };
      }
      break;
    case 'backfire':
      if (targetHand.length < 5) {
        return { valid: false, error: 'Target needs 5+ cards in hand' };
      }
      break;
    case 'bloodshot': {
      const hasRed = targetHand.some(obfId => {
        const card = state.cardMap[obfId];
        return card && card.backColor === 'red';
      });
      if (!hasRed) {
        return { valid: false, error: 'Target needs a red card in hand' };
      }
      break;
    }
    case 'red handed': {
      const redCount = targetHand.filter(obfId => {
        const card = state.cardMap[obfId];
        return card && card.backColor === 'red';
      }).length;
      if (redCount < 2) {
        return { valid: false, error: 'Target needs 2+ red cards in hand' };
      }
      break;
    }
    case 'counterfeit':
      if (targetBank.length < 6) {
        return { valid: false, error: 'Target needs 6+ cards in bank' };
      }
      break;
    case 'gold digger':
      if (targetBank.length < 5) {
        return { valid: false, error: 'Target needs 5+ cards in bank' };
      }
      break;
    default:
      return { valid: false, error: `${cardName} is not a kill card` };
  }

  return { valid: true };
}

module.exports = {
  validateTurn,
  validateDraw,
  validateBank,
  validatePlay,
  validateKillTarget,
};
