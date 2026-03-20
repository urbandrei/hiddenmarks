const { ZONES, getBountySuit } = require('./constants');
const { getCardCost, getCardValue, isLethalCard, isBountyCard } = require('./cardUtils');
const { addMemory, addMemoryAll } = require('./obfuscation');
const { validatePlay, validateKillTarget } = require('./validation');
const { payCardCost } = require('./turnActions');

// ============================================================
// Shared executePlay framework
// ============================================================

/**
 * Execute the common "play a card" flow:
 * 1. Validate (turn, hand, affordability)
 * 2. Pay cost from bank (payment cards go to discard, revealed to all)
 * 3. Remove card from hand, move to discard
 * 4. Reveal played card to all alive players (face-up play is public)
 * 5. Consume 1 action
 *
 * @returns {{ success, error?, cardInfo?, payment? }}
 */
function executePlay(state, playerNum, cardObfId, targetPlayerNum) {
  const check = validatePlay(state, playerNum, cardObfId, targetPlayerNum);
  if (!check.valid) return { success: false, error: check.error };

  const cardInfo = check.cardInfo || state.cardMap[cardObfId];
  const cost = getCardCost(cardInfo.name);

  // Pay cost
  const payment = payCardCost(state, playerNum, cost);
  if (payment === null) {
    return { success: false, error: `Cannot afford card (cost ${cost})` };
  }

  // Remove card from hand
  const hand = state.zones[ZONES.playerHand(playerNum)];
  const idx = hand.indexOf(cardObfId);
  if (idx !== -1) hand.splice(idx, 1);

  // Move card to discard (effects may move it elsewhere after)
  state.zones[ZONES.discard].push(cardObfId);

  // Reveal played card to all alive players
  addMemoryAll(state.playerMemory, state.playerAlive, cardObfId, state.cardMap, state.markMap);

  // Consume 1 action
  state.turn.actionsRemaining -= 1;

  return { success: true, cardInfo, payment };
}

// ============================================================
// Individual card effects
// ============================================================

/**
 * Greed: Draw up to 2 cards from draw pile to hand.
 * Only the player learns the drawn cards.
 */
function effectGreed(state, playerNum) {
  const drawPile = state.zones[ZONES.draw];
  const hand = state.zones[ZONES.playerHand(playerNum)];
  const drawnCards = [];

  const toDraw = Math.min(2, drawPile.length);
  for (let i = 0; i < toDraw; i++) {
    const obfId = drawPile.pop();
    hand.push(obfId);
    addMemory(state.playerMemory, playerNum, obfId, state.cardMap, state.markMap);
    drawnCards.push(obfId);
  }

  return { drawnCards };
}

/**
 * Insomnia: Move insomnia card from discard to effect zone.
 * Actions are NOT granted immediately — the card is consumed at turn end
 * (when actions reach 0) via consumeEffectCard, granting +3 actions then.
 */
function effectInsomnia(state, playerNum, cardObfId) {
  // Move from discard to effect zone
  const discard = state.zones[ZONES.discard];
  const idx = discard.indexOf(cardObfId);
  if (idx !== -1) discard.splice(idx, 1);
  state.zones[ZONES.playerEffect(playerNum)].push(cardObfId);
}

// ============================================================
// Kill infrastructure
// ============================================================

/**
 * Execute a kill: redistribute victim's cards, mark dead, check victory.
 *
 * @returns {{ killed: true, winner: number|null }}
 */
