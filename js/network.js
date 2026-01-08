// Network functions - PeerJS, lobby, state sync, message handling
import { MSG } from './constants.js';
import * as state from './state.js';
import * as game from './game.js';

// Render function stub (set via setter to avoid circular deps)
let renderFunctions = {
    layoutCardsInZone: () => console.log('layoutCardsInZone not set'),
};

let uiFunctions = {
    updateTurnUI: () => console.log('updateTurnUI not set'),
    updatePlayerLabels: () => console.log('updatePlayerLabels not set'),
};

export function setRenderFunctions(fns) {
    renderFunctions = { ...renderFunctions, ...fns };
}

export function setUIFunctions(fns) {
    uiFunctions = { ...uiFunctions, ...fns };
}

// === STATE SERIALIZATION ===

export function serializeGameState() {
    const serializedMarks = {};
    for (const [viewerId, targets] of Object.entries(state.knownMarks)) {
        serializedMarks[viewerId] = Array.from(targets);
    }

    const gameState = {
        version: 2,
        timestamp: Date.now(),
        zones: {},
        turn: {
            currentPlayerNum: state.turnState.currentPlayerNum,
            actionsRemaining: state.turnState.actionsRemaining,
            gameStarted: state.turnState.gameStarted
        },
        playerAlive: { ...state.playerAlive },
        knownMarks: serializedMarks,
        bountyState: { ...state.bountyState },
        currentTurnNumber: state.currentTurnNumber
    };

    for (const zone of state.zones) {
        gameState.zones[zone.id] = zone.cards.map(card => ({
            cardIndex: state.cards.indexOf(card),
            faceUp: card.userData.faceUp
        }));
    }

    return gameState;
}

export function applyGameState(gameState) {
    for (const zone of state.zones) {
        zone.cards = [];
    }

    for (const [zoneId, cardData] of Object.entries(gameState.zones)) {
        const zone = state.zones.find(z => z.id === zoneId);
        if (!zone) continue;

        for (const { cardIndex, faceUp } of cardData) {
            const card = state.cards[cardIndex];
            if (!card) continue;

            zone.cards.push(card);
            card.userData.faceUp = faceUp;
        }

        renderFunctions.layoutCardsInZone(zone, true);
    }

    if (gameState.turn) {
        state.turnState.currentPlayerNum = gameState.turn.currentPlayerNum;
        state.turnState.actionsRemaining = gameState.turn.actionsRemaining;
        state.turnState.gameStarted = gameState.turn.gameStarted;
        uiFunctions.updateTurnUI();
    }

    if (gameState.playerAlive) {
        for (const [pNum, alive] of Object.entries(gameState.playerAlive)) {
            state.playerAlive[parseInt(pNum)] = alive;
        }
    }

    if (gameState.knownMarks) {
        state.setKnownMarks({});
        for (const [viewerId, targets] of Object.entries(gameState.knownMarks)) {
            state.knownMarks[viewerId] = new Set(targets);
        }
    }

    if (gameState.bountyState) {
        state.setBountyState({ ...gameState.bountyState });
    }

    if (gameState.currentTurnNumber !== undefined) {
        state.setCurrentTurnNumber(gameState.currentTurnNumber);
    }
}

// === NETWORK FUNCTIONS ===

export function sendStateUpdate() {
    if (!state.peer) return;

    const gameState = serializeGameState();

    if (state.isHost) {
        state.setIgnoreNextStateUpdate(true);
        setTimeout(() => { state.setIgnoreNextStateUpdate(false); }, 100);
        broadcastState(gameState);
    } else if (state.hostConnection && state.hostConnection.open) {
        state.setIgnoreNextStateUpdate(true);
        setTimeout(() => { state.setIgnoreNextStateUpdate(false); }, 200);
        state.hostConnection.send({
            type: MSG.STATE_UPDATE,
            gameState: gameState
        });
    }
}

export function broadcastState(gameState) {
    const message = {
        type: MSG.STATE_BROADCAST,
        gameState: gameState
    };

    for (const conn of state.connections.values()) {
        if (conn.open) {
            conn.send(message);
        }
    }
}

