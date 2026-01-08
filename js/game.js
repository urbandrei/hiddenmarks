// Game logic - effects, reactions, targeting, kill cards, bounties
import * as THREE from 'three';
import { CARD_DEFS, BACK_VALUES, CARD_WIDTH, CARD_HEIGHT } from './constants.js';
import * as state from './state.js';

// Network and render function stubs (set via setters to avoid circular deps)
let networkFunctions = {
    sendStateUpdate: () => console.log('sendStateUpdate not set'),
    broadcastReactionStart: () => console.log('broadcastReactionStart not set'),
    sendReactionStartToHost: () => console.log('sendReactionStartToHost not set'),
    broadcastReactionResolve: () => console.log('broadcastReactionResolve not set'),
    broadcastMarkKnowledge: () => console.log('broadcastMarkKnowledge not set'),
    broadcastCounterReactionStart: () => console.log('broadcastCounterReactionStart not set'),
};

let renderFunctions = {
    layoutCardsInZone: () => console.log('layoutCardsInZone not set'),
};

export function setNetworkFunctions(fns) {
    networkFunctions = { ...networkFunctions, ...fns };
}

export function setRenderFunctions(fns) {
    renderFunctions = { ...renderFunctions, ...fns };
}

// === UTILITY FUNCTIONS ===

export function findCardZone(card) {
    for (const zone of state.zones) {
        if (zone.cards.includes(card)) {
            return zone;
        }
    }
    return null;
}

export function removeCardFromZones(card) {
    for (const zone of state.zones) {
        const idx = zone.cards.indexOf(card);
        if (idx !== -1) {
            zone.cards.splice(idx, 1);
            return zone;
        }
    }
    return null;
}

export function getCardCost(card) {
    const def = CARD_DEFS.find(d => d.name === card.userData.name);
    return def?.cost ?? 0;
}

export function getCardValue(card) {
    const def = CARD_DEFS.find(d => d.name === card.userData.name);
    return def ? (BACK_VALUES[def.back] ?? 0) : 0;
}

