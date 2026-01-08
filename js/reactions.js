// Reaction system - reaction windows, chain reactions, UI
import * as THREE from 'three';
import { CARD_DEFS, CARD_WIDTH, CARD_HEIGHT } from './constants.js';
import * as state from './state.js';
import { getCardValue, selectPayment, removeCardFromZones } from './cardUtils.js';

// Function stubs (set via setters to avoid circular deps)
let networkFunctions = {
    sendStateUpdate: () => console.log('sendStateUpdate not set'),
    broadcastReactionStart: () => console.log('broadcastReactionStart not set'),
    sendReactionStartToHost: () => console.log('sendReactionStartToHost not set'),
    broadcastReactionResolve: () => console.log('broadcastReactionResolve not set'),
    broadcastCounterReactionStart: () => console.log('broadcastCounterReactionStart not set'),
};

let renderFunctions = {
    layoutCardsInZone: () => console.log('layoutCardsInZone not set'),
};

let effectFunctions = {
    addMarkKnowledge: () => console.log('addMarkKnowledge not set'),
    executeCardEffect: () => console.log('executeCardEffect not set'),
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

// Position constants for reaction display
const REACTION_CARD_Y = 5;
const REACTION_CARD_Z = 0;

// Timer position (top of screen)
const TIMER_Y = 8;
const TIMER_Z = -8;

// Center stack (cards being reacted to)
const CENTER_STACK_X = 0;
const CENTER_STACK_Z = 0;
const CENTER_STACK_OFFSET_X = 1.5;

// Bottom reaction cards (player's available reactions)
const BOTTOM_CARDS_Z = 10;
const BOTTOM_CARDS_Y = 5;
const BOTTOM_CARD_SPACING = CARD_WIDTH * 1.5;

// === REACTION CORE ===

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

    // Initialize reaction chain with the original card
    state.reactionState.reactionChain = [{
        playerId: playerId,
        cardName: card.userData.name,
        cardIndex: cardIndex,
        isOriginal: true,
        originalState: null  // Will be set in showReactionOverlay
    }];
    state.reactionState.centerStackCards = [];
    state.reactionState.lastReactorId = null;

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

// === REACTION OVERLAY UI ===

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
    state.reactionState.timerSprite.position.set(0, TIMER_Y, TIMER_Z);
    updateTimerSprite('5.0');

    const card = state.reactionState.card;
    if (card) {
        state.reactionState.originalCardState = {
            position: card.position.clone(),
            rotation: { y: card.rotation.y, z: card.rotation.z },
            scale: card.scale.clone()
        };

        // Position original card at center stack
        state.setAnimatingCards(state.animatingCards.filter(a => a.card !== card));
        state.animatingCards.push({
            card,
            startPos: card.position.clone(),
            endPos: new THREE.Vector3(CENTER_STACK_X, REACTION_CARD_Y, CENTER_STACK_Z),
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
    let reactiveCards = getPlayerReactiveCards(state.myPlayerNumber, state.reactionState.effectType);

    // Filter out cards already committed to the chain (cannot be reused)
    const committedCardIndices = state.reactionState.reactionChain
        .filter(entry => !entry.isOriginal)
        .map(entry => entry.cardIndex);
    reactiveCards = reactiveCards.filter(card => {
        const cardIndex = state.cards.indexOf(card);
        return !committedCardIndices.includes(cardIndex);
    });

    if (reactiveCards.length === 0) return;

    state.reactionState.displayedReactionCards = [];
    state.reactionState.reactionCardMeshes = [];
    state.reactionState.selectedCardName = null;

    // Center reactive cards at bottom of screen (50% visible)
    const totalWidth = (reactiveCards.length - 1) * BOTTOM_CARD_SPACING;
    const startX = -totalWidth / 2;

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

        const targetX = startX + index * BOTTOM_CARD_SPACING;
        const targetPos = new THREE.Vector3(targetX, BOTTOM_CARDS_Y, BOTTOM_CARDS_Z);

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
            baseY: BOTTOM_CARDS_Y,
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
    // Calculate centered position at bottom of screen
    const totalCards = state.reactionState.displayedReactionCards.length;
    const totalWidth = (totalCards - 1) * BOTTOM_CARD_SPACING;
    const startX = -totalWidth / 2;
    const targetX = startX + index * BOTTOM_CARD_SPACING;

    state.setAnimatingCards(state.animatingCards.filter(a => a.card !== card));
    state.animatingCards.push({
        card: card,
        startPos: card.position.clone(),
        endPos: new THREE.Vector3(targetX, BOTTOM_CARDS_Y + 0.5, BOTTOM_CARDS_Z - 1),
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
    // Calculate centered position at bottom of screen
    const totalCards = state.reactionState.displayedReactionCards.length;
    const totalWidth = (totalCards - 1) * BOTTOM_CARD_SPACING;
    const startX = -totalWidth / 2;
    const targetX = startX + index * BOTTOM_CARD_SPACING;

    state.setAnimatingCards(state.animatingCards.filter(a => a.card !== card));
    state.animatingCards.push({
        card: card,
        startPos: card.position.clone(),
        endPos: new THREE.Vector3(targetX, BOTTOM_CARDS_Y, BOTTOM_CARDS_Z),
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

// === TIMER ===

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

// === COUNTER/CHAIN REACTION ===

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

// Find players who can counter a reaction (excludes the reactor)
function findCounterReactors(reactionCardName, reactorId) {
    const counterReactors = [];
    const validCounterCards = getValidCounterCards(reactionCardName);

    for (let pNum = 1; pNum <= 4; pNum++) {
        if (pNum === reactorId) continue;
        if (!state.playerAlive[pNum]) continue;
        if (!state.currentPlayerList.find(p => p.num === pNum && p.connected)) continue;

        for (const cardName of validCounterCards) {
            if (canPlayerReact(pNum, cardName)) {
                counterReactors.push(pNum);
                break;
            }
        }
    }

    return counterReactors;
}

// Pay cost and discard a reaction card
function payReactionCost(reactorPlayerNum, cardName) {
    const player = state.players[reactorPlayerNum];
    const reactionCard = player.hand.cards.find(c => c.userData.name === cardName);

    if (!reactionCard) return;

    const cardDef = CARD_DEFS.find(d => d.name === cardName);
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
}

// Reset all reaction state to defaults
function resetReactionState() {
    state.reactionState.active = false;
    state.reactionState.reactionPhase = 1;
    state.reactionState.reactionChain = [];
    state.reactionState.centerStackCards = [];
    state.reactionState.lastReactorId = null;
    state.reactionState.pendingReaction = null;
    state.reactionState.selectedCardName = null;
    state.reactionState.responses = {};
    state.reactionState.reactionCardDisplayState = null;
    state.reactionState.displayedReactionCards = [];
    state.reactionState.reactionCardMeshes = [];

    networkFunctions.sendStateUpdate();
}

// Show the winning card animation for 2 seconds before cleanup
function showChainWinnerAnimation(winnerEntry, originalBlocked, callback) {
    const winnerCard = state.cards[winnerEntry.cardIndex];

    if (winnerCard) {
        // Scale up the winning card for emphasis
        state.setAnimatingCards(state.animatingCards.filter(a => a.card !== winnerCard));
        state.animatingCards.push({
            card: winnerCard,
            startPos: winnerCard.position.clone(),
            endPos: winnerCard.position.clone(),
            startRot: winnerCard.rotation.y,
            endRot: 0,
            startScale: winnerCard.scale.x,
            endScale: 2.5,
            startTime: performance.now(),
            duration: 300
        });
    }

    // After 2 seconds, execute callback
    setTimeout(() => {
        callback();
    }, 2000);
}

// Clean up the center stack and hide overlay
function cleanupCenterStack() {
    // Animate original card back (it will be in discard)
    if (state.reactionState.originalCardState) {
        const originalCard = state.reactionState.card;
        const orig = state.reactionState.originalCardState;
        if (originalCard) {
            state.setAnimatingCards(state.animatingCards.filter(a => a.card !== originalCard));
            state.animatingCards.push({
                card: originalCard,
                startPos: originalCard.position.clone(),
                endPos: orig.position.clone(),
                startRot: originalCard.rotation.y,
                endRot: orig.rotation.y,
                startRotZ: originalCard.rotation.z,
                endRotZ: orig.rotation.z,
                liftHeight: 2,
                baseY: orig.position.y,
                startScale: originalCard.scale.x,
                endScale: orig.scale.x,
                startTime: performance.now(),
                duration: 400
            });
        }
    }

    // Return any displayed reaction cards in chain to their positions
    for (let i = 1; i < state.reactionState.reactionChain.length; i++) {
        const entry = state.reactionState.reactionChain[i];
        if (entry.originalState) {
            const card = state.cards[entry.cardIndex];
            if (card) {
                state.setAnimatingCards(state.animatingCards.filter(a => a.card !== card));
                state.animatingCards.push({
                    card: card,
                    startPos: card.position.clone(),
                    endPos: entry.originalState.position.clone(),
                    startRot: card.rotation.y,
                    endRot: entry.originalState.rotation.y,
                    startRotZ: card.rotation.z,
                    endRotZ: entry.originalState.rotation.z,
                    liftHeight: 2,
                    baseY: entry.originalState.position.y,
                    startScale: card.scale.x,
                    endScale: entry.originalState.scale.x,
                    startTime: performance.now(),
                    duration: 400
                });
            }
        }
    }

    hideReactionOverlay();
}

// Final resolution of the reaction chain
function resolveChainFinal() {
    const chain = state.reactionState.reactionChain;
    const reactionCount = chain.length - 1; // Exclude original card

    // Outcome: odd reactions = blocked, even reactions = executes
    const originalBlocked = (reactionCount % 2 === 1);

    // Pay costs and discard all reaction cards (not the original)
    for (let i = 1; i < chain.length; i++) {
        const entry = chain[i];
        payReactionCost(entry.playerId, entry.cardName);
    }

    // Determine winning card for animation
    const winnerEntry = originalBlocked ? chain[chain.length - 1] : chain[0];

    // Show winner animation for 2 seconds, then clean up
    showChainWinnerAnimation(winnerEntry, originalBlocked, () => {
        cleanupCenterStack();

        if (originalBlocked) {
            console.log('Original effect blocked by reaction chain');
            // Handle revenge special case
            if (winnerEntry.cardName === 'revenge' && state.reactionState.effectType === 'peek') {
                effectFunctions.addMarkKnowledge(state.reactionState.playerId, state.reactionState.targetId);
                effectFunctions.addMarkKnowledge(state.reactionState.targetId, state.reactionState.playerId);
            }
        } else {
            // Execute original effect
            effectFunctions.executeCardEffect(
                state.reactionState.card,
                state.reactionState.playerId,
                state.reactionState.targetId
            );
        }

        networkFunctions.broadcastReactionResolve(originalBlocked ? winnerEntry.playerId : null);
        resetReactionState();
    });
}

// Continue the reaction chain with a new reaction
export function continueReactionChain(reactor) {
    const reactorId = parseInt(reactor[0]);
    const response = reactor[1];
    const reactionCardName = typeof response === 'object' ? response.cardName : null;

    if (!reactionCardName) {
        // No valid reaction - resolve chain
        resolveChainFinal();
        return;
    }

    // Find the reaction card
    const reactorPlayer = state.players[reactorId];
    const reactionCard = reactorPlayer.hand.cards.find(c => c.userData.name === reactionCardName);
    if (!reactionCard) {
        resolveChainFinal();
        return;
    }

    const reactionCardIndex = state.cards.indexOf(reactionCard);

    // Find the TRUE original state from displayedReactionCards (captured before display animation)
    const displayedState = state.reactionState.displayedReactionCards.find(
        d => d.card === reactionCard
    );

    // Add reaction to chain with TRUE original position (from hand, not display position)
    state.reactionState.reactionChain.push({
        playerId: reactorId,
        cardName: reactionCardName,
        cardIndex: reactionCardIndex,
        isOriginal: false,
        originalState: displayedState ? {
            position: displayedState.originalPosition.clone(),
            rotation: { ...displayedState.originalRotation },
            scale: displayedState.originalScale.clone()
        } : {
            position: reactionCard.position.clone(),
            rotation: { y: reactionCard.rotation.y, z: reactionCard.rotation.z },
            scale: reactionCard.scale.clone()
        }
    });
    state.reactionState.lastReactorId = reactorId;
    state.reactionState.centerStackCards.push(reactionCard);

    // Find who can counter THIS reaction
    const counterReactors = findCounterReactors(reactionCardName, reactorId);

    if (counterReactors.length === 0) {
        // No one can counter - chain ends
        resolveChainFinal();
        return;
    }

    // Start next phase
    state.reactionState.reactionPhase++;
    state.reactionState.pendingReaction = { playerId: reactorId, cardName: reactionCardName };
    state.reactionState.eligibleReactors = counterReactors;
    state.reactionState.responses = {};
    state.reactionState.startTime = Date.now();
    state.reactionState.selectedCardName = null;
    state.reactionState.active = true;

    // Broadcast and show UI
    networkFunctions.broadcastCounterReactionStart(reactorId, reactionCardName, counterReactors);
    showChainReactionOverlay(reactionCardName);
    updateReactionTimer();
}

// Renamed from showCounterReactionOverlay - now handles entire chain
export function showChainReactionOverlay(reactionCardName) {
    const overlay = document.getElementById('reaction-overlay');
    overlay.classList.remove('hidden');

    // Hide HTML elements
    const message = document.getElementById('reaction-message');
    message.style.display = 'none';
    const timerEl = document.getElementById('reaction-timer');
    timerEl.style.display = 'none';
    const prompt = document.getElementById('reaction-prompt');
    prompt.style.display = 'none';

    // Create dim plane for reaction phase
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
    state.reactionState.timerSprite.position.set(0, TIMER_Y, TIMER_Z);
    updateTimerSprite('5.0');

    // Position ALL cards in the chain with incremental X offset
    const chain = state.reactionState.reactionChain;
    chain.forEach((entry, index) => {
        const card = state.cards[entry.cardIndex];
        if (!card) return;

        const targetX = CENTER_STACK_X + index * CENTER_STACK_OFFSET_X;
        const targetY = REACTION_CARD_Y + index * 0.1;  // Slight Y offset for layering

        state.setAnimatingCards(state.animatingCards.filter(a => a.card !== card));
        state.animatingCards.push({
            card,
            startPos: card.position.clone(),
            endPos: new THREE.Vector3(targetX, targetY, CENTER_STACK_Z),
            startRot: card.rotation.y,
            endRot: 0,
            startRotZ: card.rotation.z,
            endRotZ: 0,
            startScale: card.scale.x,
            endScale: 2,
            liftHeight: 2,
            baseY: targetY,
            startTime: performance.now(),
            duration: 300
        });
    });

    const buttons = document.getElementById('reaction-buttons');
    const waiting = document.getElementById('reaction-waiting');
    buttons.style.display = 'none';
    waiting.style.display = 'none';

    if (state.reactionState.eligibleReactors.includes(state.myPlayerNumber)) {
        displayCounterReactiveCards();
    }
}

// Legacy alias for backwards compatibility
export function showCounterReactionOverlay(reactionCardName) {
    showChainReactionOverlay(reactionCardName);
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

    // Get cards already committed to the chain (cannot be reused)
    const committedCardIndices = state.reactionState.reactionChain
        .filter(entry => !entry.isOriginal)
        .map(entry => entry.cardIndex);

    const reactiveCards = [];
    for (const cardName of validCounterCards) {
        if (canPlayerReact(state.myPlayerNumber, cardName)) {
            const card = player.hand.cards.find(c => c.userData.name === cardName);
            if (card && !reactiveCards.includes(card)) {
                // Filter out cards already committed to the chain
                const cardIndex = state.cards.indexOf(card);
                if (!committedCardIndices.includes(cardIndex)) {
                    reactiveCards.push(card);
                }
            }
        }
    }

    if (reactiveCards.length === 0) return;

    // Center counter-reactive cards at bottom of screen (50% visible)
    const totalWidth = (reactiveCards.length - 1) * BOTTOM_CARD_SPACING;
    const startX = -totalWidth / 2;

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

        const targetX = startX + index * BOTTOM_CARD_SPACING;
        const targetPos = new THREE.Vector3(targetX, BOTTOM_CARDS_Y, BOTTOM_CARDS_Z);

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
            baseY: BOTTOM_CARDS_Y,
            startScale: card.scale.x,
            endScale: 1.5,
            startTime: performance.now(),
            duration: 400
        });
    });
}

// === RESOLUTION ===

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
        // Keep overlay visible - host will send resolution with cleanup
        return;
    }

    // HOST LOGIC: Unified handling for all phases
    state.reactionState.active = false;
    returnReactionCardsToHand();

    // Find if anyone reacted
    const reactor = Object.entries(state.reactionState.responses).find(([_, r]) => {
        if (typeof r === 'string') return r === 'react';
        return r?.type === 'react';
    });

    if (reactor) {
        // Someone reacted - continue the chain
        continueReactionChain(reactor);
    } else {
        // No one reacted - chain ends, resolve
        resolveChainFinal();
    }
}

// === LEGACY FUNCTIONS ===

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
        effectFunctions.addMarkKnowledge(state.reactionState.playerId, state.reactionState.targetId);
        effectFunctions.addMarkKnowledge(state.reactionState.targetId, state.reactionState.playerId);
    }

    networkFunctions.sendStateUpdate();
}
