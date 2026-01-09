import * as THREE from 'three';
import { CARD_WIDTH, CARD_HEIGHT, CARD_DEPTH, SPRITE_COLS, SPRITE_ROWS, CARD_DEFS } from './constants.js';
import * as state from './state.js';

// Sprite sheet data (set during loadSpriteSheet)
let spriteSheet = null;
let spriteCardWidth = 0;
let spriteCardHeight = 0;
const textureCache = new Map();

// Late-bound game functions (set via setGameFunctions)
let gameFunctions = {
    shouldShowFaceUp: () => true,
    handleTargetClick: () => false,
    handleReactionCardClick: () => false,
    executeDraw: () => {},
    executeBank: () => {},
    executePlay: () => {},
    initiateBountyUse: () => {},
    executeBountyOnMark: () => {},
    canPerformAction: () => false,
    isOwnZone: () => false,
    sendStateUpdate: () => {}
};

// Allow game.js to inject its functions to avoid circular dependency
export function setGameFunctions(fns) {
    gameFunctions = { ...gameFunctions, ...fns };
}

// === ANIMATION ===

export function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function animateCardToZone(card, zone, targetY) {
    state.setAnimatingCards(state.animatingCards.filter(a => a.card !== card));
    state.animatingCards.push({
        card,
        startPos: card.position.clone(),
        endPos: new THREE.Vector3(zone.x, targetY, zone.z),
        startRot: card.rotation.y,
        endRot: zone.rotation,
        startTime: performance.now(),
        duration: 300
    });
}

export function updateAnimations() {
    const now = performance.now();
    state.setAnimatingCards(state.animatingCards.filter(anim => {
        const elapsed = now - anim.startTime;
        const t = Math.min(elapsed / anim.duration, 1);
        const eased = easeInOut(t);

        anim.card.position.lerpVectors(anim.startPos, anim.endPos, eased);
        anim.card.rotation.y = anim.startRot + (anim.endRot - anim.startRot) * eased;

        if (anim.startRotZ !== undefined) {
            anim.card.rotation.z = anim.startRotZ + (anim.endRotZ - anim.startRotZ) * eased;
            anim.card.position.y = anim.baseY + anim.liftHeight * Math.sin(t * Math.PI);
        }

        if (anim.startScale !== undefined) {
            const scale = anim.startScale + (anim.endScale - anim.startScale) * eased;
            anim.card.scale.set(scale, scale, scale);
        }

        return t < 1;
    }));
}

// === LAYOUT ===

export function getCardPositionInZone(zone, index, total) {
    const pos = { x: zone.x, y: index * CARD_DEPTH, z: zone.z };

    if (!zone.spreadAxis || total <= 1) {
        return pos;
    }

    const maxSpread = zone.width - CARD_WIDTH;
    const spacing = Math.min(CARD_WIDTH * 0.8, maxSpread / (total - 1));
    const totalWidth = spacing * (total - 1);
    const startOffset = -totalWidth / 2;
    const offset = startOffset + index * spacing;
    const dir = zone.spreadDir || 1;

    if (zone.spreadAxis === 'x') {
        pos.x = zone.x + offset * dir;
    } else {
        pos.z = zone.z + offset * dir;
    }

    return pos;
}

export function layoutCardsInZone(zone, animate = true) {
    const count = zone.cards.length;
    zone.cards.forEach((card, i) => {
        const pos = getCardPositionInZone(zone, i, count);
        const visualFaceUp = gameFunctions.shouldShowFaceUp(card, zone);
        const targetRotZ = visualFaceUp ? 0 : Math.PI;

        if (animate) {
            const needsFlip = card.rotation.z !== targetRotZ;
            state.setAnimatingCards(state.animatingCards.filter(a => a.card !== card));
            state.animatingCards.push({
                card,
                startPos: card.position.clone(),
                endPos: new THREE.Vector3(pos.x, pos.y, pos.z),
                startRot: card.rotation.y,
                endRot: zone.rotation,
                startRotZ: card.rotation.z,
                endRotZ: targetRotZ,
                liftHeight: needsFlip ? 2 : 0,
                baseY: pos.y,
                startScale: card.scale.x,
                endScale: 1,
                startTime: performance.now(),
                duration: 300
            });
        } else {
            card.position.set(pos.x, pos.y, pos.z);
            card.rotation.y = zone.rotation;
            card.rotation.z = targetRotZ;
            card.scale.set(1, 1, 1);
        }
    });
}