export function getPlayerList() {
    const list = [];
    for (let i = 1; i <= 4; i++) {
        let connected = false;
        let playerId = null;
        let name = null;

        if (i === 1 && state.isHost) {
            connected = true;
            playerId = state.myPlayerId;
            name = state.myPlayerName;
        } else {
            for (const [pid, slot] of state.playerSlots.entries()) {
                if (slot === i) {
                    playerId = pid;
                    name = state.playerNames.get(pid) || null;
                    for (const [peerId, connPlayerId] of state.peerToPlayer.entries()) {
                        if (connPlayerId === pid && state.connections.get(peerId)?.open) {
                            connected = true;
                            break;
                        }
                    }
                    break;
                }
            }
        }

        list.push({ num: i, connected, name });
    }
    return list;
}

export function broadcastPlayerList() {
    const list = getPlayerList();
    const message = { type: MSG.PLAYER_LIST, players: list };

    for (const conn of state.connections.values()) {
        if (conn.open) {
            conn.send(message);
        }
    }

    updateLobbyPlayerList(list);
    uiFunctions.updatePlayerLabels();
}

export function broadcastReactionStart() {
    const message = {
        type: MSG.REACTION_START,
        cardIndex: state.reactionState.cardIndex,
        playerId: state.reactionState.playerId,
        targetId: state.reactionState.targetId,
        effectType: state.reactionState.effectType,
        isLethal: state.reactionState.isLethal,
        eligibleReactors: state.reactionState.eligibleReactors
    };

    for (const conn of state.connections.values()) {
        if (conn.open) conn.send(message);
    }
}

export function sendReactionStartToHost() {
    if (state.hostConnection?.open) {
        state.hostConnection.send({
            type: MSG.REACTION_START,
            cardIndex: state.reactionState.cardIndex,
            playerId: state.reactionState.playerId,
            targetId: state.reactionState.targetId,
            effectType: state.reactionState.effectType,
            isLethal: state.reactionState.isLethal,
            eligibleReactors: state.reactionState.eligibleReactors
        });
    }
}

export function broadcastReactionResolve(reactorId) {
    const message = {
        type: MSG.REACTION_RESOLVE,
        reactorId: reactorId,
        cardIndex: state.reactionState.cardIndex
    };

    for (const conn of state.connections.values()) {
        if (conn.open) conn.send(message);
    }
}

export function broadcastMarkKnowledge() {
    const serialized = {};
    for (const [viewerId, targets] of Object.entries(state.knownMarks)) {
        serialized[viewerId] = Array.from(targets);
    }

    const message = {
        type: MSG.MARK_KNOWLEDGE_UPDATE,
        knownMarks: serialized
    };

    for (const conn of state.connections.values()) {
        if (conn.open) conn.send(message);
    }
}

export function broadcastCounterReactionStart(reactorId, reactionCardName, counterReactors) {
    const message = {
        type: MSG.COUNTER_REACTION_START,
        reactorId: reactorId,
        reactionCardName: reactionCardName,
        counterReactors: counterReactors,
        cardIndex: state.reactionState.cardIndex,
        playerId: state.reactionState.playerId,
        targetId: state.reactionState.targetId
    };

    for (const conn of state.connections.values()) {
        if (conn.open) conn.send(message);
    }
}

// === CONNECTION HANDLING ===

export function handleIncomingConnection(conn) {
    conn.on('open', () => {
        conn.on('data', (data) => handlePeerMessage(conn, data));
        conn.on('close', () => handlePeerDisconnect(conn));
    });
}

