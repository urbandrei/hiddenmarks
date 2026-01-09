import * as THREE from 'three';
import { CARD_WIDTH, CARD_HEIGHT, GAP, ZONE_LENGTH, MARK_WIDTH, EFFECT_WIDTH, BANK_WIDTH } from './constants.js';

// Zone definitions
export const zones = [
    // Player hands (edge zones - half off screen, stretched along edge)
    { id: 'p3-hand', type: 'hand', player: 3, x: 0, z: -10, rotation: 0, width: ZONE_LENGTH, height: CARD_HEIGHT, spreadAxis: 'x', cards: [] },
    { id: 'p1-hand', type: 'hand', player: 1, x: 0, z: 10, rotation: 0, width: ZONE_LENGTH, height: CARD_HEIGHT, spreadAxis: 'x', cards: [] },
    { id: 'p4-hand', type: 'hand', player: 4, x: -15, z: 0, rotation: Math.PI/2, width: ZONE_LENGTH, height: CARD_HEIGHT, spreadAxis: 'z', cards: [] },
    { id: 'p2-hand', type: 'hand', player: 2, x: 15, z: 0, rotation: Math.PI/2, width: ZONE_LENGTH, height: CARD_HEIGHT, spreadAxis: 'z', cards: [] },
    // Player banks (inner zones - overlapped by hands, stretched along edge)
    { id: 'p3-bank', type: 'bank', player: 3, x: 0, z: -10 + CARD_HEIGHT/2 + GAP + CARD_HEIGHT/2, rotation: 0, width: BANK_WIDTH, height: CARD_HEIGHT, spreadAxis: 'x', cards: [] },
    { id: 'p1-bank', type: 'bank', player: 1, x: 0, z: 10 - CARD_HEIGHT/2 - GAP - CARD_HEIGHT/2, rotation: 0, width: BANK_WIDTH, height: CARD_HEIGHT, spreadAxis: 'x', cards: [] },
    { id: 'p4-bank', type: 'bank', player: 4, x: -15 + CARD_HEIGHT/2 + GAP + CARD_HEIGHT/2, z: 0, rotation: Math.PI/2, width: BANK_WIDTH, height: CARD_HEIGHT, spreadAxis: 'z', cards: [] },
    { id: 'p2-bank', type: 'bank', player: 2, x: 15 - CARD_HEIGHT/2 - GAP - CARD_HEIGHT/2, z: 0, rotation: Math.PI/2, width: BANK_WIDTH, height: CARD_HEIGHT, spreadAxis: 'z', cards: [] },
    // Player mark zones (left of bank when facing center)
    { id: 'p3-mark', type: 'mark', player: 3, x: BANK_WIDTH/2 + GAP + MARK_WIDTH/2, z: -10 + CARD_HEIGHT/2 + GAP + CARD_HEIGHT/2, rotation: 0, width: MARK_WIDTH, height: CARD_HEIGHT, spreadAxis: 'x', cards: [] },
    { id: 'p1-mark', type: 'mark', player: 1, x: -BANK_WIDTH/2 - GAP - MARK_WIDTH/2, z: 10 - CARD_HEIGHT/2 - GAP - CARD_HEIGHT/2, rotation: 0, width: MARK_WIDTH, height: CARD_HEIGHT, spreadAxis: 'x', cards: [] },
    { id: 'p4-mark', type: 'mark', player: 4, x: -15 + CARD_HEIGHT/2 + GAP + CARD_HEIGHT/2, z: BANK_WIDTH/2 + GAP + MARK_WIDTH/2, rotation: Math.PI/2, width: MARK_WIDTH, height: CARD_HEIGHT, spreadAxis: 'z', cards: [] },
    { id: 'p2-mark', type: 'mark', player: 2, x: 15 - CARD_HEIGHT/2 - GAP - CARD_HEIGHT/2, z: -BANK_WIDTH/2 - GAP - MARK_WIDTH/2, rotation: Math.PI/2, width: MARK_WIDTH, height: CARD_HEIGHT, spreadAxis: 'z', cards: [] },
    // Player effect zones (right of bank when facing center)
    { id: 'p3-effect', type: 'effect', player: 3, x: -BANK_WIDTH/2 - GAP - EFFECT_WIDTH/2, z: -10 + CARD_HEIGHT/2 + GAP + CARD_HEIGHT/2, rotation: 0, width: EFFECT_WIDTH, height: CARD_HEIGHT, spreadAxis: 'x', cards: [] },
    { id: 'p1-effect', type: 'effect', player: 1, x: BANK_WIDTH/2 + GAP + EFFECT_WIDTH/2, z: 10 - CARD_HEIGHT/2 - GAP - CARD_HEIGHT/2, rotation: 0, width: EFFECT_WIDTH, height: CARD_HEIGHT, spreadAxis: 'x', cards: [] },
    { id: 'p4-effect', type: 'effect', player: 4, x: -15 + CARD_HEIGHT/2 + GAP + CARD_HEIGHT/2, z: -BANK_WIDTH/2 - GAP - EFFECT_WIDTH/2, rotation: Math.PI/2, width: EFFECT_WIDTH, height: CARD_HEIGHT, spreadAxis: 'z', cards: [] },
    { id: 'p2-effect', type: 'effect', player: 2, x: 15 - CARD_HEIGHT/2 - GAP - CARD_HEIGHT/2, z: BANK_WIDTH/2 + GAP + EFFECT_WIDTH/2, rotation: Math.PI/2, width: EFFECT_WIDTH, height: CARD_HEIGHT, spreadAxis: 'z', cards: [] },
    // Center piles
    { id: 'bounty', type: 'pile', player: null, x: -4 - ZONE_LENGTH/6 + CARD_WIDTH/2, z: 0, rotation: 0, width: ZONE_LENGTH/3, height: CARD_HEIGHT, spreadAxis: 'x', spreadDir: -1, cards: [] },
    { id: 'draw', type: 'pile', player: null, x: 0, z: 0, rotation: 0, width: CARD_WIDTH, height: CARD_HEIGHT, spreadAxis: null, cards: [] },
    { id: 'discard', type: 'pile', player: null, x: 3, z: 0, rotation: 0, width: CARD_WIDTH, height: CARD_HEIGHT, spreadAxis: null, cards: [] },
    { id: 'extra-mark', type: 'pile', player: null, x: 6, z: 0, rotation: 0, width: CARD_WIDTH, height: CARD_HEIGHT, spreadAxis: null, cards: [] },
];