function executeKill(state, killerNum, victimNum, killCardObfId) {
  // Mark victim dead
  state.playerAlive[victimNum] = false;

  // Collect all victim's cards (hand + bank)
  const victimCards = [
    ...state.zones[ZONES.playerHand(victimNum)],
    ...state.zones[ZONES.playerBank(victimNum)],
  ];

  // Sort by value descending (highest value first)
  victimCards.sort((a, b) => {
    const valA = getCardValue(state.cardMap[a]?.name);
    const valB = getCardValue(state.cardMap[b]?.name);
    return valB - valA;
  });

  // Top 2 go to killer's bank, rest to discard
  const toKiller = victimCards.slice(0, 2);
  const toDiscard = victimCards.slice(2);

  for (const obfId of toKiller) {
    state.zones[ZONES.playerBank(killerNum)].push(obfId);
  }
  for (const obfId of toDiscard) {
    state.zones[ZONES.discard].push(obfId);
  }

  // Clear victim's zones
  state.zones[ZONES.playerHand(victimNum)] = [];
  state.zones[ZONES.playerBank(victimNum)] = [];

  // Move kill card from discard to killer's effect zone (if provided)
  // Actions are NOT granted immediately — the card is consumed at turn end
  // (when actions reach 0) via consumeEffectCard, granting +2 actions then.
  if (killCardObfId != null) {
    const discardIdx = state.zones[ZONES.discard].indexOf(killCardObfId);
    if (discardIdx !== -1) {
      state.zones[ZONES.discard].splice(discardIdx, 1);
      state.zones[ZONES.playerEffect(killerNum)].push(killCardObfId);
    }
  }

  // Reveal victim's mark to all alive players
  const victimMarkId = state.zones[ZONES.playerMark(victimNum)][0];
  if (victimMarkId) {
    addMemoryAll(state.playerMemory, state.playerAlive, victimMarkId, state.cardMap, state.markMap);
  }

  // Reveal all redistributed cards to all alive players
  for (const obfId of victimCards) {
    addMemoryAll(state.playerMemory, state.playerAlive, obfId, state.cardMap, state.markMap);
  }

  // Check victory
  const alivePlayers = [];
  for (let p = 1; p <= 4; p++) {
    if (state.playerAlive[p]) alivePlayers.push(p);
  }

  const winner = alivePlayers.length === 1 ? alivePlayers[0] : null;

  return { killed: true, winner };
}

/**
 * Play a kill card: validate condition, execute play, execute kill.
 * This is the unified entry point for all kill cards.
 */
function playKillCard(state, playerNum, cardObfId, targetNum) {
  const cardInfo = state.cardMap[cardObfId];
  if (!cardInfo) return { success: false, error: 'Unknown card' };

  // Validate kill condition first (before paying cost)
  const killCheck = validateKillTarget(state, cardInfo.name, targetNum);
  if (!killCheck.valid) return { success: false, error: killCheck.error };

  // Execute play (pay cost, move to discard, reveal, consume action)
  const playResult = executePlay(state, playerNum, cardObfId, targetNum);
  if (!playResult.success) return playResult;

  // Execute kill
  const killResult = executeKill(state, playerNum, targetNum, cardObfId);

  return { success: true, ...killResult };
}

// ============================================================
// Bounty system
// ============================================================

/**
 * Bounty effect: Draw 3 cards, move bounty to effect zone, track in bountyState.
 */
function effectBounty(state, playerNum, cardObfId) {
  const drawPile = state.zones[ZONES.draw];
  const hand = state.zones[ZONES.playerHand(playerNum)];
  const drawnCards = [];

  // Draw up to 3 cards
  const toDraw = Math.min(3, drawPile.length);
  for (let i = 0; i < toDraw; i++) {
    const obfId = drawPile.pop();
    hand.push(obfId);
    addMemory(state.playerMemory, playerNum, obfId, state.cardMap, state.markMap);
    drawnCards.push(obfId);
  }

  // Move bounty from discard to effect zone
  const discard = state.zones[ZONES.discard];
  const idx = discard.indexOf(cardObfId);
  if (idx !== -1) discard.splice(idx, 1);
  state.zones[ZONES.playerEffect(playerNum)].push(cardObfId);

  // Track bounty
  state.bountyState[cardObfId] = {
    owner: playerNum,
    turnPlayed: state.currentTurnNumber,
    inBountyZone: false,
  };

  return { drawnCards };
}