export function handlePeerMessage(conn, data) {
    switch (data.type) {
        case MSG.JOIN_REQUEST: {
            const { playerId, playerName } = data;
            console.log(`[Host] Join request from "${playerName}" (${playerId})`);

            if (playerName) {
                state.playerNames.set(playerId, playerName);
            }

            if (state.playerSlots.has(playerId)) {
                const playerNum = state.playerSlots.get(playerId);
                console.log(`[Host] Reconnecting player to slot ${playerNum}`);
                acceptPlayer(conn, playerId, playerNum);
            } else if (state.playerSlots.size < 4) {
                const playerNum = getNextPlayerSlot();
                state.playerSlots.set(playerId, playerNum);
                console.log(`[Host] New player assigned to slot ${playerNum}`);
                acceptPlayer(conn, playerId, playerNum);
            } else {
                console.log(`[Host] Rejected - game is full`);
                conn.send({ type: MSG.JOIN_REJECTED, reason: 'Game is full' });
            }
            break;
        }

        case MSG.STATE_UPDATE: {
            if (!state.ignoreNextStateUpdate) {
                applyGameState(data.gameState);
            }
            broadcastState(data.gameState);
            break;
        }

        case MSG.REACTION_RESPONSE: {
            if (data.cardName) {
                state.reactionState.responses[data.playerId] = {
                    type: data.response,
                    cardName: data.cardName
                };
            } else {
                state.reactionState.responses[data.playerId] = data.response;
            }
            game.checkAllReactionsReceived();
            break;
        }

        case MSG.REACTION_START: {
            state.reactionState.active = true;
            state.reactionState.card = state.cards[data.cardIndex];
            state.reactionState.cardIndex = data.cardIndex;
            state.reactionState.playerId = data.playerId;
            state.reactionState.targetId = data.targetId;
            state.reactionState.timeRemaining = 5000;
            state.reactionState.eligibleReactors = data.eligibleReactors || [];
            state.reactionState.responses = {};
            state.reactionState.startTime = Date.now();
            state.reactionState.effectType = data.effectType;
            state.reactionState.isLethal = data.isLethal;
            game.showReactionOverlay();
            game.updateReactionTimer();
            broadcastReactionStart();
            break;
        }
    }
}

function getNextPlayerSlot() {
    const usedSlots = new Set(state.playerSlots.values());
    usedSlots.add(1);
    for (let i = 2; i <= 4; i++) {
        if (!usedSlots.has(i)) return i;
    }
    return null;
}

function acceptPlayer(conn, playerId, playerNum) {
    state.connections.set(conn.peer, conn);
    state.peerToPlayer.set(conn.peer, playerId);

    console.log(`[Host] Accepting player ${playerNum}, sending game state`);
    conn.send({
        type: MSG.JOIN_ACCEPTED,
        playerNumber: playerNum,
        gameState: serializeGameState(),
        playerList: getPlayerList()
    });

    console.log(`[Host] Broadcasting updated player list`);
    broadcastPlayerList();
}

function handlePeerDisconnect(conn) {
    const playerId = state.peerToPlayer.get(conn.peer);
    const playerNum = state.playerSlots.get(playerId);
    const playerName = state.playerNames.get(playerId);
    console.log(`[Host] Player disconnected: "${playerName}" (slot ${playerNum}, id: ${playerId})`);

    state.connections.delete(conn.peer);
    state.peerToPlayer.delete(conn.peer);

    if (state.turnState.gameStarted && state.turnState.currentPlayerNum === playerNum) {
        state.setCurrentPlayerList(getPlayerList());
        game.advanceTurn();
        broadcastState(serializeGameState());
    }

    console.log(`[Host] Broadcasting updated player list`);
    broadcastPlayerList();
}

