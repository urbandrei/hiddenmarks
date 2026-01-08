// Turn management and action execution
import * as state from './state.js';
import { removeCardFromZones, getCardCost, selectPayment } from './cardUtils.js';

// Function stubs (set via setters to avoid circular deps)
let networkFunctions = {
    sendStateUpdate: () => console.log('sendStateUpdate not set'),
};

let renderFunctions = {
    layoutCardsInZone: () => console.log('layoutCardsInZone not set'),
};

let effectFunctions = {
    executeCardEffect: () => console.log('executeCardEffect not set'),
    initiateKill: () => console.log('initiateKill not set'),
    initiateUnmasked: () => console.log('initiateUnmasked not set'),
    initiateAlterEgo: () => console.log('initiateAlterEgo not set'),
    initiateBodySwap: () => console.log('initiateBodySwap not set'),
    initiateTiedUp: () => console.log('initiateTiedUp not set'),
    initiateArson: () => console.log('initiateArson not set'),
    initiateTradeOff: () => console.log('initiateTradeOff not set'),
    initiateUpheaval: () => console.log('initiateUpheaval not set'),
    initiateBounty: () => console.log('initiateBounty not set'),
    processBountyProgression: () => console.log('processBountyProgression not set'),
};

export function setNetworkFunctions(fns) {
    networkFunctions = { ...networkFunctions, ...fns };
}

export function setRenderFunctions(fns) {
    renderFunctions = { ...renderFunctions, ...fns };
}

export function setEffectFunctions(fns) {
    effectFunctions = { ...effectFunctions, ...fns };
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

    effectFunctions.processBountyProgression(nextPlayer);

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
        effectFunctions.initiateKill(state.myPlayerNumber, card);
    } else if (markTargetingCards.includes(cardName)) {
        consumeAction();
        networkFunctions.sendStateUpdate();

        switch (cardName) {
            case 'unmasked':
                effectFunctions.initiateUnmasked(state.myPlayerNumber, card);
                break;
            case 'alter ego':
                effectFunctions.initiateAlterEgo(state.myPlayerNumber, card);
                break;
            case 'body swap':
                effectFunctions.initiateBodySwap(state.myPlayerNumber, card);
                break;
        }
    } else if (playerTargetingCards.includes(cardName)) {
        consumeAction();
        networkFunctions.sendStateUpdate();

        switch (cardName) {
            case 'tied up':
                effectFunctions.initiateTiedUp(state.myPlayerNumber, card);
                break;
            case 'arson':
                effectFunctions.initiateArson(state.myPlayerNumber, card);
                break;
        }
    } else if (specialCards.includes(cardName)) {
        consumeAction();
        networkFunctions.sendStateUpdate();

        switch (cardName) {
            case 'trade off':
                effectFunctions.initiateTradeOff(state.myPlayerNumber, card);
                break;
            case 'upheaval':
                effectFunctions.initiateUpheaval(state.myPlayerNumber, card);
                break;
        }
    } else if (bountyCards.includes(cardName)) {
        effectFunctions.initiateBounty(state.myPlayerNumber, card);
        consumeAction();
        networkFunctions.sendStateUpdate();
    } else if (immediateEffects.includes(cardName)) {
        effectFunctions.executeCardEffect(card, state.myPlayerNumber, null);
        consumeAction();
        networkFunctions.sendStateUpdate();
    } else {
        consumeAction();
        networkFunctions.sendStateUpdate();
    }

    return true;
}
