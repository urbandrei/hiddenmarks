// Card utilities - zone management, card properties, payment
import { CARD_DEFS, BACK_VALUES } from './constants.js';
import * as state from './state.js';

// === ZONE MANAGEMENT ===

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

// === CARD PROPERTIES ===

export function getCardCost(card) {
    const def = CARD_DEFS.find(d => d.name === card.userData.name);
    return def?.cost ?? 0;
}

export function getCardValue(card) {
    const def = CARD_DEFS.find(d => d.name === card.userData.name);
    return def ? (BACK_VALUES[def.back] ?? 0) : 0;
}

export function isLethalCard(cardName) {
    const lethalCards = ['backfire', 'counterfeit', 'bloodshot', 'heavy hand', 'gold digger', 'red handed'];
    return lethalCards.includes(cardName);
}

// === ZONE UTILITIES ===

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

// === PAYMENT SYSTEM ===

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
