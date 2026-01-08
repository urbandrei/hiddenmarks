// Targeting system - player/card selection for effects
import * as THREE from 'three';
import { CARD_WIDTH, CARD_HEIGHT } from './constants.js';
import * as state from './state.js';

// === TARGETING MODE ===

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
