// Main entry point - orchestrates module initialization
import * as state from './state.js';
import * as render from './render.js';
import * as game from './game.js';
import * as network from './network.js';

// === UI FUNCTIONS ===

function updatePlayerLabels() {
    document.querySelectorAll('.player-label').forEach(el => el.remove());
    if (!state.currentPlayerList.length) return;

    const positionClasses = ['bottom', 'right', 'top', 'left'];
    for (const player of state.currentPlayerList) {
        if (!player.connected) continue;
        const posClass = positionClasses[player.num - 1];
        const isYou = player.num === state.myPlayerNumber;
        const label = document.createElement('div');
        label.className = `player-label ${posClass}${isYou ? ' you' : ''}`;
        label.textContent = player.name || `Player ${player.num}`;
        document.body.appendChild(label);
    }

    if (state.turnState.gameStarted) {
        updateTurnUI();
    }
}

function updateTurnUI() {
    let counter = document.getElementById('action-counter');
    if (!counter && state.turnState.gameStarted) {
        counter = document.createElement('div');
        counter.id = 'action-counter';
        document.body.appendChild(counter);
    }

    if (counter) {
        counter.textContent = 'X'.repeat(state.turnState.actionsRemaining);

        if (state.turnState.currentPlayerNum === state.myPlayerNumber) {
            counter.classList.remove('not-your-turn');
        } else {
            counter.classList.add('not-your-turn');
        }
    }

    document.querySelectorAll('.player-label').forEach(label => {
        label.classList.remove('current-turn');
    });

    const positionClasses = ['bottom', 'right', 'top', 'left'];
    const currentPosClass = positionClasses[state.turnState.currentPlayerNum - 1];
    const currentLabel = document.querySelector(`.player-label.${currentPosClass}`);
    if (currentLabel) {
        currentLabel.classList.add('current-turn');
    }
}

// === INITIALIZATION ===

async function init() {
    // Wire up cross-module dependencies

    // Game needs network and render functions
    game.setNetworkFunctions({
        sendStateUpdate: network.sendStateUpdate,
        broadcastReactionStart: network.broadcastReactionStart,
        sendReactionStartToHost: network.sendReactionStartToHost,
        broadcastReactionResolve: network.broadcastReactionResolve,
        broadcastMarkKnowledge: network.broadcastMarkKnowledge,
        broadcastCounterReactionStart: network.broadcastCounterReactionStart,
        broadcastBountyAnimationStart: network.broadcastBountyAnimationStart,
        broadcastBountyAnimationStep: network.broadcastBountyAnimationStep,
        broadcastBountyAnimationComplete: network.broadcastBountyAnimationComplete,
    });

    game.setRenderFunctions({
        layoutCardsInZone: render.layoutCardsInZone,
    });

    // Render needs game functions
    render.setGameFunctions({
        shouldShowFaceUp: game.shouldShowFaceUp,
        handleTargetClick: game.handleTargetClick,
        handleReactionCardClick: game.handleReactionCardClick,
        executeDraw: game.executeDraw,
        executeBank: game.executeBank,
        executePlay: game.executePlay,
        initiateBountyUse: game.initiateBountyUse,
        executeBountyOnMark: game.executeBountyOnMark,
        canPerformAction: game.canPerformAction,
        isOwnZone: game.isOwnZone,
        sendStateUpdate: network.sendStateUpdate,
        findCardZone: game.findCardZone,
        removeCardFromZones: game.removeCardFromZones,
    });

    // Network needs render and UI functions
    network.setRenderFunctions({
        layoutCardsInZone: render.layoutCardsInZone,
    });

    network.setUIFunctions({
        updateTurnUI: updateTurnUI,
        updatePlayerLabels: updatePlayerLabels,
    });

    // Initialize renderer
    await render.initRenderer();
}

// Start
init().then(() => network.showLobby());