/**
 * Process bounty progression: move bounties from effect zones to bounty zone.
 * Called at turn start.
 */
function processBountyProgression(state) {
  for (const [obfIdStr, bounty] of Object.entries(state.bountyState)) {
    if (bounty.inBountyZone) continue;

    const obfId = Number(obfIdStr);
    const effectZone = state.zones[ZONES.playerEffect(bounty.owner)];
    const idx = effectZone.indexOf(obfId);
    if (idx !== -1) {
      effectZone.splice(idx, 1);
      state.zones[ZONES.bounty].push(obfId);
      bounty.inBountyZone = true;
    }
  }
}

/**
 * Execute bounty on mark: compare suits, resolve match/mismatch.
 */
function executeBountyOnMark(state, playerNum, bountyObfId, targetNum) {
  // Validate bounty is in bounty zone
  if (!state.zones[ZONES.bounty].includes(bountyObfId)) {
    return { success: false, error: 'Bounty not in bounty zone' };
  }
  if (!state.playerAlive[targetNum]) {
    return { success: false, error: 'Target is dead' };
  }

  const bountyCard = state.cardMap[bountyObfId];
  if (!bountyCard) return { success: false, error: 'Unknown bounty card' };

  const bountySuit = getBountySuit(bountyCard.name);
  if (!bountySuit) return { success: false, error: 'Not a bounty card' };

  // Get target's mark suit
  const targetMarkId = state.zones[ZONES.playerMark(targetNum)][0];
  if (!targetMarkId) return { success: false, error: 'Target has no mark' };

  const targetMark = state.markMap[targetMarkId];
  const targetSuit = targetMark.suit;

  // Reveal target's mark to all
  addMemoryAll(state.playerMemory, state.playerAlive, targetMarkId, state.cardMap, state.markMap);

  const isMatch = bountySuit === targetSuit;

  // Remove bounty from bounty zone and bountyState
  const bountyIdx = state.zones[ZONES.bounty].indexOf(bountyObfId);
  if (bountyIdx !== -1) state.zones[ZONES.bounty].splice(bountyIdx, 1);
  delete state.bountyState[bountyObfId];

  if (isMatch) {
    // Target killed, bounty player is the killer
    // Move bounty card to killer's effect zone (same as kill cards — consumed at turn end for +2 actions)
    state.zones[ZONES.playerEffect(playerNum)].push(bountyObfId);
    executeKill(state, playerNum, targetNum, null);
    return { success: true, match: true };
  } else {
    // Mismatch: bounty card goes to discard
    state.zones[ZONES.discard].push(bountyObfId);
    // Bounty player killed, marks swap
    const playerMarkId = state.zones[ZONES.playerMark(playerNum)][0];

    // Reveal bounty player's mark to all
    if (playerMarkId) {
      addMemoryAll(state.playerMemory, state.playerAlive, playerMarkId, state.cardMap, state.markMap);
    }

    // Swap marks
    state.zones[ZONES.playerMark(playerNum)] = [targetMarkId];
    state.zones[ZONES.playerMark(targetNum)] = [playerMarkId];

    // Kill bounty player (but don't use executeKill since the killer reward goes differently)
    state.playerAlive[playerNum] = false;

    // Collect bounty player's cards
    const playerCards = [
      ...state.zones[ZONES.playerHand(playerNum)],
      ...state.zones[ZONES.playerBank(playerNum)],
    ];
    for (const obfId of playerCards) {
      state.zones[ZONES.discard].push(obfId);
      addMemoryAll(state.playerMemory, state.playerAlive, obfId, state.cardMap, state.markMap);
    }
    state.zones[ZONES.playerHand(playerNum)] = [];
    state.zones[ZONES.playerBank(playerNum)] = [];

    return { success: true, match: false };
  }
}

// ============================================================
// Reactive card effects
// ============================================================

