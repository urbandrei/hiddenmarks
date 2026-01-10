// Card effects - marks, kills, special cards, bounty
import * as THREE from 'three';
import { CARD_DEFS } from './constants.js';
import * as state from './state.js';
import { getCardValue, removeCardFromZones, findCardZone } from './cardUtils.js';
import { enterTargetingMode } from './targeting.js';

// Function stubs (set via setters to avoid circular deps)
let networkFunctions = {
    sendStateUpdate: () => console.log('sendStateUpdate not set'),
    broadcastMarkKnowledge: () => console.log('broadcastMarkKnowledge not set'),
    broadcastBountyAnimationStart: () => console.log('broadcastBountyAnimationStart not set'),
    broadcastBountyAnimationStep: () => console.log('broadcastBountyAnimationStep not set'),
    broadcastBountyAnimationComplete: () => console.log('broadcastBountyAnimationComplete not set'),
};

let renderFunctions = {
    layoutCardsInZone: () => console.log('layoutCardsInZone not set'),
};

let reactionFunctions = {
    startReactionWindow: () => console.log('startReactionWindow not set'),
};

export function setNetworkFunctions(fns) {
    networkFunctions = { ...networkFunctions, ...fns };
}

export function setRenderFunctions(fns) {
    renderFunctions = { ...renderFunctions, ...fns };
}

export function setReactionFunctions(fns) {
    reactionFunctions = { ...reactionFunctions, ...fns };
}

// === EFFECT DISPATCHER ===

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

// === IMMEDIATE EFFECTS ===

export function executeGreed(playerId) {
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

export function executeInsomnia(playerId, card) {
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

export function initiateUnmasked(playerId, card) {
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
        reactionFunctions.startReactionWindow(card, playerId, targetPlayerNum, 'peek', false);
    });
}

function executeUnmasked(playerId, targetId) {
    addMarkKnowledge(playerId, targetId);
    networkFunctions.sendStateUpdate();
}