// Player lookup (index 1-4)
export const players = [
    null,
    { id: 1, hand: zones[1], bank: zones[5], mark: zones[9], effect: zones[13] },
    { id: 2, hand: zones[3], bank: zones[7], mark: zones[11], effect: zones[15] },
    { id: 3, hand: zones[0], bank: zones[4], mark: zones[8], effect: zones[12] },
    { id: 4, hand: zones[2], bank: zones[6], mark: zones[10], effect: zones[14] },
];

// Center pile references
export const piles = {
    bounty: zones[16],
    draw: zones[17],
    discard: zones[18],
    extraMark: zones[19],
};

// THREE.js rendering state
export let scene = null;
export let camera = null;
export let renderer = null;
export let raycaster = null;
export let mouse = null;

// Setters for THREE.js objects (called during init)
export function setScene(s) { scene = s; }
export function setCamera(c) { camera = c; }
export function setRenderer(r) { renderer = r; }
export function setRaycaster(r) { raycaster = r; }
export function setMouse(m) { mouse = m; }

// Card arrays
export let cards = [];
export let draggedCard = null;
export let dragOffset = new THREE.Vector3();
export let dragStartPos = new THREE.Vector3();
export let tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
export let animatingCards = [];

export function setDraggedCard(c) { draggedCard = c; }
export function setCards(c) { cards = c; }
export function setAnimatingCards(a) { animatingCards = a; }

// Network state
export let peer = null;
export let isHost = false;
export let roomCode = null;
export let myPlayerNumber = null;
export let myPlayerId = null;
export let myPlayerName = null;

export function setPeer(p) { peer = p; }
export function setIsHost(h) { isHost = h; }
export function setRoomCode(r) { roomCode = r; }
export function setMyPlayerNumber(n) { myPlayerNumber = n; }
export function setMyPlayerId(id) { myPlayerId = id; }
export function setMyPlayerName(n) { myPlayerName = n; }