export function removeCardFromZones(card) {
    for (const zone of state.zones) {
        const idx = zone.cards.indexOf(card);
        if (idx !== -1) {
            zone.cards.splice(idx, 1);
        }
    }
}

export function flipCard(card) {
    const zone = state.zones.find(z => z.cards.includes(card));
    if (!zone) return;

    const currentFaceUp = card.rotation.z === 0;
    const targetRotZ = currentFaceUp ? Math.PI : 0;

    state.setAnimatingCards(state.animatingCards.filter(a => a.card !== card));
    state.animatingCards.push({
        card,
        startPos: card.position.clone(),
        endPos: card.position.clone(),
        startRot: card.rotation.y,
        endRot: card.rotation.y,
        startRotZ: card.rotation.z,
        endRotZ: targetRotZ,
        liftHeight: 2,
        baseY: card.position.y,
        startTime: performance.now(),
        duration: 300
    });
}

// === SPRITE HANDLING ===

export function loadSpriteSheet() {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            spriteSheet = img;
            spriteCardWidth = img.width / SPRITE_COLS;
            spriteCardHeight = img.height / SPRITE_ROWS;
            resolve();
        };
        img.src = 'spritesheet.png';
    });
}

export function createSpriteTexture(index) {
    if (textureCache.has(index)) {
        return textureCache.get(index);
    }

    const canvas = document.createElement('canvas');
    canvas.width = spriteCardWidth;
    canvas.height = spriteCardHeight;
    const ctx = canvas.getContext('2d');

    const i = index - 1;
    const col = i % SPRITE_COLS;
    const row = Math.floor(i / SPRITE_COLS);
    const sx = col * spriteCardWidth;
    const sy = row * spriteCardHeight;

    ctx.drawImage(spriteSheet, sx, sy, spriteCardWidth, spriteCardHeight, 0, 0, spriteCardWidth, spriteCardHeight);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.NoColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = state.renderer.capabilities.getMaxAnisotropy();

    textureCache.set(index, texture);
    return texture;
}

// === DECK CREATION ===

export function createDeck() {
    const drawPile = state.piles.draw;
    let cardStackIndex = 0;

    CARD_DEFS.forEach((cardDef) => {
        const copies = cardDef.count || 1;

        for (let c = 0; c < copies; c++) {
            const faceTexture = createSpriteTexture(cardDef.index);
            const backTexture = createSpriteTexture(cardDef.back);

            const materials = [
                new THREE.MeshBasicMaterial({ color: 0xffffff }),
                new THREE.MeshBasicMaterial({ color: 0xffffff }),
                new THREE.MeshBasicMaterial({ map: faceTexture }),
                new THREE.MeshBasicMaterial({ map: backTexture }),
                new THREE.MeshBasicMaterial({ color: 0xffffff }),
                new THREE.MeshBasicMaterial({ color: 0xffffff })
            ];

            const geometry = new THREE.BoxGeometry(CARD_WIDTH, CARD_DEPTH, CARD_HEIGHT);
            const card = new THREE.Mesh(geometry, materials);

            card.position.set(drawPile.x, cardStackIndex * CARD_DEPTH, drawPile.z);
            card.userData = { index: cardDef.index, name: cardDef.name, faceUp: true };

            state.cards.push(card);
            drawPile.cards.push(card);
            state.scene.add(card);

            cardStackIndex++;
        }
    });
}

// === ZONE VISUALS ===

export function createZoneVisuals() {
    const zoneMaterial = new THREE.LineBasicMaterial({ color: 0x444444 });

    for (const zone of state.zones) {
        const w = zone.width / 2;
        const h = zone.height / 2;
        const points = [
            new THREE.Vector3(-w, 0, -h),
            new THREE.Vector3(w, 0, -h),
            new THREE.Vector3(w, 0, h),
            new THREE.Vector3(-w, 0, h),
            new THREE.Vector3(-w, 0, -h),
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, zoneMaterial);
        line.position.set(zone.x, 0.001, zone.z);
        line.rotation.y = zone.rotation;
        state.scene.add(line);
    }
}

// === INPUT HANDLING ===