export function selectPayment(bankCards, cost) {
    if (cost <= 0) return [];

    const cardsWithValues = bankCards.map(card => ({
        card,
        value: getCardValue(card)
    }));

    const totalBankValue = cardsWithValues.reduce((sum, c) => sum + c.value, 0);
    if (totalBankValue < cost) return null;

    let bestSubset = null;
    let bestCount = -1;
    let bestTotal = Infinity;

    const n = cardsWithValues.length;
    for (let mask = 1; mask < (1 << n); mask++) {
        const subset = [];
        let total = 0;
        for (let i = 0; i < n; i++) {
            if (mask & (1 << i)) {
                subset.push(cardsWithValues[i].card);
                total += cardsWithValues[i].value;
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

export function isLethalCard(cardName) {
    const lethalCards = ['backfire', 'counterfeit', 'bloodshot', 'heavy hand', 'gold digger', 'red handed'];
    return lethalCards.includes(cardName);
}

export function isOwnZone(zone) {
    if (!zone || !state.myPlayerNumber) return false;
    return zone.player === state.myPlayerNumber;
}

export function shouldShowFaceUp(card, zone) {
    if (!zone) return card.userData.faceUp;

    if (zone.id === 'discard') return true;
    if (zone.id === 'bounty') return true;
    if (zone.type === 'bank') return false;
    if (zone.type === 'effect') return true;

    if (zone.type === 'mark') {
        if (!state.playerAlive[zone.player]) return true;
        // Check if we know this specific card (by index), not just the zone
        if (zone.cards.length > 0) {
            const cardIndex = state.cards.indexOf(zone.cards[0]);
            const myKnowledge = state.knownMarks[state.myPlayerNumber];
            if (myKnowledge && myKnowledge.has(cardIndex)) {
                return true;
            }
        }
        return false;
    }

    if (zone.id === 'draw') return false;

    if (zone.id === 'extra-mark') {
        // Check if we know this specific card (by index)
        if (zone.cards.length > 0) {
            const cardIndex = state.cards.indexOf(zone.cards[0]);
            const myKnowledge = state.knownMarks[state.myPlayerNumber];
            if (myKnowledge && myKnowledge.has(cardIndex)) {
                return true;
            }
        }
        return false;
    }

    if (zone.type === 'hand') {
        return zone.player === state.myPlayerNumber;
    }

    return card.userData.faceUp;
}

// === TURN MANAGEMENT ===

export function isMyTurn() {
    return state.turnState.gameStarted &&
           state.turnState.currentPlayerNum === state.myPlayerNumber &&
           state.turnState.actionsRemaining > 0;
}

export function canPerformAction() {
    return isMyTurn();
}

export function getNextConnectedPlayer(currentNum) {
    const activeNums = state.currentPlayerList
        .filter(p => p.connected && state.playerAlive[p.num])
        .map(p => p.num)
        .sort((a, b) => a - b);

    if (activeNums.length === 0) return currentNum;

    const currentIndex = activeNums.indexOf(currentNum);
    const nextIndex = (currentIndex + 1) % activeNums.length;
    return activeNums[nextIndex];
}

export function consumeAction() {
    if (!canPerformAction()) return false;

    state.turnState.actionsRemaining--;

    if (state.turnState.actionsRemaining <= 0) {
        advanceTurn();
    }

    return true;
}

export function processEndOfTurn(playerNum) {
    const player = state.players[playerNum];
    if (!player) return;

    while (player.effect.cards.length > 0) {
        const card = player.effect.cards.pop();
        state.piles.discard.cards.push(card);
    }
    renderFunctions.layoutCardsInZone(player.effect);
    renderFunctions.layoutCardsInZone(state.piles.discard);
}

export function advanceTurn() {
    processEndOfTurn(state.turnState.currentPlayerNum);

    state.setCurrentTurnNumber(state.currentTurnNumber + 1);

    let nextPlayer = getNextConnectedPlayer(state.turnState.currentPlayerNum);

    while (processStartOfTurn(nextPlayer)) {
        nextPlayer = getNextConnectedPlayer(nextPlayer);
    }

    processBountyProgression(nextPlayer);

    state.turnState.currentPlayerNum = nextPlayer;
    state.turnState.actionsRemaining = 3;
}

export function processStartOfTurn(playerNum) {
    const player = state.players[playerNum];
    if (!player) return false;

    const tiedUpIndex = player.effect.cards.findIndex(c => c.userData.name === 'tied up');
    if (tiedUpIndex !== -1) {
        const tiedUpCard = player.effect.cards[tiedUpIndex];
        player.effect.cards.splice(tiedUpIndex, 1);
        state.piles.discard.cards.push(tiedUpCard);
        renderFunctions.layoutCardsInZone(player.effect);
        renderFunctions.layoutCardsInZone(state.piles.discard);
        networkFunctions.sendStateUpdate();
        return true;
    }

    return false;
}

// === ACTION EXECUTION ===

export function executeDraw() {
    const drawPile = state.piles.draw;
    if (drawPile.cards.length === 0) return false;

    const topCard = drawPile.cards[drawPile.cards.length - 1];
    drawPile.cards.pop();

    const myHand = state.players[state.myPlayerNumber].hand;
    myHand.cards.push(topCard);

    renderFunctions.layoutCardsInZone(drawPile);
    renderFunctions.layoutCardsInZone(myHand);

    consumeAction();
    networkFunctions.sendStateUpdate();
    return true;
}

export function executeBank(card, sourceZone, targetZone) {
    removeCardFromZones(card);
    targetZone.cards.push(card);

    renderFunctions.layoutCardsInZone(sourceZone);
    renderFunctions.layoutCardsInZone(targetZone);

    consumeAction();
    networkFunctions.sendStateUpdate();
    return true;
}

export function executePlay(card, sourceZone) {
    const cost = getCardCost(card);
    const cardName = card.userData.name;

    if (cost > 0) {
        const myBank = state.players[state.myPlayerNumber].bank;
        const payment = selectPayment(myBank.cards, cost);

        if (payment === null) {
            return false;
        }

        for (const payCard of payment) {
            removeCardFromZones(payCard);
            state.piles.discard.cards.push(payCard);
        }
        renderFunctions.layoutCardsInZone(myBank);
    }

    removeCardFromZones(card);
    state.piles.discard.cards.push(card);

    renderFunctions.layoutCardsInZone(sourceZone);
    renderFunctions.layoutCardsInZone(state.piles.discard);

    const immediateEffects = ['greed', 'insomnia'];
    const markTargetingCards = ['unmasked', 'alter ego', 'body swap'];
    const playerTargetingCards = ['tied up', 'arson'];
    const killCards = ['backfire', 'counterfeit', 'bloodshot', 'heavy hand', 'gold digger', 'red handed'];
    const bountyCards = ['hearts bounty', 'spades bounty', 'clubs bounty', 'diamonds bounty'];
    const specialCards = ['trade off', 'upheaval'];

    if (killCards.includes(cardName)) {
        consumeAction();
        networkFunctions.sendStateUpdate();
        initiateKill(state.myPlayerNumber, card);
    } else if (markTargetingCards.includes(cardName)) {
        consumeAction();
        networkFunctions.sendStateUpdate();

        switch (cardName) {
            case 'unmasked':
                initiateUnmasked(state.myPlayerNumber, card);
                break;
            case 'alter ego':
                initiateAlterEgo(state.myPlayerNumber, card);
                break;
            case 'body swap':
                initiateBodySwap(state.myPlayerNumber, card);
                break;
        }
    } else if (playerTargetingCards.includes(cardName)) {
        consumeAction();
        networkFunctions.sendStateUpdate();

        switch (cardName) {
            case 'tied up':
                initiateTiedUp(state.myPlayerNumber, card);
                break;
            case 'arson':
                initiateArson(state.myPlayerNumber, card);
                break;
        }
    } else if (specialCards.includes(cardName)) {
        consumeAction();
        networkFunctions.sendStateUpdate();

        switch (cardName) {
            case 'trade off':
                initiateTradeOff(state.myPlayerNumber, card);
                break;
            case 'upheaval':
                initiateUpheaval(state.myPlayerNumber, card);
                break;
        }
    } else if (bountyCards.includes(cardName)) {
        initiateBounty(state.myPlayerNumber, card);
        consumeAction();
        networkFunctions.sendStateUpdate();
    } else if (immediateEffects.includes(cardName)) {
        executeCardEffect(card, state.myPlayerNumber, null);
        consumeAction();
        networkFunctions.sendStateUpdate();
    } else {
        consumeAction();
        networkFunctions.sendStateUpdate();
    }

    return true;
}

// === EFFECT EXECUTION ===

export function executeCardEffect(card, playerId, targetId) {
    const cardName = card.userData.name;

    switch (cardName) {
        case 'greed':
            executeGreed(playerId);
            break;
        case 'insomnia':
            executeInsomnia(playerId, card);
            break;
        case 'unmasked':
            executeUnmasked(playerId, targetId);
            break;
        case 'alter ego':
            executeAlterEgo(playerId, targetId);
            break;
        case 'body swap':
            executeBodySwap(playerId, targetId, state.reactionState.secondTarget);
            break;
        case 'tied up':
            executeTiedUp(playerId, targetId, card);
            break;
        case 'arson':
            executeArson(playerId, targetId);
            break;
        case 'trade off':
            executeTradeOff(playerId);
            break;
        case 'upheaval':
            executeUpheaval(playerId);
            break;
        default:
            console.log(`Effect not implemented: ${cardName}`);
    }
}

function executeGreed(playerId) {
    const player = state.players[playerId];
    if (!player) return;

    if (state.piles.draw.cards.length > 0) {
        const card1 = state.piles.draw.cards.pop();
        card1.userData.faceUp = true;
        player.hand.cards.push(card1);
    }

    if (state.piles.draw.cards.length > 0) {
        const card2 = state.piles.draw.cards.pop();
        card2.userData.faceUp = true;
        player.hand.cards.push(card2);
    }

    renderFunctions.layoutCardsInZone(state.piles.draw);
    renderFunctions.layoutCardsInZone(player.hand);
    networkFunctions.sendStateUpdate();
}

function executeInsomnia(playerId, card) {
    const player = state.players[playerId];
    if (!player) return;

    const insomniaCard = card || state.piles.discard.cards.find(c => c.userData.name === 'insomnia');
    if (insomniaCard) {
        removeCardFromZones(insomniaCard);
        player.effect.cards.push(insomniaCard);
        renderFunctions.layoutCardsInZone(state.piles.discard);
        renderFunctions.layoutCardsInZone(player.effect);
    }

    state.turnState.actionsRemaining += 3;
    networkFunctions.sendStateUpdate();
}

// === MARK MANIPULATION ===

let bodySwapFirstTarget = null;

function initiateUnmasked(playerId, card) {
    const validTargets = [];
    for (let pNum = 1; pNum <= 4; pNum++) {
        if (pNum === playerId) continue;
        if (!state.playerAlive[pNum]) continue;
        if (!state.currentPlayerList.find(p => p.num === pNum && p.connected)) continue;
        validTargets.push(pNum);
    }

    if (validTargets.length === 0) {
        console.log('No valid targets for Unmasked');
        return;
    }

    enterTargetingMode('mark', validTargets, (targetPlayerNum) => {
        startReactionWindow(card, playerId, targetPlayerNum, 'peek', false);
    });
}

function executeUnmasked(playerId, targetId) {
    addMarkKnowledge(playerId, targetId);
    networkFunctions.sendStateUpdate();
}

function initiateAlterEgo(playerId, card) {
    const validTargets = [];
    for (let pNum = 1; pNum <= 4; pNum++) {
        if (!state.playerAlive[pNum]) continue;
        if (!state.currentPlayerList.find(p => p.num === pNum && p.connected)) continue;
        validTargets.push(pNum);
    }

    if (validTargets.length === 0) return;

    enterTargetingMode('mark', validTargets, (targetPlayerNum) => {
        startReactionWindow(card, playerId, targetPlayerNum, 'swap_extra', false);
    });
}

function executeAlterEgo(playerId, targetId) {
    const targetMarkZone = state.players[targetId].mark;
    const extraMarkZone = state.piles.extraMark;

    if (targetMarkZone.cards.length === 0 || extraMarkZone.cards.length === 0) return;

    const targetMark = targetMarkZone.cards[0];
    const extraMark = extraMarkZone.cards[0];

    targetMarkZone.cards[0] = extraMark;
    extraMarkZone.cards[0] = targetMark;

    renderFunctions.layoutCardsInZone(targetMarkZone);
    renderFunctions.layoutCardsInZone(extraMarkZone);
    networkFunctions.sendStateUpdate();
}

function initiateBodySwap(playerId, card) {
    bodySwapFirstTarget = null;

    const validTargets = [];
    for (let pNum = 1; pNum <= 4; pNum++) {
        if (!state.playerAlive[pNum]) continue;
        if (!state.currentPlayerList.find(p => p.num === pNum && p.connected)) continue;
        validTargets.push(pNum);
    }

    if (validTargets.length < 2) return;

    enterTargetingMode('mark', validTargets, (firstTarget) => {
        bodySwapFirstTarget = firstTarget;

        const secondTargets = validTargets.filter(t => t !== firstTarget);
        enterTargetingMode('mark', secondTargets, (secondTarget) => {
            startReactionWindow(card, playerId, firstTarget, 'swap_marks', false);
            state.reactionState.secondTarget = secondTarget;
        });
    });
}

function executeBodySwap(playerId, target1, target2) {
    const mark1Zone = state.players[target1].mark;
    const mark2Zone = state.players[target2].mark;

    if (mark1Zone.cards.length === 0 || mark2Zone.cards.length === 0) return;

    const mark1 = mark1Zone.cards[0];
    const mark2 = mark2Zone.cards[0];

    mark1Zone.cards[0] = mark2;
    mark2Zone.cards[0] = mark1;

    renderFunctions.layoutCardsInZone(mark1Zone);
    renderFunctions.layoutCardsInZone(mark2Zone);
    networkFunctions.sendStateUpdate();
}

export function addMarkKnowledge(viewerPlayerId, targetPlayerId) {
    if (!state.knownMarks[viewerPlayerId]) {
        state.knownMarks[viewerPlayerId] = new Set();
    }
    // Store the card index (not player number) so knowledge follows the card when it moves
    const targetMark = state.players[targetPlayerId].mark.cards[0];
    if (!targetMark) return;
    const cardIndex = state.cards.indexOf(targetMark);
    state.knownMarks[viewerPlayerId].add(cardIndex);

    if (state.isHost) {
        networkFunctions.broadcastMarkKnowledge();
    }

    for (const zone of state.zones) {
        if (zone.type === 'mark') {
            renderFunctions.layoutCardsInZone(zone);
        }
    }
}

// === KILL CARDS ===

function getPlayerHandCards(playerNum) {
    return state.players[playerNum]?.hand.cards || [];
}

function getPlayerBankCards(playerNum) {
    return state.players[playerNum]?.bank.cards || [];
}

function isRedCard(card) {
    const def = CARD_DEFS.find(d => d.name === card.userData.name);
    return def?.back === 54;
}

function countRedCardsInHand(playerNum) {
    return getPlayerHandCards(playerNum).filter(isRedCard).length;
}

function hasRedCardsInHand(playerNum, minCount) {
    return countRedCardsInHand(playerNum) >= minCount;
}

function hasAnyRedCardInHand(playerNum) {
    return countRedCardsInHand(playerNum) > 0;
}

function hasCardsInHand(playerNum, minCount) {
    return getPlayerHandCards(playerNum).length >= minCount;
}

function hasCardsInBank(playerNum, minCount) {
    return getPlayerBankCards(playerNum).length >= minCount;
}

export function getValidKillTargets(cardName) {
    const validTargets = [];

    for (let pNum = 1; pNum <= 4; pNum++) {
        if (pNum === state.myPlayerNumber) continue;
        if (!state.playerAlive[pNum]) continue;
        if (!state.currentPlayerList.find(p => p.num === pNum && p.connected)) continue;

        let meetsCondition = false;

        switch (cardName) {
            case 'red handed':
                meetsCondition = hasRedCardsInHand(pNum, 2);
                break;
            case 'counterfeit':
                meetsCondition = hasCardsInBank(pNum, 6);
                break;
            case 'heavy hand':
                meetsCondition = hasCardsInHand(pNum, 6);
                break;
            case 'backfire':
                meetsCondition = hasCardsInHand(pNum, 5);
                break;
            case 'bloodshot':
                meetsCondition = hasAnyRedCardInHand(pNum);
                break;
            case 'gold digger':
                meetsCondition = hasCardsInBank(pNum, 5);
                break;
        }

        if (meetsCondition) {
            validTargets.push(pNum);
        }
    }

    return validTargets;
}

function initiateKill(playerId, card) {
    const cardName = card.userData.name;
    const validTargets = getValidKillTargets(cardName);

    if (validTargets.length === 0) {
        console.log('No valid targets for kill card');
        return;
    }

    enterTargetingMode('player', validTargets, (targetPlayerNum) => {
        executeKill(playerId, targetPlayerNum, card);
    });
}

export function executeKill(killerNum, victimNum, killCard) {
    const victimHand = state.players[victimNum].hand.cards.slice();
    const victimBank = state.players[victimNum].bank.cards.slice();
    const allVictimCards = [...victimHand, ...victimBank];

    allVictimCards.sort((a, b) => getCardValue(b) - getCardValue(a));

    const cardsToTake = allVictimCards.slice(0, 2);
    const killerBank = state.players[killerNum].bank;

    for (const card of cardsToTake) {
        removeCardFromZones(card);
        killerBank.cards.push(card);
    }

    for (const card of allVictimCards.slice(2)) {
        removeCardFromZones(card);
        state.piles.discard.cards.push(card);
    }

    const killerEffect = state.players[killerNum].effect;
    const discardIndex = state.piles.discard.cards.indexOf(killCard);
    if (discardIndex !== -1) {
        state.piles.discard.cards.splice(discardIndex, 1);
    }
    killerEffect.cards.push(killCard);

    state.playerAlive[victimNum] = false;

    state.turnState.actionsRemaining += 2;

    renderFunctions.layoutCardsInZone(state.players[victimNum].hand);
    renderFunctions.layoutCardsInZone(state.players[victimNum].bank);
    renderFunctions.layoutCardsInZone(state.players[victimNum].mark);
    renderFunctions.layoutCardsInZone(killerBank);
    renderFunctions.layoutCardsInZone(killerEffect);
    renderFunctions.layoutCardsInZone(state.piles.discard);

    checkVictory();

    networkFunctions.sendStateUpdate();
}

export function checkVictory() {
    const alivePlayers = Object.entries(state.playerAlive)
        .filter(([_, alive]) => alive)
        .map(([num, _]) => parseInt(num));

    const connectedAlivePlayers = alivePlayers.filter(pNum =>
        state.currentPlayerList.find(p => p.num === pNum && p.connected)
    );

    if (connectedAlivePlayers.length === 1) {
        const winner = connectedAlivePlayers[0];
        showVictoryScreen(winner);
    }
}

function showVictoryScreen(winnerNum) {
    const winnerName = state.currentPlayerList.find(p => p.num === winnerNum)?.name || `Player ${winnerNum}`;

    const overlay = document.createElement('div');
    overlay.id = 'victory-overlay';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.9);
        z-index: 1000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
    `;
    overlay.innerHTML = `
        <h1 style="font-size: 48px; margin-bottom: 20px;">Victory!</h1>
        <p style="font-size: 24px; margin-bottom: 40px;">${winnerName} wins!</p>
        <button id="play-again-btn" style="padding: 15px 30px; font-size: 18px; cursor: pointer;">
            Play Again
        </button>
    `;
    document.body.appendChild(overlay);

    document.getElementById('play-again-btn').addEventListener('click', () => {
        location.reload();
    });
}

// === TRADE & DISRUPTION ===

let tradeOffFirstCard = null;

function initiateTradeOff(playerId, card) {
    const player = state.players[playerId];

    const otherHandCards = player.hand.cards.filter(c => c !== card);
    if (otherHandCards.length === 0) {
        console.log('No other cards in hand for Trade Off');
        return;
    }

    const ownHandIndices = player.hand.cards.map(c => state.cards.indexOf(c));

    enterTargetingMode('card', ownHandIndices, (ownCardIndex) => {
        tradeOffFirstCard = state.cards[ownCardIndex];

        const targetCardIndices = [];
        for (let pNum = 1; pNum <= 4; pNum++) {
            if (pNum === playerId) continue;
            if (!state.playerAlive[pNum]) continue;

            const opponentHand = state.players[pNum].hand.cards;
            const opponentBank = state.players[pNum].bank.cards;

            for (const c of opponentHand) {
                targetCardIndices.push(state.cards.indexOf(c));
            }
            for (const c of opponentBank) {
                targetCardIndices.push(state.cards.indexOf(c));
            }
        }

        if (targetCardIndices.length === 0) {
            console.log('No valid targets for Trade Off');
            tradeOffFirstCard = null;
            return;
        }

        enterTargetingMode('card', targetCardIndices, (targetCardIndex) => {
            const targetCard = state.cards[targetCardIndex];
            startReactionWindow(card, playerId, null, 'trade', false);
            state.reactionState.tradeCards = { own: tradeOffFirstCard, target: targetCard };
        });
    });
}

function executeTradeOff(playerId) {
    const { own, target } = state.reactionState.tradeCards || {};
    if (!own || !target) return;

    const ownZone = findCardZone(own);
    const targetZone = findCardZone(target);

    if (!ownZone || !targetZone) return;

    const ownIndex = ownZone.cards.indexOf(own);
    const targetIndex = targetZone.cards.indexOf(target);

    ownZone.cards[ownIndex] = target;
    targetZone.cards[targetIndex] = own;

    renderFunctions.layoutCardsInZone(ownZone);
    renderFunctions.layoutCardsInZone(targetZone);
    networkFunctions.sendStateUpdate();
}

function initiateTiedUp(playerId, card) {
    const validTargets = [];
    for (let pNum = 1; pNum <= 4; pNum++) {
        if (pNum === playerId) continue;
        if (!state.playerAlive[pNum]) continue;
        if (!state.currentPlayerList.find(p => p.num === pNum && p.connected)) continue;
        validTargets.push(pNum);
    }

    if (validTargets.length === 0) return;

    enterTargetingMode('player', validTargets, (targetPlayerNum) => {
        startReactionWindow(card, playerId, targetPlayerNum, 'skip', false);
    });
}

function executeTiedUp(playerId, targetId, card) {
    const tiedUpCard = card || state.piles.discard.cards.find(c => c.userData.name === 'tied up');
    if (tiedUpCard) {
        removeCardFromZones(tiedUpCard);
        state.players[targetId].effect.cards.push(tiedUpCard);
        renderFunctions.layoutCardsInZone(state.piles.discard);
        renderFunctions.layoutCardsInZone(state.players[targetId].effect);
    }
    networkFunctions.sendStateUpdate();
}

function initiateArson(playerId, card) {
    const validTargets = [];
    for (let pNum = 1; pNum <= 4; pNum++) {
        if (pNum === playerId) continue;
        if (!state.playerAlive[pNum]) continue;
        if (!state.currentPlayerList.find(p => p.num === pNum && p.connected)) continue;
        if (state.players[pNum].bank.cards.length === 0) continue;
        validTargets.push(pNum);
    }

    if (validTargets.length === 0) return;

    enterTargetingMode('bank', validTargets, (targetPlayerNum) => {
        startReactionWindow(card, playerId, targetPlayerNum, 'arson', false);
    });
}

function executeArson(playerId, targetId) {
    const targetBank = state.players[targetId].bank;

    while (targetBank.cards.length > 0) {
        const card = targetBank.cards.pop();
        state.piles.discard.cards.push(card);
    }

    renderFunctions.layoutCardsInZone(targetBank);
    renderFunctions.layoutCardsInZone(state.piles.discard);
    networkFunctions.sendStateUpdate();
}

// === SPECIAL EFFECTS ===

function initiateUpheaval(playerId, card) {
    startReactionWindow(card, playerId, null, 'upheaval', false);
}

function executeUpheaval(playerId) {
    state.upheavalState.active = true;

    const overlay = document.createElement('div');
    overlay.id = 'upheaval-overlay';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.8);
        z-index: 600;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const cardsContainer = document.createElement('div');
    cardsContainer.style.cssText = `
        display: flex;
        gap: 2px;
        position: relative;
    `;

    const deckSize = state.piles.draw.cards.length;
    for (let i = 0; i < deckSize; i++) {
        const cardEl = document.createElement('div');
        cardEl.style.cssText = `
            width: 40px;
            height: 56px;
            background: #8B0000;
            border: 1px solid #333;
            border-radius: 3px;
        `;
        cardsContainer.appendChild(cardEl);
    }

    const splitIndicator = document.createElement('div');
    splitIndicator.id = 'upheaval-split';
    splitIndicator.style.cssText = `
        position: absolute;
        top: 0;
        bottom: 0;
        width: 4px;
        background: #fff;
        pointer-events: none;
        left: 0;
    `;
    cardsContainer.appendChild(splitIndicator);

    const instructions = document.createElement('div');
    instructions.style.cssText = `
        position: absolute;
        bottom: -40px;
        color: white;
        font-size: 16px;
        white-space: nowrap;
    `;
    instructions.textContent = 'Click to cut the deck';
    cardsContainer.appendChild(instructions);

    overlay.appendChild(cardsContainer);
    document.body.appendChild(overlay);

    cardsContainer.addEventListener('mousemove', (e) => {
        const rect = cardsContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const cardWidth = 42;
        state.upheavalState.splitIndex = Math.floor(x / cardWidth);
        state.upheavalState.splitIndex = Math.max(1, Math.min(state.upheavalState.splitIndex, deckSize - 1));
        splitIndicator.style.left = (state.upheavalState.splitIndex * cardWidth - 2) + 'px';
    });

    overlay.addEventListener('click', () => {
        performDeckCut(state.upheavalState.splitIndex);
        overlay.remove();
        state.upheavalState.active = false;
    });
}

function performDeckCut(splitIndex) {
    const deck = state.piles.draw.cards;
    const deckSize = deck.length;

    if (splitIndex <= 0 || splitIndex >= deckSize) return;

    const bottom = deck.slice(0, splitIndex);
    const top = deck.slice(splitIndex);

    state.piles.draw.cards = [...top, ...bottom];

    renderFunctions.layoutCardsInZone(state.piles.draw);
    networkFunctions.sendStateUpdate();
}

// === BOUNTY SYSTEM ===

function initiateBounty(playerId, card) {
    executeBounty(playerId, card);
}

function executeBounty(playerId, card) {
    const player = state.players[playerId];

    for (let i = 0; i < 3; i++) {
        if (state.piles.draw.cards.length > 0) {
            const drawnCard = state.piles.draw.cards.pop();
            drawnCard.userData.faceUp = true;
            player.hand.cards.push(drawnCard);
        }
    }

    removeCardFromZones(card);
    player.effect.cards.push(card);

    const cardIndex = state.cards.indexOf(card);
    state.bountyState[cardIndex] = {
        owner: playerId,
        turnPlayed: state.currentTurnNumber,
        inBountyZone: false
    };

    renderFunctions.layoutCardsInZone(state.piles.draw);
    renderFunctions.layoutCardsInZone(player.hand);
    renderFunctions.layoutCardsInZone(player.effect);
    networkFunctions.sendStateUpdate();
}

export function processBountyProgression(playerNum) {
    const player = state.players[playerNum];
    if (!player) return;

    const bountiesToMove = [];
    for (const card of player.effect.cards) {
        if (card.userData.name.includes('bounty')) {
            const cardIndex = state.cards.indexOf(card);
            const bState = state.bountyState[cardIndex];
            if (bState && !bState.inBountyZone) {
                bountiesToMove.push(card);
                bState.inBountyZone = true;
            }
        }
    }

    for (const card of bountiesToMove) {
        removeCardFromZones(card);
        state.piles.bounty.cards.push(card);
    }

    if (bountiesToMove.length > 0) {
        renderFunctions.layoutCardsInZone(player.effect);
        renderFunctions.layoutCardsInZone(state.piles.bounty);
    }
}

export function initiateBountyUse(playerNum, bountyCard) {
    const validTargets = [];
    for (let pNum = 1; pNum <= 4; pNum++) {
        if (!state.playerAlive[pNum]) continue;
        if (!state.currentPlayerList.find(p => p.num === pNum && p.connected)) continue;
        validTargets.push(pNum);
    }

    enterTargetingMode('mark', validTargets, (targetPlayerNum) => {
        executeBountyKill(playerNum, targetPlayerNum, bountyCard);
    });
}

function executeBountyKill(killerNum, targetNum, bountyCard) {
    const bountySuit = bountyCard.userData.name.replace(' bounty', '');
    const targetMarkZone = state.players[targetNum].mark;
    const targetMark = targetMarkZone.cards[0];
    const targetSuit = targetMark?.userData.name.replace(' mark', '');

    removeCardFromZones(bountyCard);
    state.piles.discard.cards.push(bountyCard);

    if (targetSuit === bountySuit) {
        executeKill(killerNum, targetNum, bountyCard);
    } else {
        executeKill(targetNum, killerNum, bountyCard);
    }

    renderFunctions.layoutCardsInZone(state.piles.bounty);
    renderFunctions.layoutCardsInZone(state.piles.discard);
    networkFunctions.sendStateUpdate();
}

// === TARGETING SYSTEM ===

export function enterTargetingMode(type, validTargets, callback) {
    state.targetingState.active = true;
    state.targetingState.type = type;
    state.targetingState.validTargets = validTargets;
    state.targetingState.callback = callback;
    state.targetingState.highlightMeshes = [];

    highlightTargets();

    state.renderer.domElement.style.cursor = 'crosshair';
}

export function exitTargetingMode() {
    for (const mesh of state.targetingState.highlightMeshes) {
        state.scene.remove(mesh);
    }

    state.targetingState.active = false;
    state.targetingState.type = null;
    state.targetingState.validTargets = [];
    state.targetingState.callback = null;
    state.targetingState.highlightMeshes = [];

    state.renderer.domElement.style.cursor = 'default';
}

function highlightTargets() {
    const highlightMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide
    });

    if (state.targetingState.type === 'player' || state.targetingState.type === 'mark') {
        for (const playerNum of state.targetingState.validTargets) {
            const markZone = state.players[playerNum]?.mark;
            if (!markZone) continue;

            const isRotated = markZone.rotation !== 0;
            const geoWidth = isRotated ? (markZone.height + 0.5) : (markZone.width + 0.5);
            const geoHeight = isRotated ? (markZone.width + 0.5) : (markZone.height + 0.5);
            const geometry = new THREE.PlaneGeometry(geoWidth, geoHeight);
            const highlight = new THREE.Mesh(geometry, highlightMaterial);
            highlight.rotation.x = -Math.PI / 2;
            highlight.position.set(markZone.x, -0.005, markZone.z);
            highlight.renderOrder = -1;
            highlight.userData.targetPlayerNum = playerNum;
            state.scene.add(highlight);
            state.targetingState.highlightMeshes.push(highlight);
        }
    }

    if (state.targetingState.type === 'bank') {
        for (const playerNum of state.targetingState.validTargets) {
            const bankZone = state.players[playerNum]?.bank;
            if (!bankZone) continue;

            const isRotated = bankZone.rotation !== 0;
            const geoWidth = isRotated ? (bankZone.height + 0.5) : (bankZone.width + 0.5);
            const geoHeight = isRotated ? (bankZone.width + 0.5) : (bankZone.height + 0.5);
            const geometry = new THREE.PlaneGeometry(geoWidth, geoHeight);
            const highlight = new THREE.Mesh(geometry, highlightMaterial);
            highlight.rotation.x = -Math.PI / 2;
            highlight.position.set(bankZone.x, -0.005, bankZone.z);
            highlight.renderOrder = -1;
            highlight.userData.targetPlayerNum = playerNum;
            state.scene.add(highlight);
            state.targetingState.highlightMeshes.push(highlight);
        }
    }

    if (state.targetingState.type === 'card') {
        for (const cardIndex of state.targetingState.validTargets) {
            const card = state.cards[cardIndex];
            if (!card) continue;

            const isRotated = Math.abs(card.rotation.y) > 0.1;
            const geoWidth = isRotated ? (CARD_HEIGHT + 0.3) : (CARD_WIDTH + 0.3);
            const geoHeight = isRotated ? (CARD_WIDTH + 0.3) : (CARD_HEIGHT + 0.3);
            const geometry = new THREE.PlaneGeometry(geoWidth, geoHeight);
            const highlight = new THREE.Mesh(geometry, highlightMaterial);
            highlight.rotation.x = -Math.PI / 2;
            highlight.position.copy(card.position);
            highlight.position.y = -0.005;
            highlight.renderOrder = -1;
            highlight.userData.targetCardIndex = cardIndex;
            state.scene.add(highlight);
            state.targetingState.highlightMeshes.push(highlight);
        }
    }
}

export function handleTargetClick(event, updateMouse) {
    if (!state.targetingState.active) return false;

    updateMouse(event);
    state.raycaster.setFromCamera(state.mouse, state.camera);

    const highlightIntersects = state.raycaster.intersectObjects(state.targetingState.highlightMeshes);
    if (highlightIntersects.length > 0) {
        const hit = highlightIntersects[0].object;

        if (hit.userData.targetPlayerNum !== undefined) {
            const callback = state.targetingState.callback;
            const target = hit.userData.targetPlayerNum;
            exitTargetingMode();
            callback(target);
            return true;
        }

        if (hit.userData.targetCardIndex !== undefined) {
            const callback = state.targetingState.callback;
            const target = hit.userData.targetCardIndex;
            exitTargetingMode();
            callback(target);
            return true;
        }
    }

    return false;
}

// === REACTION SYSTEM ===

export function startReactionWindow(card, playerId, targetId, effectType, isLethal = false) {
    const cardIndex = state.cards.indexOf(card);

    state.reactionState.active = true;
    state.reactionState.card = card;
    state.reactionState.cardIndex = cardIndex;
    state.reactionState.playerId = playerId;
    state.reactionState.targetId = targetId;
    state.reactionState.timeRemaining = 5000;
    state.reactionState.eligibleReactors = [];
    state.reactionState.responses = {};
    state.reactionState.startTime = Date.now();
    state.reactionState.effectType = effectType;
    state.reactionState.isLethal = isLethal;
    state.reactionState.reactionPhase = 1;
    state.reactionState.pendingReaction = null;

    if (!isLethal) {
        for (let pNum = 1; pNum <= 4; pNum++) {
            if (pNum === playerId) continue;
            if (!state.playerAlive[pNum]) continue;
            if (!state.currentPlayerList.find(p => p.num === pNum && p.connected)) continue;

            if (canPlayerReact(pNum, 'snub')) {
                state.reactionState.eligibleReactors.push(pNum);
            }
        }
    }

    if (effectType === 'peek' && targetId) {
        if (canPlayerReact(targetId, 'blind spot')) {
            if (!state.reactionState.eligibleReactors.includes(targetId)) {
                state.reactionState.eligibleReactors.push(targetId);
            }
        }
        if (canPlayerReact(targetId, 'revenge')) {
            if (!state.reactionState.eligibleReactors.includes(targetId)) {
                state.reactionState.eligibleReactors.push(targetId);
            }
        }
    }

    showReactionOverlay();
    updateReactionTimer();

    if (state.isHost) {
        networkFunctions.broadcastReactionStart();
    } else {
        networkFunctions.sendReactionStartToHost();
    }
}

export function canPlayerReact(playerNum, cardName) {
    const player = state.players[playerNum];
    if (!player) return false;

    const hasCard = player.hand.cards.some(c => c.userData.name === cardName);
    if (!hasCard) return false;

    const cardDef = CARD_DEFS.find(d => d.name === cardName);
    const cost = cardDef?.cost || 0;
    const bankValue = player.bank.cards.reduce((sum, c) => sum + getCardValue(c), 0);

    return bankValue >= cost;
}

export function getPlayerReactiveCards(playerNum, effectType) {
    const player = state.players[playerNum];
    if (!player) return [];

    const validCardTypes = ['snub'];
    if (effectType === 'peek') {
        validCardTypes.push('blind spot', 'revenge');
    }

    const reactiveCards = [];
    const seenCardNames = new Set();

    for (const cardName of validCardTypes) {
        if (seenCardNames.has(cardName)) continue;
        if (!canPlayerReact(playerNum, cardName)) continue;

        const card = player.hand.cards.find(c => c.userData.name === cardName);
        if (card) {
            seenCardNames.add(cardName);
            reactiveCards.push(card);
        }
    }

    return reactiveCards;
}

// === 3D TIMER SPRITE ===

function createTimerSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(4, 2, 1);

    state.reactionState.timerSprite = sprite;
    state.reactionState.timerCanvas = canvas;
    state.reactionState.timerCtx = ctx;
    state.scene.add(sprite);
}

function updateTimerSprite(time) {
    if (!state.reactionState.timerCtx) return;
    const ctx = state.reactionState.timerCtx;
    ctx.clearRect(0, 0, 128, 64);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(time, 64, 32);
    if (state.reactionState.timerSprite?.material?.map) {
        state.reactionState.timerSprite.material.map.needsUpdate = true;
    }
}

function removeTimerSprite() {
    if (state.reactionState.timerSprite) {
        state.scene.remove(state.reactionState.timerSprite);
        state.reactionState.timerSprite = null;
        state.reactionState.timerCanvas = null;
        state.reactionState.timerCtx = null;
    }
}

// Position constants for reaction display
const REACTION_CARD_Y = 5;
const REACTION_CARD_Z = 0;
const TIMER_Y = 8;
const ORIGINAL_CARD_X = -4;
const CARD_SPACING = CARD_WIDTH * 2.2;

export function showReactionOverlay() {
    const overlay = document.getElementById('reaction-overlay');
    overlay.classList.remove('hidden');

    // Hide HTML elements - we use 3D timer instead
    const cardDisplay = document.getElementById('reaction-card-display');
    cardDisplay.style.display = 'none';
    const message = document.getElementById('reaction-message');
    message.style.display = 'none';
    const timerEl = document.getElementById('reaction-timer');
    timerEl.style.display = 'none';
    const prompt = document.getElementById('reaction-prompt');
    prompt.style.display = 'none';

    // Remove any existing dim plane before creating a new one
    if (state.reactionState.dimPlane) {
        state.scene.remove(state.reactionState.dimPlane);
        state.reactionState.dimPlane = null;
    }

    const dimGeometry = new THREE.PlaneGeometry(100, 100);
    const dimMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    state.reactionState.dimPlane = new THREE.Mesh(dimGeometry, dimMaterial);
    state.reactionState.dimPlane.rotation.x = -Math.PI / 2;
    state.reactionState.dimPlane.position.set(0, 3, 0);
    state.scene.add(state.reactionState.dimPlane);

    // Create 3D timer sprite
    removeTimerSprite();
    createTimerSprite();
    state.reactionState.timerSprite.position.set(0, TIMER_Y, REACTION_CARD_Z);
    updateTimerSprite('5.0');

    const card = state.reactionState.card;
    if (card) {
        state.reactionState.originalCardState = {
            position: card.position.clone(),
            rotation: { y: card.rotation.y, z: card.rotation.z },
            scale: card.scale.clone()
        };

        // Position original card on the LEFT
        state.setAnimatingCards(state.animatingCards.filter(a => a.card !== card));
        state.animatingCards.push({
            card,
            startPos: card.position.clone(),
            endPos: new THREE.Vector3(ORIGINAL_CARD_X, REACTION_CARD_Y, REACTION_CARD_Z),
            startRot: card.rotation.y,
            endRot: 0,
            startRotZ: card.rotation.z,
            endRotZ: 0,
            startScale: card.scale.x,
            endScale: 2,
            liftHeight: 0,
            baseY: REACTION_CARD_Y,
            startTime: performance.now(),
            duration: 300
        });
    }

    const buttons = document.getElementById('reaction-buttons');
    const waiting = document.getElementById('reaction-waiting');

    buttons.style.display = 'none';
    waiting.style.display = 'none';

    if (state.reactionState.eligibleReactors.includes(state.myPlayerNumber)) {
        displayReactiveCards();
    }
}

export function hideReactionOverlay() {
    const overlay = document.getElementById('reaction-overlay');
    overlay.classList.add('hidden');

    // Clean up dim plane
    if (state.reactionState.dimPlane) {
        state.scene.remove(state.reactionState.dimPlane);
        state.reactionState.dimPlane = null;
    }

    // Clean up 3D timer sprite
    removeTimerSprite();

    // Return reaction card to original position if displayed
    if (state.reactionState.reactionCardDisplayState) {
        const displayState = state.reactionState.reactionCardDisplayState;
        const card = displayState.card;

        state.setAnimatingCards(state.animatingCards.filter(a => a.card !== card));
        state.animatingCards.push({
            card: card,
            startPos: card.position.clone(),
            endPos: displayState.originalPosition.clone(),
            startRot: card.rotation.y,
            endRot: displayState.originalRotation.y,
            startRotZ: card.rotation.z,
            endRotZ: displayState.originalRotation.z,
            liftHeight: 2,
            baseY: displayState.originalPosition.y,
            startScale: card.scale.x,
            endScale: displayState.originalScale.x,
            startTime: performance.now(),
            duration: 400
        });

        state.reactionState.reactionCardDisplayState = null;
    }
}

export function displayReactiveCards() {
    const reactiveCards = getPlayerReactiveCards(state.myPlayerNumber, state.reactionState.effectType);

    if (reactiveCards.length === 0) return;

    state.reactionState.displayedReactionCards = [];
    state.reactionState.reactionCardMeshes = [];
    state.reactionState.selectedCardName = null;

    // Position reactive cards to the right of the original card
    const startX = ORIGINAL_CARD_X + CARD_SPACING;

    reactiveCards.forEach((card, index) => {
        const originalState = {
            card: card,
            originalPosition: card.position.clone(),
            originalRotation: { y: card.rotation.y, z: card.rotation.z },
            originalScale: card.scale.clone(),
            cardName: card.userData.name,
            displayIndex: index
        };
        state.reactionState.displayedReactionCards.push(originalState);
        state.reactionState.reactionCardMeshes.push(card);

        const targetX = startX + index * CARD_SPACING;
        const targetPos = new THREE.Vector3(targetX, REACTION_CARD_Y, REACTION_CARD_Z);

        state.setAnimatingCards(state.animatingCards.filter(a => a.card !== card));
        state.animatingCards.push({
            card: card,
            startPos: card.position.clone(),
            endPos: targetPos,
            startRot: card.rotation.y,
            endRot: 0,
            startRotZ: card.rotation.z,
            endRotZ: 0,
            liftHeight: 2,
            baseY: REACTION_CARD_Y,
            startScale: card.scale.x,
            endScale: 1.5,
            startTime: performance.now(),
            duration: 400
        });
    });
}

function highlightReactionCard(card) {
    const displayState = state.reactionState.displayedReactionCards.find(d => d.card === card);
    if (!displayState) return;

    const index = displayState.displayIndex;
    // Phase 1: cards start at ORIGINAL_CARD_X + CARD_SPACING
    // Phase 2: counter cards start at ORIGINAL_CARD_X + 2 * CARD_SPACING
    const baseOffset = state.reactionState.reactionPhase === 2 ? 2 : 1;
    const startX = ORIGINAL_CARD_X + baseOffset * CARD_SPACING;
    const targetX = startX + index * CARD_SPACING;

    state.setAnimatingCards(state.animatingCards.filter(a => a.card !== card));
    state.animatingCards.push({
        card: card,
        startPos: card.position.clone(),
        endPos: new THREE.Vector3(targetX, REACTION_CARD_Y + 0.5, REACTION_CARD_Z),
        startRot: card.rotation.y,
        endRot: 0,
        startScale: card.scale.x,
        endScale: 1.8,
        startTime: performance.now(),
        duration: 150
    });
}

function unhighlightReactionCard(card) {
    const displayState = state.reactionState.displayedReactionCards.find(d => d.card === card);
    if (!displayState) return;

    const index = displayState.displayIndex;
    // Phase 1: cards start at ORIGINAL_CARD_X + CARD_SPACING
    // Phase 2: counter cards start at ORIGINAL_CARD_X + 2 * CARD_SPACING
    const baseOffset = state.reactionState.reactionPhase === 2 ? 2 : 1;
    const startX = ORIGINAL_CARD_X + baseOffset * CARD_SPACING;
    const targetX = startX + index * CARD_SPACING;

    state.setAnimatingCards(state.animatingCards.filter(a => a.card !== card));
    state.animatingCards.push({
        card: card,
        startPos: card.position.clone(),
        endPos: new THREE.Vector3(targetX, REACTION_CARD_Y, REACTION_CARD_Z),
        startRot: card.rotation.y,
        endRot: 0,
        startScale: card.scale.x,
        endScale: 1.5,
        startTime: performance.now(),
        duration: 150
    });
}

export function returnReactionCardsToHand() {
    for (const displayState of state.reactionState.displayedReactionCards) {
        const card = displayState.card;

        state.setAnimatingCards(state.animatingCards.filter(a => a.card !== card));
        state.animatingCards.push({
            card: card,
            startPos: card.position.clone(),
            endPos: displayState.originalPosition.clone(),
            startRot: card.rotation.y,
            endRot: displayState.originalRotation.y,
            startRotZ: card.rotation.z,
            endRotZ: displayState.originalRotation.z,
            liftHeight: 2,
            baseY: displayState.originalPosition.y,
            startScale: card.scale.x,
            endScale: displayState.originalScale.x,
            startTime: performance.now(),
            duration: 400
        });
    }

    state.reactionState.displayedReactionCards = [];
    state.reactionState.reactionCardMeshes = [];
    state.reactionState.selectedCardName = null;
}

export function handleReactionCardClick(event, updateMouse) {
    updateMouse(event);
    state.raycaster.setFromCamera(state.mouse, state.camera);

    const intersects = state.raycaster.intersectObjects(state.reactionState.reactionCardMeshes);
    if (intersects.length === 0) return false;

    const clickedCard = intersects[0].object;
    const cardName = clickedCard.userData.name;

    if (state.reactionState.selectedCardName === cardName) {
        // Deselecting
        state.reactionState.selectedCardName = null;
        unhighlightReactionCard(clickedCard);

        // Send pass to host immediately
        state.reactionState.responses[state.myPlayerNumber] = { type: 'pass' };
        if (!state.isHost && state.hostConnection?.open) {
            state.hostConnection.send({
                type: 'reaction_response',
                playerId: state.myPlayerNumber,
                response: 'pass'
            });
        }
    } else {
        // Unhighlight previous selection
        if (state.reactionState.selectedCardName) {
            const prevCard = state.reactionState.reactionCardMeshes.find(
                c => c.userData.name === state.reactionState.selectedCardName
            );
            if (prevCard) unhighlightReactionCard(prevCard);
        }

        // Select new card
        state.reactionState.selectedCardName = cardName;
        highlightReactionCard(clickedCard);

        // Send react to host immediately
        state.reactionState.responses[state.myPlayerNumber] = {
            type: 'react',
            cardName: cardName
        };
        if (!state.isHost && state.hostConnection?.open) {
            state.hostConnection.send({
                type: 'reaction_response',
                playerId: state.myPlayerNumber,
                response: 'react',
                cardName: cardName
            });
        }
    }

    return true;
}

export function updateReactionTimer() {
    if (!state.reactionState.active) return;

    const elapsed = Date.now() - state.reactionState.startTime;
    const remaining = Math.max(0, 5000 - elapsed);
    state.reactionState.timeRemaining = remaining;

    // Update 3D timer sprite
    updateTimerSprite((remaining / 1000).toFixed(1));

    if (remaining > 0) {
        requestAnimationFrame(updateReactionTimer);
    } else {
        resolveReaction();
    }
}

export function sendReactionResponse(response) {
    state.reactionState.responses[state.myPlayerNumber] = response;

    const buttons = document.getElementById('reaction-buttons');
    const waiting = document.getElementById('reaction-waiting');
    buttons.style.display = 'none';
    waiting.style.display = 'block';
    waiting.textContent = 'Response sent, waiting...';

    if (state.isHost) {
        checkAllReactionsReceived();
    } else if (state.hostConnection?.open) {
        state.hostConnection.send({
            type: 'reaction_response',
            playerId: state.myPlayerNumber,
            response: response
        });
    }
}

export function checkAllReactionsReceived() {
    // Timer will handle resolution - don't end early
    // This allows players to change their mind until time runs out
}

function getValidCounterCards(reactionCardName) {
    switch (reactionCardName) {
        case 'snub':
            return ['snub'];
        case 'blind spot':
            return ['snub'];
        case 'revenge':
            return ['snub', 'blind spot'];
        default:
            return [];
    }
}

function startCounterReactionPhase(reactor) {
    const reactorId = parseInt(reactor[0]);
    const response = reactor[1];
    const reactionCardName = typeof response === 'object' ? response.cardName : null;

    if (!reactionCardName) {
        // No valid reaction card, just execute original effect
        executeCardEffect(state.reactionState.card, state.reactionState.playerId, state.reactionState.targetId);
        networkFunctions.broadcastReactionResolve(null);
        return;
    }

    // Determine who can counter and with what
    const counterReactors = [];
    const validCounterCards = getValidCounterCards(reactionCardName);

    for (let pNum = 1; pNum <= 4; pNum++) {
        if (pNum === reactorId) continue; // Can't counter own reaction
        if (!state.playerAlive[pNum]) continue;
        if (!state.currentPlayerList.find(p => p.num === pNum && p.connected)) continue;

        // Check if player has any valid counter cards they can afford
        for (const cardName of validCounterCards) {
            if (canPlayerReact(pNum, cardName)) {
                counterReactors.push(pNum);
                break;
            }
        }
    }

    if (counterReactors.length === 0) {
        // No one can counter - reaction succeeds, block original effect
        handleReactionBlock(reactorId, reactionCardName);
        networkFunctions.broadcastReactionResolve(reactorId);
        return;
    }

    // Start Phase 2
    state.reactionState.reactionPhase = 2;
    state.reactionState.pendingReaction = { playerId: reactorId, cardName: reactionCardName };
    state.reactionState.eligibleReactors = counterReactors;
    state.reactionState.responses = {};
    state.reactionState.startTime = Date.now();
    state.reactionState.selectedCardName = null;
    state.reactionState.active = true;

    // Broadcast Phase 2 start to all clients
    networkFunctions.broadcastCounterReactionStart(reactorId, reactionCardName, counterReactors);

    // Show counter-reaction overlay on host
    showCounterReactionOverlay(reactionCardName);
    updateReactionTimer();
}

function finalResolve() {
    const counterReactor = Object.entries(state.reactionState.responses).find(([_, r]) => {
        if (typeof r === 'string') return r === 'react';
        return r?.type === 'react';
    });

    const pendingReaction = state.reactionState.pendingReaction;

    if (counterReactor) {
        // Counter-reaction happened - pay cost, discard counter card
        const counterReactorId = parseInt(counterReactor[0]);
        const counterResponse = counterReactor[1];
        const counterCardName = typeof counterResponse === 'object' ? counterResponse.cardName : null;
        handleReactionBlock(counterReactorId, counterCardName);

        // Also discard the original reaction card (it was countered)
        const originalReactor = state.players[pendingReaction.playerId];
        const originalReactionCard = originalReactor.hand.cards.find(c => c.userData.name === pendingReaction.cardName);
        if (originalReactionCard) {
            // Pay cost for original reaction
            const cardDef = CARD_DEFS.find(d => d.name === pendingReaction.cardName);
            const cost = cardDef?.cost || 0;
            if (cost > 0) {
                const payment = selectPayment(originalReactor.bank.cards, cost);
                if (payment) {
                    for (const payCard of payment) {
                        removeCardFromZones(payCard);
                        state.piles.discard.cards.push(payCard);
                    }
                    renderFunctions.layoutCardsInZone(originalReactor.bank);
                }
            }
            removeCardFromZones(originalReactionCard);
            state.piles.discard.cards.push(originalReactionCard);
            renderFunctions.layoutCardsInZone(originalReactor.hand);
            renderFunctions.layoutCardsInZone(state.piles.discard);
        }

        // Original reaction is cancelled, so original effect goes through
        executeCardEffect(state.reactionState.card, state.reactionState.playerId, state.reactionState.targetId);
        networkFunctions.broadcastReactionResolve(null); // null = original effect went through
    } else {
        // No counter - original reaction succeeds
        handleReactionBlock(pendingReaction.playerId, pendingReaction.cardName);
        networkFunctions.broadcastReactionResolve(pendingReaction.playerId);
    }
}

export function showCounterReactionOverlay(reactionCardName) {
    const overlay = document.getElementById('reaction-overlay');
    overlay.classList.remove('hidden');

    // Hide HTML elements
    const message = document.getElementById('reaction-message');
    message.style.display = 'none';
    const timerEl = document.getElementById('reaction-timer');
    timerEl.style.display = 'none';
    const prompt = document.getElementById('reaction-prompt');
    prompt.style.display = 'none';

    // Create dim plane for counter-reaction phase
    if (state.reactionState.dimPlane) {
        state.scene.remove(state.reactionState.dimPlane);
        state.reactionState.dimPlane = null;
    }

    const dimGeometry = new THREE.PlaneGeometry(100, 100);
    const dimMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    state.reactionState.dimPlane = new THREE.Mesh(dimGeometry, dimMaterial);
    state.reactionState.dimPlane.rotation.x = -Math.PI / 2;
    state.reactionState.dimPlane.position.set(0, 3, 0);
    state.scene.add(state.reactionState.dimPlane);

    // Create/reset 3D timer sprite
    removeTimerSprite();
    createTimerSprite();
    state.reactionState.timerSprite.position.set(0, TIMER_Y, REACTION_CARD_Z);
    updateTimerSprite('5.0');

    // Animate original card back to left position (in case it moved)
    const originalCard = state.reactionState.card;
    if (originalCard) {
        state.setAnimatingCards(state.animatingCards.filter(a => a.card !== originalCard));
        state.animatingCards.push({
            card: originalCard,
            startPos: originalCard.position.clone(),
            endPos: new THREE.Vector3(ORIGINAL_CARD_X, REACTION_CARD_Y, REACTION_CARD_Z),
            startRot: originalCard.rotation.y,
            endRot: 0,
            startScale: originalCard.scale.x,
            endScale: 2,
            startTime: performance.now(),
            duration: 300
        });
    }

    // Find and animate the reaction card to display next to original
    const reactorId = state.reactionState.pendingReaction?.playerId;
    const reactor = state.players[reactorId];
    if (reactor && reactionCardName) {
        const reactionCard = reactor.hand.cards.find(c => c.userData.name === reactionCardName);
        if (reactionCard) {
            // Store original state for this card
            state.reactionState.reactionCardDisplayState = {
                card: reactionCard,
                originalPosition: reactionCard.position.clone(),
                originalRotation: { y: reactionCard.rotation.y, z: reactionCard.rotation.z },
                originalScale: reactionCard.scale.clone()
            };

            // Animate to position next to original card
            const reactionCardX = ORIGINAL_CARD_X + CARD_SPACING;
            state.setAnimatingCards(state.animatingCards.filter(a => a.card !== reactionCard));
            state.animatingCards.push({
                card: reactionCard,
                startPos: reactionCard.position.clone(),
                endPos: new THREE.Vector3(reactionCardX, REACTION_CARD_Y, REACTION_CARD_Z),
                startRot: reactionCard.rotation.y,
                endRot: 0,
                startRotZ: reactionCard.rotation.z,
                endRotZ: 0,
                startScale: reactionCard.scale.x,
                endScale: 1.8,
                liftHeight: 2,
                baseY: REACTION_CARD_Y,
                startTime: performance.now(),
                duration: 400
            });
        }
    }

    const buttons = document.getElementById('reaction-buttons');
    const waiting = document.getElementById('reaction-waiting');
    buttons.style.display = 'none';
    waiting.style.display = 'none';

    if (state.reactionState.eligibleReactors.includes(state.myPlayerNumber)) {
        displayCounterReactiveCards();
    }
}

function displayCounterReactiveCards() {
    const reactionCardName = state.reactionState.pendingReaction?.cardName;
    if (!reactionCardName) return;

    const validCounterCards = getValidCounterCards(reactionCardName);
    const player = state.players[state.myPlayerNumber];
    if (!player) return;

    state.reactionState.displayedReactionCards = [];
    state.reactionState.reactionCardMeshes = [];
    state.reactionState.selectedCardName = null;

    const reactiveCards = [];
    for (const cardName of validCounterCards) {
        if (canPlayerReact(state.myPlayerNumber, cardName)) {
            const card = player.hand.cards.find(c => c.userData.name === cardName);
            if (card && !reactiveCards.includes(card)) {
                reactiveCards.push(card);
            }
        }
    }

    if (reactiveCards.length === 0) return;

    // Position counter-reactive cards to the right of the reaction card
    // Original card at ORIGINAL_CARD_X, reaction card at ORIGINAL_CARD_X + CARD_SPACING
    // So counter cards start at ORIGINAL_CARD_X + 2 * CARD_SPACING
    const startX = ORIGINAL_CARD_X + 2 * CARD_SPACING;

    reactiveCards.forEach((card, index) => {
        const originalState = {
            card: card,
            originalPosition: card.position.clone(),
            originalRotation: { y: card.rotation.y, z: card.rotation.z },
            originalScale: card.scale.clone(),
            cardName: card.userData.name,
            displayIndex: index
        };
        state.reactionState.displayedReactionCards.push(originalState);
        state.reactionState.reactionCardMeshes.push(card);

        const targetX = startX + index * CARD_SPACING;
        const targetPos = new THREE.Vector3(targetX, REACTION_CARD_Y, REACTION_CARD_Z);

        state.setAnimatingCards(state.animatingCards.filter(a => a.card !== card));
        state.animatingCards.push({
            card: card,
            startPos: card.position.clone(),
            endPos: targetPos,
            startRot: card.rotation.y,
            endRot: 0,
            startRotZ: card.rotation.z,
            endRotZ: 0,
            liftHeight: 2,
            baseY: REACTION_CARD_Y,
            startScale: card.scale.x,
            endScale: 1.5,
            startTime: performance.now(),
            duration: 400
        });
    });
}

export function resolveReaction() {
    if (!state.reactionState.active) return;

    // Record local player's response based on current selection
    if (state.reactionState.eligibleReactors.includes(state.myPlayerNumber) &&
        state.reactionState.responses[state.myPlayerNumber] === undefined) {
        if (state.reactionState.selectedCardName) {
            state.reactionState.responses[state.myPlayerNumber] = {
                type: 'react',
                cardName: state.reactionState.selectedCardName
            };
        } else {
            state.reactionState.responses[state.myPlayerNumber] = { type: 'pass' };
        }
        // Send to host
        if (!state.isHost && state.hostConnection?.open) {
            state.hostConnection.send({
                type: 'reaction_response',
                playerId: state.myPlayerNumber,
                response: state.reactionState.selectedCardName ? 'react' : 'pass',
                cardName: state.reactionState.selectedCardName
            });
        }
    }

    // Non-host: just do UI cleanup and wait for host's decision
    if (!state.isHost) {
        state.reactionState.active = false;
        returnReactionCardsToHand();

        const card = state.reactionState.card;
        if (card && state.reactionState.originalCardState) {
            const orig = state.reactionState.originalCardState;
            state.setAnimatingCards(state.animatingCards.filter(a => a.card !== card));
            state.animatingCards.push({
                card: card,
                startPos: card.position.clone(),
                endPos: orig.position.clone(),
                startRot: card.rotation.y,
                endRot: orig.rotation.y,
                startRotZ: card.rotation.z,
                endRotZ: orig.rotation.z,
                liftHeight: 2,
                baseY: orig.position.y,
                startScale: card.scale.x,
                endScale: orig.scale.x,
                startTime: performance.now(),
                duration: 300
            });
        }

        hideReactionOverlay();
        return;
    }

    // Host logic: handle phase resolution
    const reactor = Object.entries(state.reactionState.responses).find(([_, r]) => {
        if (typeof r === 'string') return r === 'react';
        return r?.type === 'react';
    });

    if (state.reactionState.reactionPhase === 1) {
        // Phase 1 complete
        state.reactionState.active = false;
        returnReactionCardsToHand();

        const card = state.reactionState.card;
        if (card && state.reactionState.originalCardState) {
            const orig = state.reactionState.originalCardState;
            state.setAnimatingCards(state.animatingCards.filter(a => a.card !== card));
            state.animatingCards.push({
                card: card,
                startPos: card.position.clone(),
                endPos: orig.position.clone(),
                startRot: card.rotation.y,
                endRot: orig.rotation.y,
                startRotZ: card.rotation.z,
                endRotZ: orig.rotation.z,
                liftHeight: 2,
                baseY: orig.position.y,
                startScale: card.scale.x,
                endScale: orig.scale.x,
                startTime: performance.now(),
                duration: 300
            });
        }

        hideReactionOverlay();

        if (reactor) {
            // Phase 1 had a reaction - start Phase 2 (counter-reaction)
            startCounterReactionPhase(reactor);
        } else {
            // No reaction - execute original effect
            executeCardEffect(state.reactionState.card, state.reactionState.playerId, state.reactionState.targetId);
            networkFunctions.broadcastReactionResolve(null);
        }
    } else if (state.reactionState.reactionPhase === 2) {
        // Phase 2 complete - final resolution
        state.reactionState.active = false;
        returnReactionCardsToHand();
        hideReactionOverlay();

        finalResolve();

        // Reset phase for next reaction
        state.reactionState.reactionPhase = 1;
        state.reactionState.pendingReaction = null;
    }
}

export function handleReactionBlock(reactorPlayerNum, selectedCardName = null) {
    const player = state.players[reactorPlayerNum];
    let reactionCard = null;
    let reactionType = null;

    if (selectedCardName) {
        reactionCard = player.hand.cards.find(c => c.userData.name === selectedCardName);
        reactionType = selectedCardName === 'blind spot' ? 'blindspot' : selectedCardName;
    } else {
        if (state.reactionState.effectType === 'peek') {
            reactionCard = player.hand.cards.find(c => c.userData.name === 'blind spot');
            if (reactionCard) {
                reactionType = 'blindspot';
            } else {
                reactionCard = player.hand.cards.find(c => c.userData.name === 'revenge');
                reactionType = 'revenge';
            }
        } else {
            reactionCard = player.hand.cards.find(c => c.userData.name === 'snub');
            reactionType = 'snub';
        }
    }

    if (!reactionCard) return;

    const cardDef = CARD_DEFS.find(d => d.name === reactionCard.userData.name);
    const cost = cardDef?.cost || 0;

    if (cost > 0) {
        const payment = selectPayment(player.bank.cards, cost);
        if (payment) {
            for (const payCard of payment) {
                removeCardFromZones(payCard);
                state.piles.discard.cards.push(payCard);
            }
            renderFunctions.layoutCardsInZone(player.bank);
        }
    }

    removeCardFromZones(reactionCard);
    state.piles.discard.cards.push(reactionCard);
    renderFunctions.layoutCardsInZone(player.hand);
    renderFunctions.layoutCardsInZone(state.piles.discard);

    if (reactionType === 'revenge' && state.reactionState.effectType === 'peek') {
        addMarkKnowledge(state.reactionState.playerId, state.reactionState.targetId);
        addMarkKnowledge(state.reactionState.targetId, state.reactionState.playerId);
    }

    networkFunctions.sendStateUpdate();
}

// === GAME SETUP ===

export function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function setupGame() {
    for (const zone of state.zones) {
        zone.cards = [];
    }

    const markCards = state.cards.filter(c => c.userData.name.includes('mark'));
    const mainDeck = state.cards.filter(c => !c.userData.name.includes('mark'));

    shuffle(markCards);

    const playerMarkZones = [
        state.players[1].mark,
        state.players[2].mark,
        state.players[3].mark,
        state.players[4].mark,
    ];

    const connectedNums = state.currentPlayerList
        .filter(p => p.connected)
        .map(p => p.num);

    for (let i = 0; i < 4; i++) {
        const markCard = markCards[i];
        const markZone = playerMarkZones[i];
        const playerNum = i + 1;
        const isConnected = connectedNums.includes(playerNum);

        markCard.userData.faceUp = !isConnected;

        markZone.cards.push(markCard);
        renderFunctions.layoutCardsInZone(markZone, false);
    }

    const extraMarkCard = markCards[4];
    extraMarkCard.userData.faceUp = false;
    state.piles.extraMark.cards.push(extraMarkCard);
    renderFunctions.layoutCardsInZone(state.piles.extraMark, false);

    shuffle(mainDeck);

    let deckIndex = 0;
    for (const playerNum of connectedNums) {
        const playerHand = state.players[playerNum].hand;
        for (let i = 0; i < 3; i++) {
            if (deckIndex < mainDeck.length) {
                const card = mainDeck[deckIndex];
                card.userData.faceUp = true;
                playerHand.cards.push(card);
                deckIndex++;
            }
        }
        renderFunctions.layoutCardsInZone(playerHand, false);
    }

    for (let i = deckIndex; i < mainDeck.length; i++) {
        const card = mainDeck[i];
        card.userData.faceUp = false;
        state.piles.draw.cards.push(card);
    }
    renderFunctions.layoutCardsInZone(state.piles.draw, false);
}