/**
 * Tied Up: Move card from discard to target's effect zone.
 * On target's next turn start, their turn is skipped and the card is discarded.
 */
function effectTiedUp(state, casterNum, cardObfId, targetNum) {
  const discard = state.zones[ZONES.discard];
  const idx = discard.indexOf(cardObfId);
  if (idx !== -1) discard.splice(idx, 1);
  state.zones[ZONES.playerEffect(targetNum)].push(cardObfId);
}

/**
 * Process start of turn: check for tied up cards in current player's effect zone.
 * If found, skip their turn by discarding the card and returning skipped=true.
 */
function processStartOfTurn(state) {
  const playerNum = state.turn.currentPlayerNum;
  const effectZone = state.zones[ZONES.playerEffect(playerNum)];

  // Check for tied up
  for (let i = effectZone.length - 1; i >= 0; i--) {
    const obfId = effectZone[i];
    const cardInfo = state.cardMap[obfId];
    if (cardInfo && cardInfo.name === 'tied up') {
      effectZone.splice(i, 1);
      state.zones[ZONES.discard].push(obfId);
      addMemoryAll(state.playerMemory, state.playerAlive, obfId, state.cardMap, state.markMap);
      return { skipped: true };
    }
  }

  // Process bounty progression
  processBountyProgression(state);

  return { skipped: false };
}

/**
 * Arson: Discard all cards from target's bank.
 */
function effectArson(state, targetNum) {
  const bank = state.zones[ZONES.playerBank(targetNum)];
  const discard = state.zones[ZONES.discard];

  for (const obfId of bank) {
    discard.push(obfId);
    addMemoryAll(state.playerMemory, state.playerAlive, obfId, state.cardMap, state.markMap);
  }
  state.zones[ZONES.playerBank(targetNum)] = [];
}

/**
 * Unmasked: Caster peeks at target's mark.
 */
function effectUnmasked(state, casterNum, targetNum) {
  const targetMarkId = state.zones[ZONES.playerMark(targetNum)][0];
  if (targetMarkId) {
    addMemory(state.playerMemory, casterNum, targetMarkId, state.cardMap, state.markMap);
  }
}

/**
 * Revenge: When revenge blocks a peek, the caster's mark is revealed to the revenge player.
 */
function effectRevenge(state, casterNum, revengePlayerNum) {
  const casterMarkId = state.zones[ZONES.playerMark(casterNum)][0];
  if (casterMarkId) {
    addMemory(state.playerMemory, revengePlayerNum, casterMarkId, state.cardMap, state.markMap);
  }
}

/**
 * Alter Ego: Swap target's mark with the extra mark.
 * No information is revealed — just moves marks around.
 */
function effectAlterEgo(state, casterNum, targetNum) {
  const targetMarkId = state.zones[ZONES.playerMark(targetNum)][0];
  const extraMarkId = state.zones[ZONES.extraMark][0];

  state.zones[ZONES.playerMark(targetNum)] = [extraMarkId];
  state.zones[ZONES.extraMark] = [targetMarkId];
}

/**
 * Body Swap: Swap marks between two target players.
 * No information is revealed — just moves marks around.
 */
function effectBodySwap(state, casterNum, target1Num, target2Num) {
  const mark1Id = state.zones[ZONES.playerMark(target1Num)][0];
  const mark2Id = state.zones[ZONES.playerMark(target2Num)][0];

  state.zones[ZONES.playerMark(target1Num)] = [mark2Id];
  state.zones[ZONES.playerMark(target2Num)] = [mark1Id];
}

/**
 * Trade Off: Swap two cards between their zones.
 * Both involved players learn both swapped cards.
 */
