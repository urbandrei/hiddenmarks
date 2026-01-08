// Game logic - main controller that wires up all modules
import * as state from './state.js';

// Import all modules
import * as cardUtils from './cardUtils.js';
import * as targeting from './targeting.js';
import * as reactions from './reactions.js';
import * as cardEffects from './cardEffects.js';
import * as turnActions from './turnActions.js';

// Network and render function stubs (set via setters)
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
    // Propagate to all modules
    reactions.setNetworkFunctions(networkFunctions);
    cardEffects.setNetworkFunctions(networkFunctions);
    turnActions.setNetworkFunctions(networkFunctions);
}

export function setRenderFunctions(fns) {
    renderFunctions = { ...renderFunctions, ...fns };
    // Propagate to all modules
    reactions.setRenderFunctions(renderFunctions);
    cardEffects.setRenderFunctions(renderFunctions);
    turnActions.setRenderFunctions(renderFunctions);
}

// Wire up cross-module dependencies
// reactions.js needs executeCardEffect and addMarkKnowledge from cardEffects
reactions.setEffectFunctions({
    addMarkKnowledge: cardEffects.addMarkKnowledge,
    executeCardEffect: cardEffects.executeCardEffect,
});

// cardEffects.js needs startReactionWindow from reactions
cardEffects.setReactionFunctions({
    startReactionWindow: reactions.startReactionWindow,
});

// turnActions.js needs various effect initiators from cardEffects
turnActions.setEffectFunctions({
    executeCardEffect: cardEffects.executeCardEffect,
    initiateKill: cardEffects.initiateKill,
    initiateUnmasked: cardEffects.initiateUnmasked,
    initiateAlterEgo: cardEffects.initiateAlterEgo,
    initiateBodySwap: cardEffects.initiateBodySwap,
    initiateTiedUp: cardEffects.initiateTiedUp,
    initiateArson: cardEffects.initiateArson,
    initiateTradeOff: cardEffects.initiateTradeOff,
    initiateUpheaval: cardEffects.initiateUpheaval,
    initiateBounty: cardEffects.initiateBounty,
    processBountyProgression: cardEffects.processBountyProgression,
});

// === RE-EXPORTS FOR BACKWARDS COMPATIBILITY ===

// From cardUtils
export const {
    findCardZone,
    removeCardFromZones,
    getCardCost,
    getCardValue,
    selectPayment,
    isLethalCard,
    isOwnZone,
    shouldShowFaceUp
} = cardUtils;

// From targeting
export const {
    enterTargetingMode,
    exitTargetingMode,
    handleTargetClick
} = targeting;

// From reactions
export const {
    startReactionWindow,
    canPlayerReact,
    getPlayerReactiveCards,
    showReactionOverlay,
    hideReactionOverlay,
    displayReactiveCards,
    returnReactionCardsToHand,
    handleReactionCardClick,
    updateReactionTimer,
    sendReactionResponse,
    checkAllReactionsReceived,
    showChainReactionOverlay,
    showCounterReactionOverlay,
    resolveReaction,
    handleReactionBlock,
    continueReactionChain
} = reactions;

// From cardEffects
export const {
    executeCardEffect,
    executeGreed,
    executeInsomnia,
    addMarkKnowledge,
    getValidKillTargets,
    initiateKill,
    executeKill,
    checkVictory,
    showVictoryScreen,
    processBountyProgression,
    initiateBountyUse,
    initiateUnmasked,
    initiateAlterEgo,
    initiateBodySwap,
    initiateTradeOff,
    initiateTiedUp,
    initiateArson,
    initiateUpheaval,
    initiateBounty
} = cardEffects;

// From turnActions
export const {
    isMyTurn,
    canPerformAction,
    getNextConnectedPlayer,
    consumeAction,
    processEndOfTurn,
    advanceTurn,
    processStartOfTurn,
    executeDraw,
    executeBank,
    executePlay
} = turnActions;

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