// Host-only state
export let connections = new Map();
export let playerSlots = new Map();
export let peerToPlayer = new Map();
export let playerNames = new Map();

// Client-only state
export let hostConnection = null;
export function setHostConnection(c) { hostConnection = c; }

// Shared state (for labels)
export let currentPlayerList = [];
export function setCurrentPlayerList(list) { currentPlayerList = list; }

// Flag to ignore incoming state updates briefly after local actions
export let ignoreNextStateUpdate = false;
export function setIgnoreNextStateUpdate(v) { ignoreNextStateUpdate = v; }

// Turn state (synchronized across network)
export const turnState = {
    currentPlayerNum: 1,
    actionsRemaining: 3,
    gameStarted: false
};

// Reaction state (synchronized across network)
export const reactionState = {
    active: false,
    card: null,
    cardIndex: null,
    playerId: null,
    targetId: null,
    timeRemaining: 5000,
    eligibleReactors: [],
    responses: {},
    startTime: null,
    effectType: null,
    isLethal: false,
    displayedReactionCards: [],
    selectedCardName: null,
    reactionCardMeshes: [],
    // For storing original card state during reaction display
    originalCardState: null,
    dimPlane: null,
    secondTarget: null,
    // Reaction chain state
    reactionPhase: 1,           // Now a counter: 1, 2, 3, 4... for recursive reactions
    pendingReaction: null,      // { playerId, cardName } - the reaction being countered
    reactionChain: [],          // Array of { playerId, cardName, cardIndex, isOriginal, originalState }
    centerStackCards: [],       // 3D card meshes displayed in center stack
    lastReactorId: null,        // Who played the last reaction (wins if chain ends)
    // 3D timer sprite
    timerSprite: null,
    timerCanvas: null,
    timerCtx: null,
    // For storing reaction card state during counter-reaction display
    reactionCardDisplayState: null
};

// Mark knowledge state
export let knownMarks = {};
export function setKnownMarks(m) { knownMarks = m; }

// Player alive state
export const playerAlive = { 1: true, 2: true, 3: true, 4: true };

// Turn tracking for bounty system
export let currentTurnNumber = 0;
export function setCurrentTurnNumber(n) { currentTurnNumber = n; }
export let bountyState = {};
export function setBountyState(s) { bountyState = s; }

// Bounty animation state
export const bountyAnimationState = {
    active: false,
    step: 0,
    draggerNum: null,
    targetNum: null,
    bountyCard: null,
    bountyCardIndex: null,
    bountySuit: null,
    targetSuit: null,
    isMatch: false,
    startTime: null,
    dimPlane: null,
    textSprite: null,
    textCanvas: null,
    textCtx: null,
    bountyOriginalState: null,
    targetMarkOriginalState: null,
    draggerMarkOriginalState: null,
};

export function resetBountyAnimationState() {
    bountyAnimationState.active = false;
    bountyAnimationState.step = 0;
    bountyAnimationState.draggerNum = null;
    bountyAnimationState.targetNum = null;
    bountyAnimationState.bountyCard = null;
    bountyAnimationState.bountyCardIndex = null;
    bountyAnimationState.bountySuit = null;
    bountyAnimationState.targetSuit = null;
    bountyAnimationState.isMatch = false;
    bountyAnimationState.startTime = null;
    bountyAnimationState.dimPlane = null;
    bountyAnimationState.textSprite = null;
    bountyAnimationState.textCanvas = null;
    bountyAnimationState.textCtx = null;
    bountyAnimationState.bountyOriginalState = null;
    bountyAnimationState.targetMarkOriginalState = null;
    bountyAnimationState.draggerMarkOriginalState = null;
}

// Upheaval state
export const upheavalState = {
    active: false,
    splitIndex: 0
};

// Targeting state
export const targetingState = {
    active: false,
    type: null,
    validTargets: [],
    callback: null,
    highlightMeshes: []
};

// Sprite sheet texture (set during init)
export let spriteSheet = null;
export function setSpriteSheet(s) { spriteSheet = s; }