function effectTradeOff(state, casterNum, ownObfId, targetObfId, ownZone, targetZone) {
  // Remove own card from ownZone
  const ownZoneArr = state.zones[ownZone];
  const ownIdx = ownZoneArr.indexOf(ownObfId);
  if (ownIdx !== -1) ownZoneArr.splice(ownIdx, 1);

  // Remove target card from targetZone
  const targetZoneArr = state.zones[targetZone];
  const targetIdx = targetZoneArr.indexOf(targetObfId);
  if (targetIdx !== -1) targetZoneArr.splice(targetIdx, 1);

  // Swap: own card goes to target zone, target card goes to own zone
  targetZoneArr.push(ownObfId);
  ownZoneArr.push(targetObfId);

  // Determine the other player (owner of targetZone)
  // Parse player number from zone name like "p2-hand" or "p3-bank"
  const targetZoneMatch = targetZone.match(/^p(\d)/);
  const targetPlayerNum = targetZoneMatch ? parseInt(targetZoneMatch[1], 10) : null;

  // Both involved players learn both cards
  addMemory(state.playerMemory, casterNum, ownObfId, state.cardMap, state.markMap);
  addMemory(state.playerMemory, casterNum, targetObfId, state.cardMap, state.markMap);
  if (targetPlayerNum && targetPlayerNum !== casterNum) {
    addMemory(state.playerMemory, targetPlayerNum, ownObfId, state.cardMap, state.markMap);
    addMemory(state.playerMemory, targetPlayerNum, targetObfId, state.cardMap, state.markMap);
  }
}

/**
 * Upheaval: Cut the draw pile at the given index.
 * Cards after splitIndex move to the top.
 */
function effectUpheaval(state, splitIndex) {
  const draw = state.zones[ZONES.draw];
  const top = draw.slice(splitIndex + 1);
  const bottom = draw.slice(0, splitIndex + 1);
  state.zones[ZONES.draw] = [...top, ...bottom];
}

// ============================================================
// Effect zone consumption
// ============================================================

/**
 * Consume one effect card from a player's effect zone.
 * Called when actionsRemaining reaches 0.
 *
 * Consumes the first consumable card found:
 * - Kill cards → +2 actions
 * - Insomnia → +3 actions
 *
 * Skips (does NOT consume):
 * - Bounty cards (stay until processBountyProgression moves them)
 * - Tied up cards (consumed at target's turn start)
 *
 * @returns {{ consumed: boolean, cardName?: string, actionsGranted?: number }}
 */
function consumeEffectCard(state, playerNum) {
  const effectZone = state.zones[ZONES.playerEffect(playerNum)];

  for (let i = 0; i < effectZone.length; i++) {
    const obfId = effectZone[i];
    const cardInfo = state.cardMap[obfId];
    if (!cardInfo) continue;

    // Skip bounties (they move to bounty zone via progression)
    if (isBountyCard(cardInfo.name)) continue;
    // Skip tied up (consumed at turn start by target)
    if (cardInfo.name === 'tied up') continue;

    // Consume this card
    effectZone.splice(i, 1);
    state.zones[ZONES.discard].push(obfId);
    addMemoryAll(state.playerMemory, state.playerAlive, obfId, state.cardMap, state.markMap);

    if (isLethalCard(cardInfo.name)) {
      state.turn.actionsRemaining += 2;
      return { consumed: true, cardName: cardInfo.name, actionsGranted: 2 };
    }
    if (cardInfo.name === 'insomnia') {
      state.turn.actionsRemaining += 3;
      return { consumed: true, cardName: cardInfo.name, actionsGranted: 3 };
    }
  }

  return { consumed: false };
}

module.exports = {
  executePlay,
  effectGreed,
  effectInsomnia,
  executeKill,
  playKillCard,
  effectBounty,
  processBountyProgression,
  executeBountyOnMark,
  effectTiedUp,
  processStartOfTurn,
  effectArson,
  effectUnmasked,
  effectRevenge,
  effectAlterEgo,
  effectBodySwap,
  effectTradeOff,
  effectUpheaval,
  consumeEffectCard,
};