export function handleHostMessage(data) {
    switch (data.type) {
        case MSG.JOIN_ACCEPTED:
            state.setMyPlayerNumber(data.playerNumber);
            updateLobbyPlayerList(data.playerList);
            applyGameState(data.gameState);
            hideLobby();
            showPlayerIndicator();
            uiFunctions.updatePlayerLabels();
            break;

        case MSG.JOIN_REJECTED:
            showLobbyError(data.reason);
            break;

        case MSG.STATE_BROADCAST:
            if (!state.ignoreNextStateUpdate) {
                applyGameState(data.gameState);
            }
            break;

        case MSG.PLAYER_LIST:
            updateLobbyPlayerList(data.players);
            uiFunctions.updatePlayerLabels();
            break;

        case MSG.REACTION_START: {
            state.reactionState.active = true;
            state.reactionState.card = state.cards[data.cardIndex];
            state.reactionState.cardIndex = data.cardIndex;
            state.reactionState.playerId = data.playerId;
            state.reactionState.targetId = data.targetId;
            state.reactionState.timeRemaining = 5000;
            state.reactionState.eligibleReactors = data.eligibleReactors;
            state.reactionState.responses = {};
            state.reactionState.startTime = Date.now();
            state.reactionState.effectType = data.effectType;
            state.reactionState.isLethal = data.isLethal;
            game.showReactionOverlay();
            game.updateReactionTimer();
            break;
        }

        case MSG.REACTION_RESOLVE: {
            state.reactionState.active = false;

            game.returnReactionCardsToHand();

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

            game.hideReactionOverlay();
            break;
        }

        case MSG.COUNTER_REACTION_START: {
            // Start counter-reaction phase on client
            state.reactionState.reactionPhase = 2;
            state.reactionState.pendingReaction = {
                playerId: data.reactorId,
                cardName: data.reactionCardName
            };
            state.reactionState.eligibleReactors = data.counterReactors;
            state.reactionState.responses = {};
            state.reactionState.startTime = Date.now();
            state.reactionState.selectedCardName = null;
            state.reactionState.active = true;

            game.showCounterReactionOverlay(data.reactionCardName);
            game.updateReactionTimer();
            break;
        }

        case MSG.MARK_KNOWLEDGE_UPDATE: {
            state.setKnownMarks({});
            for (const [viewerId, targets] of Object.entries(data.knownMarks)) {
                state.knownMarks[viewerId] = new Set(targets);
            }
            for (const zone of state.zones) {
                if (zone.type === 'mark') {
                    renderFunctions.layoutCardsInZone(zone);
                }
            }
            break;
        }
    }
}

// === LOBBY UI ===

export function showLobby() {
    const lobby = document.createElement('div');
    lobby.id = 'lobby';
    lobby.innerHTML = `
        <h1>Hidden Marks</h1>
        <div id="lobby-content">
            <input type="text" id="name-input" maxlength="20" placeholder="Enter your name" style="margin-bottom: 1rem;" />
            <div class="buttons">
                <button id="host-btn" disabled>Host Game</button>
                <button id="join-btn" disabled>Join Game</button>
            </div>
        </div>
    `;
    document.body.appendChild(lobby);

    const nameInput = document.getElementById('name-input');
    const hostBtn = document.getElementById('host-btn');
    const joinBtn = document.getElementById('join-btn');

    nameInput.addEventListener('input', () => {
        const hasName = nameInput.value.trim().length > 0;
        hostBtn.disabled = !hasName;
        joinBtn.disabled = !hasName;
    });

    hostBtn.addEventListener('click', () => {
        state.setMyPlayerName(nameInput.value.trim());
        hostGame();
    });
    joinBtn.addEventListener('click', () => {
        state.setMyPlayerName(nameInput.value.trim());
        showJoinScreen();
    });

    nameInput.focus();
}

function showJoinScreen() {
    const content = document.getElementById('lobby-content');
    content.innerHTML = `
        <p>Enter room code:</p>
        <input type="text" id="room-input" maxlength="6" placeholder="000000" />
        <div class="buttons" style="margin-top: 1rem;">
            <button id="connect-btn">Connect</button>
        </div>
        <button class="back-btn" id="back-btn">Back</button>
        <div id="lobby-error" class="error"></div>
    `;

    const input = document.getElementById('room-input');
    input.focus();
    input.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') joinGame(input.value);
    });

    document.getElementById('connect-btn').addEventListener('click', () => joinGame(input.value));
    document.getElementById('back-btn').addEventListener('click', () => {
        document.getElementById('lobby').remove();
        showLobby();
    });
}