export function setupEvents() {
    state.renderer.domElement.addEventListener('mousedown', onMouseDown);
    state.renderer.domElement.addEventListener('mousemove', onMouseMove);
    state.renderer.domElement.addEventListener('mouseup', onMouseUp);
    window.addEventListener('resize', onResize);
}

export function updateMouse(event) {
    const rect = state.renderer.domElement.getBoundingClientRect();
    state.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    state.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onMouseDown(event) {
    // Block all input during bounty animation
    if (state.bountyAnimationState?.active) {
        return;
    }

    // Check for targeting mode first
    if (state.targetingState.active) {
        if (gameFunctions.handleTargetClick(event, updateMouse)) {
            return;
        }
    }

    // Check for reaction card selection
    if (state.reactionState.active && state.reactionState.reactionCardMeshes.length > 0) {
        if (gameFunctions.handleReactionCardClick(event, updateMouse)) {
            return;
        }
    }

    updateMouse(event);
    state.raycaster.setFromCamera(state.mouse, state.camera);
    const intersects = state.raycaster.intersectObjects(state.cards);

    if (intersects.length === 0) return;

    const clickedCard = intersects[0].object;

    // Check for draw action
    if (state.turnState.gameStarted && state.piles.draw.cards.includes(clickedCard)) {
        if (gameFunctions.canPerformAction()) {
            const topCard = state.piles.draw.cards[state.piles.draw.cards.length - 1];
            if (clickedCard === topCard) {
                gameFunctions.executeDraw();
            }
        }
        return;
    }

    // Check for bounty drag (bounties are dragged to marks, not clicked)
    if (state.turnState.gameStarted && state.piles.bounty.cards.includes(clickedCard)) {
        if (gameFunctions.canPerformAction() && state.playerAlive[state.myPlayerNumber]) {
            // Start dragging bounty card
            state.setDraggedCard(clickedCard);
            state.dragStartPos.copy(clickedCard.position);

            const maxY = Math.max(...state.cards.map(c => c.position.y));
            clickedCard.position.y = maxY + CARD_DEPTH + 0.5;

            const intersectPoint = new THREE.Vector3();
            state.raycaster.ray.intersectPlane(state.tablePlane, intersectPoint);
            state.dragOffset.copy(clickedCard.position).sub(intersectPoint);
            state.dragOffset.y = clickedCard.position.y;
        }
        return;
    }

    // If game started, only allow dragging own hand cards during your turn
    if (state.turnState.gameStarted) {
        const myHand = state.players[state.myPlayerNumber]?.hand;
        if (!gameFunctions.canPerformAction() || !myHand?.cards.includes(clickedCard)) {
            return;
        }
    }

    // Standard drag initialization
    state.setDraggedCard(clickedCard);
    state.dragStartPos.copy(clickedCard.position);

    const maxY = Math.max(...state.cards.map(c => c.position.y));
    clickedCard.position.y = maxY + CARD_DEPTH + 0.5;

    const intersectPoint = new THREE.Vector3();
    state.raycaster.ray.intersectPlane(state.tablePlane, intersectPoint);
    state.dragOffset.copy(clickedCard.position).sub(intersectPoint);
    state.dragOffset.y = clickedCard.position.y;
}

function onMouseMove(event) {
    if (!state.draggedCard) return;

    updateMouse(event);
    state.raycaster.setFromCamera(state.mouse, state.camera);

    const intersectPoint = new THREE.Vector3();
    if (state.raycaster.ray.intersectPlane(state.tablePlane, intersectPoint)) {
        state.draggedCard.position.x = intersectPoint.x + state.dragOffset.x;
        state.draggedCard.position.z = intersectPoint.z + state.dragOffset.z;
    }
}

export function findNearestZone(x, z) {
    let nearest = null;
    let nearestDist = Infinity;

    for (const zone of state.zones) {
        const dx = x - zone.x;
        const dz = z - zone.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < nearestDist) {
            nearestDist = dist;
            nearest = zone;
        }
    }

    return nearest;
}