export function initiateAlterEgo(playerId, card) {
    const validTargets = [];
    for (let pNum = 1; pNum <= 4; pNum++) {
        if (!state.playerAlive[pNum]) continue;
        if (!state.currentPlayerList.find(p => p.num === pNum && p.connected)) continue;
        validTargets.push(pNum);
    }

    if (validTargets.length === 0) return;

    enterTargetingMode('mark', validTargets, (targetPlayerNum) => {
        reactionFunctions.startReactionWindow(card, playerId, targetPlayerNum, 'swap_extra', false);
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

export function initiateBodySwap(playerId, card) {
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
            reactionFunctions.startReactionWindow(card, playerId, firstTarget, 'swap_marks', false);
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

export function revealMarkToAll(targetPlayerId) {
    const targetMark = state.players[targetPlayerId].mark.cards[0];
    if (!targetMark) return;

    const cardIndex = state.cards.indexOf(targetMark);

    // Add knowledge for ALL connected, alive players
    for (let pNum = 1; pNum <= 4; pNum++) {
        if (!state.playerAlive[pNum]) continue;
        if (!state.currentPlayerList.find(p => p.num === pNum && p.connected)) continue;

        if (!state.knownMarks[pNum]) {
            state.knownMarks[pNum] = new Set();
        }
        state.knownMarks[pNum].add(cardIndex);
    }

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

export function initiateKill(playerId, card) {
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

export function showVictoryScreen(winnerNum) {
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

export function initiateTradeOff(playerId, card) {
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
            reactionFunctions.startReactionWindow(card, playerId, null, 'trade', false);
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

export function initiateTiedUp(playerId, card) {
    const validTargets = [];
    for (let pNum = 1; pNum <= 4; pNum++) {
        if (pNum === playerId) continue;
        if (!state.playerAlive[pNum]) continue;
        if (!state.currentPlayerList.find(p => p.num === pNum && p.connected)) continue;
        validTargets.push(pNum);
    }

    if (validTargets.length === 0) return;

    enterTargetingMode('player', validTargets, (targetPlayerNum) => {
        reactionFunctions.startReactionWindow(card, playerId, targetPlayerNum, 'skip', false);
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

export function initiateArson(playerId, card) {
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
        reactionFunctions.startReactionWindow(card, playerId, targetPlayerNum, 'arson', false);
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

export function initiateUpheaval(playerId, card) {
    reactionFunctions.startReactionWindow(card, playerId, null, 'upheaval', false);
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

export function initiateBounty(playerId, card) {
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
    // Legacy function - bounties now use drag-to-mark via executeBountyOnMark
    const validTargets = [];
    for (let pNum = 1; pNum <= 4; pNum++) {
        if (pNum === playerNum) continue;
        if (!state.playerAlive[pNum]) continue;
        if (!state.currentPlayerList.find(p => p.num === pNum && p.connected)) continue;
        validTargets.push(pNum);
    }

    enterTargetingMode('mark', validTargets, (targetPlayerNum) => {
        executeBountyOnMark(playerNum, targetPlayerNum, bountyCard);
    });
}

export function executeBountyOnMark(draggerNum, targetNum, bountyCard) {
    // 1. Consume 1 action
    state.turnState.actionsRemaining--;

    // 2. Get suits
    const bountySuit = bountyCard.userData.name.replace(' bounty', '');
    const targetMark = state.players[targetNum].mark.cards[0];
    const targetSuit = targetMark?.userData.name.replace(' mark', '');

    // 3. Store animation data
    const cardIndex = state.cards.indexOf(bountyCard);
    const anim = state.bountyAnimationState;

    anim.active = true;
    anim.step = 0;
    anim.draggerNum = draggerNum;
    anim.targetNum = targetNum;
    anim.bountyCard = bountyCard;
    anim.bountyCardIndex = cardIndex;
    anim.bountySuit = bountySuit;
    anim.targetSuit = targetSuit;
    anim.isMatch = (targetSuit === bountySuit);
    anim.startTime = Date.now();

    // 4. Start animation sequence
    startBountyAnimationSequence();

    // 5. Host broadcasts to clients
    if (state.isHost) {
        networkFunctions.broadcastBountyAnimationStart();
    }
}

// === BOUNTY ANIMATION SYSTEM ===

const BOUNTY_ANIM_Y = 5;          // Height for displayed cards
const BOUNTY_ANIM_Z = 0;          // Center Z position
const BOUNTY_STEP_DURATION = 1500; // 1.5 seconds per step

export function startBountyAnimationSequence() {
    const anim = state.bountyAnimationState;

    // Create dim overlay
    if (anim.dimPlane) {
        state.scene.remove(anim.dimPlane);
    }

    const dimGeometry = new THREE.PlaneGeometry(100, 100);
    const dimMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    anim.dimPlane = new THREE.Mesh(dimGeometry, dimMaterial);
    anim.dimPlane.rotation.x = -Math.PI / 2;
    anim.dimPlane.position.set(0, 3, 0);
    anim.dimPlane.renderOrder = 0;
    state.scene.add(anim.dimPlane);

    // Store original card positions
    const bountyCard = anim.bountyCard;
    anim.bountyOriginalState = {
        position: bountyCard.position.clone(),
        rotation: { y: bountyCard.rotation.y, z: bountyCard.rotation.z },
        scale: bountyCard.scale.clone()
    };

    const targetMark = state.players[anim.targetNum].mark.cards[0];
    if (targetMark) {
        anim.targetMarkOriginalState = {
            position: targetMark.position.clone(),
            rotation: { y: targetMark.rotation.y, z: targetMark.rotation.z },
            scale: targetMark.scale.clone()
        };
        targetMark.renderOrder = 1; // Render above dim plane
    }

    const draggerMark = state.players[anim.draggerNum].mark.cards[0];
    if (draggerMark) {
        anim.draggerMarkOriginalState = {
            position: draggerMark.position.clone(),
            rotation: { y: draggerMark.rotation.y, z: draggerMark.rotation.z },
            scale: draggerMark.scale.clone()
        };
    }

    // Create text sprite for outcome display
    createBountyTextSprite();

    // Start step 1
    executeBountyAnimationStep(1);
}

function createBountyTextSprite() {
    const anim = state.bountyAnimationState;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(12, 3, 1);
    sprite.position.set(0, 8, -8);
    sprite.visible = false;

    anim.textSprite = sprite;
    anim.textCanvas = canvas;
    anim.textCtx = ctx;
    state.scene.add(sprite);
}

function updateBountyTextSprite(text, color = '#ffffff') {
    return; // Skip text display, keep animation only
    const anim = state.bountyAnimationState;
    if (!anim.textCtx) return;

    const ctx = anim.textCtx;
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = color;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);

    if (anim.textSprite?.material?.map) {
        anim.textSprite.material.map.needsUpdate = true;
        anim.textSprite.visible = true;
    }
}

export function executeBountyAnimationStep(stepNum) {
    const anim = state.bountyAnimationState;
    anim.step = stepNum;
    anim.startTime = Date.now();

    switch (stepNum) {
        case 1:
            animateBountyStep1();
            break;
        case 2:
            animateBountyStep2();
            break;
        case 3:
            animateBountyStep3();
            break;
        case 4:
            animateBountyStep4();
            break;
        case 5:
            animateBountyStep5();
            break;
    }

    // Schedule next step or completion
    setTimeout(() => {
        if (stepNum < 5) {
            executeBountyAnimationStep(stepNum + 1);
            if (state.isHost) {
                networkFunctions.broadcastBountyAnimationStep(stepNum + 1);
            }
        } else {
            completeBountyAnimation();
        }
    }, BOUNTY_STEP_DURATION);
}

function animateBountyStep1() {
    // Step 1: Show bounty card at center, scaled up
    const anim = state.bountyAnimationState;
    const bountyCard = anim.bountyCard;

    updateBountyTextSprite(`${anim.bountySuit.toUpperCase()} BOUNTY`, '#ffcc00');

    state.setAnimatingCards(state.animatingCards.filter(a => a.card !== bountyCard));
    state.animatingCards.push({
        card: bountyCard,
        startPos: bountyCard.position.clone(),
        endPos: new THREE.Vector3(0, BOUNTY_ANIM_Y, BOUNTY_ANIM_Z),
        startRot: bountyCard.rotation.y,
        endRot: 0,
        startRotZ: bountyCard.rotation.z,
        endRotZ: 0,
        startScale: bountyCard.scale.x,
        endScale: 2.5,
        liftHeight: 2,
        baseY: BOUNTY_ANIM_Y,
        startTime: performance.now(),
        duration: 500
    });
}

function animateBountyStep2() {
    // Step 2: Reveal target's mark with flip animation (stays in place)
    const anim = state.bountyAnimationState;
    const targetMark = state.players[anim.targetNum].mark.cards[0];
    if (!targetMark) return;

    updateBountyTextSprite('REVEALING MARK...', '#ffffff');

    // Flip mark in place to reveal it (no position change)
    state.setAnimatingCards(state.animatingCards.filter(a => a.card !== targetMark));
    state.animatingCards.push({
        card: targetMark,
        startPos: targetMark.position.clone(),
        endPos: targetMark.position.clone(), // Stay in original position
        startRot: targetMark.rotation.y,
        endRot: 0,
        startRotZ: targetMark.rotation.z,
        endRotZ: 0,  // Face up
        startScale: targetMark.scale.x,
        endScale: targetMark.scale.x, // Keep original scale
        liftHeight: 1,
        baseY: targetMark.position.y,
        startTime: performance.now(),
        duration: 800
    });

    // Update mark knowledge for all players
    revealMarkToAll(anim.targetNum);
}

function animateBountyStep3() {
    // Step 3: Show match/mismatch outcome
    const anim = state.bountyAnimationState;

    if (anim.isMatch) {
        updateBountyTextSprite('MATCH! BOUNTY SUCCESS!', '#00ff00');
    } else {
        updateBountyTextSprite('NO MATCH! BOUNTY FAILED!', '#ff0000');
    }
}

function animateBountyStep4() {
    // Step 4: Show consequences with animations
    const anim = state.bountyAnimationState;

    if (anim.isMatch) {
        // Success: show death effect on target
        const targetName = state.currentPlayerList.find(p => p.num === anim.targetNum)?.name || `Player ${anim.targetNum}`;
        updateBountyTextSprite(`${targetName} eliminated!`, '#ff4444');
        animateDeathEffect(anim.targetNum);
    } else {
        // Failure: swap marks with animation
        updateBountyTextSprite('Marks swapping...', '#ff8800');
        animateMarkSwap(anim.draggerNum, anim.targetNum);
    }
}

function animateBountyStep5() {
    const anim = state.bountyAnimationState;

    // Determine who dies based on outcome
    const deadPlayer = anim.isMatch ? anim.targetNum : anim.draggerNum;

    // Temporarily mark as dead to check victory
    const wasAlive = state.playerAlive[deadPlayer];
    state.playerAlive[deadPlayer] = false;

    // Check if there's a winner
    const alivePlayers = Object.entries(state.playerAlive)
        .filter(([_, alive]) => alive)
        .map(([num, _]) => parseInt(num));

    const connectedAlivePlayers = alivePlayers.filter(pNum =>
        state.currentPlayerList.find(p => p.num === pNum && p.connected)
    );

    // Restore alive state - will be properly set in completeBountyAnimation
    state.playerAlive[deadPlayer] = wasAlive;

    if (connectedAlivePlayers.length === 1) {
        const winnerNum = connectedAlivePlayers[0];
        const winnerName = state.currentPlayerList.find(p => p.num === winnerNum)?.name || `Player ${winnerNum}`;
        updateBountyTextSprite(`${winnerName} WINS!`, '#ffff00');
    } else if (!anim.isMatch) {
        // Failed bounty - show dragger death message
        const draggerName = state.currentPlayerList.find(p => p.num === anim.draggerNum)?.name || `Player ${anim.draggerNum}`;
        updateBountyTextSprite(`${draggerName} eliminated!`, '#ff4444');
    } else {
        // Success case, already showed target eliminated in step 4
        updateBountyTextSprite('', '#ffffff');
    }
}

function animateDeathEffect(playerNum) {
    // Visual death effect - animate player's cards toward discard
    const player = state.players[playerNum];
    if (!player) return;

    const allCards = [...player.hand.cards, ...player.bank.cards];

    allCards.forEach((card, index) => {
        state.setAnimatingCards(state.animatingCards.filter(a => a.card !== card));
        state.animatingCards.push({
            card,
            startPos: card.position.clone(),
            endPos: new THREE.Vector3(
                state.piles.discard.x,
                index * 0.02,
                state.piles.discard.z
            ),
            startRot: card.rotation.y,
            endRot: 0,
            startRotZ: card.rotation.z,
            endRotZ: 0,
            startScale: card.scale.x,
            endScale: 1,
            liftHeight: 3,
            baseY: 0,
            startTime: performance.now() + index * 100,
            duration: 600
        });
    });
}

function animateMarkSwap(draggerNum, targetNum) {
    // Animate marks visually swapping positions
    const draggerMark = state.players[draggerNum].mark.cards[0];
    const targetMark = state.players[targetNum].mark.cards[0];

    if (!draggerMark || !targetMark) return;

    const draggerMarkZone = state.players[draggerNum].mark;
    const targetMarkZone = state.players[targetNum].mark;

    // Animate dragger's mark to target's position
    state.setAnimatingCards(state.animatingCards.filter(a => a.card !== draggerMark));
    state.animatingCards.push({
        card: draggerMark,
        startPos: draggerMark.position.clone(),
        endPos: new THREE.Vector3(targetMarkZone.x, 0, targetMarkZone.z),
        startRot: draggerMark.rotation.y,
        endRot: targetMarkZone.rotation,
        startRotZ: draggerMark.rotation.z,
        endRotZ: Math.PI,  // Flip face down
        startScale: draggerMark.scale.x,
        endScale: 1,
        liftHeight: 5,
        baseY: 0,
        startTime: performance.now(),
        duration: 1000
    });

    // Animate target's mark to dragger's position
    state.setAnimatingCards(state.animatingCards.filter(a => a.card !== targetMark));
    state.animatingCards.push({
        card: targetMark,
        startPos: targetMark.position.clone(),
        endPos: new THREE.Vector3(draggerMarkZone.x, 0, draggerMarkZone.z),
        startRot: targetMark.rotation.y,
        endRot: draggerMarkZone.rotation,
        startRotZ: targetMark.rotation.z,
        endRotZ: 0,  // Stay face up
        startScale: targetMark.scale.x,
        endScale: 1,
        liftHeight: 5,
        baseY: 0,
        startTime: performance.now(),
        duration: 1000
    });
}

export function completeBountyAnimation() {
    const anim = state.bountyAnimationState;

    // Clean up visual elements
    if (anim.dimPlane) {
        state.scene.remove(anim.dimPlane);
        anim.dimPlane = null;
    }
    if (anim.textSprite) {
        state.scene.remove(anim.textSprite);
        anim.textSprite = null;
    }

    // Execute actual game state changes
    executeBountyOutcome();

    // Broadcast completion
    if (state.isHost) {
        networkFunctions.broadcastBountyAnimationComplete();
    }

    // Reset animation state
    state.resetBountyAnimationState();
}

function executeBountyOutcome() {
    const anim = state.bountyAnimationState;

    // Move bounty card to discard
    removeCardFromZones(anim.bountyCard);
    state.piles.discard.cards.push(anim.bountyCard);

    // Clear bounty tracking
    delete state.bountyState[anim.bountyCardIndex];

    if (anim.isMatch) {
        executeBountySuccessState(anim.draggerNum, anim.targetNum);
    } else {
        executeBountyFailureState(anim.draggerNum, anim.targetNum);
    }

    // Update layouts
    renderFunctions.layoutCardsInZone(state.piles.bounty);
    renderFunctions.layoutCardsInZone(state.piles.discard);
    networkFunctions.sendStateUpdate();
}

function executeBountySuccessState(killerNum, victimNum) {
    // Successful bounty: kill + rewards (+2 actions, top 2 cards)
    const allVictimCards = [
        ...state.players[victimNum].hand.cards.slice(),
        ...state.players[victimNum].bank.cards.slice()
    ];
    allVictimCards.sort((a, b) => getCardValue(b) - getCardValue(a));

    // Top 2 to killer's bank
    const cardsToTake = allVictimCards.slice(0, 2);
    for (const card of cardsToTake) {
        removeCardFromZones(card);
        state.players[killerNum].bank.cards.push(card);
    }

    // Rest to discard
    for (const card of allVictimCards.slice(2)) {
        removeCardFromZones(card);
        state.piles.discard.cards.push(card);
    }

    state.playerAlive[victimNum] = false;
    state.turnState.actionsRemaining += 2;

    // Re-render affected zones
    renderFunctions.layoutCardsInZone(state.players[victimNum].hand);
    renderFunctions.layoutCardsInZone(state.players[victimNum].bank);
    renderFunctions.layoutCardsInZone(state.players[victimNum].mark);
    renderFunctions.layoutCardsInZone(state.players[killerNum].bank);

    checkVictory();
}

function executeBountyFailureState(draggerNum, targetNum) {
    // False bounty: dragger dies, marks swap, NO rewards for target

    // 1. SWAP MARKS (data swap - animation already done)
    const draggerMarkZone = state.players[draggerNum].mark;
    const targetMarkZone = state.players[targetNum].mark;

    const draggerMark = draggerMarkZone.cards[0];
    const targetMark = targetMarkZone.cards[0];

    if (draggerMark && targetMark) {
        draggerMarkZone.cards[0] = targetMark;
        targetMarkZone.cards[0] = draggerMark;
    }

    // 2. Discard dragger's cards
    const allDraggerCards = [
        ...state.players[draggerNum].hand.cards.slice(),
        ...state.players[draggerNum].bank.cards.slice()
    ];
    for (const card of allDraggerCards) {
        removeCardFromZones(card);
        state.piles.discard.cards.push(card);
    }

    // 3. Mark dragger as dead
    state.playerAlive[draggerNum] = false;

    // Re-render affected zones
    renderFunctions.layoutCardsInZone(draggerMarkZone);
    renderFunctions.layoutCardsInZone(targetMarkZone);
    renderFunctions.layoutCardsInZone(state.players[draggerNum].hand);
    renderFunctions.layoutCardsInZone(state.players[draggerNum].bank);
    renderFunctions.layoutCardsInZone(state.piles.discard);

    checkVictory();
}