function showHostScreen() {
    const content = document.getElementById('lobby-content');
    content.innerHTML = `
        <p>Room Code:</p>
        <div class="room-code">${state.roomCode}</div>
        <p>Share this code with other players</p>
        <div class="player-list" id="player-list"></div>
        <button id="start-btn" style="margin-top: 1.5rem;">Start Game</button>
    `;

    updateLobbyPlayerList(getPlayerList());

    document.getElementById('start-btn').addEventListener('click', () => {
        state.setCurrentPlayerList(getPlayerList());

        game.setupGame();

        state.turnState.gameStarted = true;
        state.turnState.currentPlayerNum = 1;
        state.turnState.actionsRemaining = 3;

        hideLobby();
        showPlayerIndicator();
        uiFunctions.updatePlayerLabels();
        uiFunctions.updateTurnUI();

        sendStateUpdate();
    });
}

export function updateLobbyPlayerList(players) {
    state.setCurrentPlayerList(players);

    const listEl = document.getElementById('player-list');
    if (!listEl) return;

    listEl.innerHTML = players.map(p => {
        const displayName = p.name || `Player ${p.num}`;
        const status = p.connected ? '✓' : '...';
        return `<div class="${p.connected ? 'connected' : ''}">
            ${displayName} ${status}
        </div>`;
    }).join('');
}

function showLobbyError(message) {
    const errorEl = document.getElementById('lobby-error');
    if (errorEl) errorEl.textContent = message;
}

export function hideLobby() {
    const lobby = document.getElementById('lobby');
    if (lobby) lobby.remove();
}

function showPlayerIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'player-indicator';
    indicator.textContent = `You: ${state.myPlayerName}`;
    document.body.appendChild(indicator);
}

// === HOST/JOIN FLOWS ===

function generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function getOrCreatePlayerId() {
    if (!state.myPlayerId) {
        state.setMyPlayerId(crypto.randomUUID());
    }
    return state.myPlayerId;
}

async function hostGame() {
    getOrCreatePlayerId();
    state.setRoomCode(generateRoomCode());

    const content = document.getElementById('lobby-content');
    content.innerHTML = `<p>Creating room...</p>`;

    state.setPeer(new Peer(state.roomCode));

    state.peer.on('open', () => {
        state.setIsHost(true);
        state.setMyPlayerNumber(1);
        state.playerSlots.set(state.myPlayerId, 1);
        state.playerNames.set(state.myPlayerId, state.myPlayerName);
        showHostScreen();
    });

    state.peer.on('connection', handleIncomingConnection);

    state.peer.on('error', (err) => {
        console.error('Peer error:', err);
        content.innerHTML = `
            <p class="error">Failed to create room: ${err.type}</p>
            <button class="back-btn" id="back-btn">Back</button>
        `;
        document.getElementById('back-btn').addEventListener('click', () => {
            document.getElementById('lobby').remove();
            showLobby();
        });
    });
}

async function joinGame(code) {
    if (!code || code.length !== 6) {
        showLobbyError('Please enter a 6-digit code');
        return;
    }

    getOrCreatePlayerId();
    state.setRoomCode(code);

    const content = document.getElementById('lobby-content');
    content.innerHTML = `<p>Connecting to ${code}...</p>`;

    state.setPeer(new Peer());

    state.peer.on('open', () => {
        state.setHostConnection(state.peer.connect(code, { reliable: true }));

        state.hostConnection.on('open', () => {
            state.hostConnection.send({
                type: MSG.JOIN_REQUEST,
                playerId: state.myPlayerId,
                playerName: state.myPlayerName
            });
        });

        state.hostConnection.on('data', handleHostMessage);

        state.hostConnection.on('close', () => {
            setTimeout(() => {
                if (state.roomCode && !document.getElementById('lobby')) {
                    showLobby();
                    showLobbyError('Disconnected from host');
                }
            }, 1000);
        });

        state.hostConnection.on('error', (err) => {
            showLobbyError(`Connection error: ${err.type}`);
        });
    });

    state.peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (err.type === 'peer-unavailable') {
            showLobbyError('Room not found');
        } else {
            showLobbyError(`Error: ${err.type}`);
        }
        showJoinScreen();
    });
}