function onMouseUp() {
    if (!state.draggedCard) return;

    const card = state.draggedCard;
    state.setDraggedCard(null);

    // Find source and target zones
    const sourceZone = state.zones.find(z => z.cards.includes(card));
    const targetZone = findNearestZone(card.position.x, card.position.z);

    // Calculate drag distance
    const dx = card.position.x - state.dragStartPos.x;
    const dz = card.position.z - state.dragStartPos.z;
    const dragDist = Math.sqrt(dx * dx + dz * dz);
    const isClick = dragDist < 0.5;

    // During game, clicks and invalid drags just return card to position
    if (state.turnState.gameStarted) {
        if (isClick) {
            // Clicks do nothing during game - just return card
            layoutCardsInZone(sourceZone);
            return;
        }

        // Bounty to mark = bounty use action
        if (sourceZone === state.piles.bounty && targetZone?.type === 'mark') {
            const targetPlayerNum = targetZone.player;

            // Validate: not self, alive, connected
            if (targetPlayerNum === state.myPlayerNumber ||
                !state.playerAlive[targetPlayerNum] ||
                !state.currentPlayerList.find(p => p.num === targetPlayerNum && p.connected)) {
                layoutCardsInZone(sourceZone);
                return;
            }

            gameFunctions.executeBountyOnMark(state.myPlayerNumber, targetPlayerNum, card);
            return;
        }

        // Drag: validate move
        const myPlayer = state.players[state.myPlayerNumber];

        // Hand to bank = bank action
        if (sourceZone === myPlayer.hand && targetZone === myPlayer.bank) {
            gameFunctions.executeBank(card, sourceZone, targetZone);
            return;
        }

        // Hand to elsewhere (not own zones) = play action
        if (sourceZone === myPlayer.hand && !gameFunctions.isOwnZone(targetZone)) {
            const success = gameFunctions.executePlay(card, sourceZone);
            if (!success) {
                layoutCardsInZone(sourceZone);
            }
            return;
        }

        // Any other drag is invalid - return card
        layoutCardsInZone(sourceZone);
        return;
    }

    // Before game starts (free play mode):
    if (isClick) {
        // Click to flip card
        flipCard(card);
        return;
    }

    // Free drag to any zone
    if (sourceZone && targetZone && sourceZone !== targetZone) {
        gameFunctions.removeCardFromZones(card);
        targetZone.cards.push(card);
        layoutCardsInZone(sourceZone);
        layoutCardsInZone(targetZone);
        gameFunctions.sendStateUpdate();
    } else {
        layoutCardsInZone(sourceZone);
    }
}

function onResize() {
    const targetAspect = 1920 / 1080;
    const windowAspect = window.innerWidth / window.innerHeight;
    let width, height;

    if (windowAspect > targetAspect) {
        height = window.innerHeight;
        width = height * targetAspect;
    } else {
        width = window.innerWidth;
        height = width / targetAspect;
    }

    state.renderer.setSize(width, height);
}

// === ANIMATION LOOP ===

export function animate() {
    requestAnimationFrame(animate);
    updateAnimations();
    state.renderer.render(state.scene, state.camera);
}

// === INITIALIZATION ===

export async function initRenderer() {
    await loadSpriteSheet();

    state.setScene(new THREE.Scene());
    state.scene.background = new THREE.Color(0x1a1a2e);

    const aspect = 1920 / 1080;
    const frustumSize = 20;
    state.setCamera(new THREE.OrthographicCamera(
        -frustumSize * aspect / 2, frustumSize * aspect / 2,
        frustumSize / 2, -frustumSize / 2,
        0.1, 100
    ));
    state.camera.position.set(0, 20, 0);
    state.camera.lookAt(0, 0, 0);

    state.setRenderer(new THREE.WebGLRenderer({ antialias: true }));
    state.renderer.setPixelRatio(window.devicePixelRatio);

    const targetAspect = 1920 / 1080;
    const windowAspect = window.innerWidth / window.innerHeight;
    let width, height;
    if (windowAspect > targetAspect) {
        height = window.innerHeight;
        width = height * targetAspect;
    } else {
        width = window.innerWidth;
        height = width / targetAspect;
    }
    state.renderer.setSize(width, height);
    document.body.appendChild(state.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    state.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    state.scene.add(directionalLight);

    const tableGeometry = new THREE.PlaneGeometry(30, 20);
    const tableMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.rotation.x = -Math.PI / 2;
    table.position.y = -0.01;
    state.scene.add(table);

    state.setRaycaster(new THREE.Raycaster());
    state.setMouse(new THREE.Vector2());

    createZoneVisuals();
    createDeck();
    setupEvents();
    animate();
}
